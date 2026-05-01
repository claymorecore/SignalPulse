// lib/performance.js

const isNum = (n) => Number.isFinite(n);

const isClosed = (s) => {
  const st = String(s?.status || "").toUpperCase();
  return st === "TP" || st === "SL" || st === "CLOSED";
};

const getPnl = (s) => {
  if (isNum(s?.pnlUsdt)) return s.pnlUsdt;
  return 0;
};

const isWinningClosedTrade = (s) => {
  if (!isClosed(s)) return false;
  return getPnl(s) > 0;
};

const isLosingClosedTrade = (s) => {
  if (!isClosed(s)) return false;
  return getPnl(s) < 0;
};

export function buildPerformanceStats(signals = []) {
  const list = Array.isArray(signals) ? signals : [];

  let wins = 0;
  let losses = 0;
  let open = 0;

  let realizedPnl = 0;
  let unrealizedPnl = 0;

  let winSum = 0;
  let lossSum = 0;

  for (const s of list) {
    if (!s) continue;

    if (isClosed(s)) {
      const pnl = getPnl(s);
      realizedPnl += pnl;

      if (isWinningClosedTrade(s)) {
        wins++;
        winSum += pnl;
      } else if (isLosingClosedTrade(s)) {
        losses++;
        lossSum += Math.abs(pnl);
      }
    } else {
      open++;
      unrealizedPnl += getPnl(s);
    }
  }

  const closed = list.filter(isClosed).length;
  const decisiveClosed = wins + losses;
  const winrate = decisiveClosed > 0 ? wins / decisiveClosed : 0;
  const avgWin = wins > 0 ? winSum / wins : 0;
  const avgLoss = losses > 0 ? lossSum / losses : 0;

  const expectancy =
    decisiveClosed > 0
      ? winrate * avgWin - (1 - winrate) * avgLoss
      : 0;

  return {
    total: list.length,
    open,
    closed,
    wins,
    losses,
    winrate,
    realizedPnl,
    unrealizedPnl,
    avgWin,
    avgLoss,
    expectancy
  };
}