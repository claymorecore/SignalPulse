// middleware/log.js

const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
};

const normLevel = (l) => {
  const x = String(l || "info").toLowerCase();
  return LEVELS[x] != null ? x : "info";
};

let CURRENT = LEVELS[normLevel(process.env.LOG_LEVEL || "info")];

// change log level at runtime
export const setLogLevel = (l) => {
  CURRENT = LEVELS[normLevel(l)];
};

// check if a level should be logged
const allow = (lvl) => LEVELS[lvl] >= CURRENT;

// timestamp helper
const ts = () => new Date().toISOString();

// core logging function
const emit = (lvl, msg, data) => {
  if (!allow(lvl)) return;

  const head = `[${ts()}] ${lvl.toUpperCase()} ${msg}`;

  if (data === undefined) {
    console.log(head);
    return;
  }

  try {
    console.log(head, JSON.stringify(data));
  } catch {
    console.log(head, String(data));
  }
};

// logging API
export const log = {
  trace: (m, d) => emit("trace", m, d),
  debug: (m, d) => emit("debug", m, d),
  info: (m, d) => emit("info", m, d),
  warn: (m, d) => emit("warn", m, d),
  error: (m, d) => emit("error", m, d)
};

// Express middleware for logging requests
export const requestLogger = (req, res, next) => {
  const t0 = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - t0;

    log.info("HTTP", {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ms
    });
  });

  next();
};

// Express middleware for logging errors
export const errorLogger = (err, req, res, next) => {
  log.error("HTTP_ERROR", {
    method: req.method,
    path: req.originalUrl || req.url,
    msg: err?.message || String(err)
  });

  next(err);
};

export default log;