import { SETUP_TYPES } from "../types.js";
import {
  averageTrueRange,
  directionalBias,
  getRecentCandles,
  normalizeCandles
} from "../utils/candles.js";

export const detectTrendContinuation = ({ symbol, timeframe, candles, context }) => {
  const normalized = normalizeCandles(candles);
  if (normalized.length < 30) return null;

  const recent = getRecentCandles(normalized, 6);
  const last = recent[recent.length - 1];
  const previous = recent[recent.length - 2];
  const shortBias = directionalBias(normalized, 10);
  const atr = averageTrueRange(normalized, 14) || Math.max(last.close * 0.003, 0.0001);

  if (context.trend === "bullish" && shortBias > 0.5 && last.close > previous.high) {
    const entry = last.close;
    const stopLoss = Math.min(...recent.map((candle) => candle.low));
    const takeProfit = entry + Math.max(atr * 2.2, entry - stopLoss);
    const rr = (takeProfit - entry) / Math.max(entry - stopLoss, 0.0001);

    return {
      detectorKey: "trend-continuation",
      setupType: SETUP_TYPES.TREND_CONTINUATION,
      direction: "long",
      regime: context.trend,
      entry,
      stopLoss,
      takeProfit,
      rr,
      reasons: [
        `${symbol} is trending higher and just continued through the recent swing high.`,
        `Short-term directional bias remains positive at ${shortBias.toFixed(2)}%.`
      ],
      metrics: {
        breakoutClose: Number(last.close.toFixed(4)),
        previousHigh: Number(previous.high.toFixed(4)),
        shortBias: Number(shortBias.toFixed(2)),
        atr: Number(atr.toFixed(4))
      },
      contextTags: [...context.tags, `timeframe:${timeframe}`]
    };
  }

  if (context.trend === "bearish" && shortBias < -0.5 && last.close < previous.low) {
    const entry = last.close;
    const stopLoss = Math.max(...recent.map((candle) => candle.high));
    const takeProfit = entry - Math.max(atr * 2.2, stopLoss - entry);
    const rr = (entry - takeProfit) / Math.max(stopLoss - entry, 0.0001);

    return {
      detectorKey: "trend-continuation",
      setupType: SETUP_TYPES.TREND_CONTINUATION,
      direction: "short",
      regime: context.trend,
      entry,
      stopLoss,
      takeProfit,
      rr,
      reasons: [
        `${symbol} is trending lower and just continued through the recent swing low.`,
        `Short-term directional bias remains negative at ${shortBias.toFixed(2)}%.`
      ],
      metrics: {
        breakoutClose: Number(last.close.toFixed(4)),
        previousLow: Number(previous.low.toFixed(4)),
        shortBias: Number(shortBias.toFixed(2)),
        atr: Number(atr.toFixed(4))
      },
      contextTags: [...context.tags, `timeframe:${timeframe}`]
    };
  }

  return null;
};

export default detectTrendContinuation;
