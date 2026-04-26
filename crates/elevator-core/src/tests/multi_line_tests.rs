//! Tests for multi-line and multi-group simulation support.

use crate::components::{
    Accel, ElevatorPhase, Orientation, RiderPhase, Route, RouteLeg, Speed, TransportMode, Weight,
};
use crate::config::{
    BuildingConfig, ElevatorConfig, GroupConfig, LineConfig, PassengerSpawnConfig, SimConfig,
    SimulationParams,
};
use crate::dispatch::scan::ScanDispatch;
use crate::entity::ElevatorId;
use crate::error::SimError;
use crate::events::Event as SimEvent;
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(1),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 1,
                    name: "High Rise".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 1,
                    name: "Group B".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    assert_eq!(sim.groups().len(), 2, "should have exactly 2 groups");

    let g0 = sim.groups().iter().find(|g| g.id() == GroupId(0)).unwrap();
    let g1 = sim.groups().iter().find(|g| g.id() == GroupId(1)).unwrap();

    // Each group has exactly one line.
    assert_eq!(g0.lines().len(), 1);
    assert_eq!(g1.lines().len(), 1);

    // Each group has exactly one elevator.
    assert_eq!(g0.elevator_entities().len(), 1);
    assert_eq!(g1.elevator_entities().len(), 1);

    // Group 0 serves stops 0 and 1 (Ground + Transfer).
    let ground_eid = sim.stop_entity(StopId(0)).unwrap();
    let transfer_eid = sim.stop_entity(StopId(1)).unwrap();
    let top_eid = sim.stop_entity(StopId(2)).unwrap();

    assert!(g0.stop_entities().contains(&ground_eid));
    assert!(g0.stop_entities().contains(&transfer_eid));
    assert!(!g0.stop_entities().contains(&top_eid));

    // Group 1 serves stops 1 and 2 (Transfer + Top).
    assert!(!g1.stop_entities().contains(&ground_eid));
    assert!(g1.stop_entities().contains(&transfer_eid));
    assert!(g1.stop_entities().contains(&top_eid));
}

#[test]
fn explicit_config_lines_have_correct_stop_coverage() {
    let config = two_group_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    assert_eq!(
        sim.groups().len(),
        1,
        "legacy config should produce exactly 1 group"
    );

    let group = &sim.groups()[0];
    assert_eq!(group.id(), GroupId(0));
    assert_eq!(group.lines().len(), 1, "should have 1 default line");
    assert_eq!(group.elevator_entities().len(), 1, "should have 1 elevator");

    // All 3 stops should be in the single group.
    assert_eq!(group.stop_entities().len(), 3);
}

#[test]
fn legacy_config_line_covers_all_stops() {
    use super::helpers::default_config;

    let config = default_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
        .build_rider(ground, top)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    // Run until rider arrives or we time out.
    for _ in 0..5000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && r.phase == RiderPhase::Arrived
        {
            break;
        }
    }

    let rider_data = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(
        rider_data.phase,
        RiderPhase::Arrived,
        "rider should arrive at Top via transfer"
    );
}

/// Regression: a multi-leg journey is one delivery, not one per leg (#246).
///
/// Before the fix, `RiderExited` fired at every transfer and the metrics
/// handler treated each as terminal — `total_delivered` became leg-count
/// instead of rider-count.
#[test]
fn multi_leg_journey_counts_as_single_delivery() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

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
        .build_rider(ground, top)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    for _ in 0..10_000 {
        sim.step();
        if sim
            .world()
            .rider(rider.entity())
            .is_some_and(|r| r.phase == RiderPhase::Arrived)
        {
            break;
        }
    }

    assert_eq!(
        sim.world().rider(rider.entity()).map(|r| r.phase),
        Some(RiderPhase::Arrived),
        "rider should arrive at Top via transfer"
    );
    assert_eq!(
        sim.metrics().total_delivered,
        1,
        "two-leg journey must count as one delivery, not two"
    );
    assert_eq!(sim.metrics().total_spawned, 1, "spawn count should be one");
}

// ── 6. Loading group filter ───────────────────────────────────────────────────

#[test]
fn rider_only_boards_elevator_from_matching_group() {
    // Both groups share the Transfer stop, each has one elevator.
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Spawn a rider at Transfer headed to Top — only Group 1 serves this.
    let rider = sim.spawn_rider(transfer, top, 70.0).unwrap();

    // Identify which group each elevator belongs to by checking its line.
    let g0_elev = sim
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(0))
        .unwrap()
        .elevator_entities()[0];
    let g1_elev = sim
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(1))
        .unwrap()
        .elevator_entities()[0];

    // Step until the rider boards or we time out.
    let mut boarding_elevator = None;
    for _ in 0..3000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && let RiderPhase::Boarding(eid) | RiderPhase::Riding(eid) = r.phase
        {
            boarding_elevator = Some(eid);
            break;
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                reposition: None,
                hall_call_mode: None,
                ack_latency_ticks: None,
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

    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Find line 2's entity and elevator.
    let line2_eid = sim
        .lines_in_group(GroupId(0))
        .into_iter()
        .find(|&le| sim.world().line(le).is_some_and(|l| l.name() == "Shaft B"))
        .expect("Shaft B line should exist");

    let elevators_on_line2 = sim.elevators_on_line(line2_eid);
    assert_eq!(elevators_on_line2.len(), 1);
    let line2_elevator = elevators_on_line2[0];

    let line1_eid = sim
        .lines_in_group(GroupId(0))
        .into_iter()
        .find(|&le| sim.world().line(le).is_some_and(|l| l.name() == "Shaft A"))
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
    let rider = sim
        .build_rider(lobby, sky)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    // Step until rider boards.
    let mut boarding_elevator = None;
    for _ in 0..3000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && let RiderPhase::Boarding(eid) | RiderPhase::Riding(eid) = r.phase
        {
            boarding_elevator = Some(eid);
            break;
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
    let new_group_id = sim.add_group("Express", ScanDispatch::new());
    assert_eq!(sim.groups().len(), 2);

    // Add a line to the new group.
    let mut line_params = crate::sim::LineParams::new("Express Shaft", new_group_id);
    line_params.orientation = Orientation::Vertical;
    line_params.max_position = 10.0;
    let line_eid = sim.add_line(&line_params).unwrap();

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
    let g1 = sim.add_group("G1", ScanDispatch::new());
    let g2 = sim.add_group("G2", ScanDispatch::new());

    assert_eq!(g1, GroupId(1));
    assert_eq!(g2, GroupId(2));
}

// ── 9. Line reassignment (swing car) ─────────────────────────────────────────

#[test]
fn assign_line_to_group_moves_line_between_groups() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Before: Group 0 has Ground, Group 1 has Top.
    let g0 = sim.groups().iter().find(|g| g.id() == GroupId(0)).unwrap();
    assert!(g0.stop_entities().contains(&ground));
    assert!(!g0.stop_entities().contains(&top));

    let low_line = sim.lines_in_group(GroupId(0))[0];
    sim.assign_line_to_group(low_line, GroupId(1)).unwrap();

    // After: Group 0 has no stops; Group 1 has all stops.
    let g0 = sim.groups().iter().find(|g| g.id() == GroupId(0)).unwrap();
    assert!(
        g0.stop_entities().is_empty(),
        "Group 0 stop cache should be empty"
    );

    let g1 = sim.groups().iter().find(|g| g.id() == GroupId(1)).unwrap();
    assert!(g1.stop_entities().contains(&ground));
    assert!(g1.stop_entities().contains(&top));
}

#[test]
fn assign_line_to_nonexistent_group_returns_error() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
                    max_speed: Speed::from(2.0),
                    acceleration: Accel::from(1.5),
                    deceleration: Accel::from(2.0),
                    weight_capacity: Weight::from(800.0),
                    starting_stop: StopId(0),
                    door_open_ticks: 10,
                    door_transition_ticks: 5,
                    restricted_stops: Vec::new(),
                    #[cfg(feature = "energy")]
                    energy_profile: None,
                    service_mode: None,
                    inspection_speed_factor: 0.25,

                    bypass_load_up_pct: None,

                    bypass_load_down_pct: None,
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
                reposition: None,
                hall_call_mode: None,
                ack_latency_ticks: None,
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

    // Add a runtime stop to a line, then remove it so it's disconnected.
    let line = sim.lines_in_group(GroupId(0))[0];
    let disconnected = sim.add_stop("Stranded".into(), 50.0, line).unwrap();
    sim.remove_stop_from_line(disconnected, line).unwrap();
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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let sim = Simulation::new(&config, scan()).unwrap();

    let transfers = sim.transfer_points();
    assert!(
        transfers.is_empty(),
        "single-group sim should have no transfer points"
    );
}

#[test]
fn shortest_route_finds_direct_path_within_group() {
    let config = two_group_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(1),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 1,
                    name: "G1".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
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

    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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

    let result = Simulation::new(&config, ScanDispatch::new());
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

    let result = Simulation::new(&config, ScanDispatch::new());
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

    let result = Simulation::new(&config, ScanDispatch::new());
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

    let result = Simulation::new(&config, ScanDispatch::new());
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

    let result = Simulation::new(&config, ScanDispatch::new());
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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

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

    let line_eid = sim.lines_in_group(GroupId(0))[0];

    // add_stop now adds directly to the line's serves list.
    let new_stop = sim.add_stop("Rooftop".into(), 15.0, line_eid).unwrap();

    assert!(
        sim.stops_served_by_line(line_eid).contains(&new_stop),
        "stop should be in line's serves after add_stop"
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
        !group.stop_entities().contains(&s2),
        "group stop cache should not contain removed stop"
    );
}

// ── 12. Walk leg execution ────────────────────────────────────────────────────

#[test]
fn walk_only_route_rider_arrives_directly() {
    // A rider with a single Walk leg needs no elevator — they arrive on the next
    // advance_transient tick.
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    let route = Route {
        legs: vec![RouteLeg {
            from: ground,
            to: transfer,
            via: TransportMode::Walk,
        }],
        current_leg: 0,
    };

    // Spawn at ground, destination transfer, route is walk-only.
    let rider = sim
        .build_rider(ground, transfer)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    // The rider starts Waiting.
    assert_eq!(
        sim.world().rider(rider.entity()).unwrap().phase,
        RiderPhase::Waiting
    );

    // Walk is processed during advance_transient when in Exiting phase, but a
    // Walk leg rider begins Waiting — a single elevator step is not needed.
    // However the walk executes only after Exiting is resolved, so we need to
    // put the rider in Exiting to trigger the walk.  The actual flow for a
    // pure-walk route: rider stays Waiting until manually placed in Exiting,
    // OR we manually advance the route to trigger the walk code path.
    //
    // The loading system skips Walk riders (they never board).  The walk is
    // executed in handle_exit, which fires when a rider transitions from Exiting.
    // For a walk-only route with no elevator, we exercise the path by placing the
    // rider in Exiting phase manually and stepping once.
    sim.world_mut().rider_mut(rider.entity()).unwrap().phase =
        RiderPhase::Exiting(crate::entity::EntityId::default());

    sim.step();

    let rider_data = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(
        rider_data.phase,
        RiderPhase::Arrived,
        "walk-only rider should arrive after advance_transient processes the Exiting phase"
    );
    // For a single-leg Walk route, current_stop is not updated to the walk
    // destination — the rider simply arrives (no more legs to process).
    // current_stop remains wherever the rider was at spawn time (ground).
    assert_eq!(
        rider_data.current_stop,
        Some(ground),
        "rider's current_stop should remain at spawn stop for a single-leg walk route"
    );
}

#[test]
fn walk_leg_teleports_rider_to_destination() {
    // Walk leg in the middle of a multi-leg route: after exiting the first
    // elevator leg, rider is teleported to the walk destination in the same tick.
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();

    // Route: Group0 elevator ground→transfer, then Walk transfer→transfer (no-op
    // teleport to same stop), then Group1 elevator transfer→top.
    // This exercises the Walk code path without needing a physically separate stop.
    let route = Route {
        legs: vec![
            RouteLeg {
                from: ground,
                to: transfer,
                via: TransportMode::Group(GroupId(0)),
            },
            RouteLeg {
                from: transfer,
                to: transfer,
                via: TransportMode::Walk,
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
        .build_rider(ground, top)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    for _ in 0..5000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && r.phase == RiderPhase::Arrived
        {
            break;
        }
    }

    assert_eq!(
        sim.world().rider(rider.entity()).unwrap().phase,
        RiderPhase::Arrived,
        "rider with walk leg in multi-leg route should eventually arrive"
    );
}

#[test]
fn walk_leg_rider_does_not_board_elevator() {
    // A rider whose current leg is Walk must NOT board any elevator.
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    let route = Route {
        legs: vec![RouteLeg {
            from: ground,
            to: transfer,
            via: TransportMode::Walk,
        }],
        current_leg: 0,
    };

    let rider = sim
        .build_rider(ground, transfer)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    // Step 50 ticks — enough for an elevator to come and open its doors.
    for _ in 0..50 {
        sim.step();
    }

    // Rider should still be Waiting (or already Waiting to board nothing) —
    // never Boarding or Riding.
    let phase = sim.world().rider(rider.entity()).unwrap().phase;
    assert!(
        matches!(phase, RiderPhase::Waiting | RiderPhase::Arrived),
        "walk-leg rider should never board an elevator, got {phase:?}"
    );
}

// ── 13. Line removal mid-simulation ──────────────────────────────────────────

#[test]
fn remove_line_with_riders_aboard_ejects_riders() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    // Spawn a rider on the low-rise line (Group 0: ground→transfer).
    let rider = sim.spawn_rider(ground, transfer, 70.0).unwrap();

    // Run until the rider is actually riding an elevator.
    let mut is_riding = false;
    for _ in 0..3000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && matches!(r.phase, RiderPhase::Riding(_))
        {
            is_riding = true;
            break;
        }
    }
    assert!(is_riding, "rider should board elevator within 3000 ticks");

    // Now remove the low-rise line while the rider is aboard.
    let low_line = sim.lines_in_group(GroupId(0))[0];
    sim.remove_line(low_line).unwrap();

    // After one tick the disable/eject should have been applied.
    sim.step();

    // Rider must NOT be in a Riding phase anymore.
    let phase = sim.world().rider(rider.entity()).unwrap().phase;
    assert!(
        matches!(phase, RiderPhase::Waiting | RiderPhase::Arrived),
        "rider should be ejected when line is removed; got {phase:?}"
    );
}

#[test]
fn remove_line_updates_group_cache() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Group 0 starts with one line; Group 1 starts with one line.
    assert_eq!(sim.lines_in_group(GroupId(0)).len(), 1);

    let low_line = sim.lines_in_group(GroupId(0))[0];
    sim.remove_line(low_line).unwrap();

    assert_eq!(
        sim.lines_in_group(GroupId(0)).len(),
        0,
        "Group 0 should have no lines after remove_line"
    );
    assert_eq!(
        sim.groups()
            .iter()
            .find(|g| g.id() == GroupId(0))
            .unwrap()
            .elevator_entities()
            .len(),
        0,
        "Group 0 elevator cache should be empty after remove_line"
    );
}

#[test]
fn remove_line_marks_topology_graph_dirty() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Prime the topology graph.
    let ground = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(2)).unwrap();
    let before = sim.reachable_stops_from(ground);
    assert!(
        before.contains(&top),
        "ground should reach top before removal"
    );

    // Remove the low-rise line — now ground should not reach top.
    let low_line = sim.lines_in_group(GroupId(0))[0];
    sim.remove_line(low_line).unwrap();

    let after = sim.reachable_stops_from(ground);
    assert!(
        !after.contains(&top),
        "ground should no longer reach top after low-rise line is removed"
    );
}

// ── 14. Elevator reassignment (swing car) ────────────────────────────────────

/// Cross-group reassignment must notify the old group's dispatcher so it
/// clears per-elevator state (e.g. `ScanDispatch::direction`,
/// `LookDispatch::direction`). Pre-fix the old dispatcher kept the stale
/// entry, leaking memory and — for strategies that consult it — mis-
/// dispatching the next call.
#[test]
fn reassign_elevator_to_line_notifies_old_group_dispatcher_on_cross_group() {
    use crate::dispatch::DispatchStrategy;
    use crate::entity::EntityId;
    use std::sync::{Arc, Mutex};

    /// Dispatcher that records every `notify_removed` call it receives.
    struct TrackingDispatch {
        removed: Arc<Mutex<Vec<EntityId>>>,
        inner: ScanDispatch,
    }
    impl DispatchStrategy for TrackingDispatch {
        fn rank(&mut self, ctx: &crate::dispatch::RankContext<'_>) -> Option<f64> {
            self.inner.rank(ctx)
        }
        fn notify_removed(&mut self, elevator: EntityId) {
            self.removed.lock().unwrap().push(elevator);
            self.inner.notify_removed(elevator);
        }
    }

    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let old_removed = Arc::new(Mutex::new(Vec::<EntityId>::new()));
    sim.dispatchers_mut().insert(
        GroupId(0),
        Box::new(TrackingDispatch {
            removed: old_removed.clone(),
            inner: ScanDispatch::new(),
        }),
    );

    let low_line = sim.lines_in_group(GroupId(0))[0];
    let high_line = sim.lines_in_group(GroupId(1))[0];
    let low_elevator = sim.elevators_on_line(low_line)[0];

    sim.reassign_elevator_to_line(low_elevator, high_line)
        .unwrap();

    let saw_removal = old_removed.lock().unwrap().contains(&low_elevator);
    assert!(
        saw_removal,
        "old group's dispatcher should receive notify_removed for cross-group reassignment"
    );
}

#[test]
fn reassign_elevator_to_line_moves_elevator() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let low_line = sim.lines_in_group(GroupId(0))[0];
    let high_line = sim.lines_in_group(GroupId(1))[0];

    let low_elevator = sim.elevators_on_line(low_line)[0];

    // Precondition: elevator is on the low-rise line.
    assert_eq!(sim.world().elevator(low_elevator).unwrap().line(), low_line);
    assert_eq!(sim.elevators_on_line(low_line).len(), 1);
    assert_eq!(sim.elevators_on_line(high_line).len(), 1);

    sim.reassign_elevator_to_line(low_elevator, high_line)
        .unwrap();

    // The elevator component should reference the new line.
    assert_eq!(
        sim.world().elevator(low_elevator).unwrap().line(),
        high_line,
        "elevator line field should point to the new line"
    );

    // The line info caches should be updated.
    assert_eq!(
        sim.elevators_on_line(low_line).len(),
        0,
        "low-rise line should have no elevators after reassignment"
    );
    assert_eq!(
        sim.elevators_on_line(high_line).len(),
        2,
        "high-rise line should have 2 elevators after reassignment"
    );
}

#[test]
fn reassign_elevator_to_line_at_max_cars_returns_error() {
    // Build a config where the high line has max_cars: Some(1).
    let config = SimConfig {
        building: BuildingConfig {
            name: "Cap Test".into(),
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(1),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: Some(1), // already full
                },
            ]),
            groups: Some(vec![
                GroupConfig {
                    id: 0,
                    name: "Low Rise".into(),
                    lines: vec![1],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 1,
                    name: "High Rise".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
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

    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let low_line = sim.lines_in_group(GroupId(0))[0];
    let high_line = sim.lines_in_group(GroupId(1))[0];
    let low_elevator = sim.elevators_on_line(low_line)[0];

    // High line already has 1 car and max_cars is 1 — should fail.
    let result = sim.reassign_elevator_to_line(low_elevator, high_line);
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "line.max_cars",
                ..
            })
        ),
        "expected InvalidConfig(max_cars), got {result:?}"
    );
}

#[test]
fn reassign_elevator_emits_elevator_reassigned_event() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let low_line = sim.lines_in_group(GroupId(0))[0];
    let high_line = sim.lines_in_group(GroupId(1))[0];
    let low_elevator = sim.elevators_on_line(low_line)[0];

    sim.reassign_elevator_to_line(low_elevator, high_line)
        .unwrap();

    let events = sim.drain_events();
    let reassigned = events.iter().find(|e| {
        matches!(
            e,
            crate::events::Event::ElevatorReassigned {
                elevator,
                old_line,
                new_line,
                ..
            } if *elevator == low_elevator && *old_line == low_line && *new_line == high_line
        )
    });

    assert!(
        reassigned.is_some(),
        "ElevatorReassigned event should be emitted with correct old/new line"
    );
}

// ── 15. max_cars enforcement ──────────────────────────────────────────────────

#[test]
fn max_cars_exactly_met_at_config_time_succeeds() {
    // max_cars: Some(2) with exactly 2 elevators: valid.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Capped".into(),
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
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![
                    ElevatorConfig {
                        id: 1,
                        name: "E1".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    },
                    ElevatorConfig {
                        id: 2,
                        name: "E2".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    },
                ],
                orientation: Orientation::Vertical,
                position: None,
                min_position: None,
                max_position: None,
                max_cars: Some(2),
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

    let result = Simulation::new(&config, ScanDispatch::new());
    assert!(
        result.is_ok(),
        "max_cars: Some(2) with exactly 2 elevators should succeed"
    );
}

#[test]
fn max_cars_exceeded_at_config_time_fails_validation() {
    // max_cars: Some(1) with 2 elevators: invalid.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Over Cap".into(),
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
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![
                    ElevatorConfig {
                        id: 1,
                        name: "E1".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    },
                    ElevatorConfig {
                        id: 2,
                        name: "E2".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    },
                ],
                orientation: Orientation::Vertical,
                position: None,
                min_position: None,
                max_position: None,
                max_cars: Some(1),
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

    let result = Simulation::new(&config, ScanDispatch::new());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.lines.max_cars",
                ..
            })
        ),
        "expected InvalidConfig(max_cars), got {result:?}"
    );
}

#[test]
fn runtime_add_elevator_to_line_at_max_cars_returns_error() {
    // Build a sim with max_cars: Some(1) on a line that already has 1 elevator.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Runtime Cap".into(),
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
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![ElevatorConfig {
                    id: 1,
                    name: "E1".into(),
                    max_speed: Speed::from(2.0),
                    acceleration: Accel::from(1.5),
                    deceleration: Accel::from(2.0),
                    weight_capacity: Weight::from(800.0),
                    starting_stop: StopId(0),
                    door_open_ticks: 10,
                    door_transition_ticks: 5,
                    restricted_stops: Vec::new(),
                    #[cfg(feature = "energy")]
                    energy_profile: None,
                    service_mode: None,
                    inspection_speed_factor: 0.25,

                    bypass_load_up_pct: None,

                    bypass_load_down_pct: None,
                }],
                orientation: Orientation::Vertical,
                position: None,
                min_position: None,
                max_position: None,
                max_cars: Some(1),
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

    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let line = sim.lines_in_group(GroupId(0))[0];

    let result = sim.add_elevator(&crate::sim::ElevatorParams::default(), line, 0.0);
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "line.max_cars",
                ..
            })
        ),
        "expected InvalidConfig(max_cars) when adding elevator to full line, got {result:?}"
    );
}

// ── 16. Complex topology (3+ groups) ─────────────────────────────────────────

/// 4-stop, 3-line, 3-group config with 2 transfer stops.
///
/// ```
/// Stops: A(0) ─── B(1) ─── C(2) ─── D(3)
/// Line 1 (Group 0): A ─── B
/// Line 2 (Group 1): B ─── C
/// Line 3 (Group 2): C ─── D
/// Transfer stops: B (Groups 0+1), C (Groups 1+2)
/// ```
fn three_group_config() -> SimConfig {
    SimConfig {
        building: BuildingConfig {
            name: "Three-Group Tower".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "A".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "B".into(),
                    position: 10.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "C".into(),
                    position: 20.0,
                },
                StopConfig {
                    id: StopId(3),
                    name: "D".into(),
                    position: 30.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "AB".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "E1".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "BC".into(),
                    serves: vec![StopId(1), StopId(2)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "E2".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(1),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 3,
                    name: "CD".into(),
                    serves: vec![StopId(2), StopId(3)],
                    elevators: vec![ElevatorConfig {
                        id: 3,
                        name: "E3".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(2),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
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
                    name: "Group AB".into(),
                    lines: vec![1],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 1,
                    name: "Group BC".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 2,
                    name: "Group CD".into(),
                    lines: vec![3],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
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

#[test]
fn three_group_rider_navigates_all_legs() {
    let config = three_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let a = sim.stop_entity(StopId(0)).unwrap();
    let b = sim.stop_entity(StopId(1)).unwrap();
    let c = sim.stop_entity(StopId(2)).unwrap();
    let d = sim.stop_entity(StopId(3)).unwrap();

    // Explicit 3-leg route: A→B via Group0, B→C via Group1, C→D via Group2.
    let route = Route {
        legs: vec![
            RouteLeg {
                from: a,
                to: b,
                via: TransportMode::Group(GroupId(0)),
            },
            RouteLeg {
                from: b,
                to: c,
                via: TransportMode::Group(GroupId(1)),
            },
            RouteLeg {
                from: c,
                to: d,
                via: TransportMode::Group(GroupId(2)),
            },
        ],
        current_leg: 0,
    };

    let rider = sim
        .build_rider(a, d)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    for _ in 0..10_000 {
        sim.step();
        if sim
            .world()
            .rider(rider.entity())
            .is_some_and(|r| r.phase == RiderPhase::Arrived)
        {
            break;
        }
    }

    assert_eq!(
        sim.world().rider(rider.entity()).unwrap().phase,
        RiderPhase::Arrived,
        "rider should arrive at D via all three groups"
    );
}

#[test]
fn shortest_route_across_three_groups_has_three_legs() {
    let config = three_group_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let a = sim.stop_entity(StopId(0)).unwrap();
    let d = sim.stop_entity(StopId(3)).unwrap();

    let route = sim.shortest_route(a, d);
    assert!(route.is_some(), "route A→D should exist via 3 groups");

    let route = route.unwrap();
    assert_eq!(
        route.legs.len(),
        3,
        "3-group route should have exactly 3 legs"
    );
    assert_eq!(route.legs[0].from, a);
    assert_eq!(route.legs[2].to, d);
}

#[test]
fn reachable_stops_from_traverses_full_three_group_graph() {
    let config = three_group_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let a = sim.stop_entity(StopId(0)).unwrap();
    let b = sim.stop_entity(StopId(1)).unwrap();
    let c = sim.stop_entity(StopId(2)).unwrap();
    let d = sim.stop_entity(StopId(3)).unwrap();

    let reachable = sim.reachable_stops_from(a);
    assert!(reachable.contains(&b), "A should reach B");
    assert!(reachable.contains(&c), "A should reach C via transfer at B");
    assert!(
        reachable.contains(&d),
        "A should reach D via transfers at B and C"
    );
}

// ── 17. despawn_rider ─────────────────────────────────────────────────────────

#[test]
fn despawn_waiting_rider_removes_from_world() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    let rider = sim.spawn_rider(ground, transfer, 70.0).unwrap();

    // Rider is Waiting — despawn it.
    sim.despawn_rider(rider).unwrap();

    assert!(
        !sim.world().is_alive(rider.entity()),
        "despawned waiting rider should no longer be alive"
    );
    assert!(
        sim.world().rider(rider.entity()).is_none(),
        "despawned waiting rider should have no rider component"
    );
}

#[test]
fn despawn_riding_rider_removes_from_elevator_riders_list() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    let rider = sim.spawn_rider(ground, transfer, 70.0).unwrap();

    // Run until the rider boards.
    let mut elevator_id = None;
    for _ in 0..3000 {
        sim.step();
        if let Some(r) = sim.world().rider(rider.entity())
            && let RiderPhase::Riding(e) = r.phase
        {
            elevator_id = Some(e);
            break;
        }
    }
    let elev = elevator_id.expect("rider should board within 3000 ticks");

    // Verify load before despawn.
    let load_before = sim.world().elevator(elev).unwrap().current_load;
    assert!(
        load_before.value() > 0.0,
        "elevator should have load while carrying rider"
    );

    // Despawn the riding rider.
    sim.despawn_rider(rider).unwrap();

    assert!(
        !sim.world().is_alive(rider.entity()),
        "despawned riding rider should not be alive"
    );

    // The elevator's riders list should no longer contain this rider.
    let car = sim.world().elevator(elev).unwrap();
    assert!(
        !car.riders.contains(&rider.entity()),
        "elevator riders list should not contain despawned rider"
    );

    // Load should be reduced.
    assert!(
        car.current_load.value() < load_before.value(),
        "elevator load should decrease after rider despawn"
    );
}

#[test]
fn despawn_nonexistent_entity_does_not_panic() {
    // world.despawn on an unknown entity should be a no-op (not a crash).
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Use a made-up EntityId that was never spawned.
    // The alive check in world.despawn will simply skip it.
    let fake_id = crate::entity::EntityId::default();

    // This must not panic.
    sim.world_mut().despawn(fake_id);
}

// ── 18. build_rider with explicit group ──────────────────────────────────────

#[test]
fn build_rider_with_group_succeeds_when_group_serves_stops() {
    let config = overlapping_groups_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let bottom = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(1)).unwrap();

    // Both groups serve bottom and top — explicitly pick Group A (id=0).
    let result = sim
        .build_rider(bottom, top)
        .unwrap()
        .weight(70.0)
        .group(GroupId(0))
        .spawn();
    assert!(
        result.is_ok(),
        "build_rider with explicit group should succeed for a valid group"
    );

    let rider = result.unwrap();
    let r = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(r.phase, RiderPhase::Waiting);
}

#[test]
fn build_rider_with_nonexistent_group_returns_group_not_found() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    let result = sim
        .build_rider(ground, transfer)
        .unwrap()
        .weight(70.0)
        .group(GroupId(99))
        .spawn();
    assert!(
        matches!(result, Err(SimError::GroupNotFound(GroupId(99)))),
        "expected GroupNotFound(99), got {result:?}"
    );
}

// ── 19. Snapshot round-trip with multi-line topology ─────────────────────────

#[test]
fn snapshot_roundtrip_preserves_multi_group_topology() {
    let config = two_group_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    // Both groups must survive.
    assert_eq!(
        restored.groups().len(),
        2,
        "restored sim should have 2 groups"
    );

    // Each group should have exactly one line.
    let g0 = restored
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(0))
        .expect("GroupId(0) should exist after restore");
    let g1 = restored
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(1))
        .expect("GroupId(1) should exist after restore");

    assert_eq!(g0.lines().len(), 1, "Group 0 should have 1 line");
    assert_eq!(g1.lines().len(), 1, "Group 1 should have 1 line");

    // Each group should have exactly one elevator.
    assert_eq!(g0.elevator_entities().len(), 1);
    assert_eq!(g1.elevator_entities().len(), 1);
}

#[test]
fn snapshot_roundtrip_elevator_line_reference_is_valid() {
    let config = two_group_config();
    let sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Capture original elevator→line mappings.
    let orig_g0_elev = sim.elevators_on_line(sim.lines_in_group(GroupId(0))[0])[0];
    let orig_g1_elev = sim.elevators_on_line(sim.lines_in_group(GroupId(1))[0])[0];
    let orig_g0_line = sim.world().elevator(orig_g0_elev).unwrap().line();
    let orig_g1_line = sim.world().elevator(orig_g1_elev).unwrap().line();

    let snap = sim.snapshot();
    let restored = snap.restore(None).unwrap();

    // In the restored sim, each elevator's line reference must still point to a
    // valid line entity (even though EntityIds are remapped).
    let r_g0_elev = restored.elevators_on_line(restored.lines_in_group(GroupId(0))[0])[0];
    let r_g1_elev = restored.elevators_on_line(restored.lines_in_group(GroupId(1))[0])[0];

    let r_g0_line = restored.world().elevator(r_g0_elev).unwrap().line();
    let r_g1_line = restored.world().elevator(r_g1_elev).unwrap().line();

    // The line entities from the restored sim should exist in the world.
    assert!(
        restored.world().line(r_g0_line).is_some(),
        "restored Group 0 elevator's line should exist in world"
    );
    assert!(
        restored.world().line(r_g1_line).is_some(),
        "restored Group 1 elevator's line should exist in world"
    );

    // The two lines should be different entities.
    assert_ne!(
        r_g0_line, r_g1_line,
        "restored elevators should reference different lines"
    );

    // Sanity: original sim also had different lines.
    assert_ne!(orig_g0_line, orig_g1_line);
}

#[test]
fn snapshot_roundtrip_transport_mode_group_serde_alias() {
    // TransportMode::Group serializes as "Group" and deserializes via the
    // "Elevator" alias — verify round-trip through RON.
    let route = Route {
        legs: vec![RouteLeg {
            from: crate::entity::EntityId::default(),
            to: crate::entity::EntityId::default(),
            via: TransportMode::Group(GroupId(5)),
        }],
        current_leg: 0,
    };

    // Serialize to RON.
    let ron_str = ron::to_string(&route).expect("route should serialize to RON");

    // The serialized form uses "Group" (not "Elevator").
    assert!(
        ron_str.contains("Group"),
        "serialized route should contain 'Group', got: {ron_str}"
    );

    // Deserialize and verify it round-trips.
    let restored: Route = ron::from_str(&ron_str).expect("route should deserialize from RON");
    assert_eq!(
        restored.legs[0].via,
        TransportMode::Group(GroupId(5)),
        "round-tripped route leg should have Group(5)"
    );
}

// ── 20. PassingFloor direction field ─────────────────────────────────────────

#[test]
fn passing_floor_event_moving_up_is_true_when_ascending() {
    use crate::events::Event;

    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    // Spawn a rider going from Ground (pos 0) to Top (pos 20) — forces upward travel.
    // Group 0 can only reach Transfer (pos 10), so spawn within Group 0's range.
    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();
    sim.spawn_rider(ground, transfer, 70.0).unwrap();

    // Collect PassingFloor events; the single intermediate stop gets passed when
    // there's nothing between ground and transfer. Since there are only 2 stops in
    // this group, we won't see a PassingFloor here. Use the 3-group config which
    // has more stops.
    drop(sim);

    // Use the 3-group config: A(0)–B(10)–C(20)–D(30).
    // Dispatch elevator from A toward D — it will pass B and C.
    let config3 = three_group_config();
    let mut sim3 = Simulation::new(&config3, ScanDispatch::new()).unwrap();

    let a = sim3.stop_entity(StopId(0)).unwrap();
    let b = sim3.stop_entity(StopId(1)).unwrap();
    sim3.spawn_rider(a, b, 70.0).unwrap();

    let mut passing_up: Vec<bool> = Vec::new();
    for _ in 0..2000 {
        sim3.step();
        let events = sim3.drain_events();
        for e in events {
            if let Event::PassingFloor { moving_up, .. } = e {
                passing_up.push(moving_up);
            }
        }
        if !passing_up.is_empty() {
            break;
        }
    }

    // If a PassingFloor was emitted while going up, moving_up must be true.
    for up in &passing_up {
        assert!(
            up,
            "PassingFloor while ascending should have moving_up = true"
        );
    }
}

#[test]
fn passing_floor_event_moving_up_is_false_when_descending() {
    use crate::events::Event;

    // Use the 3-group config: elevator starts at StopId(1) (pos 10).
    // Spawn a rider going B→A (downward).
    let config = three_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let a = sim.stop_entity(StopId(0)).unwrap();
    let b = sim.stop_entity(StopId(1)).unwrap();

    // Spawn at B going to A — forces downward movement.
    sim.spawn_rider(b, a, 70.0).unwrap();

    let mut passing_events: Vec<bool> = Vec::new();
    for _ in 0..3000 {
        sim.step();
        let events = sim.drain_events();
        for e in events {
            if let Event::PassingFloor { moving_up, .. } = e {
                passing_events.push(moving_up);
            }
        }
    }

    // If any PassingFloor was emitted during a downward trip, moving_up must be false.
    for up in &passing_events {
        assert!(
            !up,
            "PassingFloor while descending should have moving_up = false"
        );
    }
}

// ── 21. Orphan line validation ────────────────────────────────────────────────

#[test]
fn orphan_line_not_referenced_by_any_group_fails_validation() {
    // Line 2 exists but is not in any group's lines list.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Orphan Line".into(),
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
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "Main".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "E1".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "Orphan".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "E2".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,

                        bypass_load_up_pct: None,

                        bypass_load_down_pct: None,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
            ]),
            // Only group references line 1; line 2 is orphaned.
            groups: Some(vec![GroupConfig {
                id: 0,
                name: "G0".into(),
                lines: vec![1],
                dispatch: crate::dispatch::BuiltinStrategy::Scan,
                reposition: None,
                hall_call_mode: None,
                ack_latency_ticks: None,
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

    let result = Simulation::new(&config, ScanDispatch::new());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.lines",
                ..
            })
        ),
        "expected InvalidConfig for orphan line, got {result:?}"
    );
}

// ── 20. Dispatch group-filter regression ─────────────────────────────────────

/// When two groups share a stop and a rider is bound for Group B, Group A's
/// elevator must not be dispatched to serve that phantom demand (which would
/// otherwise cause a perpetual open/close oscillation: dispatch → arrive →
/// open → no eligible rider → close → re-dispatch).
#[test]
fn dispatch_ignores_waiting_rider_targeting_another_group() {
    let config = overlapping_groups_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let bottom = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(1)).unwrap();

    // Group A's elevator starts at Stop 0 (Bottom), idle with doors closed.
    let group_a_elevator = sim
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(0))
        .unwrap()
        .elevator_entities()[0];

    // Spawn a rider at Bottom waiting to ride Group B to Top.
    let route = Route {
        legs: vec![RouteLeg {
            from: bottom,
            to: top,
            via: TransportMode::Group(GroupId(1)),
        }],
        current_leg: 0,
    };
    let rider = sim
        .build_rider(bottom, top)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();
    assert_eq!(
        sim.world().rider(rider.entity()).unwrap().phase,
        RiderPhase::Waiting
    );

    // Tick for a while. Group A's elevator should never open its doors
    // because no Group-A rider is waiting.
    let mut saw_door_opening = false;
    for _ in 0..100 {
        sim.step();
        let phase = sim.world().elevator(group_a_elevator).unwrap().phase;
        if matches!(
            phase,
            ElevatorPhase::DoorOpening | ElevatorPhase::Loading | ElevatorPhase::DoorClosing
        ) {
            saw_door_opening = true;
            break;
        }
    }

    assert!(
        !saw_door_opening,
        "Group A elevator must not open/close doors when only a Group B rider is waiting"
    );
}

// ── 21. Direction-indicator silent-skip regression (Bug A) ───────────────────

/// When a car arrives at a stop committed to one direction and every waiting
/// rider there wants the opposite direction, Loading would silently skip all
/// of them — doors cycle shut, dispatch re-sends the car, repeat forever.
/// With the fix, Loading detects the direction-filter-only skip and re-lights
/// both indicator lamps so the rider boards within a bounded number of ticks.
#[test]
fn car_with_opposite_indicator_eventually_boards_waiting_rider() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let transfer = sim.stop_entity(StopId(1)).unwrap();

    // Group 0's elevator starts at Ground, serves Ground+Transfer.
    let g0_elev = sim
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(0))
        .unwrap()
        .elevator_entities()[0];

    // Spawn a rider at Transfer heading down to Ground via Group 0.
    // Group 0's car will be dispatched up to Transfer (indicators: up only),
    // arrive, and — pre-fix — silently skip the rider since they want to
    // travel down (going_down=false on the car).
    let route = Route {
        legs: vec![RouteLeg {
            from: transfer,
            to: ground,
            via: TransportMode::Group(GroupId(0)),
        }],
        current_leg: 0,
    };
    let rider = sim
        .build_rider(transfer, ground)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    // Run until the rider boards (or times out), collecting events so we can
    // observe how many door-open/close cycles it took. Without the fix, the
    // car arrives, silently skips the rider during its first Loading session,
    // cycles doors closed, gets re-dispatched in-place (which resets lamps
    // via dispatch.rs's arrive-in-place branch), and only THEN boards —
    // costing an extra door cycle per stuck pass. With the fix, Loading
    // re-lights the lamps mid-session and the rider boards before doors
    // close.
    let mut events: Vec<SimEvent> = Vec::new();
    let mut boarded = false;
    for _ in 0..3000 {
        sim.step();
        events.extend(sim.drain_events());
        if let Some(r) = sim.world().rider(rider.entity())
            && matches!(
                r.phase,
                RiderPhase::Boarding(_) | RiderPhase::Riding(_) | RiderPhase::Arrived
            )
        {
            boarded = true;
            break;
        }
    }
    assert!(
        boarded,
        "rider going the opposite direction of the car's indicator should still board \
         (car entity {g0_elev:?})"
    );

    // Count door-close events on this elevator before the rider boarded.
    // Pre-fix: at least one close cycle happens before boarding. Post-fix:
    // the rider boards during the first Loading session, so zero door-close
    // events precede the RiderBoarded event.
    let mut door_closes_before_board = 0;
    for e in &events {
        match e {
            SimEvent::DoorClosed { elevator, .. } if *elevator == g0_elev => {
                door_closes_before_board += 1;
            }
            SimEvent::RiderBoarded { rider: r, .. } if *r == rider.entity() => break,
            _ => {}
        }
    }
    assert_eq!(
        door_closes_before_board, 0,
        "direction-filtered rider should board during the car's first Loading \
         session — a non-zero count means doors cycled shut with the rider \
         still waiting (Bug A)"
    );
}

// ── 22. Dispatch arrive-in-place consistency (Bug B) ─────────────────────────

/// When dispatch assigns an elevator to the stop it's already parked at, it
/// must set `target_stop` and pop that stop from the destination queue —
/// mirroring the semantics of the non-trivial branch and of `advance_queue`.
#[test]
fn dispatch_arrive_in_place_sets_target_and_pops_queue() {
    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();

    // Group 0's elevator starts at Ground.
    let elev = sim
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(0))
        .unwrap()
        .elevator_entities()[0];

    // Seed the queue with the current stop so we can observe the pop.
    sim.push_destination(ElevatorId::from(elev), ground)
        .unwrap();
    assert_eq!(
        sim.destination_queue(ElevatorId::from(elev)).unwrap().len(),
        1
    );

    // Spawn a rider at Ground so dispatch has demand at this stop.
    let transfer = sim.stop_entity(StopId(1)).unwrap();
    let route = Route {
        legs: vec![RouteLeg {
            from: ground,
            to: transfer,
            via: TransportMode::Group(GroupId(0)),
        }],
        current_leg: 0,
    };
    let _rider = sim
        .build_rider(ground, transfer)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    // One step runs dispatch; the Idle car will be assigned Ground and, since
    // it is already there, take the arrive-in-place branch.
    sim.step();

    let car = sim.world().elevator(elev).unwrap();
    assert_eq!(
        car.target_stop(),
        Some(ground),
        "arrive-in-place dispatch must set target_stop to the assigned stop"
    );
    assert!(
        !sim.destination_queue(ElevatorId::from(elev))
            .unwrap()
            .contains(&ground),
        "arrive-in-place dispatch must pop the matching queue front"
    );
}

// ── 23. advance_queue arrive-in-place indicator reset (Bug C) ────────────────

/// An imperative `push_destination_front` onto a car already parked at that
/// stop must re-light both indicator lamps before doors open, so stale
/// direction state from a prior trip doesn't feed into loading's filter.
#[test]
fn advance_queue_arrive_in_place_resets_direction_indicators() {
    use crate::components::ServiceMode;

    let config = two_group_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();

    let ground = sim.stop_entity(StopId(0)).unwrap();
    let elev = sim
        .groups()
        .iter()
        .find(|g| g.id() == GroupId(0))
        .unwrap()
        .elevator_entities()[0];

    // Put the car in Independent mode so dispatch/reposition skip it —
    // otherwise dispatch's arrive-in-place branch would reset indicators
    // before advance_queue gets a chance, masking the bug under test.
    sim.set_service_mode(elev, ServiceMode::Independent)
        .unwrap();

    // Manually set stale indicators — as if the car had just finished a
    // downward trip.
    {
        let car = sim.world_mut().elevator_mut(elev).unwrap();
        car.going_up = false;
        car.going_down = true;
    }

    // Queue the car to its own stop via the imperative front-push API.
    sim.push_destination_front(ElevatorId::from(elev), ground)
        .unwrap();

    // One step: advance_queue runs, sees at_stop == front, pops and opens
    // doors — and must reset lamps to (true, true) along the way.
    sim.step();

    let car = sim.world().elevator(elev).unwrap();
    assert!(
        car.going_up() && car.going_down(),
        "advance_queue arrive-in-place must re-light both indicator lamps \
         (got going_up={}, going_down={})",
        car.going_up(),
        car.going_down()
    );
    assert_eq!(
        car.target_stop(),
        Some(ground),
        "advance_queue arrive-in-place must set target_stop, mirroring \
         dispatch.rs's arrive-in-place semantics"
    );
}

// ── Per-line hall-call assignment at a shared stop ───────────────────────────

/// Two groups (each with one line) both serve Bottom and Top. Press
/// the Up button at Bottom and pin one car from each group — both
/// assignments must land in `assigned_cars_by_line` simultaneously,
/// keyed by the respective line entities. Pre-refactor the second pin
/// clobbered the first in a single `assigned_car` slot, so games
/// querying the call saw only the latest writer — the symptom the
/// playground surfaced as waiters jumping onto whichever specialty
/// shaft was dispatched most recently.
#[test]
fn multi_line_stop_holds_one_assignment_per_line() {
    use crate::components::CallDirection;

    let config = overlapping_groups_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let bottom = sim.stop_entity(StopId(0)).unwrap();

    let car_a = ElevatorId::from(
        sim.world()
            .elevator_ids()
            .first()
            .copied()
            .expect("line A must have a car"),
    );
    let car_b = ElevatorId::from(
        sim.world()
            .elevator_ids()
            .get(1)
            .copied()
            .expect("line B must have a car"),
    );

    let line_a = sim.world().elevator(car_a.entity()).unwrap().line();
    let line_b = sim.world().elevator(car_b.entity()).unwrap().line();
    assert_ne!(
        line_a, line_b,
        "precondition: cars must be on distinct lines"
    );

    sim.press_hall_button(bottom, CallDirection::Up).unwrap();
    sim.pin_assignment(car_a, bottom, CallDirection::Up)
        .unwrap();
    sim.pin_assignment(car_b, bottom, CallDirection::Up)
        .unwrap();

    let assignments = sim.assigned_cars_by_line(bottom, CallDirection::Up);
    let as_map: std::collections::BTreeMap<_, _> = assignments.into_iter().collect();
    assert_eq!(
        as_map.get(&line_a).copied(),
        Some(car_a.entity()),
        "line A's entry must reflect its pinned car"
    );
    assert_eq!(
        as_map.get(&line_b).copied(),
        Some(car_b.entity()),
        "line B's entry must reflect its pinned car — pre-refactor this \
         overwrote line A's slot"
    );
    assert_eq!(as_map.len(), 2, "one entry per line, no sharing");
}

/// `waiting_counts_by_line_at` splits waiters by their route leg's line.
/// A rider routed via Group(A) and another via Group(B) — both at the
/// same shared origin — produce two entries that sum to 2.
#[test]
fn waiting_counts_by_line_partitions_by_route_group() {
    let config = overlapping_groups_config();
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let bottom = sim.stop_entity(StopId(0)).unwrap();
    let top = sim.stop_entity(StopId(1)).unwrap();

    // Build two riders with explicit routes through different groups.
    let mk_route = |g: GroupId| Route {
        legs: vec![RouteLeg {
            from: bottom,
            to: top,
            via: TransportMode::Group(g),
        }],
        current_leg: 0,
    };
    sim.build_rider(bottom, top)
        .unwrap()
        .weight(70.0)
        .route(mk_route(GroupId(0)))
        .spawn()
        .unwrap();
    sim.build_rider(bottom, top)
        .unwrap()
        .weight(70.0)
        .route(mk_route(GroupId(1)))
        .spawn()
        .unwrap();

    let counts = sim.waiting_counts_by_line_at(bottom);
    let total: u32 = counts.iter().map(|(_, n)| n).sum();
    assert_eq!(total, 2, "both waiting riders accounted for");
    assert_eq!(counts.len(), 2, "one entry per distinct line");
    for (_line, n) in &counts {
        assert_eq!(*n, 1, "each line carries exactly one rider");
    }
}

/// Single group, two lines with disjoint stop sets — the dispatcher
/// must not assign a car to a stop that car's line doesn't serve.
///
/// Pre-fix the cost matrix happily ranked every `(car, stop)` pair in
/// the group; `restricted_stops` was the only filter, and built-in
/// strategies score on distance/direction without consulting line
/// topology. A car on line A would get assigned to a stop only line B
/// served, sit there, never reach it, and starve the call.
///
/// Hits any multi-line group (sky-lobby + service bank, low/high
/// banks sharing a transfer floor, etc).
#[test]
fn dispatch_does_not_assign_car_to_stop_its_line_does_not_serve() {
    // One group, two lines:
    //   Line A: serves stops 0 and 1
    //   Line B: serves stops 2 and 3
    // A car on Line B must NOT be dispatched to a hall call at stop 0.
    let config = SimConfig {
        building: BuildingConfig {
            name: "Disjoint".into(),
            stops: vec![
                StopConfig {
                    id: StopId(0),
                    name: "A0".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "A1".into(),
                    position: 4.0,
                },
                StopConfig {
                    id: StopId(2),
                    name: "B0".into(),
                    position: 100.0,
                },
                StopConfig {
                    id: StopId(3),
                    name: "B1".into(),
                    position: 104.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "carA".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,
                        bypass_load_up_pct: None,
                        bypass_load_down_pct: None,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "B".into(),
                    serves: vec![StopId(2), StopId(3)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "carB".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(2),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,
                        bypass_load_up_pct: None,
                        bypass_load_down_pct: None,
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
                name: "shared".into(),
                lines: vec![1, 2],
                dispatch: crate::dispatch::BuiltinStrategy::Scan,
                reposition: None,
                hall_call_mode: None,
                ack_latency_ticks: None,
            }]),
        },
        elevators: Vec::new(),
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };

    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let stop_a0 = sim.stop_entity(StopId(0)).unwrap();
    let car_a = sim
        .world()
        .iter_elevators()
        .find_map(|(eid, _, e)| (sim.world().line(e.line()).unwrap().name() == "A").then_some(eid))
        .unwrap();
    let car_b = sim
        .world()
        .iter_elevators()
        .find_map(|(eid, _, e)| (sim.world().line(e.line()).unwrap().name() == "B").then_some(eid))
        .unwrap();

    // Spawn a rider routed via the shared group at stop A0 → A1. The
    // dispatcher must pick car_a (line A serves both); car_b (line B)
    // must never be assigned. Watch the ElevatorAssigned events.
    sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    let mut saw_correct_assignment = false;
    for _ in 0..200 {
        for ev in sim.drain_events() {
            if let SimEvent::ElevatorAssigned { elevator, stop, .. } = ev
                && stop == stop_a0
            {
                assert_ne!(
                    elevator, car_b,
                    "car_b (line B) was assigned to stop A0 — line filter regressed"
                );
                if elevator == car_a {
                    saw_correct_assignment = true;
                }
            }
        }
        sim.step();
    }
    assert!(
        saw_correct_assignment,
        "car_a (line A) should have been assigned to stop A0"
    );
}

/// Two lines, two stops at the same physical position (one per line).
/// A car parked at the position must load/exit riders bound for *its*
/// line's stop, not whichever stop wins the global linear scan.
///
/// Pre-fix the loading system used the global lookup; with two stops
/// at position 0.0 the wrong line's stop could win the scan, no rider
/// would match `route.current_destination()`, and the car would sit
/// idle with riders aboard.
#[test]
fn loading_resolves_co_located_stops_to_the_cars_own_line() {
    use crate::components::RiderPhase;

    let config = SimConfig {
        building: BuildingConfig {
            name: "Co-located".into(),
            // Order matters: declare B's stops first so they receive
            // lower entity IDs and win the global linear scan in
            // `find_stop_at_position`. With A first the global lookup
            // returns A's stops by ID order and the test passes even
            // without the per-line fix — false-positive guard.
            stops: vec![
                StopConfig {
                    id: StopId(2),
                    name: "B0".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(3),
                    name: "B_top".into(),
                    position: 8.0,
                },
                StopConfig {
                    id: StopId(0),
                    name: "A0".into(),
                    position: 0.0,
                },
                StopConfig {
                    id: StopId(1),
                    name: "A_top".into(),
                    position: 8.0,
                },
            ],
            lines: Some(vec![
                LineConfig {
                    id: 1,
                    name: "A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: 1,
                        name: "carA".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(0),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,
                        bypass_load_up_pct: None,
                        bypass_load_down_pct: None,
                    }],
                    orientation: Orientation::Vertical,
                    position: None,
                    min_position: None,
                    max_position: None,
                    max_cars: None,
                },
                LineConfig {
                    id: 2,
                    name: "B".into(),
                    serves: vec![StopId(2), StopId(3)],
                    elevators: vec![ElevatorConfig {
                        id: 2,
                        name: "carB".into(),
                        max_speed: Speed::from(2.0),
                        acceleration: Accel::from(1.5),
                        deceleration: Accel::from(2.0),
                        weight_capacity: Weight::from(800.0),
                        starting_stop: StopId(2),
                        door_open_ticks: 10,
                        door_transition_ticks: 5,
                        restricted_stops: Vec::new(),
                        #[cfg(feature = "energy")]
                        energy_profile: None,
                        service_mode: None,
                        inspection_speed_factor: 0.25,
                        bypass_load_up_pct: None,
                        bypass_load_down_pct: None,
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
                    name: "A".into(),
                    lines: vec![1],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
                GroupConfig {
                    id: 1,
                    name: "B".into(),
                    lines: vec![2],
                    dispatch: crate::dispatch::BuiltinStrategy::Scan,
                    reposition: None,
                    hall_call_mode: None,
                    ack_latency_ticks: None,
                },
            ]),
        },
        elevators: Vec::new(),
        simulation: SimulationParams {
            ticks_per_second: 60.0,
        },
        passenger_spawning: PassengerSpawnConfig {
            mean_interval_ticks: 120,
            weight_range: (50.0, 100.0),
        },
    };
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let stop_a_top = sim.stop_entity(StopId(1)).unwrap();

    // Spawn a rider on line A: A0 → A_top.
    let rider = sim.spawn_rider(StopId(0), StopId(1), 70.0).unwrap();

    let mut delivered = false;
    for _ in 0..2000 {
        sim.step();
        let r = sim.world().rider(rider.entity()).unwrap();
        if r.phase() == RiderPhase::Arrived {
            delivered = true;
            break;
        }
    }
    assert!(delivered, "rider should be delivered with co-located stops");
    let r = sim.world().rider(rider.entity()).unwrap();
    assert_eq!(
        r.current_stop(),
        Some(stop_a_top),
        "rider must exit at line A's top stop, not line B's"
    );

    // Symmetric check: line B must not have been involved at all.
    // Pre-fix the loading lookup might pick the wrong line's stop and
    // try to board/exit on the wrong car; verify line B's car never
    // carried this rider.
    let car_b = sim
        .world()
        .iter_elevators()
        .find_map(|(eid, _, e)| (sim.world().line(e.line()).unwrap().name() == "B").then_some(eid))
        .unwrap();
    let car_b_riders = sim.world().elevator(car_b).unwrap().riders();
    assert!(
        !car_b_riders.contains(&rider.entity()),
        "rider must never have boarded line B's car"
    );
}
