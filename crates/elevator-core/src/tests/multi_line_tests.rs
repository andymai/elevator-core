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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "Low".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "High".into(),
                    serves: vec![StopId(1), StopId(2)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "Express A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "Express B".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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
    assert!((line_comp.linear_min().unwrap() - 0.0).abs() < 1e-9);
    assert!((line_comp.linear_max().unwrap() - 10.0).abs() < 1e-9);
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "Shaft A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "Shaft B".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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

#[cfg(feature = "loop_lines")]
#[test]
fn add_line_rejects_loop_with_unsatisfiable_headway() {
    use super::helpers::{default_config, scan};
    use crate::components::LineKind;
    use crate::error::SimError;

    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let group_id = sim.add_group("Loop", ScanDispatch::new());

    // 4 cars × 30 m headway = 120 m required, but circumference is only 100.
    let mut params = crate::sim::LineParams::new("Tight Loop", group_id);
    params.kind = Some(LineKind::Loop {
        circumference: 100.0,
        min_headway: 30.0,
    });
    params.max_cars = Some(4);

    match sim.add_line(&params) {
        Err(SimError::InvalidConfig { field, reason }) => {
            assert_eq!(field, "line.kind");
            assert!(
                reason.contains("exceeds circumference"),
                "unexpected reason: {reason}",
            );
        }
        other => panic!("expected InvalidConfig, got {other:?}"),
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn add_line_accepts_loop_with_satisfiable_headway() {
    use super::helpers::{default_config, scan};
    use crate::components::LineKind;

    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();
    let group_id = sim.add_group("Loop", ScanDispatch::new());

    // 3 cars × 20 m = 60 m, well under 100 m circumference.
    let mut params = crate::sim::LineParams::new("OK Loop", group_id);
    params.kind = Some(LineKind::Loop {
        circumference: 100.0,
        min_headway: 20.0,
    });
    params.max_cars = Some(3);

    sim.add_line(&params).expect("loop line should be accepted");
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_accessors_report_topology() {
    use super::helpers::{default_config, scan};
    use crate::components::LineKind;

    let config = default_config();
    let mut sim = Simulation::new(&config, scan()).unwrap();

    // The default config produces a Linear line at GroupId(0).
    let linear_line = sim.lines_in_group(GroupId(0))[0];
    assert!(!sim.is_loop(linear_line));
    assert_eq!(sim.loop_circumference(linear_line), None);
    assert_eq!(sim.loop_next_stop(linear_line, 0.0), None);

    // Add a Loop in a separate group.
    let group = sim.add_group("LoopGroup", ScanDispatch::new());
    let mut params = crate::sim::LineParams::new("Track", group);
    params.kind = Some(LineKind::Loop {
        circumference: 100.0,
        min_headway: 5.0,
    });
    let loop_line = sim.add_line(&params).unwrap();

    assert!(sim.is_loop(loop_line));
    assert_eq!(sim.loop_circumference(loop_line), Some(100.0));
    // Loop has no served stops yet → loop_next_stop returns None.
    assert_eq!(sim.loop_next_stop(loop_line, 0.0), None);
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_next_stop_returns_forward_neighbour() {
    use crate::components::LineKind;

    // Build a config with a Loop line that serves StopId(0..3) at
    // positions 0/25/50/75 around a 100m loop.
    let mut config = two_group_config();
    {
        let stops = &mut config.building.stops;
        stops[0].position = 0.0;
        stops[1].position = 25.0;
        stops[2].position = 50.0;
    }
    if let Some(lines) = config.building.lines.as_mut() {
        lines[0].kind = Some(LineKind::Loop {
            circumference: 100.0,
            min_headway: 5.0,
        });
        lines[0].serves = vec![StopId(0), StopId(1), StopId(2)];
    }
    if let Some(groups) = config.building.groups.as_mut() {
        // Collapse to one group containing only the loop line so the
        // homogeneity check passes.
        groups[0].lines = vec![1];
        groups[0].dispatch = crate::dispatch::BuiltinStrategy::LoopSweep;
        groups.remove(1);
    }
    config.building.lines.as_mut().unwrap().truncate(1);

    let sim = Simulation::new(&config, crate::dispatch::LoopSweepDispatch::new()).unwrap();
    let loop_line = sim.lines_in_group(GroupId(0))[0];

    // From position 10 → next forward is StopId(1) @ 25.
    let next = sim.loop_next_stop(loop_line, 10.0).unwrap();
    let next_pos = sim.world().stop_position(next).unwrap();
    assert!((next_pos - 25.0).abs() < 1e-9);

    // From position 60 → next forward is StopId(0) @ 0 (through the seam).
    let next = sim.loop_next_stop(loop_line, 60.0).unwrap();
    let next_pos = sim.world().stop_position(next).unwrap();
    assert!(next_pos.abs() < 1e-9);

    // Coincident with stop at 25 → returns the *next* one (50), not 25.
    let next = sim.loop_next_stop(loop_line, 25.0).unwrap();
    let next_pos = sim.world().stop_position(next).unwrap();
    assert!((next_pos - 50.0).abs() < 1e-9);

    // Non-finite positions reject up front so callers can't silently
    // get back the first served stop as a "valid" answer.
    assert_eq!(sim.loop_next_stop(loop_line, f64::NAN), None);
    assert_eq!(sim.loop_next_stop(loop_line, f64::INFINITY), None);
    assert_eq!(sim.loop_next_stop(loop_line, f64::NEG_INFINITY), None);
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_car_traverses_seam_and_arrives() {
    use crate::components::{ElevatorPhase, LineKind};

    // 3-stop loop at positions 0 / 25 / 50; circumference = 100.
    // Build a config with exactly one elevator on the loop, starting at
    // stop @ 50, and target stop @ 25. The forward cyclic path is
    // 50 → 100 → 0 → 25 (75 units, crossing the seam) — verifies the
    // cyclic movement integration in `systems/movement.rs` as well as
    // the seam-aware PassingFloor split (the stop at position 0 must
    // fire its event during the wrap segment).
    let mut config = two_group_config();
    {
        let stops = &mut config.building.stops;
        stops[0].position = 0.0;
        stops[1].position = 25.0;
        stops[2].position = 50.0;
    }
    if let Some(lines) = config.building.lines.as_mut() {
        lines[0].kind = Some(LineKind::Loop {
            circumference: 100.0,
            min_headway: 5.0,
        });
        lines[0].serves = vec![StopId(0), StopId(1), StopId(2)];
        // Move the elevator's starting stop to one *behind* the target
        // in linear coords so cyclic semantics are exercised.
        lines[0].elevators[0].starting_stop = StopId(2); // position 50
    }
    if let Some(groups) = config.building.groups.as_mut() {
        groups[0].lines = vec![1];
        groups[0].dispatch = crate::dispatch::BuiltinStrategy::LoopSweep;
        groups.remove(1);
    }
    config.building.lines.as_mut().unwrap().truncate(1);

    let mut sim = Simulation::new(&config, crate::dispatch::LoopSweepDispatch::new()).unwrap();
    let car_eid = sim.world().iter_elevators().next().unwrap().0;

    // Resolve target stop entity by config id.
    let stop_25 = sim
        .world()
        .iter_stops()
        .find(|(_, s)| (s.position - 25.0).abs() < 1e-9)
        .map(|(eid, _)| eid)
        .unwrap();

    // Push a destination so the per-tick `advance_queue` phase doesn't
    // reset the manually-set MovingToStop back to Idle. The car still
    // moves under the cyclic integrator because its line is a Loop.
    sim.push_destination(ElevatorId::from(car_eid), stop_25)
        .expect("push destination on loop car");

    // Step until arrival or a generous bound. With max_speed 2 and
    // accel/decel 1.5/2 and dt=1/60, 75 units ≈ 38 seconds = 2280
    // ticks — pad to 5000.
    // Resolve the stop @ 0 entity — we'll watch for its PassingFloor.
    let stop_zero = sim
        .world()
        .iter_stops()
        .find(|(_, s)| s.position.abs() < 1e-9)
        .map(|(eid, _)| eid)
        .unwrap();

    let mut crossed_seam = false;
    let mut saw_stop_zero_pass = false;
    let mut prev_pos = sim.world().position(car_eid).unwrap().value;
    let mut arrived = false;
    for _ in 0..5000 {
        sim.step();
        let current_pos = sim.world().position(car_eid).unwrap().value;
        // Seam crossing on a forward-moving Loop car: new_pos < old_pos
        // mid-trip.
        if current_pos < prev_pos - 1e-9 {
            crossed_seam = true;
        }
        prev_pos = current_pos;
        for ev in sim.drain_events() {
            if let crate::events::Event::PassingFloor { stop, .. } = ev
                && stop == stop_zero
            {
                saw_stop_zero_pass = true;
            }
        }
        if matches!(
            sim.world().elevator(car_eid).unwrap().phase,
            ElevatorPhase::DoorOpening
                | ElevatorPhase::Loading
                | ElevatorPhase::DoorClosing
                | ElevatorPhase::Stopped
        ) {
            arrived = true;
            break;
        }
    }

    assert!(
        crossed_seam,
        "expected the cyclic movement integrator to wrap past the seam",
    );
    assert!(
        saw_stop_zero_pass,
        "expected PassingFloor for the stop at position 0 during seam crossing",
    );
    assert!(
        arrived,
        "loop car never reached the target stop within the tick budget",
    );
    let final_pos = sim.world().position(car_eid).unwrap().value;
    assert!(
        (final_pos - 25.0).abs() < 1e-6,
        "loop car arrived at {final_pos}, expected 25.0",
    );
}

#[cfg(feature = "loop_lines")]
#[test]
fn config_rejects_mixed_loop_and_linear_in_same_group() {
    use crate::components::LineKind;
    use crate::error::SimError;

    let mut config = two_group_config();
    // Force group 0 to contain both lines (one Linear, one Loop) by
    // putting line 2 into the same group and giving it a Loop kind.
    if let Some(groups) = config.building.groups.as_mut() {
        groups[0].lines = vec![1, 2];
        groups.remove(1); // collapse to a single group containing both lines
    }
    if let Some(lines) = config.building.lines.as_mut() {
        lines[1].kind = Some(LineKind::Loop {
            circumference: 100.0,
            min_headway: 5.0,
        });
        lines[1].serves = vec![StopId(1), StopId(2)];
    }

    match Simulation::new(&config, ScanDispatch::new()) {
        Err(SimError::InvalidConfig { field, reason }) => {
            assert_eq!(field, "building.groups");
            assert!(
                reason.contains("homogeneous"),
                "unexpected reason: {reason}",
            );
        }
        other => panic!("expected InvalidConfig, got {other:?}"),
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn config_rejects_reposition_strategy_on_loop_group() {
    use crate::components::LineKind;
    use crate::dispatch::BuiltinReposition;
    use crate::error::SimError;

    let mut config = two_group_config();
    // Convert group 0 / line 1 into a Loop, and attach a parking-style
    // reposition strategy that doesn't compose with continuous-patrol
    // semantics.
    if let Some(lines) = config.building.lines.as_mut() {
        lines[0].kind = Some(LineKind::Loop {
            circumference: 100.0,
            min_headway: 5.0,
        });
    }
    if let Some(groups) = config.building.groups.as_mut() {
        groups[0].reposition = Some(BuiltinReposition::ReturnToLobby);
    }

    match Simulation::new(&config, ScanDispatch::new()) {
        Err(SimError::InvalidConfig { field, reason }) => {
            assert_eq!(field, "building.groups.reposition");
            assert!(reason.contains("Loop"), "unexpected reason: {reason}");
        }
        other => panic!("expected InvalidConfig, got {other:?}"),
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn config_rejects_loop_with_duplicate_position_stops() {
    use crate::components::LineKind;
    use crate::error::SimError;

    let mut config = two_group_config();
    // Two stops at the same position on a single loop line.
    if let Some(lines) = config.building.lines.as_mut() {
        lines[0].kind = Some(LineKind::Loop {
            circumference: 100.0,
            min_headway: 5.0,
        });
        lines[0].serves = vec![StopId(0), StopId(1), StopId(2)];
    }
    if let Some(groups) = config.building.groups.as_mut() {
        // Match the construction validator's strategy guard for Loop
        // groups so the check we're actually exercising — duplicate
        // stop positions — runs through to its rejection.
        groups[0].dispatch = crate::dispatch::BuiltinStrategy::LoopSweep;
    }
    // Force StopId(1) and StopId(2) to share a position.
    config.building.stops[1].position = 5.0;
    config.building.stops[2].position = 5.0;

    match Simulation::new(&config, ScanDispatch::new()) {
        Err(SimError::InvalidConfig { field, reason }) => {
            assert_eq!(field, "building.lines.serves");
            assert!(
                reason.contains("duplicate stop position"),
                "unexpected reason: {reason}",
            );
        }
        other => panic!("expected InvalidConfig, got {other:?}"),
    }
}

/// Construct a single-line, single-group Loop config from `two_group_config`.
/// The base helper ships a Linear two-group setup; this collapses to one
/// group with a 100-unit loop serving 4 stops at 0 / 25 / 50 / 75.
#[cfg(feature = "loop_lines")]
fn loop_only_config() -> SimConfig {
    use crate::components::LineKind;
    let mut config = two_group_config();
    config.building.stops = vec![
        StopConfig {
            id: StopId(0),
            name: "S0".into(),
            position: 0.0,
        },
        StopConfig {
            id: StopId(1),
            name: "S1".into(),
            position: 25.0,
        },
        StopConfig {
            id: StopId(2),
            name: "S2".into(),
            position: 50.0,
        },
        StopConfig {
            id: StopId(3),
            name: "S3".into(),
            position: 75.0,
        },
    ];
    if let Some(lines) = config.building.lines.as_mut() {
        lines[0].kind = Some(LineKind::Loop {
            circumference: 100.0,
            min_headway: 5.0,
        });
        lines[0].serves = vec![StopId(0), StopId(1), StopId(2), StopId(3)];
        lines[0].elevators[0].starting_stop = StopId(0);
    }
    if let Some(groups) = config.building.groups.as_mut() {
        groups[0].lines = vec![1];
        groups[0].dispatch = crate::dispatch::BuiltinStrategy::LoopSweep;
        groups.remove(1);
    }
    config.building.lines.as_mut().unwrap().truncate(1);
    config
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_car_kickstarts_from_idle_on_first_tick() {
    use crate::dispatch::LoopSweepDispatch;
    let config = loop_only_config();
    let mut sim = Simulation::new(&config, LoopSweepDispatch::new()).unwrap();
    let car_eid = sim.world().iter_elevators().next().unwrap().0;

    // Construction places the car at Idle. Without the kickstart pass in
    // dispatch.run, a Loop car would sit forever — Loop strategies don't
    // commit destinations through the dispatch matching. The lamp state is
    // pre-seeded to Forward at spawn so hosts inspecting before the first
    // step() already see a coherent reading.
    let pre = sim.world().elevator(car_eid).unwrap();
    assert_eq!(pre.phase, ElevatorPhase::Idle);
    assert!(pre.going_forward());

    sim.step();

    let car = sim.world().elevator(car_eid).unwrap();
    assert!(
        matches!(car.phase, ElevatorPhase::MovingToStop(_)),
        "expected kickstart to promote Idle Loop car to MovingToStop, got {:?}",
        car.phase,
    );
    assert!(
        car.going_forward(),
        "kickstart must keep going_forward = true so direction() reports Forward",
    );
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_car_continues_patrol_after_door_close() {
    use crate::dispatch::LoopSweepDispatch;
    let config = loop_only_config();
    let mut sim = Simulation::new(&config, LoopSweepDispatch::new()).unwrap();
    let car_eid = sim.world().iter_elevators().next().unwrap().0;

    // Run long enough for the car to arrive at the next stop, cycle
    // doors, and depart for the *following* stop. With a 100-unit loop
    // and 4 evenly-spaced stops, the car traverses 25 units between
    // stops — at max_speed 2 + accel/decel 1.5/2 + dt=1/60 that's
    // roughly 13 seconds = 800 ticks per leg, so 4000 ticks covers
    // arrive + door cycle + depart for the next stop with margin.
    let mut visited: std::collections::HashSet<crate::entity::EntityId> =
        std::collections::HashSet::new();
    let mut saw_post_close_moving = false;
    for _ in 0..4000 {
        sim.step();
        let car = sim.world().elevator(car_eid).unwrap();
        // Post-FinishedClosing: the FSM should have handed straight to
        // MovingToStop, not Stopped/Idle. We watch every tick where the
        // car is moving and was *not* moving on the previous loading-cycle —
        // any sighting of a fresh MovingToStop after door cycle confirms
        // the loop continuation.
        if let ElevatorPhase::MovingToStop(target) = car.phase {
            visited.insert(target);
        }
        // The bug we're guarding against: car phase ever becoming
        // Stopped on a Loop line. (Idle is allowed for the very first
        // tick before kickstart fires.)
        assert_ne!(
            car.phase,
            ElevatorPhase::Stopped,
            "Loop car must never transition to Stopped — door FSM should hand off to MovingToStop",
        );
        if visited.len() >= 2 {
            saw_post_close_moving = true;
            break;
        }
    }
    assert!(
        saw_post_close_moving,
        "expected the Loop car to commit to a second forward target after the first door close — \
         visited {} distinct targets",
        visited.len(),
    );
    assert!(
        sim.world().elevator(car_eid).unwrap().going_forward(),
        "going_forward must remain true throughout patrol",
    );
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_boarding_ignores_linear_direction_gate() {
    use crate::dispatch::LoopSweepDispatch;
    // A Loop car arrives at stop_50 (position 50). A rider at stop_50
    // wants to reach stop_25 (position 25 — *behind* in linear coords).
    // On a Linear line the going_down lamp would gate this rider out
    // unless both lamps are lit. On a Loop, every destination is forward
    // through the cycle — boarding must bypass the gate.
    let config = loop_only_config();
    let mut sim = Simulation::new(&config, LoopSweepDispatch::new()).unwrap();
    let car_eid = sim.world().iter_elevators().next().unwrap().0;
    let line_eid = sim.world().elevator(car_eid).unwrap().line();
    let stop_50 = sim
        .world()
        .iter_stops()
        .find(|(_, s)| (s.position - 50.0).abs() < 1e-9)
        .map(|(eid, _)| eid)
        .unwrap();
    let stop_25 = sim
        .world()
        .iter_stops()
        .find(|(_, s)| (s.position - 25.0).abs() < 1e-9)
        .map(|(eid, _)| eid)
        .unwrap();

    // Spawn a rider at stop_50 routed to stop_25 (the lower-positioned
    // stop). On a Linear line, this leg's `from > to` would set the
    // `dp < cp && !going_down` branch and silently filter the rider.
    let route = Route {
        legs: vec![RouteLeg {
            from: stop_50,
            to: stop_25,
            via: TransportMode::Line(line_eid),
        }],
        current_leg: 0,
    };
    let rider = sim
        .build_rider(stop_50, stop_25)
        .unwrap()
        .weight(70.0)
        .route(route)
        .spawn()
        .unwrap();

    // Step until the rider reaches Boarding/Riding/Exiting/Arrived.
    // 4000 ticks ≈ 66 seconds — enough for the car to traverse half a
    // loop plus door cycles.
    let mut boarded = false;
    for _ in 0..4000 {
        sim.step();
        let phase = sim.world().rider(rider.entity()).unwrap().phase;
        if matches!(
            phase,
            RiderPhase::Boarding(_)
                | RiderPhase::Riding(_)
                | RiderPhase::Exiting(_)
                | RiderPhase::Arrived
        ) {
            boarded = true;
            break;
        }
    }
    assert!(
        boarded,
        "Loop car must board a rider whose destination is at a lower linear position — \
         the directional lamp gate must be bypassed on Loop lines",
    );
}

#[cfg(feature = "loop_lines")]
#[test]
fn config_rejects_linear_dispatch_strategy_on_loop_group() {
    use crate::components::LineKind;
    use crate::error::SimError;

    // Loop group with the default `BuiltinStrategy::Scan` dispatch:
    // construction must reject loud rather than silently install a
    // strategy that would never be invoked (Loop cars are excluded
    // from the Hungarian idle pool by `systems::dispatch::run`).
    let mut config = two_group_config();
    if let Some(lines) = config.building.lines.as_mut() {
        lines[0].kind = Some(LineKind::Loop {
            circumference: 100.0,
            min_headway: 5.0,
        });
    }
    if let Some(groups) = config.building.groups.as_mut() {
        // Default from `two_group_config` is `BuiltinStrategy::Scan`;
        // assert that explicitly so the test fails with a clear
        // message if the helper's default changes.
        assert_eq!(
            groups[0].dispatch,
            crate::dispatch::BuiltinStrategy::Scan,
            "test relies on `two_group_config` defaulting to Scan",
        );
    }

    match Simulation::new(&config, ScanDispatch::new()) {
        Err(SimError::InvalidConfig { field, reason }) => {
            assert_eq!(field, "building.groups.dispatch");
            assert!(
                reason.contains("LoopSweep"),
                "rejection message should name LoopSweep as the supported strategy: {reason}",
            );
        }
        other => panic!("expected InvalidConfig, got {other:?}"),
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_sweep_strategy_round_trips_through_snapshot_identity() {
    use crate::dispatch::{BuiltinStrategy, DispatchStrategy, LoopSweepDispatch};

    // `LoopSweepDispatch::builtin_id()` must report
    // `BuiltinStrategy::LoopSweep` so a snapshot round-trip restores
    // the same identity. Without this, `WorldSnapshot::restore` would
    // fall back to recording `Scan` (per the `builtin_id` doc) and the
    // restored sim would refuse to construct (Loop group + Scan
    // dispatch is rejected by `validate_explicit_topology`).
    let strategy = LoopSweepDispatch::new();
    assert_eq!(strategy.builtin_id(), Some(BuiltinStrategy::LoopSweep));
    assert!(BuiltinStrategy::LoopSweep.instantiate().is_some());
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_sweep_delivers_riders_to_every_served_stop() {
    use crate::dispatch::LoopSweepDispatch;

    // End-to-end check that `LoopSweep` (via the kickstart + door FSM
    // continuation + boarding bypass wiring) delivers a rider on every
    // possible (origin, destination) pair around the loop. With four
    // stops at 0/25/50/75 there are 12 ordered non-trivial pairs;
    // running each in isolation keeps the assertion local to the
    // delivery contract rather than entangling it with multi-rider
    // scheduling, which lands when `LoopSchedule` ships.
    let stops_at = [0.0, 25.0, 50.0, 75.0];

    for (origin_idx, &origin_pos) in stops_at.iter().enumerate() {
        for (dest_idx, &dest_pos) in stops_at.iter().enumerate() {
            if origin_idx == dest_idx {
                continue;
            }

            let config = loop_only_config();
            let mut sim = Simulation::new(&config, LoopSweepDispatch::new()).unwrap();
            let line_eid = sim.world().iter_elevators().next().unwrap().2.line();

            let origin = sim
                .world()
                .iter_stops()
                .find(|(_, s)| (s.position - origin_pos).abs() < 1e-9)
                .map(|(eid, _)| eid)
                .unwrap();
            let dest = sim
                .world()
                .iter_stops()
                .find(|(_, s)| (s.position - dest_pos).abs() < 1e-9)
                .map(|(eid, _)| eid)
                .unwrap();

            // Spawn a single rider at `origin` routed to `dest`.
            // `build_rider` keeps the rider-index entry in sync; using
            // raw `set_rider` would skip it and the loading phase
            // wouldn't see them at the stop.
            let rider = sim
                .build_rider(origin, dest)
                .unwrap()
                .weight(70.0)
                .route(Route {
                    legs: vec![RouteLeg {
                        from: origin,
                        to: dest,
                        via: TransportMode::Line(line_eid),
                    }],
                    current_leg: 0,
                })
                .spawn()
                .unwrap();

            // Worst case: rider one stop behind the car in the forward
            // direction → almost a full lap to pick up + worst-case
            // forward distance to drop off ≈ ~2 laps. With max_speed
            // 2 + 25-unit gaps + door cycles, 8000 ticks is generous.
            let mut delivered = false;
            for _ in 0..8000 {
                sim.step();
                if matches!(
                    sim.world().rider(rider.entity()).unwrap().phase,
                    RiderPhase::Arrived
                ) {
                    delivered = true;
                    break;
                }
            }
            assert!(
                delivered,
                "LoopSweep failed to deliver rider {origin_pos} → {dest_pos} within budget",
            );
        }
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_schedule_strategy_round_trips_through_snapshot_identity() {
    use crate::dispatch::{BuiltinStrategy, DispatchStrategy, LoopScheduleDispatch};

    let strategy = LoopScheduleDispatch::new(45, 360, 90);
    assert_eq!(strategy.builtin_id(), Some(BuiltinStrategy::LoopSchedule));
    assert!(BuiltinStrategy::LoopSchedule.instantiate().is_some());

    // Snapshot config must carry all three tunables so the next sim
    // resumes with the original schedule rather than the `default()`
    // tuning that `BuiltinStrategy::instantiate` would otherwise emit.
    let serialized = strategy.snapshot_config().expect("snapshot_config");
    let mut restored = LoopScheduleDispatch::default();
    restored
        .restore_config(&serialized)
        .expect("restore_config");
    assert_eq!(restored.dwell_ticks(), 45);
    assert_eq!(restored.target_headway_ticks(), 360);
    assert_eq!(restored.hold_cap_ticks(), 90);
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_schedule_overrides_per_car_door_open_ticks() {
    use crate::dispatch::LoopScheduleDispatch;

    // `loop_only_config` ships `door_open_ticks: 10`. After the first
    // dispatch tick under LoopSchedule(dwell=42, headway=600), every
    // Loop car's `door_open_ticks` should be rewritten to 42 — and
    // stay there on subsequent ticks (idempotent rewrite).
    let mut config = loop_only_config();
    if let Some(groups) = config.building.groups.as_mut() {
        groups[0].dispatch = crate::dispatch::BuiltinStrategy::LoopSchedule;
    }
    let mut sim = Simulation::new(&config, LoopScheduleDispatch::new(42, 600, 120)).unwrap();
    let car_eid = sim.world().iter_elevators().next().unwrap().0;

    assert_eq!(
        sim.world().elevator(car_eid).unwrap().door_open_ticks(),
        10,
        "test relies on `loop_only_config` defaulting to door_open_ticks=10",
    );

    sim.step();

    assert_eq!(
        sim.world().elevator(car_eid).unwrap().door_open_ticks(),
        42,
        "LoopSchedule must rewrite per-car door_open_ticks to its dwell_ticks",
    );

    for _ in 0..5 {
        sim.step();
        assert_eq!(
            sim.world().elevator(car_eid).unwrap().door_open_ticks(),
            42,
            "subsequent ticks must leave the rewritten dwell intact",
        );
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_schedule_delivers_riders_around_loop() {
    use crate::dispatch::LoopScheduleDispatch;

    // Smoke-test that LoopSchedule preserves the end-to-end delivery
    // contract: with a non-trivial dwell override applied every tick,
    // the kickstart + door FSM + boarding bypass machinery still
    // drives a rider from any stop to any other on the loop. Three
    // sampled pairs is enough; the LoopSweep test covers the full
    // 12-pair matrix.
    let cases = [(0.0_f64, 50.0_f64), (75.0, 25.0), (25.0, 0.0)];

    for (origin_pos, dest_pos) in cases {
        let mut config = loop_only_config();
        if let Some(groups) = config.building.groups.as_mut() {
            groups[0].dispatch = crate::dispatch::BuiltinStrategy::LoopSchedule;
        }
        // Pick a dwell that's small enough not to dominate the
        // delivery budget. Real schedules pick this from the
        // expected boarding time at each stop.
        let mut sim = Simulation::new(&config, LoopScheduleDispatch::new(20, 600, 120)).unwrap();
        let line_eid = sim.world().iter_elevators().next().unwrap().2.line();

        let origin = sim
            .world()
            .iter_stops()
            .find(|(_, s)| (s.position - origin_pos).abs() < 1e-9)
            .map(|(eid, _)| eid)
            .unwrap();
        let dest = sim
            .world()
            .iter_stops()
            .find(|(_, s)| (s.position - dest_pos).abs() < 1e-9)
            .map(|(eid, _)| eid)
            .unwrap();

        let rider = sim
            .build_rider(origin, dest)
            .unwrap()
            .weight(70.0)
            .route(Route {
                legs: vec![RouteLeg {
                    from: origin,
                    to: dest,
                    via: TransportMode::Line(line_eid),
                }],
                current_leg: 0,
            })
            .spawn()
            .unwrap();

        let mut delivered = false;
        for _ in 0..8000 {
            sim.step();
            if matches!(
                sim.world().rider(rider.entity()).unwrap().phase,
                RiderPhase::Arrived
            ) {
                delivered = true;
                break;
            }
        }
        assert!(
            delivered,
            "LoopSchedule failed to deliver rider {origin_pos} → {dest_pos} within budget",
        );
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn config_accepts_loop_schedule_strategy_on_loop_group() {
    // `loop_only_config` defaults to LoopSweep; flipping the dispatch
    // field to LoopSchedule must construct cleanly. Together with the
    // existing `config_rejects_linear_dispatch_strategy_on_loop_group`
    // (from PR #816), this covers the relaxed validator: Loop groups
    // accept LoopSweep *or* LoopSchedule, nothing else.
    let mut config = loop_only_config();
    if let Some(groups) = config.building.groups.as_mut() {
        groups[0].dispatch = crate::dispatch::BuiltinStrategy::LoopSchedule;
    }
    Simulation::new(&config, crate::dispatch::LoopScheduleDispatch::default())
        .expect("LoopSchedule must be accepted on a Loop group");
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_schedule_hold_recovery_extends_dwell_for_early_arrival() {
    // Drive the hold-recovery path with a hand-built world. Two
    // elevators on a Loop line; we record an earlier arrival at a
    // stop, then put the second car in Loading at that stop with
    // `CurrentTick` close to the recorded arrival (i.e. *below*
    // target headway). The strategy must enqueue a HoldOpen on the
    // second car whose extension matches the gap deficit.
    use crate::arrival_log::CurrentTick;
    use crate::components::{ElevatorPhase, Line, LineKind, Orientation, Stop};
    use crate::dispatch::{DispatchManifest, DispatchStrategy, ElevatorGroup, LineInfo};
    use crate::door::DoorCommand;
    use crate::ids::GroupId;
    use crate::world::World;

    let mut world = World::new();

    // Build the Loop line.
    let line_eid = world.spawn();
    world.set_line(
        line_eid,
        Line {
            name: "Track".into(),
            group: GroupId(0),
            orientation: Orientation::Vertical,
            position: None,
            kind: LineKind::Loop {
                circumference: 100.0,
                min_headway: 5.0,
            },
            max_cars: None,
        },
    );

    // One served stop is enough for this test — hold-recovery keys on
    // per-stop arrival ticks, not per-line.
    let stop_eid = world.spawn();
    world.set_stop(
        stop_eid,
        Stop {
            name: "S0".into(),
            position: 0.0,
        },
    );

    // Spawn two elevators on the loop. The leader is parked off-stop
    // and idle — pre_dispatch shouldn't touch its phase, only its
    // dwell. The follower is parked at `stop_eid` in Loading.
    let leader = super::dispatch_tests::spawn_elevator(&mut world, 50.0);
    let follower = super::dispatch_tests::spawn_elevator(&mut world, 0.0);
    {
        let car = world.elevator_mut(follower).unwrap();
        car.line = line_eid;
        car.phase = ElevatorPhase::Loading;
        car.target_stop = Some(stop_eid);
    }
    {
        let car = world.elevator_mut(leader).unwrap();
        car.line = line_eid;
    }

    let group = ElevatorGroup::new(
        GroupId(0),
        "Track".into(),
        vec![LineInfo::new(
            line_eid,
            vec![leader, follower],
            vec![stop_eid],
        )],
    );

    // Target headway 600 ticks; the recorded prior arrival was 100
    // ticks ago. Deficit = 500. Cap = 1000 (high enough not to bind).
    world.insert_resource(CurrentTick(1_000));
    let mut sched = crate::dispatch::LoopScheduleDispatch::new(20, 600, 1_000);

    // Two arrivals at the same stop drive recovery: run pre_dispatch
    // once with the leader in Loading at the stop (records its
    // arrival tick), then move the leader away, advance the clock by
    // 100, put the follower in Loading at the same stop, and run
    // pre_dispatch again.
    {
        let car = world.elevator_mut(leader).unwrap();
        car.phase = ElevatorPhase::Loading;
        car.target_stop = Some(stop_eid);
        car.door_command_queue.clear();
    }
    {
        let car = world.elevator_mut(follower).unwrap();
        car.phase = ElevatorPhase::Idle;
    }
    let manifest = DispatchManifest::default();
    sched.pre_dispatch(&group, &manifest, &mut world);

    // Advance the clock 100 ticks, swap roles: leader leaves, follower
    // arrives. The recorded gap is therefore 100, well below the 600
    // target headway → deficit 500, capped only by hold_cap_ticks.
    world.insert_resource(CurrentTick(1_100));
    {
        let car = world.elevator_mut(leader).unwrap();
        car.phase = ElevatorPhase::MovingToStop(stop_eid);
    }
    {
        let car = world.elevator_mut(follower).unwrap();
        car.phase = ElevatorPhase::Loading;
        car.target_stop = Some(stop_eid);
        car.door_command_queue.clear();
    }
    sched.pre_dispatch(&group, &manifest, &mut world);

    let follower_q = &world.elevator(follower).unwrap().door_command_queue;
    let hold = follower_q
        .iter()
        .find_map(|c| match c {
            DoorCommand::HoldOpen { ticks } => Some(*ticks),
            _ => None,
        })
        .expect("follower must receive a HoldOpen on early arrival");
    assert_eq!(
        hold, 500,
        "hold extension should equal target_headway - gap = 600 - 100 = 500",
    );
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_schedule_hold_recovery_respects_cap() {
    // Same shape as the previous test, but with a tight `hold_cap_ticks`
    // that bounds the extension. Deficit would be 5000 ticks; the cap
    // is 30. The issued HoldOpen must equal the cap, never the raw
    // deficit — otherwise a stuck leader would freeze the follower.
    use crate::arrival_log::CurrentTick;
    use crate::components::{ElevatorPhase, Line, LineKind, Orientation, Stop};
    use crate::dispatch::{DispatchManifest, DispatchStrategy, ElevatorGroup, LineInfo};
    use crate::door::DoorCommand;
    use crate::ids::GroupId;
    use crate::world::World;

    let mut world = World::new();
    let line_eid = world.spawn();
    world.set_line(
        line_eid,
        Line {
            name: "Track".into(),
            group: GroupId(0),
            orientation: Orientation::Vertical,
            position: None,
            kind: LineKind::Loop {
                circumference: 100.0,
                min_headway: 5.0,
            },
            max_cars: None,
        },
    );
    let stop_eid = world.spawn();
    world.set_stop(
        stop_eid,
        Stop {
            name: "S0".into(),
            position: 0.0,
        },
    );
    let leader = super::dispatch_tests::spawn_elevator(&mut world, 50.0);
    let follower = super::dispatch_tests::spawn_elevator(&mut world, 0.0);
    {
        let car = world.elevator_mut(leader).unwrap();
        car.line = line_eid;
        car.phase = ElevatorPhase::Loading;
        car.target_stop = Some(stop_eid);
    }
    {
        let car = world.elevator_mut(follower).unwrap();
        car.line = line_eid;
    }
    let group = ElevatorGroup::new(
        GroupId(0),
        "Track".into(),
        vec![LineInfo::new(
            line_eid,
            vec![leader, follower],
            vec![stop_eid],
        )],
    );

    world.insert_resource(CurrentTick(0));
    let mut sched = crate::dispatch::LoopScheduleDispatch::new(20, 5_000, 30);
    let manifest = DispatchManifest::default();
    sched.pre_dispatch(&group, &manifest, &mut world); // records leader arrival

    // Follower arrives almost immediately — gap=1 tick, deficit=4999.
    world.insert_resource(CurrentTick(1));
    {
        let car = world.elevator_mut(leader).unwrap();
        car.phase = ElevatorPhase::MovingToStop(stop_eid);
    }
    {
        let car = world.elevator_mut(follower).unwrap();
        car.phase = ElevatorPhase::Loading;
        car.target_stop = Some(stop_eid);
        car.door_command_queue.clear();
    }
    sched.pre_dispatch(&group, &manifest, &mut world);

    let hold = world
        .elevator(follower)
        .unwrap()
        .door_command_queue
        .iter()
        .find_map(|c| match c {
            DoorCommand::HoldOpen { ticks } => Some(*ticks),
            _ => None,
        })
        .expect("follower must still receive a HoldOpen");
    assert_eq!(
        hold, 30,
        "hold extension must be capped to hold_cap_ticks (30), not the raw deficit (4999)",
    );
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_schedule_skips_recovery_when_gap_meets_target() {
    // Follower arrives *at or beyond* the target headway: no
    // recovery, no HoldOpen. Confirms the strategy doesn't issue
    // spurious holds when the schedule is on time.
    use crate::arrival_log::CurrentTick;
    use crate::components::{ElevatorPhase, Line, LineKind, Orientation, Stop};
    use crate::dispatch::{DispatchManifest, DispatchStrategy, ElevatorGroup, LineInfo};
    use crate::door::DoorCommand;
    use crate::ids::GroupId;
    use crate::world::World;

    let mut world = World::new();
    let line_eid = world.spawn();
    world.set_line(
        line_eid,
        Line {
            name: "Track".into(),
            group: GroupId(0),
            orientation: Orientation::Vertical,
            position: None,
            kind: LineKind::Loop {
                circumference: 100.0,
                min_headway: 5.0,
            },
            max_cars: None,
        },
    );
    let stop_eid = world.spawn();
    world.set_stop(
        stop_eid,
        Stop {
            name: "S0".into(),
            position: 0.0,
        },
    );
    let leader = super::dispatch_tests::spawn_elevator(&mut world, 50.0);
    let follower = super::dispatch_tests::spawn_elevator(&mut world, 0.0);
    {
        let car = world.elevator_mut(leader).unwrap();
        car.line = line_eid;
        car.phase = ElevatorPhase::Loading;
        car.target_stop = Some(stop_eid);
    }
    {
        let car = world.elevator_mut(follower).unwrap();
        car.line = line_eid;
    }
    let group = ElevatorGroup::new(
        GroupId(0),
        "Track".into(),
        vec![LineInfo::new(
            line_eid,
            vec![leader, follower],
            vec![stop_eid],
        )],
    );

    world.insert_resource(CurrentTick(0));
    let mut sched = crate::dispatch::LoopScheduleDispatch::new(20, 100, 200);
    let manifest = DispatchManifest::default();
    sched.pre_dispatch(&group, &manifest, &mut world); // records leader

    // Follower arrives exactly at target_headway: no recovery needed.
    world.insert_resource(CurrentTick(100));
    {
        let car = world.elevator_mut(leader).unwrap();
        car.phase = ElevatorPhase::MovingToStop(stop_eid);
    }
    {
        let car = world.elevator_mut(follower).unwrap();
        car.phase = ElevatorPhase::Loading;
        car.target_stop = Some(stop_eid);
        car.door_command_queue.clear();
    }
    sched.pre_dispatch(&group, &manifest, &mut world);

    let has_hold = world
        .elevator(follower)
        .unwrap()
        .door_command_queue
        .iter()
        .any(|c| matches!(c, DoorCommand::HoldOpen { .. }));
    assert!(
        !has_hold,
        "on-time arrival (gap == target_headway) must not trigger hold-recovery",
    );
}

#[test]
fn direction_forward_takes_precedence_over_up_down() {
    use crate::components::Direction;

    // Construct an Elevator literal with going_forward = true and the
    // up/down lamps in arbitrary states; `direction()` must report
    // Forward regardless.
    let mut config = two_group_config();
    if let Some(lines) = config.building.lines.as_mut() {
        lines[0].serves = vec![StopId(0), StopId(1)];
    }
    let mut sim = Simulation::new(&config, ScanDispatch::new()).unwrap();
    let car_eid = sim.world().iter_elevators().next().unwrap().0;
    let car = sim.world_mut().elevator_mut(car_eid).unwrap();
    car.going_up = true;
    car.going_down = true;
    car.going_forward = true;
    assert_eq!(car.direction(), Direction::Forward);

    car.going_forward = false;
    car.going_up = true;
    car.going_down = false;
    assert_eq!(car.direction(), Direction::Up);
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                id: crate::config::LineConfigId(1),
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![ElevatorConfig {
                    id: crate::config::ElevatorConfigId(1),
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
                kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "Line A".into(),
                    serves: vec![StopId(0)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "Line B".into(),
                    serves: vec![StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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
        lines[1].id = crate::config::LineConfigId(1);
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                id: crate::config::LineConfigId(1),
                name: "Empty".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![],
                orientation: Orientation::Vertical,
                position: None,
                min_position: None,
                max_position: None,
                kind: None,
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
        fn rank(&self, ctx: &crate::dispatch::RankContext<'_>) -> Option<f64> {
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "Low".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "High".into(),
                    serves: vec![StopId(1), StopId(2)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                id: crate::config::LineConfigId(1),
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![
                    ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                        id: crate::config::ElevatorConfigId(2),
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
                kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                id: crate::config::LineConfigId(1),
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![
                    ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                        id: crate::config::ElevatorConfigId(2),
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
                kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                id: crate::config::LineConfigId(1),
                name: "Main".into(),
                serves: vec![StopId(0), StopId(1)],
                elevators: vec![ElevatorConfig {
                    id: crate::config::ElevatorConfigId(1),
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
                kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "AB".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "BC".into(),
                    serves: vec![StopId(1), StopId(2)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(3),
                    name: "CD".into(),
                    serves: vec![StopId(2), StopId(3)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(3),
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
                    kind: None,
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
    let restored = snap
        .restore(crate::snapshot::RestoreOptions::default())
        .unwrap();

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
    let restored = snap
        .restore(crate::snapshot::RestoreOptions::default())
        .unwrap();

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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "Main".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "Orphan".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "B".into(),
                    serves: vec![StopId(2), StopId(3)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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
        schema_version: crate::config::CURRENT_CONFIG_SCHEMA_VERSION,
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
                    id: crate::config::LineConfigId(1),
                    name: "A".into(),
                    serves: vec![StopId(0), StopId(1)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(1),
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
                    kind: None,
                    max_cars: None,
                },
                LineConfig {
                    id: crate::config::LineConfigId(2),
                    name: "B".into(),
                    serves: vec![StopId(2), StopId(3)],
                    elevators: vec![ElevatorConfig {
                        id: crate::config::ElevatorConfigId(2),
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
                    kind: None,
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

// ── Loop game-dev surface ─────────────────────────────────────────────
//
// Targeted coverage for the Loop-aware helpers and Manual-mode
// invariants game hosts depend on: leader-query, headway-clamped manual
// driving, one-way velocity enforcement.

#[cfg(feature = "loop_lines")]
fn two_car_loop_config() -> SimConfig {
    let mut config = loop_only_config();
    let line = config.building.lines.as_mut().unwrap();
    let template = line[0].elevators[0].clone();
    line[0].elevators.push(crate::config::ElevatorConfig {
        id: crate::config::ElevatorConfigId(2),
        name: "L2".into(),
        starting_stop: StopId(2),
        ..template
    });
    config
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_leader_finds_forward_car() {
    use crate::dispatch::LoopSweepDispatch;
    let sim = Simulation::new(&two_car_loop_config(), LoopSweepDispatch::new()).unwrap();
    let cars: Vec<_> = sim.world().iter_elevators().collect();
    let (a, _, _) = cars[0];
    let (b, _, _) = cars[1];
    let leader = sim.loop_leader(ElevatorId::from(a)).unwrap();
    assert_eq!(
        leader,
        ElevatorId::from(b),
        "car at position 0 should look forward to car at position 50, not back",
    );
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_leader_none_for_solo_car() {
    use crate::dispatch::LoopSweepDispatch;
    let sim = Simulation::new(&loop_only_config(), LoopSweepDispatch::new()).unwrap();
    let solo = sim.world().iter_elevators().next().unwrap().0;
    assert!(sim.loop_leader(ElevatorId::from(solo)).is_none());
}

#[cfg(feature = "loop_lines")]
#[test]
fn loop_forward_gap_reports_cyclic_distance() {
    use crate::dispatch::LoopSweepDispatch;
    let sim = Simulation::new(&two_car_loop_config(), LoopSweepDispatch::new()).unwrap();
    let cars: Vec<_> = sim.world().iter_elevators().collect();
    let (a, _, _) = cars[0];
    // Cars start at positions 0 and 50 on a 100-unit loop. Forward gap
    // from a to leader (= b at 50) is 50.
    let gap = sim.loop_forward_gap(ElevatorId::from(a)).unwrap();
    assert!((gap - 50.0).abs() < 1e-9, "expected 50, got {gap}");
}

#[cfg(feature = "loop_lines")]
#[test]
fn set_target_velocity_rejects_negative_on_loop() {
    use crate::components::ServiceMode;
    use crate::dispatch::LoopSweepDispatch;
    let mut sim = Simulation::new(&loop_only_config(), LoopSweepDispatch::new()).unwrap();
    let car = sim.world().iter_elevators().next().unwrap().0;
    sim.set_service_mode(car, ServiceMode::Manual).unwrap();
    let err = sim
        .set_target_velocity(ElevatorId::from(car), -1.0)
        .expect_err("should reject reverse on a Loop");
    assert!(
        matches!(err, crate::error::SimError::InvalidConfig { field, .. } if field == "target_velocity"),
        "unexpected error: {err:?}",
    );
    // Positive still works.
    sim.set_target_velocity(ElevatorId::from(car), 1.0).unwrap();
}

#[cfg(feature = "loop_lines")]
#[test]
fn manual_loop_wraps_position_at_seam() {
    use crate::components::ServiceMode;
    use crate::dispatch::LoopSweepDispatch;
    // Single car so the headway clamp doesn't engage; the only thing we
    // test here is that the position lands in [0, circumference) after a
    // tick that would have linearly overshot the seam.
    let mut sim = Simulation::new(&loop_only_config(), LoopSweepDispatch::new()).unwrap();
    let car = sim.world().iter_elevators().next().unwrap().0;
    sim.set_service_mode(car, ServiceMode::Manual).unwrap();
    // Teleport to just before the seam at position 99 on a 100-unit loop.
    // (No public mover API — use the snapshot path or drive forward enough
    // ticks. Driving forward is simpler.)
    sim.set_target_velocity(ElevatorId::from(car), 2.0).unwrap();
    // Two-second max_speed at dt=1/60 needs many ticks to lap; drive
    // enough that the car definitely crosses position 100 at some point.
    for _ in 0..6_000 {
        sim.step();
        let pos = sim.world().position(car).unwrap().value();
        assert!(
            (0.0..100.0).contains(&pos),
            "Manual Loop car drifted outside [0, 100): pos={pos}",
        );
    }
}

#[cfg(feature = "loop_lines")]
#[test]
fn manual_loop_headway_clamp_prevents_overtake() {
    use crate::components::ServiceMode;
    use crate::dispatch::LoopSweepDispatch;
    let mut sim = Simulation::new(&two_car_loop_config(), LoopSweepDispatch::new()).unwrap();
    let cars: Vec<_> = sim.world().iter_elevators().map(|(e, _, _)| e).collect();
    let trailer = cars[0];
    let leader = cars[1];
    // Force the leader into OutOfService so it can't move. Single-car
    // loops are allowed but a follower behind the OOS car is not — so
    // we use Manual instead with zero target velocity.
    sim.set_service_mode(leader, ServiceMode::Manual).unwrap();
    sim.set_target_velocity(ElevatorId::from(leader), 0.0)
        .unwrap();
    sim.set_service_mode(trailer, ServiceMode::Manual).unwrap();
    sim.set_target_velocity(ElevatorId::from(trailer), 5.0)
        .unwrap();
    // Stationary leader at position 50, trailer accelerating from 0.
    // After many ticks the trailer must NOT have crossed the leader.
    for _ in 0..6_000 {
        sim.step();
        let t_pos = sim.world().position(trailer).unwrap().value();
        let l_pos = sim.world().position(leader).unwrap().value();
        let gap = crate::components::cyclic::forward_distance(t_pos, l_pos, 100.0);
        assert!(
            gap >= 5.0 - 1e-6,
            "trailer at {t_pos} closed headway gap to {gap} (min 5); leader at {l_pos}",
        );
    }
}
