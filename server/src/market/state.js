// state.js
import env from "../config/env.js";
import publisher from "./publisher.js";
import dbmod from "../db/sqlite.js";
import { log } from "../middleware/log.js";
import signalTelegramSync from "../services/telegram/signalTelegramSync.js";

/* -------------------- Helpers -------------------- */
const now = () => Date.now();
const STATE_EMIT_THROTTLE = 200;

const jstr = (o) => {
  try { return JSON.stringify(o); } catch { return null; }
};

const jparse = (s) => {
  try { return JSON.parse(s); } catch { return null; }
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const numOrNull = (v) => (Number.isFinite(+v) ? +v : null);
const numOrNaN = (v) => (v == null ? NaN : +v);
const strOrEmpty = (v) => (v == null ? "" : String(v));

const ACTIVE_SIGNAL_STATUSES = new Set(["OPEN", "ACTIVE"]);
const CLOSED_SIGNAL_STATUSES = new Set(["TP", "SL", "CLOSED"]);

const LOCKED_ACTIVE_FIELDS = [
  "key",
  "symbol",
  "tf",
  "setup",
  "side",
  "entry",
  "sl",
  "tp",
  "rr",
  "closeTime",
  "createdAt"
];

const OPTIONAL_SIGNAL_COLUMNS = [
  { name: "exit_price", type: "REAL" },
  { name: "exit_reason", type: "TEXT" },
  { name: "protection_stop", type: "REAL" },
  { name: "protection_mode", type: "TEXT" },
  { name: "peak_r", type: "REAL" },
  { name: "peak_pnl_usdt", type: "REAL" },
  { name: "risk_pct", type: "REAL" },
  { name: "tp_pct", type: "REAL" },
  { name: "tp_capped", type: "INTEGER" },
  { name: "entry_model", type: "TEXT" }
];

/* -------------------- History -------------------- */
const normalizeHistoryPoint = (p) => {
  if (!p || typeof p !== "object") return null;

  const t = Number(p.t ?? p.ts ?? p.time ?? p.at);
  if (!Number.isFinite(t) || t <= 0) return null;

  return {
    t,
    p: numOrNull(p.p ?? p.price ?? p.px ?? p.mark ?? p.last),
    pp: numOrNull(p.pp ?? p.pnlPct ?? p.pnl_pct ?? p.pnlPercent ?? p.pnl_percent),
    u: numOrNull(p.u ?? p.pnlUsdt ?? p.pnl_usdt ?? p.pnlUSDT ?? p.usdt),
    r: numOrNull(p.r ?? p.rMultiple ?? p.r_multiple),
    protectionStop: numOrNull(p.protectionStop ?? p.protection_stop),
    protectionMode: p.protectionMode ?? p.protection_mode ?? null,
    exitReason: p.exitReason ?? p.exit_reason ?? null
  };
};

const normalizeHistory = (arr) =>
  Array.isArray(arr)
    ? arr.map(normalizeHistoryPoint).filter(Boolean).sort((a, b) => a.t - b.t)
    : [];

const isActiveSignalStatus = (status) =>
  ACTIVE_SIGNAL_STATUSES.has(String(status || "").trim().toUpperCase());

const isClosedSignalStatus = (status) =>
  CLOSED_SIGNAL_STATUSES.has(String(status || "").trim().toUpperCase());

const getCloseTs = (sig) => {
  if (!sig) return now();

  if (Number.isFinite(+sig.closedAt) && +sig.closedAt > 0) return +sig.closedAt;
  if (Number.isFinite(+sig.lastLiveTs) && +sig.lastLiveTs > 0) return +sig.lastLiveTs;
  if (Number.isFinite(+sig.lastScanTs) && +sig.lastScanTs > 0) return +sig.lastScanTs;
  if (Number.isFinite(+sig.createdAt) && +sig.createdAt > 0) return +sig.createdAt;

  return now();
};

const mergeActiveSignal = (existing, incoming) => {
  const merged = {
    ...existing,
    ...incoming,
    history: Array.isArray(incoming.history) ? incoming.history : existing.history
  };

  for (const field of LOCKED_ACTIVE_FIELDS) {
    merged[field] = existing[field];
  }

  return merged;
};

const mergeClosedSignal = (existing, incoming) => ({
  ...existing,
  lastScanTs: incoming.lastScanTs ?? existing.lastScanTs,
  lastLiveTs: existing.lastLiveTs,
  live: existing.live,
  pnlPct: existing.pnlPct,
  pnlUsdt: existing.pnlUsdt,
  history: Array.isArray(existing.history) ? existing.history : [],
  status: existing.status,
  closedAt: existing.closedAt ?? getCloseTs(existing),

  exitPrice: existing.exitPrice,
  exitReason: existing.exitReason,
  protectionStop: existing.protectionStop,
  protectionMode: existing.protectionMode,
  peakR: existing.peakR,
  peakPnlUsdt: existing.peakPnlUsdt,
  riskPct: existing.riskPct,
  tpPct: existing.tpPct,
  tpCapped: existing.tpCapped,
  entryModel: existing.entryModel
});

/* -------------------- State -------------------- */
const S = {
  bootTs: now(),
  session: 0,
  status: "idle",
  universe: [],
  signals: new Map(),
  symbolToKey: new Map(),
  sessionLockedSymbols: new Set(),
  lastClosedBySymbol: new Map(),
  coolUntil: 0,
  liveCount: 0,
  lastStateEmit: 0,
  stateSeq: 0,
  dbReady: false,
  dbExtraColumnsReady: false
};

/* -------------------- DTO -------------------- */
const toSignalDTO = (s) => ({
  key: strOrEmpty(s.key),
  symbol: strOrEmpty(s.symbol),
  tf: strOrEmpty(s.tf),
  setup: strOrEmpty(s.setup),
  side: strOrEmpty(s.side),
  status: strOrEmpty(s.status),

  entry: numOrNaN(s.entry),
  sl: numOrNaN(s.sl),
  tp: numOrNaN(s.tp),
  rr: numOrNaN(s.rr),

  qty: numOrNaN(s.qty),
  capitalUsd: numOrNaN(s.capitalUsd),
  riskDistance: numOrNaN(s.riskDistance),

  closeTime: numOrNaN(s.closeTime),
  closedAt: numOrNaN(s.closedAt),
  createdAt: numOrNaN(s.createdAt),
  lastScanTs: numOrNaN(s.lastScanTs),
  lastLiveTs: numOrNaN(s.lastLiveTs),
  live: numOrNaN(s.live),
  pnlPct: numOrNaN(s.pnlPct),
  pnlUsdt: numOrNaN(s.pnlUsdt),

  exitPrice: numOrNaN(s.exitPrice),
  exitReason: strOrEmpty(s.exitReason),
  protectionStop: numOrNaN(s.protectionStop),
  protectionMode: strOrEmpty(s.protectionMode),
  peakR: numOrNaN(s.peakR),
  peakPnlUsdt: numOrNaN(s.peakPnlUsdt),
  riskPct: numOrNaN(s.riskPct),
  tpPct: numOrNaN(s.tpPct),
  tpCapped: Boolean(s.tpCapped),
  entryModel: strOrEmpty(s.entryModel),

  history: normalizeHistory(s.history)
});

const fromSignalRow = (r) => ({
  key: r.key,
  symbol: r.symbol,
  tf: r.tf,
  setup: r.setup,
  side: r.side,
  status: r.status,

  entry: +r.entry,
  sl: +r.sl,
  tp: +r.tp,
  rr: +r.rr,

  qty: r.qty == null ? NaN : +r.qty,
  capitalUsd: r.capital_usd == null ? NaN : +r.capital_usd,
  riskDistance: r.risk_distance == null ? NaN : +r.risk_distance,

  closeTime: +r.close_time,
  closedAt: r.closed_at == null ? NaN : +r.closed_at,
  createdAt: +r.created_at,
  lastScanTs: +r.last_scan_ts,
  lastLiveTs: r.last_live_ts == null ? NaN : +r.last_live_ts,
  live: r.live == null ? NaN : +r.live,
  pnlPct: r.pnl_pct == null ? NaN : +r.pnl_pct,
  pnlUsdt: r.pnl_usdt == null ? NaN : +r.pnl_usdt,

  exitPrice: r.exit_price == null ? NaN : +r.exit_price,
  exitReason: r.exit_reason || "",
  protectionStop: r.protection_stop == null ? NaN : +r.protection_stop,
  protectionMode: r.protection_mode || "",
  peakR: r.peak_r == null ? NaN : +r.peak_r,
  peakPnlUsdt: r.peak_pnl_usdt == null ? NaN : +r.peak_pnl_usdt,
  riskPct: r.risk_pct == null ? NaN : +r.risk_pct,
  tpPct: r.tp_pct == null ? NaN : +r.tp_pct,
  tpCapped: Boolean(r.tp_capped),
  entryModel: r.entry_model || "",

  history: normalizeHistory(jparse(r.history_json) || [])
});

/* -------------------- DB -------------------- */
const ensureDB = async () => {
  if (S.dbReady && dbmod.isOpen()) return;
  await dbmod.initDb({ filename: env.DB_PATH });
  S.dbReady = true;
  S.dbExtraColumnsReady = false;
};

const persistEnabled = () => env.PERSIST_SIGNALS !== false;

const hasColumn = async (table, column) => {
  await ensureDB();
  const rows = await dbmod.all(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
};

const ensureSignalExtraColumns = async () => {
  if (S.dbExtraColumnsReady) return;

  await ensureDB();

  for (const col of OPTIONAL_SIGNAL_COLUMNS) {
    const exists = await hasColumn("signals", col.name);
    if (exists) continue;

    try {
      await dbmod.run(`ALTER TABLE signals ADD COLUMN ${col.name} ${col.type}`);
    } catch (error) {
      log.warn("SIGNAL_SCHEMA_ALTER_FAIL", {
        column: col.name,
        err: error?.message || String(error)
      });
    }
  }

  S.dbExtraColumnsReady = true;
};

const persistSignal = async (sig) => {
  if (!persistEnabled()) return;
  await ensureDB();
  await ensureSignalExtraColumns();

  const h = jstr(normalizeHistory(sig.history)) || null;
  const supportsClosedAt = await hasColumn("signals", "closed_at");

  const extraValues = [
    Number.isFinite(+sig.exitPrice) ? +sig.exitPrice : null,
    sig.exitReason || null,
    Number.isFinite(+sig.protectionStop) ? +sig.protectionStop : null,
    sig.protectionMode || null,
    Number.isFinite(+sig.peakR) ? +sig.peakR : null,
    Number.isFinite(+sig.peakPnlUsdt) ? +sig.peakPnlUsdt : null,
    Number.isFinite(+sig.riskPct) ? +sig.riskPct : null,
    Number.isFinite(+sig.tpPct) ? +sig.tpPct : null,
    sig.tpCapped ? 1 : 0,
    sig.entryModel || null
  ];

  if (supportsClosedAt) {
    await dbmod.run(
      `INSERT INTO signals(
        key,symbol,tf,setup,side,status,entry,sl,tp,rr,
        close_time,closed_at,created_at,last_scan_ts,last_live_ts,live,pnl_pct,pnl_usdt,history_json,
        exit_price,exit_reason,protection_stop,protection_mode,peak_r,peak_pnl_usdt,risk_pct,tp_pct,tp_capped,entry_model
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET
        symbol=excluded.symbol, tf=excluded.tf, setup=excluded.setup, side=excluded.side,
        status=excluded.status, entry=excluded.entry, sl=excluded.sl, tp=excluded.tp,
        rr=excluded.rr, close_time=excluded.close_time, closed_at=excluded.closed_at,
        created_at=excluded.created_at, last_scan_ts=excluded.last_scan_ts,
        last_live_ts=excluded.last_live_ts, live=excluded.live,
        pnl_pct=excluded.pnl_pct, pnl_usdt=excluded.pnl_usdt,
        history_json=excluded.history_json,
        exit_price=excluded.exit_price,
        exit_reason=excluded.exit_reason,
        protection_stop=excluded.protection_stop,
        protection_mode=excluded.protection_mode,
        peak_r=excluded.peak_r,
        peak_pnl_usdt=excluded.peak_pnl_usdt,
        risk_pct=excluded.risk_pct,
        tp_pct=excluded.tp_pct,
        tp_capped=excluded.tp_capped,
        entry_model=excluded.entry_model`,
      [
        sig.key, sig.symbol, sig.tf, sig.setup, sig.side, sig.status,
        sig.entry, sig.sl, sig.tp, sig.rr,
        sig.closeTime,
        Number.isFinite(+sig.closedAt) ? +sig.closedAt : null,
        sig.createdAt, sig.lastScanTs,
        Number.isFinite(+sig.lastLiveTs) ? +sig.lastLiveTs : null,
        Number.isFinite(+sig.live) ? +sig.live : null,
        Number.isFinite(+sig.pnlPct) ? +sig.pnlPct : null,
        Number.isFinite(+sig.pnlUsdt) ? +sig.pnlUsdt : null,
        h,
        ...extraValues
      ]
    );
    return;
  }

  await dbmod.run(
    `INSERT INTO signals(
      key,symbol,tf,setup,side,status,entry,sl,tp,rr,
      close_time,created_at,last_scan_ts,last_live_ts,live,pnl_pct,pnl_usdt,history_json,
      exit_price,exit_reason,protection_stop,protection_mode,peak_r,peak_pnl_usdt,risk_pct,tp_pct,tp_capped,entry_model
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(key) DO UPDATE SET
      symbol=excluded.symbol, tf=excluded.tf, setup=excluded.setup, side=excluded.side,
      status=excluded.status, entry=excluded.entry, sl=excluded.sl, tp=excluded.tp,
      rr=excluded.rr, close_time=excluded.close_time, created_at=excluded.created_at,
      last_scan_ts=excluded.last_scan_ts, last_live_ts=excluded.last_live_ts,
      live=excluded.live, pnl_pct=excluded.pnl_pct, pnl_usdt=excluded.pnl_usdt,
      history_json=excluded.history_json,
      exit_price=excluded.exit_price,
      exit_reason=excluded.exit_reason,
      protection_stop=excluded.protection_stop,
      protection_mode=excluded.protection_mode,
      peak_r=excluded.peak_r,
      peak_pnl_usdt=excluded.peak_pnl_usdt,
      risk_pct=excluded.risk_pct,
      tp_pct=excluded.tp_pct,
      tp_capped=excluded.tp_capped,
      entry_model=excluded.entry_model`,
    [
      sig.key, sig.symbol, sig.tf, sig.setup, sig.side, sig.status,
      sig.entry, sig.sl, sig.tp, sig.rr,
      sig.closeTime, sig.createdAt, sig.lastScanTs,
      Number.isFinite(+sig.lastLiveTs) ? +sig.lastLiveTs : null,
      Number.isFinite(+sig.live) ? +sig.live : null,
      Number.isFinite(+sig.pnlPct) ? +sig.pnlPct : null,
      Number.isFinite(+sig.pnlUsdt) ? +sig.pnlUsdt : null,
      h,
      ...extraValues
    ]
  );
};

const deleteSignalByKey = async (key) => {
  if (!persistEnabled()) return;
  await ensureDB();
  await dbmod.run("DELETE FROM signals WHERE key=?", [key]);
};

const clearSignalsDB = async () => {
  if (!persistEnabled()) return;
  await ensureDB();
  await dbmod.run("DELETE FROM signals");
};

const syncTelegramUpsert = async (signal, meta = {}) => {
  try {
    await signalTelegramSync.onSignalUpsert(signal, meta);
  } catch (error) {
    log.warn("TELEGRAM_SYNC_UPSERT_FAIL", {
      key: signal?.key || null,
      err: error?.message || String(error)
    });
  }
};

const syncTelegramRemoved = async (signal, meta = {}) => {
  try {
    await signalTelegramSync.onSignalRemoved(signal, meta);
  } catch (error) {
    log.warn("TELEGRAM_SYNC_REMOVE_FAIL", {
      key: signal?.key || null,
      err: error?.message || String(error)
    });
  }
};

const syncTelegramCleared = async (signals, meta = {}) => {
  try {
    await signalTelegramSync.onSignalsCleared(signals, meta);
  } catch (error) {
    log.warn("TELEGRAM_SYNC_CLEAR_FAIL", {
      count: Array.isArray(signals) ? signals.length : 0,
      err: error?.message || String(error)
    });
  }
};

const loadSignalsFromDB = async () => {
  if (!persistEnabled()) return;
  await ensureDB();
  await ensureSignalExtraColumns();

  const rows = await dbmod.all("SELECT * FROM signals ORDER BY created_at DESC LIMIT 800");

  for (const r of rows) {
    const sig = fromSignalRow(r);
    S.signals.set(sig.key, sig);

    if (sig.symbol && isActiveSignalStatus(sig.status)) {
      const prevKey = S.symbolToKey.get(sig.symbol);
      const prev = prevKey ? S.signals.get(prevKey) : null;

      if (!prev || (Number(sig.createdAt) || 0) >= (Number(prev.createdAt) || 0)) {
        S.symbolToKey.set(sig.symbol, sig.key);
      }
    }

    if (sig.symbol && isClosedSignalStatus(sig.status)) {
      const closeTs = getCloseTs(sig);
      const prevClosedAt = S.lastClosedBySymbol.get(sig.symbol) || 0;

      if (closeTs > prevClosedAt) {
        S.lastClosedBySymbol.set(sig.symbol, closeTs);
      }
    }
  }
};

/* -------------------- State Helpers -------------------- */
const cooldownLeftMs = () => Math.max(0, S.coolUntil - now());

const listSignals = (limit = 800) =>
  Array.from(S.signals.values())
    .sort((a, b) => {
      const aClosed = isClosedSignalStatus(a.status);
      const bClosed = isClosedSignalStatus(b.status);

      if (aClosed !== bClosed) return aClosed ? 1 : -1;

      const at = aClosed ? getCloseTs(a) : Number(a.createdAt) || 0;
      const bt = bClosed ? getCloseTs(b) : Number(b.createdAt) || 0;

      return bt - at;
    })
    .slice(0, limit);

const snapshot = () => ({
  session: S.session,
  status: S.status,
  universeCount: S.universe.length,
  cooldownLeftMs: cooldownLeftMs(),
  liveCount: S.liveCount,
  signals: listSignals().map(toSignalDTO)
});

const emitState = (force = 0) => {
  const t = now();
  if (!force && t - S.lastStateEmit < STATE_EMIT_THROTTLE) return;

  S.lastStateEmit = t;
  S.stateSeq++;

  publisher.publish("STATE", {
    seq: S.stateSeq,
    ts: t,
    ...snapshot()
  });
};

/* -------------------- Signal Management -------------------- */
const getSignal = (key) => S.signals.get(key) || null;
const hasSignal = (key) => S.signals.has(key);

const normalizeSymbol = (symbol) => strOrEmpty(symbol).trim();

const getActiveSignalBySymbol = (symbol) => {
  const sym = normalizeSymbol(symbol);
  if (!sym) return null;

  const key = S.symbolToKey.get(sym);
  if (!key) return null;

  const signal = S.signals.get(key);
  if (!signal) {
    S.symbolToKey.delete(sym);
    return null;
  }

  if (!isActiveSignalStatus(signal.status)) {
    S.symbolToKey.delete(sym);
    return null;
  }

  return signal;
};

const lockSymbolForSession = (symbol) => {
  const sym = normalizeSymbol(symbol);
  if (!sym) return false;
  S.sessionLockedSymbols.add(sym);
  return true;
};

const isSymbolLockedForSession = (symbol) => {
  const sym = normalizeSymbol(symbol);
  if (!sym) return false;
  return S.sessionLockedSymbols.has(sym);
};

const getLastClosedAtBySymbol = (symbol) => {
  const sym = normalizeSymbol(symbol);
  if (!sym) return 0;
  return S.lastClosedBySymbol.get(sym) || 0;
};

const findActiveSignal = (symbol, setup, excludeKey = "") => {
  const sym = normalizeSymbol(symbol);
  const normalizedSetup = strOrEmpty(setup).trim();
  const skipKey = strOrEmpty(excludeKey);

  for (const signal of S.signals.values()) {
    if (!signal) continue;
    if (skipKey && signal.key === skipKey) continue;
    if (signal.symbol !== sym) continue;
    if (normalizedSetup && signal.setup !== normalizedSetup) continue;
    if (!isActiveSignalStatus(signal.status)) continue;
    return signal;
  }

  return null;
};

const startSession = async ({ loadDb = true, clearDb = false } = {}) => {
  if (clearDb) await clearSignalsDB();
  await ensureDB();

  S.session++;
  S.status = "running";
  S.coolUntil = 0;
  S.liveCount = 0;
  S.universe = [];
  S.signals.clear();
  S.symbolToKey.clear();
  S.sessionLockedSymbols.clear();
  S.lastClosedBySymbol.clear();

  if (loadDb) await loadSignalsFromDB();

  publisher.publish("SESSION_START", { session: S.session });
  emitState(1);
};

const stopSession = async () => {
  S.status = "stopped";
  S.coolUntil = 0;
  S.liveCount = 0;
  publisher.publish("SESSION_STOP", { session: S.session });
  emitState(1);
};

/* -------------------- Universe & Cooldown -------------------- */
const setUniverse = (arr) => {
  S.universe = Array.isArray(arr) ? arr.slice() : [];
  publisher.publish("UNIVERSE", { count: S.universe.length });
  emitState();
};

const getUniverse = () => S.universe.slice();

const setCooldown = (ms) => {
  S.coolUntil = Math.max(S.coolUntil, now() + Math.max(0, ms | 0));
  publisher.publish("COOLDOWN", { coolUntil: S.coolUntil });
  emitState();
};

const clearCooldown = () => {
  S.coolUntil = 0;
  publisher.publish("COOLDOWN", { coolUntil: 0 });
  emitState();
};

const setLiveCount = (n) => {
  S.liveCount = clamp(n | 0, 0, 1e9);
  publisher.publish("LIVE_COUNT", { liveCount: S.liveCount });
  emitState();
};

/* -------------------- Signal Upsert / Removal -------------------- */
const upsertSignal = async (sig, { emit = true } = {}) => {
  let normalized = {
    ...sig,
    key: strOrEmpty(sig.key),
    symbol: strOrEmpty(sig.symbol),
    tf: strOrEmpty(sig.tf),
    setup: strOrEmpty(sig.setup),
    side: strOrEmpty(sig.side),
    status: strOrEmpty(sig.status),
    history: normalizeHistory(sig.history),

    qty: numOrNaN(sig.qty),
    capitalUsd: numOrNaN(sig.capitalUsd),
    riskDistance: numOrNaN(sig.riskDistance),

    closedAt: numOrNaN(sig.closedAt),

    exitPrice: numOrNaN(sig.exitPrice),
    exitReason: strOrEmpty(sig.exitReason),
    protectionStop: numOrNaN(sig.protectionStop),
    protectionMode: strOrEmpty(sig.protectionMode),
    peakR: numOrNaN(sig.peakR),
    peakPnlUsdt: numOrNaN(sig.peakPnlUsdt),
    riskPct: numOrNaN(sig.riskPct),
    tpPct: numOrNaN(sig.tpPct),
    tpCapped: Boolean(sig.tpCapped),
    entryModel: strOrEmpty(sig.entryModel)
  };

  const sym = normalized.symbol.trim();
  const existingByKey = S.signals.get(normalized.key) || null;
  const previousStatus = existingByKey?.status || null;

  if (existingByKey && isClosedSignalStatus(existingByKey.status)) {
    normalized = mergeClosedSignal(existingByKey, normalized);
  } else if (existingByKey && isActiveSignalStatus(existingByKey.status)) {
    normalized = mergeActiveSignal(existingByKey, normalized);
  }

  const activeBySymbol = sym ? getActiveSignalBySymbol(sym) : null;
  if (activeBySymbol && activeBySymbol.key !== normalized.key) {
    normalized = mergeActiveSignal(activeBySymbol, normalized);
  }

  if (
    sym &&
    isActiveSignalStatus(normalized.status) &&
    isSymbolLockedForSession(sym) &&
    (!existingByKey || existingByKey.key !== normalized.key)
  ) {
    return S.signals.get(normalized.key) || null;
  }

  const existed = S.signals.has(normalized.key);
  const previous = S.signals.get(normalized.key) || null;

  const becameClosed =
    isClosedSignalStatus(normalized.status) &&
    !isClosedSignalStatus(previousStatus);

  if (becameClosed) {
    normalized.closedAt = getCloseTs(normalized);

    if (sym) {
      lockSymbolForSession(sym);
      S.lastClosedBySymbol.set(sym, normalized.closedAt);
    }
  }

  S.signals.set(normalized.key, normalized);

  if (sym) {
    if (isActiveSignalStatus(normalized.status)) {
      S.symbolToKey.set(sym, normalized.key);
    } else if (S.symbolToKey.get(sym) === normalized.key) {
      S.symbolToKey.delete(sym);
    }
  }

  await persistSignal(normalized);
  await syncTelegramUpsert(normalized, { existed, previous });

  publisher.publish(existed ? "SIGNAL_UPDATE" : "SIGNAL_NEW", toSignalDTO(normalized));
  if (emit) emitState();

  return normalized;
};

const removeSignal = async (key, { emit = true } = {}) => {
  const sig = S.signals.get(key);
  if (!sig) return false;

  if (isClosedSignalStatus(sig.status)) {
    return false;
  }

  await syncTelegramRemoved(sig, { reason: "INVALIDATED" });
  S.signals.delete(key);

  if (sig.symbol && S.symbolToKey.get(sig.symbol) === key) {
    S.symbolToKey.delete(sig.symbol);
  }

  await deleteSignalByKey(key);
  publisher.publish("SIGNAL_REMOVE", { key });

  if (emit) emitState();
  return true;
};

const clearSignals = async ({ emit = true, clearDb = true } = {}) => {
  const removedSignals = Array.from(S.signals.values());

  await syncTelegramCleared(removedSignals, { reason: "INVALIDATED" });

  S.signals.clear();
  S.symbolToKey.clear();
  S.sessionLockedSymbols.clear();
  S.lastClosedBySymbol.clear();
  S.coolUntil = 0;
  S.liveCount = 0;

  if (clearDb) await clearSignalsDB();

  publisher.publish("SIGNALS_CLEARED");
  if (emit) emitState(1);
};

/* -------------------- Exports -------------------- */
export default {
  S,
  cooldownLeftMs,
  emitState,
  getSignal,
  hasSignal,
  listSignals,
  findActiveSignal,
  getActiveSignalBySymbol,
  lockSymbolForSession,
  isSymbolLockedForSession,
  getLastClosedAtBySymbol,
  startSession,
  stopSession,
  setUniverse,
  getUniverse,
  setCooldown,
  clearCooldown,
  setLiveCount,
  upsertSignal,
  removeSignal,
  clearSignals,
  snapshot
};