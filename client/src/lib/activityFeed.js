const ACTIVE_STATUSES = new Set(["running", "started", "scanning"]);

const toUpper = (value) => String(value || "").trim().toUpperCase();

const cleanText = (value) =>
  String(value || "")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const titleCaseReason = (reason) =>
  cleanText(reason)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatSide = (side) => {
  const key = toUpper(side);
  if (key === "LONG") return "long";
  if (key === "SHORT") return "short";
  return "new";
};

const formatRejectSample = (sample) => {
  if (!sample || typeof sample !== "object") return null;

  const symbol = cleanText(sample.symbol || "");
  const tf = cleanText(sample.tf || "");
  const side = cleanText(sample.side || "");

  return [symbol, tf, side].filter(Boolean).join(" ");
};

const formatRejectCounts = (counts, samples = {}) => {
  const entries = Object.entries(counts || {})
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 8);

  if (!entries.length) return null;

  return entries
    .map(([reason, count]) => {
      const reasonSamples = Array.isArray(samples?.[reason]) ? samples[reason] : [];
      const sampleText = reasonSamples
        .map(formatRejectSample)
        .filter(Boolean)
        .slice(0, Number(count))
        .join(", ");

      const header = `${titleCaseReason(reason)}: ${Number(count)}`;

      return sampleText
        ? `${header}\n${sampleText}`
        : header;
    })
    .join("\n\n");
};

const normalizeDisplay = (entry) =>
  entry
    ? {
        ...entry,
        title: cleanText(entry.title),
        detail: entry.detail ? cleanText(entry.detail) : null
      }
    : null;

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

    case "signal protected close":
      base = {
        title: "Protected close",
        detail: meta?.symbol
          ? `${meta.symbol} ${formatSide(meta.side)}${meta?.exitReason ? ` - ${titleCaseReason(meta.exitReason)}` : ""}`
          : meta?.exitReason
            ? titleCaseReason(meta.exitReason)
            : null
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

    case "signal reject summary":
      base = {
        title: "Signal rejects",
        detail:
          meta?.detail ||
          formatRejectCounts(meta?.counts, meta?.samples) ||
          null
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