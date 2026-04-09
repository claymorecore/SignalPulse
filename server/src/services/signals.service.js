// signals.service.js
import market from "../market/state.js";

const now = () => Date.now();
const isNum = (n) => Number.isFinite(n);

/**
 * Compute PnL for a signal given current price and quantity
 * @param {Object} sig - Signal object
 * @param {number} price - Current market price
 * @param {number} qty - Position quantity
 * @returns {Object} pnlUsdt, pnlPct
 */
const computePnL = (sig, price, qty) => {
  const per1 = sig.side === "LONG" ? price - sig.entry : sig.entry - price;
  const pnlUsdt = per1 * qty;
  const pnlPct = sig.entry > 0 ? (per1 / sig.entry) * 100 : NaN;
  return { pnlUsdt, pnlPct };
};

/**
 * Update signal lifecycle based on price and SL/TP levels
 * @param {Object} sig
 * @param {number} price
 */
const updateLifecycle = (sig, price) => {
  if (sig.status !== "OPEN") return;

  if (sig.side === "LONG") {
    if (price <= sig.sl) sig.status = "SL";
    else if (price >= sig.tp) sig.status = "TP";
  } else {
    if (price >= sig.sl) sig.status = "SL";
    else if (price <= sig.tp) sig.status = "TP";
  }
};

/**
 * Insert or update a signal in market state
 */
export async function upsertSignal(sig, { emit = true } = {}) {
  return await market.upsertSignal(sig, { emit });
}

/**
 * Patch an existing signal
 */
export async function patchSignal(key, patch, { emit = true } = {}) {
  const cur = market.getSignal(key);
  if (!cur) return null;

  const p = patch && typeof patch === "object" ? patch : {};

  const next = {
    ...cur,
    ...p,
    key: cur.key,
    symbol: cur.symbol
  };

  return await market.upsertSignal(next, { emit });
}

/**
 * Remove a signal by key
 */
export async function removeSignal(key, { emit = true } = {}) {
  return await market.removeSignal(key, { emit });
}

/**
 * List recent signals, up to `limit`
 */
export function listSignals(limit = 500) {
  return market.listSignals(limit);
}

/**
 * Get a signal by key
 */
export function getSignal(key) {
  return market.getSignal(key);
}

/**
 * Update live price and recalc PnL for a signal
 */
export async function updateLive(sig, price, qty, { emit = true } = {}) {
  if (!sig || !sig.key) return null;
  if (!isNum(price)) return sig;

  const q = isNum(qty) && qty > 0 ? qty : 1;

  sig.live = price;
  sig.lastLiveTs = now();

  const pnl = computePnL(sig, price, q);
  sig.pnlUsdt = pnl.pnlUsdt;
  sig.pnlPct = pnl.pnlPct;

  sig.history = Array.isArray(sig.history) ? sig.history : [];
  sig.history.push({
    t: now(),
    p: price,
    pp: sig.pnlPct,
    u: sig.pnlUsdt
  });

  // Limit history length
  if (sig.history.length > 300) {
    sig.history.splice(0, sig.history.length - 300);
  }

  updateLifecycle(sig, price);

  return await market.upsertSignal(sig, { emit });
}

export default {
  upsertSignal,
  patchSignal,
  removeSignal,
  listSignals,
  getSignal,
  updateLive
};