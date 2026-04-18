import type { Car, Snapshot, Stop } from "./types";

// 2-D renderer. Each stop is a horizontal rung with two direction columns
// (▲ up / ▼ down) showing waiting riders partitioned by route direction.
// Cars are rectangles travelling vertically; each line gets a lane, and
// when multiple cars share a line the lane splits into sub-columns so every
// car is individually visible. Cars carry a target-marker on their planned
// destination stop and a brief motion trail while moving. Board/alight
// flying-dot animations tween between the queue column and the car at
// loading time. A muted avg-wait sparkline absorbs into the bottom of the
// canvas below the lowest stop.

interface Scale {
  padX: number;
  padTop: number;
  padBottom: number;
  sparkH: number;
  labelW: number;
  upColW: number;
  dnColW: number;
  gutterGap: number;
  carW: number;
  carH: number;
  fontMain: number;
  fontSmall: number;
  stopDotR: number;
  carDotR: number;
  dirDotR: number;
}

// Smoothly interpolate render constants across canvas widths so the diagram
// stays legible from ~320px phones to wide desktops without abrupt breakpoints.
function scaleFor(width: number): Scale {
  const t = Math.max(0, Math.min(1, (width - 320) / (900 - 320)));
  const lerp = (a: number, b: number): number => a + (b - a) * t;
  return {
    padX: lerp(8, 18),
    padTop: lerp(8, 14),
    padBottom: lerp(30, 38),
    sparkH: lerp(18, 22),
    labelW: lerp(40, 56),
    upColW: lerp(20, 28),
    dnColW: lerp(20, 28),
    gutterGap: 4,
    carW: lerp(26, 40),
    carH: lerp(20, 30),
    fontMain: lerp(10, 12),
    fontSmall: lerp(9, 10),
    stopDotR: lerp(2.2, 2.6),
    carDotR: lerp(1.8, 2.3),
    dirDotR: lerp(2.0, 2.4),
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
const UP_COLOR = "#7dd3fc";
const DOWN_COLOR = "#c4b5fd";
const CAR_DOT_COLOR = "#f5f6f9";
const OVERFLOW_COLOR = "#8b90a0";
const SPARK_LINE = "#2e3445";
const SPARK_TEXT = "#5d6271";
const TARGET_RING = "rgba(6, 194, 181, 0.55)";

// Board/alight animation baseline. Effective duration is divided by the sim
// speed multiplier so fast-forwarded runs don't queue stale tweens.
const TWEEN_BASE_MS = 260;

// Cars in `moving` phase leave a short fading ghost strip behind them so
// velocity is visible at a glance without a text indicator.
const TRAIL_STEPS = 3;
const TRAIL_DT = 0.05; // seconds of motion per ghost step

/** One-shot board/alight animation tween. */
interface Tween {
  kind: "board" | "alight";
  bornAt: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

/** Per-car frame-to-frame memory used to detect board/alight transitions. */
interface CarState {
  riders: number;
}

/**
 * Compute a curved-arc position along a tween at progress `t` (0..1).
 * The control point is offset perpendicular to the (start→end) segment so
 * dots arc above or below the straight path — "above" for left-to-right
 * motion, which reads as a small airlock lift.
 */
function arcPoint(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  t: number,
): [number, number] {
  const mx = (startX + endX) / 2;
  const my = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.max(Math.hypot(dx, dy), 1);
  // Perpendicular offset (-dy, dx) normalized, scaled by a fraction of length.
  const perpX = -dy / len;
  const perpY = dx / len;
  const arc = Math.min(len * 0.25, 22);
  const cx = mx + perpX * arc;
  const cy = my + perpY * arc;
  // Quadratic bezier at `t`.
  const u = 1 - t;
  return [u * u * startX + 2 * u * t * cx + t * t * endX, u * u * startY + 2 * u * t * cy + t * t * endY];
}

/** Cubic-bezier(0.2, 0.6, 0.2, 1) evaluated at x → y, good-enough via Newton. */
function easeOutNorm(tx: number): number {
  // Approximation: two-iteration Newton solver on the x curve, then evaluate y.
  // Accurate to ~1% for our purposes; much cheaper than a full lookup.
  const cx1 = 0.2;
  const cx2 = 0.2;
  const cy1 = 0.6;
  const cy2 = 1.0;
  let t = tx;
  for (let i = 0; i < 3; i++) {
    const u = 1 - t;
    const x = 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t;
    const dx = 3 * u * u * cx1 + 6 * u * t * (cx2 - cx1) + 3 * t * t * (1 - cx2);
    if (dx === 0) break;
    t -= (x - tx) / dx;
    t = Math.max(0, Math.min(1, t));
  }
  const u = 1 - t;
  return 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t;
}

export class CanvasRenderer {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #dpr: number;
  #onResize: () => void;
  #cachedScale: Scale | null = null;
  #cachedScaleWidth = -1;
  #byLine: Map<number, Car[]> = new Map();

  #accent: string;
  #carStates: Map<number, CarState> = new Map();
  #tweens: Tween[] = [];
  #sparkLabel: string;

  constructor(canvas: HTMLCanvasElement, accent: string, sparkLabel = "Avg wait (s)") {
    this.#canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.#ctx = ctx;
    this.#dpr = window.devicePixelRatio || 1;
    this.#accent = accent;
    this.#sparkLabel = sparkLabel;
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

  draw(snap: Snapshot, waitHistory: number[], speedMultiplier: number): void {
    this.#resize();
    const { clientWidth: w, clientHeight: h } = this.#canvas;
    this.#ctx.clearRect(0, 0, w, h);
    if (snap.stops.length === 0 || w === 0 || h === 0) return;

    if (w !== this.#cachedScaleWidth) {
      this.#cachedScale = scaleFor(w);
      this.#cachedScaleWidth = w;
    }
    const s = this.#cachedScale!;

    // Vertical axis — reserve sparkline strip at the bottom so stops never
    // overlap the sparkline, regardless of scenario.
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
    const stopsBottom = h - s.padBottom;
    const stopsTop = s.padTop;
    const toScreenY = (y: number): number =>
      stopsBottom - ((y - axisMin) / yRange) * (stopsBottom - stopsTop);

    // Group cars by line; lanes are shared sub-columns within a line.
    const byLine = this.#byLine;
    byLine.forEach((arr) => (arr.length = 0));
    for (const car of snap.cars) {
      const arr = byLine.get(car.line);
      if (arr) arr.push(car);
      else byLine.set(car.line, [car]);
    }
    const lineIds = [...byLine.keys()].sort((a, b) => a - b);

    const gutter = s.padX + s.labelW + s.upColW + s.dnColW + s.gutterGap;
    const lanesRegionW = Math.max(0, w - gutter - s.padX);
    const totalShafts = lineIds.reduce((n, id) => n + (byLine.get(id)?.length ?? 1), 0);
    const shaftW = lanesRegionW / Math.max(totalShafts, 1);

    // Resolve each car's screen x once so every pass (shaft/car/target/trail)
    // reads from the same column assignment.
    const carX = new Map<number, number>();
    let shaftIdx = 0;
    for (const lineId of lineIds) {
      const cars = byLine.get(lineId) ?? [];
      for (const car of cars) {
        carX.set(car.id, gutter + shaftW * (shaftIdx + 0.5));
        shaftIdx++;
      }
    }

    // Stop-entity → index lookup used by target-marker and animation code.
    const stopIdxById = new Map<number, number>();
    snap.stops.forEach((st, i) => stopIdxById.set(st.entity_id, i));

    this.#drawStops(snap, toScreenY, s);
    this.#drawTargetMarkers(snap, carX, toScreenY, s, stopIdxById);

    // Shafts behind cars so trails/cars sit on top.
    for (const [carId, cx] of carX) {
      this.#drawShaft(cx, stopsTop, stopsBottom, s);
      const car = snap.cars.find((c) => c.id === carId);
      if (!car) continue;
      this.#drawCarTrail(car, cx, toScreenY, s);
      this.#drawCar(car, cx, toScreenY, s);
    }

    // Detect board/alight transitions and queue tweens before drawing them so
    // the first frame of motion is visible instead of a one-frame lag.
    this.#computeTweens(snap, carX, toScreenY, s, speedMultiplier);
    this.#drawTweens(s);

    this.#drawSparkline(waitHistory, w, h, s);
  }

  // ── Stops, labels, direction queues ───────────────────────────────

  #drawStops(
    snap: Snapshot,
    toScreenY: (y: number) => number,
    s: Scale,
  ): void {
    const ctx = this.#ctx;
    ctx.font = `${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";

    const labelX = s.padX;
    const upX = s.padX + s.labelW;
    const dnX = upX + s.upColW;
    const gutter = dnX + s.dnColW + s.gutterGap;
    const canvasRightPad = this.#canvas.clientWidth - s.padX;

    for (const stop of snap.stops) {
      const y = toScreenY(stop.y);

      ctx.strokeStyle = STOP_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gutter, y);
      ctx.lineTo(canvasRightPad, y);
      ctx.stroke();

      ctx.fillStyle = STOP_LABEL;
      ctx.textAlign = "left";
      ctx.fillText(truncate(ctx, stop.name, s.labelW - 2), labelX, y);

      if (stop.waiting_up > 0) {
        drawDirectionDots(ctx, upX, y, s.upColW, s.dirDotR, stop.waiting_up, UP_COLOR, s.fontSmall);
      }
      if (stop.waiting_down > 0) {
        drawDirectionDots(
          ctx,
          dnX,
          y,
          s.dnColW,
          s.dirDotR,
          stop.waiting_down,
          DOWN_COLOR,
          s.fontSmall,
        );
      }
    }
  }

  // ── Shafts, cars, trails, target markers ──────────────────────────

  #drawShaft(cx: number, top: number, bottom: number, _s: Scale): void {
    const ctx = this.#ctx;
    const grad = ctx.createLinearGradient(cx, top, cx, bottom);
    grad.addColorStop(0, "rgba(39, 45, 58, 0)");
    grad.addColorStop(0.5, "rgba(39, 45, 58, 0.9)");
    grad.addColorStop(1, "rgba(39, 45, 58, 0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.lineTo(cx, bottom);
    ctx.stroke();
  }

  #drawTargetMarkers(
    snap: Snapshot,
    carX: Map<number, number>,
    toScreenY: (y: number) => number,
    s: Scale,
    stopIdxById: Map<number, number>,
  ): void {
    const ctx = this.#ctx;
    for (const car of snap.cars) {
      if (car.target == null) continue;
      const idx = stopIdxById.get(car.target);
      if (idx == null) continue;
      const stop = snap.stops[idx];
      const cx = carX.get(car.id);
      if (cx == null) continue;
      const cy = toScreenY(stop.y);
      // Outer ring (soft accent) + inner dot. Carries strategy intent: a
      // ring on a stop means "this car is committed to going there".
      ctx.strokeStyle = TARGET_RING;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, s.carDotR * 3.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(6, 194, 181, 0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, s.carDotR * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #drawCarTrail(
    car: Car,
    cx: number,
    toScreenY: (y: number) => number,
    s: Scale,
  ): void {
    if (car.phase !== "moving" || Math.abs(car.v) < 0.1) return;
    const ctx = this.#ctx;
    const base = PHASE_COLORS[car.phase];
    const halfW = s.carW / 2;
    const halfH = s.carH / 2;
    for (let i = 1; i <= TRAIL_STEPS; i++) {
      // Ghost position trails behind the car in the direction of motion.
      const behindY = toScreenY(car.y - car.v * TRAIL_DT * i);
      const alpha = 0.18 * (1 - (i - 1) / TRAIL_STEPS);
      ctx.fillStyle = hexWithAlpha(base, alpha);
      ctx.fillRect(cx - halfW, behindY - halfH, s.carW, s.carH);
    }
  }

  #drawCar(car: Car, cx: number, toScreenY: (y: number) => number, s: Scale): void {
    const ctx = this.#ctx;
    const cy = toScreenY(car.y);
    const halfW = s.carW / 2;
    const halfH = s.carH / 2;
    const base = PHASE_COLORS[car.phase] ?? "#5d6271";

    const grad = ctx.createLinearGradient(cx, cy - halfH, cx, cy + halfH);
    grad.addColorStop(0, shade(base, 0.14));
    grad.addColorStop(1, shade(base, -0.18));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - halfW, cy - halfH, s.carW, s.carH);
    ctx.strokeStyle = "rgba(10, 12, 16, 0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - halfW + 0.5, cy - halfH + 0.5, s.carW - 1, s.carH - 1);

    const frac = car.capacity > 0 ? Math.min(car.load / car.capacity, 1) : 0;
    if (frac > 0) {
      const innerH = (s.carH - 4) * frac;
      ctx.fillStyle = "rgba(10, 12, 16, 0.35)";
      ctx.fillRect(cx - halfW + 2, cy + halfH - 2 - innerH, s.carW - 4, innerH);
    }

    if (car.riders > 0) {
      drawRiderDotsInCar(ctx, cx, cy, s.carW, s.carH, s.carDotR, car.riders, s.fontSmall);
    }
  }

  // ── Flying-dot animations ─────────────────────────────────────────

  #computeTweens(
    snap: Snapshot,
    carX: Map<number, number>,
    toScreenY: (y: number) => number,
    s: Scale,
    speedMultiplier: number,
  ): void {
    const now = performance.now();
    const scale = Math.max(1, speedMultiplier);
    const duration = TWEEN_BASE_MS / scale;
    // Stagger spacing shrinks with speed so 16× runs don't pile up decades-long
    // tween tails that outlive the phase they came from.
    const stagger = 30 / scale;
    const upX = s.padX + s.labelW;
    const dnX = upX + s.upColW;

    for (const car of snap.cars) {
      const prev = this.#carStates.get(car.id);
      const riders = car.riders;
      const phase = car.phase;
      const cx = carX.get(car.id);

      // Find the nearest stop to this car's y — useful when `loading` to
      // know which stop rung the rider exchange is happening at.
      let nearestIdx: number | null = null;
      let nearestDist = Infinity;
      for (let i = 0; i < snap.stops.length; i++) {
        const d = Math.abs(snap.stops[i].y - car.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      const stopIdx = phase === "loading" && nearestDist < 0.5 ? nearestIdx : null;

      if (prev && cx != null) {
        const delta = riders - prev.riders;
        // Loading phase: rider count diffs correspond to board/alight at the
        // stop we're parked at. A mixed frame (some boarded + some alighted)
        // shows only the net — tolerable approximation for animation.
        if (stopIdx != null && delta !== 0) {
          const stop = snap.stops[stopIdx];
          const stopY = toScreenY(stop.y);
          const carY = toScreenY(car.y);
          const count = Math.min(Math.abs(delta), 6);

          if (delta > 0) {
            // Board: prefer the heavier direction column as the origin. If
            // both queues are empty (already-boarded at this frame), fall
            // back to a midpoint between them.
            const useUp = stop.waiting_up >= stop.waiting_down;
            const originX = useUp ? upX + s.upColW / 2 : dnX + s.dnColW / 2;
            const color = useUp ? UP_COLOR : DOWN_COLOR;
            for (let k = 0; k < count; k++) {
              this.#tweens.push({
                kind: "board",
                bornAt: now + k * stagger,
                duration,
                startX: originX,
                startY: stopY,
                endX: cx,
                endY: carY,
                color,
              });
            }
          } else {
            // Alight: fade from the car, drifting outward toward the gutter
            // so exits read as "leaving the building".
            for (let k = 0; k < count; k++) {
              this.#tweens.push({
                kind: "alight",
                bornAt: now + k * stagger,
                duration,
                startX: cx,
                startY: carY,
                endX: cx + 18,
                endY: carY + 10,
                color: CAR_DOT_COLOR,
              });
            }
          }
        }
      }

      this.#carStates.set(car.id, { riders });
    }

    // Reap completed tweens. Walk in reverse so splice indices stay valid.
    for (let i = this.#tweens.length - 1; i >= 0; i--) {
      const t = this.#tweens[i];
      if (now - t.bornAt > t.duration) this.#tweens.splice(i, 1);
    }
  }

  #drawTweens(s: Scale): void {
    const now = performance.now();
    const ctx = this.#ctx;
    for (const t of this.#tweens) {
      const age = now - t.bornAt;
      if (age < 0) continue; // staggered tweens start a few ms apart
      const tx = Math.min(1, Math.max(0, age / t.duration));
      const eased = easeOutNorm(tx);
      const [x, y] =
        t.kind === "board"
          ? arcPoint(t.startX, t.startY, t.endX, t.endY, eased)
          : [
              t.startX + (t.endX - t.startX) * eased,
              t.startY + (t.endY - t.startY) * eased,
            ];
      const alpha = t.kind === "alight" ? 1 - eased : 0.9;
      ctx.fillStyle = hexWithAlpha(t.color, alpha);
      ctx.beginPath();
      ctx.arc(x, y, s.carDotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Sparkline overlay ─────────────────────────────────────────────

  #drawSparkline(series: number[], w: number, h: number, s: Scale): void {
    const ctx = this.#ctx;
    const top = h - s.padBottom + (s.padBottom - s.sparkH) / 2;
    const bottom = top + s.sparkH;
    const left = s.padX;
    const right = w - s.padX;
    const innerW = Math.max(right - left, 1);

    // Label on the left; current value on the right, tabular.
    ctx.font = `${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = SPARK_TEXT;
    ctx.textAlign = "left";
    ctx.fillText(this.#sparkLabel, left, top - 1);

    if (series.length === 0) return;

    const latest = series[series.length - 1];
    ctx.fillStyle = STOP_LABEL;
    ctx.textAlign = "right";
    ctx.fillText(latest.toFixed(1), right, top - 1);

    if (series.length < 2) return;

    const max = Math.max(1, ...series);
    const xStep = innerW / Math.max(series.length - 1, 1);
    const toY = (v: number): number => bottom - (v / max) * (bottom - top);

    // Baseline so the sparkline remains legible against the shaft gradient
    // even when values are zero.
    ctx.strokeStyle = SPARK_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    ctx.strokeStyle = this.#accent;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const x = left + i * xStep;
      const y = toY(series[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  get canvas(): HTMLCanvasElement {
    return this.#canvas;
  }
}

/** Draw a single-direction queue column; vertically centered on `y`, max `maxW` wide. */
function drawDirectionDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  r: number,
  count: number,
  color: string,
  fontSize: number,
): void {
  const stride = r * 2 + 1.2;
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

/** `#rrggbb` → `rgba(r, g, b, a)`, no-op on other color forms. */
function hexWithAlpha(color: string, alpha: number): string {
  const m = color.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

// Internal re-export so TS doesn't mark `Stop` as unused if the module is
// imported for type completion elsewhere.
export type { Stop };
