import { log } from "../middleware/log.js";

let timers = {};
let started = false;

// Safely clears all timers
const safeClear = () => {
  for (const k of Object.keys(timers)) {
    try {
      clearInterval(timers[k]);
    } catch {}
    try {
      clearTimeout(timers[k]);
    } catch {}
  }
  timers = {};
};

// Start the monitor
export const start = (ctx = {}) => {
  if (started) {
    return { ok: true, already: true };
  }

  started = true;

  const everyMs = Math.max(1000, Number(ctx.everyMs || 2500));
  const snapshot =
    typeof ctx.snapshot === "function" ? ctx.snapshot : () => ({});

  safeClear();

  // Heartbeat timer
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

// Default export
export default {
  start,
  stop
};