import { act, renderHook } from "@testing-library/react";
import useSignalStore from "./useSignalStore.js";

describe("useSignalStore", () => {
  test("applies normalized snapshots and exposes selected signal", () => {
    const { result } = renderHook(() => useSignalStore());

    act(() => {
      result.current.applySnapshot({
        status: "running",
        session: 42,
        universeCount: "12",
        cooldownLeftMs: "1500",
        liveCount: "3",
        signals: [
          {
            key: "b",
            symbol: "BTCUSDT",
            tf: "1m",
            history: [{ t: 2, p: 20 }, { t: 1, p: 10 }]
          }
        ]
      });
    });

    expect(result.current.state.status).toBe("running");
    expect(result.current.state.session).toBe("42");
    expect(result.current.state.universeCount).toBe(12);
    expect(result.current.state.cooldownLeftMs).toBe(1500);
    expect(result.current.state.liveCount).toBe(3);
    expect(result.current.state.signals[0].history.map((point) => point.t)).toEqual([1, 2]);

    act(() => {
      result.current.select("b");
    });

    expect(result.current.selected?.symbol).toBe("BTCUSDT");
  });

  test("clears selection when selected signal disappears", () => {
    const { result } = renderHook(() => useSignalStore());

    act(() => {
      result.current.applySnapshot({
        signals: [{ key: "one", symbol: "ETHUSDT", tf: "5m", history: [] }]
      });
      result.current.select("one");
    });

    expect(result.current.selected?.symbol).toBe("ETHUSDT");

    act(() => {
      result.current.applySnapshot({ signals: [] });
    });

    expect(result.current.state.selectedKey).toBeNull();
    expect(result.current.selected).toBeNull();
  });
});
