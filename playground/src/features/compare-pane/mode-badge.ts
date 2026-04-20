import type { Pane } from "./pane";

/**
 * Reflect the pane's current `TrafficMode` onto its header badge. The
 * `data-mode` attribute drives per-mode colour in CSS; textContent is
 * only rewritten when it actually changed so the DOM stays quiet for
 * steady-state frames (keeps devtools' "attribute changed" traces
 * readable during debugging).
 */
export function updateModeBadge(pane: Pane): void {
  const mode = pane.sim.trafficMode();
  if (pane.modeEl.dataset["mode"] !== mode) {
    pane.modeEl.dataset["mode"] = mode;
    pane.modeEl.textContent = mode;
  }
}
