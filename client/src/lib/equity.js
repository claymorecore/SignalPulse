// lib/equity.js

const isClosed = (s) => {
  const st = String(s?.status || "").toUpperCase();
  return st === "TP" || st === "SL" || st === "CLOSED";
};

const getTs = (s) => {
  if (Number.isFinite(+s?.closedAt)) return +s.closedAt;
  if (Number.isFinite(+s?.lastLiveTs)) return +s.lastLiveTs;
  if (Number.isFinite(+s?.lastScanTs)) return +s.lastScanTs;
  if (Number.isFinite(+s?.createdAt)) return +s.createdAt;
  return 0;
};

const getPnl = (s) => {
  return Number.isFinite(+s?.pnlUsdt) ? +s.pnlUsdt : 0;
};

export function buildEquityCurve(signals = []) {
  const closed = (Array.isArray(signals) ? signals : [])
    .filter(isClosed)
    .sort((a, b) => getTs(a) - getTs(b));

  let equity = 0;

  return closed.map((s) => {
    equity += getPnl(s);

    return {
      t: getTs(s),
      p: equity
    };
  });
}