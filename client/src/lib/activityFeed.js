const ACTIVE_STATUSES = new Set(["running", "started", "scanning"]);

const toUpper = (value) => String(value || "").trim().toUpperCase();
const cleanText = (value) =>
  String(value || "")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const formatSide = (side) => {
  const key = toUpper(side);
  if (key === "LONG") return "long";
  if (key === "SHORT") return "short";
  return "new";
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
        title: "Scanner started",
        detail: null
      });

    case "scanner ready":
    case "scanner started":
      return normalizeDisplay({
        title: "System ready",
        detail: null
      });

    case "scanner start failed":
      return normalizeDisplay({
        title: "Data feed issue detected",
        detail: null
      });

    case "scanner reset":
      return normalizeDisplay(
        lvl === "OK"
          ? {
              title: "System reset complete",
              detail: null
            }
          : {
              title: "Scanner stopped",
              detail: null
            }
      );

    case "scanner stopped":
      return normalizeDisplay({
        title: "Scanner stopped",
        detail: null
      });

    case "scanner reset failed":
      return normalizeDisplay({
        title: "Data feed issue detected",
        detail: null
      });

    case "signal generated":
      return meta?.symbol
        ? normalizeDisplay({
          title: `New signal detected - ${meta.symbol} ${formatSide(meta.side)}`,
          detail: null
          })
        : null;

    case "signal closed":
      return normalizeDisplay({
        title: "Signal invalidated",
        detail: null
      });

    case "target reached":
      return normalizeDisplay({
        title: "Signal closed - TP reached",
        detail: null
      });

    case "stop loss triggered":
      return normalizeDisplay({
        title: "Signal closed - SL triggered",
        detail: null
      });

    case "system recovered":
      return normalizeDisplay({
        title: "System recovered",
        detail: null
      });

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
    return "Live scanning in progress";
  }

  if (normalizedStatus === "stopped" || hasSession || (Array.isArray(activityRows) && activityRows.length > 0)) {
    return "System idle";
  }

  return "Ready to start";
};
