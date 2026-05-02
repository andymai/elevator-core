import type { Stage } from "./types";

/**
 * Stage 4 — Stand on Shoulders.
 *
 * Two cars and eight stops, lunchtime traffic. Introduces
 * `setStrategy(name)`: instead of queuing destinations one by one,
 * the controller delegates routing to a built-in dispatcher. The
 * curriculum's first taste of "let the engine do the work."
 */
const STAGE_04_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 4",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
            StopConfig(id: StopId(6), name: "F7", position: 24.0),
            StopConfig(id: StopId(7), name: "F8", position: 28.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (50.0, 100.0),
    ),
)`;

export const STAGE_04_BUILTIN: Stage = {
  id: "builtin",
  title: "Stand on Shoulders",
  brief: "Two cars, eight stops, lunchtime rush. Pick a built-in dispatch strategy.",
  configRon: STAGE_04_RON,
  unlockedApi: ["setStrategy"],
  baseline: "scan",
  passFn: ({ delivered }) => delivered >= 25,
  starFns: [
    // 2★ — beat the SCAN baseline on average wait.
    ({ delivered, metrics }) => delivered >= 25 && metrics.avg_wait_s < 25,
    // 3★ — sub-18s average; LOOK or NearestCar usually edges this
    // out under steady traffic.
    ({ delivered, metrics }) => delivered >= 25 && metrics.avg_wait_s < 18,
  ],
  starterCode: `// Stage 4 — Stand on Shoulders
//
// elevator-core ships built-in dispatch strategies: scan, look,
// nearest, etd, destination, rsr. Try them out:
//
//   sim.setStrategy("look");
//
// returns true on success, false if the name isn't a built-in.
// The default for this stage is SCAN — see if you can beat it.

sim.setStrategy("look");
`,
  hints: [
    "`scan` sweeps end-to-end; `look` stops at the last request and reverses; `nearest` picks the closest idle car; `etd` minimises estimated time-to-destination.",
    "Look at `metrics.avg_wait_s` to judge: lower is better. Try each strategy in turn — the deltas are small but visible.",
    "3★ requires sub-18s average wait. ETD typically wins on heavy traffic; LOOK is competitive at lower spawn rates.",
  ],
  failHint: ({ delivered }) =>
    `Delivered ${delivered} of 25. Try a different built-in via \`sim.setStrategy("look" | "nearest" | "etd")\` — heavy traffic favours stronger heuristics.`,
  referenceSolution: `// Canonical stage-4 solution.
// LOOK sweeps to the last request and reverses — strong on
// steady moderate traffic and competitive with the nearest-car
// pick under this stage's spawn rate.

sim.setStrategy("look");
`,
};
