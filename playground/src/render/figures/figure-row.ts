import type { Scale } from "../layout";
import { OVERFLOW_COLOR } from "../palette";
import { drawRider, pickRiderVariant } from "./rider";

/**
 * Draw a row of riders standing on a floor. Figures are placed starting
 * at `anchorX` and stepping horizontally by `dir * s.figureStride` --
 * so passing `dir = -1` fills leftward (for up-bound riders in the left
 * gutter, nearest figure closest to the shaft) and `dir = +1` fills
 * rightward. Overflow is rendered as a "+N" label at the far end.
 */
export function drawFigureRow(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  floorY: number,
  dir: -1 | 1,
  maxW: number,
  count: number,
  color: string,
  s: Scale,
  variantSeed: number,
): void {
  const labelRoom = 14;
  const capN = Math.max(1, Math.floor((maxW - labelRoom) / s.figureStride));
  const visible = Math.min(count, capN);
  const firstOffset = dir === -1 ? -2 : 2;
  for (let i = 0; i < visible; i++) {
    const x = anchorX + firstOffset + dir * i * s.figureStride;
    const slotSeed = i + (dir === -1 ? 0 : 10_000);
    const variant = pickRiderVariant(variantSeed, slotSeed);
    drawRider(ctx, x, floorY, s.figureHeadR, color, variant);
  }
  if (count > visible) {
    ctx.fillStyle = OVERFLOW_COLOR;
    ctx.font = `${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = dir === -1 ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    const labelX = anchorX + firstOffset + dir * visible * s.figureStride;
    ctx.fillText(`+${count - visible}`, labelX, floorY - 1);
  }
}
