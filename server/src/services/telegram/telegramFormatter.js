const isNum = (value) => Number.isFinite(+value);

const fmtNum = (value, digits = 4) => (isNum(value) ? Number(value).toFixed(digits) : "n/a");
const fmtPct = (value) => (isNum(value) ? `${Number(value).toFixed(2)}%` : "n/a");
const fmtUsdt = (value) => (isNum(value) ? Number(value).toFixed(2) : "n/a");

const formatDuration = (createdAt, now = Date.now()) => {
  if (!isNum(createdAt) || createdAt <= 0) return "n/a";

  const elapsedMs = Math.max(0, now - Number(createdAt));
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const normalizeStatus = (status) => {
  const key = String(status || "").trim().toUpperCase();
  if (!key) return "UNKNOWN";
  return key;
};

export const renderSignalTelegramText = (signal, { now = Date.now() } = {}) => {
  const sig = signal && typeof signal === "object" ? signal : {};

  return [
    `Symbol: ${String(sig.symbol || "n/a")}`,
    `Side: ${String(sig.side || "n/a")}`,
    `Setup: ${String(sig.setup || "n/a")}`,
    `Entry: ${fmtNum(sig.entry)}`,
    `SL: ${fmtNum(sig.sl)}`,
    `TP: ${fmtNum(sig.tp)}`,
    `RR: ${isNum(sig.rr) ? Number(sig.rr).toFixed(2) : "n/a"}`,
    `Status: ${normalizeStatus(sig.status)}`,
    `Live price: ${fmtNum(sig.live)}`,
    `PnL %: ${fmtPct(sig.pnlPct)}`,
    `PnL USDT: ${fmtUsdt(sig.pnlUsdt)}`,
    `Age: ${formatDuration(sig.createdAt, now)}`
  ].join("\n");
};

export default {
  renderSignalTelegramText
};