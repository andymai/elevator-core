import type { Stage } from "./types";

/**
 * Stage 8 — Event-Driven.
 *
 * Past stages polled state. This one reacts: sim.drainEvents() yields
 * the typed Event union (rider-spawned, hall-button-pressed,
 * elevator-arrived, …). The controller subscribes to events and
 * dispatches in response — no per-tick polling.
 *
 * Practically, since the controller only runs once at load, the
 * "subscription" pattern here is: register a custom rank() via
 * setStrategyJs that reads ctx and any global state the controller
 * established at load time. The hint nudges toward this idiom.
 */
const STAGE_08_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 8",
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
        mean_interval_ticks: 50,
        weight_range: (50.0, 100.0),
    ),
)`;

const STAGE_08_STARTER = `// Stage 8 — Event-Driven
//
// sim.drainEvents() returns events that fired since the last drain.
// Useful for reacting to specific moments:
//   - rider-spawned (a new wait begins)
//   - hall-button-pressed (a call lands)
//   - elevator-arrived (a stop completes)
//
// Build a rank() that incorporates pending hall-call ages.

let pendingSince = new Map();

sim.setStrategyJs("event-aware", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});
`;

export const STAGE_08_EVENTS: Stage = {
  id: "events",
  title: "Event-Driven",
  brief: "React to events. Use call age to break ties when distance is equal.",
  configRon: STAGE_08_RON,
  unlockedApi: ["setStrategyJs", "drainEvents"],
  baseline: "scan",
  passFn: ({ delivered }) => delivered >= 25,
  starFns: [
    ({ delivered, metrics }) => delivered >= 25 && metrics.avg_wait_s < 24,
    ({ delivered, metrics }) => delivered >= 25 && metrics.avg_wait_s < 18,
  ],
  starterCode: STAGE_08_STARTER,
  hints: [
    "`sim.drainEvents()` returns a typed array of the kinds the playground exposes — `rider-spawned`, `hall-button-pressed`, `elevator-arrived`, etc.",
    "The rank function runs many times per tick. Storing per-stop age in an outer Map and reading it inside `rank()` lets you penalise stale calls.",
    "3★ requires sub-18s average. The trick: at equal distances, prefer the stop that's been waiting longer.",
  ],
  failHint: ({ delivered }) =>
    `Delivered ${delivered} of 25. Capture a closure-local Map at load time; \`rank()\` reads it on each call to penalise older pending hall calls.`,
};
