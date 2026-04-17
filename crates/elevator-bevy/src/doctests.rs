//! Compiles the `bevy-integration.md` chapter so its code fences cannot
//! drift from the real `elevator-bevy` bridge types and the current Bevy
//! version the crate pins.

#![cfg(doctest)]
#![allow(missing_docs)]

#[doc = include_str!("../../../docs/src/bevy-integration.md")]
pub struct BevyIntegration;
