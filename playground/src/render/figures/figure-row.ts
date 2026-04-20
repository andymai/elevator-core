import type { Scale } from "../layout";
import { OVERFLOW_COLOR } from "../palette";
import { drawStickFigure, pickRiderVariant } from "./stick-figure";

/**
 * Draw a row of tiny stick figures standing on a floor. Figures are
 * placed starting at `anchorX` and stepping horizontally by
 * `dir * s.figureStride` -- so passing `dir = -1` fills leftward (for
 * up-bound riders in the left gutter, nearest figure closest to the
 * shaft) and `dir = +1` fills rightward. Overflow is rendered as a
 * "+N" label at the far end so the viewer always sees the exact count.
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
  // Reserve room at the far end for the "+N" label so it never overlaps
  // a figure — ~14 px fits 3-digit overflow at the small font.
  const labelRoom = 14;
  const capN = Math.max(1, Math.floor((maxW - labelRoom) / s.figureStride));
  const visible = Math.min(count, capN);
  // First figure's near edge sits ~2 px from the shaft rail so the
  // bodies don't merge with the rail line.
  const firstOffset = dir === -1 ? -2 : 2;
  for (let i = 0; i < visible; i++) {
    const x = anchorX + firstOffset + dir * i * s.figureStride;
    // Encode direction into the variant seed's high bits so the
    // up-gutter and down-gutter figure at slot i pick different
    // variants — otherwise both sides would mirror each other's
    // pattern and feel artificially uniform across the floor.
    const slotSeed = i + (dir === -1 ? 0 : 10_000);
    const variant = pickRiderVariant(variantSeed, slotSeed);
    drawStickFigure(ctx, x, floorY, s.figureHeadR, color, variant);
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
