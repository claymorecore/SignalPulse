import market from "../market/state.js";
import publisher from "../market/publisher.js";
import binance from "../binance/client.js";
import locks from "./locks.js";
import monitor from "./monitor.js";
import strategies from "./strategies/index.js";
import liveEngine from "./engine/liveEngine.js";
import { log } from "../middleware/log.js";

const now = () => Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const isNum = (n) => Number.isFinite(n);

const TF_SPECS = {
  "1m": { intervalKey: "int1", defaultSec: 45, minSec: 10, maxSec: 3600 },
  "5m": { intervalKey: "int5", defaultSec: 120, minSec: 30, maxSec: 3600 }
};

let RUNNING = false;
let CFG = null;
let TIMERS = {};
let CURSOR = {};
let SYM_NEXT = new Map();
let REJECT_COUNTS = new Map();
let LAST_REJECT_FLUSH = 0;

const normalizeTimeframes = (rawTfs) => {
  const base = Array.isArray(rawTfs) && rawTfs.length ? rawTfs : ["1m", "5m"];
  const seen = new Set();
  const out = [];

  for (const tf of base) {
    const key = String(tf || "").trim();
    if (!TF_SPECS[key]) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out.length ? out : ["1m", "5m"];
};

const buildTfIntervals = (x, tfs) => {
  const out = {};

  for (const tf of tfs) {
    const spec = TF_SPECS[tf];
    const raw = parseInt(x?.[spec.intervalKey] ?? spec.defaultSec, 10) || spec.defaultSec;
    out[tf] = clamp(raw, spec.minSec, spec.maxSec) * 1000;
  }

  return out;
};

const normalizeCfg = (c) => {
  const x = c && typeof c === "object" ? c : {};
  const tfs = normalizeTimeframes(x.tfs);
  const tfIntervals = buildTfIntervals(x, tfs);

  return {
    uni: clamp(parseInt(x.uni ?? 40, 10) || 40, 1, 200),
    batch: clamp(parseInt(x.batch ?? 8, 10) || 8, 1, 80),
    throttle: clamp(parseInt(x.throttle ?? 140, 10) || 140, 0, 5000),

    tfs,
    tfIntervals,

    strategy: String(x.strategy || "EMA_ATR").trim().toUpperCase(),

    emaF: clamp(parseInt(x.emaF ?? 34, 10) || 34, 2, 500),
    emaS: clamp(parseInt(x.emaS ?? 144, 10) || 144, 5, 600),
    atrL: clamp(parseInt(x.atrL ?? 14, 10) || 14, 2, 200),

    atrF: Math.max(0.05, parseFloat(x.atrF ?? 1.5) || 1.5),
    rr: Math.max(0.1, parseFloat(x.rr ?? 2) || 2),

    useMtfFilter: x.useMtfFilter !== false,
    mtfTf: String(x.mtfTf || "5m").trim(),

    requireEntryConfirmation: x.requireEntryConfirmation !== false,
    confirmRequireStructure: x.confirmRequireStructure !== false,
    confirmBreakBufferAtr: Math.max(0, parseFloat(x.confirmBreakBufferAtr ?? 0.02) || 0.02),

    minTrendStrength: Math.max(0, parseFloat(x.minTrendStrength ?? 0.0028) || 0.0028),
    minMtfTrendStrength: Math.max(0, parseFloat(x.minMtfTrendStrength ?? 0.0018) || 0.0018),

    minVolatility: Math.max(0, parseFloat(x.minVolatility ?? 0.0018) || 0.0018),
    maxVolatility: Math.max(0.001, parseFloat(x.maxVolatility ?? 0.045) || 0.045),

    minBodyRatio: clamp(parseFloat(x.minBodyRatio ?? 0.5) || 0.5, 0.05, 0.95),
    maxBadWickRatio: clamp(parseFloat(x.maxBadWickRatio ?? 0.42) || 0.42, 0.05, 0.95),
    maxCandleAtrRange: Math.max(0.5, parseFloat(x.maxCandleAtrRange ?? 2.4) || 2.4),

    maxEntryAtrFromFast: Math.max(0.2, parseFloat(x.maxEntryAtrFromFast ?? 1.25) || 1.25),
    maxPullbackAtrMiss: Math.max(0, parseFloat(x.maxPullbackAtrMiss ?? 0.35) || 0.35),
    maxSpawnDriftRisk: Math.max(0.05, parseFloat(x.maxSpawnDriftRisk ?? 0.3) || 0.3),

    minRiskPct: Math.max(0, parseFloat(x.minRiskPct ?? 0.0025) || 0.0025),
    maxRiskPct: Math.max(0.001, parseFloat(x.maxRiskPct ?? 0.05) || 0.05),
    minTpPct: Math.max(0, parseFloat(x.minTpPct ?? 0.008) || 0.008),
    maxTpPct: Math.max(0.002, parseFloat(x.maxTpPct ?? 0.035) || 0.035),

    breakEvenTriggerR: Math.max(0.1, parseFloat(x.breakEvenTriggerR ?? 0.5) || 0.5),
    breakEvenLockR: Math.max(0, parseFloat(x.breakEvenLockR ?? 0.05) || 0.05),
    profitLockTriggerR: Math.max(0.2, parseFloat(x.profitLockTriggerR ?? 1.0) || 1.0),
    profitLockR: Math.max(0.05, parseFloat(x.profitLockR ?? 0.35) || 0.35),

    rejectDebug: x.rejectDebug !== false,
    rejectFlushMs: clamp(parseInt(x.rejectFlushMs ?? 15_000, 10) || 15_000, 5_000, 120_000),

    pnlPoll: clamp(parseInt(x.pnlPoll ?? 3, 10) || 3, 1, 60) * 1000,

    backfill: clamp(parseInt(x.backfill ?? 180, 10) || 180, 100, 800),
    symCd: clamp(parseInt(x.symCd ?? 6500, 10) || 6500, 200, 600000),

    pxMode: x.pxMode === "last" ? "last" : "mark"
  };
};

const bumpReject = (reason, meta = {}) => {
  if (!CFG?.rejectDebug) return;

  const key = String(reason || "UNKNOWN_REJECT").trim() || "UNKNOWN_REJECT";
  REJECT_COUNTS.set(key, (REJECT_COUNTS.get(key) || 0) + 1);

  if (meta?.symbol && meta?.tf) {
    const sampleKey = `sample:${key}`;
    if (!REJECT_COUNTS.has(sampleKey)) {
      REJECT_COUNTS.set(sampleKey, {
        symbol: meta.symbol,
        tf: meta.tf,
        side: meta.side || null
      });
    }
  }
};

const flushRejectSummary = (force = false) => {
  if (!CFG?.rejectDebug) return;

  const t = now();
  if (!force && t - LAST_REJECT_FLUSH < CFG.rejectFlushMs) return;

  const counts = {};
  const samples = {};

  for (const [key, value] of REJECT_COUNTS.entries()) {
    if (key.startsWith("sample:")) {
      samples[key.replace(/^sample:/, "")] = value;
    } else {
      counts[key] = value;
    }
  }

  REJECT_COUNTS.clear();
  LAST_REJECT_FLUSH = t;

  if (!Object.keys(counts).length) return;

  const payload = {
    ts: t,
    counts,
    samples
  };

  log.info("SIGNAL_REJECT_SUMMARY", payload);
  publisher.publish("SIGNAL_REJECT_SUMMARY", payload);
};

const buildSignalForStrategy = ({ symbol, tf, klines, mtfKlines, cfg }) => {
  const cfgWithReject = {
    ...cfg,
    onReject: (reason, meta = {}) => {
      bumpReject(reason, {
        symbol,
        tf,
        ...meta
      });
    }
  };

  return strategies.buildSignal({
    strategy: cfg.strategy,
    symbol,
    tf,
    klines,
    mtfKlines,
    cfg: cfgWithReject
  });
};

const getUniverse = () => {
  if (typeof market.getUniverse === "function") {
    return market.getUniverse() || [];
  }

  return market.S?.universe || [];
};

const hasActiveTradeForSymbol = (symbol) => {
  if (typeof market.getActiveSignalBySymbol === "function") {
    return !!market.getActiveSignalBySymbol(symbol);
  }

  const signals = typeof market.listSignals === "function" ? market.listSignals() : [];

  return signals.some((signal) => {
    if (!signal) return false;
    if (signal.symbol !== symbol) return false;

    const status = String(signal.status || "").trim().toUpperCase();
    return status === "OPEN" || status === "ACTIVE";
  });
};

const isLockedForCurrentSession = (symbol) => {
  if (typeof market.isSymbolLockedForSession === "function") {
    return market.isSymbolLockedForSession(symbol);
  }

  return false;
};

const isSignalInvalidAtPrice = (signal, price) => {
  if (!signal || !isNum(price)) return true;

  if (signal.side === "LONG") {
    return price <= signal.sl || price >= signal.tp;
  }

  if (signal.side === "SHORT") {
    return price >= signal.sl || price <= signal.tp;
  }

  return true;
};

const getSpawnInvalidReason = (signal, price) => {
  if (!signal || !isNum(price) || price <= 0) {
    return "SPAWN_BAD_PRICE";
  }

  if (signal.side === "LONG") {
    if (price <= signal.sl) return "SPAWN_ALREADY_SL";
    if (price >= signal.tp) return "SPAWN_ALREADY_TP";
  }

  if (signal.side === "SHORT") {
    if (price >= signal.sl) return "SPAWN_ALREADY_SL";
    if (price <= signal.tp) return "SPAWN_ALREADY_TP";
  }

  return null;
};

const isPriceStillNearEntry = (signal, price) => {
  if (!signal || !isNum(price) || !isNum(signal.entry) || !isNum(signal.riskDistance)) {
    return false;
  }

  const drift = Math.abs(price - signal.entry);
  return drift <= signal.riskDistance * CFG.maxSpawnDriftRisk;
};

const validateSpawnPrice = async (signal) => {
  const price = await binance.fetchPrice(signal.symbol, CFG.pxMode);

  const invalidReason = getSpawnInvalidReason(signal, price);

  if (invalidReason) {
    bumpReject(invalidReason, {
      symbol: signal?.symbol,
      tf: signal?.tf,
      side: signal?.side
    });

    return false;
  }

  if (isSignalInvalidAtPrice(signal, price)) {
    bumpReject("SPAWN_INVALID_LEVELS", {
      symbol: signal.symbol,
      tf: signal.tf,
      side: signal.side
    });

    return false;
  }

  if (!isPriceStillNearEntry(signal, price)) {
    bumpReject("SPAWN_DRIFT_TOO_HIGH", {
      symbol: signal.symbol,
      tf: signal.tf,
      side: signal.side
    });

    return false;
  }

  signal.live = price;
  signal.lastLiveTs = now();

  return true;
};

const fetchMtfKlines = async ({ symbol, tf }) => {
  if (!CFG.useMtfFilter) return null;
  if (tf !== "1m") return null;

  const mtfTf = TF_SPECS[CFG.mtfTf] ? CFG.mtfTf : "5m";

  if (mtfTf === tf) return null;

  return binance.fetchKlines(symbol, mtfTf, CFG.backfill);
};

const scanTick = async (tf) => {
  if (!RUNNING) return;

  const lockKey = `scan_${tf}`;
  if (locks.isLocked(lockKey)) return;
  locks.lock(lockKey, 60_000);

  try {
    const uni = getUniverse();
    if (!uni.length) return;

    if (CURSOR[tf] == null) CURSOR[tf] = 0;

    let processed = 0;
    const batch = Math.min(CFG.batch, uni.length);

    for (let guard = 0; guard < uni.length && processed < batch; guard++) {
      if (!RUNNING) break;

      const idx = CURSOR[tf] % uni.length;
      CURSOR[tf] = (CURSOR[tf] + 1) % uni.length;

      const sym = uni[idx];
      const symbolKey = `${sym}|${tf}`;

      const nextAllowedAt = SYM_NEXT.get(symbolKey) || 0;
      if (now() < nextAllowedAt) continue;

      if (hasActiveTradeForSymbol(sym)) {
        bumpReject("ACTIVE_TRADE_EXISTS", { symbol: sym, tf });
        SYM_NEXT.set(symbolKey, now() + CFG.symCd);
        continue;
      }

      if (isLockedForCurrentSession(sym)) {
        bumpReject("SYMBOL_SESSION_LOCKED", { symbol: sym, tf });
        SYM_NEXT.set(symbolKey, now() + CFG.symCd);
        continue;
      }

      SYM_NEXT.set(symbolKey, now() + CFG.symCd);

      try {
        const klines = await binance.fetchKlines(sym, tf, CFG.backfill);
        processed++;

        if (!klines?.length) {
          bumpReject("FETCH_KLINES_EMPTY", { symbol: sym, tf });
          await sleep(CFG.throttle);
          continue;
        }

        if (hasActiveTradeForSymbol(sym)) {
          bumpReject("ACTIVE_TRADE_EXISTS_AFTER_KLINES", { symbol: sym, tf });
          await sleep(CFG.throttle);
          continue;
        }

        if (isLockedForCurrentSession(sym)) {
          bumpReject("SYMBOL_SESSION_LOCKED_AFTER_KLINES", { symbol: sym, tf });
          await sleep(CFG.throttle);
          continue;
        }

        const mtfKlines = await fetchMtfKlines({
          symbol: sym,
          tf
        });

        const signal = buildSignalForStrategy({
          symbol: sym,
          tf,
          klines,
          mtfKlines,
          cfg: CFG
        });

        if (!signal) {
          await sleep(CFG.throttle);
          continue;
        }

        if (hasActiveTradeForSymbol(sym)) {
          bumpReject("ACTIVE_TRADE_EXISTS_AFTER_SIGNAL", { symbol: sym, tf });
          await sleep(CFG.throttle);
          continue;
        }

        if (isLockedForCurrentSession(sym)) {
          bumpReject("SYMBOL_SESSION_LOCKED_AFTER_SIGNAL", { symbol: sym, tf });
          await sleep(CFG.throttle);
          continue;
        }

        const validSpawn = await validateSpawnPrice(signal);

        if (!validSpawn) {
          await sleep(CFG.throttle);
          continue;
        }

        if (hasActiveTradeForSymbol(sym)) {
          bumpReject("ACTIVE_TRADE_EXISTS_BEFORE_UPSERT", { symbol: sym, tf });
          await sleep(CFG.throttle);
          continue;
        }

        if (isLockedForCurrentSession(sym)) {
          bumpReject("SYMBOL_SESSION_LOCKED_BEFORE_UPSERT", { symbol: sym, tf });
          await sleep(CFG.throttle);
          continue;
        }

        await market.upsertSignal(signal, { emit: true });

        await sleep(CFG.throttle);
      } catch (error) {
        bumpReject("SCAN_SYMBOL_ERROR", {
          symbol: sym,
          tf,
          error: error?.message || String(error)
        });

        SYM_NEXT.set(symbolKey, now() + Math.max(CFG.symCd, 12_000));
        await sleep(Math.max(CFG.throttle, 200));
      } finally {
        flushRejectSummary();
      }
    }

    flushRejectSummary();
  } finally {
    locks.unlock(lockKey);
  }
};

const scheduleTimeframeLoops = () => {
  for (const tf of CFG.tfs) {
    const everyMs = CFG.tfIntervals[tf];
    if (!Number.isFinite(everyMs) || everyMs <= 0) continue;

    TIMERS[`scan:${tf}`] = setInterval(() => {
      void scanTick(tf);
    }, everyMs);
  }
};

export const isRunning = () => RUNNING;

export const start = async (cfg) => {
  if (RUNNING) return { ok: true, already: true };

  CFG = normalizeCfg(cfg || {});
  RUNNING = true;

  TIMERS = {};
  CURSOR = {};
  SYM_NEXT = new Map();
  REJECT_COUNTS = new Map();
  LAST_REJECT_FLUSH = 0;

  const uni = await binance.buildUniverse(CFG.uni);
  market.setUniverse(uni);

  for (const tf of CFG.tfs) {
    await scanTick(tf);
  }

  await liveEngine.pollLive({
    cfg: CFG,
    runningRef: () => RUNNING
  });

  scheduleTimeframeLoops();

  TIMERS["live:poll"] = setInterval(() => {
    void liveEngine.pollLive({
      cfg: CFG,
      runningRef: () => RUNNING
    });
  }, CFG.pnlPoll);

  monitor.start({
    everyMs: 2500,
    snapshot: () => market.snapshot()
  });

  return { ok: true, started: true };
};

export const stop = async () => {
  RUNNING = false;

  Object.values(TIMERS).forEach(clearInterval);

  flushRejectSummary(true);

  TIMERS = {};
  CURSOR = {};
  SYM_NEXT = new Map();
  REJECT_COUNTS = new Map();
  LAST_REJECT_FLUSH = 0;

  monitor.stop();
  locks.clear();

  CFG = null;

  return { ok: true, stopped: true };
};

export default { start, stop, isRunning };