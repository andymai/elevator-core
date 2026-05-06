//! Sealed kebab-case label vocabulary for cross-host serialisation.
//!
//! Hosts (FFI / wasm / gdext / future) all need to render core enums as
//! short string labels — `"idle"`, `"normal"`, `"up"` — and parse them
//! back. Letting each host coin its own labels would let them drift, so
//! this module is the single source of truth.
//!
//! The label vocabulary is part of every host's public contract: changing
//! a label string is a breaking change for downstream consumers
//! (TypeScript bindings, Godot scripts, GameMaker projects, …). New
//! variants on `#[non_exhaustive]` core enums must add a label here in
//! the same release; the formatters fall back to a stable default
//! (`"unknown"`, `"out-of-service"`, `"either"`) for unrecognised
//! variants so a missing label does not panic the host.
//!
//! Mirrors the `host_error::ErrorKind` cross-host vocabulary work.

#![allow(unreachable_patterns)]
// `Variant | _ =>` arms below are the standard pattern for `#[non_exhaustive]`
// enums: defensive within the same crate (where rustc can prove `_` is
// unreachable today), load-bearing across crates (where downstream consumers
// would need it). `unreachable_patterns` fires on the in-crate side; the
// allow is the cleanest way to keep the cross-crate-safe shape.

use crate::components::{CallDirection, Direction, ElevatorPhase, ServiceMode};

/// Format an [`ElevatorPhase`] as a kebab-case label suitable for CSS
/// class names, debug overlays, and serialised host events.
///
/// Falls back to `"unknown"` for variants this module has not been
/// updated to cover.
#[must_use]
pub const fn elevator_phase(phase: ElevatorPhase) -> &'static str {
    match phase {
        ElevatorPhase::Idle => "idle",
        ElevatorPhase::MovingToStop(_) => "moving",
        ElevatorPhase::Repositioning(_) => "repositioning",
        ElevatorPhase::DoorOpening => "door-opening",
        ElevatorPhase::Loading => "loading",
        ElevatorPhase::DoorClosing => "door-closing",
        ElevatorPhase::Stopped => "stopped",
        _ => "unknown",
    }
}

/// Format a [`ServiceMode`] as a kebab-case label.
///
/// `ServiceMode` is `#[non_exhaustive]`; new variants without a label
/// here surface as `"out-of-service"` rather than panicking. Add a
/// label in the same release that adds the variant.
#[must_use]
pub const fn service_mode(mode: ServiceMode) -> &'static str {
    match mode {
        ServiceMode::Normal => "normal",
        ServiceMode::Independent => "independent",
        ServiceMode::Inspection => "inspection",
        ServiceMode::Manual => "manual",
        ServiceMode::OutOfService | _ => "out-of-service",
    }
}

/// Inverse of [`service_mode`]: parse a kebab-case label back to a
/// [`ServiceMode`]. Unknown labels return `None`.
#[must_use]
pub fn parse_service_mode(label: &str) -> Option<ServiceMode> {
    match label {
        "normal" => Some(ServiceMode::Normal),
        "independent" => Some(ServiceMode::Independent),
        "inspection" => Some(ServiceMode::Inspection),
        "manual" => Some(ServiceMode::Manual),
        "out-of-service" => Some(ServiceMode::OutOfService),
        _ => None,
    }
}

/// Format a [`Direction`] as `"up"` / `"down"` / `"either"`.
///
/// `Direction` is `#[non_exhaustive]`; unrecognised variants fall back
/// to `"either"`.
#[must_use]
pub const fn direction(dir: Direction) -> &'static str {
    match dir {
        Direction::Up => "up",
        Direction::Down => "down",
        Direction::Either | _ => "either",
    }
}

/// Parse a kebab-case label into a [`CallDirection`].
///
/// Only `"up"` and `"down"` are valid hall-call directions; everything
/// else returns an error message embedding the offending input.
///
/// # Errors
///
/// Returns `Err` with a descriptive message if the label is neither
/// `"up"` nor `"down"`.
pub fn parse_call_direction(label: &str) -> Result<CallDirection, String> {
    match label {
        "up" => Ok(CallDirection::Up),
        "down" => Ok(CallDirection::Down),
        other => Err(format!("direction must be 'up' or 'down', got {other:?}")),
    }
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn elevator_phase_round_trip_covers_every_variant() {
        // The labels are part of the host contract; rely on a literal
        // table here rather than building it dynamically so a renamed
        // variant fails the test loudly.
        assert_eq!(elevator_phase(ElevatorPhase::Idle), "idle");
        assert_eq!(
            elevator_phase(ElevatorPhase::MovingToStop(
                crate::entity::EntityId::default()
            )),
            "moving"
        );
        assert_eq!(
            elevator_phase(ElevatorPhase::Repositioning(
                crate::entity::EntityId::default()
            )),
            "repositioning"
        );
        assert_eq!(elevator_phase(ElevatorPhase::DoorOpening), "door-opening");
        assert_eq!(elevator_phase(ElevatorPhase::Loading), "loading");
        assert_eq!(elevator_phase(ElevatorPhase::DoorClosing), "door-closing");
        assert_eq!(elevator_phase(ElevatorPhase::Stopped), "stopped");
    }

    #[test]
    fn service_mode_round_trips() {
        for mode in [
            ServiceMode::Normal,
            ServiceMode::Independent,
            ServiceMode::Inspection,
            ServiceMode::Manual,
            ServiceMode::OutOfService,
        ] {
            let label = service_mode(mode);
            assert_eq!(
                parse_service_mode(label),
                Some(mode),
                "round-trip failed for {mode:?} via label {label:?}",
            );
        }
    }

    #[test]
    fn parse_service_mode_rejects_unknown() {
        assert_eq!(parse_service_mode(""), None);
        assert_eq!(parse_service_mode("Normal"), None); // case-sensitive
        assert_eq!(parse_service_mode("offline"), None);
    }

    #[test]
    fn direction_label_strings() {
        assert_eq!(direction(Direction::Up), "up");
        assert_eq!(direction(Direction::Down), "down");
        assert_eq!(direction(Direction::Either), "either");
    }

    #[test]
    fn parse_call_direction_accepts_only_up_and_down() {
        assert_eq!(parse_call_direction("up").expect("ok"), CallDirection::Up);
        assert_eq!(
            parse_call_direction("down").expect("ok"),
            CallDirection::Down
        );
        assert!(parse_call_direction("either").is_err());
        assert!(parse_call_direction("UP").is_err());
        assert!(parse_call_direction("").is_err());
    }
}
