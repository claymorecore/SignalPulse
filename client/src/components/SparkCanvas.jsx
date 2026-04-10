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

    // Ensure canvas dimensions
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const arr = Array.isArray(history) ? history : [];
    const sideMult = String(side).toUpperCase() === "SHORT" ? -1 : 1;
    const points = arr
      .map(point => {
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
      .filter(point => point && isNum(point.value));

    const pts = points;
    if (pts.length < 2) return;

    // Compute min/max once
    let min = Infinity;
    let max = -Infinity;
    for (const p of pts) {
      min = Math.min(min, p.value);
      max = Math.max(max, p.value);
    }
    if (max === min) max = min + 1; // avoid division by zero

    const x0 = padding;
    const y0 = padding;
    const x1 = width - padding;
    const y1 = height - padding;
    const xRange = x1 - x0;
    const yRange = y1 - y0;

    // Map point index to canvas coordinates
    const getXY = i => {
      const x = x0 + (i / (pts.length - 1)) * xRange;
      const y = y1 - ((pts[i].value - min) / (max - min)) * yRange;
      return [x, y];
    };

    // Draw line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    pts.forEach((_, i) => {
      const [x, y] = getXY(i);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw filled area under curve
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    pts.forEach((_, i) => {
      const [x, y] = getXY(i);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fill();
  }, [history, entry, side, width, height, lineColor, fillColor, lineWidth, padding]);

  return <canvas ref={ref} width={width} height={height} style={{ display: "block" }} />;
}
