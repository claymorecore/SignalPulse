// logs.service.js
import db from "../db/sqlite.js";

// safe JSON stringify
const j = (o) => {
  try {
    return JSON.stringify(o);
  } catch {
    return null;
  }
};

// current timestamp in ms
const now = () => Date.now();

/**
 * Write a log entry to the database
 * @param {Object} evt - Event object with optional type and payload
 */
export async function writeLog(evt) {
  try {
    await db.initDb(); // ensure DB initialized

    const lvl = String(evt?.type || "INFO");
    const msg = String(
      evt?.payload?.msg ||
      evt?.payload?.message ||
      evt?.payload?.err ||
      evt?.type ||
      ""
    );
    const ctx = j(evt?.payload ?? null);

    await db.run(
      "INSERT INTO logs(ts,lvl,msg,ctx) VALUES(?,?,?,?)",
      [now(), lvl, msg, ctx]
    );
  } catch (e) {
    // fail silently
    console.warn("LOG_WRITE_FAIL", e?.message || e);
  }
}

/**
 * Fetch recent logs from the database
 * @param {number} limit - Max number of rows to return
 * @returns {Promise<Array>} List of log rows
 */
export async function tail(limit = 200) {
  await db.initDb();

  const lim = Math.max(1, parseInt(limit, 10) || 200);

  const rows = await db.all(
    "SELECT ts, lvl, msg, ctx FROM logs ORDER BY ts DESC LIMIT ?",
    [lim]
  );

  return rows || [];
}

// export as default object
export default {
  writeLog,
  tail
};