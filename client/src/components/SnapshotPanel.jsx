import { memo, useMemo } from "react";
import { fmt4, fmtPct, fmtUsdt, fmtAge, isNum } from "../lib/format.js";

const getStatusClass = (status) => {
  const s = String(status || "").trim().toUpperCase();

  if (s === "TP") return "status-positive";
  if (s === "SL") return "status-negative";
  if (s === "OPEN" || s === "ACTIVE") return "status-open";
  return "";
};

const getSideClass = (side) => {
  const s = String(side || "").trim().toUpperCase();
  if (s === "LONG") return "long";
  if (s === "SHORT") return "short";
  return "";
};

const SnapshotPanel = memo(function SnapshotPanel({ signal, refNow }) {
  const tNow = refNow || Date.now();

  const kv = useMemo(() => {
    if (!signal) return [];

    return [
      { key: "symbol", label: "Symbol", value: signal.symbol },
      { key: "tf", label: "TF", value: signal.tf },
      { key: "setup", label: "Setup", value: signal.setup },
      {
        key: "side",
        label: "Side",
        value: signal.side,
        className: getSideClass(signal.side)
      },
      {
        key: "status",
        label: "Status",
        value: signal.status,
        badge: true,
        className: getStatusClass(signal.status)
      },

      { key: "entry", label: "Entry", value: fmt4(signal.entry) },
      { key: "sl", label: "SL", value: fmt4(signal.sl) },
      { key: "tp", label: "TP", value: fmt4(signal.tp) },

      {
        key: "rr",
        label: "RR",
        value: isNum(signal.rr) ? Number(signal.rr).toFixed(2) : "–"
      },

      {
        key: "qty",
        label: "Qty",
        value: fmt4(signal.qty)
      },
      {
        key: "capitalUsd",
        label: "Capital",
        value: isNum(signal.capitalUsd) ? `${Number(signal.capitalUsd).toFixed(2)} USDT` : "–"
      },
      {
        key: "riskDistance",
        label: "Risk Dist",
        value: fmt4(signal.riskDistance)
      },

      { key: "live", label: "Live", value: fmt4(signal.live) },

      {
        key: "pnlPct",
        label: "PnL%",
        value: fmtPct(signal.pnlPct),
        raw: signal.pnlPct
      },
      {
        key: "pnlUsdt",
        label: "PnL(USDT)",
        value: fmtUsdt(signal.pnlUsdt),
        raw: signal.pnlUsdt
      },

      {
        key: "createdAt",
        label: "Created",
        value: fmtAge(signal.createdAt, tNow)
      },
      {
        key: "lastScanTs",
        label: "Last Scan",
        value: fmtAge(signal.lastScanTs, tNow)
      },
      {
        key: "lastLiveTs",
        label: "Last Live",
        value: fmtAge(signal.lastLiveTs, tNow)
      }
    ];
  }, [signal, tNow]);

  const getColorClass = (item) => {
    if (!item) return "";

    if (item.className) {
      return item.className;
    }

    if (!isNum(item.raw)) return "";
    if (item.raw > 0) return "pnl-positive";
    if (item.raw < 0) return "pnl-negative";
    return "";
  };

  return (
    <div className="panel">
      <h3>Snapshot</h3>

      <div className="kv">
        {kv.length > 0 ? (
          kv.map((item) => (
            <div
              key={item.key}
              className="row"
              style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
            >
              <span className="mini">{item.label}</span>

              {item.badge ? (
                <span className={`badge ${getColorClass(item)}`.trim()}>
                  {item.value ?? "–"}
                </span>
              ) : (
                <span className={`mono ${getColorClass(item)}`.trim()}>
                  {item.value ?? "–"}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="row center">No signal selected</div>
        )}
      </div>
    </div>
  );
});

export default SnapshotPanel;