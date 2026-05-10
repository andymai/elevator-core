import type { Phase, ScenarioMeta } from "../../types";

// ─── Airport pedway — horizontal people-mover ──────────────────────
//
// Four stations along a ~1.8 km concourse: Main Terminal at the head
// and three concourses spaced 600 m apart. Two parallel tracks each
// serve every stop; three trains per line spaced for roughly equal
// headway. Real airport people-movers (DFW Skylink, ATL Plane Train,
// IAD AeroTrain) inspire the layout — the dispatch story isn't
// "which car responds first" but "is the train spacing consistent
// enough that riders don't pile up?".
//
// Lines opt into Orientation::Horizontal so the renderer lays them
// out as stacked horizontal lanes; the per-lane chevron expresses a
// *visual* outbound/inbound bias rather than a hard direction lock,
// since elevator-core's 1D axis doesn't model directional tracks.

const STOPS = [
  { name: "Main Terminal", positionM: 0 },
  { name: "Concourse B", positionM: 600 },
  { name: "Concourse C", positionM: 1200 },
  { name: "Concourse D", positionM: 1800 },
] as const;

function weights(perIndex: (i: number) => number): number[] {
  return Array.from({ length: STOPS.length }, (_, i) => perIndex(i));
}

const phases: Phase[] = [
  {
    name: "Steady operations",
    durationSec: 90,
    ridersPerMin: 16,
    originWeights: weights((i) => (i === 0 ? 2 : 1)),
    destWeights: weights((i) => (i === 0 ? 1.6 : 1)),
  },
  {
    name: "Arrival at Concourse B",
    durationSec: 60,
    ridersPerMin: 38,
    originWeights: weights((i) => (i === 1 ? 8 : 1)),
    destWeights: weights((i) => {
      if (i === 0) return 6;
      if (i === 1) return 0;
      return 1;
    }),
  },
  {
    name: "Quiet between flights",
    durationSec: 60,
    ridersPerMin: 10,
    originWeights: weights(() => 1),
    destWeights: weights(() => 1),
  },
  {
    name: "Arrival at Concourse C",
    durationSec: 60,
    ridersPerMin: 36,
    originWeights: weights((i) => (i === 2 ? 8 : 1)),
    destWeights: weights((i) => {
      if (i === 0) return 5;
      if (i === 2) return 0;
      return 1.5;
    }),
  },
  {
    name: "Arrival at Concourse D",
    durationSec: 60,
    ridersPerMin: 34,
    originWeights: weights((i) => (i === 3 ? 8 : 1)),
    destWeights: weights((i) => {
      if (i === 0) return 6;
      if (i === 3) return 0;
      return 1.2;
    }),
  },
];

export const airportPedway: ScenarioMeta = {
  id: "airport-pedway",
  label: "Airport pedway",
  description:
    "Two parallel people-mover tracks linking the main terminal to three concourses 600 m apart. Three trains per track run on roughly equal headway and stop at every station — the dispatch story is keeping the trains evenly spaced as flight arrivals dump passengers onto specific platforms.",
  defaultStrategy: "scan",
  defaultReposition: "spread",
  disableCompare: true,
  phases,
  seedSpawns: 0,
  abandonAfterSec: 600,
  featureHint:
    "Two parallel tracks, three trains each, every train stops at every station. Watch how the headway evolves when a flight dumps riders onto one platform at once.",
  buildingName: "Airport Concourse",
  stops: STOPS.map((s) => ({ name: s.name, positionM: s.positionM })),
  // Locked: the multi-line RON can't be regenerated from a single-car
  // template the way flat scenarios can.
  defaultCars: 6,
  elevatorDefaults: {
    maxSpeed: 15.0,
    acceleration: 1.5,
    deceleration: 1.5,
    weightCapacity: 2400.0,
    doorOpenTicks: 600,
    doorTransitionTicks: 60,
  },
  tweakRanges: {
    cars: { min: 6, max: 6, step: 1 },
    maxSpeed: { min: 8, max: 25, step: 1 },
    weightCapacity: { min: 1500, max: 3500, step: 100 },
    doorCycleSec: { min: 8, max: 18, step: 1 },
  },
  passengerMeanIntervalTicks: 90,
  passengerWeightRange: [55.0, 95.0],
  ron: `SimConfig(
    schema_version: 1,
    building: BuildingConfig(
        name: "Airport Concourse",
        stops: [
            StopConfig(id: StopId(0), name: "Main Terminal", position: 0.0),
            StopConfig(id: StopId(1), name: "Concourse B",   position: 600.0),
            StopConfig(id: StopId(2), name: "Concourse C",   position: 1200.0),
            StopConfig(id: StopId(3), name: "Concourse D",   position: 1800.0),
        ],
        lines: Some([
            LineConfig(
                id: 0, name: "Outbound",
                serves: [StopId(0), StopId(1), StopId(2), StopId(3)],
                orientation: Horizontal,
                elevators: [
                    ElevatorConfig(
                        id: 0, name: "PT-A1",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 1, name: "PT-A2",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(1),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 2, name: "PT-A3",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(2),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                ],
            ),
            LineConfig(
                id: 1, name: "Inbound",
                serves: [StopId(3), StopId(2), StopId(1), StopId(0)],
                orientation: Horizontal,
                elevators: [
                    ElevatorConfig(
                        id: 3, name: "PT-B1",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(3),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 4, name: "PT-B2",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(2),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                    ElevatorConfig(
                        id: 5, name: "PT-B3",
                        max_speed: 15.0, acceleration: 1.5, deceleration: 1.5,
                        weight_capacity: 2400.0,
                        starting_stop: StopId(1),
                        door_open_ticks: 600, door_transition_ticks: 60,
                    ),
                ],
            ),
        ]),
        groups: Some([
            GroupConfig(id: 0, name: "Outbound", lines: [0], dispatch: Scan, reposition: Some(SpreadEvenly)),
            GroupConfig(id: 1, name: "Inbound",  lines: [1], dispatch: Scan, reposition: Some(SpreadEvenly)),
        ]),
    ),
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (55.0, 95.0),
    ),
)`,
};
