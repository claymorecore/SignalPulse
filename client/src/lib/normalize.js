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
    u: num(p.u)
  };
};

/**
 * Normalize an array of history points.
 */
export const normalizeHistory = (arr) => {
  if (!Array.isArray(arr)) return [];

  return arr
    .map(normalizeHistoryPoint)
    .filter(Boolean)
    .sort((a, b) => a.t - b.t);
};

/**
 * Helper: only add field if value is a valid number
 */
const addIfFinite = (obj, key, value) => {
  if (Number.isFinite(value)) {
    obj[key] = value;
  }
};

/**
 * Normalize a single trading signal.
 */
export const normalizeSignal = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  const result = {
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

    history: normalizeHistory(raw.history)
  };

  // 👉 Optionale Felder nur setzen, wenn gültig
  addIfFinite(result, "qty", num(raw.qty));
  addIfFinite(result, "capitalUsd", num(raw.capitalUsd));
  addIfFinite(result, "riskDistance", num(raw.riskDistance));

  return result;
};

/**
 * Normalize a full snapshot object from the server.
 */
export const normalizeSnapshot = (snap) => {
  if (!snap || typeof snap !== "object") {
    return {
      status: "idle",
      session: null,
      universeCount: 0,
      cooldownLeftMs: 0,
      liveCount: 0,
      signals: []
    };
  }

  const signals = Array.isArray(snap.signals) ? snap.signals : [];

  const universeCount = num(snap.universeCount);
  const cooldownLeftMs = num(snap.cooldownLeftMs);
  const liveCount = num(snap.liveCount);

  const rawStatus = str(snap.status).trim();

  return {
    status: rawStatus || "idle",
    session: snap.session ?? null,
    universeCount: Number.isFinite(universeCount) ? universeCount : 0,
    cooldownLeftMs: Number.isFinite(cooldownLeftMs) ? cooldownLeftMs : 0,
    liveCount: Number.isFinite(liveCount) ? liveCount : 0,
    signals: signals.map(normalizeSignal).filter(Boolean)
  };
};

export default {
  normalizeHistory,
  normalizeSignal,
  normalizeSnapshot
};