import { fmtAge, fmt4, fmtPct, fmtUsdt } from "../lib/format.js";
import SparkCanvas from "./SparkCanvas.jsx";
import { memo, useMemo } from "react";

const HistoryPanel = memo(function HistoryPanel({ signal, refNow }) {
  // Ensure history is always an array
  const history = useMemo(
    () => (Array.isArray(signal?.history) ? signal.history : []),
    [signal?.history]
  );

  // Memoize reversed history for rendering
  const reversedHistory = useMemo(() => [...history].reverse(), [history]);

  // Table column definitions
  const columns = useMemo(() => [
    { label: "t", key: "t", fmt: val => fmtAge(val, refNow) },
    { label: "Price", key: "p", fmt: fmt4 },
    { label: "PnL%", key: "pp", fmt: fmtPct, colorize: true },
    { label: "PnL(USDT)", key: "u", fmt: fmtUsdt, colorize: true }
  ], [refNow]);

  // Helper: determine PnL cell color
  const getColorClass = (col, value) => {
    if (!col.colorize || value == null) return "";
    return value > 0 ? "pnl-positive" : value < 0 ? "pnl-negative" : "";
  };

  return (
    <div className="panel">
      <h3>History (selected signal)</h3>

      <div className="wrap" style={{ maxHeight: 270, overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="right" scope="col">{col.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {reversedHistory.length > 0 ? (
              reversedHistory.map((entry, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`right mono ${getColorClass(col, entry?.[col.key])}`}
                    >
                      {col.fmt(entry?.[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="center">No history available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="canvas">
        <SparkCanvas history={history} />
      </div>
    </div>
  );
});

export default HistoryPanel;
