# Hall Calls and Car Calls

Real elevators don't know rider destinations when a hall button is
pressed — they see direction only. The destination is revealed once
the rider boards and presses a floor button inside the cab. Modern
destination-dispatch systems (DCS) break that: riders enter their
destination at a lobby kiosk, so the controller knows it up-front.

The sim models both designs via **hall calls** (up/down buttons at
each stop) and **car calls** (floor buttons inside each cab), with
per-group mode selection via [`HallCallMode`][hall-call-mode].

## Data model

| Component | Keyed by | Lifetime |
|-----------|----------|----------|
| [`HallCall`][hall-call] | `(stop, direction)` — at most two per stop | Press → arrival of an assigned car in the matching direction |
| [`CarCall`][car-call] | `(car, floor)` — one per aboard rider's destination | Boarding → exit at that floor |

Two modes, chosen per-group:

- **`HallCallMode::Classic`** (default) — traditional collective
  control. Hall calls carry direction only; `CarCall` reveals the
  destination after boarding.
- **`HallCallMode::Destination`** — DCS. Hall calls carry a
  destination from the moment they're pressed (kiosk entry). Required
  by [`DestinationDispatch`][destination-dispatch].

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

1. **Press** — either implicit (via [`Simulation::spawn_rider`]) or
   explicit ([`press_hall_button`], [`press_car_button`]). First
   press emits `Event::HallButtonPressed` / `CarButtonPressed`.
2. **Acknowledge** — after the group's `ack_latency_ticks` have
   elapsed, the call becomes visible to dispatch and
   `HallCallAcknowledged` fires.
3. **Assign** — dispatch commits a car and writes it to
   `HallCall::assigned_car`. Games read this via
   [`Simulation::assigned_car`] for lobby displays.
4. **Clear** — when the assigned car opens doors at the stop with
   indicators matching the call direction, the `HallCall` is removed
   and `HallCallCleared` fires.

Car calls drop out the same way: `loading` removes a `CarCall` when
the last pending rider for that floor exits.

## Scripted control

Games can drive the sim outside the normal rider flow:

```rust,ignore
// An NPC walks up and presses the down button.
sim.press_hall_button(lobby, CallDirection::Down)?;

// Cutscene pins the villain's elevator to the penthouse.
sim.pin_assignment(villain_car, penthouse, CallDirection::Up)?;

// Player hijacks — release the pin, clear the car's existing queue.
sim.unpin_assignment(penthouse, CallDirection::Up);
sim.clear_destinations(villain_car)?;
```

Pin enforcement mirrors the idle-pool eligibility gate: a car in
`Loading` / `DoorOpening` / `DoorClosing` finishes its current door
cycle first; the pin is honored on the next dispatch tick. Pins that
cross lines (the car's line can't reach the stop) return
`SimError::InvalidState` rather than silently orphaning the call.

## Rider balking

[`Preferences`][preferences] has two knobs for game-designer-tuned
rider behavior:

- `balk_threshold_ticks: Option<u32>` — abandon after `N` ticks of
  waiting time (uses `Patience::waited_ticks` when present so multi-
  leg routes don't over-count ride time).
- `abandon_on_full: bool` — when set, a rider who is filtered out of a
  car via `skip_full_elevator` abandons immediately rather than
  waiting for the next one. Emits `RiderAbandoned` on the spot.

Both emit dedicated events (`RiderBalked`, `RiderAbandoned`) so game
UI can react to individual behavioral beats.

## Public query API

| Method | Purpose |
|--------|---------|
| [`Simulation::hall_calls()`][hall-calls-iter] | Iterator over every active hall call — lobby lamp panels, per-floor button animation |
| [`Simulation::car_calls(car)`][car-calls-method] | Floor buttons currently pressed inside `car` — cab button-panel render |
| [`Simulation::assigned_car(stop, direction)`][assigned-car] | DCS-style "your elevator will be car B" indicator |
| [`Simulation::eta_for_call(stop, direction)`][eta-for-call] | Countdown timer for hall displays |

## Events

| Event | When | Notes |
|-------|------|-------|
| `HallButtonPressed` | First press per (stop, direction) | Pre-latency; use for button-light animation |
| `HallCallAcknowledged` | Ack-latency window elapsed | UI confirmation signal |
| `HallCallCleared` | Assigned car opens doors at stop | Clears the button light |
| `CarButtonPressed` | First press per (car, floor) | `rider` is `None` for synthetic presses |
| `RiderBalked` | Preference filter rejects a candidate car | Rider may still board a later car unless `abandon_on_full` |

## FFI

Unity / native consumers can drive the call layer through the
`elevator-ffi` C ABI. See `ev_sim_press_hall_button`,
`ev_sim_press_car_button`, `ev_sim_pin_assignment`,
`ev_sim_unpin_assignment`, `ev_sim_assigned_car`,
`ev_sim_eta_for_call`, and the `EvHallCall` snapshot record.

[hall-call]: ../api-reference.html
[car-call]: ../api-reference.html
[hall-call-mode]: ../api-reference.html
[destination-dispatch]: dispatch.html
[preferences]: ../api-reference.html
[hall-calls-iter]: ../api-reference.html
[car-calls-method]: ../api-reference.html
[assigned-car]: ../api-reference.html
[eta-for-call]: ../api-reference.html
