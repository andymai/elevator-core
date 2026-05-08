import type { EventDto, Snapshot } from "../../types";
import type { Pane } from "./pane";

/**
 * Per-event speech-bubble lifetimes in wall-clock milliseconds. Events
 * that carry more information (destination, dropoff) linger; transient
 * events (door open) dismiss quickly so the per-car bubble cycles
 * through the action it describes without feeling stale at 16x.
 */
const BUBBLE_TTL_BY_KIND: Record<string, number> = {
  "elevator-assigned": 1400,
  "elevator-arrived": 1200,
  "elevator-repositioning": 1600,
  "door-opened": 550,
  "rider-boarded": 850,
  "rider-exited": 1600,
};
const BUBBLE_TTL_DEFAULT_MS = 1000;

/**
 * Translate this frame's raw events into per-car speech-bubble state.
 * Latest event wins — at high speed multipliers a single frame can
 * contain many events per car, and keeping just the last keeps the
 * UI readable without pathologically long message queues.
 *
 * Uses stop name/id lookups from the pane's latest snapshot via
 * [`resolveStopName`]; unresolved stop ids fall back to the numeric
 * id rather than dropping the bubble.
 */
export function updateBubbles(pane: Pane, events: EventDto[], snap: Snapshot): void {
  const bornAt = performance.now();
  const stopName = (id: number): string => resolveStopName(snap, id);
  for (const ev of events) {
    const content = bubbleTextFor(ev, stopName);
    if (content === null) continue;
    // Some events are rider-scoped rather than car-scoped (spawn,
    // abandon). bubbleTextFor returns `null` for those, so we only
    // get here when `ev` carries an `elevator` field.
    const carId = (ev as { elevator?: number }).elevator;
    if (carId === undefined) continue;
    const ttl = BUBBLE_TTL_BY_KIND[ev.kind] ?? BUBBLE_TTL_DEFAULT_MS;
    pane.bubbles.set(carId, {
      glyph: content.glyph,
      text: content.text,
      bornAt,
      expiresAt: bornAt + ttl,
    });
  }
}

/** Map an event to a leading icon glyph plus the body phrase, or
 *  `null` when the event has no car to attach to, or when emitting a
 *  bubble for it would add more noise than signal. `elevator-departed`
 *  and `door-closed` are intentionally suppressed because the prior
 *  bubble ("Arrived at X", "Doors open") already narrates the context
 *  and re-firing on closure makes the car feel chatty without adding
 *  information. The renderer paints the glyph in the pane accent and
 *  the body in a neutral off-white. */
function bubbleTextFor(
  ev: EventDto,
  stopName: (id: number) => string,
): { glyph: string; text: string } | null {
  switch (ev.kind) {
    case "elevator-assigned":
      return { glyph: "›", text: `To ${stopName(ev.stop)}` };
    case "elevator-repositioning":
      return { glyph: "↻", text: `Reposition to ${stopName(ev.stop)}` };
    case "elevator-arrived":
      return { glyph: "●", text: `At ${stopName(ev.stop)}` };
    case "door-opened":
      return { glyph: "◌", text: "Doors open" };
    case "rider-boarded":
      return { glyph: "+", text: "Boarding" };
    case "rider-exited":
      return { glyph: "↓", text: `Off at ${stopName(ev.stop)}` };
    default:
      return null;
  }
}

/** Look up a stop's human-readable name by `entity_id` from a snapshot,
 *  falling back to the numeric id when the stop isn't in this frame's
 *  snapshot (can happen briefly after a config reset). */
export function resolveStopName(snap: Snapshot, stopEntityId: number): string {
  const stop = snap.stops.find((s) => s.entity_id === stopEntityId);
  return stop?.name ?? `stop #${stopEntityId}`;
}
