import type { Phase, ScenarioMeta, TweakRanges } from "../../types";

// ─── Default tweak bounds ───────────────────────────────────────────
//
// Shared by the two commercial-scale scenarios (convention burst and
// skyscraper). The space elevator overrides these because its
// operating envelope (50 m/s climbers, 1 000 m shaft, 2 stops) is two
// orders of magnitude away from a building.

const COMMERCIAL_TWEAK_RANGES: TweakRanges = {
  cars: { min: 1, max: 6, step: 1 },
  maxSpeed: { min: 0.5, max: 12, step: 0.5 },
  weightCapacity: { min: 200, max: 2500, step: 100 },
  doorCycleSec: { min: 2, max: 12, step: 0.5 },
};

// Scenarios are embedded as RON strings so the playground is a single static
// bundle with no extra fetches. Each scenario is validated by elevator-core's
// `Simulation::new`, so a malformed RON here surfaces as a JS error from
// `new WasmSim(...)`.
//
// Every scenario declares:
//   - `phases` — a day cycle the TrafficDriver loops through. Phase
//     durations are in *sim-seconds*; at the 2× default playback a
//     5-minute sim day lasts ~2.5 real-minutes.
//   - `featureHint` — one-line narrative framing what to watch for.
//   - `defaultStrategy` — the dispatch strategy the scenario opens
//     with; the user can still override via the UI.
//
// Phase weight vectors are indexed by stop position in the scenario's
// RON stop list, not by StopId — a renumbering in the RON would need a
// matching reshuffle here.

// ─── Helpers ─────────────────────────────────────────────────────────

/** Construct an evenly-weighted vector of length `n`. */
function uniform(n: number): number[] {
  return Array.from({ length: n }, () => 1);
}

// ─── Convention burst — acute post-keynote surge ────────────────────

const CONV_STOPS = 5;
// Four 1500 kg cars at 3.5 m/s over a short 16 m shaft. With 7 s door
// cycle (5 s dwell for group boarding + 2 × 1 s transition), each
// car delivers ~40 riders/min — so four cars push ~160/min combined.
// The keynote burst at 110 riders/min sits within combined capacity,
// shifting the scenario from "overwhelmed capacity" to "can dispatch
// coordinate four cars against a pile-up?" — which is the more
// interesting story for compare-mode strategy comparison.
const conventionPhases: Phase[] = [
  // Acute peak right after a keynote lets out.
  {
    name: "Keynote lets out",
    durationSec: 45,
    ridersPerMin: 110,
    originWeights: Array.from({ length: CONV_STOPS }, (_, i) => (i === CONV_STOPS - 1 ? 8 : 1)),
    destWeights: [5, 2, 1, 1, 0],
  },
  // The hall clears.
  {
    name: "Crowd thins out",
    durationSec: 90,
    ridersPerMin: 18,
    originWeights: uniform(CONV_STOPS),
    destWeights: uniform(CONV_STOPS),
  },
  // Quiet before the next session. Generous length so the cycle
  // actually rests between bursts — users get a chance to watch cars
  // park before the next keynote spike hits.
  {
    name: "Quiet between talks",
    durationSec: 135,
    ridersPerMin: 4,
    originWeights: uniform(CONV_STOPS),
    destWeights: uniform(CONV_STOPS),
  },
];

const convention: ScenarioMeta = {
  id: "convention-burst",
  label: "Convention center",
  description:
    "Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",
  defaultStrategy: "etd",
  phases: conventionPhases,
  seedSpawns: 120,
  // Intentionally omits `abandonAfterSec` — the whole point of this
  // scenario is to stress-test dispatch under a real pile-up. Letting
  // attendees abandon would gut the arrival-rate signal's purpose,
  // which is "how punishing is *persistent* demand?"
  featureHint:
    "A keynote just ended and 200+ attendees flood the elevators at once. Watch which strategies keep up and which drown.",
  buildingName: "Convention Center",
  stops: [
    { name: "Lobby", positionM: 0.0 },
    { name: "Exhibit Hall", positionM: 4.0 },
    { name: "Mezzanine", positionM: 8.0 },
    { name: "Ballroom", positionM: 12.0 },
    { name: "Keynote Hall", positionM: 16.0 },
  ],
  defaultCars: 4,
  elevatorDefaults: {
    maxSpeed: 3.5,
    acceleration: 2.0,
    deceleration: 2.5,
    weightCapacity: 1500.0,
    doorOpenTicks: 300,
    doorTransitionTicks: 60,
  },
  tweakRanges: { ...COMMERCIAL_TWEAK_RANGES, cars: { min: 1, max: 6, step: 1 } },
  passengerMeanIntervalTicks: 30,
  passengerWeightRange: [55.0, 100.0],
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Convention Center",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",        position: 0.0),
            StopConfig(id: StopId(1), name: "Exhibit Hall", position: 4.0),
            StopConfig(id: StopId(2), name: "Mezzanine",    position: 8.0),
            StopConfig(id: StopId(3), name: "Ballroom",     position: 12.0),
            StopConfig(id: StopId(4), name: "Keynote Hall", position: 16.0),
        ],
    ),
    // Convention door timing: 5 s dwell for group boarding. Big crowds
    // after keynote are slow to actually step through the threshold;
    // rushing the doors closed ejects riders mid-walk and re-opens, a
    // realistic failure mode. Four cars pre-positioned at Lobby,
    // Mezzanine, Ballroom, and Keynote Hall so dispatch has both
    // nearby and far cars available when the pile-up hits.
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(0),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(2),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(3),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 3, name: "Car D",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(4),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)`,
};

// ─── Skyscraper — 40 floors, zoned banks, multi-leg transfers ────────
//
// Real skyscraper: 40 named floors (Lobby + 39 above) + a basement
// and a mechanical service floor for the utility elevator. Four
// elevator banks, each a separate `LineConfig` + `GroupConfig` so
// the core's topology graph can plan multi-leg journeys that
// transfer at the sky lobby.
//
//   Stop layout (42 stops, ids 0..41, 4 m spacing):
//     id 0  : B1          (-4 m)     — service-only
//     id 1  : Lobby       (0 m)      — every bank reaches here
//     id 2-20: Floor 1-19  (4..76 m)  — low zone
//     id 21 : Sky Lobby   (80 m)     — transfer point (low + high + exec)
//     id 22-37: Floor 21-36 (84..144 m) — high zone
//     id 38 : Floor 37    (148 m)    — exec-only
//     id 39 : Floor 38    (152 m)    — exec-only
//     id 40 : Penthouse   (156 m)    — exec-only
//     id 41 : Mechanical  (160 m)    — service-only
//
//   Banks:
//     - Low bank      (2 cars): Lobby ↔ floors 1-19 ↔ Sky Lobby
//     - High bank     (1 car) : Sky Lobby ↔ floors 21-36
//     - Executive    (1 car) : Lobby ↔ Sky Lobby ↔ floors 37/38/Penthouse
//     - Service      (1 car) : B1 ↔ Lobby ↔ Mechanical
//
// A rider from Lobby → Floor 30 has no single group serving both
// ends, so the sim's `RiderBuilder::spawn` falls back to the
// topology graph's `shortest_route`, which produces a two-leg
// journey: Low bank to Sky Lobby, then High bank to Floor 30. The
// rider transitions between cars at the transfer point.
//
// Exec-only floors (37, 38, Penthouse) are reachable ONLY by the
// exec car — no other bank's `serves` list includes them. Service-
// only floors (B1, Mechanical) work the same way for the service car.
// This demonstrates the core's per-line stop restriction from both
// sides: a small bank that's the *only* way to reach a few stops,
// and a large bank that can't reach those same stops.

const SKY_LOW_FLOORS = 19; // Floors 1..19 above the lobby
const SKY_HIGH_FLOORS = 16; // Floors 21..36 above the sky lobby
const FLOOR_HEIGHT_M = 4;
const SKY_LOBBY_POS = (1 + SKY_LOW_FLOORS) * FLOOR_HEIGHT_M; // 80 m

/** Phases are relative-rate weighted across the full 42-stop array. */
function skyWeights(fill: (i: number) => number): number[] {
  return Array.from({ length: 42 }, (_, i) => fill(i));
}

const skyPhases: Phase[] = [
  // Morning rush: heavy from Lobby going up. Service floors (B1,
  // Mechanical) get enough weight to keep the service car working —
  // staff arrivals up to Mechanical, and a steady trickle of
  // maintenance / deliveries coming up from the loading dock at B1.
  {
    name: "Morning rush",
    durationSec: 90,
    ridersPerMin: 40,
    originWeights: skyWeights((i) => {
      if (i === 1) return 20; // Lobby
      if (i === 0) return 2; // B1 loading dock
      if (i === 41) return 0.2; // Mechanical (quiet early)
      return 0.1;
    }),
    // Destinations: bulk across all public floors; exec floors get
    // their share; mechanical gets noticeable weight for staff arrivals.
    destWeights: skyWeights((i) => {
      if (i === 0) return 0.3; // some deliveries down to B1
      if (i === 1) return 0; // already at Lobby
      if (i === 21) return 2; // sky lobby amenities
      if (i >= 38 && i <= 40) return 0.6; // exec floors
      if (i === 41) return 1.4; // mechanical — staff arrivals
      return 1; // public floors
    }),
  },
  // Midday: internal floor-to-floor movement, with light service ops
  // (deliveries, maintenance rounds) between B1 / Mechanical and the
  // public floors.
  {
    name: "Midday meetings",
    durationSec: 90,
    ridersPerMin: 18,
    originWeights: skyWeights((i) => {
      if (i === 0) return 0.6; // loading dock
      if (i === 41) return 0.5; // mechanical rounds
      return 1;
    }),
    destWeights: skyWeights((i) => {
      if (i === 0) return 0.5;
      if (i === 41) return 0.5;
      return 1;
    }),
  },
  // Lunch: sky lobby is a canteen hub. Service floors idle but not
  // fully zeroed so the utility car still shows occasional activity.
  {
    name: "Lunch crowd",
    durationSec: 75,
    ridersPerMin: 22,
    originWeights: skyWeights((i) => {
      if (i === 21) return 4; // sky lobby outbound (returning to desks)
      if (i === 0 || i === 41) return 0.25;
      return 1;
    }),
    destWeights: skyWeights((i) => {
      if (i === 21) return 5; // sky lobby inbound (cafeteria)
      if (i === 0 || i === 41) return 0.25;
      return 1;
    }),
  },
  // Evening: downward rush. Mechanical staff head home via the
  // service car; B1 gets packages picked up at the loading dock.
  {
    name: "Evening commute",
    durationSec: 90,
    ridersPerMin: 36,
    originWeights: skyWeights((i) => {
      if (i === 0 || i === 1 || i === 21) return 0.3;
      if (i === 41) return 1.2; // staff leaving mechanical
      return 1;
    }),
    destWeights: skyWeights((i) => {
      if (i === 1) return 20; // Lobby
      if (i === 0) return 1; // deliveries to loading dock
      if (i === 41) return 0.2;
      return 0.1;
    }),
  },
  // Late: minimal, some overnight service + security.
  {
    name: "Late night",
    durationSec: 60,
    ridersPerMin: 6,
    originWeights: skyWeights((i) => (i === 0 || i === 41 ? 1.5 : 0.2)),
    destWeights: skyWeights((i) => (i === 0 || i === 41 ? 1.5 : 0.2)),
  },
];

// Build the multi-zone RON programmatically — 42 stops + 4 lines is
// too many lines to author by hand without copy-paste bugs.
function buildSkyscraperRon(): string {
  const stops: string[] = [];
  stops.push(`        StopConfig(id: StopId(0),  name: "B1",         position: -4.0),`);
  stops.push(`        StopConfig(id: StopId(1),  name: "Lobby",      position: 0.0),`);
  for (let f = 1; f <= SKY_LOW_FLOORS; f++) {
    const id = 1 + f; // ids 2..20
    const pos = f * FLOOR_HEIGHT_M;
    stops.push(
      `        StopConfig(id: StopId(${id.toString().padStart(2, " ")}), name: "Floor ${f}",    position: ${pos.toFixed(1)}),`,
    );
  }
  stops.push(
    `        StopConfig(id: StopId(21), name: "Sky Lobby",  position: ${SKY_LOBBY_POS.toFixed(1)}),`,
  );
  for (let f = 21; f <= 20 + SKY_HIGH_FLOORS; f++) {
    const id = 1 + f; // ids 22..37
    const pos = f * FLOOR_HEIGHT_M;
    stops.push(
      `        StopConfig(id: StopId(${id}), name: "Floor ${f}",   position: ${pos.toFixed(1)}),`,
    );
  }
  stops.push(`        StopConfig(id: StopId(38), name: "Floor 37",   position: 148.0),`);
  stops.push(`        StopConfig(id: StopId(39), name: "Floor 38",   position: 152.0),`);
  stops.push(`        StopConfig(id: StopId(40), name: "Penthouse",  position: 156.0),`);
  stops.push(`        StopConfig(id: StopId(41), name: "Mechanical", position: 160.0),`);

  const lowServes = [1, ...Array.from({ length: SKY_LOW_FLOORS }, (_, k) => 2 + k), 21];
  const highServes = [21, ...Array.from({ length: SKY_HIGH_FLOORS }, (_, k) => 22 + k)];
  const execServes = [1, 21, 38, 39, 40];
  // Service line's `serves` list. Order matters: the `ReturnToLobby`
  // reposition strategy defaults to `home_stop_index: 0` — the first
  // stop in the line's serves list — so putting Lobby (StopId 1)
  // first means an idle Service car parks at the Lobby rather than
  // the basement. Without this, AdaptiveParking's up-peak branch
  // bounces the Service car between B1 and the Lobby every time a
  // service rider finishes a trip.
  const serviceServes = [1, 0, 41];
  const serveList = (ids: number[]): string => ids.map((i) => `StopId(${i})`).join(", ");

  // Per-car physics parameterised on capacity (kg). Main-bank cars
  // take 1800 kg (~24 riders at 75 kg avg) — mid of the 1360–2270 kg
  // (3,000–5,000 lb) range typical for high-rise passenger service.
  // VIP and Service cabs hold <5 riders, so their weight_capacity
  // drops to 350 kg to match the visual narrowness. Bypass thresholds
  // stay identical — they're percentages of capacity, not absolutes.
  const elevator = (id: number, name: string, startStop: number, capacity: number): string =>
    `                ElevatorConfig(
                    id: ${id}, name: "${name}",
                    max_speed: 4.5, acceleration: 2.0, deceleration: 2.5,
                    weight_capacity: ${capacity.toFixed(1)},
                    starting_stop: StopId(${startStop}),
                    door_open_ticks: 240, door_transition_ticks: 60,
                    bypass_load_up_pct: Some(0.85), bypass_load_down_pct: Some(0.55),
                ),`;

  return `SimConfig(
    building: BuildingConfig(
        name: "Skyscraper",
        stops: [
${stops.join("\n")}
        ],
        lines: Some([
            LineConfig(
                id: 0, name: "Low bank",
                serves: [${serveList(lowServes)}],
                elevators: [
${elevator(0, "Low 1", 1, 1800)}
${elevator(1, "Low 2", 21, 1800)}
                ],
            ),
            LineConfig(
                id: 1, name: "High bank",
                serves: [${serveList(highServes)}],
                elevators: [
${elevator(2, "High 1", 21, 1800)}
${elevator(5, "High 2", 37, 1800)}
                ],
            ),
            LineConfig(
                id: 2, name: "Executive",
                serves: [${serveList(execServes)}],
                elevators: [
${elevator(3, "VIP", 1, 350)}
                ],
            ),
            LineConfig(
                id: 3, name: "Service",
                serves: [${serveList(serviceServes)}],
                elevators: [
${elevator(4, "Service", 1, 350)}
                ],
            ),
        ]),
        groups: Some([
            GroupConfig(id: 0, name: "Low", lines: [0], dispatch: Scan),
            GroupConfig(id: 1, name: "High", lines: [1], dispatch: Scan),
            GroupConfig(id: 2, name: "Executive", lines: [2], dispatch: Scan),
            // Service parks on NearestIdle so the car stays where it
            // last finished a trip instead of cycling between B1 and
            // the Lobby via AdaptiveParking's ReturnToLobby branch.
            // Service traffic is sparse; there's no benefit to pre-
            // positioning and the oscillation is visually distracting.
            GroupConfig(id: 3, name: "Service", lines: [3], dispatch: Scan, reposition: Some(NearestIdle)),
        ]),
    ),
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 20,
        weight_range: (55.0, 100.0),
    ),
)`;
}

// Mirror of the RON stops for the scenario meta's `stops` array. The
// traffic driver uses this to pick origins/destinations by index.
const skyscraperStops: Array<{ name: string; positionM: number }> = [
  { name: "B1", positionM: -4 },
  { name: "Lobby", positionM: 0 },
  ...Array.from({ length: SKY_LOW_FLOORS }, (_, k) => ({
    name: `Floor ${k + 1}`,
    positionM: (k + 1) * FLOOR_HEIGHT_M,
  })),
  { name: "Sky Lobby", positionM: SKY_LOBBY_POS },
  ...Array.from({ length: SKY_HIGH_FLOORS }, (_, k) => ({
    name: `Floor ${21 + k}`,
    positionM: (21 + k) * FLOOR_HEIGHT_M,
  })),
  { name: "Floor 37", positionM: 148 },
  { name: "Floor 38", positionM: 152 },
  { name: "Penthouse", positionM: 156 },
  { name: "Mechanical", positionM: 160 },
];

const skyscraper: ScenarioMeta = {
  id: "skyscraper-sky-lobby",
  label: "Skyscraper",
  description:
    "40-floor tower with four elevator banks. Most cross-zone riders transfer at the sky lobby; the exec car is the only way up to the penthouse suites; a service elevator links the basement and mechanical room.",
  defaultStrategy: "etd",
  phases: skyPhases,
  seedSpawns: 0,
  abandonAfterSec: 240,
  featureHint:
    "Cross-zone riders transfer at the Sky Lobby (two-leg routes). The Executive car is the only way to the top 3 floors; the Service car is the only way to B1 / Mechanical.",
  buildingName: "Skyscraper",
  stops: skyscraperStops,
  // Car count is fixed — the multi-line config can't be regenerated
  // by `buildScenarioRon` the same way a flat scenario can.
  defaultCars: 6,
  elevatorDefaults: {
    maxSpeed: 4.5,
    acceleration: 2.0,
    deceleration: 2.5,
    weightCapacity: 1800.0,
    doorOpenTicks: 240,
    doorTransitionTicks: 60,
    bypassLoadUpPct: 0.85,
    bypassLoadDownPct: 0.55,
  },
  // `cars` locked at 6 — the 4-line structure is fixed in the RON.
  // Physics knobs stay editable via the drawer (those hot-swap).
  tweakRanges: { ...COMMERCIAL_TWEAK_RANGES, cars: { min: 6, max: 6, step: 1 } },
  passengerMeanIntervalTicks: 20,
  passengerWeightRange: [55.0, 100.0],
  ron: buildSkyscraperRon(),
};

// ─── Space elevator — orbital tether to GEO ─────────────────────────
//
// The tether climbs to geostationary altitude (35,786 km) with three
// staged platforms along the way — the edge of space (Karman line),
// a low-orbit transfer station, and the geostationary terminus. The
// counterweight sits beyond GEO at the standard ~100,000 km tether
// length, but it isn't a passenger destination — it's structural mass
// keeping the cable in tension. The renderer draws it as a visual
// cap at `tether.counterweightAltitudeM`.
//
// At a 1000 m/s climber speed (~3 600 km/h, faster than any real
// proposal but watchable), Ground → GEO is about 10 hours of
// simulated time. The playground's speed multiplier (cap raised so
// this scenario is usable) keeps that to a few minutes wall-clock.
//
// Spawn rates are intentionally sparse — long-haul space-elevator
// traffic isn't supposed to look like rush hour, and at very long
// trip durations even modest spawn rates pile riders up faster than
// any climber can deliver them.

const KARMAN_M = 100_000;
const LEO_M = 400_000;
const GEO_M = 35_786_000;
const COUNTERWEIGHT_M = 100_000_000;

const TETHER_STOPS = 4;

function tetherWeights(perIndex: (i: number) => number): number[] {
  return Array.from({ length: TETHER_STOPS }, (_, i) => perIndex(i));
}

const spaceElevator: ScenarioMeta = {
  id: "space-elevator",
  label: "Space elevator",
  description:
    "A 35,786 km tether to geostationary orbit with platforms at the Karman line, LEO, and the GEO terminus. Three climbers move payload along a single cable; the counterweight beyond GEO holds the line taut.",
  defaultStrategy: "scan",
  // SpreadEvenly keeps idle climbers distributed across the stops
  // instead of bouncing them all back to the ground (Lobby) or
  // letting AdaptiveParking shuffle them oddly. With three climbers
  // and three reachable platforms, the steady state is one cabin
  // per platform — exactly what you want for sparse long-haul
  // traffic.
  defaultReposition: "spread",
  // Phase durations are tuned to the tether's natural timescale, not
  // a building's "morning rush / evening commute" model. A short hop
  // up to Karman is ~250 sim seconds round-trip, so each phase lasts
  // long enough to see at least one full short-hop cycle complete.
  // Names avoid claiming a specific real-world duration ("shift",
  // "window") since the demo replays the cycle every few real minutes.
  phases: [
    // Outbound — most riders depart Ground bound for the upper
    // platforms. LEO and GEO get the heaviest weight; Karman is a
    // short side-trip. The weight curve favours long trips, which is
    // where the trapezoidal motion profile reads most clearly. Spawn
    // rate is high enough that a Karman round-trip (~5 min sim)
    // accumulates 25–30 riders at the ground station — a single trip
    // delivers a meaningful batch instead of one passenger at a time.
    {
      name: "Outbound cargo",
      durationSec: 480,
      ridersPerMin: 6,
      originWeights: tetherWeights((i) => (i === 0 ? 6 : 1)),
      destWeights: tetherWeights((i) => {
        if (i === 0) return 0;
        if (i === 1) return 2; // Karman — short hops
        if (i === 2) return 3; // LEO transfer
        return 4; // GEO platform
      }),
    },
    // Inbound — returning crews and finished cargo come back down.
    // Origin weights skew toward LEO/GEO to keep the down-traffic
    // narrative visible.
    {
      name: "Inbound cargo",
      durationSec: 360,
      ridersPerMin: 5,
      originWeights: tetherWeights((i) => {
        if (i === 0) return 0;
        if (i === 1) return 1;
        if (i === 2) return 3;
        return 5;
      }),
      destWeights: tetherWeights((i) => (i === 0 ? 6 : 1)),
    },
  ],
  // Pre-seed enough riders that all three climbers depart with a
  // full cabin on the first frame instead of waiting for Poisson
  // samples. 24 ≈ 8 per climber at the platform-default capacity
  // tuning; the climbers' effective batch size scales with the
  // weight slider in the tweak drawer.
  seedSpawns: 24,
  // Long trips deserve patience. 1800 s sim ≈ 1.9 min wall-clock at
  // the recommended 16× playback — long enough that ground→Karman
  // hops complete first, short enough that GEO no-shows do bound the
  // queue.
  abandonAfterSec: 1800,
  featureHint:
    "Three climbers share a single 35,786 km tether. Watch the trapezoidal motion play out at scale: long cruise at 3,600 km/h between Karman, LEO, and the geostationary platform.",
  buildingName: "Orbital Tether",
  stops: [
    { name: "Ground Station", positionM: 0.0 },
    { name: "Karman Line", positionM: KARMAN_M },
    { name: "LEO Transfer", positionM: LEO_M },
    { name: "GEO Platform", positionM: GEO_M },
  ],
  defaultCars: 3,
  elevatorDefaults: {
    maxSpeed: 1000.0,
    acceleration: 10.0,
    deceleration: 10.0,
    weightCapacity: 10000.0,
    doorOpenTicks: 300,
    doorTransitionTicks: 60,
  },
  // Tweak ranges sized for the orbital envelope: speed in 250 m/s
  // steps (50 → 2000), capacity in tonne increments. Door cycle stays
  // short — a 5 s dwell at GEO is plenty for boarding/alighting.
  tweakRanges: {
    cars: { min: 1, max: 3, step: 1 },
    maxSpeed: { min: 250, max: 2000, step: 250 },
    weightCapacity: { min: 2000, max: 20000, step: 2000 },
    doorCycleSec: { min: 4, max: 12, step: 1 },
  },
  passengerMeanIntervalTicks: 1200,
  passengerWeightRange: [60.0, 90.0],
  // Tether-mode metadata. Counterweight is rendered, not visited.
  // Day/night cycling stays off — the playground's warm-dark aesthetic
  // is intentional and consistent across scenarios; cycling sky tones
  // would draw the eye away from the climbers and metrics, which are
  // the actual focal points.
  tether: {
    counterweightAltitudeM: COUNTERWEIGHT_M,
    showDayNight: false,
  },
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station", position: 0.0),
            StopConfig(id: StopId(1), name: "Karman Line",    position: ${KARMAN_M.toFixed(1)}),
            StopConfig(id: StopId(2), name: "LEO Transfer",   position: ${LEO_M.toFixed(1)}),
            StopConfig(id: StopId(3), name: "GEO Platform",   position: ${GEO_M.toFixed(1)}),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Climber A",
            max_speed: 1000.0, acceleration: 10.0, deceleration: 10.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Climber B",
            max_speed: 1000.0, acceleration: 10.0, deceleration: 10.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(1),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 2, name: "Climber C",
            max_speed: 1000.0, acceleration: 10.0, deceleration: 10.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(2),
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 1200,
        weight_range: (60.0, 90.0),
    ),
)`,
};

// ─── Manual control — small office, hands-on API showcase ───────────
//
// 5-floor office where the user drives the simulation by hand: hall
// calls, car buttons, door commands, velocity slider, service-mode
// dropdown, on-demand rider spawn, and live add/remove of a second
// car. TrafficDriver is disabled (`phases: []`) so the only riders are
// the ones the user spawns. Cars boot in `Normal` so spawned riders
// auto-board and dispatch reacts to button presses; flipping a car to
// `Manual` via the dropdown unlocks direct velocity control.
//
// Scale-wise this scenario sits below the convention burst (smaller
// building, fewer cars, no traffic). It leads the SCENARIOS array so
// first-time visitors land on the most approachable demo.

const manualOffice: ScenarioMeta = {
  id: "manual-office",
  label: "Manual control",
  description:
    "5-floor office, no auto traffic. Press hall calls, car buttons, doors, and a velocity slider yourself; flip a car between Normal / Manual / Inspection / Out-of-service to see every service mode.",
  defaultStrategy: "etd",
  // Empty phases = TrafficDriver no-op (mirrors the convention's
  // static post-keynote pattern). All riders are user-spawned.
  phases: [],
  seedSpawns: 0,
  featureHint:
    "Press buttons by hand. Spawn a rider, watch dispatch pick the car, then flip the car to Manual and drive it yourself with the velocity slider.",
  buildingName: "Manual Office",
  stops: [
    { name: "Lobby", positionM: 0.0 },
    { name: "Floor 2", positionM: 4.0 },
    { name: "Floor 3", positionM: 8.0 },
    { name: "Floor 4", positionM: 12.0 },
    { name: "Floor 5", positionM: 16.0 },
  ],
  // 1 car by default; the `Add Car B` toggle in the controls panel
  // demos `addElevator`. Cap at 2 — beyond two cabins the cutaway
  // renderer's right pane would have to shrink each cab.
  defaultCars: 1,
  elevatorDefaults: {
    maxSpeed: 2.0,
    acceleration: 1.5,
    deceleration: 2.0,
    weightCapacity: 800.0,
    doorOpenTicks: 240,
    doorTransitionTicks: 60,
  },
  tweakRanges: {
    cars: { min: 1, max: 2, step: 1 },
    maxSpeed: { min: 0.5, max: 6, step: 0.5 },
    weightCapacity: { min: 200, max: 1500, step: 100 },
    doorCycleSec: { min: 2, max: 12, step: 0.5 },
  },
  passengerMeanIntervalTicks: 60,
  passengerWeightRange: [55.0, 100.0],
  manualControl: {
    defaultServiceMode: "normal",
    allowAddRemoveCar: true,
  },
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Manual Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 2.0, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 240, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 60,
        weight_range: (55.0, 100.0),
    ),
)`,
};

// Order is intentional: scale-ascending. Manual office sits first as
// the most approachable starting point (5 stops, 1 car, hands-on);
// then a 5-stop acute burst, a 42-stop sky-lobby tower, and a 4-stop
// tether 35 786 km tall.
export const SCENARIOS: ScenarioMeta[] = [manualOffice, convention, skyscraper, spaceElevator];

export function scenarioById(id: string): ScenarioMeta {
  const match = SCENARIOS.find((s) => s.id === id);
  if (match) return match;
  const fallback = SCENARIOS[0];
  if (fallback) return fallback;
  throw new Error(`unknown scenario "${id}" and empty registry`);
}
