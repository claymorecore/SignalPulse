// indicators.js

const isNum = (n) => Number.isFinite(n);

/**
 * Exponential Moving Average
 */
const ema = (arr, len) => {
  const n = arr.length;
  const out = new Array(n).fill(NaN);
  len = Math.max(1, len | 0);
  if (n < len) return out;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    const v = arr[i];
    if (!isNum(v)) return out;
    sum += v;
  }

  let prev = sum / len;
  out[len - 1] = prev;
  const k = 2 / (len + 1);

  for (let i = len; i < n; i++) {
    const v = arr[i];
    if (!isNum(v)) {
      out[i] = NaN;
      continue;
    }
    prev = v * k + prev * (1 - k);
    out[i] = prev;
  }

  return out;
};

/**
 * Simple Moving Average
 */
const sma = (arr, len) => {
  const n = arr.length;
  const out = new Array(n).fill(NaN);
  len = Math.max(1, len | 0);
  if (n < len) return out;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = arr[i];
    if (!isNum(v)) {
      out[i] = NaN;
      continue;
    }
    sum += v;
    if (i >= len) sum -= arr[i - len];
    if (i >= len - 1) out[i] = sum / len;
  }

  return out;
};

/**
 * Relative Strength Index (RSI)
 */
const rsi = (closes, len) => {
  const n = closes.length;
  const out = new Array(n).fill(NaN);
  len = Math.max(1, len | 0);
  if (n <= len) return out;

  let gain = 0, loss = 0;
  for (let i = 1; i <= len; i++) {
    const ch = closes[i] - closes[i - 1];
    if (!isNum(ch)) return out;
    if (ch >= 0) gain += ch;
    else loss -= ch;
  }

  let avgG = gain / len;
  let avgL = loss / len;
  out[len] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);

  for (let i = len + 1; i < n; i++) {
    const ch = closes[i] - closes[i - 1];
    if (!isNum(ch)) {
      out[i] = NaN;
      continue;
    }
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgG = (avgG * (len - 1) + g) / len;
    avgL = (avgL * (len - 1) + l) / len;
    out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }

  return out;
};

/**
 * Wilder's Average True Range (ATR)
 */
const atrWilder = (highs, lows, closes, len) => {
  const n = Math.min(highs.length, lows.length, closes.length);
  const out = new Array(n).fill(NaN);
  len = Math.max(1, len | 0);
  if (n <= len) return out;

  const tr = (i) => {
    const h = highs[i], l = lows[i], pc = closes[i - 1];
    if (!isNum(h) || !isNum(l) || !isNum(pc)) return NaN;
    return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  };

  let sum = 0;
  for (let i = 1; i <= len; i++) {
    const v = tr(i);
    if (!isNum(v)) return out;
    sum += v;
  }

  let atr = sum / len;
  out[len] = atr;

  for (let i = len + 1; i < n; i++) {
    const v = tr(i);
    if (!isNum(v)) {
      out[i] = NaN;
      continue;
    }
    atr = (atr * (len - 1) + v) / len;
    out[i] = atr;
  }

  return out;
};

/**
 * Return last finite number in an array
 */
const lastFinite = (arr) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (Number.isFinite(arr[i])) return arr[i];
  }
  return NaN;
};

export { ema, sma, rsi, atrWilder, lastFinite };

export default {
  ema,
  sma,
  rsi,
  atrWilder,
  lastFinite
};