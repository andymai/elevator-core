import { type RiderVariant, drawRider, pickRiderVariant } from "./figures/rider";
import type { Scale } from "./layout";
import { easeOutNorm } from "./color-utils";

/**
 * One-shot rider animation. Riders walk horizontally along `floorY`
 * with a small sinusoidal head bob; per-kind alpha schedules sell the
 * threshold-crossing (board fades into the cabin, alight fades out of
 * it, abandon walks away dejectedly).
 */
export interface Tween {
  kind: "board" | "alight" | "abandon";
  bornAt: number;
  duration: number;
  startX: number;
  endX: number;
  floorY: number;
  color: string;
  variant: RiderVariant;
}

/** Per-car frame-to-frame memory used to detect board/alight transitions. */
export interface CarState {
  riders: number;
  roster: RiderVariant[];
}

/** Per-stop frame-to-frame memory used to detect abandonment. */
export interface StopState {
  waiting: number;
}

const BOB_AMPLITUDE = 0.8;
const BOB_CYCLES = 2;

export function drawTweens(
  ctx: CanvasRenderingContext2D,
  tweens: readonly Tween[],
  s: Scale,
): void {
  const now = performance.now();
  for (const t of tweens) {
    const age = now - t.bornAt;
    if (age < 0) continue;
    const tx = Math.min(1, Math.max(0, age / t.duration));
    const eased = easeOutNorm(tx);
    const x = t.startX + (t.endX - t.startX) * eased;
    const bob = Math.sin(eased * Math.PI * BOB_CYCLES * 2) * BOB_AMPLITUDE;
    const drawY = t.floorY + bob;
    const alpha = alphaFor(t.kind, tx, eased);
    if (alpha <= 0) continue;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;
    drawRider(ctx, x, drawY, s.figureHeadR, t.color, t.variant);
    ctx.globalAlpha = prevAlpha;
  }
}

function alphaFor(kind: Tween["kind"], tx: number, eased: number): number {
  if (kind === "board") {
    // Full alpha through the walk; fade the last 25% as they cross the door.
    return tx < 0.75 ? 1 : Math.max(0, 1 - (tx - 0.75) / 0.25);
  }
  if (kind === "alight") {
    // Fade in over the first 20% (emerging from the cabin), full while
    // crossing the gutter, fade out over the last 40%.
    if (tx < 0.2) return tx / 0.2;
    if (tx > 0.6) return Math.max(0, 1 - (tx - 0.6) / 0.4);
    return 1;
  }
  // abandon: lower base alpha that decays with a slight curve.
  return 0.7 * (1 - eased) ** 1.2;
}

interface BoardWalkSpec {
  count: number;
  enablePairs: boolean;
  halfPairW: number;
  now: number;
  stagger: number;
  duration: number;
  originX: number;
  endX: number;
  floorY: number;
  color: string;
  stopId: number;
  dirOffset: number;
}

interface AlightWalkSpec {
  count: number;
  enablePairs: boolean;
  halfPairW: number;
  now: number;
  stagger: number;
  duration: number;
  startX: number;
  endX: number;
  floorY: number;
  color: string;
  variants: readonly RiderVariant[];
  carId: number;
}

/**
 * Emit board walks: pairs (when the door is wide enough) walk side-by-side
 * from the gutter slot nearest the shaft to the cabin door. Each rider's
 * variant is hashed from the gutter's slot seed so the silhouette that
 * boards visually matches who was waiting.
 */
export function emitBoardWalks(out: Tween[], spec: BoardWalkSpec): void {
  const { count, enablePairs, halfPairW, now, stagger, duration, originX, endX, floorY, color } =
    spec;
  let k = 0;
  let waveIdx = 0;
  while (k < count) {
    const pairCount = enablePairs && k + 1 < count ? 2 : 1;
    for (let m = 0; m < pairCount; m++) {
      const off = pairCount === 2 ? (m === 0 ? -halfPairW : halfPairW) : 0;
      out.push({
        kind: "board",
        bornAt: now + waveIdx * stagger,
        duration,
        startX: originX + off,
        endX: endX + off,
        floorY,
        color,
        variant: pickRiderVariant(spec.stopId, k + m + spec.dirOffset),
      });
    }
    k += pairCount;
    waveIdx++;
  }
}

interface AbandonWalkSpec {
  count: number;
  now: number;
  stagger: number;
  duration: number;
  startX: number;
  endX: number;
  floorY: number;
  color: string;
  stopId: number;
}

/**
 * Emit single-file abandon walks: dejected silhouettes drift away from
 * the queue area at the stop. Lower base alpha (in `alphaFor`) plus a
 * stretched duration sells the "gave up waiting" read.
 */
export function emitAbandonWalks(out: Tween[], spec: AbandonWalkSpec): void {
  const { count, now, stagger, duration, startX, endX, floorY, color, stopId } = spec;
  for (let k = 0; k < count; k++) {
    out.push({
      kind: "abandon",
      bornAt: now + k * stagger,
      duration,
      startX,
      endX,
      floorY,
      color,
      variant: pickRiderVariant(stopId, 20_000 + k),
    });
  }
}

/**
 * Emit alight walks: pairs (or singles) emerge from the cabin door and
 * walk out into the gutter, fading out. Variants are taken from the
 * cabin's roster in LIFO order so the silhouettes match who was aboard.
 */
export function emitAlightWalks(out: Tween[], spec: AlightWalkSpec): void {
  const { count, enablePairs, halfPairW, now, stagger, duration, startX, endX, floorY, color } =
    spec;
  let k = 0;
  let waveIdx = 0;
  while (k < count) {
    const pairCount = enablePairs && k + 1 < count ? 2 : 1;
    for (let m = 0; m < pairCount; m++) {
      const slotIdx = k + m;
      // m=0 trails (matches board convention: -halfPairW behind in walking direction).
      const off = pairCount === 2 ? (m === 0 ? -halfPairW : halfPairW) : 0;
      out.push({
        kind: "alight",
        bornAt: now + waveIdx * stagger,
        duration,
        startX: startX + off,
        endX: endX + off,
        floorY,
        color,
        variant:
          spec.variants[spec.variants.length - 1 - slotIdx] ??
          pickRiderVariant(spec.carId, slotIdx),
      });
    }
    k += pairCount;
    waveIdx++;
  }
}
