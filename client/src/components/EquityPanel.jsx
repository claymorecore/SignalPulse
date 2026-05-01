import { memo, useMemo } from "react";
import { buildEquityCurve } from "../lib/equity.js";
import SparkCanvas from "./SparkCanvas.jsx";

const EquityPanel = memo(function EquityPanel({ signals }) {
  const rawCurve = useMemo(
    () => buildEquityCurve(signals),
    [signals]
  );

  const curve = useMemo(
    () =>
      rawCurve.map((point) => ({
        t: point.t,
        pp: point.p
      })),
    [rawCurve]
  );

  const last = rawCurve.length > 0 ? rawCurve[rawCurve.length - 1].p : 0;
  const isNegative = last < 0;

  return (
    <section className="card">
      <h2>Equity Curve</h2>

      <div className="mini" style={{ marginBottom: 8 }}>
        Closed trades cumulative PnL
      </div>

      <div
        className="canvas"
        style={{ height: 180, marginBottom: 10 }}
      >
        <SparkCanvas
          history={curve}
          entry={NaN}
          side="LONG"
          lineColor={isNegative ? "#ff8585" : "#4caf50"}
          fillColor={
            isNegative
              ? "rgba(255, 133, 133, 0.12)"
              : "rgba(76, 175, 80, 0.12)"
          }
        />
      </div>

      <div className="mini">
        Total:{" "}
        <span className={isNegative ? "pnl-negative" : "pnl-positive"}>
          {last.toFixed(2)} USDT
        </span>
      </div>
    </section>
  );
});

export default EquityPanel;