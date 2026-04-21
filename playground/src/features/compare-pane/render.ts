import { METRIC_KEYS, METRIC_HISTORY_LEN } from "../../types";
import type { Snapshot } from "../../types";
import type { Pane } from "./pane";

export function renderPane(pane: Pane, snap: Snapshot, speed: number): void {
  const metrics = pane.sim.metrics();
  pane.latestMetrics = metrics;
  for (const key of METRIC_KEYS) {
    const arr = pane.metricHistory[key];
    arr.push(metrics[key]);
    if (arr.length > METRIC_HISTORY_LEN) arr.shift();
  }
  // Evict stale bubbles lazily before handing the map to the renderer.
  const now = performance.now();
  for (const [carId, bubble] of pane.bubbles) {
    if (bubble.expiresAt <= now) pane.bubbles.delete(carId);
  }
  pane.renderer.draw(snap, speed, pane.bubbles);
}
