import { memo, useMemo } from "react";
import { fmt4, fmtPct, fmtUsdt, fmtAge, now, isNum } from "../lib/format.js";

const FRESH_SIGNAL_MS = 2 * 60 * 1000; // 2 minutes

const getStatusRank = (signal) => {
  const status = String(signal?.status || "").trim().toUpperCase();

  if (status === "OPEN" || status === "ACTIVE") return 3;
  if (status === "TP") return 2;
  if (status === "SL") return 1;
  return 0;
};

const getSignalTs = (signal) => {
  if (Number.isFinite(+signal?.closedAt)) return +signal.closedAt;
  if (Number.isFinite(+signal?.createdAt)) return +signal.createdAt;
  if (Number.isFinite(+signal?.lastScanTs)) return +signal.lastScanTs;
  return 0;
};

const getSide = (signal) => String(signal?.side || "").trim().toUpperCase();

const getStatus = (signal) => String(signal?.status || "").trim().toUpperCase();

const isClosedStatus = (signal) => {
  const status = getStatus(signal);
  return status === "TP" || status === "SL" || status === "CLOSED";
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

    if (status === "TP") return "status-positive";
    if (status === "SL") return "status-negative";
    if (status === "OPEN" || status === "ACTIVE") return "status-open";
    return "";
  };

  const getRowClass = (signal, selected, isFresh) => {
    const status = getStatus(signal);

    return [
      selected ? "signal-row-selected" : "",
      isFresh ? "signal-row-fresh" : "",
      isClosedStatus(signal) ? "signal-row-closed" : "",
      status === "TP" ? "signal-row-tp" : "",
      status === "SL" ? "signal-row-sl" : ""
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
                      const status = getStatus(signal) || "–";

                      return (
                        <td key={col.key}>
                          <span className={`badge ${getStatusClass(signal)}`}>
                            {status}
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