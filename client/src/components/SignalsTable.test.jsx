import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SignalsTable from "./SignalsTable.jsx";
import * as format from "../lib/format.js";

jest.mock("../lib/format.js", () => ({
  fmt4: jest.fn((v) => (typeof v === "number" ? v.toFixed(4) : "–")),
  fmtPct: jest.fn((v) => (typeof v === "number" ? `${v.toFixed(2)}%` : "–")),
  fmtUsdt: jest.fn((v) => (typeof v === "number" ? `${v.toFixed(4)} USDT` : "–")),
  fmtAge: jest.fn((date, now) => (date ? `${now - date}ms` : "–")),
  now: jest.fn(() => 1000),
  isNum: jest.fn((v) => typeof v === "number" && Number.isFinite(v)),
}));

describe("SignalsTable", () => {
  const sampleSignals = [
    {
      key: "sig1",
      symbol: "BTCUSDT",
      tf: "1h",
      setup: "Breakout",
      side: "LONG",
      status: "OPEN",
      entry: 50000,
      sl: 49500,
      tp: 51000,
      rr: 2,
      live: 50200,
      pnlPct: 4.0,
      pnlUsdt: 200,
      createdAt: 900,
      lastScanTs: 900
    },
    {
      key: "sig2",
      symbol: "ETHUSDT",
      tf: "4h",
      setup: "Reversal",
      side: "SHORT",
      status: "SL",
      entry: 4000,
      sl: 4100,
      tp: 3900,
      rr: 1.5,
      live: 3950,
      pnlPct: -1.25,
      pnlUsdt: -50,
      createdAt: 950,
      lastScanTs: 950
    },
    {
      key: "sig3",
      symbol: "SOLUSDT",
      tf: "15m",
      setup: "Momentum",
      side: "LONG",
      status: "TP",
      entry: 150,
      sl: 145,
      tp: 165,
      rr: 3,
      live: 164,
      pnlPct: 9.33,
      pnlUsdt: 14,
      createdAt: 980,
      lastScanTs: 980
    }
  ];

  it("renders table headers", () => {
    render(<SignalsTable signals={[]} />);
    expect(screen.getByText("Symbol")).toBeInTheDocument();
    expect(screen.getByText("TF")).toBeInTheDocument();
    expect(screen.getByText("PnL(USDT)")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
  });

  it("renders signal rows with symbol and side", () => {
    render(<SignalsTable signals={sampleSignals} refNow={1000} />);
    expect(screen.getByText("BTCUSDT")).toBeInTheDocument();
    expect(screen.getAllByText("LONG").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SHORT").length).toBeGreaterThan(0);
  });

  it("renders empty state when no signals are available", () => {
    render(<SignalsTable signals={[]} />);
    expect(screen.getByText("No signals available")).toBeInTheDocument();
  });

  it("highlights selected row", () => {
    render(
      <SignalsTable
        signals={sampleSignals}
        selectedKey="sig1"
        refNow={1000}
      />
    );

    const row = screen.getByText("BTCUSDT").closest("tr");
    expect(row).toHaveAttribute("aria-selected", "true");
    expect(row.style.outline).toBe("1px solid rgba(255,255,255,.18)");
  });

  it("calls onSelect when row is clicked", () => {
    const onSelect = jest.fn();

    render(
      <SignalsTable
        signals={sampleSignals}
        onSelect={onSelect}
        refNow={1000}
      />
    );

    const row = screen.getByText("BTCUSDT").closest("tr");
    fireEvent.click(row);

    expect(onSelect).toHaveBeenCalledWith("sig1");
  });

  it("calls onSelect when Enter is pressed on a row", () => {
    const onSelect = jest.fn();

    render(
      <SignalsTable
        signals={sampleSignals}
        onSelect={onSelect}
        refNow={1000}
      />
    );

    const row = screen.getByText("BTCUSDT").closest("tr");
    fireEvent.keyDown(row, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("sig1");
  });

  it("formats values using helper functions", () => {
    render(<SignalsTable signals={[sampleSignals[0]]} refNow={1000} />);

    expect(format.fmt4).toHaveBeenCalledWith(50000);
    expect(format.fmtPct).toHaveBeenCalledWith(4.0);
    expect(format.fmtUsdt).toHaveBeenCalledWith(200);
    expect(format.fmtAge).toHaveBeenCalledWith(900, 1000);
  });

  it("sorts OPEN/ACTIVE signals above finalized ones", () => {
    render(<SignalsTable signals={sampleSignals} refNow={1000} />);

    const rows = screen.getAllByRole("button");
    expect(rows[0]).toHaveTextContent("BTCUSDT");
  });

  it("renders status as a badge-like value", () => {
    render(<SignalsTable signals={[sampleSignals[0]]} refNow={1000} />);
    expect(screen.getByText("OPEN")).toBeInTheDocument();
  });
});