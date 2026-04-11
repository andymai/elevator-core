use crate::config::SimConfig;

#[test]
fn deserialize_default_ron() {
    let ron_str = include_str!("../../../../assets/config/default.ron");
    let config: SimConfig = ron::from_str(ron_str).expect("Failed to deserialize default.ron");

    assert_eq!(config.building.name, "Demo Tower");
    assert_eq!(config.building.stops.len(), 5);
    assert_eq!(config.building.stops[0].position, 0.0);
    assert_eq!(config.building.stops[4].position, 15.0);
    assert_eq!(config.elevators.len(), 1);
    assert_eq!(config.elevators[0].max_speed, 2.0);
    assert_eq!(config.elevators[0].weight_capacity, 800.0);
    assert_eq!(config.simulation.ticks_per_second, 60.0);
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
