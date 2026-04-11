import { normalizeHistory, normalizeSignal, normalizeSnapshot } from "./normalize";

describe("normalize", () => {
  test("normalizeHistory filters invalid points and sorts by timestamp", () => {
    expect(
      normalizeHistory([
        { t: 30, p: 3 },
        null,
        { t: -1, p: 9 },
        { t: 10, p: 1 },
        { t: 20, p: 2 }
      ])
    ).toEqual([
      { t: 10, p: 1, pp: NaN, u: NaN },
      { t: 20, p: 2, pp: NaN, u: NaN },
      { t: 30, p: 3, pp: NaN, u: NaN }
    ]);
  });

  test("normalizeSignal returns numeric fields and normalized history", () => {
    const signal = normalizeSignal({
      key: 7,
      symbol: "BTCUSDT",
      tf: "1m",
      setup: "EMA_ATR",
      side: "LONG",
      status: "OPEN",
      entry: "100",
      sl: "95",
      tp: "110",
      rr: "2",
      createdAt: "123",
      lastScanTs: "124",
      lastLiveTs: "125",
      live: "101",
      pnlPct: "1",
      pnlUsdt: "4",
      history: [{ t: 2, p: 20 }, { t: 1, p: 10 }]
    });

    expect(signal).toMatchObject({
      key: "7",
      symbol: "BTCUSDT",
      tf: "1m",
      setup: "EMA_ATR",
      side: "LONG",
      status: "OPEN",
      entry: 100,
      sl: 95,
      tp: 110,
      rr: 2,
      createdAt: 123,
      lastScanTs: 124,
      lastLiveTs: 125,
      live: 101,
      pnlPct: 1,
      pnlUsdt: 4
    });
    expect(signal.history.map((point) => point.t)).toEqual([1, 2]);
  });

  test("normalizeSnapshot falls back to safe defaults", () => {
    expect(normalizeSnapshot(null)).toEqual({
      status: "idle",
      session: "–",
      universeCount: 0,
      cooldownLeftMs: 0,
      liveCount: 0,
      signals: []
    });
  });
});


