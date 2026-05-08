import { easeOutNorm, hexWithAlpha, shade, withAlpha } from "./color-utils";
import type { RiderVariant } from "./figures/rider";
import { drawRidersInCar } from "./figures/riders-in-car";
import type { Scale } from "./layout";
import { CANVAS_FONT_SANS, PHASE_COLORS, TARGET_FILL, TRAIL_DT, TRAIL_STEPS } from "./palette";
import type { CarDto, CarBubble, Snapshot } from "../types";

export function drawTargetMarkers(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  carX: Map<number, number>,
  shaftInnerPerCar: Map<number, number>,
  toScreenY: (y: number) => number,
  s: Scale,
  stopIdxById: Map<number, number>,
): void {
  void shaftInnerPerCar; // reserved for future per-car dot sizing
  const dotR = Math.max(2, s.figureHeadR * 0.9);
  for (const car of snap.cars) {
    if (car.target === undefined) continue;
    const idx = stopIdxById.get(car.target);
    if (idx === undefined) continue;
    const stop = snap.stops[idx];
    if (stop === undefined) continue;
    const cx = carX.get(car.id);
    if (cx === undefined) continue;
    const targetY = toScreenY(stop.y) - s.carH / 2;
    const cabinCenterY = toScreenY(car.y) - s.carH / 2;
    if (Math.abs(cabinCenterY - targetY) < 0.5) continue;
    ctx.strokeStyle = "rgba(250, 250, 250, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cabinCenterY);
    ctx.lineTo(cx, targetY);
    ctx.stroke();
    ctx.fillStyle = TARGET_FILL;
    ctx.beginPath();
    ctx.arc(cx, targetY, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCarTrail(
  ctx: CanvasRenderingContext2D,
  car: CarDto,
  cx: number,
  carW: number,
  carH: number,
  toScreenY: (y: number) => number,
): void {
  if (car.phase !== "moving" || Math.abs(car.v) < 0.1) return;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- wasm boundary: phase may hold a variant the TS union hasn't caught up with
  const base = PHASE_COLORS[car.phase] ?? "#6b6b75";
  const halfW = carW / 2;
  for (let i = 1; i <= TRAIL_STEPS; i++) {
    const behindBottom = toScreenY(car.y - car.v * TRAIL_DT * i);
    const alpha = 0.18 * (1 - (i - 1) / TRAIL_STEPS);
    ctx.fillStyle = hexWithAlpha(base, alpha);
    ctx.fillRect(cx - halfW, behindBottom - carH, carW, carH);
  }
}

export function drawCar(
  ctx: CanvasRenderingContext2D,
  car: CarDto,
  cx: number,
  carW: number,
  carH: number,
  riderColor: string,
  toScreenY: (y: number) => number,
  s: Scale,
  roster?: RiderVariant[],
): void {
  const bottom = toScreenY(car.y);
  const top = bottom - carH;
  const halfW = carW / 2;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- wasm boundary: phase may hold a variant the TS union hasn't caught up with
  const base = PHASE_COLORS[car.phase] ?? "#6b6b75";

  // Solid fill — the previous top→bottom gradient added bevel-style
  // depth that read as fussy chrome. A flat phase colour keeps each
  // car readable at a glance and lets the rider silhouettes inside
  // carry the visual interest.
  ctx.fillStyle = base;
  ctx.fillRect(cx - halfW, top, carW, carH);
  // Dark outer border first so the inset highlight on the next row
  // (`top + 1.5`) is not overwritten — painting both at `top + 0.5`
  // would let the dark stroke win and erase the highlight.
  ctx.strokeStyle = "rgba(10, 12, 16, 0.9)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - halfW + 0.5, top + 0.5, carW - 1, carH - 1);
  // 1 px inset highlight one row below the dark border — gives the
  // cabin a subtle sense of depth without painting a gradient over
  // the whole body.
  ctx.strokeStyle = shade(base, 0.18);
  ctx.beginPath();
  ctx.moveTo(cx - halfW + 1, top + 1.5);
  ctx.lineTo(cx + halfW - 1, top + 1.5);
  ctx.stroke();

  // 0.95 = within one typical rider weight (~75 kg) of capacity; once
  // load is in this envelope no more riders can board.
  const isFull = car.capacity > 0 && car.load >= car.capacity * 0.95;
  if (car.riders > 0 || isFull) {
    drawRidersInCar(ctx, cx, bottom, carW, carH, car.riders, riderColor, s, roster, isFull);
  }
}

// Layout + style constants for the speech bubbles. Tuned for a tight,
// warm-dark surface aesthetic that matches the broader playground:
// translucent fill anchored to `--bg-elevated`, hairline accent stroke,
// soft accent halo, and a small integrated tail. Padding is asymmetric
// because the body text sits between a dim accent glyph and a neutral
// off-white run, and we want the row to read as one tight chip.
const BUBBLE_PAD_X = 6;
const BUBBLE_PAD_Y = 3;
const BUBBLE_RADIUS = 4;
const BUBBLE_TAIL_W = 3;
const BUBBLE_TAIL_H = 2.5;
const BUBBLE_GAP = 2;
const BUBBLE_HALO_BLUR = 12;
const BUBBLE_FILL = "rgba(37, 37, 48, 0.80)"; // --bg-elevated (#252530) at 0.80
const BUBBLE_TEXT_COLOR = "#ECECEE"; // warm off-white
const BUBBLE_GLYPH_TEXT_GAP = 3;
const BUBBLE_LIFETIME_FADE_FRAC = 0.3;
const BUBBLE_ENTRANCE_MS = 140;
const BUBBLE_ENTRANCE_SCALE_FROM = 0.85;
const BUBBLE_ENTRANCE_DRIFT_PX = 2.5;

interface BubblePlacement {
  bubble: CarBubble;
  glyphW: number;
  textW: number;
  alpha: number;
  cx: number;
  carTop: number;
  carBottom: number;
  bubbleW: number;
  bubbleH: number;
  side: "above" | "below";
  bx: number;
  by: number;
  entrance: number;
}

/**
 * Draw a small rounded speech-bubble with a tail pointing down (or up)
 * to each car with a fresh action.
 *
 * Visual: translucent warm-dark fill, hairline pane-accent stroke, soft
 * accent halo, leading glyph tinted with the pane accent, body text in
 * a neutral off-white. Each bubble does a 140 ms ease-out entrance
 * (opacity, scale, slight upward drift) when it first appears.
 */
export function drawBubbles(
  ctx: CanvasRenderingContext2D,
  accent: string,
  carById: ReadonlyMap<number, CarDto>,
  bubbles: Map<number, CarBubble>,
  carX: Map<number, number>,
  toScreenY: (y: number) => number,
  s: Scale,
  canvasWidth: number,
): void {
  const fontSize = s.fontSmall + 0.5;
  ctx.font = `500 ${fontSize}px ${CANVAS_FONT_SANS}`;
  ctx.textBaseline = "middle";
  // Slight negative tracking so the chip stays compact at small sizes.
  // Property is ignored on browsers without Canvas letterSpacing support
  // (Safari < 17.2). measureText reflects the active spacing on engines
  // that do honour it, which keeps width math accurate.
  setLetterSpacing(ctx, "-0.1px");
  const now = performance.now();
  const strokeColor = withAlpha(accent, 0.45);
  const haloColor = withAlpha(accent, 0.5);
  const glyphColor = withAlpha(accent, 0.75);
  const placements: BubblePlacement[] = [];
  // Iterate the (typically small) bubbles map directly — looking up the
  // car via the prepared id map skips a full pass over `snap.cars` per
  // frame when only a handful of cars have active bubbles.
  for (const [carId, bubble] of bubbles) {
    const car = carById.get(carId);
    if (car === undefined) continue;
    const cx = carX.get(carId);
    if (cx === undefined) continue;
    const carBottom = toScreenY(car.y);
    const carTop = carBottom - s.carH;

    const ttl = Math.max(1, bubble.expiresAt - bubble.bornAt);
    const remaining = bubble.expiresAt - now;
    const lifetimeFade =
      remaining > ttl * BUBBLE_LIFETIME_FADE_FRAC
        ? 1
        : Math.max(0, remaining / (ttl * BUBBLE_LIFETIME_FADE_FRAC));
    const age = Math.max(0, now - bubble.bornAt);
    const entrance = Math.min(1, age / BUBBLE_ENTRANCE_MS);
    const alpha = lifetimeFade * entrance;
    if (alpha <= 0) continue;

    const glyphW = ctx.measureText(bubble.glyph).width;
    const textW = ctx.measureText(bubble.text).width;
    const bubbleW = glyphW + BUBBLE_GLYPH_TEXT_GAP + textW + BUBBLE_PAD_X * 2;
    const bubbleH = fontSize + BUBBLE_PAD_Y * 2 + 2;

    const aboveTop = carTop - BUBBLE_GAP - BUBBLE_TAIL_H - bubbleH;
    const belowOverflow = carBottom + BUBBLE_GAP + BUBBLE_TAIL_H + bubbleH > canvasWidth;
    const initialSide: "above" | "below" = aboveTop < 2 && !belowOverflow ? "below" : "above";
    const by =
      initialSide === "above"
        ? carTop - BUBBLE_GAP - BUBBLE_TAIL_H - bubbleH
        : carBottom + BUBBLE_GAP + BUBBLE_TAIL_H;
    let bx = cx - bubbleW / 2;
    const minX = 2;
    const maxX = canvasWidth - bubbleW - 2;
    if (bx < minX) bx = minX;
    if (bx > maxX) bx = maxX;
    placements.push({
      bubble,
      glyphW,
      textW,
      alpha,
      cx,
      carTop,
      carBottom,
      bubbleW,
      bubbleH,
      side: initialSide,
      bx,
      by,
      entrance,
    });
  }

  // Collision pass — flip side when overlapping a previously-placed bubble.
  const rectsIntersect = (a: BubblePlacement, b: BubblePlacement): boolean =>
    !(
      a.bx + a.bubbleW <= b.bx ||
      b.bx + b.bubbleW <= a.bx ||
      a.by + a.bubbleH <= b.by ||
      b.by + b.bubbleH <= a.by
    );
  for (let i = 1; i < placements.length; i++) {
    const p = placements[i];
    if (p === undefined) continue;
    let collides = false;
    for (let j = 0; j < i; j++) {
      const pj = placements[j];
      if (pj === undefined) continue;
      if (rectsIntersect(p, pj)) {
        collides = true;
        break;
      }
    }
    if (!collides) continue;
    const flipSide: "above" | "below" = p.side === "above" ? "below" : "above";
    const flipBy =
      flipSide === "above"
        ? p.carTop - BUBBLE_GAP - BUBBLE_TAIL_H - p.bubbleH
        : p.carBottom + BUBBLE_GAP + BUBBLE_TAIL_H;
    const flipped: BubblePlacement = { ...p, side: flipSide, by: flipBy };
    let flipClears = true;
    for (let j = 0; j < i; j++) {
      const pj = placements[j];
      if (pj === undefined) continue;
      if (rectsIntersect(flipped, pj)) {
        flipClears = false;
        break;
      }
    }
    if (flipClears) {
      placements[i] = flipped;
    }
  }

  for (const p of placements) {
    const {
      bubble,
      glyphW,
      alpha,
      cx,
      carTop,
      carBottom,
      bubbleW,
      bubbleH,
      side,
      bx,
      by,
      entrance,
    } = p;
    const tipY = side === "above" ? carTop - BUBBLE_GAP : carBottom + BUBBLE_GAP;
    const tailCenter = Math.min(
      Math.max(cx, bx + BUBBLE_RADIUS + BUBBLE_TAIL_W / 2),
      bx + bubbleW - BUBBLE_RADIUS - BUBBLE_TAIL_W / 2,
    );

    const ease = easeOutNorm(entrance);
    const scale = BUBBLE_ENTRANCE_SCALE_FROM + (1 - BUBBLE_ENTRANCE_SCALE_FROM) * ease;
    const driftY = (1 - ease) * BUBBLE_ENTRANCE_DRIFT_PX;
    const centerX = bx + bubbleW / 2;
    const centerY = by + bubbleH / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(centerX, centerY + driftY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // Single combined path: rounded body + integrated tail. Filling and
    // stroking once eliminates the seam where the old separate-tail
    // implementation overlapped its strokes against the body edge.
    bubblePath(ctx, bx, by, bubbleW, bubbleH, BUBBLE_RADIUS, side, tailCenter, tipY);

    ctx.shadowColor = haloColor;
    ctx.shadowBlur = BUBBLE_HALO_BLUR;
    ctx.fillStyle = BUBBLE_FILL;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glyph + text run. We left-align both on the same baseline; the
    // glyph leads in dim accent, then the body in warm off-white.
    const textY = by + bubbleH / 2;
    const runStartX = bx + BUBBLE_PAD_X;
    ctx.textAlign = "left";
    ctx.fillStyle = glyphColor;
    ctx.fillText(bubble.glyph, runStartX, textY);
    ctx.fillStyle = BUBBLE_TEXT_COLOR;
    ctx.fillText(bubble.text, runStartX + glyphW + BUBBLE_GLYPH_TEXT_GAP, textY);

    ctx.restore();
  }

  // Reset letterSpacing so we don't leak the tighter tracking onto the
  // next pane's draw pass. Other text in the renderer assumes default.
  setLetterSpacing(ctx, "0px");
}

/**
 * Build a single closed path for the bubble body with the tail
 * integrated into either the bottom (above-mode) or top (below-mode)
 * edge. Drawn clockwise from `(bx + radius, by)`.
 */
function bubblePath(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  w: number,
  h: number,
  radius: number,
  side: "above" | "below",
  tailCenter: number,
  tipY: number,
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  if (side === "below") {
    // Tail on the top edge, pointing up to the car above.
    ctx.lineTo(tailCenter - BUBBLE_TAIL_W / 2, by);
    ctx.lineTo(tailCenter, tipY);
    ctx.lineTo(tailCenter + BUBBLE_TAIL_W / 2, by);
  }
  ctx.lineTo(bx + w - r, by);
  ctx.arcTo(bx + w, by, bx + w, by + r, r);
  ctx.lineTo(bx + w, by + h - r);
  ctx.arcTo(bx + w, by + h, bx + w - r, by + h, r);
  if (side === "above") {
    // Tail on the bottom edge, pointing down to the car below.
    ctx.lineTo(tailCenter + BUBBLE_TAIL_W / 2, by + h);
    ctx.lineTo(tailCenter, tipY);
    ctx.lineTo(tailCenter - BUBBLE_TAIL_W / 2, by + h);
  }
  ctx.lineTo(bx + r, by + h);
  ctx.arcTo(bx, by + h, bx, by + h - r, r);
  ctx.lineTo(bx, by + r);
  ctx.arcTo(bx, by, bx + r, by, r);
  ctx.closePath();
}

/**
 * Apply Canvas letterSpacing without typing the experimental property
 * across all tsconfig targets. The property write is silently ignored
 * on browsers that don't implement it, and the slightly tighter run is
 * a polish, not a correctness concern.
 */
function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string): void {
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = value;
}
