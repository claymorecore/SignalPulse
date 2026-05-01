// scanner/strategies/index.js
import emaAtrStrategy from "./emaAtr.js";

const STRATEGIES = Object.freeze({
  EMA_ATR: emaAtrStrategy
});

/**
 * Retrieve a strategy module by name.
 * @param {string} name
 * @returns {object|null}
 */
export function getStrategy(name) {
  const key = String(name || "").trim().toUpperCase();
  return STRATEGIES[key] || null;
}

/**
 * List all registered strategy names.
 * @returns {string[]}
 */
export function listStrategies() {
  return Object.keys(STRATEGIES);
}

/**
 * Build a signal using a strategy.
 * @param {object} params
 * @param {string} params.strategy
 * @param {string} params.symbol
 * @param {string} params.tf
 * @param {Array} params.klines
 * @param {object} params.cfg
 * @returns {object|null}
 */
export function buildSignal({ strategy = "EMA_ATR", symbol, tf, klines, cfg }) {
  const mod = getStrategy(strategy);

  if (!mod || typeof mod.buildSignal !== "function") {
    return null;
  }

  return mod.buildSignal({ symbol, tf, klines, cfg });
}

export default {
  getStrategy,
  listStrategies,
  buildSignal
};