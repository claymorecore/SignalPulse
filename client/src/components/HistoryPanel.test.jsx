import { render, screen } from "@testing-library/react";
import HistoryPanel from "./HistoryPanel.jsx";

// Mock für SparkCanvas (damit Canvas kein Problem macht)
jest.mock("./SparkCanvas.jsx", () => () => <div data-testid="spark" />);

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
