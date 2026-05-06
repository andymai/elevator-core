import { PARAM_KEYS, type Overrides, type ParamKey } from "../params";
import { scenarioById } from "../scenarios";
import type { RepositionStrategyName, StrategyName } from "../../types";

// URL state encoding. Keeps the sim reproducible: sharing the URL replays
// exactly what the sender saw. Only knobs that affect behavior go here.

/**
 * Top-level playground modes. `compare` is the long-standing
 * side-by-side strategy view; `quest` is the curriculum mode that
 * lands across the Quest series (Q-04+ wires the editor + worker
 * integration). Encoded compactly so unused defaults don't bloat the
 * URL — `compare` is omitted entirely from the query string.
 */
export type PlaygroundMode = "compare" | "quest";

export interface PermalinkState {
  /** Top-level playground mode. */
  mode: PlaygroundMode;
  /**
   * Active Quest stage id. Ignored in compare mode. Encoded as `?qs=`
   * because `s` is already taken by the scenario picker. Unknown
   * stage ids fall back to the first stage in the registry — keeps
   * stale share-links loading cleanly when the curriculum's id set
   * shifts.
   */
  questStage: string;
  scenario: string;
  strategyA: StrategyName;
  strategyB: StrategyName;
  /** Per-pane reposition (idle-parking) strategy. Defaults to
   *  `"adaptive"` — the scenario's baseline — so pre-existing
   *  permalinks without these keys behave identically. */
  repositionA: RepositionStrategyName;
  repositionB: RepositionStrategyName;
  compare: boolean;
  /** Word seed (RimWorld-style). Hashed to a numeric RNG seed by
   *  `hashSeedWord` when building the TrafficDriver. Kept as text so
   *  users can type memorable words like "otis" or "lobby" and share
   *  them in permalinks. Pre-existing numeric seeds (e.g. "42") round-
   *  trip unchanged — a digit string is just another valid word. */
  seed: string;
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
  // Cold-boot mode: compare. The Quest curriculum mode lights up via
  // an explicit `?m=quest` until its UI shell lands (Q-04+).
  mode: "compare",
  // Cold-boot Quest stage: the curriculum's first entry. The
  // `?qs=` URL key only emits when this differs from the default,
  // so compare-mode share-links don't carry a stale Quest stage id.
  questStage: "first-floor",
  // First-impression tuning: skyscraper is the visually richest
  // scenario (3 cars, 12 floors, bypass feature firing during morning
  // rush). Unknown scenario ids still resolve through
  // `scenarioById`'s fallback so stale permalinks keep loading cleanly.
  scenario: "skyscraper-sky-lobby",
  // Cold-boot pairing: SCAN as the baseline primitive vs RSR as the
  // composite cost-stack. Makes the first-impression compare mode
  // showcase the full spread between the simplest and most
  // full-featured built-in dispatchers.
  strategyA: "scan",
  strategyB: "rsr",
  // Default compare: SCAN + lobby-return vs RSR + adaptive. Gives
  // users an immediate "simple-and-predictable" baseline next to the
  // "modern and mode-aware" comparison — the delta in wait times
  // during morning rush lands right away.
  repositionA: "lobby",
  repositionB: "adaptive",
  // Compare mode on by default: the playground's whole pitch is
  // side-by-side strategy comparison, so the cold-boot view should
  // already show two panes rather than hide the feature behind a
  // toggle. Users who want single-pane still flip via the checkbox
  // or the `C` shortcut.
  compare: true,
  seed: "otis",
  intensity: 1.0,
  // 2× default (was 4×): after door times moved to realistic
  // commercial values (3–5 s dwell), 4× playback made the whole
  // scenario feel frantic — doors flashed, cars teleported. 2×
  // keeps dispatch decisions readable without making a cold visitor
  // wait a real minute to see morning rush develop.
  speed: 2,
  overrides: {},
};

const STRATEGIES: readonly StrategyName[] = [
  "scan",
  "look",
  "nearest",
  "etd",
  "destination",
  "rsr",
];

const REPOSITION_STRATEGIES: readonly RepositionStrategyName[] = [
  "adaptive",
  "predictive",
  "lobby",
  "spread",
  "none",
];

function parseStrategy(raw: string | null, fallback: StrategyName): StrategyName {
  return raw !== null && (STRATEGIES as readonly string[]).includes(raw)
    ? (raw as StrategyName)
    : fallback;
}

function parseReposition(
  raw: string | null,
  fallback: RepositionStrategyName,
): RepositionStrategyName {
  return raw !== null && (REPOSITION_STRATEGIES as readonly string[]).includes(raw)
    ? (raw as RepositionStrategyName)
    : fallback;
}

type PermalinkListener = (state: PermalinkState) => void;
const permalinkListeners = new Set<PermalinkListener>();

/**
 * Subscribe to permalink commits. The listener fires after the URL is
 * replaced, only when the encoded query string actually changed.
 * Returns an unsubscribe handle. Used by the shell to keep document
 * <title>, OG tags, and other state-derived chrome in lock-step with
 * the live permalink without making every feature aware of meta.
 */
export function onPermalinkSync(listener: PermalinkListener): () => void {
  permalinkListeners.add(listener);
  return () => permalinkListeners.delete(listener);
}

/**
 * Replace the current address-bar URL with one that reflects the given
 * permalink state. Uses `replaceState` (not `pushState`) so the back
 * button keeps its meaning — a scenario switch is a UI tweak, not a
 * navigation event the user expects to revisit. Safe to call from any
 * mutator path; idempotent when the encoded query string already
 * matches what's in the address bar.
 */
export function syncPermalinkUrl(state: PermalinkState): void {
  const qs = encodePermalink(state);
  if (window.location.search === qs) return;
  window.history.replaceState(null, "", qs);
  for (const fn of permalinkListeners) fn(state);
}

function parseMode(raw: string | null, fallback: PlaygroundMode): PlaygroundMode {
  // Anything other than the two known modes silently falls back to
  // the default. Keeps recipients of malformed URLs landing on
  // something usable rather than throwing.
  return raw === "compare" || raw === "quest" ? raw : fallback;
}

export function encodePermalink(state: PermalinkState): string {
  const p = new URLSearchParams();
  // Only emit `m` when the mode is non-default. Compare-mode URLs
  // stay short, and the existing share-link reader keeps producing
  // identical canonical query strings for unchanged state.
  if (state.mode !== DEFAULT_STATE.mode) {
    p.set("m", state.mode);
  }
  // Quest stage id — only emit when not default and only meaningful
  // in quest mode. Compare-mode URLs stay clean.
  if (state.mode === "quest" && state.questStage !== DEFAULT_STATE.questStage) {
    p.set("qs", state.questStage);
  }
  p.set("s", state.scenario);
  p.set("a", state.strategyA);
  // Always persist `b` so a shared non-compare URL still remembers the B
  // strategy when the recipient toggles compare on. Only the compare flag
  // itself is conditional.
  p.set("b", state.strategyB);
  // Reposition picks — omit when set to the pane's effective default
  // so bare URLs stay short. The "effective default" is the
  // scenario's `defaultReposition` when the scenario specifies one
  // (e.g. tether → "spread", applied to both panes), otherwise the
  // global per-pane baseline (`lobby` for A, `adaptive` for B).
  // Without scenario-awareness, a tether user who explicitly picked
  // "lobby" would have it omitted, and on reload boot.ts would
  // re-apply "spread" and silently overwrite their pick.
  const sceneDefault = scenarioById(state.scenario).defaultReposition;
  const defaultA = sceneDefault ?? DEFAULT_STATE.repositionA;
  const defaultB = sceneDefault ?? DEFAULT_STATE.repositionB;
  if (state.repositionA !== defaultA) p.set("pa", state.repositionA);
  if (state.repositionB !== defaultB) p.set("pb", state.repositionB);
  // Always emit `c` explicitly so the URL round-trips identically
  // regardless of whether the sender's value matches the current
  // default. Missing `c` in the URL falls back to `DEFAULT_STATE.compare`
  // via `decodePermalink` — that fallback is what makes bare-URL boot
  // honor the default (e.g. compare-on for first-time visitors).
  p.set("c", state.compare ? "1" : "0");
  p.set("k", state.seed);
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
    mode: parseMode(p.get("m"), DEFAULT_STATE.mode),
    // Stage id is freeform — the registry validates it at lookup
    // time. An unknown id round-trips here but the consumer should
    // fall back when `stageById` returns `undefined`.
    questStage: (p.get("qs") ?? "").trim() || DEFAULT_STATE.questStage,
    scenario: p.get("s") ?? DEFAULT_STATE.scenario,
    strategyA: parseStrategy(p.get("a") ?? p.get("d"), DEFAULT_STATE.strategyA),
    strategyB: parseStrategy(p.get("b"), DEFAULT_STATE.strategyB),
    repositionA: parseReposition(p.get("pa"), DEFAULT_STATE.repositionA),
    repositionB: parseReposition(p.get("pb"), DEFAULT_STATE.repositionB),
    compare: p.has("c") ? p.get("c") === "1" : DEFAULT_STATE.compare,
    seed: (p.get("k") ?? "").trim() || DEFAULT_STATE.seed,
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

/**
 * Hash a word seed to a 32-bit unsigned integer using FNV-1a. Callers
 * feed the result into `TrafficDriver` to initialise its RNG stream.
 *
 * FNV-1a was chosen for three reasons:
 *   - Fully deterministic (same word → same RNG stream on every
 *     machine, so permalinks are reproducible across browsers).
 *   - Good avalanche at tiny key sizes — `"a"` vs `"b"` vs `"c"` all
 *     produce wildly different streams, so typing a new seed feels
 *     like starting fresh.
 *   - ~10 lines, no deps. We're not hashing adversarial input.
 *
 * Empty string hashes to a non-zero sentinel (FNV-1a's offset basis)
 * so the driver never starts from a degenerate all-zeros state.
 */
export function hashSeedWord(word: string): number {
  let hash = 0x811c9dc5;
  const trimmed = word.trim();
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
