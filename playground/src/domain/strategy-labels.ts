import type { RepositionStrategyName, StrategyName } from "../types";

export const UI_STRATEGIES: StrategyName[] = [
  "scan",
  "look",
  "nearest",
  "etd",
  "destination",
  "rsr",
];
export const STRATEGY_LABELS: Record<StrategyName, string> = {
  scan: "SCAN",
  look: "LOOK",
  nearest: "NEAREST",
  etd: "ETD",
  destination: "DCS",
  rsr: "RSR",
};

/**
 * One-liners shown under the strategy selector. Tuned to be readable
 * at a glance without jargon while still being specific enough to
 * differentiate the six strategies. The phrasing leads with behavior,
 * not mechanism — a reader new to vertical-transport theory should
 * still come away with a sense of what each controller does.
 */
export const STRATEGY_DESCRIPTIONS: Record<StrategyName, string> = {
  scan: "Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",
  look: "Like SCAN but reverses early when nothing's queued further — a practical baseline.",
  nearest: "Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",
  etd: "Estimated time of dispatch — assigns calls to whichever car can finish fastest.",
  destination:
    "Destination-control: riders pick their floor at the lobby; the group optimises assignments.",
  rsr: "Relative System Response — a wait-aware variant of ETD that penalises long queues.",
};

export const UI_REPOSITION_STRATEGIES: RepositionStrategyName[] = [
  "adaptive",
  "predictive",
  "lobby",
  "spread",
  "none",
];
export const REPOSITION_LABELS: Record<RepositionStrategyName, string> = {
  adaptive: "Adaptive",
  predictive: "Predictive",
  lobby: "Lobby",
  spread: "Spread",
  none: "Stay",
};
/**
 * One-liners surfaced in the reposition-strategy popover. Each names
 * *what* an idle car does, not the mechanism — users pick by
 * observable behaviour rather than implementation detail.
 */
export const REPOSITION_DESCRIPTIONS: Record<RepositionStrategyName, string> = {
  adaptive:
    "Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",
  predictive: "Always parks idle cars near whichever floor has seen the most recent arrivals.",
  lobby: "Sends every idle car back to the ground floor to prime the morning-rush pickup.",
  spread: "Keeps idle cars fanned out across the shaft so any floor has a nearby option.",
  none: "Leaves idle cars wherever they finished their last delivery.",
};
