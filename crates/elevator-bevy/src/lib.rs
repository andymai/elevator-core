//! Library surface of elevator-bevy — used by the binary target and by
//! examples (e.g. `examples/showcase.rs`).
//!
//! The binary entry point (`src/main.rs`) composes the default
//! [`ElevatorSimPlugin`](plugin::ElevatorSimPlugin) from these modules.
//! Examples may mix and match: e.g. the showcase uses the base rendering
//! and HUD but swaps in a scripted cinematic camera and a frame recorder.

pub mod camera;
pub mod cinematic;
pub mod decor;
pub mod input;
pub mod passenger_ai;
pub mod plugin;
pub mod recorder;
pub mod rendering;
pub mod sim_bridge;
pub mod style;
pub mod ui;
