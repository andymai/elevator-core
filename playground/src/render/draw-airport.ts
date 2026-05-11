import type { AirportMeta, CarDto, Snapshot, StopDto } from "../types";

/**
 * Two concentric rounded-rectangles separated by a small gap. Stations
 * are "shared platforms" — one chip per named station pair, drawn on a
 * mid-perimeter centered between outer and inner. Outer trains sweep
 * clockwise, inner trains sweep counter-clockwise (visually opposite
 * directions on the wide top edge). Trains render as 4 short connected
 * cars rather than one long capsule.
 *
 * Engine has 14 distinct StopIds (7 outer at index 0..outerStopCount-1,
 * 7 inner with mirrored RON positions). The renderer pairs them by
 * index so paired stops land at the same perimeter fraction.
 */

const OUTER_COLOR = "#d4a056";
const OUTER_COLOR_DIM = "#8a6a3a";
const INNER_COLOR = "#5a9b9c";
const INNER_COLOR_DIM = "#3a6566";
const STATION_FILL = "#1a1714";
const STATION_LABEL = "#c9bda8";
const STATION_BORDER_DIM = "#3d352a";
const RING_BACKGROUND = "#16130f";
const QUEUE_DOT = "#e8d8b8";
const CAR_LEAD_HIGHLIGHT = "#f5d99a";

const NARROW_LABELS_PX = 480;
const TRAIN_CAR_COUNT = 4;
const QUEUE_VISIBLE_CAP = 6;

interface RectGeometry {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
}

interface TrackGeometry extends RectGeometry {
  color: string;
  dimColor: string;
  thickness: number;
}

interface PerimeterPoint {
  x: number;
  y: number;
  /** Tangent direction in radians; 0 = +x (rightward), π/2 = +y (downward). */
  tangent: number;
}

export function drawAirportScene(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  airport: AirportMeta,
  phaseRatio: number,
): void {
  ctx.save();
  ctx.fillStyle = RING_BACKGROUND;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const minDim = Math.min(w, h);
  const showFullLabels = minDim >= NARROW_LABELS_PX;
  // Elongate the rect into a wide ATL-Plane-Train-ish band. Width takes
  // 88% of the available area; height is capped so an even-shorter rect
  // stays readable on landscape mobile.
  const rectW = w * 0.88;
  const rectH = Math.min(h * 0.6, w * 0.42);
  const cornerR = Math.min(rectW, rectH) * 0.32;
  // Gap between concentric rects scales with the smaller dimension but
  // stays large enough for chip + queue stacks on each side.
  const gap = Math.max(28, minDim * 0.06);
  const ringThickness = Math.max(5, minDim * 0.012);

  const outer: TrackGeometry = {
    cx,
    cy,
    w: rectW,
    h: rectH,
    r: cornerR,
    color: OUTER_COLOR,
    dimColor: OUTER_COLOR_DIM,
    thickness: ringThickness,
  };
  const inner: TrackGeometry = {
    cx,
    cy,
    w: rectW - gap * 2,
    h: rectH - gap * 2,
    r: Math.max(0, cornerR - gap),
    color: INNER_COLOR,
    dimColor: INNER_COLOR_DIM,
    thickness: ringThickness,
  };
  const midline: RectGeometry = {
    cx,
    cy,
    w: (outer.w + inner.w) / 2,
    h: (outer.h + inner.h) / 2,
    r: (outer.r + inner.r) / 2,
  };

  drawTrack(ctx, outer);
  drawTrack(ctx, inner);

  const outerStops = snap.stops.slice(0, airport.outerStopCount);
  const innerStops = snap.stops.slice(airport.outerStopCount);

  // Distinct line entity ids — the lower one belongs to the outer
  // loop (RON declares outer first), so cars partition cleanly by id.
  const distinctLines = [...new Set(snap.cars.map((c) => c.line))].sort((a, b) => a - b);
  const outerLine = distinctLines[0];
  const innerLine = distinctLines[1];
  const outerCars: CarDto[] = [];
  const innerCars: CarDto[] = [];
  for (const car of snap.cars) {
    if (car.line === outerLine) outerCars.push(car);
    else if (car.line === innerLine) innerCars.push(car);
  }

  drawSharedStations(ctx, outerStops, innerStops, midline, airport, phaseRatio, showFullLabels);
  drawTrain(ctx, outerCars, outer, airport.circumferenceM, false);
  drawTrain(ctx, innerCars, inner, airport.circumferenceM, true);

  ctx.restore();
}

function perimeterLength(rect: RectGeometry): number {
  return (
    2 * Math.max(0, rect.w - 2 * rect.r) +
    2 * Math.max(0, rect.h - 2 * rect.r) +
    2 * Math.PI * rect.r
  );
}

/**
 * Walk the perimeter clockwise from top-left corner endpoint. `f` is
 * in [0, 1); returns the (x, y) point and the tangent direction.
 *
 * Walk order:
 *   1. top edge       — left→right, tangent 0
 *   2. top-right arc  — quarter turn, tangent 0→π/2
 *   3. right edge     — top→bottom, tangent π/2
 *   4. bottom-right arc
 *   5. bottom edge    — right→left
 *   6. bottom-left arc
 *   7. left edge      — bottom→top
 *   8. top-left arc   — closes the loop
 */
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

  // 1. top edge
  if (p < wInner) {
    return { x: left + r + p, y: top, tangent: 0 };
  }
  p -= wInner;
  // 2. top-right arc, center (right - r, top + r)
  if (p < arc) {
    const a = -Math.PI / 2 + (p / arc) * (Math.PI / 2);
    return {
      x: right - r + Math.cos(a) * r,
      y: top + r + Math.sin(a) * r,
      tangent: a + Math.PI / 2,
    };
  }
  p -= arc;
  // 3. right edge
  if (p < hInner) {
    return { x: right, y: top + r + p, tangent: Math.PI / 2 };
  }
  p -= hInner;
  // 4. bottom-right arc, center (right - r, bottom - r)
  if (p < arc) {
    const a = 0 + (p / arc) * (Math.PI / 2);
    return {
      x: right - r + Math.cos(a) * r,
      y: bottom - r + Math.sin(a) * r,
      tangent: a + Math.PI / 2,
    };
  }
  p -= arc;
  // 5. bottom edge
  if (p < wInner) {
    return { x: right - r - p, y: bottom, tangent: Math.PI };
  }
  p -= wInner;
  // 6. bottom-left arc, center (left + r, bottom - r)
  if (p < arc) {
    const a = Math.PI / 2 + (p / arc) * (Math.PI / 2);
    return {
      x: left + r + Math.cos(a) * r,
      y: bottom - r + Math.sin(a) * r,
      tangent: a + Math.PI / 2,
    };
  }
  p -= arc;
  // 7. left edge
  if (p < hInner) {
    return { x: left, y: bottom - r - p, tangent: -Math.PI / 2 };
  }
  p -= hInner;
  // 8. top-left arc, center (left + r, top + r). Closes back to fraction 0.
  const a = Math.PI + (p / arc) * (Math.PI / 2);
  return { x: left + r + Math.cos(a) * r, y: top + r + Math.sin(a) * r, tangent: a + Math.PI / 2 };
}

/**
 * Trace a rounded-rectangle path on the canvas. Stroke is applied by
 * the caller. Uses the standard 4-arc construction.
 */
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
  ctx.strokeStyle = track.dimColor;
  ctx.lineWidth = track.thickness;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawSharedStations(
  ctx: CanvasRenderingContext2D,
  outerStops: StopDto[],
  innerStops: StopDto[],
  midline: RectGeometry,
  airport: AirportMeta,
  phaseRatio: number,
  showFullLabels: boolean,
): void {
  // 1.3:1 aspect rounded-rect chip; sized to fit the inter-ring gap.
  const chipH = Math.max(14, midline.h * 0.075);
  const chipW = chipH * 1.3;
  const chipR = chipH * 0.32;
  // Phase intensity drives border brightness — chips pulse during peaks.
  const borderColor = lerpHex(
    STATION_BORDER_DIM,
    OUTER_COLOR,
    Math.max(0, Math.min(1, phaseRatio)),
  );

  // Pair stops by index: outer index i pairs with inner index i. RON
  // declares paired names (Terminal, Concourse A..F) in matching order.
  const pairCount = Math.min(outerStops.length, innerStops.length);
  for (let i = 0; i < pairCount; i++) {
    const outerStop = outerStops[i];
    const innerStop = innerStops[i];
    if (!outerStop || !innerStop) continue;

    // Outer stop's RON-position fraction defines the chip's perimeter
    // location. Inner positions are mirrored so they land at the same
    // chip via 1 - innerStop.y / circumference (paired by design).
    const fraction = outerStop.y / airport.circumferenceM;
    const point = perimeterPoint(midline, fraction);

    drawStationChip(ctx, point.x, point.y, chipW, chipH, chipR, borderColor, outerStop.name);
    if (showFullLabels) {
      drawStationFullLabel(ctx, point, midline, chipH, outerStop.name);
    }
    drawQueueStack(ctx, point, midline, outerStop.waiting, true);
    drawQueueStack(ctx, point, midline, innerStop.waiting, false);
  }
}

function drawStationChip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
  borderColor: string,
  name: string,
): void {
  tracedRoundedRect(ctx, { cx, cy, w, h, r });
  ctx.fillStyle = STATION_FILL;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = STATION_LABEL;
  ctx.font = `${Math.round(h * 0.7)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(abbreviateStation(name), cx, cy + 1);
}

function drawStationFullLabel(
  ctx: CanvasRenderingContext2D,
  point: PerimeterPoint,
  midline: RectGeometry,
  chipH: number,
  name: string,
): void {
  // Place label on whichever side has more room: away from the canvas
  // center along the perimeter's outward normal.
  const dx = point.x - midline.cx;
  const dy = point.y - midline.cy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const offset = chipH * 1.6;
  const lx = point.x + (dx / dist) * offset;
  const ly = point.y + (dy / dist) * offset;
  ctx.font = `11px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = STATION_LABEL;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, lx, ly);
}

function drawQueueStack(
  ctx: CanvasRenderingContext2D,
  point: PerimeterPoint,
  midline: RectGeometry,
  waiting: number,
  outerSide: boolean,
): void {
  if (waiting <= 0) return;
  // Outward normal at this perimeter point (toward canvas edge); inward
  // is opposite. Outer queue grows outward; inner queue grows inward.
  const dx = point.x - midline.cx;
  const dy = point.y - midline.cy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const nx = (outerSide ? 1 : -1) * (dx / dist);
  const ny = (outerSide ? 1 : -1) * (dy / dist);

  const dotR = Math.max(2.5, midline.h * 0.012);
  const spacing = dotR * 2.4;
  const start = midline.h * 0.07;

  ctx.fillStyle = QUEUE_DOT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const visible = Math.min(waiting, QUEUE_VISIBLE_CAP);
  for (let i = 0; i < visible; i++) {
    const isLast = i === QUEUE_VISIBLE_CAP - 1 && waiting > QUEUE_VISIBLE_CAP;
    const offset = start + spacing * i;
    const px = point.x + nx * offset;
    const py = point.y + ny * offset;
    if (isLast) {
      ctx.font = `${Math.round(dotR * 3.2)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(`+${waiting - QUEUE_VISIBLE_CAP + 1}`, px, py);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Render each car as 4 short, connected rectangles along the perimeter
 * — an ATL-style multi-car train rather than one long capsule. Inner
 * trains walk the perimeter in reverse so their visual motion is the
 * opposite of outer trains (paired-station alignment falls out of the
 * RON's mirrored inner positions).
 */
function drawTrain(
  ctx: CanvasRenderingContext2D,
  cars: CarDto[],
  track: TrackGeometry,
  circumferenceM: number,
  reverseDirection: boolean,
): void {
  if (cars.length === 0) return;
  const perim = perimeterLength(track);
  // Train length: 6% of perimeter or 80px max, whichever is smaller.
  // Each engine `Car` becomes a visible train of TRAIN_CAR_COUNT segs.
  const trainPx = Math.min(80, perim * 0.06);
  const segLen = trainPx / TRAIN_CAR_COUNT;
  const segWidth = track.thickness * 1.4;
  const couplerGap = segLen * 0.18;
  const visibleSeg = segLen - couplerGap;

  for (const car of cars) {
    const baseFraction = car.y / circumferenceM;
    // Inner runs CCW: a higher RON position should appear earlier in
    // perimeter walk, not later. Negate the offset.
    const frontFraction = reverseDirection ? 1 - baseFraction : baseFraction;
    for (let i = 0; i < TRAIN_CAR_COUNT; i++) {
      // Segments tail behind the front along the direction of motion.
      const dir = reverseDirection ? -1 : 1;
      const segCenterPx = -dir * (i * segLen + segLen / 2);
      const segFraction = (((frontFraction + segCenterPx / perim) % 1) + 1) % 1;
      const point = perimeterPoint(track, segFraction);
      drawCarSegment(ctx, point, visibleSeg, segWidth, track.color, i === 0);
    }
  }
}

function drawCarSegment(
  ctx: CanvasRenderingContext2D,
  point: PerimeterPoint,
  length: number,
  width: number,
  fill: string,
  isFront: boolean,
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.tangent);
  const halfL = length / 2;
  const halfW = width / 2;
  const r = Math.min(halfL, halfW) * 0.4;
  tracedRoundedRect(ctx, { cx: 0, cy: 0, w: length, h: width, r });
  ctx.fillStyle = fill;
  ctx.fill();
  if (isFront) {
    // Lead-edge highlight indicates direction of travel; sits at the
    // front of the lead car (along +x in the rotated frame).
    ctx.beginPath();
    ctx.arc(halfL - r, 0, halfW * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = CAR_LEAD_HIGHLIGHT;
    ctx.fill();
  }
  ctx.restore();
}

function abbreviateStation(name: string): string {
  if (name === "Terminal") return "T";
  if (name.startsWith("Concourse ")) return name.slice(10, 11).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}
