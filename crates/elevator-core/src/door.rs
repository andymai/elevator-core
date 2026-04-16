//! Door open/close finite-state machine.

use serde::{Deserialize, Serialize};

/// State machine for elevator doors.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum DoorState {
    /// Doors are fully closed.
    Closed,
    /// Doors are in the process of opening.
    Opening {
        /// Ticks left in the opening transition.
        ticks_remaining: u32,
        /// How many ticks the door stays open once fully opened.
        open_duration: u32,
        /// How many ticks the closing transition takes.
        close_duration: u32,
    },
    /// Doors are fully open and holding.
    Open {
        /// Ticks left before the doors begin closing.
        ticks_remaining: u32,
        /// How many ticks the closing transition takes.
        close_duration: u32,
    },
    /// Doors are in the process of closing.
    Closing {
        /// Ticks left in the closing transition.
        ticks_remaining: u32,
    },
}

/// A manual door-control command submitted by game code.
///
/// Submitted via
/// [`Simulation::open_door`](crate::sim::Simulation::open_door),
/// [`Simulation::close_door`](crate::sim::Simulation::close_door),
/// [`Simulation::hold_door`](crate::sim::Simulation::hold_door),
/// and [`Simulation::cancel_door_hold`](crate::sim::Simulation::cancel_door_hold).
/// Commands are queued on the target elevator and processed at the start of
/// the door phase; those that are not yet valid stay queued until they are.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum DoorCommand {
    /// Open the doors now (or on arrival at the next stop).
    Open,
    /// Close the doors now (or as soon as loading is done).
    Close,
    /// Extend the open dwell by `ticks`. Cumulative across calls.
    HoldOpen {
        /// Additional ticks to hold the doors open.
        ticks: u32,
    },
    /// Cancel any pending hold extension.
    CancelHold,
}

/// Transition emitted when the door state changes phase.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[non_exhaustive]
pub enum DoorTransition {
    /// No phase change occurred this tick.
    None,
    /// Doors just finished opening and are now fully open.
    FinishedOpening,
    /// Doors just finished holding open and are about to close.
    FinishedOpen,
    /// Doors just finished closing and are now fully closed.
    FinishedClosing,
}

impl std::fmt::Display for DoorState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Closed => write!(f, "Closed"),
            Self::Opening {
                ticks_remaining, ..
            } => write!(f, "Opening({ticks_remaining})"),
            Self::Open {
                ticks_remaining, ..
            } => write!(f, "Open({ticks_remaining})"),
            Self::Closing { ticks_remaining } => write!(f, "Closing({ticks_remaining})"),
        }
    }
}

impl DoorState {
    /// Returns `true` if the doors are fully open.
    #[must_use]
    pub const fn is_open(&self) -> bool {
        matches!(self, Self::Open { .. })
    }

    /// Returns `true` if the doors are fully closed.
    #[must_use]
    pub const fn is_closed(&self) -> bool {
        matches!(self, Self::Closed)
    }

    /// Begin opening the door.
    #[must_use]
    pub const fn request_open(transition_ticks: u32, open_ticks: u32) -> Self {
        Self::Opening {
            ticks_remaining: transition_ticks,
            open_duration: open_ticks,
            close_duration: transition_ticks,
        }
    }

    /// Advance the door state by one tick. Returns the transition that occurred.
    pub const fn tick(&mut self) -> DoorTransition {
        match self {
            Self::Closed => DoorTransition::None,
            Self::Opening {
                ticks_remaining,
                open_duration,
                close_duration,
            } => {
                if *ticks_remaining <= 1 {
                    let od = *open_duration;
                    let cd = *close_duration;
                    *self = Self::Open {
                        ticks_remaining: od,
                        close_duration: cd,
                    };
                    DoorTransition::FinishedOpening
                } else {
                    *ticks_remaining -= 1;
                    DoorTransition::None
                }
            }
            Self::Open {
                ticks_remaining,
                close_duration,
            } => {
                if *ticks_remaining <= 1 {
                    let cd = *close_duration;
                    *self = Self::Closing {
                        ticks_remaining: cd,
                    };
                    DoorTransition::FinishedOpen
                } else {
                    *ticks_remaining -= 1;
                    DoorTransition::None
                }
            }
            Self::Closing { ticks_remaining } => {
                if *ticks_remaining <= 1 {
                    *self = Self::Closed;
                    DoorTransition::FinishedClosing
                } else {
                    *ticks_remaining -= 1;
                    DoorTransition::None
                }
            }
        }
    }
}
