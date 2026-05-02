import type { Stage } from "./types";

/**
 * Stage 15 — Sky Lobby.
 *
 * Two dispatch groups (low-rise and high-rise) sharing a sky-lobby
 * floor. Reads like a small skyscraper: lobby + low floors are
 * one group, sky-lobby + high floors are another, and a transfer
 * at the sky lobby connects them. Introduces assignLineToGroup
 * and reassignElevatorToLine.
 *
 * The starter code keeps everything on the default group; star
 * tiers reward splitting the cars into low/high duty bands so
 * the high-rise car never wastes time on lobby calls.
 */
const STAGE_15_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 15",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "L2", position: 4.0),
            StopConfig(id: StopId(2), name: "L3", position: 8.0),
            StopConfig(id: StopId(3), name: "L4", position: 12.0),
            StopConfig(id: StopId(4), name: "Sky", position: 16.0),
            StopConfig(id: StopId(5), name: "H1", position: 20.0),
            StopConfig(id: StopId(6), name: "H2", position: 24.0),
            StopConfig(id: StopId(7), name: "H3", position: 28.0),
            StopConfig(id: StopId(8), name: "H4", position: 32.0),
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
            starting_stop: StopId(4),
            door_open_ticks: 55, door_transition_ticks: 14,
        ),
        ElevatorConfig(
            id: 2, name: "Floater",
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

const STAGE_15_STARTER = `// Stage 15 — Sky Lobby
//
// Three cars over nine stops. The Sky stop bridges the low and
// high halves of the building. A natural split: Low car serves
// the bottom half, High car serves the top half, Floater fills in.
//
// assignLineToGroup(lineRef, groupId) puts a line under a group's
// dispatcher (groupId is a plain number, not a bigint ref);
// reassignElevatorToLine(carRef, lineRef) moves a car.
//
// The default config has everything on one group. ETD does fine.
// Beating 22s average wait needs an explicit group split.

sim.setStrategy("etd");
`;

export const STAGE_15_SKY_LOBBY: Stage = {
  id: "sky-lobby",
  title: "Sky Lobby",
  brief: "Three cars, two zones, one sky lobby. Split duty for sub-22s.",
  configRon: STAGE_15_RON,
  unlockedApi: ["setStrategy", "assignLineToGroup", "reassignElevatorToLine"],
  baseline: "etd",
  passFn: ({ delivered }) => delivered >= 30,
  starFns: [
    ({ delivered, metrics }) => delivered >= 30 && metrics.avg_wait_s < 28,
    ({ delivered, metrics }) => delivered >= 30 && metrics.avg_wait_s < 22,
  ],
  starterCode: STAGE_15_STARTER,
  hints: [
    "`sim.assignLineToGroup(lineRef, groupId)` puts a line under a group's dispatcher; `groupId` is a plain integer (not a ref) and the call returns the active dispatcher's id. Two groups means two independent dispatch decisions.",
    "`sim.reassignElevatorToLine(carRef, lineRef)` moves a car between lines without rebuilding the topology. Useful when a duty band is over- or under-loaded.",
    "3★ requires sub-22s average wait. The Floater is the lever: park it on whichever side has the bigger queue and let the dedicated cars handle their bands.",
  ],
  failHint: ({ delivered }) =>
    `Delivered ${delivered} of 30. Three cars share two zones — \`sim.assignLineToGroup(lineRef, groupId)\` lets each zone dispatch independently of the other.`,
};
