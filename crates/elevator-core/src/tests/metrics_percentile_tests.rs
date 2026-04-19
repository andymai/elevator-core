//! Unit tests for [`crate::metrics::Metrics::percentile_wait_time`] and
//! the backing wait-sample ring buffer.
//!
//! End-to-end sim-driven coverage lives in [`super::metrics_tests`];
//! these tests exercise the percentile math and buffer eviction logic
//! in isolation so a regression in either shows up fast and precisely.

use crate::metrics::Metrics;

#[test]
fn p95_is_zero_on_empty_metrics() {
    let m = Metrics::new();
    assert_eq!(m.p95_wait_time(), 0);
    assert_eq!(m.wait_sample_count(), 0);
}

#[test]
fn p95_of_single_sample_equals_that_sample() {
    let mut m = Metrics::new();
    m.record_board(42);
    assert_eq!(m.p95_wait_time(), 42);
    assert_eq!(m.wait_sample_count(), 1);
}

/// With uniform samples 1..=100, the 95th-percentile (nearest-rank,
/// `ceil(0.95 * 100) = 95`, zero-indexed → 94) is 95. This is the
/// canonical textbook example and pins the percentile formula.
#[test]
fn p95_over_uniform_distribution() {
    let mut m = Metrics::new();
    for w in 1..=100u64 {
        m.record_board(w);
    }
    assert_eq!(m.p95_wait_time(), 95);
    // Sanity: p50 ≈ median, p100 = max, p0 = min.
    assert_eq!(m.percentile_wait_time(50.0), 50);
    assert_eq!(m.percentile_wait_time(100.0), 100);
    assert_eq!(m.percentile_wait_time(0.0), 1);
}

/// Insertion order must not influence the percentile — the ring buffer
/// is sorted at query time, not insertion time.
#[test]
fn percentile_is_insertion_order_independent() {
    let mut ascending = Metrics::new();
    let mut descending = Metrics::new();
    for w in 1..=50u64 {
        ascending.record_board(w);
    }
    for w in (1..=50u64).rev() {
        descending.record_board(w);
    }
    assert_eq!(
        ascending.p95_wait_time(),
        descending.p95_wait_time(),
        "p95 must not depend on record order"
    );
}

/// The ring buffer is capacity-bounded; old samples are evicted when
/// the buffer fills. With capacity 3 and four pushes (10, 20, 30, 40),
/// the retained window is `[20, 30, 40]`, so p100 = 40 and p0 = 20.
#[test]
fn wait_buffer_evicts_oldest_when_full() {
    let mut m = Metrics::new().with_wait_sample_capacity(3);
    m.record_board(10);
    m.record_board(20);
    m.record_board(30);
    m.record_board(40); // evicts the 10
    assert_eq!(m.wait_sample_count(), 3);
    assert_eq!(m.percentile_wait_time(0.0), 20);
    assert_eq!(m.percentile_wait_time(100.0), 40);
}

/// `avg_wait_time` and `max_wait_time` are running accumulators; they
/// must survive buffer eviction. A regression here would mean a long
/// sim with many samples starts "forgetting" its own max once the
/// buffer cycles.
#[test]
fn avg_and_max_persist_after_buffer_eviction() {
    let mut m = Metrics::new().with_wait_sample_capacity(2);
    m.record_board(1000); // evicted after two more pushes
    m.record_board(5);
    m.record_board(10);
    assert_eq!(
        m.max_wait_time(),
        1000,
        "max_wait_time must reflect all history, not just the ring buffer"
    );
    assert_eq!(m.wait_sample_count(), 2);
}

/// A capacity of 0 disables sampling entirely: record_board still
/// updates avg/max (checked in a sibling test) but p95 stays 0.
#[test]
fn zero_capacity_disables_sampling() {
    let mut m = Metrics::new().with_wait_sample_capacity(0);
    for w in 1..=100u64 {
        m.record_board(w);
    }
    assert_eq!(m.wait_sample_count(), 0);
    assert_eq!(m.p95_wait_time(), 0);
    // But avg/max still track all boardings.
    assert_eq!(m.max_wait_time(), 100);
    assert!(m.avg_wait_time() > 0.0);
}

/// Shrinking capacity via `with_wait_sample_capacity` truncates from
/// the oldest end so the retained window is always the most recent
/// samples.
#[test]
fn shrinking_capacity_evicts_oldest_samples() {
    let mut m = Metrics::new();
    for w in 1..=10u64 {
        m.record_board(w);
    }
    m = m.with_wait_sample_capacity(3);
    assert_eq!(m.wait_sample_count(), 3);
    // Oldest (1, 2, ..., 7) evicted; newest (8, 9, 10) retained.
    assert_eq!(m.percentile_wait_time(0.0), 8);
    assert_eq!(m.percentile_wait_time(100.0), 10);
}

#[test]
#[should_panic(expected = "percentile must be finite and in [0, 100]")]
fn percentile_panics_on_nan() {
    let m = Metrics::new();
    let _ = m.percentile_wait_time(f64::NAN);
}

#[test]
#[should_panic(expected = "percentile must be finite and in [0, 100]")]
fn percentile_panics_on_negative() {
    let m = Metrics::new();
    let _ = m.percentile_wait_time(-1.0);
}

#[test]
#[should_panic(expected = "percentile must be finite and in [0, 100]")]
fn percentile_panics_above_hundred() {
    let m = Metrics::new();
    let _ = m.percentile_wait_time(100.5);
}

/// Snapshot round-trip must preserve the wait samples so post-restore
/// percentile queries return consistent values — otherwise a scenario
/// that pauses-and-resumes would see its p95 reset at each restore.
#[test]
fn wait_samples_survive_serde_roundtrip() {
    let mut m = Metrics::new();
    for w in [10, 20, 30, 40, 50] {
        m.record_board(w);
    }
    let serialized = ron::to_string(&m).expect("serialize");
    let restored: Metrics = ron::from_str(&serialized).expect("deserialize");
    assert_eq!(restored.wait_sample_count(), 5);
    assert_eq!(restored.p95_wait_time(), m.p95_wait_time());
    assert_eq!(
        restored.percentile_wait_time(50.0),
        m.percentile_wait_time(50.0)
    );
}
