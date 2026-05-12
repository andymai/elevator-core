import {
  outwardNormal,
  projectInward,
  tracedRoundedRect,
  type AABB,
  type PerimeterPoint,
  type RectGeometry,
} from "./airport-geometry";
import { drawTrainHuds, type AirportPhysics, type TrainPlacement } from "./draw-airport-hud";
import { CANVAS_FONT_SANS } from "./palette";
import type { AirportMeta, CarDto, Snapshot, StopDto } from "../types";

/**
 * Metro-style airport scene against the dark playground palette.
 *
 * Two concentric rounded-rectangles separated by a small gap form
 * two *distinct* lines: outer in playground blue, inner in coral.
 * Each stop renders as a single neutral tick perpendicular to the
 * tracks, spanning the gap — minimal footprint, clearly a marker,
 * never confused for a train segment. Inner-loop trains parameterize
 * positions on the OUTER perimeter and project inward by `gap` so
 * same-name stops align across loops (each loop's own perimeter
 * lookup would misalign at corners since the arcs differ).
 *
 * Outer trains sweep clockwise, inner counter-clockwise; lead car is
 * brightened with a forward-pointing chevron so direction of motion
 * reads at a glance.
 *
 * Per-train info pills are gated: dwelling trains always show one
 * (info-rich moment), and the user's hovered/touched train shows one.
 * Moving, un-hovered trains stay un-annotated to keep the scene calm.
 */

// Tracks are muted so the line identity comes through via the
// full-saturation trains and waiting clusters on top, not the rings.
const OUTER_TRACK = "rgba(125, 211, 252, 0.45)";
const INNER_TRACK = "rgba(253, 164, 175, 0.4)";
const OUTER_TRAIN = "#7dd3fc";
const INNER_TRAIN = "#fda4af";
const OUTER_RIDER = "rgba(125, 211, 252, 0.9)";
const INNER_RIDER = "rgba(253, 164, 175, 0.9)";
const STATION_LABEL = "#a1a1aa";
const STATION_TICK = "rgba(212, 212, 216, 0.55)"; // muted neutral, perpendicular to track

const NARROW_LABELS_PX = 480;
const TRAIN_CAR_COUNT = 4;
const QUEUE_PER_ROW = 4;
/** Cap on visibly rendered waiting dots so the cluster's outward
 *  extent stays bounded; surplus riders fold into a "+N" indicator at
 *  the far end of the cluster. */
const QUEUE_MAX_VISIBLE_ROWS = 4;

interface TrackGeometry extends RectGeometry {
  color: string;
  thickness: number;
}

export function drawAirportScene(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  airport: AirportMeta,
  _phaseRatio: number,
  _accent: string,
  physics: AirportPhysics,
): void {
  ctx.save();

  const minDim = Math.min(w, h);
  const showFullLabels = minDim >= NARROW_LABELS_PX;
  // Reserve canvas margins for station labels. Full-name labels need
  // ~95px clearance horizontally (longest is "Concourse X" plus the
  // outward label offset). Vertical clearance must cover the same
  // outward offset (~38px) plus a small breathing margin so top/bottom
  // labels never clip against the canvas edge. Glyph mode at narrow
  // viewports drops the horizontal budget since labels become 1 char.
  const labelPadX = showFullLabels ? 95 : 32;
  const labelPadY = 44;
  const rectW = Math.min(w * 0.92, Math.max(160, w - labelPadX * 2));
  const rectH = Math.min(Math.max(120, h - labelPadY * 2), w * 0.5);
  const cornerR = Math.min(rectW, rectH) * 0.32;
  const gap = Math.max(14, minDim * 0.025);
  const ringThickness = Math.max(1.5, minDim * 0.005);

  const outer: TrackGeometry = {
    cx: w / 2,
    cy: h / 2,
    w: rectW,
    h: rectH,
    r: cornerR,
    color: OUTER_TRACK,
    thickness: ringThickness,
  };
  const inner: TrackGeometry = {
    cx: w / 2,
    cy: h / 2,
    w: rectW - gap * 2,
    h: rectH - gap * 2,
    r: Math.max(0, cornerR - gap),
    color: INNER_TRACK,
    thickness: ringThickness,
  };

  drawTrack(ctx, outer);
  drawTrack(ctx, inner);

  const outerStops = snap.stops.slice(0, airport.outerStopCount);
  const innerStops = snap.stops.slice(airport.outerStopCount);

  // Lower line id = outer loop (RON declares outer first).
  const distinctLines = [...new Set(snap.cars.map((c) => c.line))].sort((a, b) => a - b);
  const outerLine = distinctLines[0];
  const innerLine = distinctLines[1];
  const outerCars: CarDto[] = [];
  const innerCars: CarDto[] = [];
  for (const car of snap.cars) {
    if (car.line === outerLine) outerCars.push(car);
    else if (car.line === innerLine) innerCars.push(car);
  }

  const stationObstacles = drawStations(
    ctx,
    outerStops,
    innerStops,
    outer,
    gap,
    airport,
    showFullLabels,
  );

  const trainPx = computeTrainPx(outer);
  const carBodyW = (trainPx / TRAIN_CAR_COUNT) * 0.7;
  const segLen = trainPx / TRAIN_CAR_COUNT;
  const carBodyH = Math.max(9, ringThickness * 2.8);

  const outerPlacements = drawTrainsOnLoop(
    ctx,
    outerCars,
    outerStops,
    outer,
    0,
    airport,
    carBodyW,
    carBodyH,
    segLen,
    false,
    OUTER_TRAIN,
  );
  const innerPlacements = drawTrainsOnLoop(
    ctx,
    innerCars,
    innerStops,
    outer,
    gap,
    airport,
    carBodyW,
    carBodyH,
    segLen,
    true,
    INNER_TRAIN,
  );

  // Drop zone for HUD chips that can't find clearance on the
  // perimeter — the inner ring's empty interior is always open.
  const innerSafe: AABB = {
    x: inner.cx - inner.w / 2 + inner.r + 6,
    y: inner.cy - inner.h / 2 + inner.r + 6,
    w: Math.max(0, inner.w - 2 * (inner.r + 6)),
    h: Math.max(0, inner.h - 2 * (inner.r + 6)),
  };
  drawTrainHuds(
    ctx,
    [...outerPlacements, ...innerPlacements],
    w,
    h,
    innerSafe,
    physics,
    showFullLabels,
    carBodyH,
    stationObstacles,
  );

  ctx.restore();
}

// ── Geometry primitives ───────────────────────────────────────────────

function perimeterLength(rect: RectGeometry): number {
  return (
    2 * Math.max(0, rect.w - 2 * rect.r) +
    2 * Math.max(0, rect.h - 2 * rect.r) +
    2 * Math.PI * rect.r
  );
}

function perimeterPoint(rect: RectGeometry, f: number): PerimeterPoint {
  const fNorm = ((f % 1) + 1) % 1;
  const len = perimeterLength(rect);
  let p = fNorm * len;
  const w = rect.w;
  const h = rect.h;
  const r = rect.r;
  const wInner = Math.max(0, w - 2 * r);
  const hInner = Math.max(0, h - 2 * r);
  const arc = (Math.PI * r) / 2;
  const left = rect.cx - w / 2;
  const right = rect.cx + w / 2;
  const top = rect.cy - h / 2;
  const bottom = rect.cy + h / 2;

  if (p < wInner) return { x: left + r + p, y: top, tangent: 0 };
  p -= wInner;
  if (p < arc) {
    const a = -Math.PI / 2 + (p / arc) * (Math.PI / 2);
    return {
      x: right - r + Math.cos(a) * r,
      y: top + r + Math.sin(a) * r,
      tangent: a + Math.PI / 2,
    };
  }
  p -= arc;
  if (p < hInner) return { x: right, y: top + r + p, tangent: Math.PI / 2 };
  p -= hInner;
  if (p < arc) {
    const a = 0 + (p / arc) * (Math.PI / 2);
    return {
      x: right - r + Math.cos(a) * r,
      y: bottom - r + Math.sin(a) * r,
      tangent: a + Math.PI / 2,
    };
  }
  p -= arc;
  if (p < wInner) return { x: right - r - p, y: bottom, tangent: Math.PI };
  p -= wInner;
  if (p < arc) {
    const a = Math.PI / 2 + (p / arc) * (Math.PI / 2);
    return {
      x: left + r + Math.cos(a) * r,
      y: bottom - r + Math.sin(a) * r,
      tangent: a + Math.PI / 2,
    };
  }
  p -= arc;
  if (p < hInner) return { x: left, y: bottom - r - p, tangent: -Math.PI / 2 };
  p -= hInner;
  if (arc <= 0) return { x: left + r, y: top, tangent: 0 };
  const a = Math.PI + (p / arc) * (Math.PI / 2);
  return {
    x: left + r + Math.cos(a) * r,
    y: top + r + Math.sin(a) * r,
    tangent: a + Math.PI / 2,
  };
}

function drawTrack(ctx: CanvasRenderingContext2D, track: TrackGeometry): void {
  tracedRoundedRect(ctx, track);
  ctx.strokeStyle = track.color;
  ctx.lineWidth = track.thickness;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.stroke();
}

// ── Stations ──────────────────────────────────────────────────────────

function drawStations(
  ctx: CanvasRenderingContext2D,
  outerStops: StopDto[],
  innerStops: StopDto[],
  outer: TrackGeometry,
  gap: number,
  airport: AirportMeta,
  showFullLabels: boolean,
): AABB[] {
  const stationR = Math.max(5, gap * 0.12);
  const fontPx = 11;
  const obstacles: AABB[] = [];

  ctx.strokeStyle = STATION_TICK;
  ctx.lineWidth = Math.max(1.4, outer.thickness * 1.1);
  ctx.lineCap = "round";

  const pairCount = Math.min(outerStops.length, innerStops.length);
  for (let i = 0; i < pairCount; i++) {
    const outerStop = outerStops[i];
    const innerStop = innerStops[i];
    if (!outerStop || !innerStop) continue;

    // Both loops anchor on the outer perimeter at the stop's sim
    // fraction; inner is the same point projected inward by `gap`.
    // Same-name stops align across loops, which they wouldn't if each
    // loop indexed by its own perimeter (matching straights, mismatched
    // arc lengths).
    const fraction = outerStop.y / airport.circumferenceM;
    const outerPoint = perimeterPoint(outer, fraction);
    const innerPoint = projectInward(outerPoint, gap);

    // One neutral tick perpendicular to the tracks, spanning the gap.
    // Reads as a station marker without competing with the trains.
    ctx.beginPath();
    ctx.moveTo(outerPoint.x, outerPoint.y);
    ctx.lineTo(innerPoint.x, innerPoint.y);
    ctx.stroke();

    // Label outside the outer loop, offset to clear the queue cluster
    // cap. All labels share the same weight/size; identity comes from
    // position around the ring.
    const dotR = Math.max(1.8, stationR * 0.22);
    const stride = dotR * 2.4;
    const queueExtent = stationR + dotR * 1.6 + stride * (QUEUE_MAX_VISIBLE_ROWS - 1) + dotR;
    const { nx, ny } = outwardNormal(outerPoint);
    const labelOffset = queueExtent + fontPx * 0.8 + 4;
    const lx = outerPoint.x + nx * labelOffset;
    const ly = outerPoint.y + ny * labelOffset;
    ctx.font = `500 ${fontPx}px ${CANVAS_FONT_SANS}`;
    ctx.fillStyle = STATION_LABEL;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = showFullLabels ? outerStop.name : stationGlyph(outerStop.name);
    const textW = ctx.measureText(text).width;
    ctx.fillText(text, lx, ly);
    const labelPad = 3;
    obstacles.push({
      x: lx - textW / 2 - labelPad,
      y: ly - fontPx / 2 - labelPad,
      w: textW + labelPad * 2,
      h: fontPx + labelPad * 2,
    });

    drawWaitingCluster(ctx, outerPoint, outerStop.waiting, "outward", OUTER_RIDER, stationR);
    drawWaitingCluster(ctx, innerPoint, innerStop.waiting, "inward", INNER_RIDER, stationR);

    // Stroke state may have been clobbered by waiting cluster fills.
    ctx.strokeStyle = STATION_TICK;
    ctx.lineWidth = Math.max(1.4, outer.thickness * 1.1);
    ctx.lineCap = "round";
  }
  return obstacles;
}

function stationGlyph(name: string): string {
  if (name === "Plane Train") return "P";
  if (name === "Terminal") return "T";
  if (name.startsWith("Concourse ")) return name.slice(10, 11).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

function drawWaitingCluster(
  ctx: CanvasRenderingContext2D,
  anchor: PerimeterPoint,
  waiting: number,
  side: "outward" | "inward",
  color: string,
  stationR: number,
): void {
  if (waiting <= 0) return;
  // Stack direction: outward = normal points away from rect center;
  // inward = flipped (into the interior).
  const { nx: onx, ny: ony } = outwardNormal(anchor);
  const dir = side === "outward" ? 1 : -1;
  const nx = onx * dir;
  const ny = ony * dir;
  // Row axis is tangent to the track at this point, so queues fan
  // along the line direction rather than radially into open space.
  const tx = Math.cos(anchor.tangent);
  const ty = Math.sin(anchor.tangent);

  const dotR = Math.max(1.8, stationR * 0.22);
  const stride = dotR * 2.4;
  const startOffset = stationR + dotR * 1.6;
  const maxVisible = QUEUE_PER_ROW * QUEUE_MAX_VISIBLE_ROWS;
  const overflow = Math.max(0, waiting - maxVisible);
  // When the queue exceeds the visible cap, reserve the last slot for
  // a "+N" overflow indicator so users still see how many extra are
  // waiting without the cluster growing past the station label.
  const visible = Math.min(waiting, maxVisible);

  ctx.fillStyle = color;
  for (let i = 0; i < visible; i++) {
    const row = Math.floor(i / QUEUE_PER_ROW);
    const col = i % QUEUE_PER_ROW;
    const offsetCol = col - (QUEUE_PER_ROW - 1) / 2;
    const stackDist = startOffset + stride * row;
    const x = anchor.x + nx * stackDist + tx * (offsetCol * stride);
    const y = anchor.y + ny * stackDist + ty * (offsetCol * stride);
    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (overflow > 0) {
    // "+N" indicator at the far end of the cluster so the user can
    // still see exactly how crowded the platform is past the cap.
    const lastStack = startOffset + stride * (QUEUE_MAX_VISIBLE_ROWS - 1);
    const xLabel = anchor.x + nx * (lastStack + stride * 1.4);
    const yLabel = anchor.y + ny * (lastStack + stride * 1.4);
    ctx.font = `600 ${Math.round(dotR * 4)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${overflow}`, xLabel, yLabel);
  }
}

// ── Trains ────────────────────────────────────────────────────────────

function computeTrainPx(outer: TrackGeometry): number {
  const perim = perimeterLength(outer);
  return Math.min(110, perim * 0.075);
}

function distributeLoad(totalRiders: number): number[] {
  const out = new Array<number>(TRAIN_CAR_COUNT).fill(0);
  const base = Math.floor(totalRiders / TRAIN_CAR_COUNT);
  const rem = totalRiders - base * TRAIN_CAR_COUNT;
  for (let i = 0; i < TRAIN_CAR_COUNT; i++) {
    out[i] = base + (i < rem ? 1 : 0);
  }
  return out;
}

function drawTrainsOnLoop(
  ctx: CanvasRenderingContext2D,
  cars: CarDto[],
  stops: StopDto[],
  outer: TrackGeometry,
  inwardGap: number,
  airport: AirportMeta,
  carBodyW: number,
  carBodyH: number,
  segLen: number,
  reverseDirection: boolean,
  lineColor: string,
): TrainPlacement[] {
  if (cars.length === 0) return [];
  // Both loops parameterize positions on the outer perimeter; inner
  // cars are then projected inward by `inwardGap`. Keeps train and
  // station positions on the inner loop visually consistent with the
  // outer (same straight-edge lengths, mirrored stops align).
  const perim = perimeterLength(outer);
  const onLoop = (f: number): PerimeterPoint => {
    const p = perimeterPoint(outer, f);
    return inwardGap > 0 ? projectInward(p, inwardGap) : p;
  };
  const placements: TrainPlacement[] = [];

  // Half a train (in perimeter pixels) — used to shift the train so
  // that its CENTER sits on car.y instead of the lead car. Without
  // this, a dwelling train's lead car would land at the platform but
  // the other 3 cars would trail off behind the stop.
  const halfTrainPx = (TRAIN_CAR_COUNT * segLen) / 2;

  for (const car of cars) {
    const baseFraction = car.y / airport.circumferenceM;
    const perCarLoad = distributeLoad(car.riders);
    const dir = reverseDirection ? -1 : 1;
    const centeredBase = reverseDirection ? 1 - baseFraction : baseFraction;
    const frontFraction = centeredBase + (dir * halfTrainPx) / perim;
    const carPoints: PerimeterPoint[] = [];
    for (let i = 0; i < TRAIN_CAR_COUNT; i++) {
      const segCenterPx = -dir * (i * segLen + segLen / 2);
      const segFraction = (((frontFraction + segCenterPx / perim) % 1) + 1) % 1;
      carPoints.push(onLoop(segFraction));
    }
    for (let i = 0; i < TRAIN_CAR_COUNT; i++) {
      const point = carPoints[i];
      if (!point) continue;
      const load = perCarLoad[i] ?? 0;
      drawCarBody(ctx, point, carBodyW, carBodyH, lineColor, load, i === 0, dir);
    }
    const leadFraction = (((frontFraction + (-dir * segLen) / 2 / perim) % 1) + 1) % 1;
    const anchor = onLoop(leadFraction);

    const nextStop = pickNextStop(car, stops, airport.circumferenceM);
    const remainingM = nextStop
      ? (nextStop.y - car.y + airport.circumferenceM) % airport.circumferenceM
      : Infinity;
    placements.push({
      car,
      anchor,
      nextStop,
      remainingM,
      isInner: reverseDirection,
    });
  }
  return placements;
}

function pickNextStop(car: CarDto, stops: StopDto[], circumferenceM: number): StopDto | undefined {
  let best: StopDto | undefined;
  let bestDelta = Infinity;
  for (const stop of stops) {
    const delta = (stop.y - car.y + circumferenceM) % circumferenceM;
    if (delta <= 1e-3) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = stop;
    }
  }
  return best;
}

function drawCarBody(
  ctx: CanvasRenderingContext2D,
  point: PerimeterPoint,
  length: number,
  width: number,
  fill: string,
  load: number,
  isLead: boolean,
  forwardX: number,
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.tangent);
  const halfL = length / 2;
  const halfW = width / 2;
  const r = Math.min(length, width) * 0.25;
  const body = { cx: 0, cy: 0, w: length, h: width, r };
  tracedRoundedRect(ctx, body);
  ctx.fillStyle = fill;
  ctx.fill();
  if (isLead) {
    tracedRoundedRect(ctx, body);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fill();
    // Chevron tip at the leading edge — forwardX flips for inner-loop
    // (counter-clockwise) trains so the chevron always points along
    // direction of travel, not just along the perimeter parameterization.
    const tipX = forwardX * (halfL - r * 0.4);
    const backX = forwardX * (halfL - r * 0.4 - halfW * 0.95);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = Math.max(1.2, halfW * 0.32);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(backX, -halfW * 0.55);
    ctx.lineTo(tipX, 0);
    ctx.lineTo(backX, halfW * 0.55);
    ctx.stroke();
  }
  if (load > 0) drawRidersInCar(ctx, length, width, load);
  ctx.restore();
}

function drawRidersInCar(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
  load: number,
): void {
  const padX = Math.max(1.5, length * 0.1);
  const padY = Math.max(1, width * 0.18);
  const innerW = Math.max(1, length - padX * 2);
  const innerH = Math.max(1, width - padY * 2);
  const rows = load > 8 ? 3 : 2;
  const cols = Math.max(1, Math.ceil(load / rows));
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const dotR = Math.max(0.7, Math.min(cellW, cellH) * 0.36);
  ctx.fillStyle = "rgba(20, 22, 30, 0.85)";
  let placed = 0;
  for (let row = 0; row < rows && placed < load; row++) {
    for (let col = 0; col < cols && placed < load; col++) {
      const x = -length / 2 + padX + cellW * (col + 0.5);
      const y = -width / 2 + padY + cellH * (row + 0.5);
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
      placed++;
    }
  }
}
