import { fmt4, fmtPct, fmtUsdt, fmtAge, isNum } from "../lib/format.js";
import { memo, useMemo } from "react";

const SnapshotPanel = memo(function SnapshotPanel({ signal, refNow }) {
  const tNow = refNow || Date.now();

  // Memoize key-value pairs for display
  const kv = useMemo(() => {
    if (!signal) return [];

    return [
      ["Symbol", signal.symbol],
      ["TF", signal.tf],
      ["Setup", signal.setup],
      ["Side", signal.side],
      ["Status", signal.status],
      ["Entry", fmt4(signal.entry)],
      ["SL", fmt4(signal.sl)],
      ["TP", fmt4(signal.tp)],
      ["RR", isNum(signal.rr) ? Number(signal.rr).toFixed(2) : "–"],
      ["Live", fmt4(signal.live)],
      ["PnL%", fmtPct(signal.pnlPct), signal.pnlPct],
      ["PnL(USDT)", fmtUsdt(signal.pnlUsdt), signal.pnlUsdt],
      ["Created", fmtAge(signal.createdAt, tNow)],
      ["Last Scan", fmtAge(signal.lastScanTs, tNow)],
      ["Last Live", fmtAge(signal.lastLiveTs, tNow)]
    ];
  }, [signal, tNow]);

  // Determine color class for PnL values
  const getColorClass = (key, rawValue) => {
    if ((key === "PnL%" || key === "PnL(USDT)") && rawValue != null) {
      return rawValue > 0 ? "pnl-positive" : rawValue < 0 ? "pnl-negative" : "";
    }
    return "";
  };

  return (
    <div className="panel">
      <h3>Snapshot</h3>

      <div className="kv">
        {kv.length > 0 ? kv.map(([k, v, rawValue]) => (
          <div
            key={k}
            className="row"
            style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
          >
            <span className="mini">{k}</span>
            <span className={`mono ${getColorClass(k, rawValue)}`}>
              {v != null ? String(v) : "–"}
            </span>
          </div>
        )) : (
          <div className="row center">No snapshot data available</div>
        )}
      </div>

      <div style={{ height: 10 }} />

      <div className="canvas">
        <canvas></canvas>
      </div>
    </div>
  );
});

export default SnapshotPanel;