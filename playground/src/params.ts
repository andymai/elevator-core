import type { ElevatorPhysics, ScenarioMeta } from "./types";

// Owner of the "Tweak parameters" drawer's domain logic. Independent of
// the DOM and the wasm sim — both `main.ts` (drawer wiring) and
// `permalink.ts` (URL encoding) consume this module's pure helpers.
//
// Two kinds of overrides exist, and they apply to the sim differently:
//   - **Live-mutated**: max speed, weight capacity, door cycle. The
//     wasm crate exposes uniform setters that mutate every elevator in
//     place, so changing these does not reset the sim's accumulated
//     metrics.
//   - **Rebuild-on-change**: number of cars. Adding/removing elevators
//     mid-tick is invasive engine work; the playground instead
//     regenerates the RON and rebuilds the sim. Metrics reset.
//
// The drawer treats both kinds uniformly from the user's perspective —
// the asymmetry is hidden behind `applyOverrides()` in `main.ts`.

/** The user-facing knobs the drawer exposes. */
export type ParamKey = "cars" | "maxSpeed" | "weightCapacity" | "doorCycleSec";

/**
 * User-applied overrides as a partial record. A key is present iff the
 * user has moved that knob away from the scenario's default. Permalink
 * encoding only emits keys that are present, so default scenarios still
 * produce short, clean URLs.
 */
export type Overrides = Partial<Record<ParamKey, number>>;

/**
 * Resolve `overrides[key]` against the scenario's default, with
 * defensive clamping. Used by `applyOverrides()` and by the drawer to
 * compute what to display.
 */
export function resolveParam(
  scenario: ScenarioMeta,
  key: ParamKey,
  overrides: Overrides,
): number {
  const def = defaultFor(scenario, key);
  const raw = overrides[key];
  if (raw === undefined || !Number.isFinite(raw)) return def;
  const range = scenario.tweakRanges[key];
  return clamp(raw, range.min, range.max);
}

/**
 * The scenario's default value for `key`. For `doorCycleSec` this
 * computes the combined `dwell + 2 × transition` from the tick fields.
 */
export function defaultFor(scenario: ScenarioMeta, key: ParamKey): number {
  const e = scenario.elevatorDefaults;
  switch (key) {
    case "cars":
      return scenario.defaultCars;
    case "maxSpeed":
      return e.maxSpeed;
    case "weightCapacity":
      return e.weightCapacity;
    case "doorCycleSec":
      return doorCycleSecFromTicks(e.doorOpenTicks, e.doorTransitionTicks);
  }
}

/**
 * Whether `value` differs from the scenario's default by enough to
 * count as "overridden". Tolerance is half a step so a value that
 * rounds back to the default doesn't get persisted as an override.
 */
export function isOverridden(scenario: ScenarioMeta, key: ParamKey, value: number): boolean {
  const def = defaultFor(scenario, key);
  const tolerance = scenario.tweakRanges[key].step / 2;
  return Math.abs(value - def) > tolerance;
}

/**
 * Strip override entries that match the scenario default within
 * tolerance. Called before encoding so the URL doesn't carry no-op
 * overrides.
 */
export function compactOverrides(scenario: ScenarioMeta, overrides: Overrides): Overrides {
  const out: Overrides = {};
  for (const k of PARAM_KEYS) {
    const raw = overrides[k];
    if (raw === undefined) continue;
    if (isOverridden(scenario, k, raw)) out[k] = raw;
  }
  return out;
}

export const PARAM_KEYS: readonly ParamKey[] = [
  "cars",
  "maxSpeed",
  "weightCapacity",
  "doorCycleSec",
] as const;

/**
 * Convert a desired total door cycle (seconds) back to (open_ticks,
 * transition_ticks) using the scenario's default dwell-share so the
 * proportional split feels stable as the user drags the slider.
 *
 * Both outputs are clamped to ≥1 tick so the engine's `nonzero_u32`
 * validation never fails — the slider's min of 2 s already keeps both
 * comfortably positive in practice.
 */
export function doorCycleSecToTicks(
  scenario: ScenarioMeta,
  cycleSec: number,
): { openTicks: number; transitionTicks: number } {
  const { doorOpenTicks, doorTransitionTicks } = scenario.elevatorDefaults;
  const defaultCycleSec = doorCycleSecFromTicks(doorOpenTicks, doorTransitionTicks);
  // Dwell share is computed against the full cycle (open + 2 × transition).
  // Capped to [0.1, 0.9] so neither half ever rounds to zero ticks.
  const dwellShare = clamp(doorOpenTicks / (defaultCycleSec * TICKS_PER_SEC), 0.1, 0.9);
  const totalTicks = Math.max(2, Math.round(cycleSec * TICKS_PER_SEC));
  const openTicks = Math.max(1, Math.round(totalTicks * dwellShare));
  const transitionTicks = Math.max(1, Math.round((totalTicks - openTicks) / 2));
  return { openTicks, transitionTicks };
}

/** Inverse of {@link doorCycleSecToTicks} for displaying the current value. */
export function doorCycleSecFromTicks(
  openTicks: number,
  transitionTicks: number,
): number {
  return (openTicks + 2 * transitionTicks) / TICKS_PER_SEC;
}

/**
 * Build a fresh `ElevatorPhysics` value with `maxSpeed`, `weightCapacity`,
 * and door timings replaced by the user's overrides (if any). Used by
 * `buildScenarioRon()` so a regenerated RON for a new car count also
 * carries the user's hot-swappable tweaks (preserving them across the
 * rebuild).
 */
export function applyPhysicsOverrides(
  scenario: ScenarioMeta,
  overrides: Overrides,
): ElevatorPhysics {
  const base = scenario.elevatorDefaults;
  const maxSpeed = resolveParam(scenario, "maxSpeed", overrides);
  const weightCapacity = resolveParam(scenario, "weightCapacity", overrides);
  const doorCycleSec = resolveParam(scenario, "doorCycleSec", overrides);
  const { openTicks, transitionTicks } = doorCycleSecToTicks(scenario, doorCycleSec);
  return {
    ...base,
    maxSpeed,
    weightCapacity,
    doorOpenTicks: openTicks,
    doorTransitionTicks: transitionTicks,
  };
}

/**
 * Spread `cars` evenly across `numStops` to pick each elevator's
 * starting stop. With `cars = numStops` we get one car per stop; with
 * fewer cars we land on `floor(i * numStops / cars)` so the spread
 * stays even.
 */
export function pickStartingStops(numStops: number, cars: number): number[] {
  if (numStops < 1 || cars < 1) return [];
  const out: number[] = [];
  for (let i = 0; i < cars; i += 1) {
    out.push(Math.min(numStops - 1, Math.floor((i * numStops) / cars)));
  }
  return out;
}

/**
 * Regenerate a scenario's RON with `cars` cars and the user's
 * physics overrides baked into every car. Called whenever the cars
 * count changes (the only override that can't be hot-swapped) and on
 * initial sim construction so hot-swappable defaults are still
 * honored before any setter call lands.
 */
export function buildScenarioRon(scenario: ScenarioMeta, overrides: Overrides): string {
  const cars = Math.round(resolveParam(scenario, "cars", overrides));
  const physics = applyPhysicsOverrides(scenario, overrides);
  const startingStops = pickStartingStops(scenario.stops.length, cars);

  const stopsBlock = scenario.stops
    .map((s, i) => `        StopConfig(id: StopId(${i}), name: ${ronString(s.name)}, position: ${ronFloat(s.positionM)}),`)
    .join("\n");

  const elevatorsBlock = startingStops
    .map((startIdx, i) => buildElevatorRon(i, physics, startIdx, defaultCarName(i, cars)))
    .join("\n");

  return `SimConfig(
    building: BuildingConfig(
        name: ${ronString(scenario.buildingName)},
        stops: [
${stopsBlock}
        ],
    ),
    elevators: [
${elevatorsBlock}
    ],
    simulation: SimulationParams(ticks_per_second: ${ronFloat(TICKS_PER_SEC)}),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: ${scenario.passengerMeanIntervalTicks},
        weight_range: (${ronFloat(scenario.passengerWeightRange[0])}, ${ronFloat(scenario.passengerWeightRange[1])}),
    ),
)`;
}

// ─── Internals ──────────────────────────────────────────────────────

const TICKS_PER_SEC = 60;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Naming follows the existing scenarios: a single car is "Car 1"; with
 * 2 cars they're "Car 1"/"Car 2"; 3+ cars switch to "Car A"/"Car B"/...
 * mirroring the skyscraper/hotel convention so a regenerated RON reads
 * naturally to anyone familiar with the scenario.
 */
function defaultCarName(index: number, total: number): string {
  if (total >= 3) return `Car ${String.fromCharCode(65 + index)}`;
  return `Car ${index + 1}`;
}

function buildElevatorRon(
  id: number,
  p: ElevatorPhysics,
  startingStopIdx: number,
  name: string,
): string {
  const bypassUp =
    p.bypassLoadUpPct !== undefined ? `\n            bypass_load_up_pct: Some(${ronFloat(p.bypassLoadUpPct)}),` : "";
  const bypassDown =
    p.bypassLoadDownPct !== undefined ? `\n            bypass_load_down_pct: Some(${ronFloat(p.bypassLoadDownPct)}),` : "";
  return `        ElevatorConfig(
            id: ${id}, name: ${ronString(name)},
            max_speed: ${ronFloat(p.maxSpeed)}, acceleration: ${ronFloat(p.acceleration)}, deceleration: ${ronFloat(p.deceleration)},
            weight_capacity: ${ronFloat(p.weightCapacity)},
            starting_stop: StopId(${startingStopIdx}),
            door_open_ticks: ${p.doorOpenTicks}, door_transition_ticks: ${p.doorTransitionTicks},${bypassUp}${bypassDown}
        ),`;
}

function ronString(s: string): string {
  // RON strings reuse JSON-style escaping for our characters of interest
  // (printable ASCII names with no backslashes). Bail loudly if anything
  // unexpected slips in — protects against future scenario edits that
  // sneak a quote into a stop name.
  if (/[\\"\n]/.test(s)) {
    throw new Error(`scenario name contains illegal RON character: ${JSON.stringify(s)}`);
  }
  return `"${s}"`;
}

function ronFloat(n: number): string {
  // Always render with a decimal point so RON parses it as a float.
  // `1` → `"1.0"`, `2.5` → `"2.5"`, `3.14` → `"3.14"`.
  if (Number.isInteger(n)) return `${n}.0`;
  return String(n);
}
