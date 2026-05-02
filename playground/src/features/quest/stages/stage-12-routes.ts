import { arrivals } from "./seed-helpers";
import type { Stage } from "./types";

/**
 * Stage 12 — Routes.
 *
 * Riders carry an explicit route — origin → ... → destination. The
 * controller can read the shortest route via shortestRoute and
 * reroute riders if their original route is no longer valid (e.g.
 * a stop has been removed mid-run). Lighter introduction to the
 * routes API; multi-line transfer-point handling lands in a later
 * stage.
 */
const STAGE_12_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 12",
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
        mean_interval_ticks: 35,
        weight_range: (50.0, 100.0),
    ),
)`;

const STAGE_12_STARTER = `// Stage 12 — Routes
//
// Riders have explicit routes between origin and destination. The
// controller can inspect them with shortestRoute(originStop,
// destinationStop) and send a rider to a new destination with
// reroute(riderRef, newDestStop).
//
// Most stages don't need this directly — riders are auto-routed at
// spawn. But understanding routes is the foundation for the
// multi-line topology stages later.

sim.setStrategy("etd");
`;

export const STAGE_12_ROUTES: Stage = {
  id: "routes",
  title: "Routes & Reroutes",
  brief: "Explicit per-rider routes. Read them; understand them.",
  section: "topology",
  configRon: STAGE_12_RON,
  unlockedApi: ["setStrategy", "shortestRoute", "reroute"],
  // Steady mixed traffic across eight stops, two cars. 30 riders
  // for the 25-pass — the routes API is informational, so the
  // shape just needs to keep dispatch busy.
  seedRiders: [
    ...arrivals(20, {
      origin: 0,
      destinations: [3, 5, 7, 4, 6, 2],
      intervalTicks: 25,
    }),
    ...arrivals(10, {
      origin: 7,
      destinations: [0, 1, 2, 3],
      startTick: 360,
      intervalTicks: 40,
    }),
  ],
  baseline: "scan",
  passFn: ({ delivered }) => delivered >= 25,
  starFns: [
    ({ delivered, metrics }) => delivered >= 25 && metrics.avg_wait_s < 22,
    ({ delivered, metrics }) => delivered >= 25 && metrics.avg_wait_s < 16,
  ],
  starterCode: STAGE_12_STARTER,
  hints: [
    "`sim.shortestRoute(originStop, destinationStop)` returns the canonical route as an array of stop refs. The first entry is the origin, the last is the destination.",
    "`sim.reroute(riderRef, newDestStop)` redirects a rider to a new destination from wherever they are — useful when a stop on their original route has been disabled or removed mid-run.",
    "3★ requires sub-16s average wait. ETD or RSR usually wins this; the route API is here so you understand what's available, not because you need it for the optimization.",
  ],
  failHint: ({ delivered }) =>
    `Delivered ${delivered} of 25. Default strategies handle this stage — the routes API is here to inspect, not to drive dispatch. \`sim.setStrategy("etd")\` is enough for the pass.`,
};
