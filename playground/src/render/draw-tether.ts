import { withAlpha } from "./color-utils";
import {
  buildHudList,
  drawClimberCabin,
  drawClimberHuds,
  drawTetherSideCard,
  type AltitudeAxis,
} from "./draw-tether-hud";
import type { Scale } from "./layout";
import { TARGET_FILL } from "./palette";
import { tetherDecadeTicks } from "./tether";
import type { Snapshot, TetherMeta } from "../types";

/**
 * Tether visualization is two layered images: a planetary backdrop
 * (sky gradient → space → starfield → counterweight) and a single
 * cable with platform markers along it. All cars share that one
 * cable, drawn at world altitudes mapped through `toScreenAlt`.
 */

/**
 * Atmosphere palette tuned to the playground's warm-dark surface
 * tokens (`--bg-primary` / `--bg-secondary` / `--bg-elevated`). The
 * lower troposphere picks up a faint warm tint reminiscent of the
 * accent colour; everything above the mesosphere fades to near-black
 * so stars register without the rest of the canvas competing for
 * attention. Day-phase only nudges saturation — the visual mode is
 * "moody dusk" rather than literal day/night cycling.
 */
const ATMOSPHERE_STOPS = [
  // [altitudeM, dayHex, nightHex]
  [0, "#1d1a18", "#161412"],
  [12_000, "#161519", "#121116"],
  [50_000, "#0f0f15", "#0c0c12"],
  [80_000, "#0a0a10", "#08080d"],
  [200_000, "#06060a", "#040407"],
] as const;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff;
  const ag = (pa >> 8) & 0xff;
  const ab = pa & 0xff;
  const br = (pb >> 16) & 0xff;
  const bg = (pb >> 8) & 0xff;
  const bb = pb & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

/** `dayPhase` 0=full day, 1=full night. Smoothly lerps between palettes. */
function atmosphereColor(altitudeM: number, dayPhase: number): string {
  let i = 0;
  for (; i < ATMOSPHERE_STOPS.length - 1; i++) {
    const next = ATMOSPHERE_STOPS[i + 1];
    if (next === undefined) break;
    if (altitudeM <= next[0]) break;
  }
  const lo = ATMOSPHERE_STOPS[i];
  const hi = ATMOSPHERE_STOPS[Math.min(i + 1, ATMOSPHERE_STOPS.length - 1)];
  if (lo === undefined || hi === undefined) return "#050810";
  const span = hi[0] - lo[0];
  const t = span <= 0 ? 0 : Math.max(0, Math.min(1, (altitudeM - lo[0]) / span));
  const dayCol = mixHex(lo[1], hi[1], t);
  const nightCol = mixHex(lo[2], hi[2], t);
  return mixHex(dayCol, nightCol, dayPhase);
}

/**
 * Pre-seeded star field. We use a deterministic PRNG so stars don't
 * jitter between frames. Stars live at stable world-altitudes and
 * clip below the atmosphere mask — sparse and small so they read as
 * a hint of deep space rather than a wallpaper.
 */
const STARS: Array<{ altFrac: number; xFrac: number; size: number; alpha: number }> = (() => {
  const arr: typeof STARS = [];
  // Linear congruential — cheap and deterministic.
  let seed = 0x4f7c3a91;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 60; i++) {
    // Bias stars to the upper half of the visualization (high altitude).
    const altFrac = 0.45 + Math.pow(rand(), 0.7) * 0.55;
    arr.push({
      altFrac,
      xFrac: rand(),
      size: 0.3 + rand() * 0.9,
      alpha: 0.18 + rand() * 0.32,
    });
  }
  return arr;
})();

function inverseAxis(axis: AltitudeAxis, screenFrac: number): number {
  // toScreenAlt maps altitudeM → y by:
  //   y = bottom - frac * (bottom - top), frac = log10(1 + alt/1000) / log10(1 + axisMax/1000)
  // => alt = 1000 * (10^(frac * log10(1 + axisMax/1000)) - 1)
  const hi = Math.log10(1 + axis.axisMaxM / 1000);
  return 1000 * (10 ** (screenFrac * hi) - 1);
}

function drawTetherBackdrop(
  ctx: CanvasRenderingContext2D,
  axis: AltitudeAxis,
  shaftLeft: number,
  shaftRight: number,
  dayPhase: number,
): void {
  const grad = ctx.createLinearGradient(0, axis.shaftBottom, 0, axis.shaftTop);
  const breaks = [0, 0.05, 0.15, 0.35, 0.6, 1];
  for (const t of breaks) {
    const altMRaw = inverseAxis(axis, t);
    grad.addColorStop(t, atmosphereColor(altMRaw, dayPhase));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(shaftLeft, axis.shaftTop, shaftRight - shaftLeft, axis.shaftBottom - axis.shaftTop);

  ctx.save();
  ctx.beginPath();
  ctx.rect(shaftLeft, axis.shaftTop, shaftRight - shaftLeft, axis.shaftBottom - axis.shaftTop);
  ctx.clip();
  for (const star of STARS) {
    const altM = axis.axisMaxM * star.altFrac;
    if (altM < 80_000) continue;
    const y = axis.toScreenAlt(altM);
    const x = shaftLeft + star.xFrac * (shaftRight - shaftLeft);
    // dayPhase nudges saturation slightly; keep stars subtle either way.
    const a = star.alpha * (0.7 + 0.3 * dayPhase);
    ctx.fillStyle = `rgba(232, 232, 240, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Faint decade tick lines so the log-scale axis is legible.
  const ticks = tetherDecadeTicks(axis.axisMaxM);
  ctx.font = `500 10px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (const t of ticks) {
    const y = axis.toScreenAlt(t.altitudeM);
    if (y < axis.shaftTop || y > axis.shaftBottom) continue;
    ctx.strokeStyle = "rgba(200, 220, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(shaftLeft, y);
    ctx.lineTo(shaftRight, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(190, 210, 240, 0.30)";
    ctx.fillText(t.label, shaftLeft + 4, y - 6);
  }
}

/**
 * Subtle horizon band at the canvas bottom. Replaces the literal
 * Earth-curve disc with a thin warm-tinted strip that just hints at
 * "ground level" — the playground aesthetic favours flat, restrained
 * surfaces over skeuomorphic flourishes.
 */
function drawHorizon(
  ctx: CanvasRenderingContext2D,
  shaftLeft: number,
  shaftRight: number,
  shaftBottom: number,
): void {
  const bandH = 28;
  const top = shaftBottom - bandH;
  const grad = ctx.createLinearGradient(0, top, 0, shaftBottom);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.6, "rgba(245, 158, 11, 0.06)"); // accent at low alpha
  grad.addColorStop(1, "rgba(245, 158, 11, 0.10)");
  ctx.fillStyle = grad;
  ctx.fillRect(shaftLeft, top, shaftRight - shaftLeft, bandH);
  // Hairline at the surface.
  ctx.strokeStyle = withAlpha("#f59e0b", 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(shaftLeft, shaftBottom + 0.5);
  ctx.lineTo(shaftRight, shaftBottom + 0.5);
  ctx.stroke();
}

/**
 * The tether cable — a thin neutral line spanning the full altitude
 * range. Kept understated so the climbers and HUD chips remain the
 * focal points; the cable is structural geometry, not decoration.
 */
function drawTetherCable(ctx: CanvasRenderingContext2D, cx: number, axis: AltitudeAxis): void {
  ctx.strokeStyle = "rgba(160, 165, 180, 0.08)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, axis.shaftTop);
  ctx.lineTo(cx, axis.shaftBottom);
  ctx.stroke();
  ctx.strokeStyle = "rgba(180, 188, 205, 0.40)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, axis.shaftTop);
  ctx.lineTo(cx, axis.shaftBottom);
  ctx.stroke();
}

/**
 * Counterweight cap at the top of the visualization. The tether
 * never carries riders here — it's structural mass beyond GEO. Drawn
 * as a small dark hexagonal mass with a "Counterweight" label so
 * users learn what it represents without an outsized icon.
 */
function drawCounterweight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  s: Scale,
): void {
  const r = Math.max(5, s.figureHeadR * 2.4);
  ctx.save();
  // Faded continuation hint above.
  ctx.strokeStyle = "rgba(180, 188, 205, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, topY - 18);
  ctx.lineTo(cx, topY - r);
  ctx.stroke();
  ctx.setLineDash([]);
  // Counterweight body — flat hex, matches the playground's restrained iconography.
  ctx.fillStyle = "#2a2a35"; // border-subtle
  ctx.strokeStyle = "rgba(180, 188, 205, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 3;
    const x = cx + Math.cos(ang) * r;
    const y = topY + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Tiny label.
  ctx.font = `500 ${(s.fontSmall - 1).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = "rgba(160, 165, 180, 0.65)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Counterweight", cx + r + 6, topY);
  ctx.restore();
}

/**
 * Per-stop platform marker drawn through the cable. Reads as "the
 * tether passes through this docking ring" rather than the
 * building's full-width floor slab.
 */
function drawTetherStops(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  axis: AltitudeAxis,
  cx: number,
  s: Scale,
  labelLeft: number,
  labelW: number,
): void {
  ctx.font = `${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  for (const stop of snap.stops) {
    const y = axis.toScreenAlt(stop.y);
    if (y < axis.shaftTop || y > axis.shaftBottom) continue;
    const ringW = 36;
    ctx.strokeStyle = "rgba(220, 230, 245, 0.8)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - ringW / 2, y);
    ctx.lineTo(cx - 5, y);
    ctx.moveTo(cx + 5, y);
    ctx.lineTo(cx + ringW / 2, y);
    ctx.stroke();
    // Mounting struts give a hint of depth.
    ctx.strokeStyle = "rgba(160, 180, 210, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - ringW / 2, y);
    ctx.lineTo(cx - 5, y - 5);
    ctx.moveTo(cx + ringW / 2, y);
    ctx.lineTo(cx + 5, y - 5);
    ctx.stroke();
    // Stop name + altitude on the left gutter.
    ctx.fillStyle = "rgba(220, 230, 245, 0.95)";
    ctx.textAlign = "right";
    ctx.fillText(stop.name, labelLeft + labelW - 4, y - 1);
    ctx.fillStyle = "rgba(160, 178, 210, 0.7)";
    ctx.font = `${(s.fontSmall - 0.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText(formatAltitudeShortLocal(stop.y), labelLeft + labelW - 4, y + 10);
    ctx.font = `${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
  }
}

// Re-imported to keep this module decoupled from `draw-tether-hud.ts`'s
// HUD-specific exports. Same formatter, used at the platform labels.
function formatAltitudeShortLocal(altitudeM: number): string {
  if (altitudeM < 1000) return `${Math.round(altitudeM)} m`;
  const km = altitudeM / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 1000) return `${km.toFixed(0)} km`;
  return `${km.toLocaleString("en-US", { maximumFractionDigits: 0 })} km`;
}

/**
 * Build the altitude axis used throughout tether rendering. The
 * axis spans 0 → counterweight altitude with a log mapping so every
 * decade gets visible space.
 */
function buildTetherAxis(shaftTop: number, shaftBottom: number, tether: TetherMeta): AltitudeAxis {
  const axisMaxM = Math.max(tether.counterweightAltitudeM, 1);
  const hi = Math.log10(1 + axisMaxM / 1000);
  return {
    axisMaxM,
    shaftTop,
    shaftBottom,
    toScreenAlt: (altitudeM: number): number => {
      const v = Math.log10(1 + Math.max(0, altitudeM) / 1000);
      const frac = hi <= 0 ? 0 : Math.max(0, Math.min(1, v / hi));
      return shaftBottom - frac * (shaftBottom - shaftTop);
    },
  };
}

function drawTetherTargetMarkers(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  axis: AltitudeAxis,
  cx: number,
  carCenters: Map<number, number>,
  stopIdxById: Map<number, number>,
  s: Scale,
): void {
  const dotR = Math.max(2, s.figureHeadR * 0.9);
  for (const car of snap.cars) {
    if (car.target === undefined) continue;
    const idx = stopIdxById.get(car.target);
    if (idx === undefined) continue;
    const stop = snap.stops[idx];
    if (stop === undefined) continue;
    const cabinY = carCenters.get(car.id);
    if (cabinY === undefined) continue;
    const targetY = axis.toScreenAlt(stop.y);
    if (Math.abs(cabinY - targetY) < 0.5) continue;
    ctx.strokeStyle = "rgba(250, 250, 250, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cabinY);
    ctx.lineTo(cx, targetY);
    ctx.stroke();
    ctx.fillStyle = TARGET_FILL;
    ctx.beginPath();
    ctx.arc(cx, targetY, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function applyDayPhase(elapsedSec: number): number {
  // 240 s wall-clock cycle — slow enough to feel ambient, fast enough
  // to actually witness the change during a long climb.
  const period = 240;
  const phase = (elapsedSec % period) / period;
  // Cosine-shaped: 0 = day, 1 = night.
  return (1 - Math.cos(phase * Math.PI * 2)) * 0.5;
}

/**
 * Mutable per-frame state the renderer threads through tether mode:
 * carries velocity history (for kinematic-phase classification),
 * cached climber names, the active physics knobs, and the day/night
 * cycle baseline.
 */
export interface TetherRenderState {
  prevVelocity: Map<number, number>;
  carNames: Map<number, string>;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  /** Performance-now timestamp of the first tether draw (0 if uninitialized). */
  firstDrawAt: number;
}

/**
 * Render a tether scenario to `ctx`. Encapsulates the entire tether
 * pipeline: backdrop, Earth curve, cable, counterweight, platforms,
 * cabins, HUD chips, and the side info card. Mutates `state` to
 * record per-car velocity history for next frame.
 */
export function drawTetherScene(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  w: number,
  h: number,
  s: Scale,
  tether: TetherMeta,
  state: TetherRenderState,
): void {
  if (state.firstDrawAt === 0) state.firstDrawAt = performance.now();
  const elapsedSec = (performance.now() - state.firstDrawAt) / 1000;
  const dayPhase = tether.showDayNight ? applyDayPhase(elapsedSec) : 0.5;

  // Layout: stops gutter on the left, cable + atmosphere in the
  // middle, optional side card on the right. The card is suppressed
  // on narrow or short viewports — mobile portrait wants the cable
  // to claim the full width, and mobile landscape doesn't have the
  // vertical room to host the rows without overlapping the cable.
  const wantsCard = w >= 520 && h >= 360;
  const labelW = Math.min(120, Math.max(72, w * 0.16));
  const cardW = wantsCard ? Math.min(220, Math.max(160, w * 0.24)) : 0;
  const cardGap = wantsCard ? 14 : 0;
  const labelLeft = s.padX;
  const shaftAreaLeft = labelLeft + labelW + 4;
  const shaftAreaRight = w - s.padX - cardW - cardGap;
  const cx = (shaftAreaLeft + shaftAreaRight) / 2;
  const shaftPad = 12;
  const shaftTop = s.padTop + 24;
  const shaftBottom = h - s.padBottom - 18;

  const axis = buildTetherAxis(shaftTop, shaftBottom, tether);

  drawTetherBackdrop(ctx, axis, shaftAreaLeft + shaftPad, shaftAreaRight - shaftPad, dayPhase);
  drawHorizon(ctx, shaftAreaLeft + shaftPad, shaftAreaRight - shaftPad, shaftBottom);
  drawTetherCable(ctx, cx, axis);
  drawCounterweight(ctx, cx, axis.shaftTop, s);
  drawTetherStops(ctx, snap, axis, cx, s, labelLeft, labelW);

  // Fixed-size cabins (the log axis means stops aren't evenly spaced,
  // so we don't size against story height like the building path).
  const carW = Math.max(20, Math.min(34, shaftAreaRight - shaftAreaLeft - 8));
  const carH = Math.max(16, Math.min(26, carW * 0.72));
  s.carH = carH;
  s.carW = carW;

  const carCenters = new Map<number, number>();
  const stopIdxById = new Map<number, number>();
  snap.stops.forEach((st, i) => stopIdxById.set(st.entity_id, i));
  for (const car of snap.cars) {
    carCenters.set(car.id, axis.toScreenAlt(car.y));
  }
  drawTetherTargetMarkers(ctx, snap, axis, cx, carCenters, stopIdxById, s);

  for (const car of snap.cars) {
    const cy = carCenters.get(car.id);
    if (cy === undefined) continue;
    drawClimberCabin(ctx, car, cx, cy, carW, carH);
  }

  const hudList = buildHudList(
    snap,
    axis,
    cx,
    state.carNames,
    state.prevVelocity,
    state.maxSpeed,
    state.acceleration,
    state.deceleration,
  );
  const sortedHud = [...hudList].sort((a, b) => b.altitudeM - a.altitudeM);
  drawClimberHuds(ctx, sortedHud, carW, w - cardW - cardGap, s);

  if (wantsCard) {
    drawTetherSideCard(ctx, sortedHud, w - s.padX - cardW, cardW, shaftTop, s);
  }

  // Refresh per-car velocity history for next frame's phase classifier.
  for (const car of snap.cars) {
    state.prevVelocity.set(car.id, car.v);
  }
  if (state.prevVelocity.size > snap.cars.length) {
    const live = new Set(snap.cars.map((c) => c.id));
    for (const id of state.prevVelocity.keys()) {
      if (!live.has(id)) state.prevVelocity.delete(id);
    }
  }
}
