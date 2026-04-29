import { render, screen } from "@testing-library/react";
import SnapshotPanel from "./SnapshotPanel.jsx";
import * as format from "../lib/format.js";

jest.mock("../lib/format.js", () => ({
  fmt4: jest.fn((v) => (typeof v === "number" ? v.toFixed(4) : "–")),
  fmtPct: jest.fn((v) => (typeof v === "number" ? `${v.toFixed(2)}%` : "–")),
  fmtUsdt: jest.fn((v) => (typeof v === "number" ? `${v.toFixed(4)} USDT` : "–")),
  fmtAge: jest.fn((date, now) => (date ? `${now - date}ms` : "–")),
  isNum: jest.fn((v) => typeof v === "number" && Number.isFinite(v)),
}));

describe("SnapshotPanel", () => {
  const sampleSignal = {
    symbol: "BTCUSDT",
    tf: "1h",
    setup: "Breakout",
    side: "LONG",
    status: "OPEN",

    entry: 50000,
    sl: 49500,
    tp: 51000,
    rr: 2,

    qty: 0.002,
    capitalUsd: 100,
    riskDistance: 500,

    live: 50200,
    pnlPct: 4.0,
    pnlUsdt: 200,

    createdAt: 900,
    lastScanTs: 950,
    lastLiveTs: 980,
  };

  it("renders title and empty state when no signal is provided", () => {
    render(<SnapshotPanel signal={null} />);

    expect(screen.getByText("Snapshot")).toBeInTheDocument();
    expect(screen.getByText("No signal selected")).toBeInTheDocument();
  });

  it("renders all key-value labels including sizing fields", () => {
    render(<SnapshotPanel signal={sampleSignal} refNow={1000} />);

    [
      "Symbol",
      "TF",
      "Setup",
      "Side",
      "Status",
      "Entry",
      "SL",
      "TP",
      "RR",
      "Qty",
      "Capital",
      "Risk Dist",
      "Live",
      "PnL%",
      "PnL(USDT)",
      "Created",
      "Last Scan",
      "Last Live"
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("renders actual values", () => {
    render(<SnapshotPanel signal={sampleSignal} refNow={1000} />);

    expect(screen.getByText("BTCUSDT")).toBeInTheDocument();
    expect(screen.getByText("LONG")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByText("100.00 USDT")).toBeInTheDocument();
  });

  it("formats values using helper functions", () => {
    render(<SnapshotPanel signal={sampleSignal} refNow={1000} />);

    expect(format.fmt4).toHaveBeenCalledWith(50000);
    expect(format.fmt4).toHaveBeenCalledWith(49500);
    expect(format.fmt4).toHaveBeenCalledWith(51000);
    expect(format.fmt4).toHaveBeenCalledWith(0.002);
    expect(format.fmt4).toHaveBeenCalledWith(500);

    expect(format.fmtPct).toHaveBeenCalledWith(4.0);
    expect(format.fmtUsdt).toHaveBeenCalledWith(200);

    expect(format.fmtAge).toHaveBeenCalledWith(900, 1000);
    expect(format.fmtAge).toHaveBeenCalledWith(950, 1000);
    expect(format.fmtAge).toHaveBeenCalledWith(980, 1000);
  });

  it("renders fallback values for missing fields", () => {
    render(<SnapshotPanel signal={{ symbol: "ETHUSDT" }} refNow={1000} />);

    expect(screen.getByText("ETHUSDT")).toBeInTheDocument();

    const dashes = screen.getAllByText("–");
    expect(dashes.length).toBeGreaterThan(5);
  });

  it("applies positive pnl color class", () => {
    render(
      <SnapshotPanel
        signal={{ ...sampleSignal, pnlPct: 5, pnlUsdt: 10 }}
        refNow={1000}
      />
    );

    const pnl = screen.getByText("5.00%");
    expect(pnl.className).toMatch(/pnl-positive/);
  });

  it("applies negative pnl color class", () => {
    render(
      <SnapshotPanel
        signal={{ ...sampleSignal, pnlPct: -2, pnlUsdt: -5 }}
        refNow={1000}
      />
    );

    const pnl = screen.getByText("-2.00%");
    expect(pnl.className).toMatch(/pnl-negative/);
  });

  it("renders qty, capital and risk distance fields", () => {
    render(<SnapshotPanel signal={sampleSignal} refNow={1000} />);

    expect(screen.getByText("0.0020")).toBeInTheDocument();
    expect(screen.getByText("100.00 USDT")).toBeInTheDocument();
    expect(screen.getByText("500.0000")).toBeInTheDocument();
  });
});