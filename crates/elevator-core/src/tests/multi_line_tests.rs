//! Tests for multi-line and multi-group simulation support.

use crate::components::{Orientation, RiderPhase, Route, RouteLeg, TransportMode};
use crate::config::{
    BuildingConfig, ElevatorConfig, GroupConfig, LineConfig, PassengerSpawnConfig, SimConfig,
    SimulationParams,
};
use crate::dispatch::scan::ScanDispatch;
use crate::error::SimError;
use crate::ids::GroupId;
use crate::sim::Simulation;
use crate::stop::{StopConfig, StopId};

// ── Config helpers ────────────────────────────────────────────────────────────

/// 3-stop, 2-line, 2-group config.
///
/// ```
/// Stops:  Ground(0) ─── Transfer(1) ─── Top(2)
/// Line 1: Ground ──── Transfer           (Group 0)
/// Line 2:             Transfer ──── Top  (Group 1)
/// ```
fn two_group_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Transfer Tower".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Ground".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Transfer".into(),
                    position: 10.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "Top".into(),
                    position: 20.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "Low".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "L1".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "High".into(),
                    serves: vec![StopId(1), StopId(2)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "H1".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(1),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
            ]),
            groups: Some(vec![
                GroupConfig {
                    id: 0,
                    name: "Low Rise".into(),
                    lines: vec![1],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                },
                GroupConfig {
                    id: 1,
                    name: "High Rise".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                },
            ]),
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

/// Config where both lines/groups serve the same set of stops (for ambiguity tests).
fn overlapping_groups_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Overlap Tower".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Bottom".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Top".into(),
                    position: 10.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "Express A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "A1".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "Express B".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "B1".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
            ]),
            groups: Some(vec![
                GroupConfig {
                    id: 0,
                    name: "Group A".into(),
                    lines: vec![1],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                },
                GroupConfig {
                    id: 1,
                    name: "Group B".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                },
            ]),
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    }
}

// ── 1. Multi-line config parsing ─────────────────────────────────────────────

#[test]
fn explicit_config_builds_correct_groups_and_lines() {
    let config = two_group_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    assert_eq!(sim.groups().len(), 2, "should have exactly 2 groups");

    let g0 = sim.groups().iter().find(|g| g.id == GroupId(0)).unwrap();
    let g1 = sim.groups().iter().find(|g| g.id == GroupId(1)).unwrap();

    // Each group has exactly one line.
    assert_eq!(g0.lines.len(), 1);
    assert_eq!(g1.lines.len(), 1);

    // Each group has exactly one elevator.
    assert_eq!(g0.elevator_entities.len(), 1);
    assert_eq!(g1.elevator_entities.len(), 1);

    // Group 0 serves stops 0 and 1 (Ground + Transfer).
    let ground_eid = sim.stop_entity(StopId(0)).unwrap();
    let transfer_eid = sim.stop_entity(StopId(1)).unwrap();
    let top_eid = sim.stop_entity(StopId(2)).unwrap();

    assert!(g0.stop_entities.contains(&ground_eid));
    assert!(g0.stop_entities.contains(&transfer_eid));
    assert!(!g0.stop_entities.contains(&top_eid));

    // Group 1 serves stops 1 and 2 (Transfer + Top).
    assert!(!g1.stop_entities.contains(&ground_eid));
    assert!(g1.stop_entities.contains(&transfer_eid));
    assert!(g1.stop_entities.contains(&top_eid));
}

#[test]
fn explicit_config_lines_have_correct_stop_coverage() {
    let config = two_group_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground_eid = sim.stop_entity(StopId(0)).unwrap();
    let transfer_eid = sim.stop_entity(StopId(1)).unwrap();
    let top_eid = sim.stop_entity(StopId(2)).unwrap();

    let line_entities_g0 = sim.lines_in_group(GroupId(0));
    assert_eq!(line_entities_g0.len(), 1);
    let low_line = line_entities_g0[0];

    let line_entities_g1 = sim.lines_in_group(GroupId(1));
    assert_eq!(line_entities_g1.len(), 1);
    let high_line = line_entities_g1[0];

    // Verify served stops via query API.
    let low_stops = sim.stops_served_by_line(low_line);
    assert!(low_stops.contains(&ground_eid));
    assert!(low_stops.contains(&transfer_eid));
    assert!(!low_stops.contains(&top_eid));

    let high_stops = sim.stops_served_by_line(high_line);
    assert!(!high_stops.contains(&ground_eid));
    assert!(high_stops.contains(&transfer_eid));
    assert!(high_stops.contains(&top_eid));
}

#[test]
fn line_component_orientation_and_bounds_set_from_config() {
    let config = two_group_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let low_line_eid = sim.lines_in_group(GroupId(0))[0];
    let line_comp = sim.world().line(low_line_eid).unwrap();

    assert_eq!(line_comp.orientation(), Orientation::Vertical);
    // Auto-computed from serves: Ground=0.0, Transfer=10.0
    assert!((line_comp.min_position() - 0.0).abs() < 1e-9);
    assert!((line_comp.max_position() - 10.0).abs() < 1e-9);
}

// ── 2. Auto-infer backwards compat ───────────────────────────────────────────

#[test]
fn legacy_config_auto_creates_single_group_with_all_elevators() {
    use super::helpers::default_config;

    let config = default_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    assert_eq!(
        sim.groups().len(),
        1,
        "legacy config should produce exactly 1 group"
    );

    let group = &sim.groups()[0];
    assert_eq!(group.id, GroupId(0));
    assert_eq!(group.lines.len(), 1, "should have 1 default line");
    assert_eq!(group.elevator_entities.len(), 1, "should have 1 elevator");

    // All 3 stops should be in the single group.
    assert_eq!(group.stop_entities.len(), 3);
}

#[test]
fn legacy_config_line_covers_all_stops() {
    use super::helpers::default_config;

    let config = default_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let line_eid = sim.lines_in_group(GroupId(0))[0];
    let stops = sim.stops_served_by_line(line_eid);

    let s0 = sim.stop_entity(StopId(0)).unwrap();
    let s1 = sim.stop_entity(StopId(1)).unwrap();
    let s2 = sim.stop_entity(StopId(2)).unwrap();

    assert!(stops.contains(&s0));
    assert!(stops.contains(&s1));
    assert!(stops.contains(&s2));
}

// ── 3. spawn_rider auto-detect group ─────────────────────────────────────────

#[test]
fn spawn_rider_auto_detects_group_for_same_group_stops() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    // Both stops are in Group 0 — should succeed.
    let result = sim.spawn_rider(ground, transfer, 70.0);
    assert!(
        result.is_ok(),
        "should auto-detect group 0 for Ground→Transfer"
    );
}

#[test]
fn spawn_rider_returns_no_route_when_stops_in_different_groups() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Ground is only in Group 0, Top is only in Group 1 — no single group spans both.
    let result = sim.spawn_rider(ground, top, 70.0);
    assert!(
        matches!(result, Err(SimError::NoRoute { .. })),
        "expected NoRoute, got {result:?}"
    );
}

// ── 4. spawn_rider ambiguous route ───────────────────────────────────────────

#[test]
fn spawn_rider_returns_ambiguous_route_when_multiple_groups_serve_both_stops() {
    let config = overlapping_groups_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let bottom = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(1)).unwrap();

    // Both groups serve bottom and top — caller must pick a group.
    let result = sim.spawn_rider(bottom, top, 70.0);
    match result {
        Err(SimError::AmbiguousRoute { groups, .. }) => {
            assert_eq!(groups.len(), 2, "expected 2 ambiguous groups");
        }
        other => panic!("expected AmbiguousRoute, got {other:?}"),
    }
}

// ── 5. Cross-group routing with multi-leg route ───────────────────────────────

#[test]
fn cross_group_rider_arrives_via_explicit_two_leg_route() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Leg 1: Group 0 from Ground to Transfer
    // Leg 2: Group 1 from Transfer to Top
    let route = Route {
        legs: vec![
            RouteLeg {
                from: ground,
                to: transfer,
                via: TransportMode::Group(GroupId(0)),
            },
            RouteLeg {
                from: transfer,
                to: top,
                via: TransportMode::Group(GroupId(1)),
            },
        ],
        current_leg: 0,
    };

    let rider = sim
        .spawn_rider_with_route(ground, top, 70.0, route)
        .unwrap();

    // Run until rider arrives or we time out.
    for _ in 0..5000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider) {
            if r.phase == RiderPhase::Arrived {
                break;
            }
        }
    }

    let rider_data = sim.world().rider(rider).unwrap();
    assert_eq!(
        rider_data.phase,
        RiderPhase::Arrived,
        "rider should arrive at Top via transfer"
    );
}

// ── 6. Loading group filter ───────────────────────────────────────────────────

#[test]
fn rider_only_boards_elevator_from_matching_group() {
    // Both groups share the Transfer stop, each has one elevator.
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Spawn a rider at Transfer headed to Top — only Group 1 serves this.
    let rider = sim.spawn_rider(transfer, top, 70.0).unwrap();

    // Identify which group each elevator belongs to by checking its line.
    let g0_elev = sim
        .groups()
        .iter()
        .find(|g| g.id == GroupId(0))
        .unwrap()
        .elevator_entities[0];
    let g1_elev = sim
        .groups()
        .iter()
        .find(|g| g.id == GroupId(1))
        .unwrap()
        .elevator_entities[0];

    // Step until the rider boards or we time out.
    let mut boarding_elevator = None;
    for _ in 0..3000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider) {
            if let RiderPhase::Boarding(eid) | RiderPhase::Riding(eid) = r.phase {
                boarding_elevator = Some(eid);
                break;
            }
        }
    }

    let boarded = boarding_elevator.expect("rider should board within 3000 ticks");
    assert_eq!(
        boarded, g1_elev,
        "rider going Transfer→Top should board Group 1 elevator, not Group 0"
    );
    assert_ne!(
        boarded, g0_elev,
        "rider should not board Group 0 elevator for a Group 1 route"
    );
}

// ── 7. Line-pinned routing ────────────────────────────────────────────────────

#[test]
fn line_pinned_rider_boards_only_specified_line_elevator() {
    // Config with one group containing two lines, each with one elevator.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Twin Shaft".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Lobby".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Sky".into(),
                    position: 20.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "Shaft A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "A".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "Shaft B".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "B".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
            ]),
            groups: Some(vec![GroupConfig {
                id: 0,
                name: "All Shafts".into(),
                lines: vec![1, 2],
                dispatch: crate::dispatch::BuiltinStrategy::Scan,
            }]),
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    // Find line 2's entity and elevator.
    let line2_eid = sim
        .lines_in_group(GroupId(0))
        .into_iter()
        .find(|&le| {
            sim.world()
                .line(le)
                .map_or(false, |l| l.name() == "Shaft B")
        })
        .expect("Shaft B line should exist");

    let elevators_on_line2 = sim.elevators_on_line(line2_eid);
    assert_eq!(elevators_on_line2.len(), 1);
    let line2_elevator = elevators_on_line2[0];

    let line1_eid = sim
        .lines_in_group(GroupId(0))
        .into_iter()
        .find(|&le| {
            sim.world()
                .line(le)
                .map_or(false, |l| l.name() == "Shaft A")
        })
        .expect("Shaft A line should exist");
    let elevators_on_line1 = sim.elevators_on_line(line1_eid);
    let line1_elevator = elevators_on_line1[0];

    let lobby = sim.stop_entity(StopId(0)).unwrap();
    let sky = sim.stop_entity(StopId(1)).unwrap();

    // Spawn rider pinned to line 2 (Shaft B).
    let route = Route {
        legs: vec![RouteLeg {
            from: lobby,
            to: sky,
            via: TransportMode::Line(line2_eid),
        }],
        current_leg: 0,
    };
    let rider = sim.spawn_rider_with_route(lobby, sky, 70.0, route).unwrap();

    // Step until rider boards.
    let mut boarding_elevator = None;
    for _ in 0..3000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider) {
            if let RiderPhase::Boarding(eid) | RiderPhase::Riding(eid) = r.phase {
                boarding_elevator = Some(eid);
                break;
            }
        }
    }

    let boarded = boarding_elevator.expect("line-pinned rider should board within 3000 ticks");
    assert_eq!(
        boarded, line2_elevator,
        "rider pinned to Shaft B should board Shaft B elevator"
    );
    assert_ne!(
        boarded, line1_elevator,
        "rider pinned to Shaft B should not board Shaft A elevator"
    );
}

// ── 8. Dynamic topology: add_line and add_group ───────────────────────────────

#[test]
fn add_group_and_add_line_reflect_in_query_apis() {
    use super::helpers::{default_config, scan};

    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Initially only 1 group.
    assert_eq!(sim.groups().len(), 1);

    // Add a new group.
    let new_group_id = sim.add_group("Express".into(), Box::new(ScanDispatch::new()));
    assert_eq!(sim.groups().len(), 2);

    // Add a line to the new group.
    let line_eid = sim
        .add_line(
            "Express Shaft".into(),
            new_group_id,
            Orientation::Vertical,
            0.0,
            10.0,
        )
        .unwrap();

    // Query APIs should reflect the new line.
    let lines = sim.lines_in_group(new_group_id);
    assert_eq!(lines.len(), 1);
    assert_eq!(lines[0], line_eid);

    // Line component should have correct group assignment.
    let line_comp = sim.world().line(line_eid).unwrap();
    assert_eq!(line_comp.group(), new_group_id);

    // elevators_on_line returns empty since no elevators added yet.
    let elevators = sim.elevators_on_line(line_eid);
    assert!(elevators.is_empty());
}

#[test]
fn add_group_returns_monotonically_increasing_id() {
    use super::helpers::{default_config, scan};

    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Default sim has GroupId(0).
    let g1 = sim.add_group("G1".into(), Box::new(ScanDispatch::new()));
    let g2 = sim.add_group("G2".into(), Box::new(ScanDispatch::new()));

    assert_eq!(g1, GroupId(1));
    assert_eq!(g2, GroupId(2));
}

// ── 9. Line reassignment (swing car) ─────────────────────────────────────────

#[test]
fn assign_line_to_group_moves_line_between_groups() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    // Get the low-rise line (belongs to Group 0).
    let low_line = sim.lines_in_group(GroupId(0))[0];

    assert_eq!(
        sim.world().line(low_line).unwrap().group(),
        GroupId(0),
        "line should start in Group 0"
    );
    assert_eq!(sim.lines_in_group(GroupId(0)).len(), 1);
    assert_eq!(sim.lines_in_group(GroupId(1)).len(), 1);

    // Reassign low-rise line to Group 1.
    let old_group = sim.assign_line_to_group(low_line, GroupId(1)).unwrap();
    assert_eq!(old_group, GroupId(0));

    // Group 0 should now have no lines; Group 1 should have 2.
    assert_eq!(
        sim.lines_in_group(GroupId(0)).len(),
        0,
        "Group 0 should be empty after reassignment"
    );
    assert_eq!(
        sim.lines_in_group(GroupId(1)).len(),
        2,
        "Group 1 should now have both lines"
    );

    // Line component should reflect the new group.
    assert_eq!(
        sim.world().line(low_line).unwrap().group(),
        GroupId(1),
        "line component group field should be updated"
    );
}

#[test]
fn assign_line_to_group_updates_stop_entities_cache() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Before: Group 0 has Ground, Group 1 has Top.
    let g0 = sim.groups().iter().find(|g| g.id == GroupId(0)).unwrap();
    assert!(g0.stop_entities.contains(&ground));
    assert!(!g0.stop_entities.contains(&top));

    let low_line = sim.lines_in_group(GroupId(0))[0];
    sim.assign_line_to_group(low_line, GroupId(1)).unwrap();

    // After: Group 0 has no stops; Group 1 has all stops.
    let g0 = sim.groups().iter().find(|g| g.id == GroupId(0)).unwrap();
    assert!(
        g0.stop_entities.is_empty(),
        "Group 0 stop cache should be empty"
    );

    let g1 = sim.groups().iter().find(|g| g.id == GroupId(1)).unwrap();
    assert!(g1.stop_entities.contains(&ground));
    assert!(g1.stop_entities.contains(&top));
}

#[test]
fn assign_line_to_nonexistent_group_returns_error() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let low_line = sim.lines_in_group(GroupId(0))[0];

    let result = sim.assign_line_to_group(low_line, GroupId(99));
    assert!(
        matches!(result, Err(SimError::GroupNotFound(GroupId(99)))),
        "expected GroupNotFound(99), got {result:?}"
    );
}

// ── 10. Topology graph queries ────────────────────────────────────────────────

#[test]
fn reachable_stops_from_includes_cross_group_stops_via_transfer() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Ground can reach Transfer directly (Group 0) and Top via Transfer (Group 0→1).
    let reachable = sim.reachable_stops_from(ground);
    assert!(
        reachable.contains(&transfer),
        "Ground should reach Transfer (same group)"
    );
    assert!(
        reachable.contains(&top),
        "Ground should reach Top via transfer"
    );
}

#[test]
fn reachable_stops_from_isolated_stop_returns_empty() {
    use super::helpers::scan;

    let config = SimConfig {
        building: BuildingConfig {
            name: "Island".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "Island".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "Mainland".into(),
                    position: 10.0,
                },
            ],
            lines: Some(vec![LineConfig {
                id: 1,
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![ElevatorConfig {
                    id: 1,
                    name: "E1".into(),
                    max_speed: 2.0,
                    acceleration: 1.5,
                    deceleration: 2.0,
                    weight_capacity: 800.0,
                    starting_stop: StopId(0),
                    door_open_ticks: 10,
                    door_transition_ticks: 5,
                }],
                orientation: Orientation::Vertical,
                position: None,
                min_position: None,
                max_position: None,
                max_cars: None,
            }]),
            groups: Some(vec![GroupConfig {
                id: 0,
                name: "G0".into(),
                lines: vec![1],
                dispatch: crate::dispatch::BuiltinStrategy::Scan,
            }]),
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Add a disconnected runtime stop (not in any line's serves list).
    let disconnected = sim.add_stop("Stranded".into(), 50.0, GroupId(0)).unwrap();
    // Remove it from the group's stop_entities by updating the line.
    // Actually, add_stop adds it to the group but not to any line.
    // The topo graph is built from lines, not group.stop_entities.
    // So this stop has no adjacency edges and should reach nothing.
    let reachable = sim.reachable_stops_from(disconnected);
    assert!(
        reachable.is_empty(),
        "a stop not in any line should reach nothing, got {reachable:?}"
    );
}

#[test]
fn transfer_points_returns_stops_shared_across_groups() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let transfer = sim.stop_entity(StopId(1)).unwrap();

    let transfers = sim.transfer_points();
    assert_eq!(transfers.len(), 1, "exactly one transfer point expected");
    assert_eq!(transfers[0], transfer);
}

#[test]
fn transfer_points_empty_for_non_overlapping_groups() {
    use super::helpers::{default_config, scan};

    // Single group — no stop is in two groups.
    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let transfers = sim.transfer_points();
    assert!(
        transfers.is_empty(),
        "single-group sim should have no transfer points"
    );
}

#[test]
fn shortest_route_finds_direct_path_within_group() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    let route = sim.shortest_route(ground, transfer);
    assert!(route.is_some(), "direct route within Group 0 should exist");

    let route = route.unwrap();
    assert_eq!(route.legs.len(), 1);
    assert_eq!(route.legs[0].from, ground);
    assert_eq!(route.legs[0].to, transfer);
    assert_eq!(route.legs[0].via, TransportMode::Group(GroupId(0)));
}

#[test]
fn shortest_route_spans_groups_via_transfer() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    let route = sim.shortest_route(ground, top);
    assert!(
        route.is_some(),
        "route Ground→Top should exist via transfer"
    );

    let route = route.unwrap();
    assert_eq!(route.legs.len(), 2, "should take 2 legs via transfer");
    assert_eq!(route.legs[0].from, ground);
    assert_eq!(route.legs[0].to, transfer);
    assert_eq!(route.legs[1].from, transfer);
    assert_eq!(route.legs[1].to, top);
}

#[test]
fn shortest_route_returns_none_for_unreachable_stop() {
    // Two groups with no shared stops.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Disconnected".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "A".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "B".into(),
                    position: 50.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "Line A".into(),
                    serves: vec![StopId(0)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "E-A".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "Line B".into(),
                    serves: vec![StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "E-B".into(),
                        max_speed: 2.0,
                        acceleration: 1.5,
                        deceleration: 2.0,
                        weight_capacity: 800.0,
                        starting_stop: StopId(1),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
            ]),
            groups: Some(vec![
                GroupConfig {
                    id: 0,
                    name: "G0".into(),
                    lines: vec![1],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                },
                GroupConfig {
                    id: 1,
                    name: "G1".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                },
            ]),
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let a = sim.stop_entity(StopId(0)).unwrap();
    let b = sim.stop_entity(StopId(1)).unwrap();

    assert!(
        sim.shortest_route(a, b).is_none(),
        "no route between disconnected groups"
    );
}

// ── 11. Validation: explicit config errors ────────────────────────────────────

#[test]
fn duplicate_line_ids_fail_validation() {
    let mut config = two_group_config();
    // Make both lines have id 1.
    if let Some(lines) = config.building.lines.as_mut() {
        lines[1].id = 1;
    }

    let result = Simulation::new(&config, Box::new(ScanDispatch::new()));
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.lines",
                ..
            })
        ),
        "expected InvalidConfig for duplicate line IDs, got {result:?}"
    );
}

#[test]
fn line_references_nonexistent_stop_fails_validation() {
    let mut config = two_group_config();
    // Point line 2 to a stop that doesn't exist.
    if let Some(lines) = config.building.lines.as_mut() {
        lines[1].serves.push(StopId(99));
    }

    let result = Simulation::new(&config, Box::new(ScanDispatch::new()));
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.lines.serves",
                ..
            })
        ),
        "expected InvalidConfig for non-existent stop reference, got {result:?}"
    );
}

#[test]
fn group_references_nonexistent_line_fails_validation() {
    let mut config = two_group_config();
    // Make Group 0 reference a non-existent line.
    if let Some(groups) = config.building.groups.as_mut() {
        groups[0].lines.push(99);
    }

    let result = Simulation::new(&config, Box::new(ScanDispatch::new()));
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.groups.lines",
                ..
            })
        ),
        "expected InvalidConfig for non-existent line reference in group, got {result:?}"
    );
}

#[test]
fn orphaned_stop_not_in_any_line_fails_validation() {
    let mut config = two_group_config();
    // Add a stop that no line serves.
    config.building.stops.push(StopConfig {
        id: StopId(99),
        name: "Orphan".into(),
        position: 100.0,
    });

    let result = Simulation::new(&config, Box::new(ScanDispatch::new()));
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.lines",
                ..
            })
        ),
        "expected InvalidConfig for orphaned stop, got {result:?}"
    );
}

#[test]
fn no_elevators_in_any_line_fails_validation() {
    let config = SimConfig {
        building: BuildingConfig {
            name: "Elevator-less".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "G".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "T".into(),
                    position: 10.0,
                },
            ],
            lines: Some(vec![LineConfig {
                id: 1,
                name: "Empty".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![],
                orientation: Orientation::Vertical,
                position: None,
                min_position: None,
                max_position: None,
                max_cars: None,
            }]),
            groups: None,
        },
        elevators: vec![],
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let result = Simulation::new(&config, Box::new(ScanDispatch::new()));
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.lines",
                ..
            })
        ),
        "expected InvalidConfig when no line has any elevator, got {result:?}"
    );
}

// ── Additional query API coverage ─────────────────────────────────────────────

#[test]
fn lines_serving_stop_returns_both_lines_for_transfer_stop() {
    let config = two_group_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let ground = sim.stop_entity(StopId(0)).unwrap();

    let lines_at_transfer = sim.lines_serving_stop(transfer);
    assert_eq!(
        lines_at_transfer.len(),
        2,
        "Transfer should be served by both lines"
    );

    let lines_at_ground = sim.lines_serving_stop(ground);
    assert_eq!(
        lines_at_ground.len(),
        1,
        "Ground should be served by only the low-rise line"
    );
}

#[test]
fn groups_serving_stop_returns_both_groups_for_transfer_stop() {
    let config = two_group_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let ground = sim.stop_entity(StopId(0)).unwrap();

    let groups_at_transfer = sim.groups_serving_stop(transfer);
    assert_eq!(
        groups_at_transfer.len(),
        2,
        "Transfer stop should be in 2 groups"
    );
    assert!(groups_at_transfer.contains(&GroupId(0)));
    assert!(groups_at_transfer.contains(&GroupId(1)));

    let groups_at_ground = sim.groups_serving_stop(ground);
    assert_eq!(
        groups_at_ground.len(),
        1,
        "Ground stop should be in only Group 0"
    );
    assert!(groups_at_ground.contains(&GroupId(0)));
}

#[test]
fn line_for_elevator_returns_correct_line_entity() {
    let config = two_group_config();
    let sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let low_line = sim.lines_in_group(GroupId(0))[0];
    let high_line = sim.lines_in_group(GroupId(1))[0];

    let low_elevs = sim.elevators_on_line(low_line);
    let high_elevs = sim.elevators_on_line(high_line);

    assert_eq!(sim.line_for_elevator(low_elevs[0]), Some(low_line));
    assert_eq!(sim.line_for_elevator(high_elevs[0]), Some(high_line));
}

#[test]
fn remove_line_removes_from_group_and_world() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, Box::new(ScanDispatch::new())).unwrap();

    let low_line = sim.lines_in_group(GroupId(0))[0];

    // Confirm line entity exists.
    assert!(sim.world().line(low_line).is_some());

    sim.remove_line(low_line).unwrap();

    // Group 0 should have no lines now.
    assert_eq!(sim.lines_in_group(GroupId(0)).len(), 0);

    // Line component should be gone from world.
    assert!(
        sim.world().line(low_line).is_none(),
        "line component should be removed from world after remove_line"
    );
}

#[test]
fn add_stop_to_line_appears_in_serves_and_group_cache() {
    use super::helpers::{default_config, scan};

    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // Add a runtime stop not in any line yet.
    let new_stop = sim.add_stop("Rooftop".into(), 15.0, GroupId(0)).unwrap();
    let line_eid = sim.lines_in_group(GroupId(0))[0];

    // Confirm not yet served by the line.
    assert!(!sim.stops_served_by_line(line_eid).contains(&new_stop));

    sim.add_stop_to_line(new_stop, line_eid).unwrap();

    assert!(
        sim.stops_served_by_line(line_eid).contains(&new_stop),
        "stop should be in line's serves after add_stop_to_line"
    );
}

#[test]
fn remove_stop_from_line_removes_from_serves_and_updates_group_cache() {
    use super::helpers::{default_config, scan};

    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    let s2 = sim.stop_entity(StopId(2)).unwrap();
    let line_eid = sim.lines_in_group(GroupId(0))[0];

    // StopId(2) is served by the default line.
    assert!(sim.stops_served_by_line(line_eid).contains(&s2));

    sim.remove_stop_from_line(s2, line_eid).unwrap();

    assert!(
        !sim.stops_served_by_line(line_eid).contains(&s2),
        "stop should be removed from line serves after remove_stop_from_line"
    );
    // Group cache should also no longer include s2.
    let group = &sim.groups()[0];
    assert!(
        !group.stop_entities.contains(&s2),
        "group stop cache should not contain removed stop"
    );
}
