import env from "../config/env.js";
import market from "../market/state.js";
import binance from "../binance/client.js";
import locks from "./locks.js";
import monitor from "./monitor.js";
import strategies from "./strategies/index.js";
import liveEngine from "./engine/liveEngine.js";

const now = () => Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const TF_SPECS = {
  "1m": { intervalKey: "int1", defaultSec: 45, minSec: 10, maxSec: 3600 },
  "5m": { intervalKey: "int5", defaultSec: 120, minSec: 30, maxSec: 3600 }
};

let RUNNING = false;
let CFG = null;
let TIMERS = {};
let CURSOR = {};
let SYM_NEXT = new Map();

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

    pnlPoll: clamp(parseInt(x.pnlPoll ?? 3, 10) || 3, 1, 60) * 1000,

    backfill: clamp(parseInt(x.backfill ?? 180, 10) || 180, 80, 800),
    symCd: clamp(parseInt(x.symCd ?? 6500, 10) || 6500, 200, 600000),

    pxMode: x.pxMode === "last" ? "last" : "mark"
  };
};

const buildSignalForStrategy = ({ symbol, tf, klines, cfg }) => {
  return strategies.buildSignal({
    strategy: cfg.strategy,
    symbol,
    tf,
    klines,
    cfg
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

      if (hasActiveTradeForSymbol(sym) || isLockedForCurrentSession(sym)) {
        SYM_NEXT.set(symbolKey, now() + CFG.symCd);
        continue;
      }

      SYM_NEXT.set(symbolKey, now() + CFG.symCd);

      try {
        const klines = await binance.fetchKlines(sym, tf, CFG.backfill);
        processed++;

        if (!klines?.length) {
          await sleep(CFG.throttle);
          continue;
        }

        if (hasActiveTradeForSymbol(sym) || isLockedForCurrentSession(sym)) {
          await sleep(CFG.throttle);
          continue;
        }

        const signal = buildSignalForStrategy({
          symbol: sym,
          tf,
          klines,
          cfg: CFG
        });

        if (!signal) {
          await sleep(CFG.throttle);
          continue;
        }

        if (hasActiveTradeForSymbol(sym) || isLockedForCurrentSession(sym)) {
          await sleep(CFG.throttle);
          continue;
        }

        await market.upsertSignal(signal, { emit: true });

        await sleep(CFG.throttle);
      } catch {
        SYM_NEXT.set(symbolKey, now() + Math.max(CFG.symCd, 12_000));
        await sleep(Math.max(CFG.throttle, 200));
      }
    }
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

  TIMERS = {};
  CURSOR = {};
  SYM_NEXT = new Map();

  monitor.stop();
  locks.clear();

  CFG = null;

  return { ok: true, stopped: true };
};

export default { start, stop, isRunning };