import type { Scale } from "../layout";
import { OVERFLOW_COLOR } from "../palette";
import type { RiderVariant } from "./rider";
import { drawRider, pickRiderVariant } from "./rider";

/**
 * Render riders inside a cabin as a row of silhouettes standing on the
 * cabin floor. When a `roster` is provided the variants match the
 * silhouettes that boarded from the gutter; when absent it falls back
 * to car-id hashing.
 */
export function drawRidersInCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  carBottom: number,
  carW: number,
  carH: number,
  count: number,
  riderColor: string,
  s: Scale,
  roster?: RiderVariant[],
): void {
  const fitByW = carW * 0.22;
  const fitByH = (carH - 4) / 10.5;
  const headR = Math.max(1.2, Math.min(s.figureHeadR, fitByW, fitByH));
  const stride = s.figureStride * (headR / s.figureHeadR);
  const padX = 3;
  const padY = 2;
  const innerW = carW - padX * 2;
  const labelRoom = 14;
  const maxVisible = Math.max(1, Math.floor((innerW - labelRoom) / stride));
  const visible = Math.min(count, maxVisible);

  const totalRowW = visible * stride;
  const startX = cx - totalRowW / 2 + stride / 2;
  const floorY = carBottom - padY;

  for (let i = 0; i < visible; i++) {
    const variant = roster?.[i] ?? pickRiderVariant(0, i);
    drawRider(ctx, startX + i * stride, floorY, headR, riderColor, variant);
  }

  if (count > visible) {
    ctx.fillStyle = OVERFLOW_COLOR;
    ctx.font = `${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const labelX = cx + totalRowW / 2 + 2;
    const labelY = floorY - headR * 4;
    ctx.fillText(`+${count - visible}`, labelX, labelY);
  }
}
