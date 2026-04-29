// scanner/strategies/emaAtr.js
import indicators from "../indicators.js";
import { resolveFixedPosition } from "../positionSizing.js";

const now = () => Date.now();

const isNum = (n) => Number.isFinite(n);

const reject = (cfg, reason, meta = {}) => {
  if (typeof cfg?.onReject === "function") {
    cfg.onReject(reason, meta);
  }

  return null;
};

const getLastClosedIndex = (klines) => {
  const t = now();

  for (let i = klines.length - 1; i >= 0; i--) {
    const closeTime = Number(klines[i]?.ct);
    if (Number.isFinite(closeTime) && closeTime <= t - 750) {
      return i;
    }
  }

  return -1;
};

const getCfgNum = (cfg, key, fallback) => {
  const n = Number(cfg?.[key]);
  return Number.isFinite(n) ? n : fallback;
};

const hasValidCandle = (k) => {
  if (!k) return false;

  return (
    isNum(k.o) &&
    isNum(k.h) &&
    isNum(k.l) &&
    isNum(k.c) &&
    k.h >= k.l &&
    k.h > 0 &&
    k.l > 0 &&
    k.c > 0
  );
};

const candleStats = (k) => {
  const range = k.h - k.l;
  const body = Math.abs(k.c - k.o);
  const upperWick = k.h - Math.max(k.o, k.c);
  const lowerWick = Math.min(k.o, k.c) - k.l;

  return {
    range,
    body,
    bodyRatio: range > 0 ? body / range : 0,
    upperWick,
    lowerWick,
    upperWickRatio: range > 0 ? upperWick / range : 0,
    lowerWickRatio: range > 0 ? lowerWick / range : 0
  };
};

const trendSlopeOk = ({ side, fast, fastPrev, slow, slowPrev }) => {
  if (![fast, fastPrev, slow, slowPrev].every(isNum)) return false;

  if (side === "LONG") {
    return fast > fastPrev && slow > slowPrev;
  }

  if (side === "SHORT") {
    return fast < fastPrev && slow < slowPrev;
  }

  return false;
};

const isOverextended = ({ entry, fast, atrNow, cfg }) => {
  const maxEntryAtrFromFast = getCfgNum(cfg, "maxEntryAtrFromFast", 1.25);
  const distance = Math.abs(entry - fast);

  return distance > maxEntryAtrFromFast * atrNow;
};

const passedPullbackQuality = ({ side, candle, fast, atrNow, cfg }) => {
  const maxPullbackAtrMiss = getCfgNum(cfg, "maxPullbackAtrMiss", 0.35);
  const tolerance = maxPullbackAtrMiss * atrNow;

  if (side === "LONG") {
    return candle.l <= fast + tolerance;
  }

  if (side === "SHORT") {
    return candle.h >= fast - tolerance;
  }

  return false;
};

const buildTrendContext = ({ klines, cfg }) => {
  if (!Array.isArray(klines) || klines.length < 80) {
    return {
      ok: false,
      side: null,
      strength: 0,
      reason: "MTF_NOT_ENOUGH_KLINES"
    };
  }

  const i = getLastClosedIndex(klines);
  if (i < 50) {
    return {
      ok: false,
      side: null,
      strength: 0,
      reason: "MTF_NO_CLOSED_CANDLE"
    };
  }

  const usable = klines.slice(0, i + 1);

  const closes = usable.map((x) => x.c);
  const highs = usable.map((x) => x.h);
  const lows = usable.map((x) => x.l);

  const ef = indicators.ema(closes, cfg.emaF);
  const es = indicators.ema(closes, cfg.emaS);
  const atr = indicators.atrWilder(highs, lows, closes, cfg.atrL);

  const j = usable.length - 1;

  const entry = closes[j];
  const fast = ef[j];
  const slow = es[j];
  const fastPrev = ef[j - 3];
  const slowPrev = es[j - 3];
  const atrNow = atr[j];

  if (![entry, fast, slow, fastPrev, slowPrev, atrNow].every(isNum) || atrNow <= 0) {
    return {
      ok: false,
      side: null,
      strength: 0,
      reason: "MTF_BAD_INDICATORS"
    };
  }

  const strength = Math.abs(fast - slow) / entry;
  const minMtfTrendStrength = getCfgNum(cfg, "minMtfTrendStrength", 0.0018);

  if (strength < minMtfTrendStrength) {
    return {
      ok: false,
      side: null,
      strength,
      reason: "MTF_TREND_TOO_WEAK"
    };
  }

  if (fast > slow && fast > fastPrev && slow > slowPrev) {
    return {
      ok: true,
      side: "LONG",
      strength,
      reason: null
    };
  }

  if (fast < slow && fast < fastPrev && slow < slowPrev) {
    return {
      ok: true,
      side: "SHORT",
      strength,
      reason: null
    };
  }

  return {
    ok: false,
    side: null,
    strength,
    reason: "MTF_SLOPE_MISMATCH"
  };
};

const mtfAllowsSide = ({ tf, side, mtf, cfg }) => {
  const enabled = cfg?.useMtfFilter !== false;

  if (!enabled) return true;
  if (tf !== "1m") return true;

  if (!mtf || !mtf.ok) return false;
  return mtf.side === side;
};

export function buildSignal({ symbol, tf, klines, cfg, mtfKlines }) {
  if (!Array.isArray(klines) || klines.length < 80) {
    return reject(cfg, "NOT_ENOUGH_KLINES", {
      symbol,
      tf,
      count: Array.isArray(klines) ? klines.length : 0
    });
  }

  const i = getLastClosedIndex(klines);
  if (i < 50) {
    return reject(cfg, "NO_USABLE_CLOSED_CANDLE", { symbol, tf, index: i });
  }

  const usable = klines.slice(0, i + 1);
  const last = usable[usable.length - 1];
  const prev = usable[usable.length - 2];

  if (!hasValidCandle(last) || !hasValidCandle(prev)) {
    return reject(cfg, "BAD_CANDLE_DATA", { symbol, tf });
  }

  const closes = usable.map((x) => x.c);
  const highs = usable.map((x) => x.h);
  const lows = usable.map((x) => x.l);

  const ef = indicators.ema(closes, cfg.emaF);
  const es = indicators.ema(closes, cfg.emaS);
  const atr = indicators.atrWilder(highs, lows, closes, cfg.atrL);

  const j = usable.length - 1;

  const entry = closes[j];
  const fast = ef[j];
  const slow = es[j];
  const fastPrev = ef[j - 3];
  const slowPrev = es[j - 3];
  const atrNow = atr[j];
  const atrPrev = atr[j - 1];

  if (
    !isNum(entry) ||
    !isNum(fast) ||
    !isNum(slow) ||
    !isNum(fastPrev) ||
    !isNum(slowPrev) ||
    !isNum(atrNow) ||
    !isNum(atrPrev) ||
    atrNow <= 0 ||
    atrPrev <= 0
  ) {
    return reject(cfg, "BAD_INDICATORS", { symbol, tf });
  }

  const stats = candleStats(last);

  const minTrendStrength = getCfgNum(cfg, "minTrendStrength", 0.0028);
  const trendStrength = Math.abs(fast - slow) / entry;

  if (trendStrength < minTrendStrength) {
    return reject(cfg, "TREND_TOO_WEAK", {
      symbol,
      tf,
      trendStrength,
      minTrendStrength
    });
  }

  const atrPct = atrNow / entry;
  const minVolatility = getCfgNum(cfg, "minVolatility", 0.0018);
  const maxVolatility = getCfgNum(cfg, "maxVolatility", 0.045);

  if (atrPct < minVolatility) {
    return reject(cfg, "VOLATILITY_TOO_LOW", {
      symbol,
      tf,
      atrPct,
      minVolatility
    });
  }

  if (atrPct > maxVolatility) {
    return reject(cfg, "VOLATILITY_TOO_HIGH", {
      symbol,
      tf,
      atrPct,
      maxVolatility
    });
  }

  const minBodyRatio = getCfgNum(cfg, "minBodyRatio", 0.5);
  if (stats.bodyRatio < minBodyRatio) {
    return reject(cfg, "BODY_TOO_SMALL", {
      symbol,
      tf,
      bodyRatio: stats.bodyRatio,
      minBodyRatio
    });
  }

  const maxCandleAtrRange = getCfgNum(cfg, "maxCandleAtrRange", 2.4);
  if (stats.range > maxCandleAtrRange * atrNow) {
    return reject(cfg, "CANDLE_RANGE_TOO_LARGE", {
      symbol,
      tf,
      rangeAtr: stats.range / atrNow,
      maxCandleAtrRange
    });
  }

  let side = null;

  if (fast > slow && entry > fast && last.c > last.o) {
    side = "LONG";
  } else if (fast < slow && entry < fast && last.c < last.o) {
    side = "SHORT";
  }

  if (!side) {
    return reject(cfg, "NO_ENTRY_SIDE", {
      symbol,
      tf,
      fast,
      slow,
      entry,
      candleDirection: last.c >= last.o ? "UP" : "DOWN"
    });
  }

  if (!trendSlopeOk({ side, fast, fastPrev, slow, slowPrev })) {
    return reject(cfg, "SLOPE_MISMATCH", {
      symbol,
      tf,
      side
    });
  }

  const mtf = buildTrendContext({
    klines: Array.isArray(mtfKlines) && mtfKlines.length ? mtfKlines : klines,
    cfg
  });

  if (!mtfAllowsSide({ tf, side, mtf, cfg })) {
    return reject(cfg, "MTF_REJECT", {
      symbol,
      tf,
      side,
      mtfSide: mtf?.side || null,
      mtfStrength: mtf?.strength || 0,
      mtfReason: mtf?.reason || null
    });
  }

  if (isOverextended({ entry, fast, atrNow, cfg })) {
    return reject(cfg, "ENTRY_OVEREXTENDED", {
      symbol,
      tf,
      side,
      entryAtrFromFast: Math.abs(entry - fast) / atrNow,
      maxEntryAtrFromFast: getCfgNum(cfg, "maxEntryAtrFromFast", 1.25)
    });
  }

  if (!passedPullbackQuality({ side, candle: last, fast, atrNow, cfg })) {
    return reject(cfg, "PULLBACK_MISSED", {
      symbol,
      tf,
      side,
      maxPullbackAtrMiss: getCfgNum(cfg, "maxPullbackAtrMiss", 0.35)
    });
  }

  const maxBadWickRatio = getCfgNum(cfg, "maxBadWickRatio", 0.42);

  if (side === "LONG" && stats.upperWickRatio > maxBadWickRatio) {
    return reject(cfg, "BAD_UPPER_WICK", {
      symbol,
      tf,
      side,
      upperWickRatio: stats.upperWickRatio,
      maxBadWickRatio
    });
  }

  if (side === "SHORT" && stats.lowerWickRatio > maxBadWickRatio) {
    return reject(cfg, "BAD_LOWER_WICK", {
      symbol,
      tf,
      side,
      lowerWickRatio: stats.lowerWickRatio,
      maxBadWickRatio
    });
  }

  const riskDistance = cfg.atrF * atrNow;

  if (!isNum(riskDistance) || riskDistance <= 0) {
    return reject(cfg, "BAD_RISK_DISTANCE", { symbol, tf, riskDistance });
  }

  const sl = side === "LONG"
    ? entry - riskDistance
    : entry + riskDistance;

  const tp = side === "LONG"
    ? entry + cfg.rr * riskDistance
    : entry - cfg.rr * riskDistance;

  const rr = Math.abs(tp - entry) / Math.abs(entry - sl);

  if (!isNum(sl) || !isNum(tp) || !isNum(rr) || rr <= 0) {
    return reject(cfg, "BAD_LEVELS", { symbol, tf, side, entry, sl, tp, rr });
  }

  if (side === "LONG" && !(sl < entry && tp > entry)) {
    return reject(cfg, "BAD_LONG_LEVEL_GEOMETRY", { symbol, tf, entry, sl, tp });
  }

  if (side === "SHORT" && !(sl > entry && tp < entry)) {
    return reject(cfg, "BAD_SHORT_LEVEL_GEOMETRY", { symbol, tf, entry, sl, tp });
  }

  const { capitalUsd, qty } = resolveFixedPosition(entry);

  const ts = now();
  const key = `${symbol}|${tf}|EMA_ATR|${side}`;

  return {
    key,
    symbol,
    tf,
    setup: "EMA_ATR",
    side,
    status: "OPEN",

    entry,
    sl,
    tp,
    rr,

    qty,
    capitalUsd,
    riskDistance,

    closeTime: last.ct,
    createdAt: ts,
    lastScanTs: ts,

    mtfSide: mtf.side,
    mtfStrength: mtf.strength,
    trendStrength,
    atrPct,

    lastLiveTs: NaN,
    live: NaN,
    pnlPct: NaN,
    pnlUsdt: NaN,

    history: []
  };
}

export default {
  buildSignal
};