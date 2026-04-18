import type { ScenarioMeta } from "./types";

// Scenarios are embedded as RON strings so the playground is a single static
// bundle with no extra fetches. Each scenario is validated by elevator-core's
// `Simulation::new`, so a malformed RON here surfaces as a JS error from
// `new WasmSim(...)`.

const office: ScenarioMeta = {
  id: "office-5",
  label: "5-floor office",
  description: "Five stops, one car. Heavy enough traffic to see queues form.",
  suggestedTrafficRate: 40,
  ron: `SimConfig(
    building: BuildingConfig(
        name: "5-Floor Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.0, acceleration: 1.5, deceleration: 2.0,
            weight_capacity: 800.0,
            starting_stop: StopId(0),
            door_open_ticks: 60, door_transition_ticks: 15,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 180,
        weight_range: (50.0, 100.0),
    ),
)`,
};

const skyscraper: ScenarioMeta = {
  id: "skyscraper-12",
  label: "12-floor skyscraper",
  description: "Twelve stops, three cars on one shaft bank. Stress-tests dispatch.",
  suggestedTrafficRate: 120,
  ron: `SimConfig(
    building: BuildingConfig(
        name: "12-Floor Skyscraper",
        stops: [
            StopConfig(id: StopId(0),  name: "Lobby",    position: 0.0),
            StopConfig(id: StopId(1),  name: "Floor 2",  position: 4.0),
            StopConfig(id: StopId(2),  name: "Floor 3",  position: 8.0),
            StopConfig(id: StopId(3),  name: "Floor 4",  position: 12.0),
            StopConfig(id: StopId(4),  name: "Floor 5",  position: 16.0),
            StopConfig(id: StopId(5),  name: "Floor 6",  position: 20.0),
            StopConfig(id: StopId(6),  name: "Floor 7",  position: 24.0),
            StopConfig(id: StopId(7),  name: "Floor 8",  position: 28.0),
            StopConfig(id: StopId(8),  name: "Floor 9",  position: 32.0),
            StopConfig(id: StopId(9),  name: "Floor 10", position: 36.0),
            StopConfig(id: StopId(10), name: "Floor 11", position: 40.0),
            StopConfig(id: StopId(11), name: "Floor 12", position: 44.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car A",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(0),
            door_open_ticks: 60, door_transition_ticks: 18,
        ),
        ElevatorConfig(
            id: 1, name: "Car B",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(4),
            door_open_ticks: 60, door_transition_ticks: 18,
        ),
        ElevatorConfig(
            id: 2, name: "Car C",
            max_speed: 4.0, acceleration: 2.0, deceleration: 2.5,
            weight_capacity: 1200.0,
            starting_stop: StopId(8),
            door_open_ticks: 60, door_transition_ticks: 18,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 60,
        weight_range: (50.0, 100.0),
    ),
)`,
};

const rushHour: ScenarioMeta = {
  id: "rush-hour",
  label: "Rush-hour office",
  description: "5-floor office with 2 cars and very high arrival rate.",
  suggestedTrafficRate: 180,
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Rush-Hour Office",
        stops: [
            StopConfig(id: StopId(0), name: "Lobby",   position: 0.0),
            StopConfig(id: StopId(1), name: "Floor 2", position: 4.0),
            StopConfig(id: StopId(2), name: "Floor 3", position: 8.0),
            StopConfig(id: StopId(3), name: "Floor 4", position: 12.0),
            StopConfig(id: StopId(4), name: "Floor 5", position: 16.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Car 1",
            max_speed: 2.5, acceleration: 1.8, deceleration: 2.2,
            weight_capacity: 900.0,
            starting_stop: StopId(0),
            door_open_ticks: 45, door_transition_ticks: 12,
        ),
        ElevatorConfig(
            id: 1, name: "Car 2",
            max_speed: 2.5, acceleration: 1.8, deceleration: 2.2,
            weight_capacity: 900.0,
            starting_stop: StopId(4),
            door_open_ticks: 45, door_transition_ticks: 12,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 30,
        weight_range: (50.0, 100.0),
    ),
)`,
};

const spaceElevator: ScenarioMeta = {
  id: "space-elevator",
  label: "Space elevator",
  description: "Two stops 1,000 km apart. Same engine, different scale.",
  suggestedTrafficRate: 8,
  ron: `SimConfig(
    building: BuildingConfig(
        name: "Orbital Tether",
        stops: [
            StopConfig(id: StopId(0), name: "Ground Station",     position: 0.0),
            StopConfig(id: StopId(1), name: "Orbital Platform",  position: 1000.0),
        ],
    ),
    elevators: [
        ElevatorConfig(
            id: 0, name: "Climber Alpha",
            max_speed: 50.0, acceleration: 10.0, deceleration: 15.0,
            weight_capacity: 10000.0,
            starting_stop: StopId(0),
            door_open_ticks: 120, door_transition_ticks: 30,
        ),
    ],
    simulation: SimulationParams(ticks_per_second: 60.0),
    passenger_spawning: PassengerSpawnConfig(
        mean_interval_ticks: 600,
        weight_range: (60.0, 90.0),
    ),
)`,
};

export const SCENARIOS: ScenarioMeta[] = [office, skyscraper, rushHour, spaceElevator];

export function scenarioById(id: string): ScenarioMeta {
  return SCENARIOS.find((s) => s.id === id) ?? office;
}
