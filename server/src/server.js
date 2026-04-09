import http from "http";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import env from "./config/env.js";
import hub from "./ws/hub.js";
import market from "./market/state.js";
import publisher from "./market/publisher.js";
import scannerState from "./scanner/state.js";
import dbmod from "./db/sqlite.js";

import { log, requestLogger, errorLogger } from "./middleware/log.js";
import { notFound, errorHandler } from "./middleware/error.js";

import healthRoute from "./routes/health.js";
import marketRoute from "./routes/market.js";
import scannerRoute from "./routes/scanner.js";
import signalsRoute from "./routes/signals.js";
import strategiesRoutes from "./routes/strategies.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global error handling
process.on("uncaughtException", (e) => {
  try {
    log.error("uncaughtException", { err: e?.message || String(e), stack: e?.stack || null });
  } catch {}
});

process.on("unhandledRejection", (e) => {
  try {
    log.error("unhandledRejection", { err: e?.message || String(e), stack: e?.stack || null });
  } catch {}
});

log.info("BOOT", { node: process.version, logLevel: process.env.LOG_LEVEL || "info", port: env.PORT });

const app = express();
app.disable("x-powered-by");

app.use(express.json({ limit: "2mb" }));
app.use(requestLogger);

// API Routes
app.use("/api/health", healthRoute);
app.use("/api/market", marketRoute);
app.use("/api/scanner", scannerRoute);
app.use("/api/signals", signalsRoute);
app.use("/api/strategies", strategiesRoutes);

// Client static hosting
const clientDist = path.resolve(__dirname, "../../client/dist");
const clientDistIndex = path.join(clientDist, "index.html");

const legacyPublic = path.resolve(__dirname, "../../client_legacy/public");
const legacyAssets = path.resolve(__dirname, "../../client_legacy/assets");
const legacyIndex = path.join(legacyPublic, "index.html");

const hasDist = fs.existsSync(clientDistIndex);
const hasLegacy = fs.existsSync(legacyIndex);

if (hasDist) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/ws")) return next();
    res.sendFile(clientDistIndex);
  });
  log.warn("CLIENT_SERVE", { mode: "dist", dir: clientDist });
} else if (hasLegacy) {
  app.use(express.static(legacyPublic, { extensions: ["html"] }));
  if (fs.existsSync(legacyAssets)) {
    app.use("/assets", express.static(legacyAssets));
  }
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/ws")) return next();
    res.sendFile(legacyIndex);
  });
  log.warn("CLIENT_SERVE", { mode: "legacy", dir: legacyPublic });
} else {
  log.warn("CLIENT_SERVE_DISABLED", { reason: "no dist or legacy index found" });
}

// Middleware
app.use(notFound);
app.use(errorLogger);
app.use(errorHandler);

// HTTP + WebSocket server
const server = http.createServer(app);
const sockets = new Set();

server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});

hub.attach(server, {
  path: env.WS_PATH,
  snapshot: () => market.snapshot()
});

const detachPublisher = publisher.onAny((evt) => {
  try {
    hub.publish(evt.type, evt.payload);
  } catch {}
});

let shuttingDown = false;

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

const destroySockets = () => {
  for (const socket of sockets) {
    try {
      socket.destroy();
    } catch {}
  }
  sockets.clear();
};

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  log.warn("SHUTDOWN_START", { signal });

  const forceTimer = setTimeout(() => {
    log.error("SHUTDOWN_FORCE", { signal });
    destroySockets();
    process.exit(1);
  }, 10_000);
  forceTimer.unref?.();

  try {
    detachPublisher();
  } catch {}

  try {
    await scannerState.stop({ reason: signal || "shutdown" });
  } catch (e) {
    log.error("SHUTDOWN_SCANNER_FAIL", { err: e?.message || String(e) });
  }

  try {
    await hub.close();
  } catch (e) {
    log.error("SHUTDOWN_WS_FAIL", { err: e?.message || String(e) });
  }

  try {
    await closeHttpServer();
  } catch (e) {
    log.error("SHUTDOWN_HTTP_FAIL", { err: e?.message || String(e) });
  }

  destroySockets();

  try {
    await dbmod.closeDb();
  } catch (e) {
    log.error("SHUTDOWN_DB_FAIL", { err: e?.message || String(e) });
  }

  clearTimeout(forceTimer);
  log.warn("SHUTDOWN_DONE", { signal });
  process.exit(exitCode);
};

process.on("SIGINT", () => {
  shutdown("SIGINT", 0);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM", 0);
});

// Start server
server.listen(env.PORT, () => {
  const url = `http://localhost:${env.PORT}`;
  const ws = `ws://localhost:${env.PORT}${env.WS_PATH}`;

  log.warn("LISTEN", { url, ws, level: process.env.LOG_LEVEL || "info" });
});
