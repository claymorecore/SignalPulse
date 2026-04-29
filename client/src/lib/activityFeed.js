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

// 👉 Count visual
const applyCount = (title, count) => {
  if (!count || count <= 1) return title;
  return `${title} (x${count})`;
};

const buildActivityEntry = (row) => {
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : null;
  const msg = cleanText(row?.msg).toLowerCase();
  const lvl = toUpper(row?.lvl);
  const count = Number(row?.count) || 1;

  let base = null;

  switch (msg) {
    case "scanner initializing":
      base = {
        title: "Scanner initializing"
      };
      break;

    case "scanner ready":
    case "scanner started":
      base = {
        title: "Scanner started"
      };
      break;

    case "scanner start failed":
      base = {
        title: "Scanner start failed",
        detail: meta?.msg || "Check backend or data source"
      };
      break;

    case "scanner stopped":
      base = {
        title: "Scanner stopped"
      };
      break;

    case "scanner reset":
      base = {
        title: "System reset complete"
      };
      break;

    case "scanner reset failed":
      base = {
        title: "System reset failed",
        detail: meta?.msg || null
      };
      break;

    case "signal generated":
      base = meta?.symbol
        ? {
            title: `New signal - ${meta.symbol} ${formatSide(meta.side)}`
          }
        : {
            title: "New signal detected"
          };
      break;

    case "signal closed":
      base = {
        title: "Signal closed",
        detail: meta?.status ? `Status: ${cleanText(meta.status)}` : null
      };
      break;

    case "target reached":
      base = {
        title: "TP reached",
        detail: meta?.symbol ? `${meta.symbol} ${formatSide(meta.side)}` : null
      };
      break;

    case "stop loss triggered":
      base = {
        title: "SL triggered",
        detail: meta?.symbol ? `${meta.symbol} ${formatSide(meta.side)}` : null
      };
      break;

    default:
      return null;
  }

  if (!base) return null;

  return normalizeDisplay({
    title: applyCount(base.title, count),
    detail: base.detail || null,
    lvl
  });
};

export const translateLogRows = (rows) => {
  if (!Array.isArray(rows)) return [];

  return rows.reduce((acc, row) => {
    const entry = buildActivityEntry(row);
    if (!entry?.title) return acc;

    const previous = acc[acc.length - 1];

    // 🔥 smarter dedupe (inkl. level!)
    if (
      previous &&
      previous.title === entry.title &&
      previous.detail === entry.detail &&
      previous.lvl === entry.lvl
    ) {
      previous.t = row.t;
      return acc;
    }

    acc.push({
      t: row.t,
      lvl: entry.lvl,
      title: entry.title,
      detail: entry.detail
    });

    return acc;
  }, []);
};

export const getActivityHelperText = ({ status, session, activityRows }) => {
  const normalizedStatus = cleanText(status).toLowerCase();
  const isActive = ACTIVE_STATUSES.has(normalizedStatus);
  const hasSession = session !== null && session !== undefined && session !== "";

  if (isActive) return "Live scanning in progress";

  if (
    normalizedStatus === "stopped" ||
    hasSession ||
    (Array.isArray(activityRows) && activityRows.length > 0)
  ) {
    return "System idle";
  }

  return "Ready to start";
};

export default {
  translateLogRows,
  getActivityHelperText
};