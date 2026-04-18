import type { StrategyName } from "./types";

// URL state encoding. Keeps the sim reproducible: sharing the URL replays
// exactly what the sender saw. Only knobs that affect behavior go here.

export interface PermalinkState {
  scenario: string;
  strategyA: StrategyName;
  strategyB: StrategyName;
  compare: boolean;
  seed: number;
  /**
   * Multiplier applied on top of each phase's baseline `ridersPerMin`.
   * A stand-in for the old `trafficRate` slider: replacing the absolute
   * riders-per-minute with a relative knob keeps each scenario's
   * intended traffic shape intact while still letting the user stress
   * the controller.
   */
  intensity: number;
  /** Playback multiplier (sim ticks per rendered frame). */
  speed: number;
}

export const DEFAULT_STATE: PermalinkState = {
  // First-impression tuning: skyscraper is the visually richest
  // scenario (3 cars, 12 floors, bypass feature firing during morning
  // rush) — office would have a visitor watching idle cars during
  // "Overnight" for 45 sim-seconds before anything happens. The
  // legacy `office-5` id still resolves through `scenarioById`
  // fallback so stale permalinks keep loading cleanly.
  scenario: "skyscraper-sky-lobby",
  strategyA: "etd",
  strategyB: "scan",
  // Compare mode on by default: the single most visceral "one strategy
  // is clearly better" demonstration the playground offers is the live
  // scoreboard. A cold visitor in single-pane mode would have to
  // manually swap strategies to notice any difference and most won't —
  // defaulting compare on makes the library's payoff immediate.
  compare: true,
  seed: 42,
  intensity: 1.0,
  speed: 4,
};

const STRATEGIES: readonly StrategyName[] = ["scan", "look", "nearest", "etd", "destination"];

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
  p.set("i", String(state.intensity));
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
    // `t` was the old absolute riders-per-minute; if we see it we
    // silently drop it and fall back to the default multiplier rather
    // than try to re-interpret the value against an unknown scenario.
    intensity: parseNum(p.get("i"), DEFAULT_STATE.intensity),
    speed: parseNum(p.get("x"), DEFAULT_STATE.speed),
  };
}

function parseNum(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
