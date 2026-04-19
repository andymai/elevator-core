import type { Phase, ScenarioMeta } from "./types";

// Scenarios are embedded as RON strings so the playground is a single static
// bundle with no extra fetches. Each scenario is validated by elevator-core's
// `Simulation::new`, so a malformed RON here surfaces as a JS error from
// `new WasmSim(...)`.
//
// Every scenario declares:
//   - `phases` — a day cycle the TrafficDriver loops through. Phase
//     durations are in *sim-seconds*; with the 4× default playback the
//     5-minute sim day lasts ~75 real-seconds.
//   - `hook` — a commercial-controller feature to spotlight on load.
//   - `defaultStrategy` — the dispatch strategy chosen to pair with
//     that hook; the user can still override via the UI.
//
// Phase weight vectors are indexed by stop position in the scenario's
// RON stop list, not by StopId — a renumbering in the RON would need a
// matching reshuffle here.

// ─── Helpers ─────────────────────────────────────────────────────────

/** Construct an evenly-weighted vector of length `n`. */
function uniform(n: number): number[] {
  return Array.from({ length: n }, () => 1);
}

/** Vector of `n` where only the lobby (index 0) is selectable. */
function lobbyOnly(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0));
}

/** Vector where weights grow slightly with altitude — plausible prior for
 *  exec suites / penthouses attracting modestly more traffic. */
function topBias(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 1 + (i / Math.max(1, n - 1)) * 0.5);
}

// ─── Mid-rise office — group-time ETD hook ──────────────────────────

const OFFICE_STOPS = 6;
// Two 800 kg cars (~10 riders/trip each). With 5.5 s round-trip door
// overhead now in place (3.5 s dwell + 2 × 1 s transition), per-car
// round trip is ~35 s across 3 intermediate stops, giving ~18
// riders/min combined. Phase rates stay at ~1.1–1.4× that during
// rushes so queues build visibly without overflowing patience.
const officePhases: Phase[] = [
  // 0: overnight — tiny trickle of late-workers or cleaners.
  {
    name: "Overnight",
    durationSec: 45,
    ridersPerMin: 3,
    originWeights: uniform(OFFICE_STOPS),
    destWeights: uniform(OFFICE_STOPS),
  },
  // 1: morning up-peak — 85 % from the lobby, weighted toward higher floors.
  {
    name: "Morning rush",
    durationSec: 60,
    ridersPerMin: 30,
    originWeights: [8.5, 0.3, 0.3, 0.3, 0.3, 0.3],
    destWeights: topBias(OFFICE_STOPS).map((w, i) => (i === 0 ? 0 : w)),
  },
  // 2: midday interfloor — uniform, moderate rate.
  {
    name: "Midday interfloor",
    durationSec: 60,
    ridersPerMin: 16,
    originWeights: uniform(OFFICE_STOPS),
    destWeights: uniform(OFFICE_STOPS),
  },
  // 3: lunchtime — bidirectional burst between upper floors and a
  // canteen on stop 1. The hardest pattern for any controller, so it
  // lands slightly above the pair's cruise capacity on purpose —
  // this is where the group-time ETD hook gets its chance to shine.
  {
    name: "Lunchtime",
    durationSec: 45,
    ridersPerMin: 36,
    // Origins skew toward upper floors (people leaving for lunch) and the canteen.
    originWeights: [0.3, 3, 2, 2, 2, 2],
    destWeights: [0.3, 3, 2, 2, 2, 2],
  },
  // 4: evening down-peak — reverse of morning.
  {
    name: "Evening exodus",
    durationSec: 60,
    ridersPerMin: 30,
    originWeights: topBias(OFFICE_STOPS).map((w, i) => (i === 0 ? 0 : w)),
    destWeights: lobbyOnly(OFFICE_STOPS),
  },
];

const office: ScenarioMeta = {
  id: "office-mid-rise",
  label: "Mid-rise office",
  description:
    "Six floors, two 800 kg cars. Walks through morning rush → midday → lunchtime → evening exodus. Group-time ETD damps tail waits under sustained load.",
  defaultStrategy: "etd",
  phases: officePhases,
  seedSpawns: 0,
  // 90 s patience: office workers won't wait forever during a lunch
  // burst — they take the stairs, grab the other bank, or skip the
  // trip. Without this, lunchtime demand (65/min) above the pair's
  // ~54/min cruise capacity grew the queue monotonically.
  abandonAfterSec: 90,
  hook: { kind: "etd_group_time", waitSquaredWeight: 0.002 },
  featureHint:
    "Group-time ETD (`wait_squared_weight = 0.002`) — stops hosting older waiters win ties, damping long-wait tail during lunchtime bursts.",
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Mid-Rise Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
            StopConfig(id: StopId(5), name: "Floor 6", position: 20.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            // Realistic mid-rise commercial: 3.5 s dwell, 1 s each way.
            // The previous ~1 s total cycle was ~4× faster than any
            // real elevator and read as cartoonish on the canvas —
            // doors barely flickered before cars peeled off again.
            door_open_ticks: 210, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.2, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(3),
            door_open_ticks: 210, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 90,
        weight_range: (50.0, 100.0),
    ),
)`,
};

// ─── Skyscraper with sky lobby — full-load bypass hook ──────────────

const SKY_STOPS = 13; // Lobby + 12 floors
// Three 1200 kg cars at 4 m/s through a 48 m shaft. With realistic
// 5 s door dwell + 2 × 1.2 s transitions now in place (7.4 s per
// stop), asymmetric lobby-heavy traffic cycles ~19 riders/min
// combined — each round trip is ~55 s and carries 6–8 riders.
// Phase rates target just above that so bypass still triggers
// (cars hit 80 % during rush) but queues don't snowball and
// mass-abandon. Earlier tuning used fantasy 1.4 s door cycles which
// both looked unrealistic and inflated the apparent throughput.
const skyPhases: Phase[] = [
  {
    name: "Overnight",
    durationSec: 45,
    ridersPerMin: 6,
    originWeights: uniform(SKY_STOPS),
    destWeights: uniform(SKY_STOPS),
  },
  {
    name: "Morning rush",
    durationSec: 75,
    ridersPerMin: 20,
    originWeights: [14, ...Array.from({ length: SKY_STOPS - 1 }, () => 0.25)],
    destWeights: [0, ...topBias(SKY_STOPS - 1)],
  },
  {
    name: "Midday interfloor",
    durationSec: 60,
    ridersPerMin: 13,
    originWeights: uniform(SKY_STOPS),
    destWeights: uniform(SKY_STOPS),
  },
  {
    name: "Lunchtime",
    durationSec: 45,
    ridersPerMin: 17,
    // Sky lobby (stop 6) doubles as the canteen floor.
    originWeights: Array.from({ length: SKY_STOPS }, (_, i) => (i === 6 ? 3 : 1)),
    destWeights: Array.from({ length: SKY_STOPS }, (_, i) => (i === 6 ? 4 : 1)),
  },
  {
    name: "Evening exodus",
    durationSec: 75,
    ridersPerMin: 18,
    originWeights: [0, ...topBias(SKY_STOPS - 1)],
    destWeights: [14, ...Array.from({ length: SKY_STOPS - 1 }, () => 0.25)],
  },
];

const skyscraper: ScenarioMeta = {
  id: "skyscraper-sky-lobby",
  label: "Skyscraper (sky lobby)",
  description:
    "Twelve floors, three cars. Morning rush saturates two cars fast — the third's full-load bypass (80 %/50 %) stops it from detouring for upward hall calls it can't serve.",
  defaultStrategy: "etd",
  phases: skyPhases,
  seedSpawns: 0,
  // 180 s patience: 3 minutes is the realistic commercial-lobby
  // threshold before a hurried commuter peels off to the stairs or
  // another bank. 120 s (the original) caused riders to hit the cap
  // at the tail of morning rush even with well-tuned rates; 180 s
  // gives ETD room to drain the queue between phases.
  abandonAfterSec: 180,
  hook: { kind: "bypass_narration" },
  featureHint:
    "Direction-dependent bypass (80 % up / 50 % down) on all three cars — baked into the RON below. Watch the fullest car skip hall calls.",
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Skyscraper (Sky Lobby)",
        stops: [
            StopConfig(id: StopId(0),  name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1),  name: "Floor 2",    position: 4.0),
            StopConfig(id: StopId(2),  name: "Floor 3",    position: 8.0),
            StopConfig(id: StopId(3),  name: "Floor 4",    position: 12.0),
            StopConfig(id: StopId(4),  name: "Floor 5",    position: 16.0),
            StopConfig(id: StopId(5),  name: "Floor 6",    position: 20.0),
            StopConfig(id: StopId(6),  name: "Sky Lobby",  position: 24.0),
            StopConfig(id: StopId(7),  name: "Floor 8",    position: 28.0),
            StopConfig(id: StopId(8),  name: "Floor 9",    position: 32.0),
            StopConfig(id: StopId(9),  name: "Floor 10",   position: 36.0),
            StopConfig(id: StopId(10), name: "Floor 11",   position: 40.0),
            StopConfig(id: StopId(11), name: "Floor 12",   position: 44.0),
            StopConfig(id: StopId(12), name: "Penthouse",  position: 48.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            // High-rise commercial: 5 s dwell (surge loading during
            // rush), 1.2 s each way. The long dwell is what lets the
            // bypass hook matter — a full car's few seconds saved by
            // skipping a hall call is meaningful at this scale.
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(6),
            // High-rise commercial: 5 s dwell (surge loading during
            // rush), 1.2 s each way. The long dwell is what lets the
            // bypass hook matter — a full car's few seconds saved by
            // skipping a hall call is meaningful at this scale.
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(12),
            // High-rise commercial: 5 s dwell (surge loading during
            // rush), 1.2 s each way. The long dwell is what lets the
            // bypass hook matter — a full car's few seconds saved by
            // skipping a hall call is meaningful at this scale.
            door_open_ticks: 300, door_transition_ticks: 72,
            bypass_load_up_pct: Some(0.80), bypass_load_down_pct: Some(0.50),
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (55.0, 100.0),
    ),
)`,
};

// ─── Residential tower — predictive parking hook ────────────────────

const RES_STOPS = 8;
// Two 700 kg cars at 2.5 m/s over 24.5 m. With realistic 5 s door
// cycle (3 s dwell + 2 × 1 s transition), round trip is ~35 s and
// each car delivers ~15 riders/min — 30 combined. Rates stay
// modest so the midday quiet actually reads as quiet — predictive
// parking needs the rate signal to drop between bursts to
// meaningfully pre-position.
const residentialPhases: Phase[] = [
  {
    name: "Overnight",
    durationSec: 60,
    ridersPerMin: 3,
    originWeights: uniform(RES_STOPS),
    destWeights: uniform(RES_STOPS),
  },
  // Morning: residents heading out — heavy upper → lobby.
  {
    name: "Morning exodus",
    durationSec: 75,
    ridersPerMin: 35,
    originWeights: [0, ...topBias(RES_STOPS - 1)],
    destWeights: lobbyOnly(RES_STOPS),
  },
  // Midday: light traffic. Predictive parking should notice the slump.
  {
    name: "Midday quiet",
    durationSec: 60,
    ridersPerMin: 7,
    originWeights: uniform(RES_STOPS),
    destWeights: uniform(RES_STOPS),
  },
  // Afternoon: groceries, kids, a modest rise.
  {
    name: "Afternoon drift",
    durationSec: 45,
    ridersPerMin: 14,
    originWeights: Array.from({ length: RES_STOPS }, (_, i) => (i === 0 ? 3 : 1)),
    destWeights: uniform(RES_STOPS),
  },
  // Evening: commuters returning — lobby → upper. Inverse of morning.
  {
    name: "Evening return",
    durationSec: 60,
    ridersPerMin: 30,
    originWeights: lobbyOnly(RES_STOPS),
    destWeights: [0, ...topBias(RES_STOPS - 1)],
  },
];

const residential: ScenarioMeta = {
  id: "residential-tower",
  label: "Residential tower",
  description:
    "Eight floors, two cars. Asymmetric day: morning exodus, quiet midday, evening return. Predictive parking anticipates the next peak by the arrival-log rate signal.",
  defaultStrategy: "etd",
  phases: residentialPhases,
  seedSpawns: 0,
  // 180 s: residents are less flighty than office workers (groceries,
  // kids in tow, shared building) and the load stays well under cruise
  // capacity, so abandonment rarely fires — it exists as a safety
  // valve for user-triggered 2× intensity bursts.
  abandonAfterSec: 180,
  hook: { kind: "predictive_parking", windowTicks: 9000 }, // 2.5 min at 60 Hz
  featureHint:
    "Predictive parking with a 2.5-min window — during the midday slump, idle cars pre-position toward the floors that spiked most recently.",
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Residential Tower",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 3.5),
            StopConfig(id: StopId(2), name: "Floor 3", position: 7.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 10.5),
            StopConfig(id: StopId(4), name: "Floor 5", position: 14.0),
            StopConfig(id: StopId(5), name: "Floor 6", position: 17.5),
            StopConfig(id: StopId(6), name: "Floor 7", position: 21.0),
            StopConfig(id: StopId(7), name: "Penthouse", position: 24.5),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.6, deceleration: 2.2,
            weight_capacity: 700.0,
            starting_stop: StopId(0),
            // Residential: 3 s dwell, 1 s each way. Lighter traffic
            // than commercial; no luggage-loading dwell to pad.
            door_open_ticks: 180, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.6, deceleration: 2.2,
            weight_capacity: 700.0,
            starting_stop: StopId(4),
            // Residential: 3 s dwell, 1 s each way. Lighter traffic
            // than commercial; no luggage-loading dwell to pad.
            door_open_ticks: 180, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 75,
        weight_range: (50.0, 95.0),
    ),
)`,
};

// ─── Hotel 24/7 — deferred DCS hook ─────────────────────────────────

const HOTEL_STOPS = 10;
// Three 900 kg cars at 3 m/s over 31.5 m. With 6 s door cycle (4 s
// dwell for luggage + 2 × 1 s transition), round trip is ~45 s and
// each car delivers ~15 riders/min — ~48 combined. Rush rates sit
// at ~0.6× that so all three cars stay visibly busy during check-in
// / check-out bursts without saturating; DCS's benefit comes from
// *reassignment opportunity*, not from overload.
const hotelPhases: Phase[] = [
  // Pre-dawn baseline — minimal traffic.
  {
    name: "Overnight",
    durationSec: 45,
    ridersPerMin: 3,
    originWeights: uniform(HOTEL_STOPS),
    destWeights: uniform(HOTEL_STOPS),
  },
  // Breakfast + check-out bump — upper to lobby / upper to restaurant (floor 2).
  {
    name: "Check-out rush",
    durationSec: 60,
    ridersPerMin: 32,
    originWeights: [0, 0.5, ...Array.from({ length: HOTEL_STOPS - 2 }, () => 1)],
    destWeights: [5, 2, ...Array.from({ length: HOTEL_STOPS - 2 }, () => 0.3)],
  },
  // Daytime — sightseers, room service, uniform interfloor.
  {
    name: "Daytime",
    durationSec: 75,
    ridersPerMin: 15,
    originWeights: uniform(HOTEL_STOPS),
    destWeights: uniform(HOTEL_STOPS),
  },
  // Check-in / dinner — lobby heavy again.
  {
    name: "Check-in rush",
    durationSec: 60,
    ridersPerMin: 28,
    originWeights: [4, 1, ...Array.from({ length: HOTEL_STOPS - 2 }, () => 0.3)],
    destWeights: [0, 0.5, ...Array.from({ length: HOTEL_STOPS - 2 }, () => 1)],
  },
  // Late night — mostly room returns.
  {
    name: "Late night",
    durationSec: 60,
    ridersPerMin: 10,
    originWeights: [2, 2, ...Array.from({ length: HOTEL_STOPS - 2 }, () => 0.5)],
    destWeights: [0.5, 0.5, ...Array.from({ length: HOTEL_STOPS - 2 }, () => 1)],
  },
];

const hotel: ScenarioMeta = {
  id: "hotel-24-7",
  label: "Hotel 24/7",
  description:
    "Ten floors, three cars in DCS mode. Low-rate baseline with check-in / check-out bumps; deferred commitment reallocates assignments while cars are still far from the rider's origin.",
  defaultStrategy: "destination",
  phases: hotelPhases,
  seedSpawns: 0,
  // 150 s: hotel guests with luggage are more patient than office
  // workers but less than residents; tuned so check-in bursts still
  // produce a visible queue without the queue ever running away
  // under 2× intensity.
  abandonAfterSec: 150,
  hook: { kind: "deferred_dcs", commitmentWindowTicks: 180 },
  featureHint:
    "Deferred DCS with a 3-s (180-tick) commitment window — sticky assignments keep re-competing until a car is close to the rider, yielding better matches under bursty demand.",
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Hotel 24/7",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",      position: 0.0),
            StopConfig(id: StopId(1), name: "Restaurant", position: 3.5),
            StopConfig(id: StopId(2), name: "Floor 3",    position: 7.0),
            StopConfig(id: StopId(3), name: "Floor 4",    position: 10.5),
            StopConfig(id: StopId(4), name: "Floor 5",    position: 14.0),
            StopConfig(id: StopId(5), name: "Floor 6",    position: 17.5),
            StopConfig(id: StopId(6), name: "Floor 7",    position: 21.0),
            StopConfig(id: StopId(7), name: "Floor 8",    position: 24.5),
            StopConfig(id: StopId(8), name: "Floor 9",    position: 28.0),
            StopConfig(id: StopId(9), name: "Penthouse",  position: 31.5),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(0),
            // Hotel: 4 s dwell (luggage carts, guests with bags),
            // 1 s each way. Longer than office, shorter than
            // transit — fits the observed commercial range.
            door_open_ticks: 240, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(4),
            // Hotel: 4 s dwell (luggage carts, guests with bags),
            // 1 s each way. Longer than office, shorter than
            // transit — fits the observed commercial range.
            door_open_ticks: 240, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 3.0, acceleration: 1.8, deceleration: 2.3,
            weight_capacity: 900.0,
            starting_stop: StopId(9),
            // Hotel: 4 s dwell (luggage carts, guests with bags),
            // 1 s each way. Longer than office, shorter than
            // transit — fits the observed commercial range.
            door_open_ticks: 240, door_transition_ticks: 60,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 120,
        weight_range: (50.0, 95.0),
    ),
)`,
};

// ─── Convention burst — arrival-log rate signal hook ────────────────

const CONV_STOPS = 5;
// Two 1500 kg cars at 3.5 m/s over a short 16 m shaft. With 7 s door
// cycle (5 s dwell for group boarding + 2 × 1 s transition), round
// trip is ~30 s and each car delivers ~40 riders/min — ~80
// combined. The keynote burst intentionally overshoots that to
// stress-test dispatch; the rate still drops enough between bursts
// that the cycle is recognizably calm.
const conventionPhases: Phase[] = [
  // Acute peak right after a keynote lets out.
  {
    name: "Keynote lets out",
    durationSec: 45,
    ridersPerMin: 110,
    originWeights: Array.from({ length: CONV_STOPS }, (_, i) => (i === CONV_STOPS - 1 ? 8 : 1)),
    destWeights: [5, 2, 1, 1, 0],
  },
  // Tapering as the hall clears.
  {
    name: "Tapering",
    durationSec: 90,
    ridersPerMin: 18,
    originWeights: uniform(CONV_STOPS),
    destWeights: uniform(CONV_STOPS),
  },
  // Quiet before the next session. Generous length so the cycle
  // actually rests between bursts — users get a chance to watch cars
  // park before the next keynote spike hits.
  {
    name: "Between sessions",
    durationSec: 135,
    ridersPerMin: 4,
    originWeights: uniform(CONV_STOPS),
    destWeights: uniform(CONV_STOPS),
  },
];

const convention: ScenarioMeta = {
  id: "convention-burst",
  label: "Convention burst",
  description:
    "Five-floor convention center. A keynote ends and 200+ riders spill into the elevators at once — an acute stress test rather than a day cycle.",
  defaultStrategy: "etd",
  phases: conventionPhases,
  seedSpawns: 120,
  // Intentionally omits `abandonAfterSec` — the whole point of this
  // scenario is to stress-test dispatch under a real pile-up. Letting
  // attendees abandon would gut the `arrival_log` rate signal's
  // purpose, which is "how punishing is *persistent* demand?"
  hook: { kind: "arrival_log" },
  featureHint:
    "Arrival-rate signal lights up as the burst hits — `DispatchManifest::arrivals_at` feeds downstream strategies the per-stop intensity for the next 5 minutes.",
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
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(0),
            // Convention: 5 s dwell for group boarding. Big crowds
            // after keynote are slow to actually step through the
            // threshold; rushing the doors closed ejects riders
            // mid-walk and re-opens, a realistic failure mode.
            door_open_ticks: 300, door_transition_ticks: 60,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 3.5, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1500.0,
            starting_stop: StopId(4),
            // Convention: 5 s dwell for group boarding. Big crowds
            // after keynote are slow to actually step through the
            // threshold; rushing the doors closed ejects riders
            // mid-walk and re-opens, a realistic failure mode.
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

// ─── Space elevator — pure novelty ──────────────────────────────────

const spaceElevator: ScenarioMeta = {
  id: "space-elevator",
  label: "Space elevator",
  description:
    "Two stops 1,000 km apart. Same engine, different scale — no traffic patterns really apply; it's a showpiece for the trapezoidal-motion primitives.",
  defaultStrategy: "scan",
  phases: [
    {
      name: "Scheduled climb",
      durationSec: 300,
      ridersPerMin: 4,
      originWeights: [1, 1],
      destWeights: [1, 1],
    },
  ],
  seedSpawns: 0,
  hook: { kind: "none" },
  featureHint:
    "No controller feature to showcase — this scenario exists to demonstrate that the engine is topology-agnostic.",
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station",   position: 0.0),
            StopConfig(id: StopId(1), name: "Orbital Platform", position: 1000.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Climber Alpha",
            max_speed: 50.0, acceleration: 10.0, deceleration: 15.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 120, door_transition_ticks: 30,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 900,
        weight_range: (60.0, 90.0),
    ),
)`,
};

export const SCENARIOS: ScenarioMeta[] = [
  office,
  skyscraper,
  residential,
  hotel,
  convention,
  spaceElevator,
];

export function scenarioById(id: string): ScenarioMeta {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
