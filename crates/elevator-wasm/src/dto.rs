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

/// Per-elevator rendering snapshot.
#[derive(Serialize)]
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
    pub phase: &'static str,
    /// Target stop entity id, if any.
    pub target: Option<u32>,
    /// Current load weight.
    pub load: f64,
    /// Capacity weight.
    pub capacity: f64,
    /// Number of riders currently aboard.
    pub riders: u32,
}

/// Per-stop rendering snapshot.
#[derive(Serialize)]
pub struct StopDto {
    /// Stable entity id (matches `CarDto.target` for rendering assignment lines).
    pub entity_id: u32,
    /// Config-level `StopId`. The UI passes this back to `spawnRider` to
    /// create riders between stops — `spawnRider` takes `StopId`, not
    /// entity id, so the snapshot surfaces both.
    pub stop_id: u32,
    /// Human-readable stop name.
    pub name: String,
    /// Position along the shaft axis.
    pub y: f64,
    /// Waiting rider count (O(1)).
    pub waiting: u32,
    /// Resident rider count (O(1)).
    pub residents: u32,
}

/// Top-level snapshot returned by [`WasmSim::snapshot`](crate::WasmSim::snapshot).
#[derive(Serialize)]
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
        let cars = sim
            .world()
            .iter_elevators()
            .map(|(id, pos, car)| {
                let v = sim.velocity(id).unwrap_or(0.0);
                let target = car.target_stop().map(entity_to_u32);
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
            .map(|(id, stop)| StopDto {
                entity_id: entity_to_u32(id),
                stop_id: entity_to_stop_id.get(&id).copied().unwrap_or(0),
                name: stop.name().to_string(),
                y: stop.position(),
                waiting: u32::try_from(sim.waiting_count_at(id)).unwrap_or(u32::MAX),
                residents: u32::try_from(sim.resident_count_at(id)).unwrap_or(u32::MAX),
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
#[derive(Serialize)]
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
#[derive(Serialize)]
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

/// Best-effort tick extraction for variants we don't explicitly flatten. The
/// field is cosmetic for the "Other" fallback and falls back to 0 if parsing
/// fails — we don't want the playground to crash on an enum addition.
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
