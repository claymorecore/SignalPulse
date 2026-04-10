const ACTIVE_STATUSES = new Set(["running", "started", "scanning"]);

const toUpper = (value) => String(value || "").trim().toUpperCase();
const cleanText = (value) =>
  String(value || "")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const formatStrategy = (strategy) => {
  const key = toUpper(strategy);
  if (key === "EMA_ATR") return "EMA and volatility strategy";
  return key ? key.replaceAll("_", " ").toLowerCase() : "the current strategy";
};

const formatSide = (side) => {
  const key = toUpper(side);
  if (key === "LONG") return "Long";
  if (key === "SHORT") return "Short";
  return "New";
};

const normalizeDisplay = (entry) =>
  entry
    ? {
        ...entry,
        title: cleanText(entry.title),
        detail: entry.detail ? cleanText(entry.detail) : null
      }
    : null;

const buildActivityEntry = (row) => {
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : null;
  const msg = cleanText(row?.msg).toLowerCase();
  const lvl = toUpper(row?.lvl);

  switch (msg) {
    case "scanner initializing":
      return normalizeDisplay({
        title: "Initializing scanner",
        detail: "Preparing market data and system state."
      });

    case "scanner ready":
    case "scanner started":
      return normalizeDisplay({
        title: "Scanner ready",
        detail: `Tracking ${meta?.cfg?.universe?.size ?? meta?.universe?.size ?? "selected"} markets using ${formatStrategy(meta?.cfg?.strategy ?? meta?.strategy)}.`
      });

    case "scanner start failed":
      return normalizeDisplay({
        title: "Scanner start failed",
        detail: "The scanner could not begin. Please check the connection and try again."
      });

    case "scanner reset":
      return normalizeDisplay(
        lvl === "OK"
          ? {
              title: "System reset complete",
              detail: "The previous session has been cleared and the scanner is idle."
            }
          : {
              title: "Scanner stopped",
              detail: "The current scan session is being stopped and cleared."
            }
      );

    case "scanner stopped":
      return normalizeDisplay({
        title: "Scanner stopped",
        detail: "Live scanning has been paused and the current session is no longer active."
      });

    case "scanner reset failed":
      return normalizeDisplay({
        title: "Reset failed",
        detail: "The current session could not be cleared yet. Please try again."
      });

    case "signal generated":
      return meta?.symbol
        ? normalizeDisplay({
          title: "New signal detected",
          detail: `${meta.symbol} - ${formatSide(meta.side)} setup identified.`
          })
        : null;

    case "signal closed":
      return meta?.symbol
        ? normalizeDisplay({
            title: "Signal closed",
            detail: `${meta.symbol} - This setup is no longer active.`
          })
        : null;

    case "target reached":
      return meta?.symbol
        ? normalizeDisplay({
            title: "Target reached",
            detail: `${meta.symbol} - The move reached its planned target.`
          })
        : null;

    case "stop loss triggered":
      return meta?.symbol
        ? normalizeDisplay({
            title: "Stop loss triggered",
            detail: `${meta.symbol} - The move reached its protection level.`
          })
        : null;

    default:
      return null;
  }
};

export const translateLogRows = (rows) => {
  if (!Array.isArray(rows)) return [];

  return rows.reduce((acc, row) => {
    const entry = buildActivityEntry(row);
    if (!entry?.title) return acc;

    const previous = acc[acc.length - 1];
    if (previous && previous.title === entry.title && previous.detail === entry.detail) {
      previous.t = row.t;
      return acc;
    }

    acc.push({
      t: row.t,
      lvl: row.lvl,
      title: entry.title,
      detail: entry.detail
    });
    return acc;
  }, []);
};

export const getActivityHelperText = ({ status, session, activityRows, now }) => {
  const normalizedStatus = cleanText(status).toLowerCase();
  const isActive = ACTIVE_STATUSES.has(normalizedStatus);
  const hasSession = cleanText(session) && cleanText(session) !== "-";
  const lastActivityTs = Array.isArray(activityRows) && activityRows.length
    ? activityRows[activityRows.length - 1].t
    : null;

  if (isActive) {
    if (Number.isFinite(lastActivityTs) && Number.isFinite(now) && now - lastActivityTs > 8000) {
      return "Monitoring market conditions";
    }
    return "Live scanning in progress";
  }

  if (normalizedStatus === "stopped" || hasSession || (Array.isArray(activityRows) && activityRows.length > 0)) {
    return "System idle";
  }

  return "Ready to start";
};
