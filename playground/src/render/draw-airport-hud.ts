import {
  outwardNormal,
  rectIntersects,
  tracedRoundedRect,
  type AABB,
  type PerimeterPoint,
} from "./airport-geometry";
import { CANVAS_FONT_SANS } from "./palette";
import { formatDuration, tetherEta } from "./tether";
import type { CarDto, StopDto } from "../types";

export type { AABB, PerimeterPoint } from "./airport-geometry";

/**
 * Per-train HUD for the airport scene. Slim one-line pill carrying
 * destination, current speed in km/h, and ETA. Pills are gated: only
 * dwelling trains and the user's hovered/touched train get a pill, so
 * the moving-scene reads clean and detail surfaces on demand.
 */

export interface AirportPhysics {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  weightCapacity: number;
}

/**
 * Per-renderer hover state for the airport scene. Owned by
 * `CanvasRenderer` so each instance has its own pointer focus and
 * train-anchor cache. The pointer handler writes to it; `drawTrainHuds`
 * reads it each frame to decide which pills to surface.
 */
export class AirportHoverState {
  hoveredCarId: number | undefined;
  readonly trainAnchors = new Map<number, { x: number; y: number }>();

  setHovered(id: number | undefined): void {
    this.hoveredCarId = id;
  }

  /** Nearest train within `radius` of (cx, cy) in canvas-CSS coords. */
  pick(cx: number, cy: number, radius: number): number | undefined {
    let best: number | undefined;
    let bestD2 = radius * radius;
    for (const [id, p] of this.trainAnchors) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = id;
      }
    }
    return best;
  }
}

export interface TrainPlacement {
  car: CarDto;
  anchor: PerimeterPoint;
  nextStop: StopDto | undefined;
  remainingM: number;
  isInner: boolean;
}

interface HudPlacement {
  placement: TrainPlacement;
  head: string;
  tail: string;
  bx: number;
  by: number;
  bubbleW: number;
  bubbleH: number;
}

const HUD_BG = "rgba(20, 22, 30, 0.78)";
const HUD_BORDER = "rgba(255, 255, 255, 0.08)";
const HUD_TEXT = "#fafafa";
const HUD_MUTED = "#a1a1aa";
const DWELLING_PHASES = new Set(["loading", "door-opening", "door-closing"]);

function isDwelling(car: CarDto): boolean {
  return DWELLING_PHASES.has(car.phase);
}

function formatKmh(vMs: number): string {
  const kph = Math.abs(vMs) * 3.6;
  if (kph < 0.5) return "0 km/h";
  return `${Math.round(kph)} km/h`;
}

function overlapsAny(me: HudPlacement, others: HudPlacement[], myIdx: number): boolean {
  for (let i = 0; i < others.length; i++) {
    if (i === myIdx) continue;
    const o = others[i];
    if (o && rectIntersects(me.bx, me.by, me.bubbleW, me.bubbleH, o.bx, o.by, o.bubbleW, o.bubbleH))
      return true;
  }
  return false;
}

function overlapsObstacle(me: HudPlacement, obstacles: AABB[]): boolean {
  for (const o of obstacles) {
    if (rectIntersects(me.bx, me.by, me.bubbleW, me.bubbleH, o.x, o.y, o.w, o.h)) return true;
  }
  return false;
}

function buildHudText(
  train: TrainPlacement,
  physics: AirportPhysics,
): { head: string; tail: string } {
  const arrow = isDwelling(train.car) ? "@" : "→";
  const dest = train.nextStop?.name ?? "—";
  const speed = formatKmh(train.car.v);
  let etaStr = "—";
  if (train.nextStop && Number.isFinite(train.remainingM)) {
    const eta = tetherEta(
      0,
      train.remainingM,
      Math.abs(train.car.v),
      physics.maxSpeed,
      physics.acceleration,
      physics.deceleration,
    );
    etaStr = formatDuration(eta);
  }
  return { head: `${arrow} ${dest}`, tail: `${speed}  ${etaStr}` };
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
  hoverState: AirportHoverState,
): void {
  // Refresh hit-test anchors every frame so the pointer handler picks
  // the train under the cursor against current positions.
  hoverState.trainAnchors.clear();
  for (const t of trains) hoverState.trainAnchors.set(t.car.id, { x: t.anchor.x, y: t.anchor.y });

  if (trains.length === 0) return;
  if (Math.min(canvasW, canvasH) < 340) return;

  // Visible set: dwelling trains (info-rich moment) + the hovered
  // train. Moving, un-hovered trains stay un-annotated.
  const visible = trains.filter((t) => isDwelling(t.car) || t.car.id === hoverState.hoveredCarId);
  if (visible.length === 0) return;

  const fontPx = showFullLabels ? 11 : 10;
  const padX = 8;
  const padY = 4;
  const placements: HudPlacement[] = [];

  ctx.font = `600 ${fontPx}px ${CANVAS_FONT_SANS}`;
  const gapW = ctx.measureText("  ").width;
  for (const train of visible) {
    const { head, tail } = buildHudText(train, physics);
    const textW = ctx.measureText(head).width + (tail ? gapW + ctx.measureText(tail).width : 0);
    const bubbleW = textW + padX * 2;
    const bubbleH = fontPx + padY * 2;

    const { nx, ny } = outwardNormal(train.anchor);
    const dir = train.isInner ? -1 : 1;
    const offset = carBodyH + 14;
    const ax = train.anchor.x + nx * dir * offset;
    const ay = train.anchor.y + ny * dir * offset;

    const bx = Math.max(4, Math.min(canvasW - bubbleW - 4, ax - bubbleW / 2));
    const by = Math.max(4, Math.min(canvasH - bubbleH - 4, ay - bubbleH / 2));
    placements.push({ placement: train, head, tail, bx, by, bubbleW, bubbleH });
  }

  // Collision pass — slide along the local tangent until clear of
  // other chips. Station-label overlap is tolerated; pill stays near
  // its train. Inner-safe fallback only when chips still overlap.
  for (let i = 0; i < placements.length; i++) {
    const me = placements[i];
    if (!me) continue;
    const tan = me.placement.anchor.tangent;
    const tx = Math.cos(tan);
    const ty = Math.sin(tan);
    let attempts = 0;
    while (
      attempts < 12 &&
      (overlapsAny(me, placements, i) || overlapsObstacle(me, stationObstacles))
    ) {
      const sign = attempts % 2 === 0 ? 1 : -1;
      const stepCount = Math.floor(attempts / 2) + 1;
      const step = sign * (me.bubbleH * 0.5 + 8) * stepCount;
      me.bx = Math.max(4, Math.min(canvasW - me.bubbleW - 4, me.bx + tx * step));
      me.by = Math.max(4, Math.min(canvasH - me.bubbleH - 4, me.by + ty * step));
      attempts++;
    }
    if (
      overlapsAny(me, placements, i) &&
      innerSafe.w > me.bubbleW + 8 &&
      innerSafe.h > me.bubbleH + 8
    ) {
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

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `600 ${fontPx}px ${CANVAS_FONT_SANS}`;
  for (const p of placements) {
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
    ctx.strokeStyle = HUD_BORDER;
    ctx.lineWidth = 1;
    tracedRoundedRect(ctx, bubbleRect);
    ctx.stroke();
    const midY = p.by + p.bubbleH / 2;
    ctx.fillStyle = HUD_TEXT;
    ctx.fillText(p.head, p.bx + padX, midY);
    if (p.tail) {
      const tailX = p.bx + padX + ctx.measureText(p.head).width + gapW;
      ctx.fillStyle = HUD_MUTED;
      ctx.fillText(p.tail, tailX, midY);
    }
  }
}
