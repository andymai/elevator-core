import type { StrategyName } from "./types";

// URL state encoding. Keeps the sim reproducible: sharing the URL replays
// exactly what the sender saw. Only knobs that affect behavior go here.

export interface PermalinkState {
  scenario: string;
  strategyA: StrategyName;
  strategyB: StrategyName;
  compare: boolean;
  seed: number;
  trafficRate: number;
  speed: number;
}

export const DEFAULT_STATE: PermalinkState = {
  scenario: "office-5",
  strategyA: "look",
  strategyB: "etd",
  compare: false,
  seed: 42,
  trafficRate: 40,
  speed: 1,
};

const STRATEGIES: readonly StrategyName[] = ["scan", "look", "nearest", "etd"];

function parseStrategy(raw: string | null, fallback: StrategyName): StrategyName {
  return raw !== null && (STRATEGIES as readonly string[]).includes(raw)
    ? (raw as StrategyName)
    : fallback;
}

export function encodePermalink(state: PermalinkState): string {
  const p = new URLSearchParams();
  p.set("s", state.scenario);
  p.set("a", state.strategyA);
  // Always persist `b` so a shared non-compare URL still remembers the B
  // strategy when the recipient toggles compare on. Only the compare flag
  // itself is conditional.
  p.set("b", state.strategyB);
  if (state.compare) p.set("c", "1");
  p.set("k", String(state.seed));
  p.set("t", String(state.trafficRate));
  p.set("x", String(state.speed));
  return `?${p.toString()}`;
}

export function decodePermalink(search: string): PermalinkState {
  const p = new URLSearchParams(search);
  return {
    scenario: p.get("s") ?? DEFAULT_STATE.scenario,
    strategyA: parseStrategy(p.get("a") ?? p.get("d"), DEFAULT_STATE.strategyA),
    strategyB: parseStrategy(p.get("b"), DEFAULT_STATE.strategyB),
    compare: p.get("c") === "1",
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
