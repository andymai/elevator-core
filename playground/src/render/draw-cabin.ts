import type { CarDto, Snapshot, StopDto } from "../types";
import { drawRider, pickRiderVariant } from "./figures/rider";

/**
 * Cabin cutaway renderer for the manual-control scenario.
 *
 * Layout split (left → right):
 *   - Shaft column (~35 % of width, capped at 200 px so the cabin
 *     dominates on wide canvases): vertical column showing every stop,
 *     hall-call lamps next to floor names, and small car rectangles
 *     sliding vertically. Selected car is highlighted.
 *   - Cabin cross-section (remaining width): a single large cab seen
 *     from the side. Contains, top-to-bottom:
 *       1. Header strip — floor label on the left, service-mode badge
 *          (AUTO / MANUAL / INSP / OFF) on the right.
 *       2. Cab interior — rider silhouettes standing on the cab floor,
 *          one figure per ~2 riders capped at 4. Greys out for OOS.
 *       3. Car-button panel — 2-column grid of round buttons in the
 *          right interior, lit when the car has dispatched to that
 *          stop (proxy for a pending car-call).
 *       4. Door — animated horizontal slabs at the cab's bottom edge
 *          that part proportionally to the door FSM phase.
 *
 * The renderer stays additive over the existing `CanvasRenderer`
 * pipeline — `renderer.ts` early-exits into this function when the
 * scenario's `manualControl` flag is set, mirroring the tether path.
 */

/** Hall-call lamp state at one stop, keyed by stop entity slot (u32). */
export interface HallLampState {
  up: boolean;
  down: boolean;
}

/**
 * Cabin render state. Keys are u32 entity slots (`CarDto.id`,
 * `StopDto.entity_id`) — the same form the Snapshot DTO carries. The
 * panel converts from its internal full-u64 entity refs (which the
 * mutation API needs) to u32 slots once when pushing this state, so
 * the renderer can match snapshot entries with `===` instead of
 * masking on every lookup.
 */
export interface CabinRenderState {
  /** Slot of the currently focused car, or `null` for "first car". */
  selectedCarSlot: number | null;
  /**
   * Per-car service mode (drives the cabin badge, OOS door colour, OOS
   * rider greying). Keyed by car slot (u32). Empty map = "everyone
   * Normal" — every lookup falls through to the badge default.
   */
  serviceModeByCar: Map<number, string>;
  /**
   * Per-stop hall-call lamp state. Keyed by stop slot (u32). Sourced
   * from `WorldView.stops[i].hall_calls.{up,down}` (the engine's
   * acknowledged-call lamps), not from `waiting_up/waiting_down`
   * (rider counts) — those can disagree in Manual mode where a user
   * spawns a rider without pressing a hall call.
   */
  hallCallsByStop: Map<number, HallLampState>;
}

const CABIN_BG = "#1a1a1f";
const CABIN_INTERIOR = "#16161b";
const CABIN_FRAME = "#3a3a45";
const SHAFT_FILL = "#252530";
const FLOOR_TICK = "#2a2a35";
const FLOOR_LABEL = "#8b8c92";
const HALL_LAMP_OFF = "#2a2a35";
const HALL_LAMP_ON = "#fbbf24";
const RIDER_COLOR = "#a1a1aa";
const RIDER_COLOR_OOS = "#5b5b65";
const CAR_BUTTON_OFF_FILL = "#0f0f12";
const CAR_BUTTON_OFF_STROKE = "#3a3a45";
const CAR_BUTTON_OFF_LABEL = "#8b8c92";
const CAR_BUTTON_ON_FILL = "#fbbf24";
const CAR_BUTTON_ON_STROKE = "#fbbf24";
const CAR_BUTTON_ON_LABEL = "#0f0f12";
const CAR_FILL = "#f59e0b";
const CAR_FILL_DIM = "#a3733b";
const CAR_FILL_OOS = "#5b5b65";
const TEXT_PRIMARY = "#fafafa";
const DOOR_GAP_FILL = "#0f0f12";

export function drawCabinCutaway(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  state: CabinRenderState,
): void {
  if (snap.stops.length === 0 || w <= 0 || h <= 0) return;

  const padding = 14;
  const splitGap = 14;
  // Shaft column is sized as a fraction of canvas with a hard cap so
  // wide desktop canvases don't waste space on the schematic — the
  // cabin is the focal point. Floor in the cap a bit larger than the
  // text width so labels never truncate at small viewports.
  const shaftDesired = Math.round(w * 0.32);
  const shaftW = Math.min(200, Math.max(120, shaftDesired));
  const shaftX = padding;
  const cabinX = shaftX + shaftW + splitGap;
  const cabinW = w - cabinX - padding;
  const topY = padding;
  const bottomY = h - padding;
  if (cabinW < 110) {
    // Very narrow viewport (e.g. mobile portrait pre-stack) — drop
    // the cabin and let the shaft fill the canvas instead of squashing
    // the cab into something illegible.
    drawShaftPanel(ctx, snap, shaftX, topY, w - 2 * padding, bottomY - topY, state);
    return;
  }

  drawShaftPanel(ctx, snap, shaftX, topY, shaftW, bottomY - topY, state);
  drawCabinPanel(ctx, snap, cabinX, topY, cabinW, bottomY - topY, state);
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
  const labelGutter = 56;
  const lampGutter = 8;
  const shaftPad = 6;
  const shaftLeft = x + labelGutter + lampGutter;
  const shaftWidth = Math.max(28, w - labelGutter - lampGutter - shaftPad);
  const shaftTop = y + 16;
  const shaftBottom = y + h - 16;
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
    ctx.fillText(truncate(stop.name, 9), x + labelGutter, py);

    // Hall-call lamps as a vertical pair just outside the shaft's left
    // edge. Sourced from the panel-supplied per-stop hall-call state
    // so the lamps match the call buttons in the side panel exactly.
    const lamp = state.hallCallsByStop.get(stop.entity_id);
    const lampX = x + labelGutter + 2;
    const lampUpY = py - 4;
    const lampDownY = py + 4;
    ctx.fillStyle = lamp?.up ? HALL_LAMP_ON : HALL_LAMP_OFF;
    ctx.fillRect(lampX, lampUpY - 1, 4, 3);
    ctx.fillStyle = lamp?.down ? HALL_LAMP_ON : HALL_LAMP_OFF;
    ctx.fillRect(lampX, lampDownY - 1, 4, 3);
  }

  // Cars: small rectangles. Highlight the selected one.
  const cars = [...snap.cars];
  const carWidth = Math.min(20, (shaftWidth - 4) / Math.max(cars.length, 1) - 4);
  const carHeight = 12;
  cars.forEach((car, i) => {
    const carPx = yToPx(car.y);
    const cx = shaftLeft + shaftWidth / 2 + (i - (cars.length - 1) / 2) * (carWidth + 4);
    const isSelected = state.selectedCarSlot !== null && car.id === state.selectedCarSlot;
    const mode = state.serviceModeByCar.get(car.id) ?? "normal";
    const fill = mode === "outofservice" ? CAR_FILL_OOS : isSelected ? CAR_FILL : CAR_FILL_DIM;
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
): void {
  // Resolve which car to draw inside the cabin frame.
  const selected =
    state.selectedCarSlot !== null
      ? snap.cars.find((c) => c.id === state.selectedCarSlot)
      : snap.cars[0];
  const serviceMode =
    selected !== undefined ? (state.serviceModeByCar.get(selected.id) ?? "normal") : "normal";

  // Cabin frame — a single rounded rect covering the full available
  // area, with all interior layout in `cabin`-local coordinates.
  const cabinTop = y + 4;
  const cabinBottom = y + h - 4;
  const cabinLeft = x;
  const cabinRight = x + w;
  const cabinHeight = cabinBottom - cabinTop;
  const cabinW = cabinRight - cabinLeft;

  drawRoundedRect(ctx, cabinLeft, cabinTop, cabinW, cabinHeight, 8, CABIN_BG, CABIN_FRAME);

  // ── Header strip: floor label + service-mode badge ──
  const headerTop = cabinTop + 8;
  const headerH = 22;
  const headerBaseline = headerTop + headerH / 2;
  const floorText = floorLabel(selected, snap.stops);
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(floorText, cabinLeft + 14, headerBaseline);
  if (selected !== undefined) {
    drawServiceBadge(ctx, cabinRight - 14, headerBaseline, serviceMode);
  }

  // Header divider.
  ctx.strokeStyle = CABIN_FRAME;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cabinLeft + 8, headerTop + headerH + 0.5);
  ctx.lineTo(cabinRight - 8, headerTop + headerH + 0.5);
  ctx.stroke();

  // ── Interior region (riders + button panel) ──
  // Reserve space at the bottom for the door bar.
  const doorH = 10;
  const interiorTop = headerTop + headerH + 6;
  const interiorBottom = cabinBottom - doorH - 4;
  const interiorH = interiorBottom - interiorTop;
  // Inset interior slightly inside the cabin so the riders don't
  // touch the frame.
  const interiorLeft = cabinLeft + 10;
  const interiorRight = cabinRight - 10;
  // Skip interior + door entirely on extremely short canvases — the
  // header strip is the only thing that fits without overdrawing.
  if (interiorH < 24) return;
  drawRoundedRect(
    ctx,
    interiorLeft,
    interiorTop,
    interiorRight - interiorLeft,
    interiorH,
    4,
    CABIN_INTERIOR,
    CABIN_FRAME,
  );

  // Car-button panel sits in the right-interior. Take 32 % of the
  // interior width with a 60 px floor and an 80 px cap. The `Math.max`
  // wraps the multiplication so the floor actually applies — without
  // the inner placement, narrow cabins produced a ~28 px panel whose
  // 2-column cells were narrower than the button radius and visually
  // overlapped.
  const buttonPanelW = Math.min(80, Math.max(60, (interiorRight - interiorLeft) * 0.32));
  const buttonPanelH = Math.min(interiorH - 12, 110);
  const buttonPanelX = interiorRight - 6 - buttonPanelW;
  const buttonPanelY = interiorTop + 6;
  drawCarButtonPanel(
    ctx,
    buttonPanelX,
    buttonPanelY,
    buttonPanelW,
    buttonPanelH,
    snap.stops,
    selected,
  );

  // Riders: stand on the interior floor, distributed across the width
  // *not* taken by the button panel. Body height tuned to interior so
  // figures fit even at smaller cabin heights.
  drawCabRiders(
    ctx,
    interiorLeft + 8,
    interiorTop + 6,
    buttonPanelX - interiorLeft - 14,
    interiorH - 12,
    selected,
    serviceMode,
  );

  // ── Door at the bottom ──
  drawCabDoor(
    ctx,
    cabinLeft + 14,
    cabinBottom - 6,
    cabinRight - cabinLeft - 28,
    doorH,
    selected,
    serviceMode,
  );
}

function drawCabRiders(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  selected: CarDto | undefined,
  serviceMode: string,
): void {
  const riderCount = selected?.riders ?? 0;
  if (riderCount === 0 || w < 30 || h < 30) return;
  // One figure per ~2 riders, capped so the cab doesn't get crowded.
  const figureCount = Math.min(4, Math.max(1, Math.ceil(riderCount / 2)));
  // Fit the figure body to the interior height. drawRider's standard
  // variant has total height ≈ headR × 8.2; reserve 6 px of headroom.
  const targetTotalH = Math.max(28, Math.min(h - 6, 56));
  const headR = Math.max(2.5, targetTotalH / 8.2);
  const floorY = y + h - 2;
  const slotW = Math.min(w / figureCount, 22);
  const startX = x + (w - slotW * figureCount) / 2 + slotW / 2;
  const carIdNum = selected !== undefined ? selected.id : 0;
  const color = serviceMode === "outofservice" ? RIDER_COLOR_OOS : RIDER_COLOR;
  for (let i = 0; i < figureCount; i++) {
    const fx = startX + i * slotW;
    const variant = pickRiderVariant(carIdNum, i);
    drawRider(ctx, fx, floorY, headR, color, variant);
  }
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
  drawRoundedRect(ctx, x, y, w, h, 4, "#0f0f12", CABIN_FRAME);
  const sorted = [...stops].sort((a, b) => b.y - a.y);
  const cols = 2;
  const rows = Math.ceil(sorted.length / cols);
  const innerPad = 5;
  const cellW = (w - innerPad * 2) / cols;
  const cellH = (h - innerPad * 2) / Math.max(rows, 1);
  const r = Math.max(7, Math.min(cellW, cellH) / 2 - 3);
  ctx.font = `600 ${Math.max(8, Math.round(r))}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  sorted.forEach((stop, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + innerPad + col * cellW + cellW / 2;
    const cy = y + innerPad + row * cellH + cellH / 2;
    const lit =
      selected !== undefined && selected.target !== undefined && selected.target === stop.entity_id;
    ctx.fillStyle = lit ? CAR_BUTTON_ON_FILL : CAR_BUTTON_OFF_FILL;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lit ? CAR_BUTTON_ON_STROKE : CAR_BUTTON_OFF_STROKE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = lit ? CAR_BUTTON_ON_LABEL : CAR_BUTTON_OFF_LABEL;
    ctx.fillText(buttonAbbrev(stop.name), cx, cy);
  });
}

function drawCabDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  selected: CarDto | undefined,
  serviceMode: string,
): void {
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
  // Door-gap background so the parted slabs look like they reveal a
  // dark threshold rather than the cabin's dark interior.
  ctx.fillStyle = DOOR_GAP_FILL;
  ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y - h, halfW - gap, h);
  ctx.fillRect(x + halfW + gap, y - h, halfW - gap, h);
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
  normal: { label: "AUTO", bg: "#22c55e2a", fg: "#22c55e" },
  manual: { label: "MANUAL", bg: "#fbbf2433", fg: "#fbbf24" },
  inspection: { label: "INSP", bg: "#a78bfa33", fg: "#a78bfa" },
  outofservice: { label: "OFF", bg: "#ef44443a", fg: "#ef4444" },
  independent: { label: "IND", bg: "#a1a1aa33", fg: "#a1a1aa" },
};

function drawServiceBadge(
  ctx: CanvasRenderingContext2D,
  rightX: number,
  centerY: number,
  serviceMode: string,
): void {
  const style = SERVICE_BADGE_STYLES[serviceMode] ?? SERVICE_BADGE_STYLES["normal"];
  if (!style) return;
  ctx.font = "700 10px system-ui, sans-serif";
  const padX = 8;
  const padY = 5;
  const metrics = ctx.measureText(style.label);
  const w = metrics.width + padX * 2;
  const h = 12 + padY * 2;
  const left = rightX - w;
  const top = centerY - h / 2;
  drawRoundedRect(ctx, left, top, w, h, 4, style.bg, style.fg);
  ctx.fillStyle = style.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.label, left + w / 2, top + h / 2);
  // Reset text alignment for subsequent draws.
  ctx.textAlign = "left";
}

function floorLabel(car: CarDto | undefined, stops: StopDto[]): string {
  if (!car) return "—";
  const tolerance = 0.25;
  const stop = stops.find((s) => Math.abs(s.y - car.y) < tolerance);
  if (stop) return stop.name;
  return "Between floors";
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
