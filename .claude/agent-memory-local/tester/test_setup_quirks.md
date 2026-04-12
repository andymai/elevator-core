---
name: Test setup quirks
description: Non-obvious pitfalls when manually constructing Elevator entities or testing the loading system
type: feedback
---

When constructing `Elevator` structs in tests, `DoorState::Open` is a struct variant requiring fields (`ticks_remaining`, `close_duration`) — use `DoorState::Closed` when the door state is irrelevant.

**Why:** The loading system (`systems/loading.rs`) checks `ElevatorPhase::Loading`, not `DoorState`. Setting `DoorState::Closed` while `phase = ElevatorPhase::Loading` is perfectly valid for testing and avoids constructing the full struct variant.

**How to apply:** Whenever manually constructing an `Elevator` component for a test that forces `ElevatorPhase::Loading`, always set `door: DoorState::Closed` unless the door FSM is what is under test.
