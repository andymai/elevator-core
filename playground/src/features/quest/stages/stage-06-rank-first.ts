import type { Stage } from "./types";

/**
 * Stage 6 — Your First rank().
 *
 * The trait unlock. Introduces `setStrategyJs(name, rankFn)`: the
 * controller registers a JS function that elevator-core calls for
 * every (car, stop) candidate during dispatch. Returning a number
 * scores the pair (lower is better); returning `null` excludes it.
 *
 * Implement nearest-car-style ranking. The starter code is the
 * canonical "distance from car to stop" implementation; the player
 * can match (or beat) the built-in `nearest` baseline.
 */
const STAGE_06_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 6",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
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
        mean_interval_ticks: 40,
        weight_range: (50.0, 100.0),
    ),
)`;

const STAGE_06_STARTER = `// Stage 6 — Your First rank()
//
// sim.setStrategyJs(name, rank) registers a JS function as the
// dispatch strategy. rank({ car, carPosition, stop, stopPosition })
// returns a number (lower = better) or null to exclude the pair.
//
// Implement nearest-car ranking: distance between car and stop.

sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`;

export const STAGE_06_RANK_FIRST: Stage = {
  id: "rank-first",
  title: "Your First rank()",
  brief: "Implement dispatch as a function. Score each (car, stop) pair.",
  configRon: STAGE_06_RON,
  unlockedApi: ["setStrategyJs"],
  baseline: "nearest",
  passFn: ({ delivered }) => delivered >= 20,
  starFns: [
    // 2★ — within 10% of nearest's average wait.
    ({ delivered, metrics }) => delivered >= 20 && metrics.avg_wait_s < 28,
    // 3★ — beat nearest. Tightening the rank function — e.g.
    // breaking ties by direction — wins this.
    ({ delivered, metrics }) => delivered >= 20 && metrics.avg_wait_s < 22,
  ],
  starterCode: STAGE_06_STARTER,
  hints: [
    "The context object has `car` and `stop` (entity refs as bigints), and `carPosition` and `stopPosition` (numbers, in metres).",
    "Returning `null` excludes the pair from assignment — useful for capacity limits or wrong-direction stops once you unlock those.",
    "3★ requires beating the nearest baseline. Try penalising backward moves: add a constant if `car` would have to reverse direction to reach `stop`.",
  ],
};
