// SparkCanvas.test.jsx
import React from "react";
import { render } from "@testing-library/react";
import SparkCanvas from "./SparkCanvas.jsx";

jest.mock("../lib/format.js", () => ({
  isNum: jest.fn((v) => typeof v === "number"),
}));

describe("SparkCanvas", () => {
  let ctxMock;

  beforeEach(() => {
    ctxMock = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      closePath: jest.fn(),
      globalAlpha: 1,
      lineWidth: 0,
    };

    // Mock getContext für alle Canvas-Elemente
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ctxMock);
  });

  it("renders a canvas element with default size", () => {
    const { container } = render(<SparkCanvas />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas.width).toBe(520);
    expect(canvas.height).toBe(140);
  });

  it("does not draw if history is empty or has less than 2 valid points", () => {
    render(<SparkCanvas history={[]} />);
    expect(ctxMock.beginPath).not.toHaveBeenCalled();

    render(<SparkCanvas history={[{ p: 1 }]} />);
    expect(ctxMock.beginPath).not.toHaveBeenCalled();
  });

  it("draws a line and filled area for valid history", () => {
    const history = [{ p: 10 }, { p: 20 }, { p: 15 }];
    render(<SparkCanvas history={history} />);

    // Prüfen, ob Canvas-Methoden aufgerufen wurden
    expect(ctxMock.clearRect).toHaveBeenCalledWith(0, 0, 520, 140);
    expect(ctxMock.beginPath).toHaveBeenCalled();
    expect(ctxMock.moveTo).toHaveBeenCalled();
    expect(ctxMock.lineTo).toHaveBeenCalled();
    expect(ctxMock.stroke).toHaveBeenCalled();
    expect(ctxMock.fill).toHaveBeenCalled();
    expect(ctxMock.closePath).toHaveBeenCalled();
  });

  it("handles history with non-number points", () => {
    const history = [{ p: 10 }, { p: "x" }, { p: 15 }];
    render(<SparkCanvas history={history} entry={10} side="LONG" />);
    // Nur gültige Punkte (10, 15) sollen gezeichnet werden
    expect(ctxMock.moveTo).toHaveBeenCalled();
    expect(ctxMock.lineTo).toHaveBeenCalled();
  });

  it("plots increasing performance upward even if short prices fall", () => {
    const history = [{ p: 100, pp: 0 }, { p: 90, pp: 10 }];
    render(<SparkCanvas history={history} entry={100} side="SHORT" />);

    const [, firstY] = ctxMock.moveTo.mock.calls[0];
    const [, secondY] = ctxMock.lineTo.mock.calls[0];
    expect(secondY).toBeLessThan(firstY);
  });

  it("falls back to entry and side when pnl history is unavailable", () => {
    const history = [{ p: 100 }, { p: 90 }];
    render(<SparkCanvas history={history} entry={100} side="SHORT" />);

    const [, firstY] = ctxMock.moveTo.mock.calls[0];
    const [, secondY] = ctxMock.lineTo.mock.calls[0];
    expect(secondY).toBeLessThan(firstY);
  });

  it("handles width and height props", () => {
    const { container } = render(<SparkCanvas width={300} height={100} />);
    const canvas = container.querySelector("canvas");
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(100);
  });
});
