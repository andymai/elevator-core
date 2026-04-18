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
