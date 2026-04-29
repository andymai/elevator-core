//! Tag propagation through rider-bearing events.
//!
//! [`Rider.tag`](crate::components::Rider::tag) is read at emit time and
//! attached to every rider-bearing [`Event`] variant. Consumers
//! correlate events with their own object space without an extra lookup
//! — and crucially without re-querying the rider after `RiderExited` /
//! `RiderDespawned`, where the [`RiderId`](crate::entity::RiderId) is
//! freed before the event fires.
//!
//! These tests pin the contract per variant: set a distinguishable tag,
//! drive the sim into the relevant code path, drain events, and assert
//! the tag came through. `0` is the reserved untagged sentinel for
//! riders that never had `set_rider_tag` called on them.

use crate::components::Patience;
use crate::dispatch::scan::ScanDispatch;
use crate::entity::ElevatorId;
use crate::events::{Event, RouteInvalidReason};
use crate::sim::Simulation;
use crate::stop::StopId;
use crate::tests::helpers::default_config;

/// A bit pattern obviously distinct from the `0` untagged sentinel and
/// from any small accidental value the engine might write.
const SENTINEL: u64 = 0xDEAD_BEEF_CAFE_F00D;

#[test]
fn rider_spawned_carries_default_zero_tag() {
    // RiderSpawned fires inside spawn_rider, before the consumer has a
    // chance to call set_rider_tag. The tag on this event is therefore
    // always 0; consumers wanting the tag-on-spawn-event signal should
    // call set_rider_tag *before* the next step that drains.
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let _rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let events = sim.drain_events();
    let spawned = events
        .iter()
        .find(|e| matches!(e, Event::RiderSpawned { .. }))
        .expect("RiderSpawned must fire on spawn_rider");
    let Event::RiderSpawned { tag, .. } = spawned else {
        unreachable!()
    };
    assert_eq!(*tag, 0, "RiderSpawned for an untagged rider must carry 0");
}

#[test]
fn rider_boarded_carries_tag() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();
    sim.drain_events();

    let mut found = None;
    for _ in 0..200 {
        sim.step();
        for event in sim.drain_events() {
            if let Event::RiderBoarded { tag, .. } = event {
                found = Some(tag);
                break;
            }
        }
        if found.is_some() {
            break;
        }
    }
    assert_eq!(
        found,
        Some(SENTINEL),
        "RiderBoarded must carry the tag set before boarding"
    );
}

#[test]
fn rider_exited_carries_tag_sampled_before_free() {
    // The interesting case: by the time a consumer sees RiderExited the
    // rider's RiderId may have been freed. The event must carry the
    // tag inline so the consumer can dispatch correctly without re-
    // querying.
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();
    sim.drain_events();

    let mut found = None;
    for _ in 0..400 {
        sim.step();
        for event in sim.drain_events() {
            if let Event::RiderExited { tag, .. } = event {
                found = Some(tag);
                break;
            }
        }
        if found.is_some() {
            break;
        }
    }
    assert_eq!(found, Some(SENTINEL));
}

#[test]
fn rider_abandoned_carries_tag() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();
    // Force abandonment quickly via a 1-tick patience budget.
    sim.world_mut().set_patience(
        rider.entity(),
        Patience {
            waited_ticks: 0,
            max_wait_ticks: 1,
        },
    );
    sim.drain_events();

    let mut found = None;
    for _ in 0..50 {
        sim.step();
        for event in sim.drain_events() {
            if let Event::RiderAbandoned { tag, .. } = event {
                found = Some(tag);
                break;
            }
        }
        if found.is_some() {
            break;
        }
    }
    assert_eq!(found, Some(SENTINEL));
}

#[test]
fn rider_despawned_carries_tag_sampled_before_free() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();
    sim.drain_events();

    sim.despawn_rider(rider).unwrap();
    let despawned = sim
        .drain_events()
        .into_iter()
        .find(|e| matches!(e, Event::RiderDespawned { .. }))
        .expect("RiderDespawned must fire on despawn_rider");
    let Event::RiderDespawned { tag, .. } = despawned else {
        unreachable!()
    };
    assert_eq!(tag, SENTINEL);
}

#[test]
fn rider_settled_carries_tag() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();
    for _ in 0..400 {
        sim.step();
        if sim
            .world()
            .rider(rider.entity())
            .is_some_and(|r| r.phase == crate::components::RiderPhase::Arrived)
        {
            break;
        }
    }
    sim.drain_events();
    sim.settle_rider(rider).unwrap();
    let settled = sim
        .drain_events()
        .into_iter()
        .find(|e| matches!(e, Event::RiderSettled { .. }))
        .expect("RiderSettled must fire after settle_rider");
    let Event::RiderSettled { tag, .. } = settled else {
        unreachable!()
    };
    assert_eq!(tag, SENTINEL);
}

#[test]
fn rider_rerouted_carries_tag() {
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();
    sim.drain_events();

    // Reroute mid-Waiting (rider hasn't boarded yet — they're still at
    // the origin stop).
    let stop_1 = sim.stop_entity(StopId(1)).unwrap();
    sim.reroute(rider, stop_1).unwrap();
    let rerouted = sim
        .drain_events()
        .into_iter()
        .find(|e| matches!(e, Event::RiderRerouted { .. }))
        .expect("RiderRerouted must fire after reroute");
    let Event::RiderRerouted { tag, .. } = rerouted else {
        unreachable!()
    };
    assert_eq!(tag, SENTINEL);
}

#[test]
fn route_invalidated_carries_tag() {
    // Disabling a stop on a rider's route emits RouteInvalidated. The
    // tag must come through.
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();
    sim.drain_events();

    let dest = sim.stop_entity(StopId(2)).unwrap();
    sim.disable(dest).unwrap();
    sim.step();
    let mut found = None;
    for event in sim.drain_events() {
        if let Event::RouteInvalidated { tag, reason, .. } = event {
            found = Some((tag, reason));
            break;
        }
    }
    assert!(matches!(
        found,
        Some((SENTINEL, RouteInvalidReason::StopDisabled))
    ));
}

#[test]
fn untagged_rider_yields_zero_in_every_event() {
    // Defensive: a rider that never had set_rider_tag called must
    // surface tag = 0 in every variant we hit. Combined with the
    // per-variant tests above, this rules out a bug where the engine
    // accidentally uses some other rider's tag.
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let _rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();

    for _ in 0..400 {
        sim.step();
        for event in sim.drain_events() {
            let tag = match event {
                Event::RiderSpawned { tag, .. }
                | Event::RiderBoarded { tag, .. }
                | Event::RiderExited { tag, .. }
                | Event::RiderRejected { tag, .. }
                | Event::RiderAbandoned { tag, .. }
                | Event::RiderEjected { tag, .. }
                | Event::RiderSettled { tag, .. }
                | Event::RiderDespawned { tag, .. }
                | Event::RiderRerouted { tag, .. }
                | Event::RiderSkipped { tag, .. }
                | Event::RouteInvalidated { tag, .. } => Some(tag),
                Event::CarButtonPressed { tag, .. } => tag,
                _ => None,
            };
            if let Some(t) = tag {
                assert_eq!(t, 0, "untagged rider must surface tag=0 on every event");
            }
        }
    }
}

#[test]
fn synthetic_car_button_press_has_none_tag() {
    // CarButtonPressed for a synthetic press has rider = None, and per
    // the contract must therefore have tag = None — there is no rider
    // to read the tag from.
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let car_eid = sim.world().iter_elevators().next().unwrap().0;
    let car = ElevatorId::from(car_eid);
    let floor = sim.stop_entity(StopId(2)).unwrap();
    sim.press_car_button(car, floor).unwrap();
    let pressed = sim
        .drain_events()
        .into_iter()
        .find(|e| matches!(e, Event::CarButtonPressed { .. }))
        .expect("synthetic press must emit CarButtonPressed");
    let Event::CarButtonPressed { rider, tag, .. } = pressed else {
        unreachable!()
    };
    assert!(rider.is_none(), "synthetic press must have rider = None");
    assert!(
        tag.is_none(),
        "synthetic press must have tag = None to mirror the absent rider"
    );
}

#[test]
fn rider_ejected_carries_tag() {
    // Disabling an elevator with a rider aboard ejects them; the event
    // must carry the rider's tag.
    let mut sim = Simulation::new(&default_config(), ScanDispatch::new()).unwrap();
    let rider = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(rider, SENTINEL).unwrap();

    let car_eid = sim.world().iter_elevators().next().unwrap().0;
    let aboard = (0..200).any(|_| {
        sim.step();
        sim.world()
            .elevator(car_eid)
            .is_some_and(|c| c.riders.contains(&rider.entity()))
    });
    assert!(aboard, "rider should board within 200 ticks");
    sim.drain_events();

    sim.disable(car_eid).unwrap();
    let ejected = sim
        .drain_events()
        .into_iter()
        .find(|e| matches!(e, Event::RiderEjected { .. }))
        .expect("RiderEjected must fire when an occupied car is disabled");
    let Event::RiderEjected { tag, .. } = ejected else {
        unreachable!()
    };
    assert_eq!(tag, SENTINEL);
}

#[test]
fn rider_skipped_or_rejected_carries_tag() {
    // Force a tagged rider into a Reject/Skip path by capping the car
    // capacity below two riders' combined weight, then asserting the
    // tag comes through whichever event fires.
    let mut config = default_config();
    config.elevators[0].weight_capacity = crate::components::Weight::from(80.0);
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let _filler = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    let blocked = sim.spawn_rider(StopId(0), StopId(2), 70.0).unwrap();
    sim.set_rider_tag(blocked, SENTINEL).unwrap();

    let mut found_tag = None;
    for _ in 0..400 {
        sim.step();
        for event in sim.drain_events() {
            match event {
                Event::RiderRejected { tag, rider, .. }
                | Event::RiderSkipped { tag, rider, .. }
                    if rider == blocked.entity() =>
                {
                    found_tag = Some(tag);
                }
                _ => {}
            }
        }
        if found_tag.is_some() {
            break;
        }
    }
    assert_eq!(
        found_tag,
        Some(SENTINEL),
        "Reject/Skip for tagged rider must carry the tag"
    );
}
