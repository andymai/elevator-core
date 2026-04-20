import type { Phase, ScenarioMeta, TweakRanges } from "./types";

// ─── Default tweak bounds ───────────────────────────────────────────
//
// Shared by the two commercial-scale scenarios (convention burst and
// skyscraper). The space elevator overrides these because its
// operating envelope (50 m/s climbers, 1 000 m shaft, 2 stops) is two
// orders of magnitude away from a building.

const COMMERCIAL_TWEAK_RANGES: TweakRanges = {
  cars: { min: 1, max: 6, step: 1 },
  maxSpeed: { min: 0.5, max: 12, step: 0.5 },
  weightCapacity: { min: 200, max: 2500, step: 100 },
  doorCycleSec: { min: 2, max: 12, step: 0.5 },
};

// Scenarios are embedded as RON strings so the playground is a single static
// bundle with no extra fetches. Each scenario is validated by elevator-core's
// `Simulation::new`, so a malformed RON here surfaces as a JS error from
// `new WasmSim(...)`.
//
// Every scenario declares:
//   - `phases` — a day cycle the TrafficDriver loops through. Phase
//     durations are in *sim-seconds*; at the 2× default playback a
//     5-minute sim day lasts ~2.5 real-minutes.
//   - `featureHint` — one-line narrative framing what to watch for.
//   - `defaultStrategy` — the dispatch strategy the scenario opens
//     with; the user can still override via the UI.
//
// Phase weight vectors are indexed by stop position in the scenario's
// RON stop list, not by StopId — a renumbering in the RON would need a
// matching reshuffle here.

// ─── Helpers ─────────────────────────────────────────────────────────

/** Construct an evenly-weighted vector of length `n`. */
function uniform(n: number): number[] {
  return Array.from({ length: n }, () => 1);
}

/** Vector where weights grow slightly with altitude — plausible prior for
 *  exec suites / penthouses attracting modestly more traffic. */
function topBias(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 1 + (i / Math.max(1, n - 1)) * 0.5);
}

// ─── Convention burst — acute post-keynote surge ────────────────────

const CONV_STOPS = 5;
// Two 1500 kg cars at 3.5 m/s over a short 16 m shaft. With 7 s door
// cycle (5 s dwell for group boarding + 2 × 1 s transition), round
// trip is ~30 s and each car delivers ~40 riders/min — ~80
// combined. The keynote burst intentionally overshoots that to
// stress-test dispatch; the rate still drops enough between bursts
// that the cycle is recognizably calm.
const conventionPhases: Phase[] = [
  // Acute peak right after a keynote lets out.
  {
    name: "Keynote lets out",
    durationSec: 45,
    ridersPerMin: 110,
    originWeights: Array.from({ length: CONV_STOPS }, (_, i) => (i === CONV_STOPS - 1 ? 8 : 1)),
    destWeights: [5, 2, 1, 1, 0],
  },
  // Tapering as the hall clears.
  {
    name: "Tapering",
    durationSec: 90,
    ridersPerMin: 18,
    originWeights: uniform(CONV_STOPS),
    destWeights: uniform(CONV_STOPS),
  },
  // Quiet before the next session. Generous length so the cycle
  // actually rests between bursts — users get a chance to watch cars
  // park before the next keynote spike hits.
  {
    name: "Between sessions",
    durationSec: 135,
    ridersPerMin: 4,
    originWeights: uniform(CONV_STOPS),
    destWeights: uniform(CONV_STOPS),
  },
];

const convention: ScenarioMeta = {
  id: "convention-burst",
  label: "Convention burst",
  description:
    "Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",
  defaultStrategy: "etd",
  phases: conventionPhases,
  seedSpawns: 120,
  // Intentionally omits `abandonAfterSec` — the whole point of this
  // scenario is to stress-test dispatch under a real pile-up. Letting
  // attendees abandon would gut the arrival-rate signal's purpose,
  // which is "how punishing is *persistent* demand?"
  featureHint:
    "Arrival-rate signal lights up as the burst hits — `DispatchManifest::arrivals_at` feeds downstream strategies the per-stop intensity for the next 5 minutes.",
  buildingName: "Convention Center",
  stops: [
    { name: "Lobby", positionM: 0.0 },
    { name: "Exhibit Hall", positionM: 4.0 },
    { name: "Mezzanine", positionM: 8.0 },
    { name: "Ballroom", positionM: 12.0 },
    { name: "Keynote Hall", positionM: 16.0 },
  ],
  defaultCars: 2,
  elevatorDefaults: {
    maxSpeed: 3.5,
    acceleration: 2.0,
    deceleration: 2.5,
    weightCapacity: 1500.0,
    doorOpenTicks: 300,
    doorTransitionTicks: 60,
  },
  tweakRanges: { ...COMMERCIAL_TWEAK_RANGES, cars: { min: 1, max: 5, step: 1 } },
  passengerMeanIntervalTicks: 30,
  passengerWeightRange: [55.0, 100.0],
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Convention Center",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",        position: 0.0),
            StopConfig(id: StopId(1), name: "Exhibit Hall", position: 4.0),
            StopConfig(id: StopId(2), name: "Mezzanine",    position: 8.0),
            StopConfig(id: StopId(3), name: "Ballroom",     position: 12.0),
            StopConfig(id: StopId(4), name: "Keynote Hall", position: 16.0),
        ],
    ),
    // Convention door timing: 5 s dwell for group boarding. Big crowds
    // after keynote are slow to actually step through the threshold;
    // rushing the doors closed ejects riders mid-walk and re-opens, a
    // realistic failure mode.
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(0),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(4),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)`,
};

// ─── Skyscraper with sky lobby — full-load bypass showcase ──────────

const SKY_STOPS = 13; // Lobby + 12 floors
// Three 1200 kg cars at 4 m/s through a 48 m shaft. With realistic
// 5 s door dwell + 2 × 1.2 s transitions now in place (7.4 s per
// stop), asymmetric lobby-heavy traffic cycles ~19 riders/min
// combined — each round trip is ~55 s and carries 6–8 riders.
// Phase rates target just above that so bypass still triggers
// (cars hit 80 % during rush) but queues don't snowball and
// mass-abandon. Earlier tuning used fantasy 1.4 s door cycles which
// both looked unrealistic and inflated the apparent throughput.
const skyPhases: Phase[] = [
  {
    name: "Overnight",
    durationSec: 45,
    ridersPerMin: 6,
    originWeights: uniform(SKY_STOPS),
    destWeights: uniform(SKY_STOPS),
  },
  {
    name: "Morning rush",
    durationSec: 75,
    ridersPerMin: 20,
    originWeights: [14, ...Array.from({ length: SKY_STOPS - 1 }, () => 0.25)],
    destWeights: [0, ...topBias(SKY_STOPS - 1)],
  },
  {
    name: "Midday interfloor",
    durationSec: 60,
    ridersPerMin: 13,
    originWeights: uniform(SKY_STOPS),
    destWeights: uniform(SKY_STOPS),
  },
  {
    name: "Lunchtime",
    durationSec: 45,
    ridersPerMin: 17,
    // Sky lobby (stop 6) doubles as the canteen floor.
    originWeights: Array.from({ length: SKY_STOPS }, (_, i) => (i === 6 ? 3 : 1)),
    destWeights: Array.from({ length: SKY_STOPS }, (_, i) => (i === 6 ? 4 : 1)),
  },
  {
    name: "Evening exodus",
    durationSec: 75,
    ridersPerMin: 18,
    originWeights: [0, ...topBias(SKY_STOPS - 1)],
    destWeights: [14, ...Array.from({ length: SKY_STOPS - 1 }, () => 0.25)],
  },
];

const skyscraper: ScenarioMeta = {
  id: "skyscraper-sky-lobby",
  label: "Skyscraper (sky lobby)",
  description:
    "Twelve floors, three cars. Morning rush saturates two cars fast — the third's full-load bypass (80 %/50 %) stops it from detouring for upward hall calls it can't serve.",
  defaultStrategy: "etd",
  phases: skyPhases,
  seedSpawns: 0,
  // 180 s patience: 3 minutes is the realistic commercial-lobby
  // threshold before a hurried commuter peels off to the stairs or
  // another bank. 120 s (the original) caused riders to hit the cap
  // at the tail of morning rush even with well-tuned rates; 180 s
  // gives ETD room to drain the queue between phases.
  abandonAfterSec: 180,
  featureHint:
    "Direction-dependent bypass (80 % up / 50 % down) on all three cars — baked into the RON below. Watch the fullest car skip hall calls.",
  buildingName: "Skyscraper (Sky Lobby)",
  stops: [
    { name: "Lobby", positionM: 0.0 },
    { name: "Floor 2", positionM: 4.0 },
    { name: "Floor 3", positionM: 8.0 },
    { name: "Floor 4", positionM: 12.0 },
    { name: "Floor 5", positionM: 16.0 },
    { name: "Floor 6", positionM: 20.0 },
    { name: "Sky Lobby", positionM: 24.0 },
    { name: "Floor 8", positionM: 28.0 },
    { name: "Floor 9", positionM: 32.0 },
    { name: "Floor 10", positionM: 36.0 },
    { name: "Floor 11", positionM: 40.0 },
    { name: "Floor 12", positionM: 44.0 },
    { name: "Penthouse", positionM: 48.0 },
  ],
  defaultCars: 3,
  elevatorDefaults: {
    maxSpeed: 4.0,
    acceleration: 2.0,
    deceleration: 2.5,
    weightCapacity: 1200.0,
    doorOpenTicks: 300,
    doorTransitionTicks: 72,
    bypassLoadUpPct: 0.8,
    bypassLoadDownPct: 0.5,
  },
  tweakRanges: COMMERCIAL_TWEAK_RANGES,
  passengerMeanIntervalTicks: 30,
  passengerWeightRange: [55.0, 100.0],
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Skyscraper (Sky Lobby)",
        stops: [
            StopConfig(id: StopId(0),  name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1),  name: "Floor 2",    position: 4.0),
            StopConfig(id: StopId(2),  name: "Floor 3",    position: 8.0),
            StopConfig(id: StopId(3),  name: "Floor 4",    position: 12.0),
            StopConfig(id: StopId(4),  name: "Floor 5",    position: 16.0),
            StopConfig(id: StopId(5),  name: "Floor 6",    position: 20.0),
            StopConfig(id: StopId(6),  name: "Sky Lobby",  position: 24.0),
            StopConfig(id: StopId(7),  name: "Floor 8",    position: 28.0),
            StopConfig(id: StopId(8),  name: "Floor 9",    position: 32.0),
            StopConfig(id: StopId(9),  name: "Floor 10",   position: 36.0),
            StopConfig(id: StopId(10), name: "Floor 11",   position: 40.0),
            StopConfig(id: StopId(11), name: "Floor 12",   position: 44.0),
            StopConfig(id: StopId(12), name: "Penthouse",  position: 48.0),
        ],
    ),
    // High-rise commercial door timing: 5 s dwell (surge loading during
    // rush) + 1.2 s each way. The long dwell is what lets the bypass
    // matter — a full car's few seconds saved by skipping a hall call
    // is meaningful at this scale.
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(6),
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(12),
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)`,
};

// ─── Space elevator — pure novelty ──────────────────────────────────

const spaceElevator: ScenarioMeta = {
  id: "space-elevator",
  label: "Space elevator",
  description:
    "Two stops 1,000 km apart. Same engine, different scale — no traffic patterns really apply; it's a showpiece for the trapezoidal-motion primitives.",
  defaultStrategy: "scan",
  phases: [
    {
      name: "Scheduled climb",
      durationSec: 300,
      ridersPerMin: 4,
      originWeights: [1, 1],
      destWeights: [1, 1],
    },
  ],
  seedSpawns: 0,
  featureHint:
    "No controller feature to showcase — this scenario exists to demonstrate that the engine is topology-agnostic.",
  buildingName: "Orbital Tether",
  stops: [
    { name: "Ground Station", positionM: 0.0 },
    { name: "Orbital Platform", positionM: 1000.0 },
  ],
  defaultCars: 1,
  elevatorDefaults: {
    maxSpeed: 50.0,
    acceleration: 10.0,
    deceleration: 15.0,
    weightCapacity: 10000.0,
    doorOpenTicks: 120,
    doorTransitionTicks: 30,
  },
  // Space elevator's operating envelope is two orders of magnitude
  // away from a building. Bigger steps, no car-count tweaking
  // (only 2 stops; multiple climbers on a tether is its own can of worms).
  tweakRanges: {
    cars: { min: 1, max: 1, step: 1 },
    maxSpeed: { min: 5, max: 100, step: 5 },
    weightCapacity: { min: 1000, max: 20000, step: 1000 },
    doorCycleSec: { min: 2, max: 8, step: 0.5 },
  },
  passengerMeanIntervalTicks: 900,
  passengerWeightRange: [60.0, 90.0],
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station",   position: 0.0),
            StopConfig(id: StopId(1), name: "Orbital Platform", position: 1000.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Climber Alpha",
            max_speed: 50.0, acceleration: 10.0, deceleration: 15.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 120, door_transition_ticks: 30,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 900,
        weight_range: (60.0, 90.0),
    ),
)`,
};

// Order is intentional: scale-ascending. A 5-stop acute burst, then a
// 13-stop sky-lobby tower, then a 2-stop tether 1 000 km tall — the
// card strip reads as a "zoom out" from building to orbit.
export const SCENARIOS: ScenarioMeta[] = [convention, skyscraper, spaceElevator];

export function scenarioById(id: string): ScenarioMeta {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
