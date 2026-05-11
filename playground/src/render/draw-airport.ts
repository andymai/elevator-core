import { withAlpha } from "./color-utils";
import { CAR_DOT_COLOR, CANVAS_FONT_SANS, STOP_LABEL } from "./palette";
import type { AirportMeta, CarBubble, CarDto, Snapshot, StopDto } from "../types";

/**
 * Two concentric rounded-rectangles separated by a small gap. Stations
 * are shared platforms — one marker per named station pair drawn on a
 * mid-perimeter rect centered between outer and inner. Outer trains
 * sweep clockwise, inner trains sweep counter-clockwise. Trains render
 * as 4 short connected cars rather than one long capsule.
 *
 * Colors derive from the pane accent (`accent` arg) — the outer track
 * uses the accent at full strength and the inner uses a muted variant.
 * This keeps airport scenarios in the playground's accent-driven color
 * vocabulary rather than introducing scenario-specific hues.
 */

const NARROW_LABELS_PX = 480;
const TRAIN_CAR_COUNT = 4;
const QUEUE_VISIBLE_CAP = 6;
const CHEVRONS_PER_LOOP = 12;
const CHEVRON_SCROLL_HZ = 0.15;
const BUBBLE_ENTRANCE_MS = 140;
const BUBBLE_LIFETIME_FADE_FRAC = 0.3;
const BUBBLE_PAD_X = 6;
const BUBBLE_PAD_Y = 3;

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
  bubbles?: Map<number, CarBubble>,
  accent = "#7dd3fc",
): void {
  // No background fill — the playground's CSS gradient on `.shaft-wrap`
  // shows through, keeping airport visually inside the same panel
  // chrome as the other scenarios.
  ctx.save();

  const cx = w / 2;
  const cy = h / 2;
  const minDim = Math.min(w, h);
  const showFullLabels = minDim >= NARROW_LABELS_PX;
  const rectW = w * 0.88;
  const rectH = Math.min(h * 0.6, w * 0.42);
  const cornerR = Math.min(rectW, rectH) * 0.32;
  const gap = Math.max(28, minDim * 0.06);
  const ringThickness = Math.max(5, minDim * 0.012);

  const outerColor = withAlpha(accent, 0.9);
  const outerDim = withAlpha(accent, 0.35);
  const innerColor = withAlpha(accent, 0.55);
  const innerDim = withAlpha(accent, 0.22);

  const outer: TrackGeometry = {
    cx,
    cy,
    w: rectW,
    h: rectH,
    r: cornerR,
    color: outerColor,
    dimColor: outerDim,
    thickness: ringThickness,
  };
  const inner: TrackGeometry = {
    cx,
    cy,
    w: rectW - gap * 2,
    h: rectH - gap * 2,
    r: Math.max(0, cornerR - gap),
    color: innerColor,
    dimColor: innerDim,
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
  drawDirectionChevrons(ctx, outer, false);
  drawDirectionChevrons(ctx, inner, true);

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

  drawSharedStations(
    ctx,
    outerStops,
    innerStops,
    midline,
    outer,
    airport,
    phaseRatio,
    showFullLabels,
    accent,
  );
  drawTrain(ctx, outerCars, outer, airport.circumferenceM, false);
  drawTrain(ctx, innerCars, inner, airport.circumferenceM, true);

  if (bubbles && bubbles.size > 0) {
    drawTrainBubbles(ctx, outerCars, outer, airport.circumferenceM, false, bubbles, accent);
    drawTrainBubbles(ctx, innerCars, inner, airport.circumferenceM, true, bubbles, accent);
  }

  ctx.restore();
}

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
  // Guard against degenerate r=0: dividing by `arc` would NaN.
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
  outer: TrackGeometry,
  airport: AirportMeta,
  phaseRatio: number,
  showFullLabels: boolean,
  accent: string,
): void {
  // Plain-text station labels with a small accent-tinted platform
  // marker on the midline — matches the visual language of the other
  // playground scenarios (skyscraper renders stop labels as text next
  // to the shaft, not as standalone chips).
  const markerSize = Math.max(3, midline.h * 0.018);
  const labelColor = STOP_LABEL;
  const markerColor = withAlpha(accent, 0.45 + Math.max(0, Math.min(1, phaseRatio)) * 0.45);
  const fontPx = 11;
  ctx.font = `500 ${fontPx}px ${CANVAS_FONT_SANS}`;
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

    // Platform marker: small filled disc on the midline at the station
    // position, brightness pulsing softly with phase intensity.
    ctx.beginPath();
    ctx.arc(midPoint.x, midPoint.y, markerSize, 0, Math.PI * 2);
    ctx.fillStyle = markerColor;
    ctx.fill();

    // Label positioned outside the outer perimeter along the outward
    // normal so it never collides with the rings or queue stacks.
    const dx = outerPoint.x - midline.cx;
    const dy = outerPoint.y - midline.cy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const offset = fontPx * 1.5;
    const lx = outerPoint.x + (dx / dist) * offset;
    const ly = outerPoint.y + (dy / dist) * offset;
    ctx.fillStyle = labelColor;
    const text = showFullLabels ? outerStop.name : abbreviateStation(outerStop.name);
    ctx.fillText(text, lx, ly);

    drawQueueStack(ctx, midPoint, midline, outerStop.waiting, true, accent);
    drawQueueStack(ctx, midPoint, midline, innerStop.waiting, false, accent);
  }
}

function drawQueueStack(
  ctx: CanvasRenderingContext2D,
  point: PerimeterPoint,
  midline: RectGeometry,
  waiting: number,
  outerSide: boolean,
  accent: string,
): void {
  if (waiting <= 0) return;
  const dx = point.x - midline.cx;
  const dy = point.y - midline.cy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const nx = (outerSide ? 1 : -1) * (dx / dist);
  const ny = (outerSide ? 1 : -1) * (dy / dist);

  const dotR = Math.max(2.5, midline.h * 0.012);
  const spacing = dotR * 2.4;
  const start = midline.h * 0.06;
  ctx.fillStyle = withAlpha(accent, outerSide ? 0.85 : 0.6);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const visible = Math.min(waiting, QUEUE_VISIBLE_CAP);
  for (let i = 0; i < visible; i++) {
    const isOverflow = i === QUEUE_VISIBLE_CAP - 1 && waiting > QUEUE_VISIBLE_CAP;
    const offset = start + spacing * i;
    const px = point.x + nx * offset;
    const py = point.y + ny * offset;
    if (isOverflow) {
      ctx.font = `${Math.round(dotR * 3)}px ${CANVAS_FONT_SANS}`;
      ctx.fillText(`+${waiting - QUEUE_VISIBLE_CAP + 1}`, px, py);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDirectionChevrons(
  ctx: CanvasRenderingContext2D,
  track: TrackGeometry,
  reverseDirection: boolean,
): void {
  const offsetSec = (performance.now() / 1000) * CHEVRON_SCROLL_HZ;
  const dir = reverseDirection ? -1 : 1;
  const baseFraction = (offsetSec * dir) % 1;
  const size = Math.max(4, track.thickness * 0.85);
  ctx.save();
  ctx.fillStyle = track.dimColor;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < CHEVRONS_PER_LOOP; i++) {
    const f = (baseFraction + i / CHEVRONS_PER_LOOP + 1) % 1;
    const point = perimeterPoint(track, f);
    drawChevron(ctx, point, size, reverseDirection);
  }
  ctx.restore();
}

function drawChevron(
  ctx: CanvasRenderingContext2D,
  point: PerimeterPoint,
  size: number,
  reverseDirection: boolean,
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.tangent + (reverseDirection ? Math.PI : 0));
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, -size * 0.4);
  ctx.lineTo(size * 0.4, 0);
  ctx.lineTo(-size * 0.5, size * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTrain(
  ctx: CanvasRenderingContext2D,
  cars: CarDto[],
  track: TrackGeometry,
  circumferenceM: number,
  reverseDirection: boolean,
): void {
  if (cars.length === 0) return;
  const perim = perimeterLength(track);
  const trainPx = Math.min(80, perim * 0.06);
  const segLen = trainPx / TRAIN_CAR_COUNT;
  const segWidth = track.thickness * 1.4;
  const couplerGap = segLen * 0.18;
  const visibleSeg = segLen - couplerGap;

  for (const car of cars) {
    const baseFraction = car.y / circumferenceM;
    const frontFraction = reverseDirection ? 1 - baseFraction : baseFraction;
    const dwelling = DWELLING_PHASES.has(car.phase);
    for (let i = 0; i < TRAIN_CAR_COUNT; i++) {
      const dir = reverseDirection ? -1 : 1;
      const segCenterPx = -dir * (i * segLen + segLen / 2);
      const segFraction = (((frontFraction + segCenterPx / perim) % 1) + 1) % 1;
      const point = perimeterPoint(track, segFraction);
      drawCarSegment(ctx, point, visibleSeg, segWidth, track.color, i === 0, dwelling && i === 0);
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
  dwelling: boolean,
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.tangent);
  const halfL = length / 2;
  const halfW = width / 2;
  const r = Math.min(halfL, halfW) * 0.4;
  if (dwelling) {
    const pulse = 0.55 + Math.sin(performance.now() / 280) * 0.15;
    ctx.save();
    ctx.shadowColor = CAR_DOT_COLOR;
    ctx.shadowBlur = halfW * (2.6 + pulse);
    ctx.fillStyle = CAR_DOT_COLOR;
    ctx.beginPath();
    ctx.arc(halfL - r, 0, halfW * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  tracedRoundedRect(ctx, { cx: 0, cy: 0, w: length, h: width, r });
  ctx.fillStyle = fill;
  ctx.fill();
  if (isFront) {
    ctx.beginPath();
    ctx.arc(halfL - r, 0, halfW * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = CAR_DOT_COLOR;
    ctx.fill();
  }
  ctx.restore();
}

function drawTrainBubbles(
  ctx: CanvasRenderingContext2D,
  cars: CarDto[],
  track: TrackGeometry,
  circumferenceM: number,
  reverseDirection: boolean,
  bubbles: Map<number, CarBubble>,
  accent: string,
): void {
  const now = performance.now();
  const perim = perimeterLength(track);
  const trainPx = Math.min(80, perim * 0.06);
  const segLen = trainPx / TRAIN_CAR_COUNT;
  for (const car of cars) {
    const bubble = bubbles.get(car.id);
    if (!bubble) continue;
    const ttl = Math.max(1, bubble.expiresAt - bubble.bornAt);
    const remaining = bubble.expiresAt - now;
    if (remaining <= 0) continue;
    const lifetimeFade =
      remaining > ttl * BUBBLE_LIFETIME_FADE_FRAC
        ? 1
        : Math.max(0, remaining / (ttl * BUBBLE_LIFETIME_FADE_FRAC));
    const age = Math.max(0, now - bubble.bornAt);
    const entrance = Math.min(1, age / BUBBLE_ENTRANCE_MS);
    const alpha = lifetimeFade * entrance;
    if (alpha <= 0) continue;

    const baseFraction = car.y / circumferenceM;
    const dir = reverseDirection ? -1 : 1;
    const frontShift = -dir * (segLen / 2);
    const frontFraction =
      ((((reverseDirection ? 1 - baseFraction : baseFraction) + frontShift / perim) % 1) + 1) % 1;
    const point = perimeterPoint(track, frontFraction);
    drawBubbleAt(ctx, point, track, bubble, alpha, accent);
  }
}

function drawBubbleAt(
  ctx: CanvasRenderingContext2D,
  anchor: PerimeterPoint,
  track: TrackGeometry,
  bubble: CarBubble,
  alpha: number,
  accent: string,
): void {
  // Match the playground's standard bubble visual: translucent dark
  // fill, hairline pane-accent stroke, soft accent halo, glyph in
  // accent + body in off-white. No tail (the airport rect doesn't
  // have a stable "above" or "below" for every train angle).
  const fontPx = 11;
  ctx.font = `500 ${fontPx}px ${CANVAS_FONT_SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const glyphW = ctx.measureText(bubble.glyph).width;
  const textW = ctx.measureText(bubble.text).width;
  const gap = 3;
  const w = glyphW + gap + textW + BUBBLE_PAD_X * 2;
  const h = fontPx + BUBBLE_PAD_Y * 2 + 2;
  // Push the bubble outward perpendicular to the track tangent so it
  // sits clear of the train and the inner ring.
  const nx = -Math.sin(anchor.tangent);
  const ny = Math.cos(anchor.tangent);
  const offset = track.thickness * 1.6 + h * 0.55;
  const cx = anchor.x - nx * offset;
  const cy = anchor.y - ny * offset;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = withAlpha(accent, 0.5);
  ctx.shadowBlur = 8;
  tracedRoundedRect(ctx, { cx, cy, w, h, r: h * 0.4 });
  ctx.fillStyle = "rgba(8, 10, 14, 0.85)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = withAlpha(accent, 0.45);
  ctx.lineWidth = 1;
  ctx.stroke();

  const textStartX = cx - w / 2 + BUBBLE_PAD_X;
  ctx.fillStyle = withAlpha(accent, 0.75);
  ctx.fillText(bubble.glyph, textStartX, cy);
  ctx.fillStyle = CAR_DOT_COLOR;
  ctx.fillText(bubble.text, textStartX + glyphW + gap, cy);
  ctx.restore();
}

function abbreviateStation(name: string): string {
  if (name === "Terminal") return "T";
  if (name.startsWith("Concourse ")) return name.slice(10, 11).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}
