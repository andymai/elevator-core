import type { RiderVariant } from "./figures/rider";
import type { Scale } from "./layout";
import { arcPoint, easeOutNorm, hexWithAlpha } from "./color-utils";

/** One-shot animation tween — board into a car, alight out, or abandon the queue. */
export interface Tween {
  kind: "board" | "alight" | "abandon";
  bornAt: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
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

/** Render every active tween at its eased position, fading by remaining lifetime. */
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
    const [x, y] =
      t.kind === "board"
        ? arcPoint(t.startX, t.startY, t.endX, t.endY, eased)
        : [t.startX + (t.endX - t.startX) * eased, t.startY + (t.endY - t.startY) * eased];
    const alpha = t.kind === "board" ? 0.9 : t.kind === "abandon" ? (1 - eased) ** 1.5 : 1 - eased;
    const radius = t.kind === "abandon" ? s.carDotR * 0.85 : s.carDotR;
    ctx.fillStyle = hexWithAlpha(t.color, alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
