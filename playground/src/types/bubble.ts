/**
 * Per-car speech-bubble state, keyed by car entity id. Timestamps use
 * `performance.now()` wall-clock ms — not sim ticks — so the bubble
 * fades predictably even when the sim races ahead.
 *
 * `glyph` is rendered separately from `text` so the renderer can paint
 * it in the pane accent while the body stays neutral off-white.
 */
export interface CarBubble {
  glyph: string;
  text: string;
  bornAt: number;
  expiresAt: number;
}
