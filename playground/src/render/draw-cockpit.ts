import type { CarDto, Snapshot, StopDto } from "../types";
import { drawRider, pickRiderVariant } from "./figures/rider";

/**
 * Operator-cockpit renderer.
 *
 * Draws the entire scenario as one unified building elevation: a
 * single shaft channel runs through every floor, and the cab is
 * rendered as a transparent cutaway that slides along the shaft —
 * rider silhouettes and the in-cab car-button column are visible
 * through the cab walls. Doors animate on the cab's bottom edge.
 *
 * Layout, top-to-bottom:
 *   1. Hint banner (a one-line orientation sentence dimmed in the
 *      tertiary text colour).
 *   2. Building elevation, taking the rest of the canvas:
 *        • left gutter   — floor names, right-aligned
 *        • lamp column   — vertically-stacked ▲ / ▼ hall-call lamps
 *        • shaft channel — fills the remaining width; the cab cutaway
 *          slides through it and floor lines stripe across.
 *
 * The renderer publishes click hit-zones into a caller-owned array
 * each frame. The cockpit panel registers a canvas pointerdown
 * listener (in `renderer.ts`) that hit-tests the topmost zone and
 * dispatches: hall-call lamps fire `pressHallCall`; the cab's door
 * bar toggles `openDoor` / `closeDoor`. Click-on-canvas is a
 * shortcut affordance — the throttle and door buttons in the
 * console remain the primary input surfaces.
 */

/** Hit-zone published by `drawCockpit` and consumed by the canvas click handler. */
export interface HitZone {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "hall-up" | "hall-down" | "doors";
  /** Stop or car entity id (u32 slot, matching the Snapshot DTO). */
  ref: number;
}

/**
 * Per-stop hall-call lamp state. Sourced from `WorldView.stops[i].hall_calls`
 * (the engine's acknowledged-call lamps), keyed by stop entity slot.
 */
export interface HallLampState {
  up: boolean;
  down: boolean;
}

export interface CockpitRenderState {
  /** Per-stop hall-call lamps. Empty map = no calls; lookup falls through to off. */
  hallCallsByStop: Map<number, HallLampState>;
  /** One-line orientation hint shown as a banner above the elevation. */
  hint: string;
}

const HINT_COLOR = "#8b8c92";
const FLOOR_LABEL = "#a1a1aa";
const FLOOR_TICK = "#2a2a35";
const SHAFT_FILL = "#15151a";
const SHAFT_FRAME = "#2a2a35";
const HALL_LAMP_OFF = "#2a2a35";
const HALL_LAMP_ON = "#fbbf24";
const HALL_LAMP_LABEL = "#5b5b65";
const CAB_FILL = "rgba(245, 158, 11, 0.06)";
const CAB_STROKE = "#f59e0b";
const CAB_INTERIOR_LINE = "rgba(245, 158, 11, 0.18)";
const CAR_BUTTON_OFF_FILL = "#0f0f12";
const CAR_BUTTON_OFF_STROKE = "#3a3a45";
const CAR_BUTTON_OFF_LABEL = "#8b8c92";
const CAR_BUTTON_ON_FILL = "#fbbf24";
const CAR_BUTTON_ON_STROKE = "#fbbf24";
const CAR_BUTTON_ON_LABEL = "#0f0f12";
const RIDER_COLOR = "#d4d4d8";
const DOOR_FILL = "#f59e0b";
const DOOR_GAP = "#0f0f12";

export function drawCockpit(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  state: CockpitRenderState,
  hitZones: HitZone[],
): void {
  hitZones.length = 0;
  if (snap.stops.length === 0 || w <= 0 || h <= 0) return;

  // ─── Hint banner ────────────────────────────────────────────────
  const hintH = 28;
  if (state.hint.length > 0) {
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = HINT_COLOR;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(state.hint, 16, 14);
  }

  // ─── Building elevation ────────────────────────────────────────
  const padX = 16;
  const elevTop = hintH + 6;
  const elevBottom = h - 12;
  const elevH = elevBottom - elevTop;
  if (elevH < 60) return;

  // Layout columns: floor labels, lamps, shaft channel.
  const labelW = 72;
  const lampW = 36;
  const shaftLeft = padX + labelW + lampW;
  const shaftRight = w - padX;
  const shaftW = shaftRight - shaftLeft;
  if (shaftW < 80) return;

  // Y-axis: position-meters → pixel. Floors are spaced uniformly even
  // when the underlying positions are too — we space the *labels*
  // along available height so the cockpit reads cleanly regardless of
  // building scale.
  const sortedStops = [...snap.stops].sort((a, b) => a.y - b.y);
  const minY = sortedStops[0]?.y ?? 0;
  const maxY = sortedStops[sortedStops.length - 1]?.y ?? minY + 1;
  const yRange = Math.max(maxY - minY, 0.0001);
  const shaftTop = elevTop + 12;
  const shaftBottom = elevBottom - 12;
  const shaftHeight = shaftBottom - shaftTop;
  const yToPx = (yMeters: number): number =>
    shaftBottom - ((yMeters - minY) / yRange) * shaftHeight;

  // Shaft channel.
  ctx.fillStyle = SHAFT_FILL;
  ctx.fillRect(shaftLeft, shaftTop, shaftW, shaftHeight);
  ctx.strokeStyle = SHAFT_FRAME;
  ctx.lineWidth = 1;
  ctx.strokeRect(shaftLeft + 0.5, shaftTop + 0.5, shaftW - 1, shaftHeight - 1);

  // Floor strips: name on the left, lamps in the lamp column,
  // tick across the shaft.
  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (const stop of sortedStops) {
    const py = yToPx(stop.y);

    // Floor name on the left gutter.
    ctx.fillStyle = FLOOR_LABEL;
    ctx.textAlign = "right";
    ctx.fillText(truncate(stop.name, 11), padX + labelW - 6, py);

    // Hall lamps: ▲ above the floor line, ▼ below. Each is an 18×10
    // hit zone so taps on touch devices land reliably.
    const lampX = padX + labelW + 4;
    const lampZoneW = lampW - 8;
    const lamp = state.hallCallsByStop.get(stop.entity_id);
    drawHallLamp(ctx, lampX, py - 12, lampZoneW, 10, "up", lamp?.up ?? false);
    drawHallLamp(ctx, lampX, py + 2, lampZoneW, 10, "down", lamp?.down ?? false);
    // Top-floor up lamp and bottom-floor down lamp don't make sense
    // physically, but we still register hit zones for them so the
    // canvas click handler can swallow stray clicks without engine
    // errors. The engine rejects invalid directions silently.
    if (stop !== sortedStops[sortedStops.length - 1]) {
      hitZones.push({
        x: lampX,
        y: py - 12,
        w: lampZoneW,
        h: 10,
        kind: "hall-up",
        ref: stop.entity_id,
      });
    }
    if (stop !== sortedStops[0]) {
      hitZones.push({
        x: lampX,
        y: py + 2,
        w: lampZoneW,
        h: 10,
        kind: "hall-down",
        ref: stop.entity_id,
      });
    }

    // Floor tick across the shaft.
    ctx.strokeStyle = FLOOR_TICK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(shaftLeft, py + 0.5);
    ctx.lineTo(shaftRight, py + 0.5);
    ctx.stroke();
  }

  // ─── Cab cutaway ───────────────────────────────────────────────
  // Cockpit scenario locks `cars` at 1; if a future scenario reused
  // this renderer with multiple cars, only `cars[0]` is drawn.
  const car = snap.cars[0];
  if (!car) return;
  drawCabCutaway(ctx, car, snap.stops, shaftLeft, shaftW, yToPx, shaftHeight, hitZones);
}

/**
 * Draw one hall-call lamp (▲ or ▼) with its background pill. Used
 * for both directions; the caller passes the orientation.
 */
function drawHallLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dir: "up" | "down",
  lit: boolean,
): void {
  ctx.fillStyle = lit ? "#fbbf2422" : "transparent";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = lit ? HALL_LAMP_ON : HALL_LAMP_OFF;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = lit ? HALL_LAMP_ON : HALL_LAMP_LABEL;
  ctx.font = "8px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(dir === "up" ? "▲" : "▼", x + w / 2, y + h / 2 + 0.5);
}

/**
 * Render the moving cab as a translucent cutaway inside the shaft.
 * Rider silhouettes are visible through the left interior; the
 * in-cab car-button column lights to the right; doors animate at
 * the cab's bottom edge.
 */
function drawCabCutaway(
  ctx: CanvasRenderingContext2D,
  car: CarDto,
  stops: StopDto[],
  shaftLeft: number,
  shaftW: number,
  yToPx: (m: number) => number,
  shaftHeight: number,
  hitZones: HitZone[],
): void {
  // Cab dimensions: take ~85% of shaft width; height proportional to
  // shaft, capped so it doesn't dominate at very short scenarios.
  const cabW = Math.min(shaftW - 12, 220);
  const cabH = Math.min(Math.max(70, (shaftHeight / Math.max(stops.length, 1)) * 0.92), 110);
  const cx = shaftLeft + shaftW / 2;
  const carPx = yToPx(car.y);
  const cabLeft = cx - cabW / 2;
  const cabTop = carPx - cabH / 2;
  const cabBottom = cabTop + cabH;
  const cabRight = cabLeft + cabW;

  // Translucent cab body.
  ctx.fillStyle = CAB_FILL;
  ctx.fillRect(cabLeft, cabTop, cabW, cabH);
  ctx.strokeStyle = CAB_STROKE;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cabLeft + 0.75, cabTop + 0.75, cabW - 1.5, cabH - 1.5);

  // Subtle interior baseline so riders have a visual floor.
  ctx.strokeStyle = CAB_INTERIOR_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cabLeft + 6, cabBottom - 12.5);
  ctx.lineTo(cabRight - 6, cabBottom - 12.5);
  ctx.stroke();

  // Layout interior: left two-thirds for riders, right third for
  // car-button column. Door bar reserved at the bottom.
  const doorH = 6;
  const interiorTop = cabTop + 6;
  const interiorBottom = cabBottom - doorH - 4;
  const interiorH = interiorBottom - interiorTop;
  const buttonColW = Math.min(48, cabW * 0.28);
  const buttonColX = cabRight - buttonColW - 4;
  const ridersLeft = cabLeft + 8;
  const ridersRight = buttonColX - 6;
  const ridersW = ridersRight - ridersLeft;

  // ── Riders ─────────────────────────────────────────────────
  if (interiorH > 24 && ridersW > 24 && car.riders > 0) {
    const figureCount = Math.min(5, Math.max(1, Math.ceil(car.riders / 2)));
    const targetTotalH = Math.max(28, Math.min(interiorH - 6, 56));
    const headR = Math.max(2.5, targetTotalH / 8.2);
    const floorY = interiorBottom - 2;
    const slotW = Math.min(ridersW / figureCount, 22);
    const startX = ridersLeft + (ridersW - slotW * figureCount) / 2 + slotW / 2;
    for (let i = 0; i < figureCount; i++) {
      const fx = startX + i * slotW;
      const variant = pickRiderVariant(car.id, i);
      drawRider(ctx, fx, floorY, headR, RIDER_COLOR, variant);
    }
  }

  // ── In-cab car-button column ──────────────────────────────
  if (interiorH > 24 && buttonColW > 16) {
    drawCarButtons(ctx, buttonColX, interiorTop, buttonColW, interiorH, stops, car);
  }

  // ── Doors ─────────────────────────────────────────────────
  // Doors live on the cab's bottom edge and split horizontally.
  const doorY = cabBottom - doorH - 2;
  const doorMargin = 8;
  const doorLeft = cabLeft + doorMargin;
  const doorWidth = cabW - doorMargin * 2;
  drawDoors(ctx, doorLeft, doorY, doorWidth, doorH, car);

  // Register the cab door bar (and a generous slice above it) as a
  // doors hit zone so taps on or near the doors toggle them.
  hitZones.push({
    x: doorLeft,
    y: cabBottom - doorH - 14,
    w: doorWidth,
    h: doorH + 18,
    kind: "doors",
    ref: car.id,
  });
}

function drawCarButtons(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: StopDto[],
  car: CarDto,
): void {
  // Single-column stack of round buttons, top floor at the top.
  const sorted = [...stops].sort((a, b) => b.y - a.y);
  const innerPad = 4;
  const cellH = (h - innerPad * 2) / Math.max(sorted.length, 1);
  const r = Math.max(5, Math.min(w / 2 - 4, cellH / 2 - 2));
  ctx.font = `600 ${Math.max(8, Math.round(r))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  sorted.forEach((stop, i) => {
    const cy = y + innerPad + i * cellH + cellH / 2;
    const cxButton = x + w / 2;
    const lit = car.target !== undefined && car.target === stop.entity_id;
    ctx.fillStyle = lit ? CAR_BUTTON_ON_FILL : CAR_BUTTON_OFF_FILL;
    ctx.beginPath();
    ctx.arc(cxButton, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lit ? CAR_BUTTON_ON_STROKE : CAR_BUTTON_OFF_STROKE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = lit ? CAR_BUTTON_ON_LABEL : CAR_BUTTON_OFF_LABEL;
    ctx.fillText(buttonAbbrev(stop.name), cxButton, cy);
  });
}

function drawDoors(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  car: CarDto,
): void {
  let openFrac = 0;
  if (car.phase === "loading") openFrac = 1;
  else if (car.phase === "door-opening" || car.phase === "door-closing") openFrac = 0.5;

  const halfW = w / 2;
  const gap = halfW * openFrac;
  // Threshold backing.
  ctx.fillStyle = DOOR_GAP;
  ctx.fillRect(x, y, w, h);
  // Door slabs.
  ctx.fillStyle = DOOR_FILL;
  ctx.fillRect(x, y, halfW - gap, h);
  ctx.fillRect(x + halfW + gap, y, halfW - gap, h);
}

function buttonAbbrev(name: string): string {
  const num = name.match(/\d+/);
  if (num) return num[0];
  return name.charAt(0).toUpperCase();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
