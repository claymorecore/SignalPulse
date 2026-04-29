import { renderHook, act } from "@testing-library/react";
import useSignalStore from "./useSignalStore.js";

describe("useSignalStore", () => {
  it("applies normalized snapshots and exposes selected signal", () => {
    const { result } = renderHook(() => useSignalStore());

    act(() => {
      result.current.applySnapshot({
        status: "running",
        session: 42,
        universeCount: 12,
        cooldownLeftMs: 1500,
        liveCount: 3,
        signals: [
          {
            key: "sig1",
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
            lastScanTs: 1000,
            lastLiveTs: 1010,
            live: 101,
            pnlPct: 1,
            pnlUsdt: 5,
            history: []
          }
        ]
      });
    });

    expect(result.current.state.status).toBe("running");
    expect(result.current.state.session).toBe(42);
    expect(result.current.state.universeCount).toBe(12);
    expect(result.current.state.cooldownLeftMs).toBe(1500);
    expect(result.current.state.liveCount).toBe(3);
    expect(result.current.state.signals).toHaveLength(1);

    act(() => {
      result.current.select("sig1");
    });

    expect(result.current.state.selectedKey).toBe("sig1");
    expect(result.current.selected?.symbol).toBe("BTCUSDT");
  });

  it("clears selection when the selected signal disappears in the next snapshot", () => {
    const { result } = renderHook(() => useSignalStore());

    act(() => {
      result.current.applySnapshot({
        status: "running",
        session: 1,
        universeCount: 2,
        cooldownLeftMs: 0,
        liveCount: 1,
        signals: [
          {
            key: "sig1",
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
            lastScanTs: 1000,
            lastLiveTs: 1010,
            live: 101,
            pnlPct: 1,
            pnlUsdt: 5,
            history: []
          }
        ]
      });
    });

    act(() => {
      result.current.select("sig1");
    });

    act(() => {
      result.current.applySnapshot({
        status: "running",
        session: 1,
        universeCount: 2,
        cooldownLeftMs: 0,
        liveCount: 1,
        signals: []
      });
    });

    expect(result.current.state.selectedKey).toBeNull();
    expect(result.current.selected).toBeNull();
  });

  it("supports explicit clearSelect", () => {
    const { result } = renderHook(() => useSignalStore());

    act(() => {
      result.current.select("sig1");
    });

    expect(result.current.state.selectedKey).toBe("sig1");

    act(() => {
      result.current.clearSelect();
    });

    expect(result.current.state.selectedKey).toBeNull();
  });
});