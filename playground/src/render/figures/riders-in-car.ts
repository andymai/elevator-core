import type { Scale } from "../layout";
import { roundedRect } from "../primitives";
import type { RiderVariant } from "./rider";
import { drawRider, pickRiderVariant } from "./rider";

/**
 * Render riders inside a cabin as a row of silhouettes standing on the
 * cabin floor. When a `roster` is provided the variants match the
 * silhouettes that boarded from the gutter; when absent it falls back
 * to car-id hashing. Optionally overlays:
 *   - a `+N` pill in the cabin's top-right when more riders are aboard
 *     than can be drawn as silhouettes
 *   - a centred `F` glyph when the cabin is at capacity (drawn last so
 *     it sits on top of riders + overflow pill)
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
  isFull = false,
): void {
  const fitByW = carW * 0.22;
  const fitByH = (carH - 4) / 10.5;
  const headR = Math.max(1.2, Math.min(s.figureHeadR, fitByW, fitByH));
  const stride = s.figureStride * (headR / s.figureHeadR);
  const padX = 3;
  const padY = 2;
  const innerW = carW - padX * 2;
  // Reserve a small slot at the top-right inside the cabin for the
  // overflow pill so silhouettes never overlap it. Sized for "+99" worst
  // case at the current font.
  const pillSlot = 16;
  const maxVisible = Math.max(1, Math.floor((innerW - pillSlot) / stride));
  const visible = Math.min(count, maxVisible);

  const totalRowW = visible * stride;
  const startX = cx - totalRowW / 2 + stride / 2;
  const floorY = carBottom - padY;

  for (let i = 0; i < visible; i++) {
    const variant = roster?.[i] ?? pickRiderVariant(0, i);
    drawRider(ctx, startX + i * stride, floorY, headR, riderColor, variant);
  }

  // `+N` overflow pill: a small high-contrast chip pinned inside the
  // cabin's top-right corner. Inside-the-cabin placement guarantees the
  // chip never clips past the chassis or on a neighbouring shaft;
  // earlier the label floated outside on `cx + totalRowW/2 + 2` and
  // disappeared whenever the rider row ran wide.
  if (count > visible) {
    const text = `+${count - visible}`;
    const fontSize = Math.max(8, s.fontSmall - 1);
    ctx.font = `700 ${fontSize.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const textW = ctx.measureText(text).width;
    const pillPadX = 3;
    const pillPadY = 1.5;
    const pillW = Math.ceil(textW + pillPadX * 2);
    const pillH = Math.ceil(fontSize + pillPadY * 2);
    const pillRight = cx + carW / 2 - 2;
    const pillTop = carBottom - carH + 2;
    const pillX = pillRight - pillW;
    ctx.fillStyle = "rgba(15, 15, 18, 0.85)"; // bg-primary at high alpha
    roundedRect(ctx, pillX, pillTop, pillW, pillH, 2);
    ctx.fill();
    ctx.fillStyle = "#fafafa"; // text-primary
    ctx.fillText(text, pillRight - pillPadX, pillTop + pillH / 2);
  }

  // `F` full-capacity overlay: large semi-transparent glyph centred in
  // the cabin. Drawn after silhouettes + pill so it reads as the
  // dominant signal — a glance at a red F over a packed cabin says
  // "this car will skip waiting riders".
  if (isFull) {
    const fSize = Math.max(10, Math.min(carH * 0.7, carW * 0.55));
    ctx.font = `800 ${fSize.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cy = carBottom - carH / 2;
    // Soft halo so the glyph reads even against bright cabin gradients.
    ctx.fillStyle = "rgba(15, 15, 18, 0.6)";
    ctx.fillText("F", cx, cy + 1);
    ctx.fillStyle = "rgba(239, 68, 68, 0.92)"; // var(--bad) at high alpha
    ctx.fillText("F", cx, cy);
  }
}
