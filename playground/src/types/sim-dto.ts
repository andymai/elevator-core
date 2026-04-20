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
  /**
   * Min and max world-y of stops the car's line serves. Renderers
   * use these to draw a shaft channel that only spans the range the
   * car can reach — express banks and service elevators get visibly
   * shorter shafts than the full-building banks. `NaN` when the
   * wasm couldn't resolve a range (stale build or mis-configured
   * line); renderers fall back to the full canvas height in that case.
   */
  min_served_y: number;
  max_served_y: number;
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
