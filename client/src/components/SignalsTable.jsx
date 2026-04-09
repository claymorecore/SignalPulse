import { fmt4, fmtPct, fmtUsdt, fmtAge, now, isNum } from "../lib/format.js";
import { memo, useMemo } from "react";

const SignalsTable = memo(function SignalsTable({
  signals,
  selectedKey,
  onSelect,
  refNow
}) {
  // Ensure signals is always an array
  const arr = Array.isArray(signals) ? signals : [];
  const tNow = refNow || now();

  // Define table columns once, memoized for performance
  const columns = useMemo(() => [
    { label: "Symbol", key: "symbol" },
    { label: "TF", key: "tf" },
    { label: "Setup", key: "setup" },
    { label: "Side", key: "side" },
    { label: "Status", key: "status" },
    { label: "Entry", key: "entry", fmt: fmt4, align: "right" },
    { label: "SL", key: "sl", fmt: fmt4, align: "right" },
    { label: "TP", key: "tp", fmt: fmt4, align: "right" },
    { label: "RR", key: "rr", fmt: val => isNum(val) ? Number(val).toFixed(2) : "–", align: "right" },
    { label: "Live", key: "live", fmt: fmt4, align: "right" },
    { label: "PnL%", key: "pnlPct", fmt: fmtPct, align: "right", colorize: true },
    { label: "PnL(USDT)", key: "pnlUsdt", fmt: fmtUsdt, align: "right", colorize: true },
    { label: "Age", key: "createdAt", fmt: val => fmtAge(val, tNow), align: "right" }
  ], [tNow]);

  // Helper for coloring positive/negative PnL
  const getColorClass = (col, value) => {
    if (!col.colorize || value == null) return "";
    return value > 0 ? "pnl-positive" : value < 0 ? "pnl-negative" : "";
  };

  return (
    <div className="wrap">
      <table>
        <thead>
          <tr>
            {columns.map(col => (
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
          {arr.length > 0 ? arr.map(s => {
            const k = s?.key ?? "";
            const sel = k && selectedKey === k;

            return (
              <tr
                key={k}
                onClick={() => onSelect?.(k)}
                style={{
                  cursor: "pointer",
                  outline: sel ? "1px solid rgba(255,255,255,.18)" : "none",
                  background: sel ? "rgba(255,255,255,.04)" : "transparent"
                }}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`mono ${col.align === "right" ? "right" : ""} ${getColorClass(col, s?.[col.key])}`}
                  >
                    {col.fmt ? col.fmt(s?.[col.key]) : (s?.[col.key] ?? "–")}
                  </td>
                ))}
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={columns.length} className="center">
                No signals available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default SignalsTable;