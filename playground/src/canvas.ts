import type { Car, Snapshot } from "./types";

// Simple 2-D renderer. Cars are drawn as rectangles that travel vertically
// along a shaft; stops are horizontal rungs with a waiting-count chip. One
// shaft per "line" (elevator group) — lines are inferred by unique `car.line`
// ids in the snapshot so the renderer stays scenario-agnostic.

const PADDING = 32;
const CAR_WIDTH = 28;
const CAR_HEIGHT = 20;
const STOP_LINE_WIDTH = 2;

const PHASE_COLORS: Record<Car["phase"], string> = {
  idle: "#4b5563",
  moving: "#10b981",
  repositioning: "#8b5cf6",
  "door-opening": "#f59e0b",
  loading: "#3b82f6",
  "door-closing": "#f59e0b",
  stopped: "#64748b",
  unknown: "#9ca3af",
};

export class CanvasRenderer {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.#ctx = ctx;
    this.#dpr = window.devicePixelRatio || 1;
    this.#resize();
    window.addEventListener("resize", () => this.#resize());
  }

  #resize(): void {
    const { clientWidth, clientHeight } = this.#canvas;
    this.#canvas.width = clientWidth * this.#dpr;
    this.#canvas.height = clientHeight * this.#dpr;
    this.#ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
  }

  draw(snap: Snapshot): void {
    const { clientWidth: w, clientHeight: h } = this.#canvas;
    this.#ctx.clearRect(0, 0, w, h);

    if (snap.stops.length === 0) return;

    // Compute Y scale from stops (the sim's vertical axis).
    const minY = Math.min(...snap.stops.map((s) => s.y));
    const maxY = Math.max(...snap.stops.map((s) => s.y));
    const axisMin = minY - 1;
    const axisMax = maxY + 1;
    const yRange = Math.max(axisMax - axisMin, 0.0001);
    // Higher sim y = higher on screen (invert canvas coords).
    const toScreenY = (y: number): number =>
      h - PADDING - ((y - axisMin) / yRange) * (h - 2 * PADDING);

    // One shaft per line id.
    const lineIds = Array.from(new Set(snap.cars.map((c) => c.line))).sort((a, b) => a - b);
    const laneCount = Math.max(lineIds.length, 1);
    const laneWidth = (w - 2 * PADDING - 120) / laneCount;

    // Draw the rider-count chip column at the left, stop labels next.
    this.#drawStops(snap, toScreenY);

    // Draw each shaft and its cars.
    for (let i = 0; i < lineIds.length; i++) {
      const lineId = lineIds[i];
      const cx = PADDING + 120 + laneWidth * (i + 0.5);
      this.#drawShaft(cx, h);
      const carsOnLine = snap.cars.filter((c) => c.line === lineId);
      for (const car of carsOnLine) {
        this.#drawCar(car, cx, toScreenY);
      }
    }
  }

  #drawStops(snap: Snapshot, toScreenY: (y: number) => number): void {
    const ctx = this.#ctx;
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    for (const stop of snap.stops) {
      const y = toScreenY(stop.y);
      // Full-width separator line.
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = STOP_LINE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(PADDING + 100, y);
      ctx.lineTo(this.#canvas.clientWidth - PADDING, y);
      ctx.stroke();

      // Label.
      ctx.fillStyle = "#d1d5db";
      ctx.textAlign = "left";
      ctx.fillText(stop.name, PADDING, y);

      // Waiting chip.
      if (stop.waiting > 0) {
        const chipX = PADDING + 80;
        ctx.fillStyle = stop.waiting > 5 ? "#ef4444" : "#f59e0b";
        const chipR = 9;
        ctx.beginPath();
        ctx.arc(chipX, y, chipR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.textAlign = "center";
        ctx.fillText(String(stop.waiting), chipX, y);
      }
    }
  }

  #drawShaft(cx: number, h: number): void {
    const ctx = this.#ctx;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, PADDING);
    ctx.lineTo(cx, h - PADDING);
    ctx.stroke();
  }

  #drawCar(car: Car, cx: number, toScreenY: (y: number) => number): void {
    const ctx = this.#ctx;
    const cy = toScreenY(car.y);
    ctx.fillStyle = PHASE_COLORS[car.phase] ?? "#9ca3af";
    ctx.fillRect(cx - CAR_WIDTH / 2, cy - CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);
    ctx.strokeStyle = "#0b1220";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - CAR_WIDTH / 2, cy - CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);

    // Load fraction as a filled inset bar.
    const frac = car.capacity > 0 ? Math.min(car.load / car.capacity, 1) : 0;
    if (frac > 0) {
      const innerH = (CAR_HEIGHT - 4) * frac;
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
      ctx.fillRect(cx - CAR_WIDTH / 2 + 2, cy + CAR_HEIGHT / 2 - 2 - innerH, CAR_WIDTH - 4, innerH);
    }

    // Rider count.
    ctx.fillStyle = "#f9fafb";
    ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(car.riders), cx, cy);
  }

  /** Expose the underlying canvas for GIF recording. */
  get canvas(): HTMLCanvasElement {
    return this.#canvas;
  }
}
