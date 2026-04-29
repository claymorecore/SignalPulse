import { render } from "@testing-library/react";
import SparkCanvas from "./SparkCanvas.jsx";

describe("SparkCanvas", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      setTransform: jest.fn(),
      scale: jest.fn()
    };

    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: jest.fn(() => ctx)
    });
  });

  it("renders a canvas element with default size", () => {
    const { container } = render(<SparkCanvas history={[]} />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(canvas.style.display).toBe("block");
  });

  it("does not draw a line if history has fewer than 2 valid points", () => {
    render(<SparkCanvas history={[{ pp: 1 }]} />);
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it("draws a line and fill for valid history", () => {
    render(
      <SparkCanvas
        history={[
          { pp: 1 },
          { pp: 2 },
          { pp: 3 }
        ]}
      />
    );

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("falls back to entry and side when pnl history is unavailable", () => {
    render(
      <SparkCanvas
        history={[
          { p: 100 },
          { p: 110 }
        ]}
        entry={100}
        side="LONG"
      />
    );

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("plots short-side falling prices as positive relative performance", () => {
    render(
      <SparkCanvas
        history={[
          { p: 100 },
          { p: 90 }
        ]}
        entry={100}
        side="SHORT"
      />
    );

    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("applies provided line and fill colors", () => {
    render(
      <SparkCanvas
        history={[
          { pp: 1 },
          { pp: 2 }
        ]}
        lineColor="#123456"
        fillColor="rgba(1,2,3,0.4)"
      />
    );

    expect(ctx.strokeStyle).toBe("#123456");
    expect(ctx.fillStyle).toBe("rgba(1,2,3,0.4)");
  });

  it("applies provided width and height styles", () => {
    const { container } = render(
      <SparkCanvas
        history={[
          { pp: 1 },
          { pp: 2 }
        ]}
        width={400}
        height={120}
      />
    );

    const canvas = container.querySelector("canvas");
    expect(canvas.style.width).toBe("400px");
    expect(canvas.style.height).toBe("120px");
  });
});