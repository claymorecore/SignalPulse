const num = (v) => (Number.isFinite(+v) ? +v : NaN);
const str = (v) => (v == null ? "" : String(v));

/**
 * Normalize a single history point.
 * Ensures timestamp is valid and numeric fields are numbers.
 */
const normalizeHistoryPoint = (p) => {
  if (!p || typeof p !== "object") return null;

  const t = num(p.t);
  if (!Number.isFinite(t) || t <= 0) return null;

  return {
    t,
    p: num(p.p),
    pp: num(p.pp),
    u: num(p.u),
  };
};

/**
 * Normalize an array of history points
 */
export const normalizeHistory = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(normalizeHistoryPoint)
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);
};

/**
 * Normalize a single trading signal
 */
export const normalizeSignal = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  return {
    key: str(raw.key),
    symbol: str(raw.symbol),
    tf: str(raw.tf),
    setup: str(raw.setup),
    side: str(raw.side),
    status: str(raw.status),
    entry: num(raw.entry),
    sl: num(raw.sl),
    tp: num(raw.tp),
    rr: num(raw.rr),
    createdAt: num(raw.createdAt),
    lastScanTs: num(raw.lastScanTs),
    lastLiveTs: num(raw.lastLiveTs),
    live: num(raw.live),
    pnlPct: num(raw.pnlPct),
    pnlUsdt: num(raw.pnlUsdt),
    history: normalizeHistory(raw.history),
  };
};

/**
 * Normalize a full snapshot object from the server
 */
export const normalizeSnapshot = (snap) => {
  if (!snap || typeof snap !== "object") {
    return {
      status: "idle",
      session: "–",
      universeCount: 0,
      cooldownLeftMs: 0,
      liveCount: 0,
      signals: [],
    };
  }

  const sigs = Array.isArray(snap.signals) ? snap.signals : [];

  return {
    status: String(snap.status || "idle"),
    session: snap.session == null ? "–" : String(snap.session),
    universeCount: num(snap.universeCount) || 0,
    cooldownLeftMs: num(snap.cooldownLeftMs) || 0,
    liveCount: num(snap.liveCount) || 0,
    signals: sigs.map(normalizeSignal).filter(Boolean),
  };
};


