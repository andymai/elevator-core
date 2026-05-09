import type { CarDto, Snapshot, StopDto } from "../types";
import { withAlpha } from "./color-utils";
import type { Scale } from "./layout";
import { CAR_DOT_COLOR, STOP_LABEL, UP_COLOR } from "./palette";

/**
 * Pedway (horizontal line) rendering. Triggered when any line in the
 * snapshot reports `orientation: "horizontal"`. The simulation still
 * runs along a 1D axis; the renderer just maps that axis onto the
 * canvas X axis and stacks each line as a horizontal lane.
 *
 * Layout convention: the first horizontal line is drawn as the top
 * lane (outbound, right-pointing chevron); the second is the bottom
 * lane (inbound, left-pointing chevron). Future scenarios with more
 * than two horizontal lines fall through to a generic stack.
 */

const CEILING_BAND_PX = 18;
const FLOOR_BAND_PX = 22;
const LANE_GAP_PX = 14;
const STATION_LABEL_GAP = 6;
/** Chevron triangle marker height; doubles as the lane header offset. */
const CHEVRON_PX = 8;

/** Subtle indoor concourse atmosphere: warm ceiling band, tiled floor. */
function drawConcourseBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  laneLeft: number,
  laneRight: number,
): void {
  // Ceiling band — faint warm glow suggesting concourse lighting.
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, CEILING_BAND_PX);
  ceilGrad.addColorStop(0, "rgba(245, 158, 11, 0.06)");
  ceilGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = ceilGrad;
  ctx.fillRect(0, 0, w, CEILING_BAND_PX);
  // Hairline at the ceiling's lower edge so the band reads as a defined surface.
  ctx.strokeStyle = withAlpha("#f59e0b", 0.18);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CEILING_BAND_PX + 0.5);
  ctx.lineTo(w, CEILING_BAND_PX + 0.5);
  ctx.stroke();

  // Floor band — tiled stripes hint at concourse flooring without
  // overwhelming the lane visualization.
  const floorTop = h - FLOOR_BAND_PX;
  ctx.fillStyle = "rgba(20, 20, 26, 0.8)";
  ctx.fillRect(0, floorTop, w, FLOOR_BAND_PX);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  // Tile stride scales with lane width — keep ~32px between tiles regardless.
  const stride = Math.max(24, Math.min(48, (laneRight - laneLeft) / 18));
  ctx.beginPath();
  for (let x = laneLeft; x <= laneRight; x += stride) {
    ctx.moveTo(x, floorTop + 4);
    ctx.lineTo(x, h - 4);
  }
  ctx.stroke();
  // Hairline at floor's top edge.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.beginPath();
  ctx.moveTo(0, floorTop + 0.5);
  ctx.lineTo(w, floorTop + 0.5);
  ctx.stroke();
}

interface LaneLayout {
  /** Center y of the lane track. */
  cy: number;
  /** Top edge of the lane band. */
  top: number;
  /** Bottom edge of the lane band. */
  bottom: number;
  /** Direction chevron points right (+1) or left (-1). */
  dir: 1 | -1;
}

/**
 * Compute lane y bands within the available drawable area.
 *
 * Lane height is capped so portrait viewports (where the available
 * vertical room is generous but the long-axis story is along x)
 * don't stretch each track into a tall empty band — readability
 * comes from horizontal spacing, not lane thickness.
 */
function computeLanes(laneTop: number, laneBottom: number, laneCount: number): LaneLayout[] {
  const MAX_LANE_H = 64;
  const totalH = laneBottom - laneTop;
  const naturalLaneH = (totalH - LANE_GAP_PX * (laneCount - 1)) / laneCount;
  const laneH = Math.min(MAX_LANE_H, naturalLaneH);
  // Center the lane stack vertically when capped, so the float reads
  // as "concourse cross-section" rather than "tracks pinned to the top".
  const stackH = laneH * laneCount + LANE_GAP_PX * (laneCount - 1);
  const stackTop = laneTop + Math.max(0, (totalH - stackH) / 2);
  const lanes: LaneLayout[] = [];
  for (let i = 0; i < laneCount; i++) {
    const top = stackTop + i * (laneH + LANE_GAP_PX);
    const bottom = top + laneH;
    lanes.push({
      cy: (top + bottom) / 2,
      top,
      bottom,
      dir: i === 0 ? 1 : -1,
    });
  }
  return lanes;
}

/** Lane background + direction chevron + track centerline. */
function drawLane(
  ctx: CanvasRenderingContext2D,
  lane: LaneLayout,
  laneLeft: number,
  laneRight: number,
): void {
  // Lane fill — faint stripe darker than the canvas bg so it reads as a track gutter.
  ctx.fillStyle = "rgba(10, 12, 16, 0.55)";
  ctx.fillRect(laneLeft, lane.top, laneRight - laneLeft, lane.bottom - lane.top);
  // Lane frame.
  ctx.strokeStyle = "rgba(58, 58, 69, 0.7)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    laneLeft + 0.5,
    lane.top + 0.5,
    laneRight - laneLeft - 1,
    lane.bottom - lane.top - 1,
  );
  // Track centerline — dashed.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(laneLeft + 4, lane.cy);
  ctx.lineTo(laneRight - 4, lane.cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Direction chevron at the leading end of the lane (where new trains "appear" from).
  const chevX = lane.dir === 1 ? laneLeft + 6 : laneRight - 6;
  const tipX = chevX + lane.dir * CHEVRON_PX;
  ctx.fillStyle = withAlpha("#f59e0b", 0.55);
  ctx.beginPath();
  ctx.moveTo(chevX, lane.cy - CHEVRON_PX / 2);
  ctx.lineTo(tipX, lane.cy);
  ctx.lineTo(chevX, lane.cy + CHEVRON_PX / 2);
  ctx.closePath();
  ctx.fill();
  // Tiny secondary chevron behind the first for clearer direction read.
  const chevX2 = chevX - lane.dir * (CHEVRON_PX + 2);
  const tipX2 = chevX2 + lane.dir * CHEVRON_PX;
  ctx.fillStyle = withAlpha("#f59e0b", 0.25);
  ctx.beginPath();
  ctx.moveTo(chevX2, lane.cy - CHEVRON_PX / 2);
  ctx.lineTo(tipX2, lane.cy);
  ctx.lineTo(chevX2, lane.cy + CHEVRON_PX / 2);
  ctx.closePath();
  ctx.fill();
}

/** Draw vertical platform markers spanning all lanes at each station. */
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
    // Platform pad: subtle vertical strip at the station x.
    ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
    ctx.fillRect(x - 3, topLaneY - 4, 6, bottomLaneY - topLaneY + 8);
    // Hairline edges.
    ctx.strokeStyle = withAlpha("#f59e0b", 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 3, topLaneY - 4);
    ctx.lineTo(x - 3, bottomLaneY + 4);
    ctx.moveTo(x + 3, topLaneY - 4);
    ctx.lineTo(x + 3, bottomLaneY + 4);
    ctx.stroke();
    // Label below the floor band, clamped so the leftmost / rightmost
    // station name doesn't slip off-canvas on narrow portrait widths.
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

/** Pre-built rider variant cache for waiting-figure silhouettes. */
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
  ctx.fillStyle = withAlpha(UP_COLOR, 0.92);
  const label = count > 99 ? "99+" : String(count);
  // Pill background for legibility.
  const padX = 4;
  const w = ctx.measureText(label).width + padX * 2;
  const hPx = s.fontSmall + 4;
  ctx.fillStyle = "rgba(8, 10, 14, 0.72)";
  ctx.beginPath();
  const r = hPx / 2;
  const left = cx - w / 2;
  const top = cy - hPx / 2;
  ctx.moveTo(left + r, top);
  ctx.lineTo(left + w - r, top);
  ctx.arcTo(left + w, top, left + w, top + r, r);
  ctx.lineTo(left + w, top + hPx - r);
  ctx.arcTo(left + w, top + hPx, left + w - r, top + hPx, r);
  ctx.lineTo(left + r, top + hPx);
  ctx.arcTo(left, top + hPx, left, top + hPx - r, r);
  ctx.lineTo(left, top + r);
  ctx.arcTo(left, top, left + r, top, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(UP_COLOR, 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = withAlpha(UP_COLOR, 0.95);
  ctx.fillText(label, cx, cy + 0.5);
}

/** Long thin train glyph with window strip + chamfered nose. */
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
  // Body fill, picked from car phase via PHASE_COLORS so loading/moving still read.
  let bodyFill = "rgba(35, 40, 50, 0.95)";
  if (car.phase === "loading") bodyFill = "rgba(28, 50, 70, 0.95)";
  else if (car.phase === "door-opening" || car.phase === "door-closing")
    bodyFill = "rgba(60, 42, 12, 0.95)";
  else if (car.phase === "moving") bodyFill = "rgba(50, 38, 12, 0.95)";

  ctx.fillStyle = bodyFill;
  // Rounded rect with one chamfered nose end on the leading side.
  ctx.beginPath();
  if (dir === 1) {
    // Nose right; rounded back-left.
    ctx.moveTo(left + r, top);
    ctx.lineTo(left + trainW - trainH * 0.4, top);
    ctx.lineTo(left + trainW, cy);
    ctx.lineTo(left + trainW - trainH * 0.4, top + trainH);
    ctx.lineTo(left + r, top + trainH);
    ctx.arcTo(left, top + trainH, left, top + trainH - r, r);
    ctx.lineTo(left, top + r);
    ctx.arcTo(left, top, left + r, top, r);
  } else {
    // Nose left; rounded back-right.
    ctx.moveTo(left + trainH * 0.4, top);
    ctx.lineTo(left + trainW - r, top);
    ctx.arcTo(left + trainW, top, left + trainW, top + r, r);
    ctx.lineTo(left + trainW, top + trainH - r);
    ctx.arcTo(left + trainW, top + trainH, left + trainW - r, top + trainH, r);
    ctx.lineTo(left + trainH * 0.4, top + trainH);
    ctx.lineTo(left, cy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 188, 205, 0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Window strip — slightly inset, lighter band.
  const winInsetX = trainH * 0.45;
  const winTop = top + trainH * 0.32;
  const winH = trainH * 0.36;
  const winLeft = left + winInsetX;
  const winRight = left + trainW - winInsetX;
  if (winRight > winLeft) {
    ctx.fillStyle = "rgba(170, 220, 255, 0.18)";
    ctx.fillRect(winLeft, winTop, winRight - winLeft, winH);
    // Mullions: vertical separators every ~10 px.
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

  // Capacity dot — small dot per rider aboard, clamped to the visible window strip.
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

  // Vertical band reserved for lanes lives between the ceiling band
  // and the floor band, with extra room at the top for the lane header
  // and at the bottom for station labels.
  const headerH = 14;
  const stationLabelH = s.fontMain + STATION_LABEL_GAP + 4;
  const lanesTop = CEILING_BAND_PX + headerH;
  const lanesBottom = h - FLOOR_BAND_PX - stationLabelH;
  const lanes = computeLanes(lanesTop, lanesBottom, horizontalLineIds.length);

  // 1. Backdrop (ceiling + floor).
  drawConcourseBackdrop(ctx, w, h, laneLeft, laneRight);

  // 2. Lanes (background + dashed centerline + chevron).
  for (const lane of lanes) {
    drawLane(ctx, lane, laneLeft, laneRight);
  }

  // 3. Lane header labels — sourced from each line's `name` in the
  // snapshot so a future scenario with different terminology
  // ("Terminal A → Terminal B") doesn't read "Outbound / Inbound".
  // The arrow glyph follows the lane's render direction.
  ctx.font = `500 ${s.fontSmall}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.fillStyle = STOP_LABEL;
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const lineId = horizontalLineIds[i];
    if (lane === undefined || lineId === undefined) continue;
    const name = snap.lines.find((ln) => ln.id === lineId)?.name ?? `Line ${lineId}`;
    if (lane.dir === 1) {
      ctx.textAlign = "left";
      ctx.fillText(`${name} →`, laneLeft + 18, lane.top - 2);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(`← ${name}`, laneRight - 18, lane.top - 2);
    }
  }

  // 4. Station markers across all lanes + station labels under the floor.
  const topLaneY = lanes[0]?.top ?? lanesTop;
  const bottomLaneY = lanes[lanes.length - 1]?.bottom ?? lanesBottom;
  drawStations(ctx, snap.stops, toScreenX, topLaneY, bottomLaneY, h - FLOOR_BAND_PX, w, s);

  // 5. Trains — one glyph per car, mapped to its line's lane.
  // Train width scales with the line's stop spacing so it reads as a
  // train (long-thin) rather than an elevator car (~square).
  const minStopGapPx = (() => {
    const sortedX = snap.stops.map((stp) => toScreenX(stp.y)).sort((a, b) => a - b);
    let g = Infinity;
    for (let i = 1; i < sortedX.length; i++) {
      const cur = sortedX[i];
      const prev = sortedX[i - 1];
      if (cur === undefined || prev === undefined) continue;
      const d = cur - prev;
      if (d > 0 && d < g) g = d;
    }
    return Number.isFinite(g) ? g : 100;
  })();
  const trainW = Math.max(36, Math.min(110, minStopGapPx * 0.55));
  const laneH = lanes[0] ? lanes[0].bottom - lanes[0].top : 24;
  const trainH = Math.max(14, Math.min(28, laneH * 0.7));

  // Map line id → lane index.
  const laneOf = new Map<number, LaneLayout>();
  for (let i = 0; i < horizontalLineIds.length; i++) {
    const id = horizontalLineIds[i];
    const lane = lanes[i];
    if (id !== undefined && lane !== undefined) laneOf.set(id, lane);
  }

  for (const car of snap.cars) {
    const lane = laneOf.get(car.line);
    if (lane === undefined) continue;
    const cx = toScreenX(car.y);
    drawTrain(ctx, cx, lane.cy, trainW, trainH, lane.dir, car);
  }

  // 6. Per-lane waiting badges — split using `waiting_by_line` so a
  // platform shared by both directions shows one badge per direction
  // rather than conflating the two into the outbound count. Badges
  // straddle each lane (above the top lane, below the bottom lane)
  // so they don't collide with the lane chrome or station labels.
  const badgeOffset = 8;
  for (const stop of snap.stops) {
    if (stop.waiting === 0) continue;
    const x = toScreenX(stop.y);
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const lineId = horizontalLineIds[i];
      if (lane === undefined || lineId === undefined) continue;
      const slice = stop.waiting_by_line.find((w) => w.line === lineId);
      const count = slice?.count ?? 0;
      if (count === 0) continue;
      // First lane: badge above; subsequent lanes: badge below so
      // stacked lanes don't all crowd the top edge.
      const cy = i === 0 ? lane.top - badgeOffset : lane.bottom + badgeOffset;
      drawWaitingCount(ctx, count, x, cy, s);
    }
  }
}
