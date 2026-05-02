import { arrivals } from "./seed-helpers";
import type { Stage } from "./types";

/**
 * Stage 11 — Fire Alarm.
 *
 * Mid-run a fire-alarm scenario fires. The controller has to call
 * emergencyStop on every car within a tight tick budget. Standard
 * dispatch otherwise — but a controller that ignores the alarm
 * fails the stage outright (riders abandon as the sim fills with
 * stuck cars).
 *
 * In the real building, fire-service mode is mandatory. In the
 * curriculum it teaches you that emergencyStop exists and how to
 * react quickly to a sim event.
 */
const STAGE_11_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 11",
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

const STAGE_11_STARTER = `// Stage 11 — Fire Alarm
//
// emergencyStop(carRef) brings a car to a halt regardless of
// dispatch state. Combined with setServiceMode(carRef,
// "out-of-service"), it takes the car off the dispatcher's
// hands so it doesn't try to resume a queued destination.
//
// For the simplest reliable response, just route normally and
// trust the sim's emergency-stop primitive when needed.

sim.setStrategy("nearest");
`;

export const STAGE_11_FIRE_ALARM: Stage = {
  id: "fire-alarm",
  title: "Fire Alarm",
  brief: "Halt every car cleanly when an alarm fires. Standard dispatch otherwise.",
  section: "events-manual",
  configRon: STAGE_11_RON,
  unlockedApi: ["setStrategy", "drainEvents", "emergencyStop", "setServiceMode"],
  // Pre-alarm steady traffic + post-alarm tail so the controller
  // gets graded on both halves of the scenario. 22 riders for the
  // 12-pass threshold gives margin for an abandon or two during the
  // emergency window. (The actual fire-alarm event is dispatched
  // by stage-runner machinery in a follow-up; for now this just
  // delivers riders against the standard dispatch path.)
  seedRiders: [
    ...arrivals(12, {
      origin: 0,
      destinations: [2, 3, 4, 5, 1],
      intervalTicks: 40,
    }),
    ...arrivals(10, {
      origin: 0,
      destinations: [3, 5, 2, 4],
      startTick: 600,
      intervalTicks: 50,
    }),
  ],
  baseline: "scan",
  passFn: ({ delivered, abandoned }) => delivered >= 12 && abandoned <= 2,
  starFns: [
    ({ delivered, abandoned }) => delivered >= 15 && abandoned <= 1,
    ({ delivered, abandoned, metrics }) =>
      delivered >= 18 && abandoned === 0 && metrics.avg_wait_s < 28,
  ],
  starterCode: STAGE_11_STARTER,
  hints: [
    "`emergencyStop(carRef)` halts a car immediately — no door-cycle phase, no queue drain.",
    'Pair it with `setServiceMode(carRef, "out-of-service")` so dispatch doesn\'t immediately re-queue work for the stopped car.',
    "3★ requires sub-28s average wait and zero abandons — meaning you reset the cars cleanly to service after the alarm clears.",
  ],
  failHint: ({ delivered, abandoned }) => {
    const issues: string[] = [];
    if (delivered < 12) issues.push(`delivered ${delivered} of 12`);
    if (abandoned > 2) issues.push(`${abandoned} abandoned (max 2)`);
    return `Run short — ${issues.join(", ")}. Watch \`drainEvents()\` for the fire-alarm event, then call \`emergencyStop\` + \`setServiceMode("out-of-service")\` on every car.`;
  },
};
