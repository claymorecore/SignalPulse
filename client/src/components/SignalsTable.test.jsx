// SignalTable.test.jsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SignalsTable from "./SignalsTable.jsx";
import * as format from "../lib/format.js";

// Mocks für Format-Funktionen
jest.mock("../lib/format.js", () => ({
  fmt4: jest.fn((v) => (v !== undefined ? v.toFixed(4) : "–")),
  fmtPct: jest.fn((v) => (v !== undefined ? `${(v * 100).toFixed(2)}%` : "–")),
  fmtUsdt: jest.fn((v) => (v !== undefined ? `$${v.toFixed(2)}` : "–")),
  fmtAge: jest.fn((date, now) => (date ? `${now - date}ms` : "–")),
  now: jest.fn(() => 1000),
  isNum: jest.fn((v) => typeof v === "number"),
}));

describe("SignalsTable", () => {
  const sampleSignals = [
    {
      key: "sig1",
      symbol: "BTCUSDT",
      tf: "1h",
      setup: "Breakout",
      side: "Long",
      status: "Open",
      entry: 50000,
      sl: 49500,
      tp: 51000,
      rr: 2,
      live: 50200,
      pnlPct: 0.04,
      pnlUsdt: 200,
      createdAt: 900,
    },
    {
      key: "sig2",
      symbol: "ETHUSDT",
      tf: "4h",
      setup: "Reversal",
      side: "Short",
      status: "Closed",
      entry: 4000,
      sl: 4100,
      tp: 3900,
      rr: 1.5,
      live: 3950,
      pnlPct: -0.0125,
      pnlUsdt: -50,
      createdAt: 950,
    },
  ];

  it("renders table headers", () => {
    render(<SignalsTable signals={[]} />);
    expect(screen.getByText("Symbol")).toBeInTheDocument();
    expect(screen.getByText("TF")).toBeInTheDocument();
    expect(screen.getByText("PnL(USDT)")).toBeInTheDocument();
  });

  it("renders signal rows", () => {
    render(<SignalsTable signals={sampleSignals} refNow={1000} />);
    expect(screen.getByText("BTCUSDT")).toBeInTheDocument();
    expect(screen.getByText("ETHUSDT")).toBeInTheDocument();
  });

  it("highlights selected row", () => {
    const { container } = render(
      <SignalsTable signals={sampleSignals} selectedKey="sig1" refNow={1000} />
    );
    const row = container.querySelector("tr[style]");
    expect(row.style.outline).toBe("1px solid rgba(255,255,255,.18)");
  });

  it("calls onSelect when row is clicked", () => {
    const onSelect = jest.fn();
    render(
      <SignalsTable signals={sampleSignals} onSelect={onSelect} refNow={1000} />
    );
    const row = screen.getByText("BTCUSDT").closest("tr");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("sig1");
  });

  it("formats values using helper functions", () => {
    render(<SignalsTable signals={[sampleSignals[0]]} refNow={1000} />);
    expect(format.fmt4).toHaveBeenCalledWith(50000);
    expect(format.fmtPct).toHaveBeenCalledWith(0.04);
    expect(format.fmtUsdt).toHaveBeenCalledWith(200);
    expect(format.fmtAge).toHaveBeenCalledWith(900, 1000);
  });
});