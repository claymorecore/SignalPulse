import { average, clamp, max, min } from "./math.js";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const normalizeCandles = (candles = []) =>
  (Array.isArray(candles) ? candles : [])
    .map((candle, index) => {
      if (Array.isArray(candle)) {
        return {
          openTime: toNumber(candle[0]) || index,
          open: toNumber(candle[1]),
          high: toNumber(candle[2]),
          low: toNumber(candle[3]),
          close: toNumber(candle[4]),
          volume: Number.isFinite(toNumber(candle[5])) ? toNumber(candle[5]) : null,
          closeTime: toNumber(candle[6]) || index
        };
      }

      if (!candle || typeof candle !== "object") return null;

      return {
        openTime: toNumber(candle.openTime ?? candle.ot ?? candle.t ?? index) || index,
        open: toNumber(candle.open ?? candle.o ?? candle.close ?? candle.c),
        high: toNumber(candle.high ?? candle.h),
        low: toNumber(candle.low ?? candle.l),
        close: toNumber(candle.close ?? candle.c),
        volume: Number.isFinite(toNumber(candle.volume ?? candle.v)) ? toNumber(candle.volume ?? candle.v) : null,
        closeTime: toNumber(candle.closeTime ?? candle.ct ?? candle.t ?? index) || index
      };
    })
    .filter((candle) =>
      candle &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    );

export const getRecentCandles = (candles, count) =>
  candles.slice(Math.max(0, candles.length - Math.max(1, count)));

export const closingPrices = (candles) => candles.map((candle) => candle.close);
export const highs = (candles) => candles.map((candle) => candle.high);
export const lows = (candles) => candles.map((candle) => candle.low);

export const averageTrueRange = (candles, lookback = 14) => {
  const recent = getRecentCandles(candles, lookback + 1);
  if (recent.length < 2) return 0;

  const ranges = [];
  for (let index = 1; index < recent.length; index += 1) {
    const current = recent[index];
    const previous = recent[index - 1];
    const highLow = current.high - current.low;
    const highClose = Math.abs(current.high - previous.close);
    const lowClose = Math.abs(current.low - previous.close);
    ranges.push(Math.max(highLow, highClose, lowClose));
  }

  return average(ranges);
};

export const directionalBias = (candles, lookback = 20) => {
  const recent = getRecentCandles(candles, lookback);
  if (recent.length < 2) return 0;

  const first = recent[0].close;
  const last = recent[recent.length - 1].close;
  return clamp(((last - first) / first) * 100, -100, 100);
};

export const candleCleanliness = (candles, lookback = 12) => {
  const recent = getRecentCandles(candles, lookback);
  if (recent.length < 2) return 0;

  let aligned = 0;
  for (let index = 1; index < recent.length; index += 1) {
    const delta = recent[index].close - recent[index - 1].close;
    if (delta >= 0) aligned += 1;
  }

  return (aligned / (recent.length - 1)) * 100;
};

export const rangeCompressionRatio = (candles, shortLookback = 8, longLookback = 24) => {
  const shortAtr = averageTrueRange(candles, shortLookback);
  const longAtr = averageTrueRange(candles, longLookback);
  if (!Number.isFinite(shortAtr) || !Number.isFinite(longAtr) || longAtr === 0) return 1;
  return shortAtr / longAtr;
};

export const recentBreakoutLevels = (candles, lookback = 20) => {
  const recent = getRecentCandles(candles, lookback);
  return {
    high: max(highs(recent)),
    low: min(lows(recent))
  };
};
