import {
  normalizeHistory,
  normalizeSignal,
  normalizeSnapshot
} from "./normalize.js";

describe("normalize", () => {
  test("normalizeHistory filters invalid points and sorts ascending by time", () => {
    const result = normalizeHistory([
      { t: 3, p: 103, pp: 3, u: 6 },
      null,
      { t: 1, p: 101, pp: 1, u: 2 },
      { t: 0, p: 100, pp: 0, u: 0 },
      { t: 2, p: 102, pp: 2, u: 4 }
    ]);

    expect(result).toEqual([
      { t: 1, p: 101, pp: 1, u: 2 },
      { t: 2, p: 102, pp: 2, u: 4 },
      { t: 3, p: 103, pp: 3, u: 6 }
    ]);
  });

  test("normalizeSignal normalizes a single signal safely", () => {
    const result = normalizeSignal({
      key: "BTCUSDT|1m|EMA_ATR|LONG",
      symbol: "BTCUSDT",
      tf: "1m",
      setup: "EMA_ATR",
      side: "LONG",
      status: "OPEN",
      entry: "100",
      sl: "95",
      tp: "110",
      rr: "2",
      createdAt: "1000",
      lastScanTs: "1010",
      lastLiveTs: "1020",
      live: "101",
      pnlPct: "1.25",
      pnlUsdt: "5",
      history: [{ t: 1, p: 101, pp: 1, u: 5 }]
    });

    expect(result).toEqual({
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
      createdAt: 1000,
      lastScanTs: 1010,
      lastLiveTs: 1020,
      live: 101,
      pnlPct: 1.25,
      pnlUsdt: 5,
      history: [{ t: 1, p: 101, pp: 1, u: 5 }]
    });
  });

  test("normalizeSnapshot falls back to safe defaults", () => {
    expect(normalizeSnapshot(null)).toEqual({
      status: "idle",
      session: null,
      universeCount: 0,
      cooldownLeftMs: 0,
      liveCount: 0,
      signals: []
    });
  });

  test("normalizeSnapshot keeps numeric session values", () => {
    const result = normalizeSnapshot({
      status: "running",
      session: 42,
      universeCount: 12,
      cooldownLeftMs: 1500,
      liveCount: 3,
      signals: []
    });

    expect(result).toEqual({
      status: "running",
      session: 42,
      universeCount: 12,
      cooldownLeftMs: 1500,
      liveCount: 3,
      signals: []
    });
  });
});