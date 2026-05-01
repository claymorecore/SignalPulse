import { render, screen } from "@testing-library/react";
import HistoryPanel from "./HistoryPanel.jsx";

const mockSparkCanvas = jest.fn(() => <div data-testid="spark" />);
jest.mock("./SparkCanvas.jsx", () => (props) => mockSparkCanvas(props));

describe("HistoryPanel", () => {
  const mockNow = Date.now();

  const mockSignal = {
    entry: 100,
    side: "LONG",
    pnlPct: 0.25,
    history: [
      { t: mockNow - 1000, p: 100, pp: 0.01, u: 1 },
      { t: mockNow - 2000, p: 101, pp: 0.02, u: 2 }
    ]
  };

  beforeEach(() => {
    mockSparkCanvas.mockClear();
  });

  test("renders title", () => {
    render(<HistoryPanel signal={mockSignal} refNow={mockNow} />);
    expect(screen.getByText(/History/i)).toBeInTheDocument();
  });

  test("renders history rows", () => {
    render(<HistoryPanel signal={mockSignal} refNow={mockNow} />);

    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("PnL%")).toBeInTheDocument();
    expect(screen.getByText("PnL(USDT)")).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(1);
  });

  test("renders SparkCanvas", () => {
    render(<HistoryPanel signal={mockSignal} refNow={mockNow} />);
    expect(screen.getByTestId("spark")).toBeInTheDocument();
  });

  test("passes history, entry, and side to SparkCanvas", () => {
    render(<HistoryPanel signal={mockSignal} refNow={mockNow} />);

    const props = mockSparkCanvas.mock.calls[mockSparkCanvas.mock.calls.length - 1][0];

    expect(props).toEqual(
      expect.objectContaining({
        history: mockSignal.history,
        entry: 100,
        side: "LONG"
      })
    );
  });

  test("passes green sparkline colors for non-negative pnl", () => {
    render(
      <HistoryPanel
        signal={{ ...mockSignal, pnlPct: 0.25 }}
        refNow={mockNow}
      />
    );

    const props = mockSparkCanvas.mock.calls[mockSparkCanvas.mock.calls.length - 1][0];

    expect(props).toEqual(
      expect.objectContaining({
        lineColor: "#4caf50",
        fillColor: "rgba(76, 175, 80, 0.12)"
      })
    );
  });

  test("passes red sparkline colors for negative pnl", () => {
    render(
      <HistoryPanel
        signal={{ ...mockSignal, pnlPct: -0.25 }}
        refNow={mockNow}
      />
    );

    const props = mockSparkCanvas.mock.calls[mockSparkCanvas.mock.calls.length - 1][0];

    expect(props).toEqual(
      expect.objectContaining({
        lineColor: "#ff8585",
        fillColor: "rgba(255, 133, 133, 0.12)"
      })
    );
  });

  test("handles empty history", () => {
    render(
      <HistoryPanel
        signal={{ ...mockSignal, history: [] }}
        refNow={mockNow}
      />
    );

    expect(screen.getByText("No history available")).toBeInTheDocument();
    expect(screen.getByTestId("spark")).toBeInTheDocument();
  });

  test("handles missing signal", () => {
    render(<HistoryPanel signal={null} refNow={mockNow} />);

    expect(screen.getByText("No history available")).toBeInTheDocument();
    expect(screen.getByTestId("spark")).toBeInTheDocument();
  });
});