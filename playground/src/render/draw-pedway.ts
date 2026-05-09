import type { CarDto, Snapshot, StopDto } from "../types";
import { withAlpha } from "./color-utils";
import type { Scale } from "./layout";
import { CAR_DOT_COLOR, STOP_LABEL, UP_COLOR } from "./palette";
import { roundedRect } from "./primitives";

/**
 * Pedway (horizontal line) rendering. The simulation still runs along
 * a 1D axis; this module maps that axis onto canvas X and stacks each
 * horizontal line as a lane. The first line lands on top with a
 * right-pointing chevron, subsequent lines below with left-pointing
 * chevrons; chevrons express a visual direction bias since the engine
 * doesn't model directional tracks.
 */

const CEILING_BAND_PX = 18;
const FLOOR_BAND_PX = 22;
const LANE_GAP_PX = 14;
const STATION_LABEL_GAP = 6;
const CHEVRON_PX = 8;
const CHEVRON_ALPHAS = [0.55, 0.25] as const;

function drawConcourseBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  laneLeft: number,
  laneRight: number,
): void {
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, CEILING_BAND_PX);
  ceilGrad.addColorStop(0, "rgba(245, 158, 11, 0.06)");
  ceilGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = ceilGrad;
  ctx.fillRect(0, 0, w, CEILING_BAND_PX);
  ctx.strokeStyle = withAlpha("#f59e0b", 0.18);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CEILING_BAND_PX + 0.5);
  ctx.lineTo(w, CEILING_BAND_PX + 0.5);
  ctx.stroke();

  const floorTop = h - FLOOR_BAND_PX;
  ctx.fillStyle = "rgba(20, 20, 26, 0.8)";
  ctx.fillRect(0, floorTop, w, FLOOR_BAND_PX);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  // Tile stride scales with lane width so phones and desktops both
  // get roughly the same visual cadence between marks.
  const stride = Math.max(24, Math.min(48, (laneRight - laneLeft) / 18));
  ctx.beginPath();
  for (let x = laneLeft; x <= laneRight; x += stride) {
    ctx.moveTo(x, floorTop + 4);
    ctx.lineTo(x, h - 4);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath();
  ctx.moveTo(0, floorTop + 0.5);
  ctx.lineTo(w, floorTop + 0.5);
  ctx.stroke();
}

interface LaneLayout {
  lineId: number;
  name: string;
  cy: number;
  top: number;
  bottom: number;
  /** +1 = chevron points right, -1 = left. */
  dir: 1 | -1;
}

// Lane height is capped so portrait viewports (where vertical room is
// generous but the long-axis story is along x) don't stretch each
// track into a tall empty band.
function computeLanes(
  laneTop: number,
  laneBottom: number,
  ids: readonly number[],
  nameOf: (id: number) => string,
): LaneLayout[] {
  const MAX_LANE_H = 64;
  const laneCount = ids.length;
  const totalH = laneBottom - laneTop;
  const naturalLaneH = (totalH - LANE_GAP_PX * (laneCount - 1)) / laneCount;
  const laneH = Math.min(MAX_LANE_H, naturalLaneH);
  const stackH = laneH * laneCount + LANE_GAP_PX * (laneCount - 1);
  const stackTop = laneTop + Math.max(0, (totalH - stackH) / 2);
  const lanes: LaneLayout[] = [];
  for (let i = 0; i < laneCount; i++) {
    const id = ids[i];
    if (id === undefined) continue;
    const top = stackTop + i * (laneH + LANE_GAP_PX);
    const bottom = top + laneH;
    lanes.push({
      lineId: id,
      name: nameOf(id),
      cy: (top + bottom) / 2,
      top,
      bottom,
      dir: i === 0 ? 1 : -1,
    });
  }
  return lanes;
}

function drawLane(
  ctx: CanvasRenderingContext2D,
  lane: LaneLayout,
  laneLeft: number,
  laneRight: number,
): void {
  ctx.fillStyle = "rgba(10, 12, 16, 0.55)";
  ctx.fillRect(laneLeft, lane.top, laneRight - laneLeft, lane.bottom - lane.top);
  ctx.strokeStyle = "rgba(58, 58, 69, 0.7)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    laneLeft + 0.5,
    lane.top + 0.5,
    laneRight - laneLeft - 1,
    lane.bottom - lane.top - 1,
  );
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(laneLeft + 4, lane.cy);
  ctx.lineTo(laneRight - 4, lane.cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Two stacked chevrons: leading at full alpha, trailing as a faded
  // afterimage to imply motion.
  const baseX = lane.dir === 1 ? laneLeft + 6 : laneRight - 6;
  const halfH = CHEVRON_PX / 2;
  for (let i = 0; i < CHEVRON_ALPHAS.length; i++) {
    const x = baseX - lane.dir * i * (CHEVRON_PX + 2);
    ctx.fillStyle = withAlpha("#f59e0b", CHEVRON_ALPHAS[i] ?? 0);
    ctx.beginPath();
    ctx.moveTo(x, lane.cy - halfH);
    ctx.lineTo(x + lane.dir * CHEVRON_PX, lane.cy);
    ctx.lineTo(x, lane.cy + halfH);
    ctx.closePath();
    ctx.fill();
  }
}

function drawStations(
  ctx: CanvasRenderingContext2D,
  stops: StopDto[],
  toScreenX: (pos: number) => number,
  topLaneY: number,
  bottomLaneY: number,
  floorY: number,
  canvasW: number,
  s: Scale,
): void {
  ctx.font = `500 ${s.fontMain}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "top";
  for (const stop of stops) {
    const x = toScreenX(stop.y);
    ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
    ctx.fillRect(x - 3, topLaneY - 4, 6, bottomLaneY - topLaneY + 8);
    ctx.strokeStyle = withAlpha("#f59e0b", 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 3, topLaneY - 4);
    ctx.lineTo(x - 3, bottomLaneY + 4);
    ctx.moveTo(x + 3, topLaneY - 4);
    ctx.lineTo(x + 3, bottomLaneY + 4);
    ctx.stroke();
    // Clamp the label so the leftmost / rightmost station name doesn't
    // slip off-canvas on narrow portrait widths.
    ctx.fillStyle = STOP_LABEL;
    const labelW = ctx.measureText(stop.name).width;
    let alignX = x;
    let align: CanvasTextAlign = "center";
    if (x - labelW / 2 < 4) {
      align = "left";
      alignX = 4;
    } else if (x + labelW / 2 > canvasW - 4) {
      align = "right";
      alignX = canvasW - 4;
    }
    ctx.textAlign = align;
    ctx.fillText(stop.name, alignX, floorY + STATION_LABEL_GAP);
  }
}

function drawWaitingCount(
  ctx: CanvasRenderingContext2D,
  count: number,
  cx: number,
  cy: number,
  s: Scale,
): void {
  if (count <= 0) return;
  ctx.font = `600 ${s.fontSmall}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = count > 99 ? "99+" : String(count);
  const padX = 4;
  const w = ctx.measureText(label).width + padX * 2;
  const hPx = s.fontSmall + 4;
  roundedRect(ctx, cx - w / 2, cy - hPx / 2, w, hPx, hPx / 2);
  ctx.fillStyle = "rgba(8, 10, 14, 0.72)";
  ctx.fill();
  ctx.strokeStyle = withAlpha(UP_COLOR, 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = withAlpha(UP_COLOR, 0.95);
  ctx.fillText(label, cx, cy + 0.5);
}

// Phase colors for the train body. Distinct from `PHASE_COLORS` in
// palette.ts (which is tuned for vertical-shaft cars) — the pedway
// glyph reads better at low contrast against the indoor backdrop.
const TRAIN_BODY_COLORS: Partial<Record<CarDto["phase"], string>> = {
  loading: "rgba(28, 50, 70, 0.95)",
  "door-opening": "rgba(60, 42, 12, 0.95)",
  "door-closing": "rgba(60, 42, 12, 0.95)",
  moving: "rgba(50, 38, 12, 0.95)",
};
const TRAIN_BODY_DEFAULT = "rgba(35, 40, 50, 0.95)";

function drawTrain(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  trainW: number,
  trainH: number,
  dir: 1 | -1,
  car: CarDto,
): void {
  const left = cx - trainW / 2;
  const top = cy - trainH / 2;
  const r = Math.min(4, trainH / 2);
  const nose = trainH * 0.4;
  // Path is authored with the chamfered nose on the right; mirror via
  // canvas transform when the train points left so the body shape
  // stays a single beginPath sequence.
  ctx.save();
  if (dir === -1) {
    ctx.translate(2 * cx, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = TRAIN_BODY_COLORS[car.phase] ?? TRAIN_BODY_DEFAULT;
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(left + trainW - nose, top);
  ctx.lineTo(left + trainW, cy);
  ctx.lineTo(left + trainW - nose, top + trainH);
  ctx.lineTo(left + r, top + trainH);
  ctx.arcTo(left, top + trainH, left, top + trainH - r, r);
  ctx.lineTo(left, top + r);
  ctx.arcTo(left, top, left + r, top, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 188, 205, 0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const winInsetX = trainH * 0.45;
  const winTop = top + trainH * 0.32;
  const winH = trainH * 0.36;
  const winLeft = left + winInsetX;
  const winRight = left + trainW - winInsetX;
  if (winRight > winLeft) {
    ctx.fillStyle = "rgba(170, 220, 255, 0.18)";
    ctx.fillRect(winLeft, winTop, winRight - winLeft, winH);
    ctx.strokeStyle = "rgba(8, 10, 14, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const mullionStride = 10;
    for (let mx = winLeft + mullionStride; mx < winRight; mx += mullionStride) {
      ctx.moveTo(mx, winTop);
      ctx.lineTo(mx, winTop + winH);
    }
    ctx.stroke();
  }

  if (car.riders > 0 && winRight - winLeft > 6) {
    const dotR = Math.min(1.6, winH / 4);
    const dotStride = 5;
    const maxDots = Math.floor((winRight - winLeft - 6) / dotStride);
    const drawDots = Math.min(car.riders, Math.max(1, maxDots));
    ctx.fillStyle = withAlpha(CAR_DOT_COLOR, 0.85);
    for (let i = 0; i < drawDots; i++) {
      const dx = winLeft + 4 + i * dotStride;
      ctx.beginPath();
      ctx.arc(dx, winTop + winH / 2, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Single-pass minimum gap between consecutive stop x-positions after
// sorting; falls back to 100 px when no positive gap exists.
function minStopGapPx(stops: readonly StopDto[], toScreenX: (y: number) => number): number {
  const sortedX = stops.map((stp) => toScreenX(stp.y)).sort((a, b) => a - b);
  let g = Infinity;
  for (let i = 1; i < sortedX.length; i++) {
    const cur = sortedX[i];
    const prev = sortedX[i - 1];
    if (cur === undefined || prev === undefined) continue;
    const d = cur - prev;
    if (d > 0 && d < g) g = d;
  }
  return Number.isFinite(g) ? g : 100;
}

/** Top-level entry — call from the main renderer when a horizontal line exists. */
export function drawPedwayScene(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  s: Scale,
): void {
  // Pick lines we know how to render. Vertical lines mixed in are
  // ignored for now — the airport scenario has only horizontal lines.
  const horizontalLineIds: number[] = [];
  for (const ln of snap.lines) {
    if (ln.orientation === "horizontal") horizontalLineIds.push(ln.id);
  }
  if (horizontalLineIds.length === 0 || snap.stops.length < 2) return;
  // Stable ascending order so lane assignment is deterministic frame to frame.
  horizontalLineIds.sort((a, b) => a - b);

  // X-axis range: span min..max stop position, with a small pad so the
  // outermost stations don't sit flush against the canvas edge.
  let minPos = snap.stops[0]?.y ?? 0;
  let maxPos = minPos;
  for (const stop of snap.stops) {
    if (stop.y < minPos) minPos = stop.y;
    if (stop.y > maxPos) maxPos = stop.y;
  }
  const range = Math.max(1e-6, maxPos - minPos);
  const sidePad = Math.max(48, s.padX + 30);
  const laneLeft = sidePad;
  const laneRight = w - sidePad;
  const toScreenX = (pos: number): number =>
    laneLeft + ((pos - minPos) / range) * (laneRight - laneLeft);

  const headerH = 14;
  const stationLabelH = s.fontMain + STATION_LABEL_GAP + 4;
  const lanesTop = CEILING_BAND_PX + headerH;
  const lanesBottom = h - FLOOR_BAND_PX - stationLabelH;
  const nameOf = (id: number): string =>
    snap.lines.find((ln) => ln.id === id)?.name ?? `Line ${id}`;
  const lanes = computeLanes(lanesTop, lanesBottom, horizontalLineIds, nameOf);

  drawConcourseBackdrop(ctx, w, h, laneLeft, laneRight);

  for (const lane of lanes) {
    drawLane(ctx, lane, laneLeft, laneRight);
  }

  ctx.font = `500 ${s.fontSmall}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.fillStyle = STOP_LABEL;
  for (const lane of lanes) {
    if (lane.dir === 1) {
      ctx.textAlign = "left";
      ctx.fillText(`${lane.name} →`, laneLeft + 18, lane.top - 2);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(`← ${lane.name}`, laneRight - 18, lane.top - 2);
    }
  }

  const topLaneY = lanes[0]?.top ?? lanesTop;
  const bottomLaneY = lanes[lanes.length - 1]?.bottom ?? lanesBottom;
  drawStations(ctx, snap.stops, toScreenX, topLaneY, bottomLaneY, h - FLOOR_BAND_PX, w, s);

  // Train width scales with the line's stop spacing so it reads as a
  // train (long-thin) rather than an elevator car (~square).
  const trainW = Math.max(36, Math.min(110, minStopGapPx(snap.stops, toScreenX) * 0.55));
  const laneH = lanes[0] ? lanes[0].bottom - lanes[0].top : 24;
  const trainH = Math.max(14, Math.min(28, laneH * 0.7));

  const laneByLineId = new Map<number, LaneLayout>();
  for (const lane of lanes) laneByLineId.set(lane.lineId, lane);

  for (const car of snap.cars) {
    const lane = laneByLineId.get(car.line);
    if (lane === undefined) continue;
    drawTrain(ctx, toScreenX(car.y), lane.cy, trainW, trainH, lane.dir, car);
  }

  // Per-lane waiting badges via `waiting_by_line` — using the
  // aggregate `stop.waiting` would conflate riders bound for opposite
  // directions onto a single count.
  const badgeOffset = 8;
  for (const stop of snap.stops) {
    if (stop.waiting === 0) continue;
    const x = toScreenX(stop.y);
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      if (lane === undefined) continue;
      const slice = stop.waiting_by_line.find((w) => w.line === lane.lineId);
      const count = slice?.count ?? 0;
      if (count === 0) continue;
      const cy = i === 0 ? lane.top - badgeOffset : lane.bottom + badgeOffset;
      drawWaitingCount(ctx, count, x, cy, s);
    }
  }
}
