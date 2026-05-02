import type { Stage } from "./types";

/**
 * Stage 5 — Choose Wisely.
 *
 * Same surface as Stage 4 but with asymmetric traffic — heavily
 * lobby-biased origins and short-distance destinations. Strategy
 * choice matters more here. Baseline is `nearest`, the controller
 * has to beat it.
 */
const STAGE_05_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 5",
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
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 25,
        weight_range: (50.0, 100.0),
    ),
)`;

export const STAGE_05_CHOOSE: Stage = {
  id: "choose",
  title: "Choose Wisely",
  brief: "Asymmetric morning rush. Pick the strategy that handles up-peak best.",
  configRon: STAGE_05_RON,
  unlockedApi: ["setStrategy"],
  baseline: "nearest",
  passFn: ({ delivered }) => delivered >= 30,
  starFns: [
    // 2★ — beat nearest by a meaningful margin.
    ({ delivered, metrics }) => delivered >= 30 && metrics.avg_wait_s < 22,
    // 3★ — ETD or RSR territory.
    ({ delivered, metrics }) => delivered >= 30 && metrics.avg_wait_s < 16,
  ],
  starterCode: `// Stage 5 — Choose Wisely
//
// Up-peak traffic: most riders board at the lobby, all heading up.
// Some strategies handle this better than others. Try a few.

sim.setStrategy("etd");
`,
  hints: [
    "Up-peak is exactly the case ETD was designed for: it minimises estimated time-to-destination across the assignment.",
    "RSR (Relative System Response) factors direction and load-share into the cost; try it under heavier traffic.",
    "3★ requires under 16s average wait. The choice between ETD and RSR is the closest call here.",
  ],
  failHint: ({ delivered }) =>
    `Delivered ${delivered} of 30. Up-peak rewards ETD or RSR — \`sim.setStrategy("etd")\` is a strong starting point.`,
};
