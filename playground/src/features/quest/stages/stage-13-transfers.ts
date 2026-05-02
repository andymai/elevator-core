import { arrivals } from "./seed-helpers";
import type { Stage } from "./types";

/**
 * Stage 13 — Transfer Points.
 *
 * The first multi-line stage. The building has two lines (low-rise
 * and high-rise) that share a transfer floor. Riders going from
 * lobby to a high floor must change cars at the transfer point.
 * Introduces transferPoints + reachableStopsFrom.
 *
 * Routes are auto-built by the engine; the curriculum's job here
 * is to make the player aware of the topology query surface so
 * later stages (sky-lobby dispatch, dynamic re-routing) feel
 * natural.
 */
const STAGE_13_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 13",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "L2", position: 4.0),
            StopConfig(id: StopId(2), name: "L3", position: 8.0),
            StopConfig(id: StopId(3), name: "Transfer", position: 12.0),
            StopConfig(id: StopId(4), name: "H1", position: 16.0),
            StopConfig(id: StopId(5), name: "H2", position: 20.0),
            StopConfig(id: StopId(6), name: "H3", position: 24.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Low",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 1, name: "High",
            max_speed: 3.0, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(3),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 50,
        weight_range: (50.0, 100.0),
    ),
)`;

const STAGE_13_STARTER = `// Stage 13 — Transfer Points
//
// Two cars on two lines that meet at the Transfer floor. Riders
// going lobby->H2 ride the Low car to Transfer, change to the
// High car, then ride to H2. The engine handles the change
// automatically when riders carry routes — your job here is just
// to keep dispatch healthy on both lines.
//
// transferPoints() and reachableStopsFrom(stop) tell you the
// topology, but you don't need them for the pass condition.

sim.setStrategy("etd");
`;

export const STAGE_13_TRANSFERS: Stage = {
  id: "transfers",
  title: "Transfer Points",
  brief: "Two lines that share a transfer floor. Keep both halves moving.",
  section: "topology",
  configRon: STAGE_13_RON,
  unlockedApi: ["setStrategy", "transferPoints", "reachableStopsFrom", "shortestRoute"],
  // Riders split across the low/high halves: lobby-to-low (no
  // transfer), lobby-to-high (transfer at id 3), and a few high-to-
  // low returns. The engine routes through the transfer floor
  // automatically; this stage's job is just to demonstrate that
  // multi-line topology still grades cleanly. 22 riders, 18-pass.
  seedRiders: [
    ...arrivals(8, {
      origin: 0,
      destinations: [1, 2, 1, 2],
      intervalTicks: 40,
    }),
    ...arrivals(10, {
      origin: 0,
      destinations: [4, 5, 6, 4, 5],
      startTick: 60,
      intervalTicks: 50,
    }),
    ...arrivals(4, {
      origin: 5,
      destinations: [0, 1],
      startTick: 480,
      intervalTicks: 60,
    }),
  ],
  baseline: "scan",
  passFn: ({ delivered }) => delivered >= 18,
  starFns: [
    ({ delivered, metrics }) => delivered >= 18 && metrics.avg_wait_s < 30,
    ({ delivered, metrics }) => delivered >= 18 && metrics.avg_wait_s < 22,
  ],
  starterCode: STAGE_13_STARTER,
  hints: [
    "`sim.transferPoints()` returns the stops that bridge two lines. Useful when you're building a custom rank() that wants to penalise crossings.",
    "`sim.reachableStopsFrom(stop)` returns every stop reachable without a transfer. Multi-line ranks use it to prefer same-line trips.",
    "3★ requires sub-22s average wait. ETD or RSR plus a custom rank() that biases toward whichever car can finish the trip without a transfer wins it.",
  ],
  failHint: ({ delivered }) =>
    `Delivered ${delivered} of 18. Two lines share the Transfer floor — keep ETD running on both halves so transfers don't pile up at the bridge.`,
};
