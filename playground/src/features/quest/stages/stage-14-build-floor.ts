import type { Stage } from "./types";

/**
 * Stage 14 — Build a Floor.
 *
 * Mid-run topology mutation. The building starts at five floors;
 * a few minutes in, "construction completes" and the controller
 * needs to add a sixth stop to the line so dispatch starts serving
 * the new floor. Introduces addStop + addStopToLine.
 *
 * This stage is intentionally low-traffic so the player can focus
 * on the topology change rather than fighting throughput. Pass is
 * lenient; star tiers reward acting on the construction signal
 * promptly (riders waiting on the unfinished floor would abandon
 * if it isn't activated).
 */
const STAGE_14_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 14",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "F2", position: 4.0),
            StopConfig(id: StopId(2), name: "F3", position: 8.0),
            StopConfig(id: StopId(3), name: "F4", position: 12.0),
            StopConfig(id: StopId(4), name: "F5", position: 16.0),
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
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 80,
        weight_range: (50.0, 100.0),
    ),
)`;

const STAGE_14_STARTER = `// Stage 14 — Build a Floor
//
// The building starts five stops tall. Construction "finishes" a
// few minutes in and the player adds the sixth floor:
//
//   const lineRef = /* the line you want to add the stop to */;
//   const newStop = sim.addStop(lineRef, "F6", 20.0);
//   sim.addStopToLine(lineRef, newStop);
//
// Standard dispatch otherwise.

sim.setStrategy("etd");
`;

export const STAGE_14_BUILD_FLOOR: Stage = {
  id: "build-floor",
  title: "Build a Floor",
  brief: "Add a stop mid-run. The new floor must join the line dispatch sees.",
  configRon: STAGE_14_RON,
  unlockedApi: ["setStrategy", "addStop", "addStopToLine"],
  baseline: "none",
  passFn: ({ delivered }) => delivered >= 8,
  starFns: [
    ({ delivered, abandoned }) => delivered >= 10 && abandoned === 0,
    ({ delivered, abandoned, metrics }) =>
      delivered >= 12 && abandoned === 0 && metrics.avg_wait_s < 25,
  ],
  starterCode: STAGE_14_STARTER,
  hints: [
    "`sim.addStop(lineRef, name, position)` creates a stop on the supplied line and returns its ref. Once it's added, the line knows about it but dispatch may need a reassign or rebuild before serving it actively.",
    "`sim.addStopToLine(lineRef, stopRef)` is what binds an *existing* stop to a line — useful when you've created a stop with `addStop` on a different line and want it shared.",
    "3★ requires sub-25s average wait with no abandons — react quickly to the construction-complete event so waiting riders don't time out.",
  ],
};
