//! Snapshot and event DTOs returned to JS.
//!
//! The core `Event` enum is `#[non_exhaustive]` and its variants carry engine
//! types (typed IDs, durations, `Weight`), so we deliberately *mirror* the
//! interesting cases in a flattened shape for JS consumers rather than
//! re-exporting the raw type. This keeps the playground decoupled from the
//! core's enum evolution.

use elevator_core::entity::EntityId;
use elevator_core::events::Event;
use elevator_core::prelude::{ElevatorPhase, Simulation};
use serde::Serialize;
use slotmap::Key;
use tsify::Tsify;

/// Per-elevator rendering snapshot.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CarDto {
    /// Stable entity id (hashable as a JS number).
    pub id: u32,
    /// Line entity id the car belongs to (for multi-line rendering).
    pub line: u32,
    /// Position along the shaft axis.
    pub y: f64,
    /// Signed velocity (+up, -down).
    pub v: f64,
    /// Short phase label (`idle`, `moving`, `repositioning`, `door-opening`,
    /// `loading`, `door-closing`, `stopped`).
    #[tsify(
        type = r#""idle" | "moving" | "repositioning" | "door-opening" | "loading" | "door-closing" | "stopped" | "unknown""#
    )]
    pub phase: &'static str,
    /// Target stop entity id, if any.
    pub target: Option<u32>,
    /// Current load weight.
    pub load: f64,
    /// Capacity weight.
    pub capacity: f64,
    /// Number of riders currently aboard.
    pub riders: u32,
    /// Minimum y-position of a stop the car's line serves. Renderers
    /// use this (with `max_served_y`) to draw the shaft channel only
    /// over the range the car can actually reach — an express elevator
    /// that skips mid floors gets a short visible shaft, while a
    /// service elevator spanning the basement to the mechanical room
    /// gets a long one.
    pub min_served_y: f64,
    /// Maximum y-position of a stop the car's line serves.
    pub max_served_y: f64,
}

/// One line's share of a stop's waiting queue.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WaitingByLine {
    /// Line entity id. Matches `CarDto.line` for cars running on this line.
    pub line: u32,
    /// Waiting riders whose current route leg routes through this line.
    pub count: u32,
}

/// Per-stop rendering snapshot.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct StopDto {
    /// Stable entity id (matches `CarDto.target` for rendering assignment lines).
    pub entity_id: u32,
    /// Config-level `StopId`. The UI passes this back to `spawnRider` to
    /// create riders between stops. Stops added at runtime (not present in
    /// the initial config lookup) report `u32::MAX` as a sentinel so the UI
    /// can reject them rather than silently routing riders to `StopId(0)`.
    pub stop_id: u32,
    /// Human-readable stop name.
    pub name: String,
    /// Position along the shaft axis.
    pub y: f64,
    /// Waiting rider count (O(1)).
    pub waiting: u32,
    /// Waiting riders whose current route destination lies above this stop.
    /// Partition of `waiting`; sum may be less than `waiting` for riders
    /// without a Route (none in the playground, but the API is defensive).
    pub waiting_up: u32,
    /// Waiting riders whose current route destination lies below this stop.
    pub waiting_down: u32,
    /// Waiting riders partitioned by the line that will serve their
    /// current route leg. Sums to `waiting` minus any riders without a
    /// Route / with a Walk leg. Used by the renderer to split the
    /// waiting queue across multi-line stops (sky-lobby, street lobby
    /// with service bank, etc.).
    pub waiting_by_line: Vec<WaitingByLine>,
    /// Resident rider count (O(1)).
    pub residents: u32,
}

/// Top-level snapshot returned by [`WasmSim::snapshot`](crate::WasmSim::snapshot).
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct Snapshot {
    /// Current tick counter.
    pub tick: u64,
    /// Seconds per tick.
    pub dt: f64,
    /// Elevator cars.
    pub cars: Vec<CarDto>,
    /// Configured stops.
    pub stops: Vec<StopDto>,
}

impl Snapshot {
    /// Build a snapshot from the simulation state. Runs in O(elevators + stops).
    pub fn build(sim: &Simulation) -> Self {
        // Precompute per-line (min_y, max_y) over the stops each line
        // serves. Used below to populate `CarDto.min_served_y` /
        // `max_served_y` so renderers can draw zone-limited shafts.
        // Empty or ill-configured lines fall back to `(NaN, NaN)`;
        // the TS renderer treats NaN as "draw full shaft" to stay
        // forward-compatible with future scenarios.
        let mut line_range: std::collections::HashMap<EntityId, (f64, f64)> =
            std::collections::HashMap::new();
        for group in sim.groups() {
            for line in group.lines() {
                let mut min_y = f64::INFINITY;
                let mut max_y = f64::NEG_INFINITY;
                for &stop_eid in line.serves() {
                    if let Some(stop) = sim.world().stop(stop_eid) {
                        let y = stop.position();
                        if y < min_y {
                            min_y = y;
                        }
                        if y > max_y {
                            max_y = y;
                        }
                    }
                }
                if min_y.is_finite() && max_y.is_finite() {
                    line_range.insert(line.entity(), (min_y, max_y));
                }
            }
        }

        let cars = sim
            .world()
            .iter_elevators()
            .map(|(id, pos, car)| {
                let v = sim.velocity(id).unwrap_or(0.0);
                let target = car.target_stop().map(entity_to_u32);
                let (min_served_y, max_served_y) = line_range
                    .get(&car.line())
                    .copied()
                    .unwrap_or((f64::NAN, f64::NAN));
                CarDto {
                    id: entity_to_u32(id),
                    line: entity_to_u32(car.line()),
                    y: pos.value(),
                    v,
                    phase: phase_label(car.phase()),
                    target,
                    load: car.current_load().value(),
                    capacity: car.weight_capacity().value(),
                    riders: u32::try_from(car.riders().len()).unwrap_or(u32::MAX),
                    min_served_y,
                    max_served_y,
                }
            })
            .collect();

        // Build a reverse index once (entity id → config StopId) so we can
        // surface both on each StopDto without walking the lookup N times.
        let entity_to_stop_id: std::collections::HashMap<_, _> = sim
            .stop_lookup_iter()
            .map(|(stop_id, entity)| (*entity, stop_id.0))
            .collect();

        let stops = sim
            .world()
            .iter_stops()
            .map(|(id, stop)| {
                let (up, down) = sim.waiting_direction_counts_at(id);
                let waiting_by_line = sim
                    .waiting_counts_by_line_at(id)
                    .into_iter()
                    .map(|(line, count)| WaitingByLine {
                        line: entity_to_u32(line),
                        count,
                    })
                    .collect();
                StopDto {
                    entity_id: entity_to_u32(id),
                    stop_id: entity_to_stop_id.get(&id).copied().unwrap_or(u32::MAX),
                    name: stop.name().to_string(),
                    y: stop.position(),
                    waiting: u32::try_from(sim.waiting_count_at(id)).unwrap_or(u32::MAX),
                    waiting_up: u32::try_from(up).unwrap_or(u32::MAX),
                    waiting_down: u32::try_from(down).unwrap_or(u32::MAX),
                    waiting_by_line,
                    residents: u32::try_from(sim.resident_count_at(id)).unwrap_or(u32::MAX),
                }
            })
            .collect();

        Self {
            tick: sim.current_tick(),
            dt: sim.dt(),
            cars,
            stops,
        }
    }
}

/// Aggregate metrics DTO. Wait/ride times are converted to seconds using the
/// sim's tick rate so the UI doesn't have to know about ticks.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct MetricsDto {
    pub delivered: u64,
    pub abandoned: u64,
    pub spawned: u64,
    pub settled: u64,
    pub rerouted: u64,
    pub throughput: u64,
    pub avg_wait_s: f64,
    pub max_wait_s: f64,
    pub avg_ride_s: f64,
    pub utilization: f64,
    pub abandonment_rate: f64,
    pub total_distance: f64,
    pub total_moves: u64,
}

impl MetricsDto {
    #[allow(clippy::cast_precision_loss)]
    pub fn build(sim: &Simulation) -> Self {
        let m = sim.metrics();
        let dt = sim.dt();
        Self {
            delivered: m.total_delivered(),
            abandoned: m.total_abandoned(),
            spawned: m.total_spawned(),
            settled: m.total_settled(),
            rerouted: m.total_rerouted(),
            throughput: m.throughput(),
            avg_wait_s: m.avg_wait_time() * dt,
            max_wait_s: (m.max_wait_time() as f64) * dt,
            avg_ride_s: m.avg_ride_time() * dt,
            utilization: m.avg_utilization(),
            abandonment_rate: m.abandonment_rate(),
            total_distance: m.total_distance(),
            total_moves: m.total_moves(),
        }
    }
}

/// A multi-stop route shaped for JS consumers as a flat array of stop
/// entity ids. Returned by [`crate::WasmSim::shortestRoute`].
///
/// The first entry is the origin, the last is the destination, and any
/// in-between entries are transfer points. Adjacent pairs become route
/// legs internally; this projection drops the per-leg `via` (Group /
/// Line / Walk) information since it isn't observable to the JS side
/// without additional context.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct RouteDto {
    /// Ordered stop entity ids (length >= 2 for a valid route). The
    /// rider visits these in sequence; each adjacent pair is one leg.
    pub stops: Vec<u32>,
    /// Optional total cost in ticks (currently always `None` —
    /// [`Simulation::shortest_route`] doesn't yet compute cost).
    pub cost: Option<u64>,
}

impl From<elevator_core::components::Route> for RouteDto {
    fn from(route: elevator_core::components::Route) -> Self {
        // Flatten the leg chain into [from0, to0=from1, to1=from2, ...].
        // Adjacent duplicates collapse — `RouteLeg.to == next.from` by
        // construction, so the chain has `legs.len() + 1` distinct stops.
        let mut stops: Vec<u32> = Vec::with_capacity(route.legs.len() + 1);
        if let Some(first) = route.legs.first() {
            stops.push(entity_to_u32(first.from));
            for leg in &route.legs {
                stops.push(entity_to_u32(leg.to));
            }
        }
        Self { stops, cost: None }
    }
}

/// Per-tag aggregates. Returned by
/// [`crate::WasmSim::metricsForTag`].
///
/// Mirrors [`elevator_core::tagged_metrics::TaggedMetric`] field-for-field
/// (no precision loss). Wait times stay in **ticks** here — JS consumers
/// who want seconds multiply by `currentTick`-vs-prev-tick `dt` from the
/// top-level metrics.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct TaggedMetricDto {
    /// Average wait time in ticks (spawn → board) for tagged riders.
    pub avg_wait_ticks: f64,
    /// Maximum wait time observed in ticks for tagged riders.
    pub max_wait_ticks: u64,
    /// Total riders delivered carrying this tag.
    pub total_delivered: u64,
    /// Total riders abandoned carrying this tag.
    pub total_abandoned: u64,
    /// Total riders spawned carrying this tag.
    pub total_spawned: u64,
}

impl From<&elevator_core::tagged_metrics::TaggedMetric> for TaggedMetricDto {
    fn from(m: &elevator_core::tagged_metrics::TaggedMetric) -> Self {
        Self {
            avg_wait_ticks: m.avg_wait_time(),
            max_wait_ticks: m.max_wait_time(),
            total_delivered: m.total_delivered(),
            total_abandoned: m.total_abandoned(),
            total_spawned: m.total_spawned(),
        }
    }
}

/// One entry in [`HallCallDto::assigned_cars_by_line`].
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct AssignedCarByLine {
    /// Line entity id keying the assignment.
    pub line: u32,
    /// Car committed to this `(stop, direction)` call on the line.
    pub car: u32,
}

/// Hall-call snapshot. Returned by [`crate::WasmSim::hallCalls`].
///
/// Mirrors [`elevator_core::components::HallCall`] field-for-field with
/// `EntityId` slots flattened to `u32` and the `BTreeMap` projection
/// flattened to a `Vec` of `(line, car)` pairs (entry order is by
/// line entity id, stable across ticks).
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct HallCallDto {
    /// Stop where the button was pressed.
    pub stop: u32,
    /// Direction label: `"up"` or `"down"`.
    pub direction: String,
    /// Tick at which the button was first pressed.
    pub press_tick: u64,
    /// Tick at which dispatch first saw this call (after ack latency).
    /// `None` while still pending acknowledgement.
    pub acknowledged_at: Option<u64>,
    /// Ticks the controller took to acknowledge this call.
    pub ack_latency_ticks: u32,
    /// Riders currently waiting on this call (Classic mode). Empty in
    /// Destination mode where calls carry a single `destination` instead.
    pub pending_riders: Vec<u32>,
    /// Destination requested at press time (Destination mode only).
    pub destination: Option<u32>,
    /// Cars committed to serving this call, by line. A stop served by
    /// multiple lines can hold one entry per line simultaneously.
    pub assigned_cars_by_line: Vec<AssignedCarByLine>,
    /// When `true`, dispatch will not reassign this call to a different car.
    pub pinned: bool,
}

impl From<&elevator_core::components::HallCall> for HallCallDto {
    fn from(c: &elevator_core::components::HallCall) -> Self {
        Self {
            stop: entity_to_u32(c.stop),
            direction: match c.direction {
                elevator_core::components::CallDirection::Up => "up",
                elevator_core::components::CallDirection::Down => "down",
                _ => "either",
            }
            .to_string(),
            press_tick: c.press_tick,
            acknowledged_at: c.acknowledged_at,
            ack_latency_ticks: c.ack_latency_ticks,
            pending_riders: c
                .pending_riders
                .iter()
                .copied()
                .map(entity_to_u32)
                .collect(),
            destination: c.destination.map(entity_to_u32),
            assigned_cars_by_line: c
                .assigned_cars_by_line
                .iter()
                .map(|(line, car)| AssignedCarByLine {
                    line: entity_to_u32(*line),
                    car: entity_to_u32(*car),
                })
                .collect(),
            pinned: c.pinned,
        }
    }
}

/// Car-call (in-cab floor button) snapshot. Returned by
/// [`crate::WasmSim::carCalls`].
///
/// Mirrors [`elevator_core::components::CarCall`] field-for-field.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CarCallDto {
    /// Elevator the button was pressed inside.
    pub car: u32,
    /// Stop the button requests.
    pub floor: u32,
    /// Tick the button was pressed.
    pub press_tick: u64,
    /// Tick dispatch first saw this call (after ack latency).
    pub acknowledged_at: Option<u64>,
    /// Ticks the controller took to acknowledge this call.
    pub ack_latency_ticks: u32,
    /// Riders who pressed the button.
    pub pending_riders: Vec<u32>,
}

impl From<&elevator_core::components::CarCall> for CarCallDto {
    fn from(c: &elevator_core::components::CarCall) -> Self {
        Self {
            car: entity_to_u32(c.car),
            floor: entity_to_u32(c.floor),
            press_tick: c.press_tick,
            acknowledged_at: c.acknowledged_at,
            ack_latency_ticks: c.ack_latency_ticks,
            pending_riders: c
                .pending_riders
                .iter()
                .copied()
                .map(entity_to_u32)
                .collect(),
        }
    }
}

/// Flattened event DTO. Every variant includes a `kind` discriminator and the
/// engine tick at which it was emitted; the remaining fields vary by kind.
/// Unknown variants (added to core later) fall back to `{ kind: "unknown" }`
/// so the UI stays forward-compatible.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum EventDto {
    // ── Rider lifecycle ─────────────────────────────────────────────
    /// `tag` mirrors the rider's opaque consumer tag at emit time. `0`
    /// means untagged. Set via [`WasmSim::set_rider_tag`] —
    /// see that method for the back-pointer pattern this enables.
    RiderSpawned {
        tick: u64,
        rider: u32,
        origin: u32,
        destination: u32,
        tag: u64,
    },
    /// `tag` mirrors the rider's opaque consumer tag at emit time. `0`
    /// means untagged.
    RiderBoarded {
        tick: u64,
        rider: u32,
        elevator: u32,
        tag: u64,
    },
    /// `tag` mirrors the rider's opaque consumer tag, sampled before the
    /// rider is freed so consumers can correlate the exit with external
    /// state. `0` means untagged.
    RiderExited {
        tick: u64,
        rider: u32,
        elevator: u32,
        stop: u32,
        tag: u64,
    },
    /// A rider was rejected from boarding (e.g., over capacity, access
    /// denied). `reason` is a kebab-case label drawn from
    /// [`elevator_core::error::RejectionReason`]. `tag` mirrors the
    /// rider's opaque consumer tag; `0` means untagged.
    RiderRejected {
        tick: u64,
        rider: u32,
        elevator: u32,
        reason: String,
        tag: u64,
    },
    /// `tag` mirrors the rider's opaque consumer tag, sampled before the
    /// rider is freed. `0` means untagged.
    RiderAbandoned {
        tick: u64,
        rider: u32,
        stop: u32,
        tag: u64,
    },
    /// A rider was ejected from a disabled / removed elevator. `tag`
    /// mirrors the rider's opaque consumer tag; `0` means untagged.
    RiderEjected {
        tick: u64,
        rider: u32,
        elevator: u32,
        stop: u32,
        tag: u64,
    },
    /// `tag` mirrors the rider's opaque consumer tag; `0` means untagged.
    RiderSettled {
        tick: u64,
        rider: u32,
        stop: u32,
        tag: u64,
    },
    /// `tag` mirrors the rider's opaque consumer tag, sampled before the
    /// rider is freed. `0` means untagged.
    RiderDespawned {
        tick: u64,
        rider: u32,
        tag: u64,
    },
    /// A rider was rerouted via `sim.reroute()` or `sim.reroute_rider()`.
    /// `tag` mirrors the rider's opaque consumer tag; `0` means untagged.
    RiderRerouted {
        tick: u64,
        rider: u32,
        new_destination: u32,
        tag: u64,
    },
    /// A rider skipped a car they considered too crowded. `tag` mirrors
    /// the rider's opaque consumer tag; `0` means untagged.
    RiderSkipped {
        tick: u64,
        rider: u32,
        elevator: u32,
        at_stop: u32,
        tag: u64,
    },
    /// A rider's route was invalidated by topology change. `reason` is
    /// `"stop-disabled"`, `"stop-removed"`, or `"no-alternative"`. `tag`
    /// mirrors the rider's opaque consumer tag; `0` means untagged.
    RouteInvalidated {
        tick: u64,
        rider: u32,
        affected_stop: u32,
        reason: String,
        tag: u64,
    },

    // ── Elevator motion + doors ─────────────────────────────────────
    ElevatorArrived {
        tick: u64,
        elevator: u32,
        stop: u32,
    },
    ElevatorDeparted {
        tick: u64,
        elevator: u32,
        stop: u32,
    },
    DoorOpened {
        tick: u64,
        elevator: u32,
    },
    DoorClosed {
        tick: u64,
        elevator: u32,
    },
    /// `command` is one of `"open"`, `"close"`, `"hold-open"`,
    /// `"cancel-hold"` (kebab-case from
    /// [`elevator_core::door::DoorCommand`]).
    DoorCommandQueued {
        tick: u64,
        elevator: u32,
        command: String,
    },
    /// Same `command` set as [`EventDto::DoorCommandQueued`].
    DoorCommandApplied {
        tick: u64,
        elevator: u32,
        command: String,
    },
    /// An elevator passes a stop without stopping.
    PassingFloor {
        tick: u64,
        elevator: u32,
        stop: u32,
        moving_up: bool,
    },
    /// An in-flight movement was aborted; the car decelerates to
    /// `brake_target`.
    MovementAborted {
        tick: u64,
        elevator: u32,
        brake_target: u32,
    },
    ElevatorIdle {
        tick: u64,
        elevator: u32,
        /// `None` if the car is not currently parked at a stop.
        at_stop: Option<u32>,
    },

    // ── Dispatch / calls ────────────────────────────────────────────
    ElevatorAssigned {
        tick: u64,
        elevator: u32,
        stop: u32,
    },
    /// `direction` is `"up"` or `"down"`.
    HallButtonPressed {
        tick: u64,
        stop: u32,
        direction: String,
    },
    HallCallAcknowledged {
        tick: u64,
        stop: u32,
        direction: String,
    },
    HallCallCleared {
        tick: u64,
        stop: u32,
        direction: String,
        car: u32,
    },
    /// `rider` is `None` when the press is synthetic (scripted).
    /// `tag` mirrors the pressing rider's opaque consumer tag and is
    /// `None` whenever `rider` is `None`. `Some(0)` means a present but
    /// untagged rider.
    CarButtonPressed {
        tick: u64,
        car: u32,
        floor: u32,
        rider: Option<u32>,
        tag: Option<u64>,
    },
    DestinationQueued {
        tick: u64,
        elevator: u32,
        stop: u32,
    },

    // ── Repositioning ───────────────────────────────────────────────
    /// Idle elevator has been sent to a new parking position by the
    /// group's reposition strategy.
    ElevatorRepositioning {
        tick: u64,
        elevator: u32,
        stop: u32,
    },
    /// An elevator completed repositioning at its target stop.
    ElevatorRepositioned {
        tick: u64,
        elevator: u32,
        stop: u32,
    },
    /// The elevator was recalled to a stop via `sim.recall_to()`.
    ElevatorRecalled {
        tick: u64,
        elevator: u32,
        to_stop: u32,
    },

    // ── Topology lifecycle ──────────────────────────────────────────
    StopAdded {
        tick: u64,
        stop: u32,
        line: u32,
        group: u32,
    },
    StopRemoved {
        tick: u64,
        stop: u32,
    },
    ElevatorAdded {
        tick: u64,
        elevator: u32,
        line: u32,
        group: u32,
    },
    ElevatorRemoved {
        tick: u64,
        elevator: u32,
        line: u32,
        group: u32,
    },
    LineAdded {
        tick: u64,
        line: u32,
        group: u32,
    },
    LineRemoved {
        tick: u64,
        line: u32,
        group: u32,
    },
    LineReassigned {
        tick: u64,
        line: u32,
        old_group: u32,
        new_group: u32,
    },
    ElevatorReassigned {
        tick: u64,
        elevator: u32,
        old_line: u32,
        new_line: u32,
    },
    EntityDisabled {
        tick: u64,
        entity: u32,
    },
    EntityEnabled {
        tick: u64,
        entity: u32,
    },
    /// A stop was removed while resident riders were still attached;
    /// the consumer must relocate or despawn them.
    ResidentsAtRemovedStop {
        /// `tick` is `0` for this variant (it is not carried by the
        /// underlying core event).
        tick: u64,
        stop: u32,
        residents: Vec<u32>,
    },

    // ── Observability ───────────────────────────────────────────────
    /// Service mode transition. `from`/`to` are kebab-case labels:
    /// `"normal"`, `"independent"`, `"inspection"`, `"manual"`,
    /// `"out-of-service"`.
    ServiceModeChanged {
        tick: u64,
        elevator: u32,
        from: String,
        to: String,
    },
    /// A velocity command on a Manual-mode elevator. `target_velocity`
    /// is `null` when the command clears the target (emergency stop).
    ManualVelocityCommanded {
        tick: u64,
        elevator: u32,
        target_velocity: Option<f64>,
    },
    CapacityChanged {
        tick: u64,
        elevator: u32,
        current_load: f64,
        capacity: f64,
    },
    DirectionIndicatorChanged {
        tick: u64,
        elevator: u32,
        going_up: bool,
        going_down: bool,
    },
    /// An elevator parameter was upgraded at runtime. `field` is one of
    /// `"max-speed"`, `"acceleration"`, `"deceleration"`,
    /// `"weight-capacity"`, `"door-transition-ticks"`,
    /// `"door-open-ticks"`. `old`/`new` are the value as f64 (tick
    /// counts cast losslessly into the ~2^53 safe range).
    ElevatorUpgraded {
        tick: u64,
        elevator: u32,
        field: String,
        old: f64,
        new: f64,
    },
    /// Energy consumed/regenerated this tick. Only emitted with the
    /// `energy` feature on core; absent otherwise.
    EnergyConsumed {
        tick: u64,
        elevator: u32,
        consumed: f64,
        regenerated: f64,
    },
    /// Snapshot restore encountered an entity reference that could not
    /// be remapped — signals snapshot corruption.
    SnapshotDanglingReference {
        tick: u64,
        stale_id: u32,
    },
    /// Snapshot restore could not re-instantiate the reposition
    /// strategy for a group.
    RepositionStrategyNotRestored {
        /// Always `0` — the underlying event carries no tick.
        tick: u64,
        group: u32,
    },
    /// Snapshot restore failed to replay tunable dispatch config; the
    /// strategy runs with its default weights.
    DispatchConfigNotRestored {
        /// Always `0` — the underlying event carries no tick.
        tick: u64,
        group: u32,
        reason: String,
    },

    // ── Forward-compat fallback ─────────────────────────────────────
    /// Fallback for core `Event` variants that this binding does not
    /// know about (added to core after this binding was compiled).
    /// Consumers should treat this as "event was emitted but the shape
    /// is unknown" — `label` carries the variant name.
    Unknown {
        tick: u64,
        label: String,
    },
}

impl From<Event> for EventDto {
    #[allow(clippy::too_many_lines)]
    fn from(event: Event) -> Self {
        match event {
            // ── Rider lifecycle ─────────────────────────────────────
            Event::RiderSpawned {
                tick,
                rider,
                origin,
                destination,
                tag,
            } => Self::RiderSpawned {
                tick,
                rider: entity_to_u32(rider),
                origin: entity_to_u32(origin),
                destination: entity_to_u32(destination),
                tag,
            },
            Event::RiderBoarded {
                tick,
                rider,
                elevator,
                tag,
            } => Self::RiderBoarded {
                tick,
                rider: entity_to_u32(rider),
                elevator: entity_to_u32(elevator),
                tag,
            },
            Event::RiderExited {
                tick,
                rider,
                elevator,
                stop,
                tag,
            } => Self::RiderExited {
                tick,
                rider: entity_to_u32(rider),
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(stop),
                tag,
            },
            Event::RiderRejected {
                tick,
                rider,
                elevator,
                reason,
                tag,
                ..
            } => Self::RiderRejected {
                tick,
                rider: entity_to_u32(rider),
                elevator: entity_to_u32(elevator),
                reason: rejection_label(reason).to_string(),
                tag,
            },
            Event::RiderAbandoned {
                tick,
                rider,
                stop,
                tag,
            } => Self::RiderAbandoned {
                tick,
                rider: entity_to_u32(rider),
                stop: entity_to_u32(stop),
                tag,
            },
            Event::RiderEjected {
                tick,
                rider,
                elevator,
                stop,
                tag,
            } => Self::RiderEjected {
                tick,
                rider: entity_to_u32(rider),
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(stop),
                tag,
            },
            Event::RiderSettled {
                tick,
                rider,
                stop,
                tag,
            } => Self::RiderSettled {
                tick,
                rider: entity_to_u32(rider),
                stop: entity_to_u32(stop),
                tag,
            },
            Event::RiderDespawned { tick, rider, tag } => Self::RiderDespawned {
                tick,
                rider: entity_to_u32(rider),
                tag,
            },
            Event::RiderRerouted {
                tick,
                rider,
                new_destination,
                tag,
            } => Self::RiderRerouted {
                tick,
                rider: entity_to_u32(rider),
                new_destination: entity_to_u32(new_destination),
                tag,
            },
            Event::RiderSkipped {
                tick,
                rider,
                elevator,
                at_stop,
                tag,
            } => Self::RiderSkipped {
                tick,
                rider: entity_to_u32(rider),
                elevator: entity_to_u32(elevator),
                at_stop: entity_to_u32(at_stop),
                tag,
            },
            Event::RouteInvalidated {
                tick,
                rider,
                affected_stop,
                reason,
                tag,
            } => Self::RouteInvalidated {
                tick,
                rider: entity_to_u32(rider),
                affected_stop: entity_to_u32(affected_stop),
                reason: route_invalid_label(reason).to_string(),
                tag,
            },

            // ── Elevator motion + doors ─────────────────────────────
            Event::ElevatorArrived {
                tick,
                elevator,
                at_stop,
            } => Self::ElevatorArrived {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(at_stop),
            },
            Event::ElevatorDeparted {
                tick,
                elevator,
                from_stop,
            } => Self::ElevatorDeparted {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(from_stop),
            },
            Event::DoorOpened { tick, elevator } => Self::DoorOpened {
                tick,
                elevator: entity_to_u32(elevator),
            },
            Event::DoorClosed { tick, elevator } => Self::DoorClosed {
                tick,
                elevator: entity_to_u32(elevator),
            },
            Event::DoorCommandQueued {
                tick,
                elevator,
                command,
            } => Self::DoorCommandQueued {
                tick,
                elevator: entity_to_u32(elevator),
                command: door_command_label(command).to_string(),
            },
            Event::DoorCommandApplied {
                tick,
                elevator,
                command,
            } => Self::DoorCommandApplied {
                tick,
                elevator: entity_to_u32(elevator),
                command: door_command_label(command).to_string(),
            },
            Event::PassingFloor {
                tick,
                elevator,
                stop,
                moving_up,
            } => Self::PassingFloor {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(stop),
                moving_up,
            },
            Event::MovementAborted {
                tick,
                elevator,
                brake_target,
            } => Self::MovementAborted {
                tick,
                elevator: entity_to_u32(elevator),
                brake_target: entity_to_u32(brake_target),
            },
            Event::ElevatorIdle {
                tick,
                elevator,
                at_stop,
            } => Self::ElevatorIdle {
                tick,
                elevator: entity_to_u32(elevator),
                at_stop: at_stop.map(entity_to_u32),
            },

            // ── Dispatch / calls ────────────────────────────────────
            Event::ElevatorAssigned {
                tick,
                elevator,
                stop,
            } => Self::ElevatorAssigned {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(stop),
            },
            Event::HallButtonPressed {
                tick,
                stop,
                direction,
            } => Self::HallButtonPressed {
                tick,
                stop: entity_to_u32(stop),
                direction: call_direction_label(direction).to_string(),
            },
            Event::HallCallAcknowledged {
                tick,
                stop,
                direction,
            } => Self::HallCallAcknowledged {
                tick,
                stop: entity_to_u32(stop),
                direction: call_direction_label(direction).to_string(),
            },
            Event::HallCallCleared {
                tick,
                stop,
                direction,
                car,
            } => Self::HallCallCleared {
                tick,
                stop: entity_to_u32(stop),
                direction: call_direction_label(direction).to_string(),
                car: entity_to_u32(car),
            },
            Event::CarButtonPressed {
                tick,
                car,
                floor,
                rider,
                tag,
            } => Self::CarButtonPressed {
                tick,
                car: entity_to_u32(car),
                floor: entity_to_u32(floor),
                rider: rider.map(entity_to_u32),
                tag,
            },
            Event::DestinationQueued {
                tick,
                elevator,
                stop,
            } => Self::DestinationQueued {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(stop),
            },

            // ── Repositioning ───────────────────────────────────────
            Event::ElevatorRepositioning {
                tick,
                elevator,
                to_stop,
            } => Self::ElevatorRepositioning {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(to_stop),
            },
            Event::ElevatorRepositioned {
                tick,
                elevator,
                at_stop,
            } => Self::ElevatorRepositioned {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(at_stop),
            },
            Event::ElevatorRecalled {
                tick,
                elevator,
                to_stop,
            } => Self::ElevatorRecalled {
                tick,
                elevator: entity_to_u32(elevator),
                to_stop: entity_to_u32(to_stop),
            },

            // ── Topology lifecycle ──────────────────────────────────
            Event::StopAdded {
                tick,
                stop,
                line,
                group,
            } => Self::StopAdded {
                tick,
                stop: entity_to_u32(stop),
                line: entity_to_u32(line),
                group: group.0,
            },
            Event::StopRemoved { tick, stop } => Self::StopRemoved {
                tick,
                stop: entity_to_u32(stop),
            },
            Event::ElevatorAdded {
                tick,
                elevator,
                line,
                group,
            } => Self::ElevatorAdded {
                tick,
                elevator: entity_to_u32(elevator),
                line: entity_to_u32(line),
                group: group.0,
            },
            Event::ElevatorRemoved {
                tick,
                elevator,
                line,
                group,
            } => Self::ElevatorRemoved {
                tick,
                elevator: entity_to_u32(elevator),
                line: entity_to_u32(line),
                group: group.0,
            },
            Event::LineAdded { tick, line, group } => Self::LineAdded {
                tick,
                line: entity_to_u32(line),
                group: group.0,
            },
            Event::LineRemoved { tick, line, group } => Self::LineRemoved {
                tick,
                line: entity_to_u32(line),
                group: group.0,
            },
            Event::LineReassigned {
                tick,
                line,
                old_group,
                new_group,
            } => Self::LineReassigned {
                tick,
                line: entity_to_u32(line),
                old_group: old_group.0,
                new_group: new_group.0,
            },
            Event::ElevatorReassigned {
                tick,
                elevator,
                old_line,
                new_line,
            } => Self::ElevatorReassigned {
                tick,
                elevator: entity_to_u32(elevator),
                old_line: entity_to_u32(old_line),
                new_line: entity_to_u32(new_line),
            },
            Event::EntityDisabled { tick, entity } => Self::EntityDisabled {
                tick,
                entity: entity_to_u32(entity),
            },
            Event::EntityEnabled { tick, entity } => Self::EntityEnabled {
                tick,
                entity: entity_to_u32(entity),
            },
            Event::ResidentsAtRemovedStop { stop, residents } => Self::ResidentsAtRemovedStop {
                tick: 0,
                stop: entity_to_u32(stop),
                residents: residents.into_iter().map(entity_to_u32).collect(),
            },

            // ── Observability ───────────────────────────────────────
            Event::ServiceModeChanged {
                tick,
                elevator,
                from,
                to,
            } => Self::ServiceModeChanged {
                tick,
                elevator: entity_to_u32(elevator),
                from: service_mode_label(from).to_string(),
                to: service_mode_label(to).to_string(),
            },
            Event::ManualVelocityCommanded {
                tick,
                elevator,
                target_velocity,
            } => Self::ManualVelocityCommanded {
                tick,
                elevator: entity_to_u32(elevator),
                target_velocity: target_velocity.map(|v| v.0),
            },
            Event::CapacityChanged {
                tick,
                elevator,
                current_load,
                capacity,
            } => Self::CapacityChanged {
                tick,
                elevator: entity_to_u32(elevator),
                current_load: current_load.0,
                capacity: capacity.0,
            },
            Event::DirectionIndicatorChanged {
                tick,
                elevator,
                going_up,
                going_down,
            } => Self::DirectionIndicatorChanged {
                tick,
                elevator: entity_to_u32(elevator),
                going_up,
                going_down,
            },
            Event::ElevatorUpgraded {
                tick,
                elevator,
                field,
                old,
                new,
            } => Self::ElevatorUpgraded {
                tick,
                elevator: entity_to_u32(elevator),
                field: upgrade_field_label(field).to_string(),
                old: upgrade_value_to_f64(old),
                new: upgrade_value_to_f64(new),
            },
            // EnergyConsumed is feature-gated on core but wasm doesn't
            // enable that feature, so the variant falls into the Unknown
            // fallback below. Mirror the explicit arm here when wasm
            // enables the feature.
            Event::SnapshotDanglingReference { stale_id, tick } => {
                Self::SnapshotDanglingReference {
                    tick,
                    stale_id: entity_to_u32(stale_id),
                }
            }
            Event::RepositionStrategyNotRestored { group } => Self::RepositionStrategyNotRestored {
                tick: 0,
                group: group.0,
            },
            Event::DispatchConfigNotRestored { group, reason } => Self::DispatchConfigNotRestored {
                tick: 0,
                group: group.0,
                reason,
            },

            // ── Forward-compat fallback for new Event variants ──────
            // `Event` is `#[non_exhaustive]`; future variants land here
            // until the binding is updated. The label carries the variant
            // name parsed from `Debug` so consumers can at least log it.
            other => Self::Unknown {
                tick: event_tick(&other),
                label: format!("{other:?}")
                    .split_whitespace()
                    .next()
                    .unwrap_or("Event")
                    .trim_end_matches('{')
                    .to_string(),
            },
        }
    }
}

/// Map [`CallDirection`] to its kebab-case wire label.
fn call_direction_label(d: elevator_core::components::CallDirection) -> &'static str {
    use elevator_core::components::CallDirection;
    match d {
        CallDirection::Up => "up",
        CallDirection::Down => "down",
        _ => "either",
    }
}

/// Map [`ServiceMode`] to its kebab-case wire label.
fn service_mode_label(m: elevator_core::components::ServiceMode) -> &'static str {
    use elevator_core::components::ServiceMode;
    match m {
        ServiceMode::Normal => "normal",
        ServiceMode::Independent => "independent",
        ServiceMode::Inspection => "inspection",
        ServiceMode::Manual => "manual",
        ServiceMode::OutOfService | _ => "out-of-service",
    }
}

/// Map [`DoorCommand`] to its kebab-case wire label. The `ticks`
/// payload on `HoldOpen` is intentionally dropped — the event is for
/// observability, not replay; consumers that need the magnitude pull
/// it from the originating `holdDoor` call.
fn door_command_label(c: elevator_core::door::DoorCommand) -> &'static str {
    use elevator_core::door::DoorCommand;
    match c {
        DoorCommand::Open => "open",
        DoorCommand::Close => "close",
        DoorCommand::HoldOpen { .. } => "hold-open",
        DoorCommand::CancelHold | _ => "cancel-hold",
    }
}

/// Map [`RejectionReason`] to its kebab-case wire label.
fn rejection_label(r: elevator_core::error::RejectionReason) -> &'static str {
    use elevator_core::error::RejectionReason;
    match r {
        RejectionReason::OverCapacity => "over-capacity",
        RejectionReason::PreferenceBased => "preference-based",
        RejectionReason::AccessDenied | _ => "access-denied",
    }
}

/// Map [`RouteInvalidReason`] to its kebab-case wire label.
fn route_invalid_label(r: elevator_core::events::RouteInvalidReason) -> &'static str {
    use elevator_core::events::RouteInvalidReason;
    match r {
        RouteInvalidReason::StopDisabled => "stop-disabled",
        RouteInvalidReason::NoAlternative => "no-alternative",
        RouteInvalidReason::StopRemoved | _ => "stop-removed",
    }
}

/// Map [`UpgradeField`] to its kebab-case wire label.
fn upgrade_field_label(f: elevator_core::events::UpgradeField) -> &'static str {
    use elevator_core::events::UpgradeField;
    match f {
        UpgradeField::MaxSpeed => "max-speed",
        UpgradeField::Acceleration => "acceleration",
        UpgradeField::Deceleration => "deceleration",
        UpgradeField::WeightCapacity => "weight-capacity",
        UpgradeField::DoorTransitionTicks => "door-transition-ticks",
        UpgradeField::DoorOpenTicks | _ => "door-open-ticks",
    }
}

/// Pack [`UpgradeValue`] into a single `f64`. Tick counts cast losslessly
/// into the integer-safe `[0, 2^53]` range; floats pass through.
fn upgrade_value_to_f64(v: elevator_core::events::UpgradeValue) -> f64 {
    use elevator_core::events::UpgradeValue;
    match v {
        UpgradeValue::Float(f) => f.0,
        UpgradeValue::Ticks(t) => f64::from(t),
        // Future variants of `UpgradeValue` (it's `#[non_exhaustive]`)
        // surface as NaN; consumers can detect via `Number.isNaN`.
        _ => f64::NAN,
    }
}

/// Best-effort tick extraction for variants we don't explicitly flatten.
///
/// The field is cosmetic on the `Other` fallback and is parsed from the
/// `Debug` representation of the event, which is a deliberate trade: adding
/// a variant to `Event` in core must not break this crate's build, and an
/// exhaustive match can't be written against a `#[non_exhaustive]` enum.
///
/// Known limitations:
/// - Variants without a `tick` field (`ResidentsAtRemovedStop`,
///   `RepositionStrategyNotRestored` as of this writing) always report `0`.
/// - A future rename of the `Debug`-emitted `tick: ` field name would flip
///   all "other" events to tick `0`. Since the variant name is still carried
///   in `label`, that degradation is noticeable but not a crash.
fn event_tick(event: &Event) -> u64 {
    let dbg = format!("{event:?}");
    dbg.split("tick: ")
        .nth(1)
        .and_then(|s| s.split(|c: char| !c.is_ascii_digit()).next())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
}

/// Cast an `EntityId` to `u32` for JS consumers.
///
/// slotmap keys encode `(slot, version)` in their raw `u64`. Truncating to
/// the low 32 bits keeps the value stable within a single sim run and fits
/// JS `Number` without precision loss. Collisions would only occur after
/// >2^32 entity destructions — far beyond any playground workload.
fn entity_to_u32(id: EntityId) -> u32 {
    let raw = id.data().as_ffi();
    #[allow(clippy::cast_possible_truncation)]
    let slot = raw as u32;
    slot
}

/// Map an `ElevatorPhase` to a short string suitable for CSS class names.
pub fn phase_label(phase: ElevatorPhase) -> &'static str {
    match phase {
        ElevatorPhase::Idle => "idle",
        ElevatorPhase::MovingToStop(_) => "moving",
        ElevatorPhase::Repositioning(_) => "repositioning",
        ElevatorPhase::DoorOpening => "door-opening",
        ElevatorPhase::Loading => "loading",
        ElevatorPhase::DoorClosing => "door-closing",
        ElevatorPhase::Stopped => "stopped",
        _ => "unknown",
    }
}
