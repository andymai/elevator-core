import {
  outwardNormal,
  rectIntersects,
  tracedRoundedRect,
  type AABB,
  type PerimeterPoint,
} from "./airport-geometry";
import { withAlpha } from "./color-utils";
import { CANVAS_FONT_SANS } from "./palette";
import { formatDuration, tetherEta } from "./tether";
import type { CarDto, StopDto } from "../types";

export type { AABB, PerimeterPoint } from "./airport-geometry";

/**
 * Persistent per-train HUD for the airport scene — the analogue of
 * the tether scenario's climber chips. One inline tag per train,
 * accent stripe colored by the train's loop. Outer trains push chips
 * outward; inner trains push chips inward into the empty interior of
 * the inner ring (clean drop zone, no labels or rings to overlap).
 */

export interface AirportPhysics {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  weightCapacity: number;
}

export interface TrainPlacement {
  car: CarDto;
  anchor: PerimeterPoint;
  letter: string;
  nextStop: StopDto | undefined;
  remainingM: number;
  lineColor: string;
  isInner: boolean;
}

interface HudPlacement {
  placement: TrainPlacement;
  lines: string[];
  bx: number;
  by: number;
  bubbleW: number;
  bubbleH: number;
}

const HUD_BG = "rgba(20, 22, 30, 0.94)";
const HUD_BORDER = "#2a2a35";
const HUD_TEXT = "rgba(240, 244, 252, 0.95)";
const AVG_RIDER_WEIGHT_KG = 75;
const DWELLING_PHASES = new Set(["loading", "door-opening", "door-closing"]);

function isDwelling(car: CarDto): boolean {
  return DWELLING_PHASES.has(car.phase);
}

function hasChipOverlap(me: HudPlacement, all: HudPlacement[], myIdx: number): boolean {
  for (let i = 0; i < all.length; i++) {
    if (i === myIdx) continue;
    const o = all[i];
    if (!o) continue;
    if (rectIntersects(me.bx, me.by, me.bubbleW, me.bubbleH, o.bx, o.by, o.bubbleW, o.bubbleH)) {
      return true;
    }
  }
  return false;
}

function hasObstacleOverlap(me: HudPlacement, obstacles: AABB[]): boolean {
  for (const obs of obstacles) {
    if (rectIntersects(me.bx, me.by, me.bubbleW, me.bubbleH, obs.x, obs.y, obs.w, obs.h)) {
      return true;
    }
  }
  return false;
}

function buildHudLines(train: TrainPlacement, tripCap: number, physics: AirportPhysics): string[] {
  const totalRiders = train.car.riders;
  const loadLine = tripCap > 0 ? `${totalRiders} / ${tripCap}` : `${totalRiders}`;
  const destName = train.nextStop?.name ?? "—";
  const arrow = isDwelling(train.car) ? "@" : "→";
  const segmentLine = `${arrow} ${destName}`;
  let etaLine = "ETA —";
  if (train.nextStop && Number.isFinite(train.remainingM)) {
    const eta = tetherEta(
      0,
      train.remainingM,
      Math.abs(train.car.v),
      physics.maxSpeed,
      physics.acceleration,
      physics.deceleration,
    );
    etaLine = `ETA ${formatDuration(eta)}`;
  }
  return [`Train ${train.letter}`, segmentLine, loadLine, etaLine];
}

export function drawTrainHuds(
  ctx: CanvasRenderingContext2D,
  trains: TrainPlacement[],
  canvasW: number,
  canvasH: number,
  innerSafe: AABB,
  physics: AirportPhysics,
  showFullLabels: boolean,
  carBodyH: number,
  stationObstacles: AABB[],
): void {
  if (trains.length === 0) return;
  if (Math.min(canvasW, canvasH) < 340) return;

  const fontPx = showFullLabels ? 11 : 10;
  const padX = 8;
  const padY = 5;
  const lh = fontPx + 2;

  ctx.font = `600 ${fontPx}px ${CANVAS_FONT_SANS}`;
  const tripCap =
    physics.weightCapacity > 0
      ? Math.max(1, Math.floor(physics.weightCapacity / AVG_RIDER_WEIGHT_KG))
      : 0;
  const placements: HudPlacement[] = [];

  for (const train of trains) {
    const lines = buildHudLines(train, tripCap, physics);
    let textW = 0;
    for (const l of lines) textW = Math.max(textW, ctx.measureText(l).width);
    const bubbleW = textW + padX * 2;
    const bubbleH = lh * lines.length + padY * 2;

    // Outer trains push chips outward; inner trains push inward into
    // the empty inner-ring interior (clean drop zone, no rings or
    // station labels to overlap).
    const { nx, ny } = outwardNormal(train.anchor);
    const dir = train.isInner ? -1 : 1;
    const offset = carBodyH + 18;
    const ax = train.anchor.x + nx * dir * offset;
    const ay = train.anchor.y + ny * dir * offset;

    let bx = ax - bubbleW / 2;
    let by = ay - bubbleH / 2;
    bx = Math.max(4, Math.min(canvasW - bubbleW - 4, bx));
    by = Math.max(4, Math.min(canvasH - bubbleH - 4, by));
    placements.push({ placement: train, lines, bx, by, bubbleW, bubbleH });
  }

  // Collision pass — slide along the local tangent until clear of
  // other chips and station-label obstacles. Up to 12 attempts with
  // widening steps; last-resort drop into `innerSafe` if still stuck.
  for (let i = 0; i < placements.length; i++) {
    const me = placements[i];
    if (!me) continue;
    const tan = me.placement.anchor.tangent;
    const tx = Math.cos(tan);
    const ty = Math.sin(tan);
    let attempts = 0;
    while (
      attempts < 12 &&
      (hasChipOverlap(me, placements, i) || hasObstacleOverlap(me, stationObstacles))
    ) {
      const sign = attempts % 2 === 0 ? 1 : -1;
      const stepCount = Math.floor(attempts / 2) + 1;
      const step = sign * (me.bubbleH * 0.5 + 8) * stepCount;
      me.bx = Math.max(4, Math.min(canvasW - me.bubbleW - 4, me.bx + tx * step));
      me.by = Math.max(4, Math.min(canvasH - me.bubbleH - 4, me.by + ty * step));
      attempts++;
    }
    if (
      (hasChipOverlap(me, placements, i) || hasObstacleOverlap(me, stationObstacles)) &&
      innerSafe.w > me.bubbleW + 8 &&
      innerSafe.h > me.bubbleH + 8
    ) {
      // Drop into the inner safe zone, stacked vertically. Clamp the
      // slot so chips past capacity sit at the bottom of the safe
      // zone rather than running off the canvas. Same-slot overlap
      // is the lesser evil — better than half-rendered chips.
      const occupied = placements
        .slice(0, i)
        .filter(
          (p) =>
            p.bx >= innerSafe.x &&
            p.bx + p.bubbleW <= innerSafe.x + innerSafe.w &&
            p.by >= innerSafe.y &&
            p.by + p.bubbleH <= innerSafe.y + innerSafe.h,
        );
      const slotStep = me.bubbleH + 4;
      const maxSlots = Math.max(1, Math.floor((innerSafe.h - me.bubbleH) / slotStep) + 1);
      const slot = Math.min(occupied.length, maxSlots - 1);
      me.bx = innerSafe.x + (innerSafe.w - me.bubbleW) / 2;
      me.by = innerSafe.y + slot * slotStep;
    }
  }

  for (const p of placements) {
    ctx.save();
    const bubbleRect = {
      cx: p.bx + p.bubbleW / 2,
      cy: p.by + p.bubbleH / 2,
      w: p.bubbleW,
      h: p.bubbleH,
      r: 4,
    };
    ctx.fillStyle = HUD_BG;
    tracedRoundedRect(ctx, bubbleRect);
    ctx.fill();
    ctx.fillStyle = withAlpha(p.placement.lineColor, isDwelling(p.placement.car) ? 0.95 : 0.75);
    ctx.fillRect(p.bx, p.by, 2.5, p.bubbleH);
    ctx.strokeStyle = HUD_BORDER;
    ctx.lineWidth = 1;
    tracedRoundedRect(ctx, bubbleRect);
    ctx.stroke();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let i = 0; i < p.lines.length; i++) {
      const ly = p.by + padY + lh * i + lh / 2;
      const line = p.lines[i] ?? "";
      ctx.fillStyle = i === 0 ? withAlpha(p.placement.lineColor, 0.95) : HUD_TEXT;
      ctx.fillText(line, p.bx + padX, ly);
    }
    ctx.restore();
  }
}
