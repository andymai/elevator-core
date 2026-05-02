import type { Stage } from "./types";

/**
 * Stage 2 — Listen for Calls.
 *
 * Hall calls arrive as riders press up/down at the lobby. The
 * controller can't pre-queue destinations like Stage 1 — it has to
 * poll the active hall calls each evaluation and dispatch in
 * response. Introduces `hallCalls()` and `drainEvents()` alongside
 * the prior unlock.
 */
const STAGE_02_RON = `SimConfig(
    building: BuildingConfig(
        name: "Quest 2",
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
        mean_interval_ticks: 60,
        weight_range: (50.0, 100.0),
    ),
)`;

export const STAGE_02_LISTEN_UP: Stage = {
  id: "listen-up",
  title: "Listen for Calls",
  brief: "Riders are pressing hall buttons. Read the calls and dispatch the car.",
  section: "basics",
  configRon: STAGE_02_RON,
  unlockedApi: ["pushDestination", "hallCalls", "drainEvents"],
  // Twelve riders staggered across the run so `hallCalls()` returns
  // fresh entries each time the controller polls. Mix of upper-floor
  // origins (so calls come from across the building, not just the
  // lobby) and lobby origins to exercise the "polling matters" lesson.
  seedRiders: [
    { origin: 0, destination: 2, atTick: 0 },
    { origin: 0, destination: 4, atTick: 0 },
    { origin: 1, destination: 0, atTick: 60 },
    { origin: 0, destination: 3, atTick: 120 },
    { origin: 2, destination: 0, atTick: 180 },
    { origin: 0, destination: 4, atTick: 240 },
    { origin: 3, destination: 1, atTick: 300 },
    { origin: 0, destination: 2, atTick: 360 },
    { origin: 4, destination: 0, atTick: 420 },
    { origin: 0, destination: 3, atTick: 480 },
    { origin: 2, destination: 4, atTick: 540 },
    { origin: 0, destination: 1, atTick: 600 },
  ],
  baseline: "nearest",
  // Pass: 10 delivered, no abandons.
  passFn: ({ delivered, abandoned }) => delivered >= 10 && abandoned === 0,
  starFns: [
    // 2★ — keep average wait under 30 seconds (`avg_wait_s` is
    // sim-seconds, not ticks).
    ({ delivered, abandoned, metrics }) =>
      delivered >= 10 && abandoned === 0 && metrics.avg_wait_s < 30,
    // 3★ — beat the nearest-car baseline by ~25% on average wait
    // (under 22 sim-seconds).
    ({ delivered, abandoned, metrics }) =>
      delivered >= 10 && abandoned === 0 && metrics.avg_wait_s < 22,
  ],
  starterCode: `// Stage 2 — Listen for Calls
//
// New tools:
//   sim.hallCalls() returns an array of pending hall calls.
//   sim.drainEvents() returns recently-fired events.
//
// The car is idle by default. Read sim.hallCalls() and use
// sim.pushDestination(carId, stopId) to send the car to floors
// where riders are waiting.

const calls = sim.hallCalls();
for (const call of calls) {
  sim.pushDestination(0n, BigInt(call.stop));
}
`,
  hints: [
    "`sim.hallCalls()` returns objects with at least `{ stop, direction }`. Iterate them and dispatch the car.",
    "Calls accumulate over time. Riders keep arriving at the configured Poisson rate, so polling `sim.hallCalls()` once per evaluation is enough; you don't need to react instantly.",
    "3★ requires beating the nearest-car baseline. Try queuing destinations in directional order so the car doesn't bounce.",
  ],
  failHint: ({ delivered, abandoned }) => {
    const issues: string[] = [];
    if (delivered < 10) issues.push(`delivered ${delivered} of 10`);
    if (abandoned > 0) issues.push(`${abandoned} abandoned`);
    return `Run short — ${issues.join(", ")}. Iterate \`sim.hallCalls()\` and queue a destination for each pending call.`;
  },
  referenceSolution: `// Canonical stage-2 solution.
// Read the pending hall calls once and dispatch the car to each
// floor riders are waiting on.

for (const call of sim.hallCalls()) {
  sim.pushDestination(0n, BigInt(call.stop));
}
`,
};
