// ws.service.js
import { WebSocketServer } from "ws";
import { log } from "../middleware/log.js";

let wss = null;               // WebSocket server instance
let getSnapshot = null;       // Function to get initial state snapshot
let heartbeatTimer = null;

const clients = new Set();    // Track connected clients

/**
 * Send a JSON message to a single client
 * @param {WebSocket} ws
 * @param {Object} obj
 */
const send = (ws, obj) => {
  try {
    ws.send(JSON.stringify(obj));
  } catch {}
};

/**
 * Broadcast a message to all connected clients
 * @param {Object} obj
 */
const broadcast = (obj) => {
  for (const ws of clients) {
    if (ws.readyState === 1) { // 1 = OPEN
      send(ws, obj);
    }
  }
};

/**
 * Attach WebSocket server to an existing HTTP server
 * @param {http.Server} server
 * @param {Object} options
 * @param {string} options.path - WebSocket path
 * @param {function} options.snapshot - Function returning initial snapshot
 */
export const attach = (server, { path = "/ws", snapshot } = {}) => {
  getSnapshot = typeof snapshot === "function" ? snapshot : () => null;

  wss = new WebSocketServer({ server, path });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.isAlive = true;

    // Heartbeat
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Send initial snapshot
    send(ws, {
      type: "HELLO",
      snapshot: getSnapshot()
    });

    // Remove client on close or error
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  log.info("WS_READY", { path });

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  heartbeatTimer = setInterval(() => {
    for (const ws of clients) {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch {}
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    }
  }, 30000);
};

export const close = () =>
  new Promise((resolve) => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    for (const ws of clients) {
      try { ws.close(1001, "server_shutdown"); } catch {}
      try { ws.terminate(); } catch {}
    }
    clients.clear();

    if (!wss) {
      resolve();
      return;
    }

    const current = wss;
    wss = null;
    getSnapshot = null;

    current.close(() => {
      log.info("WS_CLOSED", {});
      resolve();
    });
  });

/**
 * Publish an event to all clients
 * @param {string} type - Event type
 * @param {any} payload - Event payload
 */
export const publish = (type, payload) => {
  broadcast({
    type: "EVT",
    evt: { type, payload }
  });
};

export default {
  attach,
  publish,
  close
};
