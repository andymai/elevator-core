/// State machine for elevator doors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DoorState {
    Closed,
    Opening { ticks_remaining: u32 },
    Open { ticks_remaining: u32 },
    Closing { ticks_remaining: u32 },
}

/// Transition emitted when the door state changes phase.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DoorTransition {
    None,
    FinishedOpening,
    FinishedOpen,
    FinishedClosing,
}

impl DoorState {
    pub fn is_open(&self) -> bool {
        matches!(self, DoorState::Open { .. })
    }

    pub fn is_closed(&self) -> bool {
        matches!(self, DoorState::Closed)
    }

    /// Begin opening the door.
    pub fn request_open(transition_ticks: u32, open_ticks: u32) -> Self {
        DoorState::Opening {
            ticks_remaining: transition_ticks,
        }
    }

    /// Advance the door state by one tick. Returns the transition that occurred.
    pub fn tick(&mut self, open_ticks: u32) -> DoorTransition {
        match self {
            DoorState::Closed => DoorTransition::None,
            DoorState::Opening { ticks_remaining } => {
                if *ticks_remaining <= 1 {
                    *self = DoorState::Open {
                        ticks_remaining: open_ticks,
                    };
                    DoorTransition::FinishedOpening
                } else {
                    *ticks_remaining -= 1;
                    DoorTransition::None
                }
            }
            DoorState::Open { ticks_remaining } => {
                if *ticks_remaining <= 1 {
                    DoorTransition::FinishedOpen
                } else {
                    *ticks_remaining -= 1;
                    DoorTransition::None
                }
            }
            DoorState::Closing { ticks_remaining } => {
                if *ticks_remaining <= 1 {
                    *self = DoorState::Closed;
                    DoorTransition::FinishedClosing
                } else {
                    *ticks_remaining -= 1;
                    DoorTransition::None
                }
            }
        }
    }
}
