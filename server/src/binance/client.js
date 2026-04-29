// client.js
import env from "../config/env.js";
import { log } from "../middleware/log.js";

const BASE = String(env.BINANCE_BASE_URL || "https://fapi.binance.com").replace(/\/+$/, "");
const HTTP_TIMEOUT_MS = 10_000;

const now = () => Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const isNum = (n) => Number.isFinite(n);

let coolUntil = 0;

const blocked = () => now() < coolUntil;

const hit429 = (ms) => {
  const waitMs = Math.max(800, Math.floor(ms));
  coolUntil = Math.max(coolUntil, now() + waitMs);
};

const buildUrl = (path, params) => {
  const url = new URL(BASE + path);

  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

const httpGet = async (path, params = {}, retry = 5, tag = "GET") => {
  while (blocked()) {
    const waitMs = coolUntil - now();
    log.warn("BLOCKED_WAIT", { waitMs });
    await sleep(Math.min(250, Math.max(60, waitMs)));
  }

  const url = buildUrl(path, params);

  for (let attempt = 1; attempt <= retry; attempt++) {
    const t0 = now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });

      clearTimeout(timeout);

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
        log.error("BINANCE_HTTP_FAIL", {
          tag,
          status: res.status,
          attempt,
          ms,
          body: txt
        });
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeout);

      if (attempt === retry) {
        log.error("BINANCE_HTTP_ERR", {
          tag,
          attempt,
          err: err?.message || String(err)
        });
        throw err;
      }

      log.warn("BINANCE_HTTP_RETRY", {
        tag,
        attempt,
        err: err?.message || String(err)
      });

      await sleep(260 * attempt);
    }
  }

  throw new Error("retry_exhausted");
};

export const buildUniverse = async (limit) => {
  const lim = clamp(parseInt(limit || 40, 10) || 40, 1, 200);

  const data = await httpGet("/fapi/v1/ticker/24hr", {}, 5, "ticker24h");
  const list = Array.isArray(data) ? data : [];

  const universe = list
    .filter((x) => String(x.symbol || "").trim().endsWith("USDT"))
    .sort((a, b) => (+b.quoteVolume || 0) - (+a.quoteVolume || 0))
    .slice(0, lim)
    .map((x) => String(x.symbol || "").trim())
    .filter(Boolean);

  log.info("UNIVERSE_READY", {
    count: universe.length,
    top: universe.slice(0, 12)
  });

  return universe;
};

export const fetchKlines = async (symbol, tf = "1m", limit = 180) => {
  const sym = String(symbol || "").trim();
  const interval = String(tf || "1m").trim();
  const lim = clamp(parseInt(limit || 180, 10) || 180, 10, 1500);

  const data = await httpGet(
    "/fapi/v1/klines",
    { symbol: sym, interval, limit: lim },
    5,
    "klines"
  );

  const arr = Array.isArray(data) ? data : [];

  return arr
    .filter((x) => Array.isArray(x) && x.length >= 7)
    .map((x) => ({
      ot: Number(x[0]),
      o: Number(x[1]),
      h: Number(x[2]),
      l: Number(x[3]),
      c: Number(x[4]),
      v: Number(x[5]),
      ct: Number(x[6])
    }))
    .filter((x) =>
      isNum(x.ot) &&
      isNum(x.o) &&
      isNum(x.h) &&
      isNum(x.l) &&
      isNum(x.c) &&
      isNum(x.v) &&
      isNum(x.ct)
    );
};

export const fetchPrice = async (symbol, pxMode = "mark") => {
  const sym = String(symbol || "").trim();

  if (!sym) return NaN;

  if (pxMode === "last") {
    const data = await httpGet(
      "/fapi/v1/ticker/price",
      { symbol: sym },
      4,
      "price"
    );

    const price = Number(data?.price);
    return isNum(price) ? price : NaN;
  }

  const data = await httpGet(
    "/fapi/v1/premiumIndex",
    { symbol: sym },
    4,
    "premiumIndex"
  );

  const price = Number(data?.markPrice);
  return isNum(price) ? price : NaN;
};

export const fetchAllPrices = async (pxMode = "mark") => {
  const map = new Map();

  if (pxMode === "last") {
    const data = await httpGet("/fapi/v1/ticker/price", {}, 4, "priceAll");

    if (Array.isArray(data)) {
      for (const item of data) {
        const symbol = String(item.symbol || "").trim();
        const price = Number(item.price);

        if (symbol && isNum(price)) {
          map.set(symbol, price);
        }
      }
    }

    return map;
  }

  const data = await httpGet("/fapi/v1/premiumIndex", {}, 4, "premiumIndexAll");

  if (Array.isArray(data)) {
    for (const item of data) {
      const symbol = String(item.symbol || "").trim();
      const price = Number(item.markPrice);

      if (symbol && isNum(price)) {
        map.set(symbol, price);
      }
    }
  }

  return map;
};

export default {
  buildUniverse,
  fetchKlines,
  fetchPrice,
  fetchAllPrices
};