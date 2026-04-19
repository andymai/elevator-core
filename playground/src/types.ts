// Mirrors of the DTO shapes returned by crates/elevator-wasm/src/dto.rs.
// Keep this file narrow — only what the UI actually reads.

export interface Car {
  id: number;
  line: number;
  y: number;
  v: number;
  phase:
    | "idle"
    | "moving"
    | "repositioning"
    | "door-opening"
    | "loading"
    | "door-closing"
    | "stopped"
    | "unknown";
  target: number | null;
  load: number;
  capacity: number;
  riders: number;
}

export interface Stop {
  entity_id: number;
  stop_id: number;
  name: string;
  y: number;
  waiting: number;
  /** Waiting riders whose destination is above this stop. Partition of `waiting`. */
  waiting_up: number;
  /** Waiting riders whose destination is below this stop. Partition of `waiting`. */
  waiting_down: number;
  residents: number;
}

export interface Snapshot {
  tick: number;
  dt: number;
  cars: Car[];
  stops: Stop[];
}

export interface Metrics {
  delivered: number;
  abandoned: number;
  spawned: number;
  settled: number;
  rerouted: number;
  throughput: number;
  avg_wait_s: number;
  max_wait_s: number;
  avg_ride_s: number;
  utilization: number;
  abandonment_rate: number;
  total_distance: number;
  total_moves: number;
}

export type StrategyName = "scan" | "look" | "nearest" | "etd" | "destination";

/**
 * Decoded event DTOs surfaced by `Sim.drainEvents`. Kind-tagged to
 * mirror the Rust `EventDto` shape (`#[serde(tag = "kind", rename_all =
 * "kebab-case")]`). Only the cases the speech-bubble layer consumes are
 * enumerated; unknown variants fall through to the `string`-kind branch
 * so a future DTO addition doesn't crash the UI.
 */
export type BubbleEvent =
  | { kind: "rider-spawned"; tick: number; rider: number; origin: number; destination: number }
  | { kind: "rider-boarded"; tick: number; rider: number; elevator: number }
  | { kind: "rider-exited"; tick: number; rider: number; elevator: number; stop: number }
  | { kind: "rider-abandoned"; tick: number; rider: number; stop: number }
  | { kind: "elevator-arrived"; tick: number; elevator: number; stop: number }
  | { kind: "elevator-departed"; tick: number; elevator: number; stop: number }
  | { kind: "door-opened"; tick: number; elevator: number }
  | { kind: "door-closed"; tick: number; elevator: number }
  | { kind: "elevator-assigned"; tick: number; elevator: number; stop: number }
  | { kind: "other"; tick: number; label: string };

/**
 * Per-car speech-bubble state, keyed by car entity id. `expiresAt`
 * uses `performance.now()` wall-clock ms — not a sim tick — so the
 * bubble fades predictably even when the sim races ahead or the tab
 * backgrounds and `requestAnimationFrame` stalls.
 */
export interface CarBubble {
  text: string;
  expiresAt: number;
}

/**
 * One phase of a scenario's day cycle. The `TrafficDriver` linearly
 * interpolates spawn volume between adjacent phases so transitions
 * feel continuous rather than stepwise.
 */
export interface Phase {
  /** Short human-readable label (e.g. "Morning rush"). */
  name: string;
  /** Phase duration in simulated seconds. */
  durationSec: number;
  /** Baseline spawn rate during this phase, in riders per minute. */
  ridersPerMin: number;
  /**
   * Origin-selection weights, one entry per stop in the scenario's
   * order. Unnormalized — the driver normalizes on each draw.
   * If omitted or empty, origins are drawn uniformly.
   */
  originWeights?: number[];
  /**
   * Destination-selection weights, same shape as `originWeights`. If
   * the drawn origin has weight 0 in this vector, the driver clones
   * `originWeights` (reversed if `mirrorDestinations` is set) so a
   * same-stop collision is still possible — the rider spec generator
   * will flip it to the neighboring stop like today.
   */
  destWeights?: number[];
}

/**
 * Optional scenario feature hooks. Applied once on scenario load so
 * the scenario's signature behavior is visible without the user
 * having to hunt for the right tunable.
 */
export type ScenarioHook =
  | { kind: "none" }
  | { kind: "etd_group_time"; waitSquaredWeight: number }
  | { kind: "deferred_dcs"; commitmentWindowTicks: number }
  | { kind: "predictive_parking"; windowTicks: number }
  | { kind: "arrival_log" }
  // bypass is already wired via the RON ElevatorConfig fields — this
  // marker is purely for UI narration (label + description).
  | { kind: "bypass_narration" };

/**
 * Per-elevator physics defaults applied uniformly when the playground
 * builds a scenario's RON. Mirrors a subset of `ElevatorConfig`'s
 * fields — only the ones the "Tweak parameters" drawer surfaces (plus
 * fixed-by-scenario fields like accel/decel and bypass that ride along
 * but aren't user-tunable in v1).
 *
 * Times use ticks at the canonical 60 Hz simulation rate so they match
 * the engine's storage form directly (no conversion at the boundary).
 */
export interface ElevatorPhysics {
  /** Maximum travel speed (m/s). */
  maxSpeed: number;
  /** Acceleration (m/s²). Not user-tweakable in v1; kept here so RON regen is faithful. */
  acceleration: number;
  /** Deceleration (m/s²). Not user-tweakable in v1; kept here so RON regen is faithful. */
  deceleration: number;
  /** Weight capacity (kg). */
  weightCapacity: number;
  /** Door dwell ticks (60 Hz). */
  doorOpenTicks: number;
  /** Door open/close transition ticks (60 Hz). */
  doorTransitionTicks: number;
  /** Optional full-load up-direction bypass threshold (0..1). */
  bypassLoadUpPct?: number;
  /** Optional full-load down-direction bypass threshold (0..1). */
  bypassLoadDownPct?: number;
}

/** Bounds for a single tweakable parameter (slider min/max/step). */
export interface TweakRange {
  min: number;
  max: number;
  step: number;
}

/**
 * Per-scenario tweak bounds for the four user-facing knobs. Exists so
 * the space elevator (50 m/s climbers, 1000 m shaft, 1 car) can have
 * sane bounds distinct from a commercial building.
 */
export interface TweakRanges {
  cars: TweakRange;
  /** Max speed in m/s. */
  maxSpeed: TweakRange;
  /** Weight capacity in kg. */
  weightCapacity: TweakRange;
  /** Combined door cycle time in seconds (dwell + 2× transition). */
  doorCycleSec: TweakRange;
}

export interface ScenarioMeta {
  id: string;
  label: string;
  description: string;
  ron: string;
  /** Baseline dispatch strategy for this scenario. User can still swap. */
  defaultStrategy: StrategyName;
  /** Day-cycle phases, ordered. Empty array = static (used by convention-burst). */
  phases: Phase[];
  /**
   * Seeded initial spawns dropped into the sim on load. Used by the
   * convention scenario to produce an acute pre-loaded crowd; left 0
   * for day-cycle scenarios.
   */
  seedSpawns: number;
  /** Commercial-feature hook applied once on scenario load. */
  hook: ScenarioHook;
  /** One-line narrative shown alongside the feature hook to frame what to watch for. */
  featureHint: string;
  /**
   * Building name as it appears in the RON `BuildingConfig.name` field.
   * Used by the "Tweak parameters" drawer to regenerate RON when the
   * car count changes (every other RON section is preserved verbatim).
   */
  buildingName: string;
  /** Stops in scenario order, mirroring the RON `stops:` array. */
  stops: Array<{ name: string; positionM: number }>;
  /**
   * Number of elevators in the scenario's canonical RON. The drawer
   * displays this as the "default" badge and resets to it when the
   * user clicks the reset chevron on the cars stepper.
   */
  defaultCars: number;
  /**
   * Per-elevator defaults applied to every car when regenerating RON
   * for a different car count or under user overrides. Single template
   * because every scenario today uses identical physics across its
   * cars; per-elevator tunability is a future expansion.
   */
  elevatorDefaults: ElevatorPhysics;
  /** Bounds the drawer uses for each slider. */
  tweakRanges: TweakRanges;
  /** Mean spawn interval in ticks at 60 Hz (RON `passenger_spawning.mean_interval_ticks`). */
  passengerMeanIntervalTicks: number;
  /** Rider weight range in kg, for the RON `passenger_spawning.weight_range`. */
  passengerWeightRange: [number, number];
  /**
   * Time a rider will wait before abandoning the queue, in simulated
   * seconds. Prevents scenarios whose peak phases run above the
   * building's cruise capacity from accumulating an unbounded wait
   * line — old waiters leave, new ones arrive, queue reaches a
   * bounded steady state matching the demand/supply gap.
   *
   * Pre-fix, office-lunchtime under two cars at 65 riders/min vs.
   * ~54/min cruise grew the queue forever; 90–120 s is a realistic
   * human patience budget for commercial elevators (shorter during
   * bursty peaks, longer during midday lulls — we use one value per
   * scenario for simplicity).
   *
   * Omit to disable abandonment (convention burst leaves it off so
   * the full 170-riders/min stress test actually applies pressure).
   */
  abandonAfterSec?: number;
}
