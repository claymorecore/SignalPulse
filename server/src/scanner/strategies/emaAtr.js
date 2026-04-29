// scanner/strategies/emaAtr.js
import indicators from "../indicators.js";
import { resolveFixedPosition } from "../positionSizing.js";

const now = () => Date.now();

export function buildSignal({ symbol, tf, klines, cfg }) {
  if (!Array.isArray(klines) || klines.length < 50) return null;

  const closes = klines.map((x) => x.c);
  const highs = klines.map((x) => x.h);
  const lows = klines.map((x) => x.l);

  const ef = indicators.ema(closes, cfg.emaF);
  const es = indicators.ema(closes, cfg.emaS);
  const atr = indicators.atrWilder(highs, lows, closes, cfg.atrL);

  const i = closes.length - 1;

  const entry = closes[i];
  const fast = ef[i];
  const slow = es[i];
  const atrNow = atr[i];
  const last = klines[i];

  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(fast) ||
    !Number.isFinite(slow) ||
    !Number.isFinite(atrNow) ||
    atrNow <= 0 ||
    !last
  ) {
    return null;
  }

  /* ===================== FILTERS ===================== */

  // 1. Trend Strength (EMA Distance)
  const trendStrength = Math.abs(fast - slow) / entry;
  const minTrendStrength = Number.isFinite(cfg.minTrendStrength)
    ? cfg.minTrendStrength
    : 0.002;

  if (trendStrength < minTrendStrength) {
    return null;
  }

  // 2. Volatility (ATR relative to price)
  const vol = atrNow / entry;
  const minVolatility = Number.isFinite(cfg.minVolatility)
    ? cfg.minVolatility
    : 0.0015;

  if (vol < minVolatility) {
    return null;
  }

  // 3. Candle Quality (avoid chop)
  const range = last.h - last.l;
  const body = Math.abs(last.c - last.o);
  const bodyRatio = range > 0 ? body / range : 0;

  const minBodyRatio = Number.isFinite(cfg.minBodyRatio)
    ? cfg.minBodyRatio
    : 0.55;

  if (bodyRatio < minBodyRatio) {
    return null;
  }

  /* ===================== ENTRY ===================== */

  let side = null;

  if (fast > slow && entry > fast) {
    side = "LONG";
  } else if (fast < slow && entry < fast) {
    side = "SHORT";
  }

  if (!side) return null;

  /* ===================== RISK MODEL ===================== */

  const riskDistance = cfg.atrF * atrNow;

  if (!Number.isFinite(riskDistance) || riskDistance <= 0) {
    return null;
  }

  const sl =
    side === "LONG"
      ? entry - riskDistance
      : entry + riskDistance;

  const tp =
    side === "LONG"
      ? entry + cfg.rr * riskDistance
      : entry - cfg.rr * riskDistance;

  const rr =
    Math.abs(tp - entry) / Math.abs(entry - sl);

  if (!Number.isFinite(rr) || rr <= 0) {
    return null;
  }

  /* ===================== CAPITAL / QTY ===================== */

  const { capitalUsd, qty } = resolveFixedPosition(entry);

  /* ===================== SIGNAL ===================== */

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

    closeTime: klines[i].ct,
    createdAt: ts,
    lastScanTs: ts,

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