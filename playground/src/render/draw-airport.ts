import {
  outwardNormal,
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
 * Outline-circle stations on the midline serve both lines; one dot
 * per rider whether they're waiting at a platform or riding inside a
 * car. Outer trains sweep clockwise, inner trains sweep
 * counter-clockwise.
 *
 * A persistent per-train HUD tag pinned beside each train (outer
 * chips push outward, inner chips drop into the inner ring's empty
 * interior) carries the train's identity, next stop, load, and ETA.
 */

// ── Color tokens ──────────────────────────────────────────────────────
// Tracks are MUTED so the airport scene reads as native to the
// playground — the rest of the scenarios use low-alpha shaft fills
// with neutral frames, not bold saturated strokes. Loop identity
// still comes through via the trains and waiting clusters, which
// stay at full saturation against the muted track. Outer-track =
// blue-tinted, inner-track = coral-tinted, both at low alpha.
const OUTER_TRACK = "rgba(125, 211, 252, 0.45)"; // pane-a, muted
const INNER_TRACK = "rgba(253, 164, 175, 0.4)"; // pane-b, muted
const OUTER_TRAIN = "#7dd3fc"; // pane-a, bright — pops against the track
const INNER_TRAIN = "#fda4af"; // pane-b, bright
const OUTER_RIDER = "rgba(125, 211, 252, 0.9)";
const INNER_RIDER = "rgba(253, 164, 175, 0.9)";
const STATION_RING = "#3a3a45"; // --border-default (neutral, matches shaft frames)
const STATION_FILL = "#0b0d12";
const STATION_LABEL = "#a1a1aa"; // --text-secondary (matches other scenarios' floor labels)

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
  phaseRatio: number,
  _accent: string,
  physics: AirportPhysics,
): void {
  ctx.save();

  const minDim = Math.min(w, h);
  const showFullLabels = minDim >= NARROW_LABELS_PX;
  const rectW = w * 0.88;
  const rectH = Math.min(h * 0.6, w * 0.42);
  const cornerR = Math.min(rectW, rectH) * 0.32;
  const gap = Math.max(28, minDim * 0.06);
  // Thin tracks, matching the playground's hairline-frame language.
  // The bright trains on top do the visual heavy lifting; the rings
  // are just the path.
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
  const midline: RectGeometry = {
    cx: w / 2,
    cy: h / 2,
    w: (outer.w + inner.w) / 2,
    h: (outer.h + inner.h) / 2,
    r: (outer.r + inner.r) / 2,
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
    midline,
    outer,
    inner,
    airport,
    showFullLabels,
  );

  const trainPx = computeTrainPx(outer);
  const carBodyW = (trainPx / TRAIN_CAR_COUNT) * 0.7;
  const segLen = trainPx / TRAIN_CAR_COUNT;
  const carBodyH = Math.max(9, ringThickness * 2.8);

  const letterByCarId = assignLetters([...outerCars, ...innerCars]);

  const outerPlacements = drawTrainsOnLoop(
    ctx,
    outerCars,
    outerStops,
    outer,
    airport,
    carBodyW,
    carBodyH,
    segLen,
    false,
    letterByCarId,
    OUTER_TRAIN,
  );
  const innerPlacements = drawTrainsOnLoop(
    ctx,
    innerCars,
    innerStops,
    inner,
    airport,
    carBodyW,
    carBodyH,
    segLen,
    true,
    letterByCarId,
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

  // Day-phase intensity is already shown by the phase strip at the
  // top of the page chrome (shared with every scenario). Pulsing the
  // canvas tracks too would be airport-specific noise the rest of
  // the playground doesn't do.
  void phaseRatio;

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
  midline: RectGeometry,
  outer: TrackGeometry,
  inner: TrackGeometry,
  airport: AirportMeta,
  showFullLabels: boolean,
): AABB[] {
  const stationR = Math.max(5, midline.h * 0.022);
  const ringWidth = Math.max(1.5, stationR * 0.32);
  const fontPx = 11;
  const obstacles: AABB[] = [];

  const pairCount = Math.min(outerStops.length, innerStops.length);
  for (let i = 0; i < pairCount; i++) {
    const outerStop = outerStops[i];
    const innerStop = innerStops[i];
    if (!outerStop || !innerStop) continue;

    const fraction = outerStop.y / airport.circumferenceM;
    const midPoint = perimeterPoint(midline, fraction);
    const outerPoint = perimeterPoint(outer, fraction);
    const innerPoint = perimeterPoint(inner, fraction);

    // Outline-circle station — neutral ring matching the playground's
    // shaft-frame language. No letter glyph inside; the text label
    // outside the ring carries identity.
    ctx.beginPath();
    ctx.arc(midPoint.x, midPoint.y, stationR, 0, Math.PI * 2);
    ctx.fillStyle = STATION_FILL;
    ctx.fill();
    ctx.strokeStyle = STATION_RING;
    ctx.lineWidth = ringWidth;
    ctx.stroke();

    // Edge-aware label placement: outward perpendicular from the
    // outer ring point, with the offset chosen to clear the capped
    // outer-waiting-cluster extent (`QUEUE_MAX_VISIBLE_ROWS` rows of
    // dots above the ring, plus a small gap). Without this the label
    // would land on top of the queue at busy stations — exactly the
    // overlap the user reported.
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

    // Waiting riders — one cluster per loop, colored to match its
    // line. Outer cluster stacks OUTWARD perpendicular to the outer
    // track; inner cluster stacks INWARD into the inner ring's empty
    // interior. Row axis is tangential to the track so the queue
    // grows parallel to the line, not diagonally into the corner.
    drawWaitingCluster(ctx, outerPoint, outerStop.waiting, "outward", OUTER_RIDER, stationR);
    drawWaitingCluster(ctx, innerPoint, innerStop.waiting, "inward", INNER_RIDER, stationR);
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

function assignLetters(cars: CarDto[]): Map<number, string> {
  const sorted = [...cars].sort((a, b) => a.id - b.id);
  const out = new Map<number, string>();
  for (let i = 0; i < sorted.length; i++) {
    const car = sorted[i];
    if (car) out.set(car.id, String.fromCharCode(65 + i));
  }
  return out;
}

function drawTrainsOnLoop(
  ctx: CanvasRenderingContext2D,
  cars: CarDto[],
  stops: StopDto[],
  track: TrackGeometry,
  airport: AirportMeta,
  carBodyW: number,
  carBodyH: number,
  segLen: number,
  reverseDirection: boolean,
  letterByCarId: Map<number, string>,
  lineColor: string,
): TrainPlacement[] {
  if (cars.length === 0) return [];
  const perim = perimeterLength(track);
  const placements: TrainPlacement[] = [];

  for (const car of cars) {
    const baseFraction = car.y / airport.circumferenceM;
    const frontFraction = reverseDirection ? 1 - baseFraction : baseFraction;
    const perCarLoad = distributeLoad(car.riders);
    for (let i = 0; i < TRAIN_CAR_COUNT; i++) {
      const dir = reverseDirection ? -1 : 1;
      const segCenterPx = -dir * (i * segLen + segLen / 2);
      const segFraction = (((frontFraction + segCenterPx / perim) % 1) + 1) % 1;
      const point = perimeterPoint(track, segFraction);
      const load = perCarLoad[i] ?? 0;
      drawCarBody(ctx, point, carBodyW, carBodyH, lineColor, load, i === 0);
    }
    const dir = reverseDirection ? -1 : 1;
    const leadFraction = (((frontFraction + (-dir * segLen) / 2 / perim) % 1) + 1) % 1;
    const anchor = perimeterPoint(track, leadFraction);
    const letter = letterByCarId.get(car.id) ?? "?";

    const nextStop = pickNextStop(car, stops, airport.circumferenceM);
    const remainingM = nextStop
      ? (nextStop.y - car.y + airport.circumferenceM) % airport.circumferenceM
      : Infinity;
    placements.push({
      car,
      anchor,
      letter,
      nextStop,
      remainingM,
      lineColor,
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
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.tangent);
  const halfL = length / 2;
  const halfW = width / 2;
  const r = Math.min(halfL, halfW) * 0.5;
  tracedRoundedRect(ctx, { cx: 0, cy: 0, w: length, h: width, r });
  ctx.fillStyle = fill;
  ctx.fill();
  // Subtle inner highlight on the lead car so the train direction
  // reads at a glance — Mini Metro doesn't do this, but our trains
  // are dark capsules on a dark bg and need a directional cue.
  if (isLead) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(halfL - r * 1.1, 0, halfW * 0.32, 0, Math.PI * 2);
    ctx.fill();
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
  // Near-black dots — high contrast against the lighter line-colored
  // car bodies, mirroring Mini Metro's dark passenger marks on
  // bright trains.
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
