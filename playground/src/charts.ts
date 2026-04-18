// Minimal sparkline chart for one numeric series. Drawn on a sized canvas
// using raw 2D context calls — no chart library, no external deps.

const GRID = "#1f2431";
const TEXT = "#8b90a0";

function withDpr(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  const dpr = window.devicePixelRatio || 1;
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth * dpr || canvas.height !== clientHeight * dpr) {
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Draw a sparkline of `series` values; `color` overrides the line color. */
export function drawSparkline(
  canvas: HTMLCanvasElement,
  series: number[],
  label: string,
  color = "#38bdf8",
): void {
  const ctx = withDpr(canvas);
  const { clientWidth: w, clientHeight: h } = canvas;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = TEXT;
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(label, 4, 4);

  if (series.length < 2) return;
  const min = 0;
  const max = Math.max(1, ...series);
  const xStep = (w - 8) / Math.max(series.length - 1, 1);
  const toY = (v: number): number => h - 4 - ((v - min) / (max - min)) * (h - 24);

  ctx.strokeStyle = GRID;
  ctx.beginPath();
  ctx.moveTo(4, toY(max));
  ctx.lineTo(w - 4, toY(max));
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  series.forEach((v, i) => {
    const x = 4 + i * xStep;
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const last = series[series.length - 1];
  ctx.fillStyle = "#f5f6f9";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(last.toFixed(1), w - 4, 4);
  ctx.textAlign = "left";
}
