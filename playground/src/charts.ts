import type { Snapshot } from "./types";

// Minimal chart primitives used by the metrics dashboard. No dependency on a
// chart library — everything is drawn with raw canvas calls on offscreen-sized
// canvases that slot into the page grid.

const AXIS = "#334155";
const GRID = "#1e293b";
const TEXT = "#94a3b8";

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

/** Single sparkline of a numeric series. */
export function drawSparkline(
  canvas: HTMLCanvasElement,
  series: number[],
  label: string,
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

  // Grid line at max.
  ctx.strokeStyle = GRID;
  ctx.beginPath();
  ctx.moveTo(4, toY(max));
  ctx.lineTo(w - 4, toY(max));
  ctx.stroke();

  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  series.forEach((v, i) => {
    const x = 4 + i * xStep;
    const y = toY(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Latest value label (right).
  const last = series[series.length - 1];
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(last.toFixed(1), w - 4, 4);
  ctx.textAlign = "left";
}

/** Vertical bar chart of a numeric series (fixed width). */
export function drawBars(
  canvas: HTMLCanvasElement,
  series: number[],
  label: string,
): void {
  const ctx = withDpr(canvas);
  const { clientWidth: w, clientHeight: h } = canvas;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = TEXT;
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(label, 4, 4);

  if (series.length === 0) return;
  const max = Math.max(1, ...series);
  const barW = (w - 8) / series.length;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    const bh = (v / max) * (h - 24);
    const x = 4 + i * barW;
    const y = h - 4 - bh;
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(x + 0.5, y, Math.max(barW - 1, 1), bh);
  }
}

/**
 * Per-stop heatmap of waiting counts over time. Each row is a stop, each
 * column is a time bucket, colored by intensity.
 */
export class Heatmap {
  #canvas: HTMLCanvasElement;
  /** rows[stopIndex] = FIFO queue of recent waiting counts. */
  #rows: number[][] = [];
  #labels: string[] = [];
  readonly #bucketCount: number;

  constructor(canvas: HTMLCanvasElement, bucketCount = 60) {
    this.#canvas = canvas;
    this.#bucketCount = bucketCount;
  }

  record(snap: Snapshot): void {
    if (snap.stops.length !== this.#rows.length) {
      this.#rows = snap.stops.map(() => []);
      this.#labels = snap.stops.map((s) => s.name);
    }
    snap.stops.forEach((stop, i) => {
      const row = this.#rows[i];
      row.push(stop.waiting);
      if (row.length > this.#bucketCount) row.shift();
    });
  }

  draw(): void {
    const ctx = withDpr(this.#canvas);
    const { clientWidth: w, clientHeight: h } = this.#canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = TEXT;
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("Queue heatmap", 4, 4);

    if (this.#rows.length === 0) return;

    const labelW = 56;
    const plotX = labelW;
    const plotY = 20;
    const plotW = w - plotX - 4;
    const plotH = h - plotY - 4;
    const rowH = plotH / this.#rows.length;
    const colW = plotW / this.#bucketCount;
    const globalMax = Math.max(
      1,
      ...this.#rows.flatMap((r) => r),
    );

    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    this.#rows.forEach((row, i) => {
      const ry = plotY + i * rowH;
      ctx.fillStyle = TEXT;
      ctx.fillText(this.#labels[i] ?? `#${i}`, labelW - 4, ry + rowH / 2);
      for (let c = 0; c < row.length; c++) {
        const v = row[row.length - 1 - c];
        const intensity = Math.min(1, v / globalMax);
        ctx.fillStyle = heatColor(intensity);
        const cx = plotX + (this.#bucketCount - 1 - c) * colW;
        ctx.fillRect(cx, ry + 1, Math.max(colW - 0.5, 1), Math.max(rowH - 2, 1));
      }
    });

    // Grid border.
    ctx.strokeStyle = AXIS;
    ctx.strokeRect(plotX, plotY, plotW, plotH);
    ctx.textAlign = "left";
  }

  reset(): void {
    this.#rows = [];
    this.#labels = [];
  }
}

function heatColor(t: number): string {
  // Black → teal → amber gradient.
  if (t <= 0) return "#0b1220";
  const r = Math.round(255 * Math.min(1, t * 1.4));
  const g = Math.round(80 + 120 * t);
  const b = Math.round(120 * (1 - t));
  return `rgb(${r}, ${g}, ${b})`;
}
