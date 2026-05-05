//! Per-variant `Event` → [`EvEvent`] encoders.
//!
//! Each public `Event` variant has a dedicated free function here. The
//! dispatcher in [`crate::refill_pending_events`] routes each `Event` to
//! the matching helper; the helper destructures and writes FFI-shaped
//! fields onto a zero-initialised [`EvEvent`] skeleton.
//!
//! Variants the FFI hasn't enumerated yet fall through to the
//! dispatcher's `_ =>` arm and surface as
//! [`UNKNOWN`](crate::ev_event_kind::UNKNOWN), keeping consumers
//! forward-compatible.

// Helpers consume the `Event` they encode — semantically a transform,
// not a read. Internal fields being mostly `Copy` doesn't change that;
// pass-by-reference would force every helper to deref `Copy` field
// bindings for no real benefit.
#![allow(clippy::needless_pass_by_value)]

use elevator_core::events::Event;

use crate::{
    EvEvent, encode_direction, encode_door_command, encode_rejection_reason,
    encode_route_invalid_reason, encode_service_mode, encode_upgrade_field, entity_to_u64,
    ev_event_kind, ev_event_skeleton,
};

/// Used in every helper when the dispatcher routes the wrong variant
/// here — should be unreachable in well-formed code.
macro_rules! wrong_variant {
    ($name:literal) => {
        unreachable!(concat!(
            "events_encode::",
            $name,
            " called with non-matching Event variant"
        ))
    };
}

// ── Hall calls ──────────────────────────────────────────────────────────

pub fn hall_button_pressed(event: Event) -> EvEvent {
    let Event::HallButtonPressed {
        stop,
        direction,
        tick,
    } = event
    else {
        wrong_variant!("hall_button_pressed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::HALL_BUTTON_PRESSED, tick);
    e.direction = encode_direction(direction);
    e.stop = entity_to_u64(stop);
    e
}

pub fn hall_call_acknowledged(event: Event) -> EvEvent {
    let Event::HallCallAcknowledged {
        stop,
        direction,
        tick,
    } = event
    else {
        wrong_variant!("hall_call_acknowledged");
    };
    let mut e = ev_event_skeleton(ev_event_kind::HALL_CALL_ACKNOWLEDGED, tick);
    e.direction = encode_direction(direction);
    e.stop = entity_to_u64(stop);
    e
}

pub fn hall_call_cleared(event: Event) -> EvEvent {
    let Event::HallCallCleared {
        stop,
        direction,
        car,
        tick,
    } = event
    else {
        wrong_variant!("hall_call_cleared");
    };
    let mut e = ev_event_skeleton(ev_event_kind::HALL_CALL_CLEARED, tick);
    e.direction = encode_direction(direction);
    e.stop = entity_to_u64(stop);
    e.car = entity_to_u64(car);
    e
}

pub fn car_button_pressed(event: Event) -> EvEvent {
    let Event::CarButtonPressed {
        car,
        floor,
        rider,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("car_button_pressed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::CAR_BUTTON_PRESSED, tick);
    e.car = entity_to_u64(car);
    e.rider = rider.map_or(0, entity_to_u64);
    e.floor = entity_to_u64(floor);
    e.tag = tag.unwrap_or(0);
    e
}

// ── Rider lifecycle ─────────────────────────────────────────────────────

pub fn rider_skipped(event: Event) -> EvEvent {
    let Event::RiderSkipped {
        rider,
        elevator,
        at_stop,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_skipped");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_SKIPPED, tick);
    e.stop = entity_to_u64(at_stop);
    e.car = entity_to_u64(elevator);
    e.rider = entity_to_u64(rider);
    e.tag = tag;
    e
}

pub fn rider_spawned(event: Event) -> EvEvent {
    let Event::RiderSpawned {
        rider,
        origin,
        destination,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_spawned");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_SPAWNED, tick);
    e.stop = entity_to_u64(origin);
    e.rider = entity_to_u64(rider);
    e.floor = entity_to_u64(destination);
    e.tag = tag;
    e
}

pub fn rider_boarded(event: Event) -> EvEvent {
    let Event::RiderBoarded {
        rider,
        elevator,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_boarded");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_BOARDED, tick);
    e.car = entity_to_u64(elevator);
    e.rider = entity_to_u64(rider);
    e.tag = tag;
    e
}

pub fn rider_exited(event: Event) -> EvEvent {
    let Event::RiderExited {
        rider,
        elevator,
        stop,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_exited");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_EXITED, tick);
    e.stop = entity_to_u64(stop);
    e.car = entity_to_u64(elevator);
    e.rider = entity_to_u64(rider);
    e.tag = tag;
    e
}

pub fn rider_abandoned(event: Event) -> EvEvent {
    let Event::RiderAbandoned {
        rider,
        stop,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_abandoned");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_ABANDONED, tick);
    e.stop = entity_to_u64(stop);
    e.rider = entity_to_u64(rider);
    e.tag = tag;
    e
}

pub fn rider_ejected(event: Event) -> EvEvent {
    let Event::RiderEjected {
        rider,
        elevator,
        stop,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_ejected");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_EJECTED, tick);
    e.stop = entity_to_u64(stop);
    e.car = entity_to_u64(elevator);
    e.rider = entity_to_u64(rider);
    e.tag = tag;
    e
}

pub fn rider_rejected(event: Event) -> EvEvent {
    let Event::RiderRejected {
        rider,
        elevator,
        reason,
        context,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_rejected");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_REJECTED, tick);
    e.car = entity_to_u64(elevator);
    e.rider = entity_to_u64(rider);
    e.code1 = encode_rejection_reason(reason);
    // Surface attempted_weight + current_load for capacity-based
    // rejections; `RejectionContext` is `None` for preference-based /
    // access-denied rejections, in which case both floats stay NaN to
    // signal "not applicable".
    let (attempted, load) = context.map_or((f64::NAN, f64::NAN), |c| {
        (c.attempted_weight.into_inner(), c.current_load.into_inner())
    });
    e.f1 = attempted;
    e.f2 = load;
    e.tag = tag;
    e
}

pub fn rider_rerouted(event: Event) -> EvEvent {
    let Event::RiderRerouted {
        rider,
        new_destination,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_rerouted");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_REROUTED, tick);
    e.rider = entity_to_u64(rider);
    e.floor = entity_to_u64(new_destination);
    e.tag = tag;
    e
}

pub fn rider_settled(event: Event) -> EvEvent {
    let Event::RiderSettled {
        rider,
        stop,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("rider_settled");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_SETTLED, tick);
    e.stop = entity_to_u64(stop);
    e.rider = entity_to_u64(rider);
    e.tag = tag;
    e
}

pub fn rider_despawned(event: Event) -> EvEvent {
    let Event::RiderDespawned { rider, tag, tick } = event else {
        wrong_variant!("rider_despawned");
    };
    let mut e = ev_event_skeleton(ev_event_kind::RIDER_DESPAWNED, tick);
    e.rider = entity_to_u64(rider);
    e.tag = tag;
    e
}

pub fn route_invalidated(event: Event) -> EvEvent {
    let Event::RouteInvalidated {
        rider,
        affected_stop,
        reason,
        tag,
        tick,
    } = event
    else {
        wrong_variant!("route_invalidated");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ROUTE_INVALIDATED, tick);
    e.rider = entity_to_u64(rider);
    e.stop = entity_to_u64(affected_stop);
    e.code1 = encode_route_invalid_reason(reason);
    e.tag = tag;
    e
}

// ── Elevator motion ─────────────────────────────────────────────────────

pub fn elevator_departed(event: Event) -> EvEvent {
    let Event::ElevatorDeparted {
        elevator,
        from_stop,
        tick,
    } = event
    else {
        wrong_variant!("elevator_departed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_DEPARTED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(from_stop);
    e
}

pub fn elevator_arrived(event: Event) -> EvEvent {
    let Event::ElevatorArrived {
        elevator,
        at_stop,
        tick,
    } = event
    else {
        wrong_variant!("elevator_arrived");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_ARRIVED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(at_stop);
    e
}

pub fn door_opened(event: Event) -> EvEvent {
    let Event::DoorOpened { elevator, tick } = event else {
        wrong_variant!("door_opened");
    };
    let mut e = ev_event_skeleton(ev_event_kind::DOOR_OPENED, tick);
    e.car = entity_to_u64(elevator);
    e
}

pub fn door_closed(event: Event) -> EvEvent {
    let Event::DoorClosed { elevator, tick } = event else {
        wrong_variant!("door_closed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::DOOR_CLOSED, tick);
    e.car = entity_to_u64(elevator);
    e
}

pub fn passing_floor(event: Event) -> EvEvent {
    let Event::PassingFloor {
        elevator,
        stop,
        moving_up,
        tick,
    } = event
    else {
        wrong_variant!("passing_floor");
    };
    let mut e = ev_event_skeleton(ev_event_kind::PASSING_FLOOR, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(stop);
    e.direction = if moving_up { 1 } else { -1 };
    e
}

pub fn movement_aborted(event: Event) -> EvEvent {
    let Event::MovementAborted {
        elevator,
        brake_target,
        tick,
    } = event
    else {
        wrong_variant!("movement_aborted");
    };
    let mut e = ev_event_skeleton(ev_event_kind::MOVEMENT_ABORTED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(brake_target);
    e
}

// ── Dispatch + repositioning ────────────────────────────────────────────

pub fn elevator_assigned(event: Event) -> EvEvent {
    let Event::ElevatorAssigned {
        elevator,
        stop,
        tick,
    } = event
    else {
        wrong_variant!("elevator_assigned");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_ASSIGNED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(stop);
    e
}

pub fn elevator_repositioning(event: Event) -> EvEvent {
    let Event::ElevatorRepositioning {
        elevator,
        to_stop,
        tick,
    } = event
    else {
        wrong_variant!("elevator_repositioning");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_REPOSITIONING, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(to_stop);
    e
}

pub fn elevator_repositioned(event: Event) -> EvEvent {
    let Event::ElevatorRepositioned {
        elevator,
        at_stop,
        tick,
    } = event
    else {
        wrong_variant!("elevator_repositioned");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_REPOSITIONED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(at_stop);
    e
}

pub fn elevator_recalled(event: Event) -> EvEvent {
    let Event::ElevatorRecalled {
        elevator,
        to_stop,
        tick,
    } = event
    else {
        wrong_variant!("elevator_recalled");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_RECALLED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(to_stop);
    e
}

// ── Topology lifecycle ──────────────────────────────────────────────────

pub fn stop_added(event: Event) -> EvEvent {
    let Event::StopAdded {
        stop,
        line,
        group,
        tick,
    } = event
    else {
        wrong_variant!("stop_added");
    };
    let mut e = ev_event_skeleton(ev_event_kind::STOP_ADDED, tick);
    e.stop = entity_to_u64(stop);
    e.entity = entity_to_u64(line);
    e.group = group.0;
    e
}

pub fn elevator_added(event: Event) -> EvEvent {
    let Event::ElevatorAdded {
        elevator,
        line,
        group,
        tick,
    } = event
    else {
        wrong_variant!("elevator_added");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_ADDED, tick);
    e.car = entity_to_u64(elevator);
    e.entity = entity_to_u64(line);
    e.group = group.0;
    e
}

pub fn elevator_removed(event: Event) -> EvEvent {
    let Event::ElevatorRemoved {
        elevator,
        line,
        group,
        tick,
    } = event
    else {
        wrong_variant!("elevator_removed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_REMOVED, tick);
    e.car = entity_to_u64(elevator);
    e.entity = entity_to_u64(line);
    e.group = group.0;
    e
}

pub fn stop_removed(event: Event) -> EvEvent {
    let Event::StopRemoved { stop, tick } = event else {
        wrong_variant!("stop_removed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::STOP_REMOVED, tick);
    e.stop = entity_to_u64(stop);
    e
}

pub fn entity_disabled(event: Event) -> EvEvent {
    let Event::EntityDisabled { entity, tick } = event else {
        wrong_variant!("entity_disabled");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ENTITY_DISABLED, tick);
    e.entity = entity_to_u64(entity);
    e
}

pub fn entity_enabled(event: Event) -> EvEvent {
    let Event::EntityEnabled { entity, tick } = event else {
        wrong_variant!("entity_enabled");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ENTITY_ENABLED, tick);
    e.entity = entity_to_u64(entity);
    e
}

pub fn line_added(event: Event) -> EvEvent {
    let Event::LineAdded { line, group, tick } = event else {
        wrong_variant!("line_added");
    };
    let mut e = ev_event_skeleton(ev_event_kind::LINE_ADDED, tick);
    e.entity = entity_to_u64(line);
    e.group = group.0;
    e
}

pub fn line_removed(event: Event) -> EvEvent {
    let Event::LineRemoved { line, group, tick } = event else {
        wrong_variant!("line_removed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::LINE_REMOVED, tick);
    e.entity = entity_to_u64(line);
    e.group = group.0;
    e
}

pub fn line_reassigned(event: Event) -> EvEvent {
    let Event::LineReassigned {
        line,
        old_group,
        new_group,
        tick,
    } = event
    else {
        wrong_variant!("line_reassigned");
    };
    let mut e = ev_event_skeleton(ev_event_kind::LINE_REASSIGNED, tick);
    e.entity = entity_to_u64(line);
    e.group = new_group.0;
    e.count = u64::from(old_group.0);
    e
}

pub fn elevator_reassigned(event: Event) -> EvEvent {
    let Event::ElevatorReassigned {
        elevator,
        old_line,
        new_line,
        tick,
    } = event
    else {
        wrong_variant!("elevator_reassigned");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_REASSIGNED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(new_line);
    e.entity = entity_to_u64(old_line);
    e
}

pub fn residents_at_removed_stop(event: Event) -> EvEvent {
    let Event::ResidentsAtRemovedStop { stop, residents } = event else {
        wrong_variant!("residents_at_removed_stop");
    };
    // No `tick` field on this variant — it's emitted at remove time and
    // the caller knows the tick from surrounding events. Use 0 as a
    // sentinel; the count is the meaningful payload here.
    let mut e = ev_event_skeleton(ev_event_kind::RESIDENTS_AT_REMOVED_STOP, 0);
    e.stop = entity_to_u64(stop);
    e.count = residents.len() as u64;
    e
}

// ── Service mode + manual + indicators ──────────────────────────────────

pub fn service_mode_changed(event: Event) -> EvEvent {
    let Event::ServiceModeChanged {
        elevator,
        from,
        to,
        tick,
    } = event
    else {
        wrong_variant!("service_mode_changed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::SERVICE_MODE_CHANGED, tick);
    e.car = entity_to_u64(elevator);
    e.code1 = encode_service_mode(to);
    e.code2 = encode_service_mode(from);
    e
}

pub fn manual_velocity_commanded(event: Event) -> EvEvent {
    let Event::ManualVelocityCommanded {
        elevator,
        target_velocity,
        tick,
    } = event
    else {
        wrong_variant!("manual_velocity_commanded");
    };
    let mut e = ev_event_skeleton(ev_event_kind::MANUAL_VELOCITY_COMMANDED, tick);
    e.car = entity_to_u64(elevator);
    // OrderedFloat derefs to f64; map_or with a closure trips
    // clippy::redundant_closure_for_method_calls, and Deref::deref is the
    // method form clippy wants — but adding the trait import for a single
    // call is heavier than just dereffing.
    e.f1 = target_velocity.map_or(f64::NAN, |v| *v);
    e
}

pub fn direction_indicator_changed(event: Event) -> EvEvent {
    let Event::DirectionIndicatorChanged {
        elevator,
        going_up,
        going_down,
        tick,
    } = event
    else {
        wrong_variant!("direction_indicator_changed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::DIRECTION_INDICATOR_CHANGED, tick);
    e.car = entity_to_u64(elevator);
    e.code1 = u8::from(going_up);
    e.code2 = u8::from(going_down);
    e
}

// ── Doors ───────────────────────────────────────────────────────────────

pub fn door_command_queued(event: Event) -> EvEvent {
    let Event::DoorCommandQueued {
        elevator,
        command,
        tick,
    } = event
    else {
        wrong_variant!("door_command_queued");
    };
    let mut e = ev_event_skeleton(ev_event_kind::DOOR_COMMAND_QUEUED, tick);
    let (code, hold_ticks) = encode_door_command(command);
    e.car = entity_to_u64(elevator);
    e.code1 = code;
    e.count = u64::from(hold_ticks);
    e
}

pub fn door_command_applied(event: Event) -> EvEvent {
    let Event::DoorCommandApplied {
        elevator,
        command,
        tick,
    } = event
    else {
        wrong_variant!("door_command_applied");
    };
    let mut e = ev_event_skeleton(ev_event_kind::DOOR_COMMAND_APPLIED, tick);
    let (code, hold_ticks) = encode_door_command(command);
    e.car = entity_to_u64(elevator);
    e.code1 = code;
    e.count = u64::from(hold_ticks);
    e
}

// ── Observability ───────────────────────────────────────────────────────

pub fn capacity_changed(event: Event) -> EvEvent {
    let Event::CapacityChanged {
        elevator,
        current_load,
        capacity,
        tick,
    } = event
    else {
        wrong_variant!("capacity_changed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::CAPACITY_CHANGED, tick);
    e.car = entity_to_u64(elevator);
    e.f1 = current_load.into_inner();
    e.f2 = capacity.into_inner();
    e
}

pub fn elevator_idle(event: Event) -> EvEvent {
    let Event::ElevatorIdle {
        elevator,
        at_stop,
        tick,
    } = event
    else {
        wrong_variant!("elevator_idle");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_IDLE, tick);
    e.car = entity_to_u64(elevator);
    e.stop = at_stop.map_or(0, entity_to_u64);
    e
}

pub fn destination_queued(event: Event) -> EvEvent {
    let Event::DestinationQueued {
        elevator,
        stop,
        tick,
    } = event
    else {
        wrong_variant!("destination_queued");
    };
    let mut e = ev_event_skeleton(ev_event_kind::DESTINATION_QUEUED, tick);
    e.car = entity_to_u64(elevator);
    e.stop = entity_to_u64(stop);
    e
}

pub fn elevator_upgraded(event: Event) -> EvEvent {
    use elevator_core::events::UpgradeValue;
    let Event::ElevatorUpgraded {
        elevator,
        field,
        new,
        tick,
        ..
    } = event
    else {
        wrong_variant!("elevator_upgraded");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ELEVATOR_UPGRADED, tick);
    e.car = entity_to_u64(elevator);
    e.code1 = encode_upgrade_field(field);
    match new {
        UpgradeValue::Float(v) => {
            e.f1 = v.into_inner();
            e.count = u64::MAX;
        }
        UpgradeValue::Ticks(v) => {
            e.f1 = f64::NAN;
            e.count = u64::from(v);
        }
        _ => {
            e.f1 = f64::NAN;
            e.count = u64::MAX;
        }
    }
    e
}

#[cfg(feature = "energy")]
pub fn energy_consumed(event: Event) -> EvEvent {
    let Event::EnergyConsumed {
        elevator,
        consumed,
        regenerated,
        tick,
    } = event
    else {
        wrong_variant!("energy_consumed");
    };
    let mut e = ev_event_skeleton(ev_event_kind::ENERGY_CONSUMED, tick);
    e.car = entity_to_u64(elevator);
    e.f1 = consumed.into_inner();
    e.f2 = regenerated.into_inner();
    e
}

// ── Snapshot diagnostics ────────────────────────────────────────────────

pub fn snapshot_dangling_reference(event: Event) -> EvEvent {
    let Event::SnapshotDanglingReference { stale_id, tick } = event else {
        wrong_variant!("snapshot_dangling_reference");
    };
    let mut e = ev_event_skeleton(ev_event_kind::SNAPSHOT_DANGLING_REFERENCE, tick);
    e.entity = entity_to_u64(stale_id);
    e
}

pub fn reposition_strategy_not_restored(event: Event) -> EvEvent {
    let Event::RepositionStrategyNotRestored { group } = event else {
        wrong_variant!("reposition_strategy_not_restored");
    };
    let mut e = ev_event_skeleton(ev_event_kind::REPOSITION_STRATEGY_NOT_RESTORED, 0);
    e.group = group.0;
    e
}

pub fn dispatch_config_not_restored(event: Event) -> EvEvent {
    let Event::DispatchConfigNotRestored { group, .. } = event else {
        wrong_variant!("dispatch_config_not_restored");
    };
    let mut e = ev_event_skeleton(ev_event_kind::DISPATCH_CONFIG_NOT_RESTORED, 0);
    e.group = group.0;
    e
}
