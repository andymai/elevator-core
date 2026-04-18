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

/**
 * `destination` requires DCS hall-call mode which the playground scenarios
 * don't enable, so it's intentionally excluded from the user-facing dropdown.
 * The wasm API still accepts the value.
 */
export type StrategyName = "scan" | "look" | "nearest" | "etd";

export interface ScenarioMeta {
  id: string;
  label: string;
  description: string;
  ron: string;
  /** A sensible traffic rate (riders/min) for this scenario at start. */
  suggestedTrafficRate: number;
}
