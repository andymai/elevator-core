# Traffic Generation

Real simulations need rider arrivals. The `traffic` module (enabled by default via the `traffic` feature flag) provides tools for generating realistic passenger traffic -- from uniform random spawns to time-varying daily patterns.

Traffic generation is **external to the simulation loop**. A `TrafficSource` produces `SpawnRequest`s each tick; your code feeds them into the simulation. This keeps the core loop untouched and gives you full control over *when* and *how* riders spawn.

## Quick start

```rust,no_run
use elevator_core::prelude::*;
use elevator_core::config::ElevatorConfig;
use elevator_core::traffic::{PoissonSource, TrafficPattern, TrafficSchedule, TrafficSource};

# fn main() -> Result<(), SimError> {
let mut sim = SimulationBuilder::new()
    .stop(StopId(0), "Ground", 0.0)
    .stop(StopId(1), "Top", 10.0)
    .elevator(ElevatorConfig::default())
    .build()?;
let stops: Vec<StopId> = sim.stop_lookup_iter().map(|(id, _)| *id).collect();

// Poisson arrivals with an office-day schedule.
let mut source = PoissonSource::new(
    stops,
    TrafficSchedule::office_day(3600), // 3600 ticks per hour
    120,                                // mean inter-arrival: 120 ticks
    (60.0, 90.0),                       // weight range: 60-90kg
);

for _ in 0..10_000 {
    let tick = sim.current_tick();
    for req in source.generate(tick) {
        let _ = sim.spawn_rider(req.origin, req.destination, req.weight);
    }
    sim.step();
}
# Ok(())
# }
```

## Patterns

`TrafficPattern` selects origin/destination distributions. Five presets cover common building scenarios:

| Pattern | Distribution |
|---|---|
| `Uniform` | Equal probability for all origin/destination pairs |
| `UpPeak` | 80% from lobby, 20% inter-floor (morning rush) |
| `DownPeak` | 80% to lobby, 20% inter-floor (evening rush) |
| `Lunchtime` | 40% upper to mid, 40% mid to upper, 20% random |
| `Mixed` | 30% up-peak, 30% down-peak, 40% inter-floor |

The first stop in the slice is treated as the "lobby" -- make sure stops are sorted by position.

```rust,no_run
use elevator_core::traffic::TrafficPattern;

# fn run(stops: &[elevator_core::stop::StopId]) {
let mut rng = rand::rng();
if let Some((origin, destination)) = TrafficPattern::UpPeak.sample_stop_ids(stops, &mut rng) {
    println!("{origin} -> {destination}");
}
# }
```

## Schedules

A `TrafficSchedule` maps tick ranges to patterns, enabling realistic daily cycles:

```rust,no_run
use elevator_core::traffic::{TrafficPattern, TrafficSchedule};

let schedule = TrafficSchedule::new(vec![
    (0..3600, TrafficPattern::UpPeak),        // First hour: morning rush
    (3600..7200, TrafficPattern::Uniform),    // Second hour: normal
    (7200..10800, TrafficPattern::Lunchtime), // Third hour: lunch
    (10800..14400, TrafficPattern::DownPeak), // Fourth hour: evening rush
]);
```

When the current tick falls outside all segments, the schedule uses a fallback pattern (default: `Uniform`):

```rust,no_run
# use elevator_core::traffic::{TrafficPattern, TrafficSchedule};
let schedule = TrafficSchedule::new(vec![(0..1000, TrafficPattern::UpPeak)])
    .with_fallback(TrafficPattern::Mixed);
```

### Built-in schedule presets

- `TrafficSchedule::office_day(ticks_per_hour)` -- typical 9-hour office day with morning rush, lunch, and evening rush
- `TrafficSchedule::constant(pattern)` -- a single pattern for all ticks

## Poisson arrivals

`PoissonSource` is the default traffic generator. It uses exponential inter-arrival times -- a standard Poisson process -- driven by a mean interval parameter:

```rust,no_run
use elevator_core::traffic::{PoissonSource, TrafficSchedule, TrafficPattern};
use elevator_core::stop::StopId;

let stops = vec![StopId(0), StopId(1), StopId(2)];
let source = PoissonSource::new(
    stops,
    TrafficSchedule::constant(TrafficPattern::Uniform),
    60,              // mean arrival every 60 ticks
    (50.0, 100.0),   // weight range (min, max) in kg
);
```

Each call to `source.generate(tick)` returns a `Vec<SpawnRequest>` -- zero, one, or multiple requests depending on how many arrivals are due since the last call.

### From config

If your `SimConfig` already has `passenger_spawning` populated, use `from_config`:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# use elevator_core::traffic::PoissonSource;
# fn run(config: &SimConfig) {
let source = PoissonSource::from_config(config);
# }
```

This uses the config's `mean_interval_ticks` and `weight_range`, and defaults to a `Uniform` schedule. Override with `.with_schedule(...)` for time-varying traffic.

### Fluent configuration

```rust,no_run
# use elevator_core::traffic::{PoissonSource, TrafficSchedule, TrafficPattern};
# use elevator_core::stop::StopId;
# fn run(stops: Vec<StopId>) {
let source = PoissonSource::new(stops, TrafficSchedule::constant(TrafficPattern::Uniform), 100, (50.0, 100.0))
    .with_schedule(TrafficSchedule::office_day(3600))
    .with_mean_interval(50)
    .with_weight_range((65.0, 85.0));
# }
```

## Determinism and seeding

`PoissonSource` uses an OS-seeded RNG internally, so two runs of the same config will produce different traffic. This is convenient for exploration but unsuitable for replay, regression testing, or research comparisons.

For reproducible traffic, write a custom [`TrafficSource`](#custom-traffic-sources) that owns a seeded RNG:

```rust,no_run
use elevator_core::traffic::{TrafficSource, SpawnRequest, TrafficPattern};
use elevator_core::stop::StopId;
use rand::{RngExt, SeedableRng, rngs::StdRng};

struct SeededPoisson {
    stops: Vec<StopId>,
    rng: StdRng,
    mean_interval: u32,
    next: u64,
}

impl SeededPoisson {
    fn new(stops: Vec<StopId>, seed: u64, mean_interval: u32) -> Self {
        let mut rng = StdRng::seed_from_u64(seed);
        let next = rng.random_range(1..=(mean_interval * 2) as u64);
        Self { stops, rng, mean_interval, next }
    }
}

impl TrafficSource for SeededPoisson {
    fn generate(&mut self, tick: u64) -> Vec<SpawnRequest> {
        let mut out = Vec::new();
        while tick >= self.next {
            if let Some((origin, destination)) =
                TrafficPattern::Uniform.sample_stop_ids(&self.stops, &mut self.rng)
            {
                out.push(SpawnRequest { origin, destination, weight: 75.0 });
            }
            self.next += self.rng.random_range(1..=(self.mean_interval * 2) as u64);
        }
        out
    }
}
```

With a fixed seed, identical config, and a deterministic dispatch strategy, `sim.snapshot()` outputs byte-for-byte match across runs.

## Custom traffic sources

The `TrafficSource` trait is trivial to implement for game-specific logic:

```rust,no_run
use elevator_core::traffic::{TrafficSource, SpawnRequest};
use elevator_core::stop::StopId;

/// Spawns a single VIP rider at a fixed tick.
struct VipSpawn {
    tick: u64,
    origin: StopId,
    destination: StopId,
    fired: bool,
}

impl TrafficSource for VipSpawn {
    fn generate(&mut self, tick: u64) -> Vec<SpawnRequest> {
        if !self.fired && tick >= self.tick {
            self.fired = true;
            vec![SpawnRequest {
                origin: self.origin,
                destination: self.destination,
                weight: 85.0,
            }]
        } else {
            Vec::new()
        }
    }
}
```

You can layer multiple sources, wrap them in a composite, or mix Poisson arrivals with scripted events. The simulation doesn't care how requests are generated -- only that you feed them in.

## SpawnRequest

A `SpawnRequest` is the minimal description of a rider to spawn:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# use elevator_core::traffic::SpawnRequest;
// Constructing a SpawnRequest to feed into the simulation:
let req = SpawnRequest {
    origin: StopId(0),
    destination: StopId(1),
    weight: 75.0,
};
# let _ = req;
```

For riders that need patience, preferences, or access control, spawn through the simulation's `build_rider` fluent API instead of using `spawn_rider` directly:

```rust,no_run
# use elevator_core::prelude::*;
# use elevator_core::__doctest_prelude::*;
# use elevator_core::traffic::SpawnRequest;
# fn run(sim: &mut Simulation, req: SpawnRequest) -> Result<(), SimError> {
sim.build_rider(req.origin, req.destination)?
    .weight(req.weight)
    .patience(600)  // abandon after 10 seconds at 60 tps
    .spawn()?;
# Ok(())
# }
```

## RON configuration

`TrafficPattern` and `TrafficSchedule` derive `Serialize`/`Deserialize`, so you can include them in RON config files:

```ron
// traffic_config.ron
TrafficSchedule(
    segments: [
        (0..3600, UpPeak),
        (3600..7200, Uniform),
        (7200..10800, Lunchtime),
    ],
    fallback: Uniform,
)
```

## Next steps

- [Snapshots and Determinism](snapshots-determinism.md) -- seeded traffic is essential for reproducible simulations and regression testing.
- [Events and Metrics](events-metrics.md) -- how generated traffic produces events and summary statistics.
- [Testing Your Simulation](testing.md) -- scripted spawn schedules for automated scenario testing.
