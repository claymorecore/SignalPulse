import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";

const listen = (server) =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

const sendJson = (res, code, payload) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const makeTrendingKlines = ({ start, step, count = 120 }) =>
  Array.from({ length: count }, (_, index) => {
    const openTime = index * 60_000;
    const base = start + index * step;
    return [
      openTime,
      String(base - 0.2),
      String(base + 1.4),
      String(base - 1.0),
      String(base + 0.8),
      "1000",
      openTime + 59_000
    ];
  });

const mockKlines = {
  BTCUSDT: makeTrendingKlines({ start: 100, step: 0.9 }),
  ETHUSDT: makeTrendingKlines({ start: 180, step: 1.2 })
};

let mockServer;
let appServer;
let baseUrl;

before(async () => {
  mockServer = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");

    if (url.pathname === "/fapi/v1/klines") {
      const symbol = String(url.searchParams.get("symbol") || "");
      sendJson(res, 200, mockKlines[symbol] || []);
      return;
    }

    if (url.pathname === "/fapi/v1/ticker/24hr") {
      sendJson(res, 200, [
        { symbol: "BTCUSDT", quoteVolume: "3000000" },
        { symbol: "ETHUSDT", quoteVolume: "2500000" }
      ]);
      return;
    }

    sendJson(res, 404, { ok: false });
  });

  const mockAddress = await listen(mockServer);
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "error";
  process.env.BINANCE_BASE_URL = `http://${mockAddress.address}:${mockAddress.port}`;

  const express = (await import("express")).default;
  const signalsRoute = (await import("./routes/signals.js")).default;
  const { notFound, errorHandler } = await import("./middleware/error.js");

  const app = express();
  app.use(express.json());
  app.use("/api/signals", signalsRoute);
  app.use(notFound);
  app.use(errorHandler);

  appServer = http.createServer(app);
  const address = await listen(appServer);
  baseUrl = `http://${address.address}:${address.port}`;
});

after(async () => {
  if (appServer) await closeServer(appServer);
  if (mockServer) await closeServer(mockServer);
});

const fetchJson = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  return {
    status: response.status,
    body: await response.json()
  };
};

test("signal engine scan returns structured surfaced signals and summary", async () => {
  const response = await fetchJson("/api/signals/scan", {
    method: "POST",
    body: JSON.stringify({
      symbols: ["BTCUSDT", "ETHUSDT"],
      timeframes: ["1m"],
      limit: 120,
      debug: true
    })
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.ok(Array.isArray(response.body.result.surfacedSignals));
  assert.ok(response.body.result.surfacedSignals.length >= 1);

  const [signal] = response.body.result.surfacedSignals;
  assert.equal(typeof signal.id, "string");
  assert.equal(typeof signal.symbol, "string");
  assert.equal(typeof signal.setupType, "string");
  assert.equal(typeof signal.confidenceScore, "number");
  assert.ok(Array.isArray(signal.contextTags));
  assert.ok(signal.thesis.length > 0);
  assert.ok(signal.whyNow.length > 0);
});

test("signal engine summary reflects the last scan state", async () => {
  await fetchJson("/api/signals/scan", {
    method: "POST",
    body: JSON.stringify({
      symbols: ["BTCUSDT"],
      timeframes: ["1m"],
      limit: 120
    })
  });

  const summary = await fetchJson("/api/signals/engine/summary");
  assert.equal(summary.status, 200);
  assert.equal(summary.body.ok, true);
  assert.ok(summary.body.summary.scannedAt > 0);
  assert.ok(typeof summary.body.summary.surfacedCount === "number");
  assert.ok(Array.isArray(summary.body.summary.contextSummary));
});
