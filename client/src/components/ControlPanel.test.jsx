import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ControlPanel from "./ControlPanel.jsx";

describe("ControlPanel component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders default form values", () => {
    render(
      <ControlPanel
        onStart={jest.fn()}
        onStop={jest.fn()}
        onReset={jest.fn()}
        disabledStart={false}
        disabledStop={false}
      />
    );

    expect(screen.getByLabelText(/Strategy/i)).toHaveValue("EMA_ATR");
    expect(screen.getByLabelText(/Universe Size/i)).toHaveValue(40);
    expect(screen.getByLabelText(/ATR length/i)).toHaveValue(14);
    expect(screen.getByText(/1,000\.00 USDT fixed/i)).toBeInTheDocument();
  });

  it("calls onStart with canonical payload", () => {
    const onStart = jest.fn();

    render(
      <ControlPanel
        onStart={onStart}
        onStop={jest.fn()}
        onReset={jest.fn()}
        disabledStart={false}
        disabledStop={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Start/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({
      strategy: "EMA_ATR",
      universe: { size: 40 },
      scan: { batch: 8, throttleMs: 140, backfill: 180, symbolCooldownMs: 6500 },
      timeframe: { tick1mSec: 45, tick5mSec: 120 },
      indicators: {
        emaFast: 34,
        emaSlow: 144,
        atrLen: 14,
        atrFactor: 1.5
      },
      risk: {
        rrTarget: 2
      },
      live: { pnlPollSec: 3 },
      price: { mode: "last" }
    });
  });

  it("Stop & Reset triggers stop and reset once each", async () => {
    const onStop = jest.fn().mockResolvedValue(undefined);
    const onReset = jest.fn().mockResolvedValue(undefined);

    render(
      <ControlPanel
        onStart={jest.fn()}
        onStop={onStop}
        onReset={onReset}
        disabledStart={false}
        disabledStop={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Stop & Reset/i }));

    await waitFor(() => {
      expect(onStop).toHaveBeenCalledTimes(1);
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  it("Reset Form restores defaults after editing", () => {
    render(
      <ControlPanel
        onStart={jest.fn()}
        onStop={jest.fn()}
        onReset={jest.fn()}
        disabledStart={false}
        disabledStop={false}
      />
    );

    const universe = screen.getByLabelText(/Universe Size/i);

    fireEvent.change(universe, { target: { value: "99" } });
    expect(universe).toHaveValue(99);

    fireEvent.click(screen.getByRole("button", { name: /Reset Form/i }));
    expect(universe).toHaveValue(40);
  });
});