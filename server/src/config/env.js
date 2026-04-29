// env.js
import "dotenv/config";
import path from "path";

/* ---------------- Helpers ---------------- */

const toInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const toStr = (v, d) => {
  if (v == null || v === "") return d;
  return String(v);
};

const toBool = (v, d) => {
  if (v == null || v === "") return d;

  const s = String(v).trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;

  return d;
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const normalizeUrl = (u) => String(u).replace(/\/+$/, "");

const resolvePath = (p) => path.resolve(process.cwd(), p);

const readLogLevel = () => {
  const l = toStr(process.env.LOG_LEVEL, "info").toLowerCase();
  const valid = ["trace", "debug", "info", "warn", "error"];
  return valid.includes(l) ? l : "info";
};

/* ---------------- Env ---------------- */

export const env = Object.freeze({
  NODE_ENV: toStr(process.env.NODE_ENV, "development"),

  PORT: clamp(toInt(process.env.PORT, 3000), 1, 65535),

  LOG_LEVEL: readLogLevel(),

  BINANCE_BASE_URL: normalizeUrl(
    toStr(process.env.BINANCE_BASE_URL, "https://fapi.binance.com")
  ),

  CORS_ORIGIN: toStr(process.env.CORS_ORIGIN, "*"),

  WS_PATH: toStr(process.env.WS_PATH, "/ws"),
  API_PREFIX: toStr(process.env.API_PREFIX, "/api"),

  DB_PATH: resolvePath(
    toStr(process.env.DB_PATH, "./data.sqlite")
  ),

  PERSIST_SIGNALS: toBool(process.env.PERSIST_SIGNALS, true),

  TELEGRAM_BOT_TOKEN: toStr(process.env.TELEGRAM_BOT_TOKEN, ""),
  TELEGRAM_BOT_ID: toStr(process.env.TELEGRAM_BOT_ID, ""),
  TELEGRAM_CHAT_LINK: toStr(process.env.TELEGRAM_CHAT_LINK, ""),
  TELEGRAM_CHAT_ID: toStr(process.env.TELEGRAM_CHAT_ID, ""),

  TELEGRAM_SYNC_STARTUP_PROBE: toBool(
    process.env.TELEGRAM_SYNC_STARTUP_PROBE,
    false
  ),

  TELEGRAM_SYNC_STARTUP_PROBE_TEXT: toStr(
    process.env.TELEGRAM_SYNC_STARTUP_PROBE_TEXT,
    "SignalPulse Telegram sync probe"
  )
});

export default env;