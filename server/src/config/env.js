// env.js
import "dotenv/config";

/**
 * Convert a value to integer with default fallback
 * @param {*} v 
 * @param {number} d 
 * @returns {number}
 */
const toInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

/**
 * Convert a value to string with default fallback
 * @param {*} v 
 * @param {string} d 
 * @returns {string}
 */
const toStr = (v, d) => {
  if (v == null || v === "") return d;
  return String(v);
};

/**
 * Convert a value to boolean with default fallback
 * Accepts: 1, 0, true, false, yes, no, on, off (case-insensitive)
 * @param {*} v 
 * @param {boolean} d 
 * @returns {boolean}
 */
const toBool = (v, d) => {
  if (v == null || v === "") return d;

  const s = String(v).trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;

  return d;
};

/**
 * Clamp a number between min and max
 * @param {number} n 
 * @param {number} a 
 * @param {number} b 
 * @returns {number}
 */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/**
 * Read log level from env and validate
 * @returns {"trace"|"debug"|"info"|"warn"|"error"}
 */
const readLogLevel = () => {
  const l = toStr(process.env.LOG_LEVEL, "info").toLowerCase();
  const valid = ["trace", "debug", "info", "warn", "error"];
  return valid.includes(l) ? l : "info";
};

// --- Export environment configuration ---
export const env = {
  NODE_ENV: toStr(process.env.NODE_ENV, "development"),
  PORT: clamp(toInt(process.env.PORT, 3000), 1, 65535),
  LOG_LEVEL: readLogLevel(),
  BINANCE_BASE_URL: toStr(process.env.BINANCE_BASE_URL, "https://fapi.binance.com"),
  CORS_ORIGIN: toStr(process.env.CORS_ORIGIN, "*"),
  WS_PATH: toStr(process.env.WS_PATH, "/ws"),
  API_PREFIX: toStr(process.env.API_PREFIX, "/api"),
  DB_PATH: toStr(process.env.DB_PATH, "./data.sqlite"),
  PERSIST_SIGNALS: toBool(process.env.PERSIST_SIGNALS, true)
};

export default env;
