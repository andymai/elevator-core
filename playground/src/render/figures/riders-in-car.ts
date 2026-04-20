import type { Scale } from "../layout";
import { OVERFLOW_COLOR } from "../palette";
import { drawStickFigure, pickRiderVariant } from "./stick-figure";

/**
 * Render the riders inside a cabin as a row of SimTower-style
 * silhouettes standing on the cabin floor. Head radius scales down
 * from the gutter figure so the row fits inside the cabin's
 * interior; if more riders load than fit horizontally, the tail of
 * the row is replaced with a "+N" overflow label so the exact count
 * is never obscured.
 *
 * Uses the passed `riderColor` so silhouettes read clearly against
 * the cabin's phase-coloured gradient regardless of phase.
 */
export function drawRidersInCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  carBottom: number,
  carW: number,
  carH: number,
  count: number,
  riderColor: string,
  variantSeed: number,
  s: Scale,
): void {
  // Default to the gutter figure size so waiting riders and riding
  // riders read at the same scale — a key SimTower cue. Only shrink
  // when the cabin is narrower than the figure's shoulders (w) or
  // shorter than the figure's body (h), so the silhouette still fits.
  // Height divisor is `10.5` (not 8.2) because that's the approximate
  // total-height factor for the *tallest* variant (`tall` with hat);
  // sizing to the tallest guarantees no rider ever pokes above the
  // cabin ceiling, no matter which variant the hash picks for a slot.
  const fitByW = carW * 0.22;
  const fitByH = (carH - 4) / 10.5;
  const headR = Math.max(1.2, Math.min(s.figureHeadR, fitByW, fitByH));
  // Stride scales with head size — if the cabin forced us to shrink
  // `headR`, shrink the stride in the same ratio so figures still
  // read as a row of people rather than a single pile.
  const stride = s.figureStride * (headR / s.figureHeadR);
  const padX = 3;
  const padY = 2;
  const innerW = carW - padX * 2;
  // Reserve "+N" label room at the right of the row so overflow
  // never overlaps a silhouette.
  const labelRoom = 14;
  const maxVisible = Math.max(1, Math.floor((innerW - labelRoom) / stride));
  const visible = Math.min(count, maxVisible);

  // Centre the row of silhouettes inside the cabin.
  const totalRowW = visible * stride;
  const startX = cx - totalRowW / 2 + stride / 2;
  // Feet rest just above the cabin interior bottom.
  const floorY = carBottom - padY;

  for (let i = 0; i < visible; i++) {
    const variant = pickRiderVariant(variantSeed, i);
    drawStickFigure(ctx, startX + i * stride, floorY, headR, riderColor, variant);
  }

  if (count > visible) {
    ctx.fillStyle = OVERFLOW_COLOR;
    ctx.font = `${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    // Overflow label sits past the last silhouette, vertically
    // centred around the figure's head height so it reads as part of
    // the row rather than floating above or below.
    const labelX = cx + totalRowW / 2 + 2;
    const labelY = floorY - headR * 4;
    ctx.fillText(`+${count - visible}`, labelX, labelY);
  }
}
