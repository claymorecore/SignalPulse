// src/components/ControlPanel.test.jsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ControlPanel from "./ControlPanel";

describe("ControlPanel component", () => {
  test("renders all form inputs with default values", () => {
    render(<ControlPanel />);

    // Eindeutige Werte → ok mit getByDisplayValue
    expect(screen.getByDisplayValue("40")).toBeInTheDocument(); // Universe Size
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();  
    expect(screen.getByDisplayValue("140")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45")).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(screen.getByDisplayValue("34")).toBeInTheDocument();
    expect(screen.getByDisplayValue("144")).toBeInTheDocument();
    expect(screen.getByDisplayValue("14")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1.5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("180")).toBeInTheDocument();
    expect(screen.getByDisplayValue("6500")).toBeInTheDocument();

    // ❗ Doppelte Werte → über Labels prüfen
    expect(screen.getByLabelText(/Risk Mult/i)).toHaveValue(3);
    expect(screen.getByLabelText(/Live PnL poll/i)).toHaveValue(3);

    // Select
    const usePriceSelect = screen.getByLabelText(/Use Price/i);
    expect(usePriceSelect.value).toBe("mark");
  });

  test("Start button triggers onStart", () => {
    const onStart = jest.fn();
    render(<ControlPanel onStart={onStart} />);

    fireEvent.click(screen.getByRole("button", { name: /Start/i }));

    expect(onStart).toHaveBeenCalledWith({
      strategy: "EMA_ATR",
      universe: { size: 40 },
      scan: { batch: 8, throttleMs: 140, backfill: 180, symbolCooldownMs: 6500 },
      timeframe: { tick1mSec: 45, tick5mSec: 120 },
      indicators: { emaFast: 34, emaSlow: 144, atrLen: 14, atrFactor: 1.5 },
      risk: { rrTarget: 2, qty: 1, riskMult: 3 },
      live: { pnlPollSec: 3 },
      price: { mode: "mark" }
    });
  });

  test("Start button is disabled while the scanner is active", () => {
    const onStart = jest.fn();
    render(<ControlPanel onStart={onStart} disabledStart />);

    const startButton = screen.getByRole("button", { name: /Start/i });
    expect(startButton).toBeDisabled();

    fireEvent.click(startButton);
    expect(onStart).not.toHaveBeenCalled();
  });

  test("Stop & Reset triggers reset without duplicate stop call", () => {
    const onStop = jest.fn();
    const onReset = jest.fn();
    render(<ControlPanel onStop={onStop} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: /Stop & Reset/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });

  test("Reset Form button resets all inputs to default values", () => {
    render(<ControlPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Reset Form/i }));

    expect(screen.getByDisplayValue("40")).toBeInTheDocument();

    const usePriceSelect = screen.getByLabelText(/Use Price/i);
    expect(usePriceSelect.value).toBe("mark");
  });
});
