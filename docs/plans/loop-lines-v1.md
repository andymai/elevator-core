# Loop Lines v1 — Design Plan

Closed-loop transit support (trains, monorails, gondolas, people-movers) for `elevator-core`.
All work ships behind the `loop_lines` cargo feature (default off).

## Status

| PR | Title | Status |
|----|-------|--------|
| 1 | `LineKind` foundation + cyclic distance | shipped (#804) |
| 2 | Movement seam-split + headway clamp | shipped (#806) |
| 3 | Direction Forward + strict validation | shipped (#808) |
| 4 | Loop topology accessors on `Simulation` | shipped (#810) |
| 5 | Cyclic motion wired into the movement systems phase | shipped (#812) |
| 6 | Loop FSM completion: door continuation + kickstart + boarding bypass | shipped (#814) |
| 7 | `LoopSweep` dispatch | shipped (#816) |
| 8 | `LoopSchedule` fixed-dwell | shipped (#818) |
| 9 | `LoopSchedule` hold-recovery | shipped (#820) |
| 10 | Demo scenario + Bevy opt-in + mdBook chapter | shipped (#822) |
| 11 | WASM host opt-in + `LineView.kind` exposure | shipped (#823) |
| 12 | TUI loop-strip rendering | this PR |

## Locked decisions

| Topic | Decision |
|---|---|
| Use case | Any closed-loop transit |
| Direction | One-way only (bidirectional out of scope for v1) |
| Topology | `LineKind { Linear { min, max }, Loop { circumference, min_headway } }` on `Line` |
| Multi-car coordination | Strict no-overtake cyclic ordering, soft headway clamp |
| Position math | Normalized to `[0, circumference)`; tick_movement seam-splits |
| Direction lamps | New `Direction::Forward` variant + `going_forward: bool` field on `Elevator` |
| Hall calls | `HallCall` shape unchanged; loop stops emit with constant `Up` direction |
| Routes | Unchanged shape; loop boarding ignores leg-direction predicate |
| Multi-lap riders | Allowed; ETA uses forward cyclic distance |
| Doors | Existing FSM reused; on Loop, `DoorClosing` → `MovingToStop(next)` |
| Idle behavior | Continuous patrol — Loop cars never enter `Idle` |
| Reposition phase | No-op on Loop lines |
| Group homogeneity | Enforced at construction (all-Linear or all-Loop) |
| Default dispatch on Loop | `LoopSweep` (call-driven) |
| `LoopSchedule` shape | Pure headway with hold-at-stop recovery if running ahead |
| Hall-call assignment on Loop | Hint only — any car may board waiters |
| `OutOfService` on Loop | Rejected at runtime if car has followers (v1 limit) |
| Manual mode + headway | Manual velocity is also clamped by headway |
| `bypass_load_pct` on Loop | New unified field; up/down thresholds disabled on Loop |
| Spatial anchor on Loop | `Line::position` = loop center; hosts derive radius from circumference |
| Stop ordering | Position-derived, mod C |
| Snapshot wire format | Add `kind` as new field; keep flat `min_position`/`max_position` for one release |
| Cargo feature scope | `elevator-core` only; hosts opt in |
| Variant naming | `LineKind::Loop { circumference, min_headway }` |
| Demo | `assets/config/loop_demo.ron` (PR 6) |
| Quest scenario | Out of scope for v1 |

## Out of scope for v1

- Bidirectional loops
- Pull-out-of-loop with follower retargeting (rejoin op)
- Quest playground scenario
- LoopSchedule timetable mode (headway-only in v1)
- FFI / gdext support behind feature flag
- Block signaling (fixed segments)

---

## PR 1 — `LineKind` foundation + cyclic distance helper

**Branch:** `feat/loop-lines-foundation`

### Scope

1. New module `crates/elevator-core/src/components/cyclic.rs` exposing:
   - `forward_distance(from: f64, to: f64, circumference: f64) -> f64` — non-negative cyclic forward distance.
   - `cyclic_distance(a: f64, b: f64, circumference: f64) -> f64` — shortest unsigned cyclic distance.
   - `wrap_position(p: f64, circumference: f64) -> f64` — normalize into `[0, C)`.
2. New `LineKind` enum on `Line`:
   ```rust
   #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
   #[non_exhaustive]
   pub enum LineKind {
       Linear { min: f64, max: f64 },
       #[cfg(feature = "loop_lines")]
       Loop { circumference: f64, min_headway: f64 },
   }
   ```
3. `Line` struct: replace flat `min_position` / `max_position` fields with `kind: LineKind`.
4. Accessor rename:
   - `Line::min_position()` → `Line::linear_min() -> Option<f64>`
   - `Line::max_position()` → `Line::linear_max() -> Option<f64>`
   - new `Line::circumference() -> Option<f64>`
   - new `Line::min_headway() -> Option<f64>`
   - new `Line::kind() -> &LineKind`
5. Snapshot transitional dual-field: serialize `kind` always; also serialize `min_position`/`max_position` derived from `kind` for one release. Custom `Deserialize` on `Line` accepts either shape — if `kind` present, prefer it; otherwise reconstruct `Linear { min, max }` from flat fields.
6. Loop variant rejected at deserialize time when `loop_lines` feature is off (`SimError::InvalidConfig`).
7. RON config: add a new optional `kind` field on `LineConfig`. Existing configs continue to use `min_position`/`max_position` — back-compat via Default.
8. `bindings.toml`: rename `min_position`/`max_position`, add `circumference`, `kind`, `min_headway`.
9. Doctests + unit tests for `cyclic.rs`, `LineKind`, accessor behavior on each variant, snapshot round-trip (old and new shapes).
10. CHANGELOG entry: rename note + new `kind` accessor.

### Out of scope for PR 1

- Movement integrator changes (PR 2)
- Construction-time Loop-specific validation (PR 3, except trivial `circumference > 0`)
- Direction enum changes (PR 3)
- Dispatch strategies (PR 4, 5)
- RON demo scenarios (PR 6)

### Files touched (estimate)

- `crates/elevator-core/Cargo.toml` — add `loop_lines` feature
- `crates/elevator-core/src/components/line.rs` — major
- `crates/elevator-core/src/components/cyclic.rs` — new
- `crates/elevator-core/src/components/mod.rs` — re-export
- `crates/elevator-core/src/sim/topology.rs` — construction maps to `LineKind`
- `crates/elevator-core/src/sim/construction.rs` — RON config handling
- `crates/elevator-core/src/config.rs` — `LineConfig` accepts `kind`
- `crates/elevator-core/src/sim.rs` — any callers of old accessors
- `crates/elevator-core/src/snapshot.rs` — dual-field write, lenient read
- `crates/elevator-core/src/lib.rs` — re-export `LineKind`
- `crates/elevator-core/src/tests/...` — add coverage; update existing tests for renamed accessors
- `bindings.toml` — accessor rename + new entries
- `crates/elevator-core/CHANGELOG.md` — entry

### Conventional commit

`feat(elevator-core): add LineKind enum and cyclic distance helper`

`#[non_exhaustive]` on `LineKind` makes future variant additions non-breaking.
The accessor rename **is** breaking — call out in CHANGELOG and bump as `feat:` (not `feat!:`)
because the old accessors are removed; downstream callers will see a compile error,
which is the loud-failure pattern this codebase prefers.

---

## PR 2 — Movement seam-split + headway clamp

**Branch:** `feat/loop-lines-movement` (off main, after PR 1 merges)

### Scope
- Extend `tick_movement` in `crates/elevator-core/src/movement.rs` (or wrap it in a new
  `tick_movement_cyclic`) to handle seam-crossing: split a tick that would jump past
  position 0 into two segments and apply each to keep `position ∈ [0, C)`.
- Implement soft headway clamp: a Loop trailer's effective target = `min(intended,
  forward_distance(trailer, leader) - min_headway)` in cyclic space.
- Manual-mode velocity also clamped by headway.
- Construction validates `max_cars * min_headway <= circumference`.
- Property test (10k randomized ticks): `forward_distance(car_n, car_n+1) >= min_headway`
  always holds.
- `debug_assert!` inside the clamp.

### Conventional commit
`feat(elevator-core): cyclic movement and headway clamping for loop lines`

---

## PR 3 — Phase adaptations + strict construction validation

**Branch:** `feat/loop-lines-phases`

### Scope
- New `Direction::Forward` variant.
- New `going_forward: bool` field on `Elevator` (defaults `false` for Linear, `true` for
  forward-moving Loop cars). Auto-managed by dispatch.
- Door FSM: on Loop, after `DoorClosing` transition to `MovingToStop(next_stop)` instead
  of `Stopped`.
- `Repositioning` phase: early-return on Loop lines.
- Boarding code: bypass directional gating when line kind is Loop.
- Strict construction validation in `sim/construction.rs` and `sim/topology.rs`
  — every Loop-related rejection consolidated:
  - `home_stop` set on a Loop-line car → reject
  - non-`None` reposition strategy on a Loop group → reject
  - mixed Linear+Loop in one group → reject
  - 0 stops or duplicate-position stops on a Loop → reject
  - `min_headway <= 0` or `circumference <= 0` → reject
  - initial car spacing < `min_headway` → reject
- New `bypass_load_pct: Option<f64>` field on `Elevator`; existing
  `bypass_load_up_pct`/`bypass_load_down_pct` ignored on Loop (logged at debug).
- `OutOfService` runtime guard: return `SimError::OutOfServiceWouldBlockLoop` if Loop
  car has followers.

### Conventional commit
`feat(elevator-core): direction forward variant and loop phase semantics`

---

## PR 4 — `LoopSweep` dispatch

**Branch:** `feat/loop-lines-sweep`

### Scope
- New `dispatch/loop_sweep.rs` strategy: cars patrol forward, board every waiter at
  every stop arrival. Default for Loop groups.
- Group construction defaults to `LoopSweep` when strategy unspecified on a Loop group.
- `assigned_cars_by_line` becomes a hint on Loop — boarding code does not gate on it.
- New public methods on `Simulation`:
  - `loop_circumference(line: LineId) -> Option<f64>`
  - `loop_next_stop(line: LineId, position: f64) -> Option<StopId>`
  - `is_loop(line: LineId) -> bool`
- `bindings.toml` entries for new methods.
- Tests: a 3-car loop scenario serving randomized hall calls; assert all riders
  delivered, headway invariant holds.

### Conventional commit
`feat(elevator-core): loop sweep dispatch strategy`

---

## PR 5 — `LoopSchedule` dispatch

**Branch:** `feat/loop-lines-schedule`

### Scope
- New `dispatch/loop_schedule.rs` strategy:
  ```rust
  LoopSchedule {
      dwell_ticks: u32,
      target_headway_ticks: u32,
  }
  ```
- Cars dwell exactly `dwell_ticks` per stop, then depart.
- Hold-recovery: if a car is running *ahead* of `target_headway_ticks` relative to the
  preceding car, extend its dwell at the current stop until the headway gap is restored
  (or up to a documented cap to prevent indefinite hold).
- Bunching under load is documented as a known v1 limitation.
- Tests: synthetic scenario where one car is artificially delayed; verify followers do
  *not* hold-recover by accelerating (we never overtake).

### Conventional commit
`feat(elevator-core): loop schedule dispatch with hold-recovery`

---

## PR 6 — Demo scenario + host wiring

**Branch:** `feat/loop-lines-demo`

### Scope
- `assets/config/loop_demo.ron` — one loop, 4 stops, 2–3 cars. RON loader gates the
  scenario behind `loop_lines` feature.
- `elevator-bevy` host: enable feature, add minimal circular rendering using
  `Line::circumference()` + `Line::position()` (anchor as center).
- `elevator-tui` host: enable feature, render loop as horizontal strip with seam markers.
- `elevator-wasm` host: enable feature; tsify auto-derives `LineKind` into TypeScript.
  Playground reads it but does not yet add a Quest scenario.
- mdbook chapter: `docs/src/loop-lines.md` with config example + diagram.

### Conventional commit
`feat: loop lines demo scenario and host wiring`

---

## Determinism strategy

- `kind` always serialized regardless of feature flag.
- With `loop_lines` off, `LineKind::Loop` is rejected at deserialize.
- `elevator-contract` runs the harness with both feature configurations and asserts
  identical snapshots for shared (Linear-only) scenarios.
- Property test in PR 2 asserts cyclic-ordering invariant under randomized motion.

## Risk hot-spots for review

- **PR 1 snapshot dual-field migration** — old snapshot deserializing with
  inconsistent `kind` vs flat fields is a deterministic-divergence bug surface.
- **PR 2 cyclic motion + headway clamp** under all velocity edge cases (opposing,
  near-zero, manual override).
- **PR 4 assignment-as-hint** changes existing dispatch contract on Loop groups —
  must not regress Linear behavior.
