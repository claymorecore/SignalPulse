import { log } from "../middleware/log.js";
import worker from "./worker.js";
import market from "../market/state.js";
import signalTelegramSync from "../services/telegram/signalTelegramSync.js";

const now = () => Date.now();
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const numOrUndef = (v) => (Number.isFinite(+v) ? +v : undefined);
const strOrUndef = (v) => (v == null ? undefined : String(v));

// ---------- DEFAULT CONFIG ----------

const DEFAULT_CANONICAL_CFG = {
  strategy: "EMA_ATR",
  universe: { size: 40 },
  scan: { batch: 8, throttleMs: 140, backfill: 180, symbolCooldownMs: 6500 },
  timeframe: { tick1mSec: 45, tick5mSec: 120, frames: ["1m", "5m"] },
  indicators: { emaFast: 34, emaSlow: 144, atrLen: 14, atrFactor: 1.5 },
  risk: { rrTarget: 2, qty: 1, riskMult: 3 },
  live: { pnlPollSec: 3 },
  price: { mode: "last" }
};

// ---------- CONFIG HANDLING ----------

const mergeCanonicalCfg = (base, incoming) => ({
  strategy: strOrUndef(incoming?.strategy) || base.strategy,
  universe: { ...base.universe, ...(isObj(incoming?.universe) ? incoming.universe : {}) },
  scan: { ...base.scan, ...(isObj(incoming?.scan) ? incoming.scan : {}) },
  timeframe: {
    ...base.timeframe,
    ...(isObj(incoming?.timeframe) ? incoming.timeframe : {}),
    frames: Array.isArray(incoming?.timeframe?.frames)
      ? incoming.timeframe.frames.map((tf) => String(tf || "").trim()).filter(Boolean)
      : base.timeframe.frames
  },
  indicators: { ...base.indicators, ...(isObj(incoming?.indicators) ? incoming.indicators : {}) },
  risk: { ...base.risk, ...(isObj(incoming?.risk) ? incoming.risk : {}) },
  live: { ...base.live, ...(isObj(incoming?.live) ? incoming.live : {}) },
  price: { ...base.price, ...(isObj(incoming?.price) ? incoming.price : {}) }
});

const hasCanonicalShape = (cfg) =>
  isObj(cfg) && (
    isObj(cfg.universe) ||
    isObj(cfg.scan) ||
    isObj(cfg.timeframe) ||
    isObj(cfg.indicators) ||
    isObj(cfg.risk) ||
    isObj(cfg.live) ||
    isObj(cfg.price) ||
    typeof cfg.strategy === "string"
  );

const normalizeCanonicalCfg = (cfg) =>
  mergeCanonicalCfg(DEFAULT_CANONICAL_CFG, {
    strategy: strOrUndef(cfg?.strategy),
    universe: { size: numOrUndef(cfg?.universe?.size) },
    scan: {
      batch: numOrUndef(cfg?.scan?.batch),
      throttleMs: numOrUndef(cfg?.scan?.throttleMs),
      backfill: numOrUndef(cfg?.scan?.backfill),
      symbolCooldownMs: numOrUndef(cfg?.scan?.symbolCooldownMs)
    },
    timeframe: {
      tick1mSec: numOrUndef(cfg?.timeframe?.tick1mSec),
      tick5mSec: numOrUndef(cfg?.timeframe?.tick5mSec),
      frames: Array.isArray(cfg?.timeframe?.frames) ? cfg.timeframe.frames : undefined
    },
    indicators: {
      emaFast: numOrUndef(cfg?.indicators?.emaFast),
      emaSlow: numOrUndef(cfg?.indicators?.emaSlow),
      atrLen: numOrUndef(cfg?.indicators?.atrLen),
      atrFactor: numOrUndef(cfg?.indicators?.atrFactor)
    },
    risk: {
      rrTarget: numOrUndef(cfg?.risk?.rrTarget),
      qty: numOrUndef(cfg?.risk?.qty),
      riskMult: numOrUndef(cfg?.risk?.riskMult)
    },
    live: { pnlPollSec: numOrUndef(cfg?.live?.pnlPollSec) },
    price: { mode: strOrUndef(cfg?.price?.mode) }
  });

const fromLegacyCfg = (cfg) =>
  mergeCanonicalCfg(DEFAULT_CANONICAL_CFG, {
    strategy: strOrUndef(cfg?.strategy),
    universe: { size: numOrUndef(cfg?.uni) },
    scan: {
      batch: numOrUndef(cfg?.batch),
      throttleMs: numOrUndef(cfg?.throttle),
      backfill: numOrUndef(cfg?.backfill),
      symbolCooldownMs: numOrUndef(cfg?.symCd)
    },
    timeframe: {
      tick1mSec: numOrUndef(cfg?.int1),
      tick5mSec: numOrUndef(cfg?.int5),
      frames: Array.isArray(cfg?.tfs) ? cfg.tfs : undefined
    },
    indicators: {
      emaFast: numOrUndef(cfg?.emaF),
      emaSlow: numOrUndef(cfg?.emaS),
      atrLen: numOrUndef(cfg?.atrL),
      atrFactor: numOrUndef(cfg?.atrF)
    },
    risk: {
      rrTarget: numOrUndef(cfg?.rr),
      qty: numOrUndef(cfg?.qty),
      riskMult: numOrUndef(cfg?.riskMult)
    },
    live: { pnlPollSec: numOrUndef(cfg?.pnlPoll) },
    price: { mode: strOrUndef(cfg?.pxMode) }
  });

const pickCanonicalCfg = (cfg) =>
  hasCanonicalShape(cfg) ? normalizeCanonicalCfg(cfg) : fromLegacyCfg(cfg || {});

const toRuntimeCfg = (cfg) => ({
  strategy: cfg.strategy,
  uni: cfg.universe.size,
  batch: cfg.scan.batch,
  throttle: cfg.scan.throttleMs,
  tfs: cfg.timeframe.frames,
  int1: cfg.timeframe.tick1mSec,
  int5: cfg.timeframe.tick5mSec,
  emaF: cfg.indicators.emaFast,
  emaS: cfg.indicators.emaSlow,
  atrL: cfg.indicators.atrLen,
  atrF: cfg.indicators.atrFactor,
  rr: cfg.risk.rrTarget,
  qty: cfg.risk.qty,
  riskMult: cfg.risk.riskMult,
  pnlPoll: cfg.live.pnlPollSec,
  backfill: cfg.scan.backfill,
  symCd: cfg.scan.symbolCooldownMs,
  pxMode: cfg.price.mode
});

// ---------- STATE ----------

const S = {
  running: false,
  cfg: structuredClone(DEFAULT_CANONICAL_CFG),
  runtimeCfg: toRuntimeCfg(DEFAULT_CANONICAL_CFG),
  startedAt: 0
};

// ---------- LIFECYCLE ----------

const start = async (cfg = {}) => {
  if (S.running) {
    await stop({ reason: "restart" });
  }

  const prev = structuredClone(S);

  const canonicalCfg = pickCanonicalCfg(cfg);
  const runtimeCfg = toRuntimeCfg(canonicalCfg);

  S.cfg = canonicalCfg;
  S.runtimeCfg = runtimeCfg;
  S.startedAt = now();
  S.running = true;

  try {
    await market.startSession({ loadDb: false });

    log.info("SCANNER_START", {
      cfg: S.cfg,
      runtimeCfg: S.runtimeCfg,
      startedAt: S.startedAt
    });

    await worker.start(S.runtimeCfg);
  } catch (e) {
    Object.assign(S, prev);

    try { await worker.stop(); } catch {}
    try { await market.stopSession(); } catch {}

    log.error("SCANNER_START_FAIL", {
      err: e?.message || String(e),
      cfg: canonicalCfg
    });

    throw e;
  }

  return { running: true, startedAt: S.startedAt, cfg: structuredClone(S.cfg) };
};

const stop = async ({ reason = "stop" } = {}) => {
  if (!S.running) {
    log.info("SCANNER_STOP", { reason, already: true });
    return { running: false };
  }

  try {
    await worker.stop();
  } catch (e) {
    log.warn("SCANNER_WORKER_STOP_FAIL", { err: e?.message || String(e) });
  }

  try {
    await signalTelegramSync.purgeQueue();
  } catch (e) {
    log.warn("TELEGRAM_QUEUE_PURGE_FAIL", { err: e?.message || String(e), reason });
  }

  S.running = false;

  log.info("SCANNER_STOP", { reason, already: false });

  await market.stopSession();

  return { running: false };
};

const status = () => ({
  running: S.running,
  startedAt: S.startedAt,
  cfg: structuredClone(S.cfg)
});

export default { start, stop, status, S };