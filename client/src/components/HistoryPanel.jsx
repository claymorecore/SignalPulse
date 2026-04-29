import { memo, useMemo } from "react";
import { fmtAge, fmt4, fmtPct, fmtUsdt } from "../lib/format.js";
import SparkCanvas from "./SparkCanvas.jsx";

const isNum = (v) => Number.isFinite(v);

const HistoryPanel = memo(function HistoryPanel({ signal, refNow }) {
  const history = useMemo(
    () => (Array.isArray(signal?.history) ? signal.history : []),
    [signal?.history]
  );

  const reversedHistory = useMemo(
    () => [...history].reverse(),
    [history]
  );

  const columns = useMemo(
    () => [
      { label: "t", key: "t", fmt: (val) => fmtAge(val, refNow), align: "right" },
      { label: "Price", key: "p", fmt: fmt4, align: "right" },
      { label: "PnL%", key: "pp", fmt: fmtPct, colorize: true, align: "right" },
      { label: "PnL(USDT)", key: "u", fmt: fmtUsdt, colorize: true, align: "right" }
    ],
    [refNow]
  );

  const getColorClass = (col, value) => {
    if (!col.colorize || !isNum(value)) return "";
    if (value > 0) return "pnl-positive";
    if (value < 0) return "pnl-negative";
    return "";
  };

  const sparklineColors = useMemo(() => {
    const pnlPct = Number(signal?.pnlPct);

    if (Number.isFinite(pnlPct) && pnlPct < 0) {
      return {
        lineColor: "#ff8585",
        fillColor: "rgba(255, 133, 133, 0.12)"
      };
    }

    return {
      lineColor: "#4caf50",
      fillColor: "rgba(76, 175, 80, 0.12)"
    };
  }, [signal?.pnlPct]);

  return (
    <div className="panel">
      <h3>History (selected signal)</h3>

      <div className="wrap" style={{ maxHeight: 270, overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === "right" ? "right" : ""}
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {reversedHistory.length > 0 ? (
              reversedHistory.map((entry) => {
                const rowKey = entry?.t ?? `${entry?.p}-${entry?.u}`;

                return (
                  <tr key={rowKey}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${col.align === "right" ? "right" : ""} mono ${getColorClass(
                          col,
                          entry?.[col.key]
                        )}`}
                      >
                        {col.fmt(entry?.[col.key])}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="center">
                  No history available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="canvas">
        <SparkCanvas
          history={history}
          entry={signal?.entry}
          side={signal?.side}
          lineColor={sparklineColors.lineColor}
          fillColor={sparklineColors.fillColor}
        />
      </div>
    </div>
  );
});

export default HistoryPanel;