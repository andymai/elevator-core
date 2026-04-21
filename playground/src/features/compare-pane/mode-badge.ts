import type { TrafficMode } from "../../types";
import type { Pane } from "./pane";

const MODE_LABELS: Record<TrafficMode, string> = {
  Idle: "Quiet",
  UpPeak: "Morning rush",
  InterFloor: "Mixed",
  DownPeak: "Evening rush",
};

export function updateModeBadge(pane: Pane): void {
  const mode = pane.sim.trafficMode();
  if (pane.modeEl.dataset["mode"] !== mode) {
    pane.modeEl.dataset["mode"] = mode;
    pane.modeEl.textContent = MODE_LABELS[mode];
    pane.modeEl.title = mode;
  }
}
