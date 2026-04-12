use crate::time::TimeAdapter;
use std::time::Duration;

#[test]
fn ticks_to_seconds() {
    let t = TimeAdapter::new(60.0);
    assert!((t.ticks_to_seconds(60) - 1.0).abs() < 1e-9);
    assert!((t.ticks_to_seconds(0) - 0.0).abs() < 1e-9);
    assert!((t.ticks_to_seconds(120) - 2.0).abs() < 1e-9);
}

#[test]
fn seconds_to_ticks() {
    let t = TimeAdapter::new(60.0);
    assert_eq!(t.seconds_to_ticks(1.0), 60);
    assert_eq!(t.seconds_to_ticks(0.5), 30);
    assert_eq!(t.seconds_to_ticks(0.0), 0);
}

#[test]
fn duration_roundtrip() {
    let t = TimeAdapter::new(60.0);
    let dur = Duration::from_secs(3);
    let ticks = t.duration_to_ticks(dur);
    assert_eq!(ticks, 180);
    let back = t.ticks_to_duration(ticks);
    assert!((back.as_secs_f64() - 3.0).abs() < 1e-9);
}

#[test]
fn ticks_per_second_accessor() {
    let t = TimeAdapter::new(30.0);
    assert!((t.ticks_per_second() - 30.0).abs() < 1e-9);
}
