import type { BubbleEvent } from "../../types";
import type { Pane } from "./pane";

/**
 * How long a pane's decision-narration line stays at full opacity
 * after a fresh `elevator-assigned` event. After this window the line
 * dims but stays readable — users can still see the most recent
 * decision after a lull, just with lower visual priority.
 */
const DECISION_TTL_MS = 1800;

export function pushDecision(pane: Pane, ev: BubbleEvent, stopName: (id: number) => string): void {
  if (ev.kind !== "elevator-assigned") return;
  const el = pane.decisionEl;
  const text = `Car ${ev.elevator} \u2192 ${stopName(ev.stop)}`;
  if (el.textContent !== text) el.textContent = text;
  el.dataset["active"] = "true";
  pane.decisionExpiresAt = performance.now() + DECISION_TTL_MS;
  // Retrigger the pulse keyframes by flipping data-pulse in the next
  // frame — clearing synchronously has no effect because the same
  // animation name stays active.
  el.dataset["pulse"] = "false";
  requestAnimationFrame(() => {
    el.dataset["pulse"] = "true";
  });
}
