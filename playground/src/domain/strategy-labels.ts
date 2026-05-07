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
 * One-liners shown under the strategy selector. Each names *what* the
 * controller does in one short sentence — no marketing, no jargon
 * gloss. A reader who recognises the acronym already knows the lore;
 * one who doesn't gets a single accurate sentence to act on.
 */
export const STRATEGY_DESCRIPTIONS: Record<StrategyName, string> = {
  scan: "Sweep end-to-end, reverse at each end.",
  look: "Sweep until last call, then reverse.",
  nearest: "Assign each call to the closest car.",
  etd: "Assign by estimated time-to-destination.",
  destination: "Riders enter destination at the lobby; the group optimises.",
  rsr: "ETD penalised by queue length.",
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
 * One-liners shown under the reposition-strategy selector. Names the
 * observable behaviour of an idle car in one short sentence, no
 * mechanism gloss. Phrasing matches STRATEGY_DESCRIPTIONS above so
 * the two popovers feel like the same UI.
 */
export const REPOSITION_DESCRIPTIONS: Record<RepositionStrategyName, string> = {
  adaptive: "Switch by traffic mode; the default.",
  predictive: "Park near the most-active floor.",
  lobby: "Return idle cars to the lobby.",
  spread: "Fan idle cars across the shaft.",
  none: "Idle cars stay where they finished.",
};
