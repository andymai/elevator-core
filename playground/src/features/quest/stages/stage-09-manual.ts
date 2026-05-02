import type { Stage } from "./types";

/**
 * Stage 9 — Take the Wheel.
 *
 * Manual mode. setServiceMode(carRef, "manual") takes the car off
 * the dispatcher's hands; setTargetVelocity(carRef, v) commands
 * direction and speed. The controller drives a single car directly
 * — no built-in dispatch, no strategy.
 *
 * The pass condition is intentionally narrow (deliver 8 riders to
 * specific floors); 3★ requires beating the dispatcher's own
 * autopilot on the same scenario.
 */
const STAGE_09_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 9",
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
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 70,
        weight_range: (50.0, 100.0),
    ),
)`;

const STAGE_09_STARTER = `// Stage 9 — Take the Wheel
//
// Manual mode hands the car over to your code. After you switch:
//   sim.setServiceMode(carRef, "manual");
//   sim.setTargetVelocity(carRef, +2.5);  // m/s, +up -down
//
// You're responsible for slowing down, stopping at stops, and
// opening doors via the existing primitives. This stage gives you
// the simplest setup: one car, one direction at a time.
//
// TIP: Manual mode is strictly more powerful than dispatch — but
// also strictly more error-prone. Use it where dispatch can't do
// what you need.

// Just queue destinations for now — the manual primitives are
// available, but most controllers won't need them. The starter
// here passes the stage; star tiers reward using manual mode.
sim.setStrategy("etd");
`;

export const STAGE_09_MANUAL: Stage = {
  id: "manual",
  title: "Take the Wheel",
  brief: "Switch a car to manual control. Drive it yourself.",
  section: "events-manual",
  configRon: STAGE_09_RON,
  unlockedApi: ["setStrategy", "setServiceMode", "setTargetVelocity"],
  baseline: "self-autopilot",
  passFn: ({ delivered }) => delivered >= 8,
  starFns: [
    ({ delivered, metrics }) => delivered >= 8 && metrics.avg_wait_s < 28,
    ({ delivered, metrics }) => delivered >= 8 && metrics.avg_wait_s < 22,
  ],
  starterCode: STAGE_09_STARTER,
  hints: [
    "Manual mode is a tradeoff: you bypass dispatch heuristics but pay full cost for stops, doors, and direction reversals.",
    "Setting target velocity to 0 doesn't park the car — it coasts until friction (none in this sim) or a brake stop. Use `setTargetVelocity(carRef, 0)` only when you've already arrived.",
    '3★ rewards a controller that can match the autopilot\'s average wait. Start with `setStrategy("etd")` (the starter code) and see how close manual gets you.',
  ],
  failHint: ({ delivered }) =>
    `Delivered ${delivered} of 8. If the car never moves, check that \`setServiceMode(carRef, "manual")\` ran before \`setTargetVelocity\` — direct drive only works in manual mode.`,
};
