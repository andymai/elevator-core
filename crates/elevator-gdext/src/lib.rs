//! GDExtension binding for elevator-core.
//!
//! Exposes the elevator simulation as Godot nodes that GDScript can use
//! directly. The primary entry point is [`ElevatorSim`], a `Node` subclass
//! that wraps [`elevator_core::sim::Simulation`].

mod sim_node;

pub use sim_node::ElevatorSim;

use godot::prelude::*;

/// GDExtension entry point.
struct ElevatorExtension;

#[gdextension]
unsafe impl ExtensionLibrary for ElevatorExtension {}
