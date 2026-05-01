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

const passedEntryConfirmation = ({ side, setupCandle, confirmCandle, fast, atrNow, cfg }) => {
  if (cfg?.requireEntryConfirmation === false) {
    return {
      ok: true,
      reason: null
    };
  }

  if (!hasValidCandle(setupCandle) || !hasValidCandle(confirmCandle)) {
    return {
      ok: false,
      reason: "ENTRY_CONFIRMATION_BAD_CANDLES"
    };
  }

  const bufferAtr = getCfgNum(cfg, "confirmBreakBufferAtr", 0.02);
  const buffer = bufferAtr * atrNow;

  const requireStructure = cfg?.confirmRequireStructure !== false;

  if (side === "LONG") {
    if (confirmCandle.c <= confirmCandle.o) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_NOT_BULLISH"
      };
    }

    if (confirmCandle.c < fast + buffer) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_BELOW_FAST"
      };
    }

    if (confirmCandle.c < setupCandle.c + buffer) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_NO_CLOSE_PROGRESS"
      };
    }

    if (requireStructure && confirmCandle.l < setupCandle.l) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_NO_HIGHER_LOW"
      };
    }

    return {
      ok: true,
      reason: null
    };
  }

  if (side === "SHORT") {
    if (confirmCandle.c >= confirmCandle.o) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_NOT_BEARISH"
      };
    }

    if (confirmCandle.c > fast - buffer) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_ABOVE_FAST"
      };
    }

    if (confirmCandle.c > setupCandle.c - buffer) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_NO_CLOSE_PROGRESS"
      };
    }

    if (requireStructure && confirmCandle.h > setupCandle.h) {
      return {
        ok: false,
        reason: "ENTRY_CONFIRMATION_NO_LOWER_HIGH"
      };
    }

    return {
      ok: true,
      reason: null
    };
  }

  return {
    ok: false,
    reason: "ENTRY_CONFIRMATION_BAD_SIDE"
  };
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

const buildLevels = ({ side, entry, rawRiskDistance, cfg }) => {
  const minRiskPct = getCfgNum(cfg, "minRiskPct", 0.004);
  const maxRiskPct = getCfgNum(cfg, "maxRiskPct", 0.06);
  const maxTpPct = getCfgNum(cfg, "maxTpPct", 0);

  const minRiskDistance = minRiskPct * entry;
  const riskDistance = Math.max(rawRiskDistance, minRiskDistance);
  const riskPct = riskDistance / entry;

  if (riskPct > maxRiskPct) {
    return {
      ok: false,
      reason: "RISK_DISTANCE_TOO_LARGE",
      meta: { riskPct, maxRiskPct }
    };
  }

  const rawTpDistance = cfg.rr * riskDistance;
  const cappedTpDistance = maxTpPct > 0
    ? Math.min(rawTpDistance, maxTpPct * entry)
    : rawTpDistance;

  const tpDistance = cappedTpDistance;
  const tpPct = tpDistance / entry;

  const sl =
    side === "LONG"
      ? entry - riskDistance
      : entry + riskDistance;

  const tp =
    side === "LONG"
      ? entry + tpDistance
      : entry - tpDistance;

  const rr = Math.abs(tp - entry) / Math.abs(entry - sl);

  if (Math.abs(rr - cfg.rr) > 0.0001 && maxTpPct <= 0) {
    return {
      ok: false,
      reason: "RR_GEOMETRY_MISMATCH",
      meta: { rr, targetRr: cfg.rr }
    };
  }

  return {
    ok: true,
    sl,
    tp,
    rr,
    riskDistance,
    rawRiskDistance,
    riskPct,
    tpDistance,
    tpPct,
    riskFloored: riskDistance > rawRiskDistance,
    tpCapped: tpDistance < rawTpDistance
  };
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
  if (i < 51) {
    return reject(cfg, "NO_USABLE_CLOSED_CANDLE", { symbol, tf, index: i });
  }

  const usable = klines.slice(0, i + 1);
  const confirmCandle = usable[usable.length - 1];
  const setupCandle = usable[usable.length - 2];

  if (!hasValidCandle(confirmCandle) || !hasValidCandle(setupCandle)) {
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

  const confirmStats = candleStats(confirmCandle);

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
  if (confirmStats.bodyRatio < minBodyRatio) {
    return reject(cfg, "BODY_TOO_SMALL", {
      symbol,
      tf,
      bodyRatio: confirmStats.bodyRatio,
      minBodyRatio
    });
  }

  const maxCandleAtrRange = getCfgNum(cfg, "maxCandleAtrRange", 2.4);
  if (confirmStats.range > maxCandleAtrRange * atrNow) {
    return reject(cfg, "CANDLE_RANGE_TOO_LARGE", {
      symbol,
      tf,
      rangeAtr: confirmStats.range / atrNow,
      maxCandleAtrRange
    });
  }

  let side = null;

  if (fast > slow && entry > fast) {
    side = "LONG";
  } else if (fast < slow && entry < fast) {
    side = "SHORT";
  }

  if (!side) {
    return reject(cfg, "NO_ENTRY_SIDE", {
      symbol,
      tf,
      fast,
      slow,
      entry,
      candleDirection: confirmCandle.c >= confirmCandle.o ? "UP" : "DOWN"
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

  if (!passedPullbackQuality({ side, candle: setupCandle, fast, atrNow, cfg })) {
    return reject(cfg, "PULLBACK_MISSED", {
      symbol,
      tf,
      side,
      maxPullbackAtrMiss: getCfgNum(cfg, "maxPullbackAtrMiss", 0.35)
    });
  }

  const confirmation = passedEntryConfirmation({
    side,
    setupCandle,
    confirmCandle,
    fast,
    atrNow,
    cfg
  });

  if (!confirmation.ok) {
    return reject(cfg, confirmation.reason || "ENTRY_CONFIRMATION_FAILED", {
      symbol,
      tf,
      side
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

  const maxBadWickRatio = getCfgNum(cfg, "maxBadWickRatio", 0.42);

  if (side === "LONG" && confirmStats.upperWickRatio > maxBadWickRatio) {
    return reject(cfg, "BAD_UPPER_WICK", {
      symbol,
      tf,
      side,
      upperWickRatio: confirmStats.upperWickRatio,
      maxBadWickRatio
    });
  }

  if (side === "SHORT" && confirmStats.lowerWickRatio > maxBadWickRatio) {
    return reject(cfg, "BAD_LOWER_WICK", {
      symbol,
      tf,
      side,
      lowerWickRatio: confirmStats.lowerWickRatio,
      maxBadWickRatio
    });
  }

  const rawRiskDistance = cfg.atrF * atrNow;

  if (!isNum(rawRiskDistance) || rawRiskDistance <= 0) {
    return reject(cfg, "BAD_RISK_DISTANCE", { symbol, tf, riskDistance: rawRiskDistance });
  }

  const levels = buildLevels({
    side,
    entry,
    rawRiskDistance,
    cfg
  });

  if (!levels.ok) {
    return reject(cfg, levels.reason, {
      symbol,
      tf,
      side,
      ...(levels.meta || {})
    });
  }

  if (!isNum(levels.sl) || !isNum(levels.tp) || !isNum(levels.rr) || levels.rr <= 0) {
    return reject(cfg, "BAD_LEVELS", {
      symbol,
      tf,
      side,
      entry,
      sl: levels.sl,
      tp: levels.tp,
      rr: levels.rr
    });
  }

  if (side === "LONG" && !(levels.sl < entry && levels.tp > entry)) {
    return reject(cfg, "BAD_LONG_LEVEL_GEOMETRY", {
      symbol,
      tf,
      entry,
      sl: levels.sl,
      tp: levels.tp
    });
  }

  if (side === "SHORT" && !(levels.sl > entry && levels.tp < entry)) {
    return reject(cfg, "BAD_SHORT_LEVEL_GEOMETRY", {
      symbol,
      tf,
      entry,
      sl: levels.sl,
      tp: levels.tp
    });
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
    sl: levels.sl,
    tp: levels.tp,
    rr: levels.rr,

    qty,
    capitalUsd,
    riskDistance: levels.riskDistance,

    closeTime: confirmCandle.ct,
    createdAt: ts,
    lastScanTs: ts,

    mtfSide: mtf.side,
    mtfStrength: mtf.strength,
    trendStrength,
    atrPct,

    entryModel: "PULLBACK_CONFIRMATION",
    setupClose: setupCandle.c,
    confirmClose: confirmCandle.c,

    rawRiskDistance: levels.rawRiskDistance,
    riskPct: levels.riskPct,
    tpPct: levels.tpPct,
    riskFloored: levels.riskFloored,
    tpCapped: levels.tpCapped,

    breakEvenTriggerR: cfg.breakEvenTriggerR,
    breakEvenLockR: cfg.breakEvenLockR,
    profitLockTriggerR: cfg.profitLockTriggerR,
    profitLockR: cfg.profitLockR,

    peakR: 0,
    peakPnlUsdt: 0,
    protectionStop: NaN,
    protectionMode: null,
    exitReason: null,
    exitPrice: NaN,

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