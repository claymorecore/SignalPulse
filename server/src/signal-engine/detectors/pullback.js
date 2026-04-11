import { SETUP_TYPES } from "../types.js";
import {
  averageTrueRange,
  getRecentCandles,
  normalizeCandles
} from "../utils/candles.js";
import { average } from "../utils/math.js";

export const detectPullback = ({ symbol, timeframe, candles, context, config }) => {
  const normalized = normalizeCandles(candles);
  if (normalized.length < config.thresholds.pullbackWindow + 5) return null;

  const recent = getRecentCandles(normalized, config.thresholds.pullbackWindow);
  const last = recent[recent.length - 1];
  const avgClose = average(recent.map((candle) => candle.close));
  const atr = averageTrueRange(normalized, 14) || Math.max(last.close * 0.003, 0.0001);
  const support = Math.min(...recent.map((candle) => candle.low));
  const resistance = Math.max(...recent.map((candle) => candle.high));

  if (
    context.trend === "bullish" &&
    context.cleanliness !== "noisy" &&
    last.close > avgClose &&
    last.low <= avgClose
  ) {
    const entry = last.close;
    const stopLoss = support - atr * 0.35;
    const takeProfit = resistance + atr * 1.5;
    const rr = (takeProfit - entry) / Math.max(entry - stopLoss, 0.0001);

    return {
      detectorKey: "pullback",
      setupType: SETUP_TYPES.PULLBACK,
      direction: "long",
      regime: context.trend,
      entry,
      stopLoss,
      takeProfit,
      rr,
      reasons: [
        `${symbol} pulled back into its local mean and is attempting to hold trend support.`,
        `Clean bullish context makes the pullback easier to trust than a fresh breakout.`
      ],
      metrics: {
        averageClose: Number(avgClose.toFixed(4)),
        support: Number(support.toFixed(4)),
        resistance: Number(resistance.toFixed(4)),
        atr: Number(atr.toFixed(4))
      },
      contextTags: [...context.tags, `timeframe:${timeframe}`]
    };
  }

  if (
    context.trend === "bearish" &&
    context.cleanliness !== "noisy" &&
    last.close < avgClose &&
    last.high >= avgClose
  ) {
    const entry = last.close;
    const stopLoss = resistance + atr * 0.35;
    const takeProfit = support - atr * 1.5;
    const rr = (entry - takeProfit) / Math.max(stopLoss - entry, 0.0001);

    return {
      detectorKey: "pullback",
      setupType: SETUP_TYPES.PULLBACK,
      direction: "short",
      regime: context.trend,
      entry,
      stopLoss,
      takeProfit,
      rr,
      reasons: [
        `${symbol} pulled back into its local mean and is attempting to reject trend resistance.`,
        `Clean bearish context keeps the setup disciplined instead of reactive.`
      ],
      metrics: {
        averageClose: Number(avgClose.toFixed(4)),
        support: Number(support.toFixed(4)),
        resistance: Number(resistance.toFixed(4)),
        atr: Number(atr.toFixed(4))
      },
      contextTags: [...context.tags, `timeframe:${timeframe}`]
    };
  }

  return null;
};

export default detectPullback;
