import {
  translateLogRows,
  getActivityHelperText
} from "./activityFeed.js";

describe("translateLogRows", () => {
  it("maps raw scanner events to user-facing activity messages", () => {
    const rows = [
      { t: 1, lvl: "INFO", msg: "scanner initializing" },
      { t: 2, lvl: "OK", msg: "scanner started" }
    ];

    expect(translateLogRows(rows)).toEqual([
      {
        t: 1,
        lvl: "INFO",
        title: "Scanner initializing",
        detail: null
      },
      {
        t: 2,
        lvl: "OK",
        title: "Scanner started",
        detail: null
      }
    ]);
  });

  it("deduplicates repeated identical display entries while keeping order", () => {
    const rows = [
      { t: 1, lvl: "OK", msg: "scanner started" },
      { t: 2, lvl: "OK", msg: "scanner started" },
      { t: 3, lvl: "WARN", msg: "scanner reset" }
    ];

    expect(translateLogRows(rows)).toEqual([
      {
        t: 2,
        lvl: "OK",
        title: "Scanner started",
        detail: null
      },
      {
        t: 3,
        lvl: "WARN",
        title: "System reset complete",
        detail: null
      }
    ]);
  });

  it("formats signal lifecycle messages in the current allowed style", () => {
    expect(
      translateLogRows([
        {
          t: 1,
          lvl: "INFO",
          msg: "signal generated",
          meta: { symbol: "BTCUSDT", side: "LONG" }
        },
        {
          t: 2,
          lvl: "INFO",
          msg: "target reached",
          meta: { symbol: "BTCUSDT", side: "LONG" }
        },
        {
          t: 3,
          lvl: "INFO",
          msg: "stop loss triggered",
          meta: { symbol: "ETHUSDT", side: "SHORT" }
        },
        {
          t: 4,
          lvl: "INFO",
          msg: "signal closed",
          meta: { status: "INVALIDATED" }
        }
      ])
    ).toEqual([
      {
        t: 1,
        lvl: "INFO",
        title: "New signal - BTCUSDT long",
        detail: null
      },
      {
        t: 2,
        lvl: "INFO",
        title: "TP reached",
        detail: "BTCUSDT long"
      },
      {
        t: 3,
        lvl: "INFO",
        title: "SL triggered",
        detail: "ETHUSDT short"
      },
      {
        t: 4,
        lvl: "INFO",
        title: "Signal closed",
        detail: "Status: INVALIDATED"
      }
    ]);
  });
});

describe("getActivityHelperText", () => {
  it("returns ready text before the scanner has started", () => {
    expect(
      getActivityHelperText({
        status: "idle",
        session: null,
        activityRows: [],
        now: 1000
      })
    ).toBe("Ready to start");
  });

  it("returns active text while scanning is running", () => {
    expect(
      getActivityHelperText({
        status: "running",
        session: 1,
        activityRows: [],
        now: 1000
      })
    ).toBe("Live scanning in progress");
  });

  it("returns idle text after activity has occurred", () => {
    expect(
      getActivityHelperText({
        status: "stopped",
        session: 2,
        activityRows: [{ t: 1, lvl: "INFO", title: "Scanner stopped", detail: null }],
        now: 1000
      })
    ).toBe("System idle");
  });
});