// scanner/strategies/index.js
import emaAtrStrategy from "./emaAtr.js";

const STRATEGIES = {
  EMA_ATR: emaAtrStrategy
};

/**
 * Retrieve a strategy module by name.
 * @param {string} name - Strategy name
 * @returns {object|null} Strategy module or null if not found
 */
export function getStrategy(name) {
  const key = String(name || "EMA_ATR").trim().toUpperCase();
  return STRATEGIES[key] || null;
}

/**
 * List all registered strategy names
 * @returns {string[]} Array of strategy names
 */
export function listStrategies() {
  return Object.keys(STRATEGIES);
}

/**
 * Build a signal using a strategy
 * @param {object} params
 * @param {string} params.strategy - Strategy name
 * @param {string} params.symbol - Symbol to scan
 * @param {string} params.tf - Timeframe
 * @param {Array} params.klines - OHLCV bars
 * @param {object} params.cfg - Strategy configuration
 * @returns {object|null} Signal object or null if cannot generate
 */
export function buildSignal({ strategy = "EMA_ATR", symbol, tf, klines, cfg }) {
  const mod = getStrategy(strategy);

  if (!mod || typeof mod.buildEmaAtrSignal !== "function") {
    return null;
  }

  return mod.buildEmaAtrSignal({ symbol, tf, klines, cfg });
}

export default {
  getStrategy,
  listStrategies,
  buildSignal
};