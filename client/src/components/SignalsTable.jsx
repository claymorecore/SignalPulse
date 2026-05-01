import { memo, useMemo } from "react";
import { fmt4, fmtPct, fmtUsdt, fmtAge, now, isNum } from "../lib/format.js";

const FRESH_SIGNAL_MS = 2 * 60 * 1000;

const getStatus = (signal) => String(signal?.status || "").trim().toUpperCase();
const getSide = (signal) => String(signal?.side || "").trim().toUpperCase();

const isClosedStatus = (signal) => {
  const status = getStatus(signal);
  return status === "TP" || status === "SL" || status === "CLOSED";
};

const getStatusRank = (signal) => {
  const status = getStatus(signal);

  if (status === "OPEN" || status === "ACTIVE") return 3;
  if (status === "TP") return 2;
  if (status === "CLOSED") return 2;
  if (status === "SL") return 1;

  return 0;
};

const getSignalTs = (signal) => {
  if (Number.isFinite(+signal?.closedAt)) return +signal.closedAt;
  if (Number.isFinite(+signal?.createdAt)) return +signal.createdAt;
  if (Number.isFinite(+signal?.lastScanTs)) return +signal.lastScanTs;
  return 0;
};

const getCompactStatus = (signal) => {
  const status = getStatus(signal);
  const reason = String(signal?.exitReason || "").trim().toUpperCase();

  if (status === "CLOSED") {
    if (reason === "PROFIT_LOCK" || reason === "PROFIT_PROTECTION") return "LOCK";
    if (reason === "BREAK_EVEN") return "BE";
    return "CLOSED";
  }

  return status || "–";
};

const getStatusTitle = (signal) => {
  const status = getStatus(signal);
  const reason = String(signal?.exitReason || "").trim().toUpperCase();
  const exitPrice = Number(signal?.exitPrice);

  if (status === "CLOSED") {
    const label =
      reason === "PROFIT_LOCK" || reason === "PROFIT_PROTECTION"
        ? "Profit-lock close"
        : reason === "BREAK_EVEN"
          ? "Break-even close"
          : "Protected close";

    return Number.isFinite(exitPrice)
      ? `${label} @ ${fmt4(exitPrice)}`
      : label;
  }

  if (status === "TP") return "Take Profit reached";
  if (status === "SL") return "Stop Loss reached";
  if (status === "OPEN" || status === "ACTIVE") return "Open trade";

  return status || "";
};

const getLevelMeta = (signal, key) => {
  const side = getSide(signal);

  if (key === "tp") {
    return {
      className: side === "SHORT"
        ? "level-cell level-profit level-down"
        : "level-cell level-profit level-up",
      direction: side === "SHORT" ? "↓" : "↑",
      title: side === "SHORT"
        ? "Take Profit: SHORT target below entry"
        : "Take Profit: LONG target above entry"
    };
  }

  if (key === "sl") {
    return {
      className: side === "SHORT"
        ? "level-cell level-risk level-up"
        : "level-cell level-risk level-down",
      direction: side === "SHORT" ? "↑" : "↓",
      title: side === "SHORT"
        ? "Stop Loss: SHORT risk above entry"
        : "Stop Loss: LONG risk below entry"
    };
  }

  return {
    className: "level-cell",
    direction: "",
    title: ""
  };
};

const SignalsTable = memo(function SignalsTable({
  signals,
  selectedKey,
  onSelect,
  refNow
}) {
  const tNow = refNow || now();

  const rows = useMemo(() => {
    const list = Array.isArray(signals) ? [...signals] : [];

    return list.sort((a, b) => {
      const statusDiff = getStatusRank(b) - getStatusRank(a);
      if (statusDiff !== 0) return statusDiff;

      return getSignalTs(b) - getSignalTs(a);
    });
  }, [signals]);

  const columns = useMemo(
    () => [
      { label: "Symbol", key: "symbol" },
      { label: "TF", key: "tf" },
      { label: "Setup", key: "setup" },
      { label: "Status", key: "status" },
      { label: "Entry", key: "entry", fmt: fmt4, align: "right" },
      { label: "SL", key: "sl", fmt: fmt4, align: "right", level: true },
      { label: "TP", key: "tp", fmt: fmt4, align: "right", level: true },
      {
        label: "RR",
        key: "rr",
        fmt: (val) => (isNum(val) ? Number(val).toFixed(2) : "–"),
        align: "right"
      },
      { label: "Live", key: "live", fmt: fmt4, align: "right" },
      { label: "PnL%", key: "pnlPct", fmt: fmtPct, align: "right", colorize: true },
      { label: "PnL(USDT)", key: "pnlUsdt", fmt: fmtUsdt, align: "right", colorize: true },
      {
        label: "Age",
        key: "createdAt",
        fmt: (val, signal) => fmtAge(getSignalTs(signal) || val, tNow),
        align: "right"
      }
    ],
    [tNow]
  );

  const getPnlColorClass = (col, value) => {
    if (!col.colorize || !isNum(value)) return "";
    if (value > 0) return "pnl-positive";
    if (value < 0) return "pnl-negative";
    return "";
  };

  const getStatusClass = (signal) => {
    const status = getStatus(signal);
    const reason = String(signal?.exitReason || "").trim().toUpperCase();
    const pnl = Number(signal?.pnlUsdt);

    if (status === "TP") return "status-positive";
    if (status === "SL") return "status-negative";

    if (status === "CLOSED") {
      if (reason === "PROFIT_LOCK" || reason === "PROFIT_PROTECTION") return "status-positive";
      if (reason === "BREAK_EVEN") return "status-open";
      if (Number.isFinite(pnl) && pnl > 0) return "status-positive";
      if (Number.isFinite(pnl) && pnl < 0) return "status-negative";
      return "status-open";
    }

    if (status === "OPEN" || status === "ACTIVE") return "status-open";
    return "";
  };

  const getRowClass = (signal, selected, isFresh) => {
    const status = getStatus(signal);
    const pnl = Number(signal?.pnlUsdt);

    return [
      selected ? "signal-row-selected" : "",
      isFresh ? "signal-row-fresh" : "",
      isClosedStatus(signal) ? "signal-row-closed" : "",
      status === "TP" ? "signal-row-tp" : "",
      status === "SL" ? "signal-row-sl" : "",
      status === "CLOSED" && Number.isFinite(pnl) && pnl > 0 ? "signal-row-tp" : "",
      status === "CLOSED" && Number.isFinite(pnl) && pnl < 0 ? "signal-row-sl" : ""
    ]
      .filter(Boolean)
      .join(" ");
  };

  const renderCellValue = (col, signal) => {
    const value = signal?.[col.key];

    if (col.fmt) {
      return col.fmt(value, signal);
    }

    if (value == null || value === "") {
      return "–";
    }

    return value;
  };

  const handleSelect = (key) => {
    if (!key) return;
    onSelect?.(key);
  };

  return (
    <div className="wrap">
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
          {rows.length > 0 ? (
            rows.map((signal) => {
              const key = signal?.key ?? "";
              const selected = !!key && selectedKey === key;

              const createdAt = Number(signal?.createdAt);
              const isFresh =
                Number.isFinite(createdAt) &&
                createdAt > 0 &&
                tNow - createdAt <= FRESH_SIGNAL_MS;

              const rowClass = getRowClass(signal, selected, isFresh);

              return (
                <tr
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(key);
                    }
                  }}
                  aria-selected={selected}
                  className={rowClass}
                  style={{
                    cursor: key ? "pointer" : "default",
                    outline: selected ? "1px solid rgba(255,255,255,.18)" : "none",
                    background: selected
                      ? "rgba(255,255,255,.06)"
                      : isFresh
                        ? "rgba(255,255,255,.03)"
                        : "transparent",
                    transition: "background 160ms ease"
                  }}
                >
                  {columns.map((col) => {
                    if (col.key === "symbol") {
                      const side = getSide(signal);
                      const sideClass =
                        side === "LONG" ? "long" : side === "SHORT" ? "short" : "";

                      return (
                        <td key={col.key} className="mono">
                          <span>{signal?.symbol || "–"}</span>{" "}
                          {side ? <span className={sideClass}>{side}</span> : null}
                        </td>
                      );
                    }

                    if (col.key === "status") {
                      return (
                        <td key={col.key}>
                          <span
                            className={`badge ${getStatusClass(signal)}`}
                            title={getStatusTitle(signal)}
                          >
                            {getCompactStatus(signal)}
                          </span>
                        </td>
                      );
                    }

                    if (col.level) {
                      const meta = getLevelMeta(signal, col.key);

                      return (
                        <td
                          key={col.key}
                          className={`mono ${col.align === "right" ? "right" : ""}`}
                          title={meta.title}
                        >
                          <span className={meta.className}>
                            <span>{renderCellValue(col, signal)}</span>
                            <span className="level-direction">{meta.direction}</span>
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className={`mono ${col.align === "right" ? "right" : ""} ${
                          getPnlColorClass(col, signal?.[col.key])
                        }`}
                      >
                        {renderCellValue(col, signal)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
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