// scanner/strategies/ema_atr.js
import indicators from "../indicators.js";

const now = () => Date.now();

export function buildEmaAtrSignal({ symbol, tf, klines, cfg }) {
  const closes = klines.map(x => x.c);
  const highs = klines.map(x => x.h);
  const lows = klines.map(x => x.l);

  const ef = indicators.ema(closes, cfg.emaF);
  const es = indicators.ema(closes, cfg.emaS);
  const atr = indicators.atrWilder(highs, lows, closes, cfg.atrL);

  const i = closes.length - 1;
  const entry = closes[i];
  const fast = ef[i];
  const slow = es[i];
  const atrNow = atr[i];

  if (!Number.isFinite(entry) || !Number.isFinite(fast) ||
      !Number.isFinite(slow) || !Number.isFinite(atrNow) || atrNow <= 0) {
    return null;
  }

  let side = null;
  if (fast > slow && entry > fast) side = "LONG";
  else if (fast < slow && entry < fast) side = "SHORT";
  if (!side) return null;

  const riskDistance = cfg.atrF * atrNow;
  const sl = side === "LONG" ? entry - riskDistance : entry + riskDistance;
  const tp = side === "LONG" ? entry + cfg.rr * riskDistance : entry - cfg.rr * riskDistance;
  const rr = Math.abs(tp - entry) / Math.abs(entry - sl);

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

export default { buildEmaAtrSignal };