import { memo, useMemo } from "react";
import { buildPerformanceStats } from "../lib/performance.js";
import { fmtPct, fmtUsdt } from "../lib/format.js";

const PerformancePanel = memo(function PerformancePanel({ signals }) {
  const stats = useMemo(
    () => buildPerformanceStats(signals),
    [signals]
  );

  const winratePct = stats.winrate * 100;

  const getColor = (v) => {
    if (v > 0) return "pnl-positive";
    if (v < 0) return "pnl-negative";
    return "";
  };

  return (
    <section className="card">
      <h2>Performance</h2>

      <div className="kv">
        <div>
          <span>Total Trades</span>
          <b>{stats.total}</b>
        </div>

        <div>
          <span>Open</span>
          <b>{stats.open}</b>
        </div>

        <div>
          <span>Closed</span>
          <b>{stats.closed}</b>
        </div>

        <div>
          <span>Wins</span>
          <b>{stats.wins}</b>
        </div>

        <div>
          <span>Losses</span>
          <b>{stats.losses}</b>
        </div>

        <div>
          <span>Winrate</span>
          <b>{stats.closed > 0 ? `${winratePct.toFixed(1)}%` : "–"}</b>
        </div>

        <div>
          <span>Realized PnL</span>
          <b className={getColor(stats.realizedPnl)}>
            {fmtUsdt(stats.realizedPnl)}
          </b>
        </div>

        <div>
          <span>Unrealized PnL</span>
          <b className={getColor(stats.unrealizedPnl)}>
            {fmtUsdt(stats.unrealizedPnl)}
          </b>
        </div>

        <div>
          <span>Avg Win</span>
          <b className="pnl-positive">{fmtUsdt(stats.avgWin)}</b>
        </div>

        <div>
          <span>Avg Loss</span>
          <b className="pnl-negative">
            {fmtUsdt(stats.avgLoss)}
          </b>
        </div>

        <div>
          <span>Expectancy</span>
          <b className={getColor(stats.expectancy)}>
            {fmtUsdt(stats.expectancy)}
          </b>
        </div>
      </div>
    </section>
  );
});

export default PerformancePanel;