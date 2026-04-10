import { render, screen } from "@testing-library/react";
import HistoryPanel from "./HistoryPanel.jsx";

// Mock für SparkCanvas (damit Canvas kein Problem macht)
const mockSparkCanvas = jest.fn(() => <div data-testid="spark" />);
jest.mock("./SparkCanvas.jsx", () => (props) => mockSparkCanvas(props));

describe("HistoryPanel", () => {
  const mockNow = Date.now();

  const mockSignal = {
    history: [
      { t: mockNow - 1000, p: 100, pp: 0.01, u: 1 },
      { t: mockNow - 2000, p: 101, pp: 0.02, u: 2 },
    ],
  };

  test("renders title", () => {
    render(<HistoryPanel signal={mockSignal} refNow={mockNow} />);
    expect(screen.getByText(/History/i)).toBeInTheDocument();
  });

  test("renders history rows", () => {
    render(<HistoryPanel signal={mockSignal} refNow={mockNow} />);
    
    // 2 Datenpunkte → 2 Tabellenzeilen
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(1); // inkl. Header
  });

  test("renders SparkCanvas", () => {
    render(<HistoryPanel signal={mockSignal} refNow={mockNow} />);
    expect(screen.getByTestId("spark")).toBeInTheDocument();
  });

  test("passes green sparkline colors for non-negative pnl", () => {
    render(<HistoryPanel signal={{ ...mockSignal, pnlPct: 0.25 }} refNow={mockNow} />);

    expect(mockSparkCanvas.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        lineColor: "#4caf50",
        fillColor: "rgba(76, 175, 80, 0.12)"
      })
    );
  });

  test("passes red sparkline colors for negative pnl", () => {
    render(<HistoryPanel signal={{ ...mockSignal, pnlPct: -0.25 }} refNow={mockNow} />);

    expect(mockSparkCanvas.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        lineColor: "#ff8585",
        fillColor: "rgba(255, 133, 133, 0.12)"
      })
    );
  });

  test("handles empty history", () => {
    render(<HistoryPanel signal={{ history: [] }} refNow={mockNow} />);
    
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(2);
    expect(screen.getByText("No history available")).toBeInTheDocument();
  });

  test("handles missing signal", () => {
    render(<HistoryPanel signal={null} refNow={mockNow} />);
    
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(2);
    expect(screen.getByText("No history available")).toBeInTheDocument();
  });
});
