//! Canonical benchmark scenarios drawn from the dispatch research brief.
//!
//! Each test assembles a [`crate::scenario::Scenario`] with a fixed
//! [`SpawnSchedule`](crate::scenario::SpawnSchedule) and runs it
//! through [`ScenarioRunner`](crate::scenario::ScenarioRunner). The
//! four base patterns (up-peak, down-peak, full-load cycle, burst-
//! then-silence) exercise distinct parts of the dispatch + reposition
//! surface. The matrix test then runs the up-peak shape across every
//! non-DCS built-in strategy so any regression that cripples one
//! strategy is caught by a targeted name — not by a scenario-wide
//! timeout in a single-strategy test.

use crate::components::Weight;
use crate::dispatch::DispatchStrategy;
use crate::dispatch::etd::EtdDispatch;
use crate::dispatch::look::LookDispatch;
use crate::dispatch::nearest_car::NearestCarDispatch;
use crate::dispatch::scan::ScanDispatch;
use crate::scenario::{Condition, Scenario, ScenarioRunner, SpawnSchedule};
use crate::stop::StopId;

use super::helpers::{assert_p95_wait_under, multi_floor_config};

/// Factory returning a boxed dispatch strategy. Keeps the matrix test's
/// strategy list readable — clippy flagged the inline
/// `Vec<(&str, Box<dyn Fn() -> Box<dyn …>>)>` type as too complex.
type StrategyFactory = Box<dyn Fn() -> Box<dyn DispatchStrategy>>;

// ── Up-peak rate sweep ──────────────────────────────────────────────

/// Classic morning-rush benchmark: 20 riders enter the lobby staggered
/// over 20 seconds, each bound for a distinct upper floor. Asserts the
/// max wait stays bounded and every rider is delivered before the
/// timeout. Catches sweep-inefficiency regressions on up-sweep and
/// reposition-to-lobby churn.
#[test]
fn up_peak_8_floor_2_car_delivers_within_budget() {
    let config = multi_floor_config(8, 2);
    let stops = (0..8).map(StopId).collect::<Vec<_>>();
    // 20 riders, lobby -> floors 1..=7 (round-robin), 60-tick stagger.
    let mut schedule = SpawnSchedule::new();
    for i in 0..20u64 {
        let dest = stops[1 + (i as usize % 7)];
        schedule = schedule.staggered(stops[0], dest, 1, i * 60, 60, 70.0);
    }
    let scenario = Scenario {
        name: "up-peak 8-floor 2-car".into(),
        config,
        spawns: schedule.into_spawns(),
        conditions: vec![
            Condition::AllDeliveredByTick(12_000),
            Condition::MaxWaitBelow(6_000),
        ],
        max_ticks: 15_000,
    };
    let mut runner = ScenarioRunner::new(scenario, EtdDispatch::new()).unwrap();
    let result = runner.run_to_completion();
    assert!(
        result.passed,
        "up-peak must satisfy timeout + max-wait: {:#?}",
        result.conditions
    );
    assert_eq!(runner.skipped_spawns(), 0);
}

// ── Down-peak mirror ────────────────────────────────────────────────

/// Evening-rush mirror of up-peak: 20 riders from upper floors back
/// to the lobby. Exercises the down-sweep path and `bypass_load_down_pct`
/// branch; a regression in either surfaces here but not in up-peak.
#[test]
fn down_peak_8_floor_2_car_delivers_within_budget() {
    let config = multi_floor_config(8, 2);
    let stops = (0..8).map(StopId).collect::<Vec<_>>();
    let mut schedule = SpawnSchedule::new();
    for i in 0..20u64 {
        let origin = stops[1 + (i as usize % 7)];
        schedule = schedule.staggered(origin, stops[0], 1, i * 60, 60, 70.0);
    }
    let scenario = Scenario {
        name: "down-peak 8-floor 2-car".into(),
        config,
        spawns: schedule.into_spawns(),
        conditions: vec![
            Condition::AllDeliveredByTick(12_000),
            Condition::MaxWaitBelow(6_000),
        ],
        max_ticks: 15_000,
    };
    let mut runner = ScenarioRunner::new(scenario, EtdDispatch::new()).unwrap();
    let result = runner.run_to_completion();
    assert!(
        result.passed,
        "down-peak must satisfy timeout + max-wait: {:#?}",
        result.conditions
    );
    assert_eq!(runner.skipped_spawns(), 0);
}

// ── Full-load cycle ─────────────────────────────────────────────────

/// 20 riders at the lobby, all heading to the top floor, with a
/// single under-capacity car. Forces at least three round-trips.
/// Exercises the full-load self-assign guard (see
/// [`crate::dispatch::pair_can_do_work`]); regression here was
/// previously a doors-cycle-forever bug (#317).
#[test]
fn full_load_cycle_delivers_all_in_bounded_trips() {
    let mut config = multi_floor_config(6, 1);
    // 6 riders × 70kg = 420kg; set capacity to 400kg so each trip
    // carries 5 riders. 20 riders / 5-per-trip = 4 trips minimum.
    config.elevators[0].weight_capacity = Weight::from(400.0);
    let stops = (0..6).map(StopId).collect::<Vec<_>>();
    let schedule = SpawnSchedule::new().burst(stops[0], stops[5], 20, 0, 70.0);
    let scenario = Scenario {
        name: "full-load cycle".into(),
        config,
        spawns: schedule.into_spawns(),
        conditions: vec![
            Condition::AllDeliveredByTick(20_000),
            Condition::AbandonmentRateBelow(0.01),
        ],
        max_ticks: 25_000,
    };
    let mut runner = ScenarioRunner::new(scenario, ScanDispatch::new()).unwrap();
    let result = runner.run_to_completion();
    assert!(
        result.passed,
        "full-load cycle must deliver all 20 riders without abandonment: {:#?}",
        result.conditions
    );
    assert_eq!(
        result.metrics.total_delivered(),
        20,
        "exactly 20 riders must reach their destination"
    );
}

// ── Burst-then-silence ──────────────────────────────────────────────

/// 15 riders in a 10-tick burst, then 5 000 ticks of silence, then 1
/// latecomer. Exercises idle→dispatch transitions, reposition kick-
/// in, and the rolling-window arrival-log computation crossing an
/// empty region.
#[test]
fn burst_then_silence_handles_latecomer() {
    let config = multi_floor_config(5, 2);
    let stops = (0..5).map(StopId).collect::<Vec<_>>();
    let schedule = SpawnSchedule::new()
        .staggered(stops[0], stops[3], 15, 0, 1, 70.0) // 15 riders, 1 tick apart
        .push(crate::scenario::TimedSpawn {
            tick: 5_000,
            origin: stops[4],
            destination: stops[1],
            weight: 70.0,
        });
    let scenario = Scenario {
        name: "burst then silence".into(),
        config,
        spawns: schedule.into_spawns(),
        conditions: vec![Condition::AllDeliveredByTick(10_000)],
        max_ticks: 12_000,
    };
    let mut runner = ScenarioRunner::new(scenario, EtdDispatch::new()).unwrap();
    let result = runner.run_to_completion();
    assert!(
        result.passed,
        "burst-then-silence must deliver all 16 riders: {:#?}",
        result.conditions
    );
    assert_eq!(result.metrics.total_delivered(), 16);
    // p95 is the fraction most sensitive to the latecomer; a blow-up
    // means reposition didn't recover during the silence.
    assert_p95_wait_under(runner.sim(), 3_000);
}

// ── Strategy-comparison matrix ──────────────────────────────────────

/// Up-peak pattern replayed across every non-DCS built-in strategy.
/// Each strategy must at minimum deliver every rider before the
/// matrix's generous deadline; the per-strategy metrics (avg wait,
/// max wait, p95) are read back but not bounded — this test exists
/// to catch strategies that *fail to deliver*, not to rank them.
///
/// Destination-dispatch is excluded because it requires the group
/// to be in [`crate::dispatch::HallCallMode::Destination`] and a
/// riders' route to carry destinations at press time, which changes
/// the scenario shape.
#[test]
fn strategy_matrix_all_builtins_deliver_up_peak() {
    let stops = (0..6).map(StopId).collect::<Vec<_>>();
    let make_schedule = || {
        let mut s = SpawnSchedule::new();
        for i in 0..12u64 {
            let dest = stops[1 + (i as usize % 5)];
            s = s.staggered(stops[0], dest, 1, i * 80, 80, 70.0);
        }
        s
    };

    let strategies: Vec<(&str, StrategyFactory)> = vec![
        ("Scan", Box::new(|| Box::new(ScanDispatch::new()))),
        ("Look", Box::new(|| Box::new(LookDispatch::new()))),
        (
            "NearestCar",
            Box::new(|| Box::new(NearestCarDispatch::new())),
        ),
        ("Etd", Box::new(|| Box::new(EtdDispatch::new()))),
    ];

    for (name, factory) in strategies {
        let scenario = Scenario {
            name: format!("up-peak via {name}"),
            config: multi_floor_config(6, 2),
            spawns: make_schedule().into_spawns(),
            conditions: vec![Condition::AllDeliveredByTick(15_000)],
            max_ticks: 20_000,
        };
        let mut runner = ScenarioRunner::new(scenario, BoxedStrategy(factory())).unwrap();
        let result = runner.run_to_completion();
        assert!(
            result.passed,
            "strategy {name} must deliver all 12 riders: {:#?}",
            result.conditions
        );
        assert_eq!(
            result.metrics.total_delivered(),
            12,
            "{name} must deliver exactly 12 riders"
        );
    }
}

/// Adapter so a boxed trait object can be fed into
/// [`ScenarioRunner::new`], which requires
/// `impl DispatchStrategy + 'static` (not directly `Box<dyn …>`).
struct BoxedStrategy(Box<dyn DispatchStrategy>);

impl DispatchStrategy for BoxedStrategy {
    fn pre_dispatch(
        &mut self,
        group: &crate::dispatch::ElevatorGroup,
        manifest: &crate::dispatch::DispatchManifest,
        world: &mut crate::world::World,
    ) {
        self.0.pre_dispatch(group, manifest, world);
    }

    fn prepare_car(
        &mut self,
        car: crate::entity::EntityId,
        pos: f64,
        group: &crate::dispatch::ElevatorGroup,
        manifest: &crate::dispatch::DispatchManifest,
        world: &crate::world::World,
    ) {
        self.0.prepare_car(car, pos, group, manifest, world);
    }

    fn rank(&mut self, ctx: &crate::dispatch::RankContext<'_>) -> Option<f64> {
        self.0.rank(ctx)
    }

    fn fallback(
        &mut self,
        car: crate::entity::EntityId,
        pos: f64,
        group: &crate::dispatch::ElevatorGroup,
        manifest: &crate::dispatch::DispatchManifest,
        world: &crate::world::World,
    ) -> crate::dispatch::DispatchDecision {
        self.0.fallback(car, pos, group, manifest, world)
    }

    fn notify_removed(&mut self, elevator: crate::entity::EntityId) {
        self.0.notify_removed(elevator);
    }
}
