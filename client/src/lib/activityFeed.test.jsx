import { getActivityHelperText, translateLogRows } from "./activityFeed.js";

describe("translateLogRows", () => {
  it("maps raw scanner events to user-facing activity messages", () => {
    const rows = [
      {
        t: 1,
        lvl: "INFO",
        msg: "scanner start",
        meta: { strategy: "EMA_ATR", universe: { size: 40 } }
      },
      {
        t: 2,
        lvl: "OK",
        msg: "scanner started",
        meta: { status: "running" }
      }
    ];

    expect(translateLogRows(rows)).toEqual([
      {
        t: 1,
        lvl: "INFO",
        title: "Scanner started",
        detail: "Tracking 40 markets using EMA and volatility strategy."
      },
      {
        t: 2,
        lvl: "OK",
        title: "Live market scanning is now active",
        detail: "The system is checking selected markets for new trade setups."
      }
    ]);
  });

  it("deduplicates repeated identical display entries while keeping order", () => {
    const rows = [
      { t: 1, lvl: "OK", msg: "scanner started", meta: {} },
      { t: 2, lvl: "OK", msg: "scanner started", meta: {} },
      { t: 3, lvl: "WARN", msg: "scanner reset", meta: {} }
    ];

    expect(translateLogRows(rows)).toEqual([
      {
        t: 2,
        lvl: "OK",
        title: "Live market scanning is now active",
        detail: "The system is checking selected markets for new trade setups."
      },
      {
        t: 3,
        lvl: "WARN",
        title: "Scanner stopped",
        detail: "The current scan session is being stopped and cleared."
      }
    ]);
  });

  it("drops unknown raw messages so technical text does not leak into the UI", () => {
    expect(translateLogRows([{ t: 1, lvl: "INFO", msg: "payload received", meta: { foo: "bar" } }])).toEqual([]);
  });
});

describe("getActivityHelperText", () => {
  it("returns ready text before the scanner has started", () => {
    expect(getActivityHelperText({ status: "idle", session: "–", activityRows: [], now: 1000 })).toBe("Ready to start");
  });

  it("returns active text while scanning is running", () => {
    expect(getActivityHelperText({ status: "running", session: "abc", activityRows: [{ t: 1000 }], now: 2000 })).toBe("Live scanning in progress");
  });

  it("returns monitoring text between scan cycles while still active", () => {
    expect(getActivityHelperText({ status: "running", session: "abc", activityRows: [{ t: 1000 }], now: 10000 })).toBe("Monitoring market conditions");
  });

  it("returns idle text after the system has been stopped or reset", () => {
    expect(getActivityHelperText({ status: "stopped", session: "–", activityRows: [{ t: 1000 }], now: 2000 })).toBe("System idle");
  });
});
