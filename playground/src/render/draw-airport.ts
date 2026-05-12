import { withAlpha } from "./color-utils";
import {
  drawTrainHuds,
  type AABB,
  type AirportPhysics,
  type PerimeterPoint,
  type TrainPlacement,
} from "./draw-airport-hud";
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
// Loop colors are line-identity colors, not pane-themed: outer always
// blue, inner always coral, regardless of which compare-pane accent
// the scenario lives under. This is the Mini Metro grammar: each line
// gets its own color, end of story.
const OUTER_LINE = "#7dd3fc"; // pane-a blue
const INNER_LINE = "#fda4af"; // pane-b coral
const OUTER_RIDER = "#bde4f9"; // lighter blue, reads on the dark bg
const INNER_RIDER = "#fdd5dc"; // lighter coral, reads on the dark bg
const STATION_RING = "rgba(232, 235, 240, 0.92)";
const STATION_FILL = "#0b0d12";
const STATION_GLYPH = "rgba(232, 235, 240, 0.85)";
const STATION_LABEL = "rgba(232, 235, 240, 0.7)";

const NARROW_LABELS_PX = 480;
const TRAIN_CAR_COUNT = 4;

interface RectGeometry {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
}

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
  const ringThickness = Math.max(3, minDim * 0.008);

  const outer: TrackGeometry = {
    cx: w / 2,
    cy: h / 2,
    w: rectW,
    h: rectH,
    r: cornerR,
    color: OUTER_LINE,
    thickness: ringThickness,
  };
  const inner: TrackGeometry = {
    cx: w / 2,
    cy: h / 2,
    w: rectW - gap * 2,
    h: rectH - gap * 2,
    r: Math.max(0, cornerR - gap),
    color: INNER_LINE,
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
    OUTER_LINE,
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
    INNER_LINE,
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

  if (phaseRatio > 0.55) drawPhasePulse(ctx, outer, inner, phaseRatio);

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

/**
 * Outward unit normal at a perimeter point (perpendicular to tangent,
 * pointing away from the rect center). Used for placing labels and
 * waiting-dot clusters cleanly off the track.
 */
function outwardNormal(p: PerimeterPoint): { nx: number; ny: number } {
  // For a CW-walked rect, the outward normal is the tangent rotated
  // 90° CW: (sinθ, -cosθ).
  return { nx: Math.sin(p.tangent), ny: -Math.cos(p.tangent) };
}

function tracedRoundedRect(ctx: CanvasRenderingContext2D, rect: RectGeometry): void {
  const { cx, cy, w, h, r } = rect;
  const left = cx - w / 2;
  const top = cy - h / 2;
  const right = cx + w / 2;
  const bottom = cy + h / 2;
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(right - r, top);
  ctx.arcTo(right, top, right, top + r, r);
  ctx.lineTo(right, bottom - r);
  ctx.arcTo(right, bottom, right - r, bottom, r);
  ctx.lineTo(left + r, bottom);
  ctx.arcTo(left, bottom, left, bottom - r, r);
  ctx.lineTo(left, top + r);
  ctx.arcTo(left, top, left + r, top, r);
  ctx.closePath();
}

function drawTrack(ctx: CanvasRenderingContext2D, track: TrackGeometry): void {
  tracedRoundedRect(ctx, track);
  ctx.strokeStyle = track.color;
  ctx.lineWidth = track.thickness;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawPhasePulse(
  ctx: CanvasRenderingContext2D,
  outer: TrackGeometry,
  inner: TrackGeometry,
  phaseRatio: number,
): void {
  const intensity = (phaseRatio - 0.55) / 0.45;
  const t = Math.max(0, Math.min(1, intensity));
  ctx.save();
  ctx.lineWidth = outer.thickness * 1.8;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.strokeStyle = withAlpha(OUTER_LINE, 0.12 + t * 0.18);
  tracedRoundedRect(ctx, outer);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(INNER_LINE, 0.12 + t * 0.18);
  tracedRoundedRect(ctx, inner);
  ctx.stroke();
  ctx.restore();
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

    // Outline-circle station — neutral so it doesn't fight either
    // line's color. Filled dark to punch through both rings.
    ctx.beginPath();
    ctx.arc(midPoint.x, midPoint.y, stationR, 0, Math.PI * 2);
    ctx.fillStyle = STATION_FILL;
    ctx.fill();
    ctx.strokeStyle = STATION_RING;
    ctx.lineWidth = ringWidth;
    ctx.stroke();

    if (showFullLabels) {
      ctx.font = `600 ${Math.round(stationR * 1.05)}px ${CANVAS_FONT_SANS}`;
      ctx.fillStyle = STATION_GLYPH;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stationGlyph(outerStop.name), midPoint.x, midPoint.y + 0.5);
    }

    // Edge-aware label placement: use the outward normal at the outer
    // ring point, with a tighter offset than the previous radial-from-
    // center version. On corners the normal rotates with the arc, so
    // labels at corners tilt diagonally but stay close to the ring.
    const { nx, ny } = outwardNormal(outerPoint);
    const labelOffset = stationR + fontPx * 0.8 + 4;
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
  const perRow = 4;

  ctx.fillStyle = color;
  for (let i = 0; i < waiting; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const offsetCol = col - (perRow - 1) / 2;
    const stackDist = startOffset + stride * row;
    const x = anchor.x + nx * stackDist + tx * (offsetCol * stride);
    const y = anchor.y + ny * stackDist + ty * (offsetCol * stride);
    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fill();
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
  // White-ish dots — readable against any line fill color.
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
