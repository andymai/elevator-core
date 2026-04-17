import type { StrategyName } from "./types";

// URL state encoding. Keeps the sim reproducible: sharing the URL replays
// exactly what the sender saw. Only knobs that affect behavior go here.

export interface PermalinkState {
  scenario: string;
  strategy: StrategyName;
  seed: number;
  trafficRate: number;
  speed: number;
}

export const DEFAULT_STATE: PermalinkState = {
  scenario: "office-5",
  strategy: "look",
  seed: 42,
  trafficRate: 8,
  speed: 4,
};

export function encodePermalink(state: PermalinkState): string {
  const p = new URLSearchParams();
  p.set("s", state.scenario);
  p.set("d", state.strategy);
  p.set("k", String(state.seed));
  p.set("t", String(state.trafficRate));
  p.set("x", String(state.speed));
  return `?${p.toString()}`;
}

export function decodePermalink(search: string): PermalinkState {
  const p = new URLSearchParams(search);
  const strategy = (p.get("d") ?? DEFAULT_STATE.strategy) as StrategyName;
  return {
    scenario: p.get("s") ?? DEFAULT_STATE.scenario,
    strategy: ["scan", "look", "nearest", "etd", "destination"].includes(strategy)
      ? strategy
      : DEFAULT_STATE.strategy,
    seed: parseNum(p.get("k"), DEFAULT_STATE.seed),
    trafficRate: parseNum(p.get("t"), DEFAULT_STATE.trafficRate),
    speed: parseNum(p.get("x"), DEFAULT_STATE.speed),
  };
}

function parseNum(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
