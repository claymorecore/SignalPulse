// lib/format.js

// Returns the current timestamp in milliseconds
export const now = () => Date.now();

// Check if a value is a finite number
export const isNum = (n) => Number.isFinite(n);

// Format number to 4 decimal places or "–" if not a number
export const fmt4 = (n) => (isNum(n) ? Number(n).toFixed(4) : "–");

// Format number to 2 decimal places or "–" if not a number
export const fmt2 = (n) => (isNum(n) ? Number(n).toFixed(2) : "–");

// Format number as percentage with 2 decimals
export const fmtPct = (n) => (isNum(n) ? Number(n).toFixed(2) + "%" : "–");

// Format number as USDT-like value with 4 decimals
export const fmtUsdt = (n) => (isNum(n) ? Number(n).toFixed(4) : "–");

// Format a timestamp as "age" relative to refNow
export const fmtAge = (t, refNow = now()) => {
  const x = Number(t);
  if (!Number.isFinite(x) || x <= 0) return "–";

  let s = Math.max(0, Math.floor((refNow - x) / 1000));

  const d = Math.floor(s / 86400);
  s -= d * 86400;

  const h = Math.floor(s / 3600);
  s -= h * 3600;

  const m = Math.floor(s / 60);
  s -= m * 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// Clamp a number between min (a) and max (b)
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));