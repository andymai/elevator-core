import { withAlpha } from "./color-utils";
import { CANVAS_FONT_SANS, STOP_LABEL } from "./palette";
import { formatDuration, tetherEta } from "./tether";
import type { AirportMeta, CarDto, Snapshot, StopDto } from "../types";

/**
 * Mini-Metro-vocabulary translation onto the dark playground palette.
 *
 * Two concentric rounded-rectangles separated by a small gap form the
 * "lines": bold accent strokes carry trains, outline-circle stations
 * straddle the midline, and a rider is rendered as one dot regardless
 * of where they are (waiting at a platform, riding in a car). Outer
 * trains sweep clockwise, inner trains sweep counter-clockwise.
 *
 * The scene also draws a persistent per-train HUD tag — same visual
 * grammar as the tether scenario's climber chips — so each train
 * advertises its identity, next stop, load, and ETA without needing
 * ephemeral event bubbles.
 */

interface AirportPhysics {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
}

const NARROW_LABELS_PX = 480;
const TRAIN_CAR_COUNT = 4;
const RIDER_DOT_COLOR = "rgba(232, 235, 240, 0.85)";

const DWELLING_PHASES = new Set(["loading", "door-opening", "door-closing"]);

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

interface PerimeterPoint {
  x: number;
  y: number;
  /** Tangent direction in radians; 0 = +x (rightward), π/2 = +y (downward). */
  tangent: number;
}

interface TrainPlacement {
  car: CarDto;
  /** Anchor point on the track at the train's leading car center. */
  anchor: PerimeterPoint;
  /** Letter assigned by global car id rank (A..D across both loops). */
  letter: string;
  /** Stop the train is heading to next (in direction of travel). */
  nextStop: StopDto | undefined;
  /** Distance along the loop to `nextStop`, in metres. */
  remainingM: number;
}

export function drawAirportScene(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  airport: AirportMeta,
  phaseRatio: number,
  accent: string,
  physics: AirportPhysics,
): void {
  // No background fill — the playground's CSS gradient on `.shaft-wrap`
  // shows through, keeping airport visually inside the same panel
  // chrome as the other scenarios.
  ctx.save();

  const minDim = Math.min(w, h);
  const showFullLabels = minDim >= NARROW_LABELS_PX;
  const rectW = w * 0.88;
  const rectH = Math.min(h * 0.6, w * 0.42);
  const cornerR = Math.min(rectW, rectH) * 0.32;
  const gap = Math.max(28, minDim * 0.06);
  const ringThickness = Math.max(3, minDim * 0.008);

  const outerColor = withAlpha(accent, 0.85);
  const innerColor = withAlpha(accent, 0.45);

  const outer: TrackGeometry = {
    cx: w / 2,
    cy: h / 2,
    w: rectW,
    h: rectH,
    r: cornerR,
    color: outerColor,
    thickness: ringThickness,
  };
  const inner: TrackGeometry = {
    cx: w / 2,
    cy: h / 2,
    w: rectW - gap * 2,
    h: rectH - gap * 2,
    r: Math.max(0, cornerR - gap),
    color: innerColor,
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

  // Lower line id is the outer loop (RON declares outer first), so
  // cars partition cleanly by id rank.
  const distinctLines = [...new Set(snap.cars.map((c) => c.line))].sort((a, b) => a - b);
  const outerLine = distinctLines[0];
  const innerLine = distinctLines[1];
  const outerCars: CarDto[] = [];
  const innerCars: CarDto[] = [];
  for (const car of snap.cars) {
    if (car.line === outerLine) outerCars.push(car);
    else if (car.line === innerLine) innerCars.push(car);
  }

  drawStations(ctx, outerStops, innerStops, midline, outer, airport, showFullLabels, accent);

  const trainPx = computeTrainPx(outer);
  const segLen = trainPx / TRAIN_CAR_COUNT;
  const carBodyW = segLen * 0.78;
  const carBodyH = Math.max(8, ringThickness * 2.6);

  // Globally stable letter assignment: rank cars by id across both
  // loops so the lower-numbered outer cars get A/B and the inner cars
  // continue with C/D. Each train's next-stop line is the disambiguator
  // for which loop it's on; suffixing the letter would read technical.
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
  );

  drawTrainHuds(
    ctx,
    [...outerPlacements, ...innerPlacements],
    w,
    h,
    accent,
    physics,
    showFullLabels,
    carBodyH,
  );

  if (phaseRatio > 0.55) drawPhasePulse(ctx, outer, inner, phaseRatio, accent);

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
  // Degenerate r=0: dividing by `arc` would NaN.
  if (arc <= 0) return { x: left + r, y: top, tangent: 0 };
  const a = Math.PI + (p / arc) * (Math.PI / 2);
  return {
    x: left + r + Math.cos(a) * r,
    y: top + r + Math.sin(a) * r,
    tangent: a + Math.PI / 2,
  };
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
  accent: string,
): void {
  const intensity = (phaseRatio - 0.55) / 0.45;
  ctx.save();
  ctx.strokeStyle = withAlpha(accent, 0.12 + Math.max(0, Math.min(1, intensity)) * 0.18);
  ctx.lineWidth = outer.thickness * 1.8;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  tracedRoundedRect(ctx, outer);
  ctx.stroke();
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
  airport: AirportMeta,
  showFullLabels: boolean,
  accent: string,
): void {
  const stationR = Math.max(5, midline.h * 0.022);
  const ringWidth = Math.max(1.5, stationR * 0.32);
  const fontPx = 11;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const pairCount = Math.min(outerStops.length, innerStops.length);
  for (let i = 0; i < pairCount; i++) {
    const outerStop = outerStops[i];
    const innerStop = innerStops[i];
    if (!outerStop || !innerStop) continue;

    const fraction = outerStop.y / airport.circumferenceM;
    const midPoint = perimeterPoint(midline, fraction);
    const outerPoint = perimeterPoint(outer, fraction);

    // Outline circle — Mini Metro's iconic station mark. Filled dark
    // so it punches through the rings rather than reading as a hole.
    ctx.beginPath();
    ctx.arc(midPoint.x, midPoint.y, stationR, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0d12";
    ctx.fill();
    ctx.strokeStyle = withAlpha(accent, 0.95);
    ctx.lineWidth = ringWidth;
    ctx.stroke();

    if (showFullLabels) {
      ctx.font = `600 ${Math.round(stationR * 1.05)}px ${CANVAS_FONT_SANS}`;
      ctx.fillStyle = withAlpha(accent, 0.95);
      ctx.fillText(stationGlyph(outerStop.name), midPoint.x, midPoint.y + 0.5);
    }

    // Station name outside the outer ring along the outward normal.
    const dx = outerPoint.x - midline.cx;
    const dy = outerPoint.y - midline.cy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const offset = fontPx * 1.8 + stationR;
    const lx = outerPoint.x + (dx / dist) * offset;
    const ly = outerPoint.y + (dy / dist) * offset;
    ctx.font = `500 ${fontPx}px ${CANVAS_FONT_SANS}`;
    ctx.fillStyle = STOP_LABEL;
    const text = showFullLabels ? outerStop.name : stationGlyph(outerStop.name);
    ctx.fillText(text, lx, ly);

    drawWaitingDots(ctx, midPoint, midline, outerStop.waiting, true, stationR);
    drawWaitingDots(ctx, midPoint, midline, innerStop.waiting, false, stationR);
  }
}

function stationGlyph(name: string): string {
  if (name === "Plane Train" || name === "Terminal") return "T";
  if (name.startsWith("Concourse ")) return name.slice(10, 11).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

function drawWaitingDots(
  ctx: CanvasRenderingContext2D,
  center: PerimeterPoint,
  midline: RectGeometry,
  waiting: number,
  outerSide: boolean,
  stationR: number,
): void {
  if (waiting <= 0) return;
  // Outward radial direction from the canvas center; flip for inner-side
  // waiters so they stack toward the centre instead of into the outer
  // station name.
  const dx = center.x - midline.cx;
  const dy = center.y - midline.cy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const rx = (outerSide ? 1 : -1) * (dx / dist);
  const ry = (outerSide ? 1 : -1) * (dy / dist);
  const px = -ry;
  const py = rx;

  const dotR = Math.max(1.6, stationR * 0.18);
  const stride = dotR * 2.4;
  const startOffset = stationR + dotR + 2;
  // Tight grid of 4 dots per row, growing outward — Mini Metro's
  // signature passenger stack. No cap: every waiting rider gets a dot.
  const perRow = 4;
  ctx.fillStyle = RIDER_DOT_COLOR;
  for (let i = 0; i < waiting; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const offsetCol = col - (perRow - 1) / 2;
    const radial = startOffset + stride * row;
    const x = center.x + rx * radial + px * (offsetCol * stride);
    const y = center.y + ry * radial + py * (offsetCol * stride);
    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Trains ────────────────────────────────────────────────────────────

function computeTrainPx(outer: TrackGeometry): number {
  const perim = perimeterLength(outer);
  return Math.min(96, perim * 0.07);
}

function distributeLoad(totalRiders: number): number[] {
  // Even split across the 4 cars with lead-car bias on the remainder
  // so the load propagates front-to-back as the train fills. Each
  // rider maps to exactly one dot somewhere on the canvas.
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
      drawCarBody(ctx, point, carBodyW, carBodyH, track.color, load);
    }
    const dir = reverseDirection ? -1 : 1;
    const leadFraction = (((frontFraction + (-dir * segLen) / 2 / perim) % 1) + 1) % 1;
    const anchor = perimeterPoint(track, leadFraction);
    const letter = letterByCarId.get(car.id) ?? "?";

    const nextStop = pickNextStop(car, stops, airport.circumferenceM);
    const remainingM = nextStop
      ? (nextStop.y - car.y + airport.circumferenceM) % airport.circumferenceM
      : Infinity;
    placements.push({ car, anchor, letter, nextStop, remainingM });
  }
  return placements;
}

function pickNextStop(car: CarDto, stops: StopDto[], circumferenceM: number): StopDto | undefined {
  let best: StopDto | undefined;
  let bestDelta = Infinity;
  for (const stop of stops) {
    const delta = (stop.y - car.y + circumferenceM) % circumferenceM;
    // Delta ≈ 0 means we're standing at this stop; advertise the
    // *next* stop instead so the HUD reads as the destination on
    // departure rather than the current platform.
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
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.tangent);
  const halfL = length / 2;
  const halfW = width / 2;
  const r = Math.min(halfL, halfW) * 0.45;
  tracedRoundedRect(ctx, { cx: 0, cy: 0, w: length, h: width, r });
  ctx.fillStyle = fill;
  ctx.fill();
  if (load > 0) drawRidersInCar(ctx, length, width, load);
  ctx.restore();
}

function drawRidersInCar(
  ctx: CanvasRenderingContext2D,
  length: number,
  width: number,
  load: number,
): void {
  // 1:1 dot grid inside the car. Two rows by default; bumps to three
  // when packed past ~8 so the grid still fits the capsule. The dot
  // radius shrinks if the column count would force overlap.
  const padX = Math.max(1.5, length * 0.08);
  const padY = Math.max(1, width * 0.18);
  const innerW = Math.max(1, length - padX * 2);
  const innerH = Math.max(1, width - padY * 2);
  const rows = load > 8 ? 3 : 2;
  const cols = Math.max(1, Math.ceil(load / rows));
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const dotR = Math.max(0.6, Math.min(cellW, cellH) * 0.36);
  ctx.fillStyle = RIDER_DOT_COLOR;
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

// ── Persistent train HUD ──────────────────────────────────────────────

interface HudPlacement {
  placement: TrainPlacement;
  lines: string[];
  bx: number;
  by: number;
  bubbleW: number;
  bubbleH: number;
  /** Outward radial unit vector from the canvas center. */
  ox: number;
  oy: number;
}

function drawTrainHuds(
  ctx: CanvasRenderingContext2D,
  trains: TrainPlacement[],
  canvasW: number,
  canvasH: number,
  accent: string,
  physics: AirportPhysics,
  showFullLabels: boolean,
  carBodyH: number,
): void {
  if (trains.length === 0) return;
  // Skip HUD entirely on very narrow viewports — four overlapping
  // chips on a 320 px canvas can't be resolved sensibly.
  if (Math.min(canvasW, canvasH) < 340) return;

  const fontPx = showFullLabels ? 11 : 10;
  const padX = 7;
  const padY = 4;
  const lh = fontPx + 2;
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  ctx.font = `600 ${fontPx}px ${CANVAS_FONT_SANS}`;
  // Trip capacity matches the airport RON (`weight_capacity: 9000.0`
  // at an average rider weight of ~75 kg → ~120 passengers/train).
  const tripCap = 120;
  const placements: HudPlacement[] = [];

  for (const train of trains) {
    const lines = buildHudLines(train, tripCap, physics);
    let textW = 0;
    for (const l of lines) textW = Math.max(textW, ctx.measureText(l).width);
    const bubbleW = textW + padX * 2;
    const bubbleH = lh * lines.length + padY * 2;

    const radDx = train.anchor.x - cx;
    const radDy = train.anchor.y - cy;
    const radDist = Math.max(1, Math.hypot(radDx, radDy));
    const ox = radDx / radDist;
    const oy = radDy / radDist;
    const offset = carBodyH + 14;
    const ax = train.anchor.x + ox * offset;
    const ay = train.anchor.y + oy * offset;

    let bx = ax - bubbleW / 2;
    let by = ay - bubbleH / 2;
    bx = Math.max(4, Math.min(canvasW - bubbleW - 4, bx));
    by = Math.max(4, Math.min(canvasH - bubbleH - 4, by));
    placements.push({ placement: train, lines, bx, by, bubbleW, bubbleH, ox, oy });
  }

  // Collision pass — nudge perpendicular to the radial axis until no
  // overlap with earlier chips. Simpler than the tether's flip-left-right
  // because airport anchors are spread along the perimeter already.
  for (let i = 1; i < placements.length; i++) {
    const me = placements[i];
    if (!me) continue;
    let attempts = 0;
    while (attempts < 6 && hasOverlap(me, placements, i)) {
      const slideX = -me.oy;
      const slideY = me.ox;
      const step = (attempts % 2 === 0 ? 1 : -1) * (me.bubbleH * 0.6 + 6) * (1 + attempts * 0.4);
      me.bx = Math.max(4, Math.min(canvasW - me.bubbleW - 4, me.bx + slideX * step));
      me.by = Math.max(4, Math.min(canvasH - me.bubbleH - 4, me.by + slideY * step));
      attempts++;
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
    ctx.fillStyle = "rgba(37, 37, 48, 0.92)";
    tracedRoundedRect(ctx, bubbleRect);
    ctx.fill();
    ctx.fillStyle = withAlpha(accent, isDwelling(p.placement.car) ? 0.95 : 0.65);
    ctx.fillRect(p.bx, p.by, 2, p.bubbleH);
    ctx.strokeStyle = "#2a2a35";
    ctx.lineWidth = 1;
    tracedRoundedRect(ctx, bubbleRect);
    ctx.stroke();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let i = 0; i < p.lines.length; i++) {
      const ly = p.by + padY + lh * i + lh / 2;
      const line = p.lines[i] ?? "";
      ctx.fillStyle = i === 0 ? withAlpha(accent, 0.95) : "rgba(240, 244, 252, 0.95)";
      ctx.fillText(line, p.bx + padX + 4, ly);
    }
    ctx.restore();
  }
}

function hasOverlap(me: HudPlacement, all: HudPlacement[], myIdx: number): boolean {
  for (let i = 0; i < all.length; i++) {
    if (i === myIdx) continue;
    const o = all[i];
    if (!o) continue;
    if (
      me.bx + me.bubbleW <= o.bx ||
      o.bx + o.bubbleW <= me.bx ||
      me.by + me.bubbleH <= o.by ||
      o.by + o.bubbleH <= me.by
    ) {
      continue;
    }
    return true;
  }
  return false;
}

function isDwelling(car: CarDto): boolean {
  return DWELLING_PHASES.has(car.phase);
}

function buildHudLines(train: TrainPlacement, tripCap: number, physics: AirportPhysics): string[] {
  const totalRiders = train.car.riders;
  const loadLine = `${totalRiders} / ${tripCap}`;
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
