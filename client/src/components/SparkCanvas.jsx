import { useEffect, useRef } from "react";
import { isNum } from "../lib/format.js";

export default function SparkCanvas({
  history,
  entry = NaN,
  side = "",
  width = 520,
  height = 140,
  lineColor = "#4caf50",
  fillColor = "rgba(76, 175, 80, 0.12)",
  lineWidth = 2,
  padding = 8
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr =
      typeof window !== "undefined"
        ? Math.max(1, window.devicePixelRatio || 1)
        : 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (typeof ctx.setTransform === "function") {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (typeof ctx.resetTransform === "function") {
      ctx.resetTransform();
      if (dpr !== 1 && typeof ctx.scale === "function") {
        ctx.scale(dpr, dpr);
      }
    }

    ctx.clearRect(0, 0, width, height);

    const arr = Array.isArray(history) ? history : [];
    const sideMult = String(side).toUpperCase() === "SHORT" ? -1 : 1;

    const points = arr
      .map((point) => {
        if (!point) return null;

        if (isNum(point.pp)) {
          return { ...point, value: point.pp };
        }

        if (isNum(point.p) && isNum(entry) && entry !== 0) {
          const relativeMove = ((point.p - entry) / entry) * 100;
          return { ...point, value: relativeMove * sideMult };
        }

        return null;
      })
      .filter((point) => point && isNum(point.value));

    if (points.length < 2) return;

    let min = Infinity;
    let max = -Infinity;

    for (const point of points) {
      min = Math.min(min, point.value);
      max = Math.max(max, point.value);
    }

    if (max === min) {
      max = min + 1;
    }

    const x0 = padding;
    const y0 = padding;
    const x1 = width - padding;
    const y1 = height - padding;
    const xRange = x1 - x0;
    const yRange = y1 - y0;

    const getXY = (index) => {
      const x = x0 + (index / (points.length - 1)) * xRange;
      const y = y1 - ((points[index].value - min) / (max - min)) * yRange;
      return [x, y];
    };

    const hasZeroLine = min < 0 && max > 0;
    if (hasZeroLine) {
      const zeroY = y1 - ((0 - min) / (max - min)) * yRange;

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.moveTo(x0, zeroY);
      ctx.lineTo(x1, zeroY);
      ctx.stroke();
    }

    const [firstX] = getXY(0);
    const [lastX] = getXY(points.length - 1);

    ctx.beginPath();
    ctx.moveTo(firstX, y1);

    points.forEach((_, index) => {
      const [x, y] = getXY(index);
      ctx.lineTo(x, y);
    });

    ctx.lineTo(lastX, y1);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.beginPath();
    points.forEach((_, index) => {
      const [x, y] = getXY(index);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }, [history, entry, side, width, height, lineColor, fillColor, lineWidth, padding]);

  return <canvas ref={ref} width={width} height={height} style={{ display: "block" }} />;
}