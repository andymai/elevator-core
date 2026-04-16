use crate::config::SimConfig;

#[test]
fn deserialize_default_ron() {
    let ron_str = include_str!("../../../../assets/config/default.ron");
    let config: SimConfig = ron::from_str(ron_str).expect("Failed to deserialize default.ron");

    assert_eq!(config.building.name, "Demo Tower");
    assert_eq!(config.building.stops.len(), 5);
    assert!((config.building.stops[0].position - 0.0).abs() < f64::EPSILON);
    assert!((config.building.stops[4].position - 15.0).abs() < f64::EPSILON);
    assert_eq!(config.elevators.len(), 1);
    assert!((config.elevators[0].max_speed.value() - 2.0).abs() < f64::EPSILON);
    assert!((config.elevators[0].weight_capacity.value() - 800.0).abs() < f64::EPSILON);
    assert!((config.simulation.ticks_per_second - 60.0).abs() < f64::EPSILON);
    assert_eq!(config.passenger_spawning.mean_interval_ticks, 120);
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
