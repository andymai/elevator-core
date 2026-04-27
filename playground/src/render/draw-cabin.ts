import type { CarDto, Snapshot, StopDto } from "../types";
import { drawRider, pickRiderVariant } from "./figures/rider";

/**
 * Cabin cutaway renderer for the manual-control scenario.
 *
 * Layout split:
 *   - Left 40 %: vertical shaft column showing every stop, hall-call
 *     lamps next to each floor name, and small car rectangles sliding
 *     vertically. A miniature of the building view, slimmed for the
 *     side panel's tighter horizontal budget.
 *   - Right 60 %: a single large cabin cross-section showing the
 *     focused car. Floor label at the top (current floor or "between"),
 *     rider silhouettes inside the cab (count proportional to load),
 *     a 3×2 car-button panel in the lower-right, and an animated door
 *     opening at the bottom edge that follows door FSM progress.
 *
 * The renderer stays additive over the existing `CanvasRenderer`
 * pipeline — `renderer.ts` early-exits into this function when the
 * scenario's `manualControl` flag is set, mirroring the tether path.
 */
export interface CabinRenderState {
  /** Currently focused car entity ref, or `null` for "first car". */
  selectedCarId: bigint | null;
}

const CABIN_BG = "#1a1a1f";
const CABIN_FRAME = "#3a3a45";
const SHAFT_FILL = "#252530";
const FLOOR_TICK = "#3a3a45";
const FLOOR_LABEL = "#8b8c92";
const HALL_LAMP_OFF = "#3a3a45";
const HALL_LAMP_ON = "#fbbf24";
const RIDER_COLOR = "#a1a1aa";
const CAR_BUTTON_OFF = "#252530";
const CAR_BUTTON_ON = "#fbbf24";
const CAR_FILL = "#f59e0b";
const CAR_FILL_OOS = "#5b5b65";
const TEXT_PRIMARY = "#fafafa";

export function drawCabinCutaway(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  state: CabinRenderState,
  carServiceMode: Map<bigint, string>,
): void {
  if (snap.stops.length === 0 || w <= 0 || h <= 0) return;

  const padding = 14;
  const splitGap = 18;
  const shaftW = Math.max(120, Math.round(w * 0.4) - splitGap / 2);
  const shaftX = padding;
  const cabinX = shaftX + shaftW + splitGap;
  const cabinW = w - cabinX - padding;
  const topY = padding;
  const bottomY = h - padding;
  if (cabinW < 80) {
    // Very narrow viewport — fall back to shaft only.
    drawShaftPanel(ctx, snap, shaftX, topY, w - 2 * padding, bottomY - topY, state);
    return;
  }

  drawShaftPanel(ctx, snap, shaftX, topY, shaftW, bottomY - topY, state);
  drawCabinPanel(ctx, snap, cabinX, topY, cabinW, bottomY - topY, state, carServiceMode);
}

function drawShaftPanel(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  x: number,
  y: number,
  w: number,
  h: number,
  state: CabinRenderState,
): void {
  // Compute axis bounds from stop positions.
  const sortedStops = [...snap.stops].sort((a, b) => a.y - b.y);
  const minY = sortedStops[0]?.y ?? 0;
  const maxY = sortedStops[sortedStops.length - 1]?.y ?? minY + 1;
  const yRange = Math.max(maxY - minY, 0.0001);

  // Shaft rect — a single column straddling all stops.
  const shaftPad = 6;
  const shaftLeft = x + 64; // leave room for floor labels
  const shaftWidth = Math.max(24, w - 64 - shaftPad);
  const shaftTop = y + 12;
  const shaftBottom = y + h - 12;
  const shaftHeight = shaftBottom - shaftTop;

  // Shaft fill.
  ctx.fillStyle = SHAFT_FILL;
  ctx.fillRect(shaftLeft, shaftTop, shaftWidth, shaftHeight);
  ctx.strokeStyle = CABIN_FRAME;
  ctx.lineWidth = 1;
  ctx.strokeRect(shaftLeft + 0.5, shaftTop + 0.5, shaftWidth - 1, shaftHeight - 1);

  const yToPx = (yMeters: number): number =>
    shaftBottom - ((yMeters - minY) / yRange) * shaftHeight;

  // Floor lines + labels + hall lamps. Iterate top→bottom for visual order.
  ctx.font = "10px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (const stop of [...snap.stops].sort((a, b) => b.y - a.y)) {
    const py = yToPx(stop.y);
    ctx.strokeStyle = FLOOR_TICK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(shaftLeft, py + 0.5);
    ctx.lineTo(shaftLeft + shaftWidth, py + 0.5);
    ctx.stroke();

    ctx.fillStyle = FLOOR_LABEL;
    ctx.textAlign = "right";
    ctx.fillText(truncate(stop.name, 9), shaftLeft - 8, py);

    // Hall-call lamps as a tiny vertical pair on the shaft's left edge.
    const lampX = shaftLeft - 4;
    const lampUpY = py - 4;
    const lampDownY = py + 4;
    if (stop.waiting_up > 0) {
      ctx.fillStyle = HALL_LAMP_ON;
    } else {
      ctx.fillStyle = HALL_LAMP_OFF;
    }
    ctx.fillRect(lampX, lampUpY - 1, 3, 2);
    if (stop.waiting_down > 0) {
      ctx.fillStyle = HALL_LAMP_ON;
    } else {
      ctx.fillStyle = HALL_LAMP_OFF;
    }
    ctx.fillRect(lampX, lampDownY - 1, 3, 2);
  }

  // Cars: small rectangles. Highlight the selected one.
  const carWidth = Math.min(18, shaftWidth * 0.8);
  const carHeight = 10;
  const cars = [...snap.cars];
  // Side-by-side if multiple cars share the shaft.
  cars.forEach((car, i) => {
    const carPx = yToPx(car.y);
    const cx = shaftLeft + shaftWidth / 2 + (i - (cars.length - 1) / 2) * (carWidth + 4);
    const isSelected = state.selectedCarId !== null && BigInt(car.id) === state.selectedCarId;
    const fill = isSelected ? CAR_FILL : "#a3733b";
    ctx.fillStyle = fill;
    ctx.fillRect(cx - carWidth / 2, carPx - carHeight / 2, carWidth, carHeight);
    if (isSelected) {
      ctx.strokeStyle = TEXT_PRIMARY;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        cx - carWidth / 2 + 0.5,
        carPx - carHeight / 2 + 0.5,
        carWidth - 1,
        carHeight - 1,
      );
    }
  });
}

function drawCabinPanel(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  x: number,
  y: number,
  w: number,
  h: number,
  state: CabinRenderState,
  serviceModes: Map<bigint, string>,
): void {
  // Resolve which car to draw inside the cabin frame.
  const selected =
    state.selectedCarId !== null
      ? snap.cars.find((c) => BigInt(c.id) === state.selectedCarId)
      : snap.cars[0];
  const serviceMode =
    selected !== undefined ? (serviceModes.get(BigInt(selected.id)) ?? "normal") : "normal";

  // Cabin frame with rounded corners.
  const cabinTop = y + 26;
  const cabinBottom = y + h - 16;
  const cabinHeight = cabinBottom - cabinTop;
  const cabinLeft = x + 6;
  const cabinRight = x + w - 6;
  const cabinW = cabinRight - cabinLeft;

  drawRoundedRect(ctx, cabinLeft, cabinTop, cabinW, cabinHeight, 6, CABIN_BG, CABIN_FRAME);

  // Header: floor label + service mode badge.
  const floorText = floorLabel(selected, snap.stops);
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(floorText, cabinLeft + 10, y + 18);

  // Service mode badge on the right.
  if (selected !== undefined) {
    drawServiceBadge(ctx, cabinRight - 4, y + 18, serviceMode);
  }

  // Rider silhouettes inside the cab. One figure per ~5 riders, capped
  // at 4 figures so the cab doesn't get crowded; OutOfService greys the
  // figures.
  const riderCount = selected?.riders ?? 0;
  const figureCount = Math.min(4, Math.max(0, Math.ceil(riderCount / 2)));
  const cabFloorY = cabinBottom - 30;
  const headR = Math.min(6, cabinHeight / 12);
  if (figureCount > 0) {
    const slotW = cabinW / (figureCount + 1);
    const carIdNum = selected !== undefined ? selected.id : 0;
    for (let i = 0; i < figureCount; i++) {
      const fx = cabinLeft + slotW * (i + 1);
      const variant = pickRiderVariant(carIdNum, i);
      const color = serviceMode === "outofservice" ? "#5b5b65" : RIDER_COLOR;
      drawRider(ctx, fx, cabFloorY, headR, color, variant);
    }
  }

  // Car-button panel: 3×2 grid in the lower-right corner. Lit when the
  // car has dispatched to that stop (proxy for an active car-call —
  // car-call queue isn't in Snapshot DTOs).
  drawCarButtonPanel(
    ctx,
    cabinRight - 70,
    cabinTop + 8,
    62,
    Math.min(96, cabinHeight * 0.55),
    snap.stops,
    selected,
  );

  // Door at the bottom: animated based on the door FSM. The Snapshot
  // DTO carries the phase as a string; use that to drive opening width.
  drawCabDoor(ctx, cabinLeft + 4, cabinBottom - 4, cabinW - 8, selected, serviceMode);
}

function drawCarButtonPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: StopDto[],
  selected: CarDto | undefined,
): void {
  drawRoundedRect(ctx, x, y, w, h, 4, "#0f0f12", "#3a3a45");
  const sorted = [...stops].sort((a, b) => b.y - a.y);
  const cols = 2;
  const rows = Math.ceil(sorted.length / cols);
  const cellW = (w - 8) / cols;
  const cellH = (h - 8) / Math.max(rows, 1);
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  sorted.forEach((stop, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + 4 + col * cellW + cellW / 2;
    const cy = y + 4 + row * cellH + cellH / 2;
    const r = Math.min(cellW, cellH) / 2 - 2;
    const lit =
      selected !== undefined && selected.target !== undefined && selected.target === stop.entity_id;
    ctx.fillStyle = lit ? CAR_BUTTON_ON : CAR_BUTTON_OFF;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lit ? "#fbbf24" : "#3a3a45";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = lit ? "#0f0f12" : FLOOR_LABEL;
    ctx.fillText(buttonAbbrev(stop.name), cx, cy);
  });
}

function drawCabDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  selected: CarDto | undefined,
  serviceMode: string,
): void {
  const doorH = 4;
  // Phase-based open fraction. The Snapshot's CarDto.phase covers
  // door-opening / loading (open) / door-closing / others (closed).
  let openFrac = 0;
  if (selected !== undefined) {
    if (selected.phase === "loading") openFrac = 1;
    else if (selected.phase === "door-opening") openFrac = 0.5;
    else if (selected.phase === "door-closing") openFrac = 0.5;
    else openFrac = 0;
  }
  const halfW = w / 2;
  const gap = halfW * openFrac;
  const fill = serviceMode === "outofservice" ? CAR_FILL_OOS : CAR_FILL;
  ctx.fillStyle = fill;
  // Left door panel.
  ctx.fillRect(x, y - doorH, halfW - gap, doorH);
  // Right door panel.
  ctx.fillRect(x + halfW + gap, y - doorH, halfW - gap, doorH);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

interface ServiceBadgeStyle {
  label: string;
  bg: string;
  fg: string;
}

const SERVICE_BADGE_STYLES: Record<string, ServiceBadgeStyle> = {
  normal: { label: "AUTO", bg: "#22c55e22", fg: "#22c55e" },
  manual: { label: "MANUAL", bg: "#fbbf2433", fg: "#fbbf24" },
  inspection: { label: "INSP", bg: "#a78bfa33", fg: "#a78bfa" },
  outofservice: { label: "OFF", bg: "#ef444433", fg: "#ef4444" },
  independent: { label: "IND", bg: "#a1a1aa33", fg: "#a1a1aa" },
};

function drawServiceBadge(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  baselineY: number,
  serviceMode: string,
): void {
  const style = SERVICE_BADGE_STYLES[serviceMode] ?? SERVICE_BADGE_STYLES["normal"];
  if (!style) return;
  ctx.font = "600 9px system-ui, sans-serif";
  const padX = 6;
  const metrics = ctx.measureText(style.label);
  const w = metrics.width + padX * 2;
  const h = 14;
  drawRoundedRect(ctx, rightX - w, baselineY - h + 2, w, h, 3, style.bg, style.fg);
  ctx.fillStyle = style.fg;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(style.label, rightX - padX, baselineY - h / 2 + 2);
  // Reset text alignment.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function floorLabel(car: CarDto | undefined, stops: StopDto[]): string {
  if (!car) return "—";
  // "At Floor 3" if the car is exactly at a stop; "Between" otherwise.
  const tolerance = 0.25;
  const stop = stops.find((s) => Math.abs(s.y - car.y) < tolerance);
  if (stop) return stop.name;
  return "Between";
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
