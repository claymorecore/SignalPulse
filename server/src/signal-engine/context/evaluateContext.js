import {
  averageTrueRange,
  candleCleanliness,
  directionalBias,
  normalizeCandles,
  rangeCompressionRatio
} from "../utils/candles.js";
import { clamp } from "../utils/math.js";

export const evaluateMarketContext = ({ candles, config }) => {
  const normalized = normalizeCandles(candles);
  const bias = directionalBias(normalized, 20);
  const atr = averageTrueRange(normalized, 14);
  const compression = rangeCompressionRatio(
    normalized,
    config.thresholds.momentumLookback,
    config.thresholds.breakoutLookback
  );
  const cleanliness = candleCleanliness(normalized, 12);

  const trend =
    bias > 0.8 ? "bullish" : bias < -0.8 ? "bearish" : "neutral";
  const volatilityRegime =
    compression >= config.thresholds.expandedVolatility
      ? "expanded"
      : compression <= config.thresholds.compressedVolatility
        ? "compressed"
        : "balanced";
  const participation =
    Math.abs(bias) > 2
      ? "expansion"
      : Math.abs(bias) > 0.8
        ? "transition"
        : "range";
  const cleanlinessLabel =
    cleanliness >= 72 ? "clean" : cleanliness >= 52 ? "mixed" : "noisy";

  return {
    trend,
    volatilityRegime,
    cleanliness: cleanlinessLabel,
    participation,
    directionalBias: Number(bias.toFixed(2)),
    volatilityScore: clamp(compression * 50, 0, 100),
    cleanlinessScore: Number(cleanliness.toFixed(2)),
    participationScore: clamp(Math.abs(bias) * 15, 0, 100),
    atr: Number(atr.toFixed(4)),
    compressionRatio: Number(compression.toFixed(4)),
    tags: [
      `trend:${trend}`,
      `volatility:${volatilityRegime}`,
      `participation:${participation}`,
      `cleanliness:${cleanlinessLabel}`
    ],
    notes: [
      `Trend is ${trend} with a directional bias of ${bias.toFixed(2)}%.`,
      `Volatility regime is ${volatilityRegime} with a compression ratio of ${compression.toFixed(2)}.`,
      `Price behavior is ${cleanlinessLabel} with a cleanliness score of ${cleanliness.toFixed(0)}.`
    ]
  };
};

export default evaluateMarketContext;
