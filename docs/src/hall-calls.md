# Hall Calls and Car Calls

Real elevators don't know rider destinations when a hall button is pressed -- they see direction only. The destination is revealed once the rider boards and presses a floor button inside the cab. Modern destination-dispatch systems (DCS) break that model: riders enter their destination at a lobby kiosk, so the controller knows it up-front.

elevator-core models both designs via **hall calls** (up/down buttons at each stop) and **car calls** (floor buttons inside each cab), with per-group mode selection.

## Data model

| Component | Keyed by | Lifetime |
|-----------|----------|----------|
| `HallCall` | `(stop, direction)` -- at most two per stop | Press through arrival of an assigned car in the matching direction |
| `CarCall` | `(car, floor)` -- one per aboard rider's destination | Boarding through exit at that floor |

## Classic vs Destination mode

Two modes are available, chosen per group via `HallCallMode`:

- **`HallCallMode::Classic`** (default) -- traditional collective control. Hall calls carry direction only; the `CarCall` reveals the destination after boarding.
- **`HallCallMode::Destination`** -- DCS mode. Hall calls carry a destination from the moment they are pressed (kiosk entry). Required by `DestinationDispatch`.

```rust,ignore
use elevator_core::prelude::*;
use elevator_core::dispatch::HallCallMode;

let mut sim = SimulationBuilder::demo().build()?;
for g in sim.groups_mut() {
    g.set_hall_call_mode(HallCallMode::Destination);
    g.set_ack_latency_ticks(5);  // 5-tick controller latency
}
```

## Lifecycle

A hall call moves through four stages:

1. **Press** -- either implicit (via `sim.spawn_rider()`) or explicit (`sim.press_hall_button()`). The first press for a given `(stop, direction)` emits `HallButtonPressed`.
2. **Acknowledge** -- after the group's `ack_latency_ticks` have elapsed, the call becomes visible to dispatch and `HallCallAcknowledged` fires. This models real-world controller latency.
3. **Assign** -- dispatch commits a car and writes it to `HallCall::assigned_car`. Games can read this via `sim.assigned_car(stop, direction)` for lobby displays (e.g., "your elevator will be car B").
4. **Clear** -- when the assigned car opens doors at the stop with direction indicators matching the call direction, the `HallCall` is removed and `HallCallCleared` fires.

Car calls follow the same pattern: `CarButtonPressed` fires on the first press per `(car, floor)`, and the loading phase removes a `CarCall` when the last pending rider for that floor exits.

## Scripted control

Games can drive the call system outside the normal rider flow:

```rust,ignore
// An NPC walks up and presses the down button.
sim.press_hall_button(lobby, CallDirection::Down)?;

// Cutscene pins the villain's elevator to the penthouse.
sim.pin_assignment(villain_car, penthouse, CallDirection::Up)?;

// Player hijacks -- release the pin, clear the car's existing queue.
sim.unpin_assignment(penthouse, CallDirection::Up);
sim.clear_destinations(villain_car)?;
```

A pinned car that is mid-door-cycle (`Loading` / `DoorOpening` / `DoorClosing`) finishes its current cycle first; the pin takes effect on the next dispatch tick. Pins that cross lines (the car's line cannot reach the stop) return `SimError::LineDoesNotServeStop` rather than silently orphaning the call.

## Rider preferences

The `Preferences` component has two knobs for game-designer-tuned rider behavior:

- **`balk_threshold_ticks: Option<u32>`** -- the rider abandons after this many ticks of waiting. Uses `Patience::waited_ticks` when present, so multi-leg routes don't over-count ride time.
- **`abandon_on_full: bool`** -- when set, a rider filtered out of a car via `skip_full_elevator` abandons immediately rather than waiting for the next one. Emits `RiderAbandoned` on the spot.

Both knobs generate events (`RiderBalked`, `RiderAbandoned`) so game UI can react to individual behavioral beats.

## Public query API

| Method | Purpose |
|--------|---------|
| `sim.hall_calls()` | Iterator over every active hall call -- use for lobby lamp panels, per-floor button animation |
| `sim.car_calls(car)` | Floor buttons currently pressed inside a car -- use for cab button-panel rendering |
| `sim.assigned_car(stop, direction)` | DCS-style "your elevator will be car B" indicator |
| `sim.eta_for_call(stop, direction)` | Countdown timer for hall displays |

## Events

| Event | When | Notes |
|-------|------|-------|
| `HallButtonPressed` | First press per `(stop, direction)` | Pre-latency; use for button-light animation |
| `HallCallAcknowledged` | Ack-latency window elapsed | UI confirmation signal |
| `HallCallCleared` | Assigned car opens doors at stop | Clears the button light |
| `CarButtonPressed` | First press per `(car, floor)` | `rider` field is `None` for synthetic presses |
| `RiderBalked` | Preference filter rejects a candidate car | Rider may still board a later car unless `abandon_on_full` is set |

## FFI

Unity and native consumers can drive the call layer through the `elevator-ffi` C ABI. See the FFI module for `ev_sim_press_hall_button`, `ev_sim_press_car_button`, `ev_sim_pin_assignment`, `ev_sim_unpin_assignment`, `ev_sim_assigned_car`, `ev_sim_eta_for_call`, and the `EvHallCall` snapshot record.

## Next steps

- [Dispatch Strategies](dispatch-strategies.md) -- how hall calls feed into elevator assignment
- [Rider Lifecycle](rider-lifecycle.md) -- what happens after a rider boards
- [The Simulation Loop](simulation-loop.md) -- where hall calls are processed in the tick phases
