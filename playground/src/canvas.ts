import type { Car, Snapshot } from "./types";

// 2-D renderer. Cars are rectangles that travel vertically along a shaft;
// stops are horizontal rungs with waiting-rider dots. Each line gets a lane;
// when multiple cars share a line, the lane splits into sub-columns so every
// car is individually visible instead of stacking on top of each other.

interface Scale {
  padding: number;
  carW: number;
  carH: number;
  labelW: number;
  dotsW: number;
  fontMain: number;
  fontSmall: number;
  stopDotR: number;
  carDotR: number;
}

// Smoothly interpolate render constants across canvas widths so the diagram
// stays legible from ~320px phones to wide desktops without abrupt breakpoints.
function scaleFor(width: number): Scale {
  const t = Math.max(0, Math.min(1, (width - 320) / (900 - 320)));
  const lerp = (a: number, b: number): number => a + (b - a) * t;
  return {
    padding: lerp(10, 24),
    carW: lerp(22, 34),
    carH: lerp(18, 26),
    labelW: lerp(44, 70),
    dotsW: lerp(26, 44),
    fontMain: lerp(10, 12),
    fontSmall: lerp(9, 10),
    stopDotR: lerp(2.3, 2.8),
    carDotR: lerp(1.8, 2.3),
  };
}

const PHASE_COLORS: Record<Car["phase"], string> = {
  idle: "#5d6271",
  moving: "#06c2b5",
  repositioning: "#a78bfa",
  "door-opening": "#fbbf24",
  loading: "#7dd3fc",
  "door-closing": "#fbbf24",
  stopped: "#8b90a0",
  unknown: "#5d6271",
};

const STOP_LINE = "#1f2431";
const STOP_LABEL = "#c8ccd6";
const DOT_COLOR = "#7dd3fc";
const DOT_OVER = "#fbbf24";
const CAR_DOT_COLOR = "#f5f6f9";
const OVERFLOW_COLOR = "#8b90a0";

export class CanvasRenderer {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #dpr: number;
  #onResize: () => void;
  // Cached scale — only recomputed when clientWidth changes.
  #cachedScale: Scale | null = null;
  #cachedScaleWidth = -1;
  // Reused map so byLine doesn't allocate a new Map on every draw call.
  #byLine: Map<number, Car[]> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.#ctx = ctx;
    this.#dpr = window.devicePixelRatio || 1;
    this.#resize();
    this.#onResize = (): void => this.#resize();
    window.addEventListener("resize", this.#onResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.#onResize);
  }

  #resize(): void {
    const { clientWidth, clientHeight } = this.#canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    const targetW = clientWidth * this.#dpr;
    const targetH = clientHeight * this.#dpr;
    if (this.#canvas.width !== targetW || this.#canvas.height !== targetH) {
      this.#canvas.width = targetW;
      this.#canvas.height = targetH;
    }
    this.#ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
  }

  draw(snap: Snapshot): void {
    // Resize-on-draw so the canvas picks up layout that wasn't ready at
    // construction time (compare-mode toggle, hidden → visible, etc.).
    this.#resize();
    const { clientWidth: w, clientHeight: h } = this.#canvas;
    this.#ctx.clearRect(0, 0, w, h);
    if (snap.stops.length === 0 || w === 0 || h === 0) return;

    // Only recompute the scale when the canvas width changes.
    if (w !== this.#cachedScaleWidth) {
      this.#cachedScale = scaleFor(w);
      this.#cachedScaleWidth = w;
    }
    const s = this.#cachedScale!;

    // Vertical axis derived from stop positions — plain loop avoids spreading
    // the stops array into Math.min/max argument positions.
    let minY = snap.stops[0].y;
    let maxY = snap.stops[0].y;
    for (let i = 1; i < snap.stops.length; i++) {
      const y = snap.stops[i].y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const axisMin = minY - 1;
    const axisMax = maxY + 1;
    const yRange = Math.max(axisMax - axisMin, 0.0001);
    const toScreenY = (y: number): number =>
      h - s.padding - ((y - axisMin) / yRange) * (h - 2 * s.padding);

    // Group cars by line — reuse the Map to avoid per-frame allocation.
    // Clear values from the previous frame first.
    const byLine = this.#byLine;
    byLine.forEach((arr) => (arr.length = 0));
    for (const car of snap.cars) {
      const arr = byLine.get(car.line);
      if (arr) {
        arr.push(car);
      } else {
        byLine.set(car.line, [car]);
      }
    }
    const lineIds = [...byLine.keys()].sort((a, b) => a - b);

    const gutter = s.padding + s.labelW + s.dotsW + 6;
    const lanesRegionW = Math.max(0, w - gutter - s.padding);

    // Total visual shafts across all lines (cars-per-line collapsed to >=1).
    const totalShafts = lineIds.reduce((n, id) => n + (byLine.get(id)?.length ?? 1), 0);
    const shaftW = lanesRegionW / Math.max(totalShafts, 1);

    this.#drawStops(snap, toScreenY, s, gutter);

    // Walk each line, assigning its cars to consecutive sub-columns.
    let shaftIdx = 0;
    for (const lineId of lineIds) {
      const cars = byLine.get(lineId) ?? [];
      for (const car of cars) {
        const cx = gutter + shaftW * (shaftIdx + 0.5);
        this.#drawShaft(cx, h, s);
        this.#drawCar(car, cx, toScreenY, s);
        shaftIdx++;
      }
    }
  }

  #drawStops(
    snap: Snapshot,
    toScreenY: (y: number) => number,
    s: Scale,
    gutter: number,
  ): void {
    const ctx = this.#ctx;
    ctx.font = `${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";

    const labelX = s.padding;
    const dotsX = s.padding + s.labelW + 4;
    const canvasRightPad = this.#canvas.clientWidth - s.padding;

    for (const stop of snap.stops) {
      const y = toScreenY(stop.y);

      // Row separator across the lanes region only (keep the label/dots column clean).
      ctx.strokeStyle = STOP_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gutter, y);
      ctx.lineTo(canvasRightPad, y);
      ctx.stroke();

      // Stop name — truncated to fit labelW.
      ctx.fillStyle = STOP_LABEL;
      ctx.textAlign = "left";
      ctx.fillText(truncate(ctx, stop.name, s.labelW - 2), labelX, y);

      // Waiting-rider dots to the right of the label.
      if (stop.waiting > 0) {
        drawDotsHorizontal(
          ctx,
          dotsX,
          y,
          s.dotsW,
          s.stopDotR,
          stop.waiting,
          stop.waiting > 5 ? DOT_OVER : DOT_COLOR,
          s.fontSmall,
        );
      }
    }
  }

  #drawShaft(cx: number, h: number, s: Scale): void {
    const ctx = this.#ctx;
    const grad = ctx.createLinearGradient(cx, s.padding, cx, h - s.padding);
    grad.addColorStop(0, "rgba(39, 45, 58, 0)");
    grad.addColorStop(0.5, "rgba(39, 45, 58, 0.9)");
    grad.addColorStop(1, "rgba(39, 45, 58, 0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, s.padding);
    ctx.lineTo(cx, h - s.padding);
    ctx.stroke();
  }

  #drawCar(car: Car, cx: number, toScreenY: (y: number) => number, s: Scale): void {
    const ctx = this.#ctx;
    const cy = toScreenY(car.y);
    const halfW = s.carW / 2;
    const halfH = s.carH / 2;
    const base = PHASE_COLORS[car.phase] ?? "#5d6271";

    // Gradient body — top highlight fading to a darker bottom edge gives the
    // car a subtle sense of volume without any additional draw calls.
    const grad = ctx.createLinearGradient(cx, cy - halfH, cx, cy + halfH);
    grad.addColorStop(0, shade(base, 0.14));
    grad.addColorStop(1, shade(base, -0.18));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - halfW, cy - halfH, s.carW, s.carH);
    ctx.strokeStyle = "rgba(10, 12, 16, 0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - halfW + 0.5, cy - halfH + 0.5, s.carW - 1, s.carH - 1);

    // Capacity fill: a dark bar proportional to load at the bottom of the car.
    const frac = car.capacity > 0 ? Math.min(car.load / car.capacity, 1) : 0;
    if (frac > 0) {
      const innerH = (s.carH - 4) * frac;
      ctx.fillStyle = "rgba(10, 12, 16, 0.35)";
      ctx.fillRect(cx - halfW + 2, cy + halfH - 2 - innerH, s.carW - 4, innerH);
    }

    // Rider dots inside the car. Grid that adapts to car size.
    if (car.riders > 0) {
      drawRiderDotsInCar(ctx, cx, cy, s.carW, s.carH, s.carDotR, car.riders, s.fontSmall);
    }
  }

  get canvas(): HTMLCanvasElement {
    return this.#canvas;
  }
}

/** Draw up to `capN` dots horizontally; anything beyond shows as `+N`. */
function drawDotsHorizontal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  r: number,
  count: number,
  color: string,
  fontSize: number,
): void {
  const stride = r * 2 + 1.5;
  const capN = Math.max(1, Math.floor((maxW - 10) / stride));
  const visible = Math.min(count, capN);
  ctx.fillStyle = color;
  for (let i = 0; i < visible; i++) {
    const cx = x + r + i * stride;
    ctx.beginPath();
    ctx.arc(cx, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (count > visible) {
    ctx.fillStyle = OVERFLOW_COLOR;
    ctx.font = `${fontSize.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${count - visible}`, x + r + visible * stride, y);
  }
}

/** Render rider dots inside the car in a small grid, with +N overflow. */
function drawRiderDotsInCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  carW: number,
  carH: number,
  r: number,
  count: number,
  fontSize: number,
): void {
  const padX = 3;
  const padY = 3;
  const innerW = carW - padX * 2;
  const innerH = carH - padY * 2;
  const stride = r * 2 + 1.2;
  const cols = Math.max(1, Math.floor(innerW / stride));
  const rows = Math.max(1, Math.floor(innerH / stride));
  const capN = cols * rows;
  const visible = Math.min(count, capN);
  const overflow = count - visible;

  const startX = cx - carW / 2 + padX + r;
  const startY = cy - carH / 2 + padY + r;

  ctx.fillStyle = CAR_DOT_COLOR;
  // Reserve the last slot for the "+N" overflow label when we'd otherwise
  // run out of room; otherwise draw every rider as a dot.
  const drawable = overflow > 0 ? visible - 1 : visible;
  for (let i = 0; i < drawable; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * stride;
    const y = startY + row * stride;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (overflow > 0) {
    ctx.fillStyle = OVERFLOW_COLOR;
    ctx.font = `${fontSize.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const slot = drawable;
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = startX + col * stride;
    const y = startY + row * stride;
    // "+N" where N is the total number of riders the slot stands in for —
    // matches drawDotsHorizontal's `count - visible` convention.
    ctx.fillText(`+${count - drawable}`, x, y);
  }
}

/** Lighten (`amount > 0`) or darken (`amount < 0`) a hex color by a fraction [-1, 1]. */
function shade(hex: string, amount: number): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const f = (c: number): number =>
    amount >= 0 ? Math.round(c + (255 - c) * amount) : Math.round(c * (1 + amount));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/** Truncate `text` to fit `maxWidth` px, appending "…" if needed. */
function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "\u2026";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? ellipsis : text.slice(0, lo) + ellipsis;
}
