import type { Stage } from "./types";

/**
 * Stage 7 — Beat ETD.
 *
 * Three cars, ten stops, mixed traffic. The baseline is the built-in
 * ETD strategy — the strongest classical dispatcher elevator-core
 * ships with. The player has to write a `rank()` that meets it on
 * its own ground.
 *
 * Pass: deliver under heavy load. 2★/3★: beat ETD by 5%/15%.
 */
const STAGE_07_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 7",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
            StopConfig(id: StopId(5), name: "F6", position: 20.0),
            StopConfig(id: StopId(6), name: "F7", position: 24.0),
            StopConfig(id: StopId(7), name: "F8", position: 28.0),
            StopConfig(id: StopId(8), name: "F9", position: 32.0),
            StopConfig(id: StopId(9), name: "F10", position: 36.0),
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
        ElevatorConfig(
            id: 2, name: "Car 3",
            max_speed: 2.5, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 20,
        weight_range: (50.0, 100.0),
    ),
)`;

export const STAGE_07_BEAT_ETD: Stage = {
  id: "beat-etd",
  title: "Beat ETD",
  brief: "Three cars, mixed traffic. The strongest built-in is your baseline.",
  configRon: STAGE_07_RON,
  unlockedApi: ["setStrategyJs"],
  baseline: "etd",
  passFn: ({ delivered }) => delivered >= 40,
  starFns: [
    // 2★ — match ETD within 5%.
    ({ delivered, metrics }) => delivered >= 40 && metrics.avg_wait_s < 24,
    // 3★ — beat ETD by ~15%. Requires factoring in car load and
    // direction, not just distance.
    ({ delivered, metrics }) => delivered >= 40 && metrics.avg_wait_s < 20,
  ],
  starterCode: `// Stage 7 — Beat ETD
//
// ETD minimises estimated time-to-destination. To match or beat
// it, your rank() needs to factor in:
//   - distance between car and stop (Stage 6)
//   - car direction (penalise reversals)
//   - car load (avoid sending a full car to a hall call)
//
// Start with distance, layer the rest in.

sim.setStrategyJs("rival-etd", (ctx) => {
  const dist = Math.abs(ctx.carPosition - ctx.stopPosition);
  return dist;
});
`,
  hints: [
    "Direction penalty: if the car is heading up but the stop is below it, add a constant cost — preferring to keep the sweep going.",
    "Load awareness needs more context than this surface exposes today. Distance + direction is enough to land 2★; future curriculum stages add load and pending-call context.",
    "ETD is not invincible — its weakness is uniform-cost ties on lightly-loaded cars. Find that and you'll edge it.",
  ],
};
