//! Shared error classification for host bindings.
//!
//! Each host crate (FFI, wasm, gdext, Bevy) translates simulation
//! failures into its own idiomatic error shape — `EvStatus` integers
//! for FFI, `JsValue`-shaped exceptions for wasm, Godot exceptions
//! for gdext. Without a shared classification the bindings used to
//! enumerate the *kinds* of failures separately, drifting whenever a
//! new failure mode landed.
//!
//! [`ErrorKind`](crate::host_error::ErrorKind) is the shared
//! vocabulary. Hosts map it to their native error type (FFI provides
//! `From<ErrorKind> for EvStatus`).
//!
//! See [Host Binding Parity](https://andymai.github.io/elevator-core/host-binding-parity.html)
//! for the wider cross-host contract this enum is part of.

use serde::{Deserialize, Serialize};

/// Classification of failures every host binding can surface.
///
/// Variants mirror FFI's historical `EvStatus` enum (minus `Ok`,
/// which represents *success* rather than an error kind). Hosts
/// that can't yet emit a given variant should still match against
/// the full set with a `_` fallback so future variants don't break
/// existing call sites.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[non_exhaustive]
pub enum ErrorKind {
    /// A required pointer / handle argument was null.
    NullArg,
    /// A C string argument was not valid UTF-8.
    InvalidUtf8,
    /// A config file could not be read from disk.
    ConfigLoad,
    /// A config file failed to parse.
    ConfigParse,
    /// `SimulationBuilder::build` rejected the resolved config.
    BuildFailed,
    /// The referenced entity, group, or resource was not found.
    NotFound,
    /// The argument was structurally valid but semantically rejected.
    InvalidArg,
    /// A Rust panic was caught at the host boundary; the underlying
    /// state may be partially mutated and the host handle should be
    /// considered unsafe to reuse.
    Panic,
}

impl ErrorKind {
    /// Stable string label for a variant.
    ///
    /// Hosts that need to surface the kind to a non-Rust consumer
    /// (e.g. wasm's JS side, gdext's `GDScript` side) can use this to
    /// produce a kebab-case label without paying for full
    /// `Debug` rendering. The set of returned strings is part of
    /// the cross-host contract — adding a new variant requires
    /// adding a label here.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::NullArg => "null-arg",
            Self::InvalidUtf8 => "invalid-utf8",
            Self::ConfigLoad => "config-load",
            Self::ConfigParse => "config-parse",
            Self::BuildFailed => "build-failed",
            Self::NotFound => "not-found",
            Self::InvalidArg => "invalid-arg",
            Self::Panic => "panic",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ErrorKind;

    #[test]
    fn label_is_kebab_case_and_stable() {
        // Locked: changing any of these breaks consumer parsers.
        assert_eq!(ErrorKind::NullArg.label(), "null-arg");
        assert_eq!(ErrorKind::InvalidUtf8.label(), "invalid-utf8");
        assert_eq!(ErrorKind::ConfigLoad.label(), "config-load");
        assert_eq!(ErrorKind::ConfigParse.label(), "config-parse");
        assert_eq!(ErrorKind::BuildFailed.label(), "build-failed");
        assert_eq!(ErrorKind::NotFound.label(), "not-found");
        assert_eq!(ErrorKind::InvalidArg.label(), "invalid-arg");
        assert_eq!(ErrorKind::Panic.label(), "panic");
    }

    #[test]
    fn labels_are_unique() {
        let labels = [
            ErrorKind::NullArg.label(),
            ErrorKind::InvalidUtf8.label(),
            ErrorKind::ConfigLoad.label(),
            ErrorKind::ConfigParse.label(),
            ErrorKind::BuildFailed.label(),
            ErrorKind::NotFound.label(),
            ErrorKind::InvalidArg.label(),
            ErrorKind::Panic.label(),
        ];
        let unique: std::collections::HashSet<_> = labels.iter().collect();
        assert_eq!(unique.len(), labels.len());
    }
}
