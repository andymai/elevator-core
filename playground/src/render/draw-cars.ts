import { hexWithAlpha, shade, withAlpha } from "./color-utils";
import type { RiderVariant } from "./figures/rider";
import { drawRidersInCar } from "./figures/riders-in-car";
import type { Scale } from "./layout";
import { PHASE_COLORS, TARGET_FILL, TRAIL_DT, TRAIL_STEPS } from "./palette";
import { roundedRect } from "./primitives";
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

  const grad = ctx.createLinearGradient(cx, top, cx, bottom);
  grad.addColorStop(0, shade(base, 0.14));
  grad.addColorStop(1, shade(base, -0.18));
  ctx.fillStyle = grad;
  ctx.fillRect(cx - halfW, top, carW, carH);
  ctx.strokeStyle = "rgba(10, 12, 16, 0.9)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - halfW + 0.5, top + 0.5, carW - 1, carH - 1);

  if (car.riders > 0) {
    drawRidersInCar(ctx, cx, bottom, carW, carH, car.riders, riderColor, s, roster);
  }
}

/**
 * Draw a small rounded speech-bubble with a tail pointing down (or
 * up) to each car with a fresh action.
 */
export function drawBubbles(
  ctx: CanvasRenderingContext2D,
  accent: string,
  snap: Snapshot,
  carX: Map<number, number>,
  toScreenY: (y: number) => number,
  s: Scale,
  bubbles: Map<number, CarBubble>,
  canvasWidth: number,
): void {
  const padX = 7;
  const padY = 4;
  const tailW = 5;
  const tailH = 4;
  const radius = 6;
  const gap = 2;
  const font = `600 ${s.fontSmall + 0.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;
  ctx.textBaseline = "middle";
  const FADE_FRAC = 0.3;
  const now = performance.now();
  const strokeBase = accent;

  interface Placement {
    bubble: CarBubble;
    alpha: number;
    cx: number;
    carTop: number;
    carBottom: number;
    bubbleW: number;
    bubbleH: number;
    side: "above" | "below";
    bx: number;
    by: number;
  }
  const placements: Placement[] = [];
  for (const car of snap.cars) {
    const bubble = bubbles.get(car.id);
    if (!bubble) continue;
    const cx = carX.get(car.id);
    if (cx === undefined) continue;
    const carBottom = toScreenY(car.y);
    const carTop = carBottom - s.carH;

    const ttl = Math.max(1, bubble.expiresAt - bubble.bornAt);
    const remaining = bubble.expiresAt - now;
    const alpha = remaining > ttl * FADE_FRAC ? 1 : Math.max(0, remaining / (ttl * FADE_FRAC));
    if (alpha <= 0) continue;

    const textW = ctx.measureText(bubble.text).width;
    const bubbleW = textW + padX * 2;
    const bubbleH = s.fontSmall + padY * 2 + 2;

    const aboveTop = carTop - gap - tailH - bubbleH;
    const belowOverflow = carBottom + gap + tailH + bubbleH > canvasWidth;
    const initialSide: "above" | "below" = aboveTop < 2 && !belowOverflow ? "below" : "above";
    const by = initialSide === "above" ? carTop - gap - tailH - bubbleH : carBottom + gap + tailH;
    let bx = cx - bubbleW / 2;
    const minX = 2;
    const maxX = canvasWidth - bubbleW - 2;
    if (bx < minX) bx = minX;
    if (bx > maxX) bx = maxX;
    placements.push({
      bubble,
      alpha,
      cx,
      carTop,
      carBottom,
      bubbleW,
      bubbleH,
      side: initialSide,
      bx,
      by,
    });
  }

  // Collision pass.
  const rectsIntersect = (a: Placement, b: Placement): boolean =>
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
      flipSide === "above" ? p.carTop - gap - tailH - p.bubbleH : p.carBottom + gap + tailH;
    const flipped: Placement = { ...p, side: flipSide, by: flipBy };
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
    const { bubble, alpha, cx, carTop, carBottom, bubbleW, bubbleH, side, bx, by } = p;
    const tipY = side === "above" ? carTop - gap : carBottom + gap;
    const baseY = side === "above" ? by + bubbleH : by;
    const tailCenter = Math.min(
      Math.max(cx, bx + radius + tailW / 2),
      bx + bubbleW - radius - tailW / 2,
    );

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.shadowColor = strokeBase;
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(16, 19, 26, 0.94)";
    roundedRect(ctx, bx, by, bubbleW, bubbleH, radius);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = withAlpha(strokeBase, 0.65);
    ctx.lineWidth = 1;
    roundedRect(ctx, bx, by, bubbleW, bubbleH, radius);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tailCenter - tailW / 2, baseY);
    ctx.lineTo(tailCenter + tailW / 2, baseY);
    ctx.lineTo(tailCenter, tipY);
    ctx.closePath();
    ctx.fillStyle = "rgba(16, 19, 26, 0.94)";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f0f3fb";
    ctx.textAlign = "center";
    ctx.fillText(bubble.text, bx + bubbleW / 2, by + bubbleH / 2);

    ctx.restore();
  }
}
