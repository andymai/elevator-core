import type { Stage } from "./types";

/**
 * Stage 3 — Car Buttons.
 *
 * Riders board and press destination floors inside the car. The
 * controller needs to read those car-call buttons and queue the
 * destinations. Introduces `carCalls()` alongside the prior unlocks
 * and bumps traffic from the directed bursts of Stage 2 to
 * scattered, ongoing arrivals.
 */
const STAGE_03_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 3",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby", position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
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
        mean_interval_ticks: 45,
        weight_range: (50.0, 100.0),
    ),
)`;

export const STAGE_03_CAR_BUTTONS: Stage = {
  id: "car-buttons",
  title: "Car Buttons",
  brief: "Riders board and press destination floors. Read the buttons and serve them.",
  section: "basics",
  configRon: STAGE_03_RON,
  unlockedApi: ["pushDestination", "hallCalls", "carCalls", "drainEvents"],
  baseline: "nearest",
  // Pass: 15 delivered, no abandons.
  passFn: ({ delivered, abandoned }) => delivered >= 15 && abandoned === 0,
  starFns: [
    // 2★ — keep the worst single rider's wait under 50 seconds
    // (`max_wait_s` is sim-seconds; it's the max, not p95).
    ({ delivered, abandoned, metrics }) =>
      delivered >= 15 && abandoned === 0 && metrics.max_wait_s < 50,
    // 3★ — sub-30s max wait: requires combining hall and car
    // calls into a single sweep instead of round-tripping the lobby
    // between every group.
    ({ delivered, abandoned, metrics }) =>
      delivered >= 15 && abandoned === 0 && metrics.max_wait_s < 30,
  ],
  starterCode: `// Stage 3 — Car Buttons
//
// Riders board and press floors inside the car. \`sim.carCalls(carId)\`
// returns the pressed buttons for that car so you can queue
// destinations in response.
//
// Hall calls + car calls together — the car needs to pick up new
// riders and drop them off as it sweeps.

const calls = sim.hallCalls();
for (const call of calls) {
  sim.pushDestination(0n, BigInt(call.stop));
}

const inside = sim.carCalls(0n);
for (const stop of inside) {
  sim.pushDestination(0n, BigInt(stop));
}
`,
  hints: [
    "`sim.carCalls(carId)` returns an array of stop ids the riders inside that car have pressed.",
    "Combine hall calls (riders waiting outside) and car calls (riders inside) into a single dispatch sweep — bouncing back and forth burns time.",
    "3★ requires sub-30s max wait. Look at events with `sim.drainEvents()` to react the moment a call lands instead of polling stale state.",
  ],
  failHint: ({ delivered, abandoned }) => {
    const issues: string[] = [];
    if (delivered < 15) issues.push(`delivered ${delivered} of 15`);
    if (abandoned > 0) issues.push(`${abandoned} abandoned`);
    return `Run short — ${issues.join(", ")}. Combine \`hallCalls()\` and \`carCalls(carId)\` into one sweep so the car serves riders inside the cab too.`;
  },
  referenceSolution: `// Canonical stage-3 solution.
// Hall calls and car calls together: queue every waiting floor and
// every cabin button into a single sweep.

for (const call of sim.hallCalls()) {
  sim.pushDestination(0n, BigInt(call.stop));
}
for (const stop of sim.carCalls(0n)) {
  sim.pushDestination(0n, BigInt(stop));
}
`,
};
