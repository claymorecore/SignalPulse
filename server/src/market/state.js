// client.js
import env from "../config/env.js";
import publisher from "./publisher.js";
import dbmod from "../db/sqlite.js";
import { log } from "../middleware/log.js";

/* -------------------- Helpers -------------------- */
const now = () => Date.now();

const jstr = (o) => {
  try { return JSON.stringify(o); } catch { return null; }
};

const jparse = (s) => {
  try { return JSON.parse(s); } catch { return null; }
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const tfRank = (tf) => {
  switch (tf) {
    case "15m": return 4;
    case "5m": return 3;
    case "3m": return 2;
    case "1m": return 1;
    default: return 0;
  }
};

const numOrNull = (v) => (Number.isFinite(+v) ? +v : null);
const numOrNaN = (v) => (v == null ? NaN : +v);
const strOrEmpty = (v) => (v == null ? "" : String(v));
const ACTIVE_SIGNAL_STATUSES = new Set(["OPEN", "ACTIVE"]);
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

/* -------------------- History Normalization -------------------- */
const normalizeHistoryPoint = (p) => {
  if (!p || typeof p !== "object") return null;

  const t = Number(p.t ?? p.ts ?? p.time ?? p.at);
  if (!Number.isFinite(t) || t <= 0) return null;

  return {
    t,
    p: numOrNull(p.p ?? p.price ?? p.px ?? p.mark ?? p.last),
    pp: numOrNull(p.pp ?? p.pnlPct ?? p.pnl_pct ?? p.pnlPercent ?? p.pnl_percent),
    u: numOrNull(p.u ?? p.pnlUsdt ?? p.pnl_usdt ?? p.pnlUSDT ?? p.usdt)
  };
};

const normalizeHistory = (arr) =>
  Array.isArray(arr)
    ? arr.map(normalizeHistoryPoint).filter(Boolean).sort((a, b) => a.t - b.t)
    : [];

const isActiveSignalStatus = (status) =>
  ACTIVE_SIGNAL_STATUSES.has(String(status || "").trim().toUpperCase());

const mergeActiveSignal = (existing, incoming) => {
  const merged = {
    ...existing,
    ...incoming,
    history: Array.isArray(incoming.history) ? incoming.history : existing.history
  };

  for (const field of LOCKED_ACTIVE_FIELDS) merged[field] = existing[field];
  return merged;
};

/* -------------------- State -------------------- */
const S = {
  bootTs: now(),
  session: 0,
  status: "idle",
  universe: [],
  signals: new Map(),
  symbolToKey: new Map(),
  coolUntil: 0,
  liveCount: 0,
  lastStateEmit: 0,
  stateSeq: 0,
  dbReady: false
};

/* -------------------- DTO Conversion -------------------- */
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
  createdAt: numOrNaN(s.createdAt),
  lastScanTs: numOrNaN(s.lastScanTs),
  lastLiveTs: numOrNaN(s.lastLiveTs),
  live: numOrNaN(s.live),
  pnlPct: numOrNaN(s.pnlPct),
  pnlUsdt: numOrNaN(s.pnlUsdt),
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
  closeTime: +r.close_time,
  createdAt: +r.created_at,
  lastScanTs: +r.last_scan_ts,
  lastLiveTs: r.last_live_ts == null ? NaN : +r.last_live_ts,
  live: r.live == null ? NaN : +r.live,
  pnlPct: r.pnl_pct == null ? NaN : +r.pnl_pct,
  pnlUsdt: r.pnl_usdt == null ? NaN : +r.pnl_usdt,
  history: normalizeHistory(jparse(r.history_json) || [])
});

/* -------------------- Database -------------------- */
const ensureDB = async () => {
  if (S.dbReady && dbmod.isOpen()) return;
  await dbmod.initDb({ filename: env.DB_PATH });
  S.dbReady = true;
};

const persistEnabled = () => env.PERSIST_SIGNALS !== false;

const persistSignal = async (sig) => {
  if (!persistEnabled()) return;
  await ensureDB();

  const h = jstr(normalizeHistory(sig.history)) || null;

  await dbmod.run(
    `INSERT INTO signals(
      key,symbol,tf,setup,side,status,entry,sl,tp,rr,
      close_time,created_at,last_scan_ts,last_live_ts,live,pnl_pct,pnl_usdt,history_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(key) DO UPDATE SET
      symbol=excluded.symbol, tf=excluded.tf, setup=excluded.setup, side=excluded.side,
      status=excluded.status, entry=excluded.entry, sl=excluded.sl, tp=excluded.tp,
      rr=excluded.rr, close_time=excluded.close_time, created_at=excluded.created_at,
      last_scan_ts=excluded.last_scan_ts, last_live_ts=excluded.last_live_ts,
      live=excluded.live, pnl_pct=excluded.pnl_pct, pnl_usdt=excluded.pnl_usdt,
      history_json=excluded.history_json`,
    [
      sig.key, sig.symbol, sig.tf, sig.setup, sig.side, sig.status,
      sig.entry, sig.sl, sig.tp, sig.rr,
      sig.closeTime, sig.createdAt, sig.lastScanTs,
      Number.isFinite(sig.lastLiveTs) ? sig.lastLiveTs : null,
      Number.isFinite(sig.live) ? sig.live : null,
      Number.isFinite(sig.pnlPct) ? sig.pnlPct : null,
      Number.isFinite(sig.pnlUsdt) ? sig.pnlUsdt : null,
      h
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

const loadSignalsFromDB = async () => {
  if (!persistEnabled()) return;
  await ensureDB();

  const rows = await dbmod.all("SELECT * FROM signals ORDER BY created_at DESC LIMIT 500");

  for (const r of rows) {
    const sig = fromSignalRow(r);
    S.signals.set(sig.key, sig);
    if (sig.symbol) S.symbolToKey.set(sig.symbol, sig.key);
  }
};

/* -------------------- State Helpers -------------------- */
const cooldownLeftMs = () => Math.max(0, S.coolUntil - now());

const snapshot = () => ({
  session: S.session,
  status: S.status,
  universeCount: S.universe.length,
  cooldownLeftMs: cooldownLeftMs(),
  liveCount: S.liveCount,
  signals: Array.from(S.signals.values()).map(toSignalDTO)
});

const emitState = (force = 0) => {
  const t = now();
  if (!force && t - S.lastStateEmit < 200) return;
  S.lastStateEmit = t;
  S.stateSeq++;
  publisher.publish("STATE", { seq: S.stateSeq, ts: t, ...snapshot() });
};

/* -------------------- Signal Management -------------------- */
const getSignal = (key) => S.signals.get(key) || null;
const hasSignal = (key) => S.signals.has(key);
const listSignals = (limit = 800) => Array.from(S.signals.values()).slice(0, limit);
const findActiveSignal = (symbol, setup, excludeKey = "") => {
  const sym = strOrEmpty(symbol).trim();
  const normalizedSetup = strOrEmpty(setup).trim();
  const skipKey = strOrEmpty(excludeKey);

  for (const signal of S.signals.values()) {
    if (!signal) continue;
    if (skipKey && signal.key === skipKey) continue;
    if (signal.symbol !== sym) continue;
    if (signal.setup !== normalizedSetup) continue;
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
  let normalized = { ...sig, key: strOrEmpty(sig.key), symbol: strOrEmpty(sig.symbol), tf: strOrEmpty(sig.tf), setup: strOrEmpty(sig.setup), side: strOrEmpty(sig.side), status: strOrEmpty(sig.status), history: normalizeHistory(sig.history) };
  const sym = normalized.symbol.trim();
  const existingByKey = S.signals.get(normalized.key) || null;
  if (existingByKey && isActiveSignalStatus(existingByKey.status)) {
    normalized = mergeActiveSignal(existingByKey, normalized);
  }

  const activeContextSignal = findActiveSignal(sym, normalized.setup, normalized.key);
  if (activeContextSignal) {
    normalized = mergeActiveSignal(activeContextSignal, normalized);
  }

  if (sym) {
    const existingKey = S.symbolToKey.get(sym);
    if (existingKey && existingKey !== normalized.key) {
      const existing = S.signals.get(existingKey);
      if (existing && isActiveSignalStatus(existing.status)) {
        normalized = mergeActiveSignal(existing, normalized);
      } else if (existing) {
        S.signals.delete(existingKey);
        await deleteSignalByKey(existingKey);
        publisher.publish("SIGNAL_REMOVE", { key: existingKey });
        S.symbolToKey.delete(sym);
      }
    }
  }

  const existed = S.signals.has(normalized.key);
  const previous = S.signals.get(normalized.key) || null;
  S.signals.set(normalized.key, normalized);
  if (sym) S.symbolToKey.set(sym, normalized.key);

  await persistSignal(normalized);
  publisher.publish(existed ? "SIGNAL_UPDATE" : "SIGNAL_NEW", toSignalDTO(normalized));
  if (emit) emitState();
};

const removeSignal = async (key, { emit = true } = {}) => {
  const sig = S.signals.get(key);
  if (!sig) return false;

  S.signals.delete(key);
  if (sig.symbol && S.symbolToKey.get(sig.symbol) === key) S.symbolToKey.delete(sig.symbol);
  await deleteSignalByKey(key);
  publisher.publish("SIGNAL_REMOVE", { key });
  if (emit) emitState();
  return true;
};

const clearSignals = async ({ emit = true, clearDb = true } = {}) => {
  S.signals.clear();
  S.symbolToKey.clear();
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
  startSession,
  stopSession,
  setUniverse,
  setCooldown,
  clearCooldown,
  setLiveCount,
  upsertSignal,
  removeSignal,
  clearSignals,
  snapshot
};
