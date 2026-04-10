import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";

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

const makeTrendKlines = ({ start, step, count = 120 }) =>
  Array.from({ length: count }, (_, i) => {
    const openTime = i * 60_000;
    const close = start + i * step;
    return [
      openTime,
      String(close - 0.25),
      String(close + 1.25),
      String(close - 1.25),
      String(close),
      "1000",
      openTime + 59_000
    ];
  });

const bullishBySymbol = {
  BTCUSDT: makeTrendKlines({ start: 100, step: 0.8 }),
  ETHUSDT: makeTrendKlines({ start: 200, step: 1.1 })
};

const pricePayload = [
  { symbol: "BTCUSDT", markPrice: "210" },
  { symbol: "ETHUSDT", markPrice: "340" }
];

let tempDir;
let mockServer;
let appServer;
let baseUrl;

let express;
let scannerRoute;
let marketRoute;
let signalsRoute;
let notFound;
let errorHandler;
let scannerState;
let worker;
let market;
let dbmod;
let signalsService;

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "signalpulse-server-test-"));

  mockServer = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");

    if (url.pathname === "/fapi/v1/ticker/24hr") {
      sendJson(res, 200, [
        { symbol: "BTCUSDT", quoteVolume: "3000000" },
        { symbol: "ETHUSDT", quoteVolume: "2000000" },
        { symbol: "BNBBTC", quoteVolume: "9999999" }
      ]);
      return;
    }

    if (url.pathname === "/fapi/v1/klines") {
      const symbol = String(url.searchParams.get("symbol") || "");
      sendJson(res, 200, bullishBySymbol[symbol] || []);
      return;
    }

    if (url.pathname === "/fapi/v1/premiumIndex" || url.pathname === "/fapi/v1/ticker/price") {
      sendJson(
        res,
        200,
        pricePayload.map((item) =>
          url.pathname.endsWith("/price")
            ? { symbol: item.symbol, price: item.markPrice }
            : item
        )
      );
      return;
    }

    sendJson(res, 404, { ok: false, path: url.pathname });
  });

  const mockAddress = await listen(mockServer);
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "error";
  process.env.BINANCE_BASE_URL = `http://${mockAddress.address}:${mockAddress.port}`;
  process.env.DB_PATH = path.join(tempDir, "integration.sqlite");
  process.env.PERSIST_SIGNALS = "true";

  express = (await import("express")).default;
  scannerRoute = (await import("./routes/scanner.js")).default;
  marketRoute = (await import("./routes/market.js")).default;
  signalsRoute = (await import("./routes/signals.js")).default;
  ({ notFound, errorHandler } = await import("./middleware/error.js"));
  scannerState = (await import("./scanner/state.js")).default;
  worker = (await import("./scanner/worker.js")).default;
  market = (await import("./market/state.js")).default;
  dbmod = (await import("./db/sqlite.js")).default;
  signalsService = await import("./services/signals.service.js");

  const app = express();
  app.use(express.json());
  app.use("/api/scanner", scannerRoute);
  app.use("/api/market", marketRoute);
  app.use("/api/signals", signalsRoute);
  app.use(notFound);
  app.use(errorHandler);

  appServer = http.createServer(app);
  const appAddress = await listen(appServer);
  baseUrl = `http://${appAddress.address}:${appAddress.port}`;
});

after(async () => {
  try {
    await scannerState.stop({ reason: "test-teardown" });
  } catch {}
  try {
    await market.clearSignals({ emit: false, clearDb: true });
  } catch {}
  try {
    await dbmod.closeDb();
  } catch {}
  if (appServer) {
    await closeServer(appServer);
  }
  if (mockServer) {
    await closeServer(mockServer);
  }
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  await scannerState.stop({ reason: "test-reset" });
  await market.clearSignals({ emit: false, clearDb: true });
  await market.stopSession();
  market.setUniverse([]);
  market.clearCooldown();
  market.setLiveCount(0);
});

const fetchJson = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const body = await response.json();
  return { status: response.status, body };
};

const startPayload = {
  strategy: "EMA_ATR",
  universe: { size: 2 },
  scan: { batch: 2, throttleMs: 0, backfill: 120, symbolCooldownMs: 250 },
  timeframe: { frames: ["1m"], tick1mSec: 3600, tick5mSec: 3600 },
  indicators: { emaFast: 5, emaSlow: 20, atrLen: 14, atrFactor: 1.2 },
  risk: { rrTarget: 1.8, qty: 1, riskMult: 1 },
  live: { pnlPollSec: 60 },
  price: { mode: "last" }
};

test("scanner start route boots worker, populates market state, and persists signals", async () => {
  const start = await fetchJson("/api/scanner/start", {
    method: "POST",
    body: JSON.stringify(startPayload)
  });

  assert.equal(start.status, 200);
  assert.equal(start.body.ok, true);
  assert.equal(start.body.status, "started");
  assert.equal(start.body.cfg.strategy, "EMA_ATR");
  assert.deepEqual(start.body.cfg.timeframe.frames, ["1m"]);

  const state = await fetchJson("/api/market/state");
  assert.equal(state.status, 200);
  assert.equal(state.body.status, "running");
  assert.equal(state.body.universeCount, 2);
  assert.equal(state.body.signals.length, 2);
  assert.equal(state.body.liveCount, 2);

  for (const signal of state.body.signals) {
    assert.equal(signal.setup, "EMA_ATR");
    assert.equal(signal.tf, "1m");
    assert.ok(Number.isFinite(signal.entry));
    assert.ok(Number.isFinite(signal.live));
    assert.ok(Array.isArray(signal.history));
    assert.ok(signal.history.length >= 1);
  }

  const rows = await dbmod.all("SELECT key, symbol, tf FROM signals ORDER BY symbol ASC");
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => row.symbol),
    ["BTCUSDT", "ETHUSDT"]
  );
});

test("sqlite bootstrap creates schema tables and opens the configured database", async () => {
  await dbmod.closeDb();
  market.S.dbReady = false;

  await dbmod.initDb();

  assert.equal(dbmod.isOpen(), true);

  const tables = await dbmod.all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('kv','logs','signals','prices') ORDER BY name"
  );

  assert.deepEqual(
    tables.map((row) => row.name),
    ["kv", "logs", "prices", "signals"]
  );

  const stat = await fs.stat(process.env.DB_PATH);
  assert.equal(stat.isFile(), true);
});

test("scanner start route rejects invalid config payloads with a 400", async () => {
  const invalid = await fetchJson("/api/scanner/start", {
    method: "POST",
    body: JSON.stringify({
      strategy: "DOES_NOT_EXIST",
      universe: { size: 0 },
      timeframe: { frames: ["15m"] },
      price: { mode: "bad" }
    })
  });

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.ok, false);
  assert.equal(invalid.body.error, "invalid_scanner_config");
  assert.ok(Array.isArray(invalid.body.details));
  assert.ok(invalid.body.details.some((item) => item.path === "strategy"));
  assert.ok(invalid.body.details.some((item) => item.path === "universe.size"));
  assert.ok(invalid.body.details.some((item) => item.path === "timeframe.frames[0]"));
  assert.ok(invalid.body.details.some((item) => item.path === "price.mode"));
});

test("scanner start route rejects non-object payloads", async () => {
  const invalid = await fetchJson("/api/scanner/start", {
    method: "POST",
    body: JSON.stringify([])
  });

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, "invalid_scanner_config");
  assert.deepEqual(invalid.body.details, [
    { path: "body", message: "must be an object" }
  ]);
});

test("scanner reset route clears signals, live counters, and sqlite rows", async () => {
  await fetchJson("/api/scanner/start", {
    method: "POST",
    body: JSON.stringify(startPayload)
  });

  const reset = await fetchJson("/api/scanner/reset", {
    method: "POST",
    body: JSON.stringify({})
  });

  assert.equal(reset.status, 200);
  assert.equal(reset.body.ok, true);
  assert.equal(reset.body.status, "reset");

  const state = await fetchJson("/api/market/state");
  assert.equal(state.body.status, "stopped");
  assert.equal(state.body.signals.length, 0);
  assert.equal(state.body.liveCount, 0);
  assert.equal(state.body.cooldownLeftMs, 0);

  const rows = await dbmod.all("SELECT COUNT(*) AS count FROM signals");
  assert.equal(rows[0].count, 0);
});

test("market session reload restores persisted signals after sqlite reconnect", async () => {
  await market.startSession({ loadDb: false, clearDb: true });

  await market.upsertSignal({
    key: "BTCUSDT|1m|EMA_ATR|LONG",
    symbol: "BTCUSDT",
    tf: "1m",
    setup: "EMA_ATR",
    side: "LONG",
    status: "OPEN",
    entry: 100,
    sl: 95,
    tp: 110,
    rr: 2,
    closeTime: 123456,
    createdAt: 123400,
    lastScanTs: 123450,
    lastLiveTs: 123460,
    live: 101,
    pnlPct: 1,
    pnlUsdt: 2,
    history: [
      { t: 3, p: 103, pp: 3, u: 6 },
      { t: 1, p: 101, pp: 1, u: 2 },
      { t: 2, p: 102, pp: 2, u: 4 }
    ]
  }, { emit: false });

  assert.equal((await dbmod.all("SELECT COUNT(*) AS count FROM signals"))[0].count, 1);

  await dbmod.closeDb();
  market.S.dbReady = false;
  market.S.signals.clear();
  market.S.symbolToKey.clear();

  await market.startSession({ loadDb: true });

  const snapshot = market.snapshot();
  assert.equal(snapshot.signals.length, 1);
  assert.equal(snapshot.signals[0].symbol, "BTCUSDT");
  assert.deepEqual(
    snapshot.signals[0].history.map((point) => point.t),
    [1, 2, 3]
  );
});

test("clearSignals with clearDb removes persisted rows and keeps memory empty after reload", async () => {
  await market.startSession({ loadDb: false, clearDb: true });

  await market.upsertSignal({
    key: "ETHUSDT|5m|EMA_ATR|LONG",
    symbol: "ETHUSDT",
    tf: "5m",
    setup: "EMA_ATR",
    side: "LONG",
    status: "OPEN",
    entry: 200,
    sl: 190,
    tp: 220,
    rr: 2,
    closeTime: 223456,
    createdAt: 223400,
    lastScanTs: 223450,
    lastLiveTs: NaN,
    live: NaN,
    pnlPct: NaN,
    pnlUsdt: NaN,
    history: []
  }, { emit: false });

  await market.clearSignals({ emit: false, clearDb: true });

  assert.equal(market.snapshot().signals.length, 0);
  assert.equal((await dbmod.all("SELECT COUNT(*) AS count FROM signals"))[0].count, 0);

  await dbmod.closeDb();
  market.S.dbReady = false;
  await market.startSession({ loadDb: true });

  assert.equal(market.snapshot().signals.length, 0);
});

test("worker start directly hydrates market state from mocked Binance responses", async () => {
  await market.startSession({ loadDb: false });

  const result = await worker.start({
    strategy: "EMA_ATR",
    uni: 1,
    batch: 1,
    throttle: 0,
    tfs: ["1m"],
    int1: 3600,
    emaF: 5,
    emaS: 20,
    atrL: 14,
    atrF: 1.2,
    rr: 1.8,
    qty: 1,
    riskMult: 1,
    pnlPoll: 60,
    backfill: 120,
    symCd: 250,
    pxMode: "last"
  });

  assert.equal(result.ok, true);
  assert.equal(result.started, true);
  assert.equal(worker.isRunning(), true);
  assert.equal(market.snapshot().signals.length, 1);
  assert.equal(market.snapshot().universeCount, 1);

  await worker.stop();
  await market.stopSession();

  assert.equal(worker.isRunning(), false);
  assert.equal(market.snapshot().status, "stopped");
});

test("active signal keeps immutable identity fields when a new scan result arrives", async () => {
  await market.startSession({ loadDb: false, clearDb: true });

  const original = {
    key: "BTCUSDT|1m|EMA_ATR|LONG",
    symbol: "BTCUSDT",
    tf: "1m",
    setup: "EMA_ATR",
    side: "LONG",
    status: "OPEN",
    entry: 100,
    sl: 95,
    tp: 110,
    rr: 2,
    closeTime: 111,
    createdAt: 1_000,
    lastScanTs: 1_000,
    lastLiveTs: NaN,
    live: NaN,
    pnlPct: NaN,
    pnlUsdt: NaN,
    history: []
  };

  const replacementAttempt = {
    key: "BTCUSDT|5m|EMA_ATR|SHORT",
    symbol: "BTCUSDT",
    tf: "5m",
    setup: "EMA_ATR",
    side: "SHORT",
    status: "OPEN",
    entry: 125,
    sl: 130,
    tp: 115,
    rr: 1.5,
    closeTime: 222,
    createdAt: 2_000,
    lastScanTs: 2_000,
    lastLiveTs: NaN,
    live: NaN,
    pnlPct: NaN,
    pnlUsdt: NaN,
    history: []
  };

  await market.upsertSignal(original, { emit: false });
  await market.upsertSignal(replacementAttempt, { emit: false });

  const snapshot = market.snapshot();
  const stored = market.getSignal(original.key);
  assert.equal(snapshot.signals.length, 1);
  assert.equal(snapshot.signals[0].key, original.key);
  assert.equal(snapshot.signals[0].tf, original.tf);
  assert.equal(snapshot.signals[0].side, original.side);
  assert.equal(snapshot.signals[0].entry, original.entry);
  assert.equal(snapshot.signals[0].sl, original.sl);
  assert.equal(snapshot.signals[0].tp, original.tp);
  assert.equal(snapshot.signals[0].rr, original.rr);
  assert.equal(snapshot.signals[0].createdAt, original.createdAt);
  assert.equal(snapshot.signals[0].lastScanTs, replacementAttempt.lastScanTs);
  assert.equal(stored.closeTime, original.closeTime);
});

test("patchSignal updates dynamic fields without mutating an active signal structure", async () => {
  await market.startSession({ loadDb: false, clearDb: true });

  const original = {
    key: "ETHUSDT|1m|EMA_ATR|LONG",
    symbol: "ETHUSDT",
    tf: "1m",
    setup: "EMA_ATR",
    side: "LONG",
    status: "OPEN",
    entry: 200,
    sl: 190,
    tp: 220,
    rr: 2,
    closeTime: 333,
    createdAt: 3_000,
    lastScanTs: 3_000,
    lastLiveTs: NaN,
    live: NaN,
    pnlPct: NaN,
    pnlUsdt: NaN,
    history: []
  };

  await market.upsertSignal(original, { emit: false });
  await signalsService.patchSignal(original.key, {
    entry: 999,
    sl: 1,
    tp: 2,
    rr: 9,
    side: "SHORT",
    setup: "OTHER",
    live: 205,
    pnlPct: 2.5,
    pnlUsdt: 7.5,
    lastScanTs: 3_500,
    lastLiveTs: 3_550
  }, { emit: false });

  const signal = market.getSignal(original.key);
  assert.equal(signal.entry, original.entry);
  assert.equal(signal.sl, original.sl);
  assert.equal(signal.tp, original.tp);
  assert.equal(signal.rr, original.rr);
  assert.equal(signal.side, original.side);
  assert.equal(signal.setup, original.setup);
  assert.equal(signal.live, 205);
  assert.equal(signal.pnlPct, 2.5);
  assert.equal(signal.pnlUsdt, 7.5);
  assert.equal(signal.lastScanTs, 3_500);
  assert.equal(signal.lastLiveTs, 3_550);
});

test("a new signal can replace the previous one only after the earlier signal is finalized", async () => {
  await market.startSession({ loadDb: false, clearDb: true });

  const original = {
    key: "BTCUSDT|1m|EMA_ATR|LONG",
    symbol: "BTCUSDT",
    tf: "1m",
    setup: "EMA_ATR",
    side: "LONG",
    status: "OPEN",
    entry: 100,
    sl: 95,
    tp: 110,
    rr: 2,
    closeTime: 444,
    createdAt: 4_000,
    lastScanTs: 4_000,
    lastLiveTs: NaN,
    live: NaN,
    pnlPct: NaN,
    pnlUsdt: NaN,
    history: []
  };

  const nextSignal = {
    key: "BTCUSDT|5m|EMA_ATR|SHORT",
    symbol: "BTCUSDT",
    tf: "5m",
    setup: "EMA_ATR",
    side: "SHORT",
    status: "OPEN",
    entry: 130,
    sl: 136,
    tp: 118,
    rr: 2,
    closeTime: 555,
    createdAt: 5_000,
    lastScanTs: 5_000,
    lastLiveTs: NaN,
    live: NaN,
    pnlPct: NaN,
    pnlUsdt: NaN,
    history: []
  };

  await market.upsertSignal(original, { emit: false });
  await market.upsertSignal({ ...original, status: "TP", live: 110, pnlPct: 10, pnlUsdt: 10 }, { emit: false });
  await market.upsertSignal(nextSignal, { emit: false });

  const snapshot = market.snapshot();
  assert.equal(snapshot.signals.length, 1);
  assert.equal(snapshot.signals[0].key, nextSignal.key);
  assert.equal(snapshot.signals[0].side, nextSignal.side);
  assert.equal(snapshot.signals[0].entry, nextSignal.entry);
  assert.equal(snapshot.signals[0].status, "OPEN");
});
