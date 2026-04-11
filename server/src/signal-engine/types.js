export const SIGNAL_STATUSES = Object.freeze({
  DETECTED: "detected",
  VALIDATED: "validated",
  ACTIVE: "active",
  INVALIDATED: "invalidated",
  CLOSED: "closed",
  EXPIRED: "expired"
});

export const QUALITY_TIERS = Object.freeze({
  A: "A",
  B: "B",
  C: "C",
  SUPPRESSED: "suppressed"
});

export const SETUP_TYPES = Object.freeze({
  TREND_CONTINUATION: "trend_continuation",
  BREAKOUT: "breakout",
  PULLBACK: "pullback"
});

export const SIGNAL_SOURCES = Object.freeze({
  ENGINE: "signal_engine",
  SCANNER: "scanner",
  REPLAY: "replay"
});
