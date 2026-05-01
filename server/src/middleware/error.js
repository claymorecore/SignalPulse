// middleware/error.js

// 404 handler – for routes not found
export const notFound = (req, res, next) => {
  res.status(404).json({
    ok: false,
    error: "not_found",
    path: req.originalUrl || req.url
  });
};

// General error handler – for exceptions thrown in routes/middleware
export const errorHandler = (err, req, res, next) => {
  const status = err?.status || 500;

  const payload = {
    ok: false,
    error: err?.code || "server_error",
    message: err?.message || "Internal Server Error"
  };

  // Include stack trace only if LOG_LEVEL is debug/trace
  if (
    process.env.LOG_LEVEL === "debug" ||
    process.env.LOG_LEVEL === "trace"
  ) {
    payload.stack = err?.stack || null;
  }

  res.status(status).json(payload);
};

// default export for convenience
export default {
  notFound,
  errorHandler
};