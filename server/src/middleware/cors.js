import env from "../config/env.js";

const parseOrigins = () =>
  String(env.CORS_ORIGIN || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const allowedOrigins = parseOrigins();

export const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const allowAny = allowedOrigins.includes("*");

  if (allowAny) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
};

export default corsMiddleware;
