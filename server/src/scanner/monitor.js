import { log } from "../middleware/log.js";

let timers = {};
let started = false;

// Safely clear all timers
const safeClear = () => {
  for (const key of Object.keys(timers)) {
    try {
      clearInterval(timers[key]);
    } catch {}

    try {
      clearTimeout(timers[key]);
    } catch {}
  }

  timers = {};
};

// Start the monitor
export const start = (ctx = {}) => {
  if (started) {
    return { ok: true, already: true };
  }

  const rawEveryMs = Number(ctx.everyMs);
  const everyMs = Number.isFinite(rawEveryMs)
    ? Math.max(1000, rawEveryMs)
    : 2500;

  const snapshot =
    typeof ctx.snapshot === "function"
      ? ctx.snapshot
      : () => ({});

  safeClear();

  timers.hb = setInterval(() => {
    try {
      const s = snapshot();
      log.trace("STATE_SNAPSHOT", s);
    } catch (e) {
      log.warn("MONITOR_SNAPSHOT_FAIL", {
        err: e?.message || String(e)
      });
    }
  }, everyMs);

  started = true;

  log.info("MONITOR_START", { everyMs });

  return { ok: true };
};

// Stop the monitor
export const stop = () => {
  if (!started) {
    return { ok: true, already: true };
  }

  started = false;
  safeClear();

  log.info("MONITOR_STOP", {});

  return { ok: true };
};

export default {
  start,
  stop
};