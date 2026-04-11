import { SETUP_TYPES } from "../types.js";
import {
  averageTrueRange,
  getRecentCandles,
  normalizeCandles,
  recentBreakoutLevels
} from "../utils/candles.js";

export const detectBreakout = ({ symbol, timeframe, candles, context, config }) => {
  const normalized = normalizeCandles(candles);
  if (normalized.length < config.thresholds.breakoutLookback + 2) return null;

  const lookback = config.thresholds.breakoutLookback;
  const recent = getRecentCandles(normalized, lookback + 1);
  const trigger = recent[recent.length - 1];
  const prior = recent.slice(0, -1);
  const levels = recentBreakoutLevels(prior, lookback);
  const atr = averageTrueRange(normalized, 14) || Math.max(trigger.close * 0.003, 0.0001);

  if (
    trigger.close > levels.high &&
    context.cleanliness !== "noisy" &&
    context.volatilityRegime !== "compressed"
  ) {
    const entry = trigger.close;
    const stopLoss = Math.max(levels.high - atr, Math.min(...prior.slice(-5).map((candle) => candle.low)));
    const takeProfit = entry + Math.max(atr * 2.4, entry - stopLoss);
    const rr = (takeProfit - entry) / Math.max(entry - stopLoss, 0.0001);

    return {
      detectorKey: "breakout",
      setupType: SETUP_TYPES.BREAKOUT,
      direction: "long",
      regime: context.trend,
      entry,
      stopLoss,
      takeProfit,
      rr,
      reasons: [
        `${symbol} closed above the ${lookback}-candle resistance band.`,
        `The environment is not compressed, which improves the odds of continuation after the break.`
      ],
      metrics: {
        triggerClose: Number(trigger.close.toFixed(4)),
        resistance: Number(levels.high.toFixed(4)),
        atr: Number(atr.toFixed(4))
      },
      contextTags: [...context.tags, `timeframe:${timeframe}`]
    };
  }

  if (
    trigger.close < levels.low &&
    context.cleanliness !== "noisy" &&
    context.volatilityRegime !== "compressed"
  ) {
    const entry = trigger.close;
    const stopLoss = Math.min(levels.low + atr, Math.max(...prior.slice(-5).map((candle) => candle.high)));
    const takeProfit = entry - Math.max(atr * 2.4, stopLoss - entry);
    const rr = (entry - takeProfit) / Math.max(stopLoss - entry, 0.0001);

    return {
      detectorKey: "breakout",
      setupType: SETUP_TYPES.BREAKOUT,
      direction: "short",
      regime: context.trend,
      entry,
      stopLoss,
      takeProfit,
      rr,
      reasons: [
        `${symbol} closed below the ${lookback}-candle support band.`,
        `The environment is not compressed, which improves the odds of directional expansion.`
      ],
      metrics: {
        triggerClose: Number(trigger.close.toFixed(4)),
        support: Number(levels.low.toFixed(4)),
        atr: Number(atr.toFixed(4))
      },
      contextTags: [...context.tags, `timeframe:${timeframe}`]
    };
  }

  return null;
};

export default detectBreakout;
