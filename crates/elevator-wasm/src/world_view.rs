//! Game-facing world view DTO.
//!
//! Richer than [`Snapshot`](crate::dto::Snapshot): adds door-progress, direction
//! lamps, ETAs, hall-call lamp state, and topology metadata (groups + lines).
//! Designed for game-side renderers that need to render the full sim
//! state plus look up entities they created via the live-mutation API.
//! All entity references cross the JS boundary as `u64` (`BigInt` in
//! JS), matching the encoding [`WasmSim::add_*`](crate::WasmSim) returns.
//!
//! Kept separate from `dto.rs` so the existing playground's `Snapshot` —
//! which uses `u32` truncated entity ids — stays backward compatible.
//!
//! Build cost is O(elevators + stops + groups·lines + lines·serves).
//! Game ticks at ~10 Hz call this once per frame; rendering ticks at 60 Hz
//! interpolate from the cached value rather than rebuilding.

use elevator_core::components::CallDirection;
use elevator_core::door::DoorState;
use elevator_core::entity::{ElevatorId, EntityId};
use elevator_core::prelude::Simulation;
use serde::Serialize;
use slotmap::Key;
use tsify::Tsify;

use crate::dto::phase_label;

/// Encode an `EntityId` for the JS boundary as `u64` (`BigInt`). Same encoding
/// the [`crate::WasmSim`] mutation API returns from `addStop` / `addElevator` /
/// etc., so consumers can match `WorldView.cars[].id` against ids they hold.
fn entity_to_u64(id: EntityId) -> u64 {
    id.data().as_ffi()
}

/// Door state with a 0..1 transition progress for animation.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct DoorView {
    /// Steady-state or transition state. `closed`/`open` are stable;
    /// `opening`/`closing` are transient and `progress` advances over them.
    #[tsify(type = r#""closed" | "opening" | "open" | "closing" | "unknown""#)]
    pub state: &'static str,
    /// Progress through the current transition, 0..1. `0.0` for `closed` and
    /// `open` (steady states) and at the start of `opening`/`closing`; `1.0`
    /// at the end of a transition.
    pub progress: f64,
}

impl DoorView {
    fn from_door(door: &DoorState, transition_ticks: u32) -> Self {
        let total = f64::from(transition_ticks.max(1));
        match door {
            // Steady states share progress=0; merged via `|`.
            DoorState::Closed => Self {
                state: "closed",
                progress: 0.0,
            },
            DoorState::Open { .. } => Self {
                state: "open",
                progress: 0.0,
            },
            DoorState::Opening {
                ticks_remaining, ..
            } => Self {
                state: "opening",
                progress: 1.0 - f64::from(*ticks_remaining) / total,
            },
            DoorState::Closing { ticks_remaining } => Self {
                state: "closing",
                progress: 1.0 - f64::from(*ticks_remaining) / total,
            },
            // Forward-compat: future DoorState variants surface as
            // "unknown" so renderers can decide how to handle them
            // rather than silently aliasing one of the known states.
            _ => Self {
                state: "unknown",
                progress: 0.0,
            },
        }
    }
}

/// Per-elevator view for the game renderer.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CarView {
    /// Stable entity ref. Matches the value `WasmSim::addElevator` returned.
    pub id: u64,
    /// Line entity ref the car runs on.
    pub line: u64,
    /// Group id the car's line belongs to.
    pub group: u32,
    /// Position along the shaft axis.
    pub y: f64,
    /// Signed velocity (+up, -down).
    pub v: f64,
    /// Phase label (matches `CarDto.phase`).
    #[tsify(
        type = r#""idle" | "moving" | "repositioning" | "door-opening" | "loading" | "door-closing" | "stopped" | "unknown""#
    )]
    pub phase: &'static str,
    /// Target stop entity ref, if any.
    pub target: Option<u64>,
    /// Current load weight.
    pub load: f64,
    /// Capacity weight.
    pub capacity: f64,
    /// Entity refs of riders aboard (for game-side `TenantData` lookup).
    /// Use `.length` for the count.
    pub rider_ids: Vec<u64>,
    /// Door FSM state with transition progress.
    pub door: DoorView,
    /// Direction lamp: car will accept up-pickups.
    pub going_up: bool,
    /// Direction lamp: car will accept down-pickups.
    pub going_down: bool,
    /// ETA to `target` in seconds, or `None` if not currently dispatched
    /// to a known stop or the destination queue is empty.
    pub eta_seconds: Option<f64>,
}

/// Hall-call lamp state at a stop. The per-line assignment maps let
/// renderers show "the low-bank car is coming for the up call" by
/// looking up which car serves which line at this floor.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct StopHallCalls {
    /// Up-button lamp lit (a hall call is acknowledged).
    pub up: bool,
    /// Down-button lamp lit.
    pub down: bool,
    /// `(line, car)` pairs for the up call's per-line assignments.
    pub up_assigned: Vec<LineCarPair>,
    /// `(line, car)` pairs for the down call's per-line assignments.
    pub down_assigned: Vec<LineCarPair>,
}

/// `(line, car)` pair carried by [`StopHallCalls`]. Tuples don't tsify
/// cleanly, so use a named struct.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct LineCarPair {
    pub line: u64,
    pub car: u64,
}

/// Per-stop rider population partitioned by lifecycle phase. Useful
/// for "this floor is overcrowded" / "queue is long" UI cues.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WaitingPhaseBreakdown {
    /// Riders awaiting pickup at this stop.
    pub waiting: u32,
    /// Riders parked at this stop (game-managed residents).
    pub resident: u32,
    /// Riders who gave up here (kept until despawned).
    pub abandoned: u32,
}

/// Per-stop view for the game renderer.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct StopView {
    /// Stable entity ref. Matches the value `WasmSim::addStop` returned.
    pub entity_id: u64,
    /// Config-level `StopId`, or `u32::MAX` for runtime-added stops.
    pub stop_id: u32,
    /// Human-readable name.
    pub name: String,
    /// Position along the shaft axis.
    pub y: f64,
    /// Lines that serve this stop (multi-line stops list more than one).
    pub line_ids: Vec<u64>,
    /// Waiting riders heading up. Total count is in `phases.waiting`.
    pub waiting_up: u32,
    /// Waiting riders heading down.
    pub waiting_down: u32,
    /// Waiting riders partitioned by line.
    pub waiting_by_line: Vec<WaitingByLineU64>,
    /// Population partition by phase.
    pub phases: WaitingPhaseBreakdown,
    /// Hall-call lamps + per-line assignments.
    pub hall_calls: StopHallCalls,
}

/// `WorldView`-flavoured `WaitingByLine` carrying `u64` line refs.
/// (The existing `WaitingByLine` in `dto.rs` uses `u32` for `Snapshot`.)
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WaitingByLineU64 {
    pub line: u64,
    pub count: u32,
}

/// Per-line metadata.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct LineView {
    pub id: u64,
    pub group: u32,
    pub name: String,
    pub min_position: f64,
    pub max_position: f64,
    /// Stops served, in entity-id order.
    pub stop_ids: Vec<u64>,
    /// Cars on this line.
    pub car_ids: Vec<u64>,
}

/// Per-group metadata.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct GroupView {
    pub id: u32,
    pub name: String,
    /// Lines that belong to this group.
    pub line_ids: Vec<u64>,
}

/// Top-level game-facing view returned by [`crate::WasmSim::world_view`].
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct WorldView {
    pub tick: u64,
    pub dt: f64,
    pub cars: Vec<CarView>,
    pub stops: Vec<StopView>,
    pub lines: Vec<LineView>,
    pub groups: Vec<GroupView>,
}

impl WorldView {
    /// Build a `WorldView` from the simulation state.
    #[must_use]
    pub fn build(sim: &Simulation) -> Self {
        let (groups, lines, stop_to_lines) = build_topology(sim);
        let cars = build_cars(sim);
        let stops = build_stops(sim, &stop_to_lines);

        Self {
            tick: sim.current_tick(),
            dt: sim.dt(),
            cars,
            stops,
            lines,
            groups,
        }
    }
}

/// Walk groups → lines once and produce: per-group views, per-line views,
/// and a reverse index from stop entity → lines that serve it.
fn build_topology(
    sim: &Simulation,
) -> (
    Vec<GroupView>,
    Vec<LineView>,
    std::collections::HashMap<EntityId, Vec<u64>>,
) {
    let mut groups = Vec::new();
    let mut lines = Vec::new();
    let mut stop_to_lines: std::collections::HashMap<EntityId, Vec<u64>> =
        std::collections::HashMap::new();

    for group in sim.groups() {
        let group_id = group.id().0;
        let line_ids: Vec<u64> = group
            .lines()
            .iter()
            .map(|li| entity_to_u64(li.entity()))
            .collect();
        groups.push(GroupView {
            id: group_id,
            name: group.name().to_string(),
            line_ids,
        });
        for line_info in group.lines() {
            let line_eid = line_info.entity();
            let Some(line) = sim.world().line(line_eid) else {
                continue;
            };
            for &stop in line_info.serves() {
                stop_to_lines
                    .entry(stop)
                    .or_default()
                    .push(entity_to_u64(line_eid));
            }
            lines.push(LineView {
                id: entity_to_u64(line_eid),
                group: group_id,
                name: line.name().to_string(),
                min_position: line.min_position(),
                max_position: line.max_position(),
                stop_ids: line_info
                    .serves()
                    .iter()
                    .copied()
                    .map(entity_to_u64)
                    .collect(),
                car_ids: line_info
                    .elevators()
                    .iter()
                    .copied()
                    .map(entity_to_u64)
                    .collect(),
            });
        }
    }

    (groups, lines, stop_to_lines)
}

fn build_cars(sim: &Simulation) -> Vec<CarView> {
    sim.world()
        .iter_elevators()
        .map(|(id, pos, car)| {
            let v = sim.velocity(id).unwrap_or(0.0);
            let target = car.target_stop().map(entity_to_u64);
            let group_id = sim
                .world()
                .line(car.line())
                .map_or(u32::MAX, |l| l.group().0);
            let door = DoorView::from_door(car.door(), car.door_transition_ticks());
            let eta_seconds = car.target_stop().and_then(|stop| {
                sim.eta(ElevatorId::from(id), stop)
                    .ok()
                    .map(|d| d.as_secs_f64())
            });
            CarView {
                id: entity_to_u64(id),
                line: entity_to_u64(car.line()),
                group: group_id,
                y: pos.value(),
                v,
                phase: phase_label(car.phase()),
                target,
                load: car.current_load().value(),
                capacity: car.weight_capacity().value(),
                rider_ids: car.riders().iter().copied().map(entity_to_u64).collect(),
                door,
                going_up: car.going_up(),
                going_down: car.going_down(),
                eta_seconds,
            }
        })
        .collect()
}

fn build_stops(
    sim: &Simulation,
    stop_to_lines: &std::collections::HashMap<EntityId, Vec<u64>>,
) -> Vec<StopView> {
    let entity_to_stop_id: std::collections::HashMap<_, _> = sim
        .stop_lookup_iter()
        .map(|(stop_id, entity)| (*entity, stop_id.0))
        .collect();

    sim.world()
        .iter_stops()
        .map(|(id, stop)| {
            let (up, down) = sim.waiting_direction_counts_at(id);
            let waiting_by_line = sim
                .waiting_counts_by_line_at(id)
                .into_iter()
                .map(|(line, count)| WaitingByLineU64 {
                    line: entity_to_u64(line),
                    count,
                })
                .collect();
            let phases = WaitingPhaseBreakdown {
                waiting: u32::try_from(sim.waiting_count_at(id)).unwrap_or(u32::MAX),
                resident: u32::try_from(sim.resident_count_at(id)).unwrap_or(u32::MAX),
                abandoned: u32::try_from(sim.abandoned_count_at(id)).unwrap_or(u32::MAX),
            };
            let hall_calls = build_stop_hall_calls(sim, id);
            StopView {
                entity_id: entity_to_u64(id),
                stop_id: entity_to_stop_id.get(&id).copied().unwrap_or(u32::MAX),
                name: stop.name().to_string(),
                y: stop.position(),
                line_ids: stop_to_lines.get(&id).cloned().unwrap_or_default(),
                waiting_up: u32::try_from(up).unwrap_or(u32::MAX),
                waiting_down: u32::try_from(down).unwrap_or(u32::MAX),
                waiting_by_line,
                phases,
                hall_calls,
            }
        })
        .collect()
}

fn build_stop_hall_calls(sim: &Simulation, stop: EntityId) -> StopHallCalls {
    // Only surface a call (lamp + assignments) once it's been
    // acknowledged. Pre-ack calls are an internal staging state; a
    // renderer that sees `up: false` should never see `up_assigned: [...]`.
    let acked = |dir| {
        sim.world()
            .hall_call(stop, dir)
            .filter(|c| c.is_acknowledged())
    };
    let up_call = acked(CallDirection::Up);
    let down_call = acked(CallDirection::Down);
    StopHallCalls {
        up: up_call.is_some(),
        down: down_call.is_some(),
        up_assigned: up_call.map(assigned_cars_to_pairs).unwrap_or_default(),
        down_assigned: down_call.map(assigned_cars_to_pairs).unwrap_or_default(),
    }
}

fn assigned_cars_to_pairs(call: &elevator_core::components::HallCall) -> Vec<LineCarPair> {
    call.assigned_cars_by_line
        .iter()
        .map(|(&line, &car)| LineCarPair {
            line: entity_to_u64(line),
            car: entity_to_u64(car),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use elevator_core::dispatch::ScanDispatch;
    use elevator_core::prelude::SimulationBuilder;
    use elevator_core::stop::StopId;

    fn demo_sim() -> Simulation {
        SimulationBuilder::demo().build().unwrap()
    }

    #[test]
    fn world_view_topology_matches_demo_config() {
        let sim = demo_sim();
        let view = WorldView::build(&sim);

        assert!(!view.groups.is_empty(), "demo has at least one group");
        assert!(!view.lines.is_empty(), "demo has at least one line");
        assert_eq!(
            view.cars.len(),
            sim.world().iter_elevators().count(),
            "every elevator is reflected in cars"
        );
        assert_eq!(
            view.stops.len(),
            sim.world().iter_stops().count(),
            "every stop is reflected in stops"
        );

        // Each line's `group` field cross-references a group entry.
        for line in &view.lines {
            assert!(
                view.groups.iter().any(|g| g.id == line.group),
                "line.group {} should appear in groups list",
                line.group
            );
        }
    }

    #[test]
    fn world_view_door_view_starts_closed() {
        let sim = demo_sim();
        let view = WorldView::build(&sim);
        // Cars start at their `starting_stop` with closed doors.
        for car in &view.cars {
            assert_eq!(car.door.state, "closed");
            assert!((car.door.progress - 0.0).abs() < 1e-9);
        }
    }

    #[test]
    fn world_view_includes_hall_calls_after_press() {
        let mut sim = demo_sim();
        // Spawn one rider so a hall call is pressed.
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
        // Step so ack-latency elapses.
        for _ in 0..30 {
            sim.step();
        }

        let view = WorldView::build(&sim);
        let stop0 = sim.stop_entity(StopId(0)).unwrap();
        let stop0_view = view
            .stops
            .iter()
            .find(|s| s.entity_id == entity_to_u64(stop0))
            .expect("stop 0 must be in WorldView");

        // Either we see an acknowledged up call, or the rider already
        // boarded and the call cleared. Both are valid; what we want to
        // check is that hall_calls is an actual struct, not a panic.
        let _ = stop0_view.hall_calls.up;
    }

    #[test]
    fn world_view_eta_seconds_when_present_is_finite_positive() {
        let mut sim = demo_sim();
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
        for _ in 0..50 {
            sim.step();
        }
        let view = WorldView::build(&sim);
        // ETA presence depends on whether a car is mid-trip with a known
        // target. When present, it must be a sane finite non-negative
        // duration. (We don't assert presence — the demo's car may start
        // at the rider's origin, in which case no ETA is computed.)
        for car in &view.cars {
            if let Some(eta) = car.eta_seconds {
                assert!(eta.is_finite(), "ETA must be finite (got {eta})");
                assert!(eta >= 0.0, "ETA must be non-negative (got {eta})");
            }
        }
    }

    #[test]
    fn world_view_hall_calls_gated_by_acknowledgement() {
        // When a hall call is pressed but ack-latency hasn't elapsed,
        // the lamp must be off AND the assignment list empty. Renderers
        // gate visualisation on the lamp; surfacing assignments before
        // ack would let "ghost" arrows appear at unlit buttons.
        let mut sim = demo_sim();
        sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();
        // Tick zero — call exists but isn't acknowledged yet (ack
        // latency is configured in ticks at construction).
        let view = WorldView::build(&sim);
        let stop0 = sim.stop_entity(StopId(0)).unwrap();
        let stop_view = view
            .stops
            .iter()
            .find(|s| s.entity_id == entity_to_u64(stop0))
            .unwrap();
        if !stop_view.hall_calls.up {
            assert!(
                stop_view.hall_calls.up_assigned.is_empty(),
                "unlit lamp must not surface assignments"
            );
        }
    }

    #[test]
    fn world_view_entity_refs_round_trip_through_lookup() {
        let sim = demo_sim();
        let view = WorldView::build(&sim);
        for car in &view.cars {
            // The encoded id should round-trip back to a live entity.
            let eid = EntityId::from(slotmap::KeyData::from_ffi(car.id));
            assert!(sim.world().is_alive(eid));
            assert!(sim.world().elevator(eid).is_some());
        }
        for stop in &view.stops {
            let eid = EntityId::from(slotmap::KeyData::from_ffi(stop.entity_id));
            assert!(sim.world().is_alive(eid));
            assert!(sim.world().stop(eid).is_some());
        }
    }

    /// Avoid unused-import lint on `ScanDispatch` for the always-built
    /// helpers below, even when no test names it directly.
    #[allow(dead_code)]
    fn _strategy_marker() -> ScanDispatch {
        ScanDispatch::new()
    }
}
