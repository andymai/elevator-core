import type { Car, CarBubble, Snapshot, Stop } from "./types";

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
    padTop: lerp(20, 26),
    padBottom: lerp(30, 38),
    sparkH: lerp(18, 22),
    // Fits "Floor 12" at 12px font without the truncate() ellipsis kicking in,
    // plus breathing room in compare mode where the pane is narrower.
    labelW: lerp(44, 68),
    upColW: lerp(20, 28),
    dnColW: lerp(20, 28),
    gutterGap: 4,
    carW: lerp(26, 40),
    carH: lerp(20, 30),
    fontMain: lerp(10, 12),
    fontSmall: lerp(9, 10),
    stopDotR: lerp(2.2, 2.6),
    carDotR: lerp(1.8, 2.3),
    dirDotR: lerp(2.2, 2.6),
  };
}

// Palette mirrors style.css primitives. Canvas rendering can't read CSS
// custom properties cheaply in a hot loop, so these are JS constants that
// track the CSS tokens. Keep in sync with `:root` in src/style.css.
const PHASE_COLORS: Record<Car["phase"], string> = {
  idle: "#6b6b75",          // --text-disabled
  moving: "#f59e0b",        // --accent
  repositioning: "#a78bfa", // violet — no CSS token; phase-specific hue
  "door-opening": "#fbbf24", // --accent-up
  loading: "#7dd3fc",       // --pane-a
  "door-closing": "#fbbf24", // --accent-up
  stopped: "#8b8c92",       // --text-tertiary
  unknown: "#6b6b75",       // --text-disabled
};

const STOP_LINE = "#2a2a35";   // --border-subtle
const STOP_LABEL = "#a1a1aa";  // --text-secondary
// Up and down use distinct hue families so direction is legible at small
// dot sizes. Cool blue reads as "up" (sky / lift), rose as "down" (gravity).
// Rose chosen over amber since amber now owns the brand accent.
const UP_COLOR = "#7dd3fc";    // --pane-a
const DOWN_COLOR = "#fda4af";  // --pane-b
const CAR_DOT_COLOR = "#fafafa"; // --text-primary
const OVERFLOW_COLOR = "#8b8c92"; // --text-tertiary
const SPARK_LINE = "#3a3a45";   // --border-default
const SPARK_TEXT = "#8b8c92";   // --text-tertiary
const TARGET_RING = "rgba(245, 158, 11, 0.85)"; // --accent at α
const TARGET_FILL = "rgba(245, 158, 11, 0.95)"; // --accent at α

// Board/alight animation baseline. Effective duration is divided by the sim
// speed multiplier so fast-forwarded runs don't queue stale tweens.
const TWEEN_BASE_MS = 260;

// Cars in `moving` phase leave a short fading ghost strip behind them so
// velocity is visible at a glance without a text indicator.
const TRAIL_STEPS = 3;
const TRAIL_DT = 0.05; // seconds of motion per ghost step

// Per-shaft width is capped so single-car scenarios don't stretch one tiny
// car across the whole canvas. The lane region centers when the cap binds.
const SHAFT_CAP = 160;

/** One-shot animation tween — board into a car, alight out, or abandon the queue. */
interface Tween {
  kind: "board" | "alight" | "abandon";
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

/** Per-stop frame-to-frame memory used to detect abandonment — a drop in
 *  the stop's waiting count *not* explained by a board at that stop. */
interface StopState {
  waiting: number;
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
  #dpr: number = window.devicePixelRatio || 1;
  #onResize: () => void;
  #cachedScale: Scale | null = null;
  #cachedScaleWidth = -1;
  #byLine: Map<number, Car[]> = new Map();

  #accent: string;
  #carStates: Map<number, CarState> = new Map();
  #stopStates: Map<number, StopState> = new Map();
  #tweens: Tween[] = [];
  #sparkLabel: string;

  constructor(canvas: HTMLCanvasElement, accent: string, sparkLabel = "Avg wait (s)") {
    this.#canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.#ctx = ctx;
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
    // Re-read DPR each resize so browser zoom / moving to a different-density
    // display updates the backing-store scale. `resize` fires on both.
    this.#dpr = window.devicePixelRatio || 1;
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

  draw(
    snap: Snapshot,
    waitHistory: number[],
    speedMultiplier: number,
    bubbles?: Map<number, CarBubble>,
  ): void {
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
    // Cap per-shaft width so sparse scenarios (1-2 cars on a wide canvas)
    // don't bury tiny cars in a seas of empty shaft. When the cap binds,
    // center the used region inside the available room.
    const naturalShaftW = lanesRegionW / Math.max(totalShafts, 1);
    const shaftW = Math.min(naturalShaftW, SHAFT_CAP);
    const lanesUsedW = shaftW * totalShafts;
    const laneOffset = Math.max(0, (lanesRegionW - lanesUsedW) / 2);
    const lanesLeft = gutter + laneOffset;
    const lanesRight = lanesLeft + lanesUsedW;

    // Resolve each car's screen x once so every pass (shaft/car/target/trail)
    // reads from the same column assignment.
    const carX = new Map<number, number>();
    let shaftIdx = 0;
    for (const lineId of lineIds) {
      const cars = byLine.get(lineId) ?? [];
      for (const car of cars) {
        carX.set(car.id, lanesLeft + shaftW * (shaftIdx + 0.5));
        shaftIdx++;
      }
    }

    // Stop-entity → index lookup used by target-marker and animation code.
    const stopIdxById = new Map<number, number>();
    snap.stops.forEach((st, i) => stopIdxById.set(st.entity_id, i));

    this.#drawDirectionHeaders(s);
    this.#drawStops(snap, toScreenY, s, lanesLeft, lanesRight);
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

    if (bubbles && bubbles.size > 0) {
      this.#drawBubbles(snap, carX, toScreenY, s, bubbles, w);
    }

    this.#drawSparkline(waitHistory, w, h, s);
  }

  /**
   * Draw a small rounded speech-bubble with a tail pointing to each
   * car that has a fresh action. Bubbles render on top of cars and
   * tweens so narration stays legible.
   *
   * Placement rules:
   * - Prefer the right side of the car; flip to the left when the
   *   bubble would clip the canvas edge (common in compare mode).
   * - Vertically center on the car; no jitter even when the car
   *   moves, so the bubble reads steadily during motion.
   */
  #drawBubbles(
    snap: Snapshot,
    carX: Map<number, number>,
    toScreenY: (y: number) => number,
    s: Scale,
    bubbles: Map<number, CarBubble>,
    canvasWidth: number,
  ): void {
    const ctx = this.#ctx;
    const padX = 7;
    const padY = 4;
    const tailW = 5;
    const tailH = 4;
    const radius = 6;
    const font = `600 ${s.fontSmall + 0.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.font = font;
    ctx.textBaseline = "middle";
    // Fade the last FADE_FRAC of the bubble's lifetime so dismissal
    // feels soft rather than binary. Kept at 30 % so the message still
    // reads crisply for most of its dwell.
    const FADE_FRAC = 0.3;
    const now = performance.now();
    const strokeBase = this.#accent;

    for (const car of snap.cars) {
      const bubble = bubbles.get(car.id);
      if (!bubble) continue;
      const cx = carX.get(car.id);
      if (cx === undefined) continue;
      const cy = toScreenY(car.y);

      const ttl = Math.max(1, bubble.expiresAt - bubble.bornAt);
      const remaining = bubble.expiresAt - now;
      const alpha =
        remaining > ttl * FADE_FRAC ? 1 : Math.max(0, remaining / (ttl * FADE_FRAC));
      if (alpha <= 0) continue;

      const textW = ctx.measureText(bubble.text).width;
      const bubbleW = textW + padX * 2;
      const bubbleH = s.fontSmall + padY * 2 + 2;

      // Tail side: prefer right; flip when the bubble would overflow
      // the canvas. In compare mode the right pane's canvas is
      // narrow enough that the right-side default would clip.
      const halfCar = s.carW / 2;
      const rightEdge = cx + halfCar + tailW + bubbleW + 2;
      const side: "left" | "right" = rightEdge > canvasWidth - 2 ? "left" : "right";

      const bx =
        side === "right" ? cx + halfCar + tailW : cx - halfCar - tailW - bubbleW;
      const by = cy - bubbleH / 2;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Soft pane-accent glow beneath the bubble, so the bubble reads
      // as belonging to its pane even at a glance.
      ctx.shadowColor = strokeBase;
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(16, 19, 26, 0.94)";
      roundedRect(ctx, bx, by, bubbleW, bubbleH, radius);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pane-accent border.
      ctx.strokeStyle = withAlpha(strokeBase, 0.65);
      ctx.lineWidth = 1;
      roundedRect(ctx, bx, by, bubbleW, bubbleH, radius);
      ctx.stroke();

      // Tail — small triangle pointing at the car.
      ctx.beginPath();
      if (side === "right") {
        ctx.moveTo(bx, cy - tailH / 2);
        ctx.lineTo(bx - tailW, cy);
        ctx.lineTo(bx, cy + tailH / 2);
      } else {
        ctx.moveTo(bx + bubbleW, cy - tailH / 2);
        ctx.lineTo(bx + bubbleW + tailW, cy);
        ctx.lineTo(bx + bubbleW, cy + tailH / 2);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 19, 26, 0.94)";
      ctx.fill();
      ctx.stroke();

      // Text.
      ctx.fillStyle = "#f0f3fb";
      ctx.fillText(bubble.text, bx + padX, cy);

      ctx.restore();
    }
  }

  // ── Stops, labels, direction queues ───────────────────────────────

  #drawDirectionHeaders(s: Scale): void {
    const ctx = this.#ctx;
    const upX = s.padX + s.labelW + s.upColW / 2;
    const dnX = s.padX + s.labelW + s.upColW + s.dnColW / 2;
    const y = s.padTop / 2 + 1;
    ctx.font = `${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = UP_COLOR;
    ctx.fillText("\u25b2", upX, y);
    ctx.fillStyle = DOWN_COLOR;
    ctx.fillText("\u25bc", dnX, y);
  }

  #drawStops(
    snap: Snapshot,
    toScreenY: (y: number) => number,
    s: Scale,
    lanesLeft: number,
    lanesRight: number,
  ): void {
    const ctx = this.#ctx;
    ctx.font = `${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";

    const labelX = s.padX;
    const upX = s.padX + s.labelW;
    const dnX = upX + s.upColW;

    for (const stop of snap.stops) {
      const y = toScreenY(stop.y);

      ctx.strokeStyle = STOP_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lanesLeft, y);
      ctx.lineTo(lanesRight, y);
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
    // Gentle 1Hz pulse on the outer ring so the marker catches the eye
    // without strobing. Alpha wobbles in a narrow band so the marker
    // remains crisp even at the pulse's trough.
    const pulse = 0.75 + 0.2 * Math.sin(performance.now() * 0.005);
    const outerR = s.carDotR * 5.2;
    const midR = s.carDotR * 3.4;
    for (const car of snap.cars) {
      if (car.target == null) continue;
      const idx = stopIdxById.get(car.target);
      if (idx == null) continue;
      const stop = snap.stops[idx];
      const cx = carX.get(car.id);
      if (cx == null) continue;
      const cy = toScreenY(stop.y);
      // Outer pulsing ring + inner dot. The ring reads "this car is
      // committed to going there"; the inner dot anchors the mark on
      // the rung even when the ring is subtle.
      ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = TARGET_RING;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, midR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = TARGET_FILL;
      ctx.beginPath();
      ctx.arc(cx, cy, s.carDotR * 1.1, 0, Math.PI * 2);
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
    const base = PHASE_COLORS[car.phase] ?? "#6b6b75";

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

    // First pass: compute per-car rider deltas and accumulate per-stop
    // board totals. Boards must be known *before* the stop pass so a
    // stop whose waiting count dropped can distinguish between "a car
    // picked them up" and "they gave up." Without this separation the
    // abandon tween fires whenever anyone boards, which reads as
    // "everyone gives up during rush hour" — the opposite of truth.
    const boardsAtStop = new Map<number, number>();
    const carTweens: Array<() => void> = [];
    for (const car of snap.cars) {
      const prev = this.#carStates.get(car.id);
      const riders = car.riders;
      const cx = carX.get(car.id);

      let nearestIdx: number | null = null;
      let nearestDist = Infinity;
      for (let i = 0; i < snap.stops.length; i++) {
        const d = Math.abs(snap.stops[i].y - car.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      const stopIdx = car.phase === "loading" && nearestDist < 0.5 ? nearestIdx : null;

      if (prev && cx != null && stopIdx != null) {
        const delta = riders - prev.riders;
        if (delta > 0) {
          const stop = snap.stops[stopIdx];
          boardsAtStop.set(
            stop.entity_id,
            (boardsAtStop.get(stop.entity_id) ?? 0) + delta,
          );
        }
        if (delta !== 0) {
          const stop = snap.stops[stopIdx];
          const stopY = toScreenY(stop.y);
          const carY = toScreenY(car.y);
          const count = Math.min(Math.abs(delta), 6);
          if (delta > 0) {
            const useUp = stop.waiting_up >= stop.waiting_down;
            const originX = useUp ? upX + s.upColW / 2 : dnX + s.dnColW / 2;
            const color = useUp ? UP_COLOR : DOWN_COLOR;
            for (let k = 0; k < count; k++) {
              carTweens.push(() =>
                this.#tweens.push({
                  kind: "board",
                  bornAt: now + k * stagger,
                  duration,
                  startX: originX,
                  startY: stopY,
                  endX: cx,
                  endY: carY,
                  color,
                }),
              );
            }
          } else {
            for (let k = 0; k < count; k++) {
              carTweens.push(() =>
                this.#tweens.push({
                  kind: "alight",
                  bornAt: now + k * stagger,
                  duration,
                  startX: cx,
                  startY: carY,
                  endX: cx + 18,
                  endY: carY + 10,
                  color: CAR_DOT_COLOR,
                }),
              );
            }
          }
        }
      }

      this.#carStates.set(car.id, { riders });
    }

    // Second pass: stop-level diffs. A drop in waiting count that
    // exceeds the boards attributed to this stop this frame is an
    // abandonment — rider hit their patience budget and walked off.
    // Cap the visual count per stop per frame so a hundred simultaneous
    // abandonments during a stress test don't carpet the canvas.
    for (const stop of snap.stops) {
      const waiting = stop.waiting_up + stop.waiting_down;
      const prev = this.#stopStates.get(stop.entity_id);
      if (prev) {
        const dropped = prev.waiting - waiting;
        const boards = boardsAtStop.get(stop.entity_id) ?? 0;
        const abandons = Math.max(0, dropped - boards);
        if (abandons > 0) {
          const stopY = toScreenY(stop.y);
          // Drift leftward past the stop label — reads as "walked off
          // to find the stairs / another car." The outward direction
          // visually disambiguates abandons from alights (which drift
          // right, toward the shaft, i.e. "got delivered").
          const startX = upX + s.upColW / 2;
          const count = Math.min(abandons, 4);
          for (let k = 0; k < count; k++) {
            this.#tweens.push({
              kind: "abandon",
              bornAt: now + k * stagger,
              // Abandon tweens run longer than board/alight so they
              // remain visible as a distinct event rather than blending
              // into the boarding flurry at a busy stop.
              duration: duration * 1.5,
              startX,
              startY: stopY,
              endX: startX - 26,
              endY: stopY - 6,
              color: OVERFLOW_COLOR,
            });
          }
        }
      }
      this.#stopStates.set(stop.entity_id, { waiting });
    }

    for (const enqueue of carTweens) {
      enqueue();
    }

    // Reap completed tweens. Walk in reverse so splice indices stay valid.
    for (let i = this.#tweens.length - 1; i >= 0; i--) {
      const t = this.#tweens[i];
      if (now - t.bornAt > t.duration) this.#tweens.splice(i, 1);
    }

    // Drop state for cars no longer in the snapshot. `entity_to_u32` on the
    // wasm side strips slotmap version bits, so a freed-then-refilled slot
    // reuses the same JS-visible id. Without this cleanup, a resurrected
    // car's first frame would see the dead car's final rider count as
    // `prev.riders` and fire spurious board/alight tweens.
    if (this.#carStates.size > snap.cars.length) {
      const liveIds = new Set(snap.cars.map((c) => c.id));
      for (const id of this.#carStates.keys()) {
        if (!liveIds.has(id)) this.#carStates.delete(id);
      }
    }
    if (this.#stopStates.size > snap.stops.length) {
      const liveIds = new Set(snap.stops.map((st) => st.entity_id));
      for (const id of this.#stopStates.keys()) {
        if (!liveIds.has(id)) this.#stopStates.delete(id);
      }
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
      // Board is persistent (delivered into car), alight and abandon
      // fade out as the rider leaves the picture. Abandon gets a
      // slight extra fade curve so it reads as "fading away in
      // frustration" rather than the cleaner alight "delivered" fade.
      const alpha =
        t.kind === "board" ? 0.9 : t.kind === "abandon" ? (1 - eased) ** 1.5 : 1 - eased;
      // Abandon dots are slightly smaller — deemphasizes them visually
      // relative to boards/alights so they read as "ambient loss"
      // rather than flashing warnings.
      const radius = t.kind === "abandon" ? s.carDotR * 0.85 : s.carDotR;
      ctx.fillStyle = hexWithAlpha(t.color, alpha);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
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

/** Apply `alpha` (0..1) to a `#RRGGBB` hex color. Used for pane-tinted
 *  canvas strokes where we have a base hex and want a translucent
 *  variant without adding a CSS variable lookup on every frame.
 *
 *  Falls back to `hexWithAlpha` (rgba() form) for anything that isn't
 *  strictly `#RRGGBB` — cheap safety net so a future caller passing
 *  shorthand or a CSS variable doesn't silently drop alpha. */
function withAlpha(hex: string, alpha: number): string {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    return `${hex}${a.toString(16).padStart(2, "0")}`;
  }
  return hexWithAlpha(hex, alpha);
}

/**
 * Build a rounded-rectangle path on `ctx`. Caller fills/strokes.
 * Uses `CanvasRenderingContext2D.roundRect` when available
 * (Chrome/Edge 99+, Safari 16+, Firefox 113+) and falls back to a
 * manual path for older engines. The playground's Vite + esbuild
 * target is modern browsers; the fallback keeps a local dev build on
 * an older headless Chromium (e.g. CI screenshotters) working.
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Internal re-export so TS doesn't mark `Stop` as unused if the module is
// imported for type completion elsewhere.
export type { Stop };
