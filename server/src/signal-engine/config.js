import { SETUP_TYPES } from "./types.js";

export const defaultSignalEngineConfig = Object.freeze({
  minCandles: 60,
  minConfidenceScore: 60,
  minRR: 1.6,
  enabledSetupTypes: [
    SETUP_TYPES.TREND_CONTINUATION,
    SETUP_TYPES.BREAKOUT,
    SETUP_TYPES.PULLBACK
  ],
  allowedTimeframes: ["1m", "5m", "15m", "1h"],
  suppression: {
    maxSignalsPerSymbol: 1,
    rejectNoisyContextBelow: 42,
    rejectWeakDirectionalBiasBelow: 12,
    rejectIncompleteData: true
  },
  thresholds: {
    breakoutLookback: 20,
    pullbackWindow: 12,
    momentumLookback: 8,
    expandedVolatility: 1.45,
    compressedVolatility: 0.72
  },
  debug: false
});

export const createSignalEngineConfig = (overrides = {}) => {
  const incoming = overrides && typeof overrides === "object" ? overrides : {};

  return {
    ...defaultSignalEngineConfig,
    ...incoming,
    enabledSetupTypes: Array.isArray(incoming.enabledSetupTypes) && incoming.enabledSetupTypes.length
      ? incoming.enabledSetupTypes
      : defaultSignalEngineConfig.enabledSetupTypes.slice(),
    allowedTimeframes: Array.isArray(incoming.allowedTimeframes) && incoming.allowedTimeframes.length
      ? incoming.allowedTimeframes
      : defaultSignalEngineConfig.allowedTimeframes.slice(),
    suppression: {
      ...defaultSignalEngineConfig.suppression,
      ...(incoming.suppression || {})
    },
    thresholds: {
      ...defaultSignalEngineConfig.thresholds,
      ...(incoming.thresholds || {})
    }
  };
};
