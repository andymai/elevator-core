import { PARAM_KEYS, type Overrides, type ParamKey } from "./params";
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
  /**
   * User overrides for building physics (cars, max speed, capacity,
   * door cycle). Empty record means "everything at scenario default".
   * Encoded compactly so default scenarios still produce short URLs;
   * any present key auto-opens the drawer for the recipient so they
   * see what was customized.
   */
  overrides: Overrides;
}

/**
 * Compact two-letter URL keys per overridable param. Two letters
 * because the existing core knobs already claim every short single
 * letter (`s`/`a`/`b`/`c`/`k`/`i`/`x`); a separate two-letter
 * namespace keeps readers oriented.
 */
const OVERRIDE_KEYS: Record<ParamKey, string> = {
  cars: "ec",
  maxSpeed: "ms",
  weightCapacity: "wc",
  doorCycleSec: "dc",
};

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
  // 2× default (was 4×): after door times moved to realistic
  // commercial values (3–5 s dwell), 4× playback made the whole
  // scenario feel frantic — doors flashed, cars teleported. 2×
  // keeps dispatch decisions readable without making a cold visitor
  // wait a real minute to see morning rush develop.
  speed: 2,
  overrides: {},
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
  // Overrides: only emit keys the user has actually moved away from
  // default. Caller (main.ts) is responsible for compacting via
  // `compactOverrides()` before encoding so a value that rounds back
  // to the default doesn't leak into the URL.
  for (const k of PARAM_KEYS) {
    const v = state.overrides[k];
    if (v !== undefined && Number.isFinite(v)) {
      p.set(OVERRIDE_KEYS[k], formatOverride(v));
    }
  }
  return `?${p.toString()}`;
}

export function decodePermalink(search: string): PermalinkState {
  const p = new URLSearchParams(search);
  const overrides: Overrides = {};
  for (const k of PARAM_KEYS) {
    const raw = p.get(OVERRIDE_KEYS[k]);
    if (raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) overrides[k] = n;
  }
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
    overrides,
  };
}

function parseNum(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Render a numeric override compactly. Integer-valued numbers (cars
 * count, whole-kg capacity at default step, whole-second door cycle)
 * round-trip without trailing `.0`; fractional values keep up to two
 * decimals so `2.5 m/s` stays `"2.5"` rather than `"2.499999"`.
 */
function formatOverride(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(2)).toString();
}
