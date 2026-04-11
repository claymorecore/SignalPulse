const buckets = new Map();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 240;

const now = () => Date.now();

export const rateLimit = (req, res, next) => {
  const key = req.ip || req.socket?.remoteAddress || "global";
  const current = buckets.get(key);
  const ts = now();

  if (!current || ts - current.windowStart > WINDOW_MS) {
    buckets.set(key, { windowStart: ts, count: 1 });
    next();
    return;
  }

  current.count += 1;

  if (current.count > MAX_REQUESTS) {
    res.status(429).json({
      ok: false,
      error: "rate_limited",
      message: "Too many requests. Please slow down."
    });
    return;
  }

  next();
};

export default rateLimit;
