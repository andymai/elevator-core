import type { AirportMeta, CarDto, Snapshot, StopDto } from "../types";

/**
 * Two concentric rings — outer loop (warm amber, clockwise sweep) and
 * inner loop (cool teal, counter-clockwise sweep). Stops are partitioned
 * by index range from `AirportMeta.outerStopCount`: the first N stops
 * belong to the outer loop, the rest to the inner. Cars are assigned
 * via `line_ids` on the DTO.
 *
 * The renderer is intentionally minimal in v1: rings, station chips,
 * capsule cars with leading dots, and per-station waiting queues drawn
 * as small inset stacks. Color theming, station chip airport-gate
 * styling, per-loop metrics, and phase tinting are follow-up polish.
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
  color: string;
  dimColor: string;
}

export function drawAirportScene(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  airport: AirportMeta,
): void {
  const cx = w / 2;
  const cy = h / 2;
  // Leave 14% margin so labels at top / bottom of outer ring don't clip.
  const maxRadius = Math.min(w, h) * 0.43;
  const outerRadius = maxRadius;
  // Inner radius leaves a visible amber-teal gap; tuned so a 50%-larger
  // outer chip doesn't crash into an inner one.
  const innerRadius = maxRadius * 0.58;
  const ringThickness = Math.max(6, Math.min(w, h) * 0.018);

  ctx.save();
  ctx.fillStyle = RING_BACKGROUND;
  ctx.fillRect(0, 0, w, h);

  const outerGeom: RingGeometry = {
    cx,
    cy,
    radius: outerRadius,
    thickness: ringThickness,
    color: OUTER_COLOR,
    dimColor: OUTER_COLOR_DIM,
  };
  const innerGeom: RingGeometry = {
    cx,
    cy,
    radius: innerRadius,
    thickness: ringThickness,
    color: INNER_COLOR,
    dimColor: INNER_COLOR_DIM,
  };

  drawRing(ctx, outerGeom);
  drawRing(ctx, innerGeom);

  // Partition stops by outer/inner via index range; the RON declares
  // outer stops first.
  const outerStops: StopDto[] = [];
  const innerStops: StopDto[] = [];
  for (let i = 0; i < snap.stops.length; i++) {
    const stop = snap.stops[i];
    if (stop === undefined) continue;
    if (i < airport.outerStopCount) {
      outerStops.push(stop);
    } else {
      innerStops.push(stop);
    }
  }

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

  drawStations(ctx, outerStops, outerGeom, airport.circumferenceM, true);
  drawStations(ctx, innerStops, innerGeom, airport.circumferenceM, false);
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
  // Convention: angle 0 = top of the ring (12 o'clock), positive
  // rotation sweeps clockwise. Most ring-based wayfinding diagrams
  // place a "main station" at the top; the airport's Terminal lives at
  // position 0 on both loops, so this lines up.
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
): void {
  const chipR = Math.max(8, geom.thickness * 1.6);
  for (const stop of stops) {
    const angle = positionToAngle(stop.y, circumferenceM);
    const center = polar(geom, angle, 0);

    ctx.beginPath();
    ctx.arc(center.x, center.y, chipR, 0, Math.PI * 2);
    ctx.fillStyle = STATION_FILL;
    ctx.fill();
    ctx.strokeStyle = geom.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Initial letter for the station — Terminal → "T", Concourse A → "A".
    // Keeps the chip readable at small sizes; full label sits outside.
    ctx.fillStyle = STATION_LABEL;
    ctx.font = `${Math.round(chipR * 0.95)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const glyph = abbreviateStation(stop.name);
    ctx.fillText(glyph, center.x, center.y + 1);

    // Label sits outside the ring (outer station) or inside (inner)
    // so the two ring sets don't collide at adjacent angles.
    const labelOffset = outer ? chipR + 14 : -(chipR + 14);
    const labelPos = polar(geom, angle, labelOffset);
    ctx.font = `11px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = STATION_LABEL;
    ctx.fillText(stop.name, labelPos.x, labelPos.y);

    // Queue stack: small dots radial-out (outer) or radial-in (inner).
    if (stop.waiting > 0) {
      drawQueueStack(ctx, geom, angle, stop.waiting, outer);
    }
  }
}

function abbreviateStation(name: string): string {
  // "Terminal" -> "T", "Concourse A" -> "A". For unrecognized formats
  // return the first letter to keep the chip non-empty.
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
  // Cap at 12 dots; further crowding visually saturates so a finer
  // count adds no information.
  const visible = Math.min(waiting, 12);
  const dotR = 2.5;
  const spacing = 6;
  // Stack starts just outside the chip border and grows radially away
  // from the ring (outer: outward; inner: inward).
  const chipR = Math.max(8, geom.thickness * 1.6);
  const startOffset = outer ? chipR + 4 : -(chipR + 4);
  const step = outer ? spacing : -spacing;
  ctx.fillStyle = QUEUE_DOT;
  for (let i = 0; i < visible; i++) {
    const offset = startOffset + step * (i + 1);
    const p = polar(geom, angle, offset);
    ctx.beginPath();
    ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCars(
  ctx: CanvasRenderingContext2D,
  cars: CarDto[],
  geom: RingGeometry,
  circumferenceM: number,
): void {
  // Each car is a small arc segment along the ring with a brighter
  // leading dot indicating direction of travel.
  const arcSpanM = Math.min(120, circumferenceM * 0.08);
  const halfSpanRad = (arcSpanM / circumferenceM) * Math.PI;
  for (const car of cars) {
    const angle = positionToAngle(car.y, circumferenceM);
    // Cars sweep in the direction of increasing position, which after
    // the angle remap is clockwise. The leading edge is angle + half-span.
    ctx.beginPath();
    ctx.arc(geom.cx, geom.cy, geom.radius, angle - halfSpanRad, angle + halfSpanRad);
    ctx.strokeStyle = geom.color;
    ctx.lineWidth = geom.thickness * 0.85;
    ctx.lineCap = "round";
    ctx.stroke();

    // Leading dot — front of the car. Slightly brighter and sits at the
    // angle+halfSpanRad position.
    const lead = polar(geom, angle + halfSpanRad, 0);
    ctx.beginPath();
    ctx.arc(lead.x, lead.y, geom.thickness * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#f5d99a";
    ctx.fill();
  }
}
