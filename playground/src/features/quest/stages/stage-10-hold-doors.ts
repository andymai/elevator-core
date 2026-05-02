import { arrivals } from "./seed-helpers";
import type { Stage } from "./types";

/**
 * Stage 10 — Patient Boarding.
 *
 * holdDoor(carRef, ticks) extends the door-open window by that
 * many ticks. cancelDoorHold(carRef) releases the hold early.
 * Useful when a slow rider is boarding or when you want the car
 * to wait at a stop for a brief moment longer.
 *
 * The scenario stages a single mobility-impaired rider whose
 * boarding takes longer than the default door-open window. Without
 * holdDoor the car closes too soon and the rider abandons.
 */
const STAGE_10_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 10",
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
            door_open_ticks: 30, door_transition_ticks: 14,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 80,
        weight_range: (50.0, 100.0),
    ),
)`;

const STAGE_10_STARTER = `// Stage 10 — Patient Boarding
//
// holdDoor(carRef, ticks) keeps the doors open for that many extra
// ticks. cancelDoorHold(carRef) releases the hold early so doors
// close on the next loading-complete tick. The door cycle in this stage is
// deliberately tight (30 ticks instead of 55) — without holdDoor,
// passengers can't always board in time.
//
// React to the rider-boarded event by holding briefly, then cancel
// once boarding completes.

sim.setStrategy("nearest");

// (To use holdDoor in production, you'd watch sim.drainEvents() for
// 'rider-boarding' and hold once boarding starts. The starter here
// just falls back to nearest dispatch — pass on its own, but no
// stars without active door management.)
`;

export const STAGE_10_HOLD_DOORS: Stage = {
  id: "hold-doors",
  title: "Patient Boarding",
  brief: "Tight door cycle. Hold the doors so slow riders make it in.",
  section: "events-manual",
  configRon: STAGE_10_RON,
  unlockedApi: ["setStrategy", "drainEvents", "holdDoor", "cancelDoorHold"],
  // Twelve riders, generous patience so abandons only happen if the
  // player ignores the door-hold mechanic and the tight 30-tick
  // window times them out. The mix of floors gives the controller
  // multiple chances to see boarding events on each batch.
  seedRiders: [
    ...arrivals(12, {
      origin: 0,
      destinations: [2, 3, 4, 1, 3, 2],
      intervalTicks: 60,
      patienceTicks: 1200,
    }),
  ],
  baseline: "none",
  passFn: ({ delivered, abandoned }) => delivered >= 6 && abandoned <= 1,
  starFns: [
    ({ delivered, abandoned }) => delivered >= 8 && abandoned === 0,
    ({ delivered, abandoned, metrics }) =>
      delivered >= 10 && abandoned === 0 && metrics.avg_wait_s < 30,
  ],
  starterCode: STAGE_10_STARTER,
  hints: [
    "`holdDoor(carRef, ticks)` extends the open phase by that many ticks; a fresh call resets the timer, and `cancelDoorHold(carRef)` ends it early. Watch for `door-opened` events and hold briefly there.",
    "Holding too long stalls dispatch — try a 30–60 tick hold, not the whole boarding cycle.",
    "3★ requires no abandons + sub-30s average wait. Tighter timing on the hold/cancel pair pays off.",
  ],
  failHint: ({ delivered, abandoned }) => {
    const issues: string[] = [];
    if (delivered < 6) issues.push(`delivered ${delivered} of 6`);
    if (abandoned > 1) issues.push(`${abandoned} abandoned (max 1)`);
    return `Run short — ${issues.join(", ")}. The 30-tick door cycle is tight — call \`holdDoor(carRef, 60)\` on each \`door-opened\` event so slow riders board.`;
  },
};
