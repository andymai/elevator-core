use crate::components::Orientation;
use crate::config::SimConfig;
use crate::error::SimError;

#[test]
fn deserialize_default_ron() {
    let ron_str = include_str!("../../../../assets/config/default.ron");
    let config: SimConfig = ron::from_str(ron_str).expect("Failed to deserialize default.ron");

    assert_eq!(config.building.name, "Demo Tower");
    assert_eq!(config.building.stops.len(), 8);
    let first = config.building.stops.first().expect("at least one stop");
    let last = config.building.stops.last().expect("at least one stop");
    assert!((first.position - 0.0).abs() < f64::EPSILON);
    assert!((last.position - 25.0).abs() < f64::EPSILON);
    assert_eq!(config.elevators.len(), 3);
    let express = &config.elevators[0];
    assert_eq!(express.name, "Express");
    assert!((express.max_speed.value() - 3.5).abs() < f64::EPSILON);
    assert!((express.weight_capacity.value() - 1200.0).abs() < f64::EPSILON);
    assert!((config.simulation.ticks_per_second - 60.0).abs() < f64::EPSILON);
    assert_eq!(config.passenger_spawning.mean_interval_ticks, 30);
}

#[test]
fn roundtrip_ron() {
    let ron_str = include_str!("../../../../assets/config/default.ron");
    let config: SimConfig = ron::from_str(ron_str).unwrap();
    let serialized = ron::to_string(&config).unwrap();
    let config2: SimConfig = ron::from_str(&serialized).unwrap();
    assert_eq!(config.building.stops.len(), config2.building.stops.len());
    assert_eq!(config.elevators.len(), config2.elevators.len());
}

#[test]
fn rejects_nan_stop_position() {
    use super::helpers;
    let mut config = helpers::default_config();
    config.building.stops[1].position = f64::NAN;
    let result = crate::sim::Simulation::new(&config, helpers::scan());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.stops.position",
                ..
            })
        ),
        "NaN position should be rejected, got {result:?}"
    );
}

#[test]
fn rejects_infinite_stop_position() {
    use super::helpers;
    let mut config = helpers::default_config();
    config.building.stops[0].position = f64::INFINITY;
    let result = crate::sim::Simulation::new(&config, helpers::scan());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.stops.position",
                ..
            })
        ),
        "infinite position should be rejected, got {result:?}"
    );
}

#[test]
fn rejects_neg_infinite_stop_position() {
    use super::helpers;
    let mut config = helpers::default_config();
    config.building.stops[2].position = f64::NEG_INFINITY;
    let result = crate::sim::Simulation::new(&config, helpers::scan());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.stops.position",
                ..
            })
        ),
        "negative infinity position should be rejected, got {result:?}"
    );
}

#[test]
fn rejects_zero_door_transition_ticks() {
    use super::helpers;
    let mut config = helpers::default_config();
    config.elevators[0].door_transition_ticks = 0;
    let result = crate::sim::Simulation::new(&config, helpers::scan());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "elevators.door_transition_ticks",
                ..
            })
        ),
        "zero door_transition_ticks should be rejected, got {result:?}"
    );
}

#[test]
fn rejects_zero_door_open_ticks() {
    use super::helpers;
    let mut config = helpers::default_config();
    config.elevators[0].door_open_ticks = 0;
    let result = crate::sim::Simulation::new(&config, helpers::scan());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "elevators.door_open_ticks",
                ..
            })
        ),
        "zero door_open_ticks should be rejected, got {result:?}"
    );
}

/// Non-finite `ticks_per_second` produces NaN/zero `dt` that silently
/// corrupts every physics step (#261).
#[test]
fn rejects_non_finite_ticks_per_second() {
    use super::helpers;
    for (label, value) in [
        ("NaN", f64::NAN),
        ("+inf", f64::INFINITY),
        ("-inf", f64::NEG_INFINITY),
        ("zero", 0.0),
        ("negative", -1.0),
    ] {
        let mut config = helpers::default_config();
        config.simulation.ticks_per_second = value;
        let result = crate::sim::Simulation::new(&config, helpers::scan());
        assert!(
            matches!(
                result,
                Err(SimError::InvalidConfig {
                    field: "simulation.ticks_per_second",
                    ..
                })
            ),
            "ticks_per_second={label} should be rejected, got {result:?}"
        );
    }
}

/// `PassengerSpawnConfig` is now validated; previously bad inputs survived
/// to `PoissonSource::from_config` and panicked later (#272).
#[test]
fn rejects_invalid_passenger_spawning() {
    use super::helpers;
    use crate::config::PassengerSpawnConfig;

    let cases: Vec<(&'static str, PassengerSpawnConfig, &'static str)> = vec![
        (
            "weight_range=(NaN, 50)",
            PassengerSpawnConfig {
                mean_interval_ticks: 120,
                weight_range: (f64::NAN, 50.0),
            },
            "passenger_spawning.weight_range",
        ),
        (
            "weight_range=(50, +inf)",
            PassengerSpawnConfig {
                mean_interval_ticks: 120,
                weight_range: (50.0, f64::INFINITY),
            },
            "passenger_spawning.weight_range",
        ),
        (
            "weight_range=(-50, -50)",
            PassengerSpawnConfig {
                mean_interval_ticks: 120,
                weight_range: (-50.0, -50.0),
            },
            "passenger_spawning.weight_range",
        ),
        (
            "weight_range=(100, 50) inverted",
            PassengerSpawnConfig {
                mean_interval_ticks: 120,
                weight_range: (100.0, 50.0),
            },
            "passenger_spawning.weight_range",
        ),
        (
            "mean_interval_ticks=0",
            PassengerSpawnConfig {
                mean_interval_ticks: 0,
                weight_range: (50.0, 100.0),
            },
            "passenger_spawning.mean_interval_ticks",
        ),
    ];

    for (label, spawn, expected_field) in cases {
        let mut config = helpers::default_config();
        config.passenger_spawning = spawn;
        let result = crate::sim::Simulation::new(&config, helpers::scan());
        match result {
            Err(SimError::InvalidConfig { field, .. }) if field == expected_field => {}
            _ => panic!(
                "{label} should produce InvalidConfig{{field={expected_field}}}, got {result:?}"
            ),
        }
    }
}

#[test]
fn rejects_empty_line_serves() {
    use super::helpers;
    use crate::config::LineConfig;
    let mut config = helpers::default_config();
    config.building.lines = Some(vec![LineConfig {
        id: 0,
        name: "Empty".into(),
        serves: vec![],
        elevators: config.elevators.clone(),
        orientation: Orientation::default(),
        position: None,
        min_position: None,
        max_position: None,
        max_cars: None,
    }]);
    let result = crate::sim::Simulation::new(&config, helpers::scan());
    assert!(
        matches!(
            result,
            Err(SimError::InvalidConfig {
                field: "building.lines.serves",
                ..
            })
        ),
        "empty line.serves should be rejected, got {result:?}"
    );
}
