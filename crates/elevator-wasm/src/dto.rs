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

/// Flattened event DTO. Every variant includes a `kind` discriminator and the
/// engine tick at which it was emitted; the remaining fields vary by kind.
/// Unknown variants (added to core later) fall back to `{ kind: "other" }` so
/// the UI stays forward-compatible.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum EventDto {
    RiderSpawned {
        tick: u64,
        rider: u32,
        origin: u32,
        destination: u32,
    },
    RiderBoarded {
        tick: u64,
        rider: u32,
        elevator: u32,
    },
    RiderExited {
        tick: u64,
        rider: u32,
        elevator: u32,
        stop: u32,
    },
    RiderAbandoned {
        tick: u64,
        rider: u32,
        stop: u32,
    },
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
    ElevatorAssigned {
        tick: u64,
        elevator: u32,
        stop: u32,
    },
    /// Idle elevator has been sent to a new parking position by the
    /// group's reposition strategy. Distinguished from `ElevatorAssigned`
    /// so UIs can narrate "repositioning" as its own state rather than
    /// conflating it with a passenger-servicing dispatch.
    ElevatorRepositioning {
        tick: u64,
        elevator: u32,
        stop: u32,
    },
    Other {
        tick: u64,
        label: String,
    },
}

impl From<Event> for EventDto {
    fn from(event: Event) -> Self {
        match event {
            Event::RiderSpawned {
                tick,
                rider,
                origin,
                destination,
            } => Self::RiderSpawned {
                tick,
                rider: entity_to_u32(rider),
                origin: entity_to_u32(origin),
                destination: entity_to_u32(destination),
            },
            Event::RiderBoarded {
                tick,
                rider,
                elevator,
            } => Self::RiderBoarded {
                tick,
                rider: entity_to_u32(rider),
                elevator: entity_to_u32(elevator),
            },
            Event::RiderExited {
                tick,
                rider,
                elevator,
                stop,
            } => Self::RiderExited {
                tick,
                rider: entity_to_u32(rider),
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(stop),
            },
            Event::RiderAbandoned { tick, rider, stop } => Self::RiderAbandoned {
                tick,
                rider: entity_to_u32(rider),
                stop: entity_to_u32(stop),
            },
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
            Event::ElevatorAssigned {
                tick,
                elevator,
                stop,
            } => Self::ElevatorAssigned {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(stop),
            },
            Event::ElevatorRepositioning {
                tick,
                elevator,
                to_stop,
            } => Self::ElevatorRepositioning {
                tick,
                elevator: entity_to_u32(elevator),
                stop: entity_to_u32(to_stop),
            },
            other => Self::Other {
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
fn phase_label(phase: ElevatorPhase) -> &'static str {
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
