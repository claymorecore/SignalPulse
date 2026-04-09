// client.js
import env from "../config/env.js";
import { log } from "../middleware/log.js";

const BASE = String(env.BINANCE_BASE_URL || "https://fapi.binance.com").replace(/\/+$/, "");

// --- Utility functions ---
const now = () => Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// --- Rate limiting state ---
let coolUntil = 0;
const blocked = () => now() < coolUntil;
const hit429 = (ms) => {
  const m = Math.max(800, Math.floor(ms));
  coolUntil = Math.max(coolUntil, now() + m);
};

// --- URL builder ---
const buildUrl = (path, params) => {
  const u = new URL(BASE + path);
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
};

// --- HTTP GET with retry and rate-limit handling ---
const httpGet = async (path, params = {}, retry = 5, tag = "GET") => {
  while (blocked()) {
    log.warn("BLOCKED_WAIT", { waitMs: coolUntil - now() });
    await sleep(Math.min(250, Math.max(60, coolUntil - now())));
  }

  const url = buildUrl(path, params);

  for (let attempt = 1; attempt <= retry; attempt++) {
    const t0 = now();
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const ms = now() - t0;

      if (res.status === 429) {
        log.warn("BINANCE_429", { tag, attempt, ms });
        hit429(900 * attempt);
        await sleep(250 * attempt);
        continue;
      }

      if (res.status >= 500) {
        log.warn("BINANCE_5XX", { tag, status: res.status, attempt, ms });
        await sleep(250 * attempt);
        continue;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        log.error("BINANCE_HTTP_FAIL", { tag, status: res.status, attempt, ms, body: txt });
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (attempt === retry) {
        log.error("BINANCE_HTTP_ERR", { tag, attempt, err: err?.message || String(err) });
        throw err;
      }
      log.warn("BINANCE_HTTP_RETRY", { tag, attempt, err: err?.message || String(err) });
      await sleep(260 * attempt);
    }
  }

  throw new Error("retry_exhausted");
};

// --- API Functions ---

/**
 * Build top USDT trading symbols by 24h quote volume
 * @param {number} limit max number of symbols
 * @returns {Promise<string[]>} array of symbols
 */
export const buildUniverse = async (limit) => {
  const lim = clamp(parseInt(limit || 40, 10) || 40, 1, 200);

  const data = await httpGet("/fapi/v1/ticker/24hr", {}, 5, "ticker24h");
  const list = Array.isArray(data) ? data : [];

  const universe = list
    .filter((x) => String(x.symbol || "").endsWith("USDT"))
    .sort((a, b) => (+b.quoteVolume || 0) - (+a.quoteVolume || 0))
    .slice(0, lim)
    .map((x) => String(x.symbol));

  log.info("UNIVERSE_READY", { count: universe.length, top: universe.slice(0, 12) });

  return universe;
};

/**
 * Fetch candlestick data for a symbol
 * @param {string} symbol
 * @param {string} tf timeframe (e.g., "1m")
 * @param {number} limit number of candles
 * @returns {Promise<Array<{h:number,l:number,c:number,ct:number}>>}
 */
export const fetchKlines = async (symbol, tf = "1m", limit = 180) => {
  const sym = String(symbol || "");
  const interval = String(tf);
  const lim = clamp(parseInt(limit || 180, 10) || 180, 10, 1500);

  const data = await httpGet("/fapi/v1/klines", { symbol: sym, interval, limit: lim }, 5, "klines");
  const arr = Array.isArray(data) ? data : [];

  return arr
    .filter((x) => Array.isArray(x) && x.length >= 7)
    .map((x) => ({
      h: +x[2],
      l: +x[3],
      c: +x[4],
      ct: +x[6],
    }));
};

/**
 * Fetch current prices
 * @param {"mark"|"last"} pxMode
 * @returns {Promise<Map<string, number>>}
 */
export const fetchAllPrices = async (pxMode = "mark") => {
  if (pxMode === "last") {
    const data = await httpGet("/fapi/v1/ticker/price", {}, 4, "priceAll");
    const map = new Map();
    if (Array.isArray(data)) {
      for (const x of data) {
        const s = String(x.symbol || "");
        const p = Number(x.price);
        if (s && Number.isFinite(p)) map.set(s, p);
      }
    }
    return map;
  }

  const data = await httpGet("/fapi/v1/premiumIndex", {}, 4, "premiumIndexAll");
  const map = new Map();
  if (Array.isArray(data)) {
    for (const x of data) {
      const s = String(x.symbol || "");
      const p = Number(x.markPrice);
      if (s && Number.isFinite(p)) map.set(s, p);
    }
  }
  return map;
};

// --- Default export ---
export default {
  buildUniverse,
  fetchKlines,
  fetchAllPrices,
};