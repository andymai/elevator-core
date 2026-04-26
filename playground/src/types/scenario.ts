import type { RepositionStrategyName, StrategyName } from "./strategies";

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

/**
 * Tether-mode rendering hints for space-elevator-style scenarios.
 * When present, the renderer collapses every car into a single shared
 * shaft and switches the altitude axis to a log scale that spans
 * sea level through the counterweight altitude.
 */
export interface TetherMeta {
  /**
   * Visual cap altitude (m) above the topmost stop. The counterweight
   * icon is drawn here; the climber never travels past the topmost
   * actual stop. Real space elevators terminate the cable at
   * ~100,000 km counterweight mass to keep tension above GEO.
   */
  counterweightAltitudeM: number;
  /** Cycle the Earth-curve gradient between day and night. */
  showDayNight: boolean;
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
  /** One-line narrative shown alongside the scenario to frame what to watch for. */
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
   * seconds. 90–180 s matches realistic human patience for commercial
   * elevators; with it set, peak phases above cruise capacity reach a
   * bounded steady state (old waiters leave as new ones arrive).
   *
   * Omit to disable abandonment — the convention burst leaves it off
   * so its deliberate post-keynote stress test actually applies
   * pressure instead of auto-draining.
   */
  abandonAfterSec?: number;
  /**
   * Tether-mode metadata. Set only by space-elevator-style scenarios;
   * absent for regular building scenarios so they keep the standard
   * per-line column rendering.
   */
  tether?: TetherMeta;
  /**
   * Default reposition (idle-parking) strategy applied on scenario
   * selection. Lobby is fine for skyscrapers but a tether climber
   * sliding back to the ground every time it's idle defeats the
   * visualization, so the space-elevator scenario opts into Spread
   * to keep idle climbers distributed across the platforms.
   */
  defaultReposition?: RepositionStrategyName;
}
