/**
 * Per-car speech-bubble state, keyed by car entity id. Timestamps use
 * `performance.now()` wall-clock ms — not sim ticks — so the bubble
 * fades predictably even when the sim races ahead.
 */
export interface CarBubble {
  text: string;
  bornAt: number;
  expiresAt: number;
}
