import type { Stage } from "./types";

/**
 * Stage 1 — First Floor.
 *
 * The simplest possible introduction: one car, three stops, five
 * riders waiting at the lobby who all want to go up. The player calls
 * `sim.addDestination(carId, stopId)` once per rider's destination
 * and watches dispatch carry them.
 *
 * Unlocks: `addDestination`. Everything else throws "method locked".
 */
const STAGE_01_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 1",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (50.0, 100.0),
    ),
)`;

export const STAGE_01_FIRST_FLOOR: Stage = {
  id: "first-floor",
  title: "First Floor",
  brief: "Five riders at the lobby. Pick destinations and dispatch the car.",
  configRon: STAGE_01_RON,
  unlockedApi: ["addDestination"],
  baseline: "none",
  // Pass: at least 5 riders delivered, no abandons.
  passFn: ({ delivered, abandoned }) => delivered >= 5 && abandoned === 0,
  starFns: [
    // 2★ — finish before tick 600.
    ({ delivered, abandoned, endTick }) => delivered >= 5 && abandoned === 0 && endTick < 600,
    // 3★ — finish before tick 400 (tighter dispatch).
    ({ delivered, abandoned, endTick }) => delivered >= 5 && abandoned === 0 && endTick < 400,
  ],
  starterCode: `// Stage 1 — First Floor
//
// Five riders at the lobby want to go up to Floor 2 or Floor 3.
// Use \`sim.addDestination(carId, stopId)\` to send the car after them.
//
// Stop ids: 0 (Lobby), 1 (Floor 2), 2 (Floor 3).

// Send the car to Floor 3 first:
sim.addDestination(0n, 2n);
`,
  hints: [
    "`sim.addDestination(carId, stopId)` queues a destination. Both ids are bigints — pass them with the `n` suffix.",
    "There's only one car (id 0n). Queue it to visit each floor riders are waiting for.",
    "Pass: deliver all five riders. 3★: do it before tick 400 — back-to-back destinations beat one-at-a-time.",
  ],
};
