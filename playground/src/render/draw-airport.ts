import type { AirportMeta, CarDto, Snapshot, StopDto } from "../types";

/**
 * Concentric rings: outer loop on the outside, inner loop nested inside.
 * Stops are partitioned by index range from `AirportMeta.outerStopCount`
 * — the first N stops belong to the outer loop, the rest to the inner.
 * Cars are partitioned by `car.line` entity id; the lowest distinct
 * value is the outer loop because the RON declares outer first.
 */

const OUTER_COLOR = "#d4a056";
const OUTER_COLOR_DIM = "#8a6a3a";
const INNER_COLOR = "#5a9b9c";
const INNER_COLOR_DIM = "#3a6566";
const STATION_FILL = "#1a1714";
const STATION_LABEL = "#c9bda8";
const RING_BACKGROUND = "#16130f";
const QUEUE_DOT = "#e8d8b8";

interface RingGeometry {
  cx: number;
  cy: number;
  radius: number;
  thickness: number;
  chipR: number;
  color: string;
  dimColor: string;
}

// Below this min-dimension (px), the full "Concourse A" label is dropped
// in favour of the chip glyph alone. Inner labels live INSIDE the inner
// ring; at small radii opposing labels collide across the center. Outer
// labels at 0.43 × minDim run off the canvas edge horizontally on a
// 360-wide portrait. Glyph-only is the readable fallback.
const NARROW_LABELS_PX = 480;

export function drawAirportScene(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  airport: AirportMeta,
): void {
  const cx = w / 2;
  const cy = h / 2;
  const minDim = Math.min(w, h);
  // 14% margin so labels at top / bottom of the outer ring don't clip.
  const maxRadius = minDim * 0.43;
  const outerRadius = maxRadius;
  // Inner radius leaves a visible amber-teal gap; tuned so a 50%-larger
  // outer chip doesn't crash into an inner one.
  const innerRadius = maxRadius * 0.58;
  const ringThickness = Math.max(6, minDim * 0.018);
  const showFullLabels = minDim >= NARROW_LABELS_PX;

  ctx.save();
  ctx.fillStyle = RING_BACKGROUND;
  ctx.fillRect(0, 0, w, h);

  const chipR = Math.max(8, ringThickness * 1.6);
  const outerGeom: RingGeometry = {
    cx,
    cy,
    radius: outerRadius,
    thickness: ringThickness,
    chipR,
    color: OUTER_COLOR,
    dimColor: OUTER_COLOR_DIM,
  };
  const innerGeom: RingGeometry = {
    cx,
    cy,
    radius: innerRadius,
    thickness: ringThickness,
    chipR,
    color: INNER_COLOR,
    dimColor: INNER_COLOR_DIM,
  };

  drawRing(ctx, outerGeom);
  drawRing(ctx, innerGeom);

  // Partition stops by outer/inner via index range; the RON declares
  // outer stops first.
  const outerStops = snap.stops.slice(0, airport.outerStopCount);
  const innerStops = snap.stops.slice(airport.outerStopCount);

  // Partition cars by line entity id. The RON declares the outer
  // line first, so the lowest distinct `car.line` value belongs to
  // the outer loop. (Config-level line ids 1/2 don't survive to the
  // DTO — `car.line` is the runtime entity id.)
  const distinctLines = [...new Set(snap.cars.map((c) => c.line))].sort((a, b) => a - b);
  const outerLine = distinctLines[0];
  const innerLine = distinctLines[1];
  const outerCars: CarDto[] = [];
  const innerCars: CarDto[] = [];
  for (const car of snap.cars) {
    if (car.line === outerLine) outerCars.push(car);
    else if (car.line === innerLine) innerCars.push(car);
  }

  drawStations(ctx, outerStops, outerGeom, airport.circumferenceM, true, showFullLabels);
  drawStations(ctx, innerStops, innerGeom, airport.circumferenceM, false, showFullLabels);
  drawCars(ctx, outerCars, outerGeom, airport.circumferenceM);
  drawCars(ctx, innerCars, innerGeom, airport.circumferenceM);

  ctx.restore();
}

function drawRing(ctx: CanvasRenderingContext2D, geom: RingGeometry): void {
  ctx.beginPath();
  ctx.arc(geom.cx, geom.cy, geom.radius, 0, Math.PI * 2);
  ctx.strokeStyle = geom.dimColor;
  ctx.lineWidth = geom.thickness;
  ctx.lineCap = "butt";
  ctx.stroke();
}

function positionToAngle(positionM: number, circumferenceM: number): number {
  // Position 0 sits at 12 o'clock; sweep clockwise.
  const fraction = ((positionM % circumferenceM) + circumferenceM) % circumferenceM;
  return -Math.PI / 2 + (fraction / circumferenceM) * Math.PI * 2;
}

function polar(geom: RingGeometry, angle: number, radialOffset = 0): { x: number; y: number } {
  const r = geom.radius + radialOffset;
  return { x: geom.cx + Math.cos(angle) * r, y: geom.cy + Math.sin(angle) * r };
}

function drawStations(
  ctx: CanvasRenderingContext2D,
  stops: StopDto[],
  geom: RingGeometry,
  circumferenceM: number,
  outer: boolean,
  showFullLabels: boolean,
): void {
  for (const stop of stops) {
    const angle = positionToAngle(stop.y, circumferenceM);
    const center = polar(geom, angle, 0);

    ctx.beginPath();
    ctx.arc(center.x, center.y, geom.chipR, 0, Math.PI * 2);
    ctx.fillStyle = STATION_FILL;
    ctx.fill();
    ctx.strokeStyle = geom.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = STATION_LABEL;
    ctx.font = `${Math.round(geom.chipR * 0.95)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(abbreviateStation(stop.name), center.x, center.y + 1);

    if (showFullLabels) {
      // Outer labels live outside the ring; inner labels live inside,
      // so the two ring sets don't collide at adjacent angles.
      const labelOffset = outer ? geom.chipR + 14 : -(geom.chipR + 14);
      const labelPos = polar(geom, angle, labelOffset);
      ctx.font = `11px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(stop.name, labelPos.x, labelPos.y);
    }

    if (stop.waiting > 0) {
      drawQueueStack(ctx, geom, angle, stop.waiting, outer);
    }
  }
}

function abbreviateStation(name: string): string {
  if (name === "Terminal") return "T";
  if (name.startsWith("Concourse ")) return name.slice(10, 11).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

function drawQueueStack(
  ctx: CanvasRenderingContext2D,
  geom: RingGeometry,
  angle: number,
  waiting: number,
  outer: boolean,
): void {
  // Cap at 12 dots; beyond that the stack saturates visually.
  const visible = Math.min(waiting, 12);
  // Scale dot size with the ring band so the stack reads at any viewport.
  const dotR = Math.max(2.5, geom.thickness * 0.4);
  const spacing = dotR * 2.2;
  ctx.fillStyle = QUEUE_DOT;
  if (outer) {
    // Outer queue grows radially outward, away from the canvas center.
    for (let i = 0; i < visible; i++) {
      const offset = geom.chipR + spacing * (i + 1);
      const p = polar(geom, angle, offset);
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Inner queue grows tangentially clockwise along the ring's inner
    // edge — preserves the empty negative space at the canvas center
    // even with a full 12-dot stack.
    const insetOffset = -(geom.chipR + dotR + 2);
    const insetRadius = Math.abs(geom.radius + insetOffset);
    const arcStep = spacing / insetRadius;
    for (let i = 0; i < visible; i++) {
      const dotAngle = angle + arcStep * (i + 1);
      const p = polar(geom, dotAngle, insetOffset);
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCars(
  ctx: CanvasRenderingContext2D,
  cars: CarDto[],
  geom: RingGeometry,
  circumferenceM: number,
): void {
  const arcSpanM = Math.min(120, circumferenceM * 0.08);
  const halfSpanRad = (arcSpanM / circumferenceM) * Math.PI;
  for (const car of cars) {
    const angle = positionToAngle(car.y, circumferenceM);
    ctx.beginPath();
    ctx.arc(geom.cx, geom.cy, geom.radius, angle - halfSpanRad, angle + halfSpanRad);
    ctx.strokeStyle = geom.color;
    ctx.lineWidth = geom.thickness * 0.85;
    ctx.lineCap = "round";
    ctx.stroke();

    // Leading dot at angle + halfSpanRad indicates sweep direction.
    const lead = polar(geom, angle + halfSpanRad, 0);
    ctx.beginPath();
    ctx.arc(lead.x, lead.y, geom.thickness * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#f5d99a";
    ctx.fill();
  }
}
