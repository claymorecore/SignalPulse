// SnapshotPanel.test.jsx
import React from "react";
import { render, screen } from "@testing-library/react";
import SnapshotPanel from "./SnapshotPanel.jsx";
import * as format from "../lib/format.js";

// Mock für Format-Funktionen
jest.mock("../lib/format.js", () => ({
  fmt4: jest.fn((v) => (v !== undefined ? v.toFixed(4) : "–")),
  fmtPct: jest.fn((v) => (v !== undefined ? `${(v * 100).toFixed(2)}%` : "–")),
  fmtUsdt: jest.fn((v) => (v !== undefined ? `$${v.toFixed(2)}` : "–")),
  fmtAge: jest.fn((date, now) => (date ? `${now - date}ms` : "–")),
  isNum: jest.fn((v) => typeof v === "number"),
}));

describe("SnapshotPanel", () => {
  const sampleSignal = {
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
    lastScanTs: 950,
    lastLiveTs: 980,
  };

  it("renders fallback panel when signal is null", () => {
    render(<SnapshotPanel signal={null} />);
    expect(screen.getByText("Snapshot")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    // Prüfen, dass die canvas existiert
    expect(document.querySelector(".canvas canvas")).toBeInTheDocument();
  });

  it("renders all key-value pairs for a signal", () => {
    render(<SnapshotPanel signal={sampleSignal} refNow={1000} />);
    const expectedKeys = [
      "Symbol",
      "TF",
      "Setup",
      "Side",
      "Status",
      "Entry",
      "SL",
      "TP",
      "RR",
      "Live",
      "PnL%",
      "PnL(USDT)",
      "Created",
      "Last Scan",
      "Last Live",
    ];

    expectedKeys.forEach((key) => {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
  });

  it("formats values using helper functions", () => {
    render(<SnapshotPanel signal={sampleSignal} refNow={1000} />);
    expect(format.fmt4).toHaveBeenCalledWith(50000);
    expect(format.fmtPct).toHaveBeenCalledWith(0.04);
    expect(format.fmtUsdt).toHaveBeenCalledWith(200);
    expect(format.fmtAge).toHaveBeenCalledWith(900, 1000);
    expect(format.fmtAge).toHaveBeenCalledWith(950, 1000);
    expect(format.fmtAge).toHaveBeenCalledWith(980, 1000);
  });

  it("displays '–' for missing or null values", () => {
    const incompleteSignal = { symbol: "ETHUSDT" }; // Nur ein Feld gesetzt
    render(<SnapshotPanel signal={incompleteSignal} refNow={1000} />);
    expect(screen.getByText("ETHUSDT")).toBeInTheDocument();
    // Prüfen, dass leere Felder als "–" angezeigt werden
    expect(screen.getAllByText("–").length).toBeGreaterThan(0);
  });

  it("renders canvas even with signal", () => {
    render(<SnapshotPanel signal={sampleSignal} refNow={1000} />);
    expect(document.querySelector(".canvas canvas")).toBeInTheDocument();
  });
});