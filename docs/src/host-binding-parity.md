# Host Binding Parity

This page documents the *cross-host* contract: the surfaces that every
binding crate (FFI, wasm, gdext, Bevy, GameMaker) is expected to
expose, the agreed semantics, and the per-host status. It is the
counterpart to [Binding Coverage Manifest](binding-coverage.md) — the
manifest tracks every `Simulation::*` method one-by-one, while this
page tracks the *non-method* concerns that nonetheless need to behave
consistently across hosts.

This is the foundation referenced in issue #655: "Add HostBinding
abstraction trait shared across binding crates". The work itself is
incremental — the *contract* lives here, while individual host
crates migrate at their own pace as new PRs land.

## Why a separate parity document

`bindings.toml` enumerates `pub fn` on `impl Simulation`. But several
host concerns aren't `Simulation` methods:

- **Snapshot encode/decode** — each host shapes its own DTO from the
  shared `Simulation::snapshot` data; the *fields* should match
  even though the *envelope* differs (`#[repr(C)]` for FFI,
  `Tsify` for wasm, Godot `Variant` dict for gdext).
- **Event drain** — the *core* method is `drain_events()`, but the
  host wrappers around it (lazy buffering, severity classification,
  borrowed-pointer lifetimes) live entirely in each host crate.
- **Error marshalling** — `EvStatus`, `JsValue`, Godot exceptions,
  Bevy panics; same failure modes, different wire shapes.
- **ABI version** — the FFI `EV_ABI_VERSION` constant has no direct
  analogue in wasm/gdext, but consumers still need *something* to
  pin against.
- **Log drain** — convenience surface on top of the event stream;
  parity work landed in #656.

These cross-host concerns previously had no canonical home. Without
one, "fully supported in language X" drifts silently — exactly the
risk that motivated `bindings.toml` for the per-method surface.

## The parity surface

| Concern              | Source of truth                              | FFI | wasm | gdext | Bevy | Notes |
|----------------------|----------------------------------------------|-----|------|-------|------|-------|
| Snapshot encode      | `Simulation::snapshot`                       | `EvSnapshot` (`#[repr(C)]`) | `Snapshot` (`Tsify`) | `Dictionary` | `SimSnapshot` resource | Fields must align — adding a field to the core snapshot requires updating every host. |
| Event drain (consume)| `Simulation::drain_events`                   | `ev_sim_drain_events` | `drainEvents` | `drain_events` | `EventWrapper` messages | All four route through `Simulation::drain_events`. |
| Event peek (non-consuming) | `Simulation::pending_events`           | (internal, used by log forwarder) | `pendingEvents` | (none yet) | (none yet) | gdext / Bevy parity is a follow-up. |
| Log drain (formatted)| `events::log_format::format_event`           | `ev_drain_log_messages` | `peekLogMessages` (#656) | `peek_log_messages` (#656) | *skip — uses `tracing`* | Severity constants in `events::log_format`. |
| Error marshalling    | `host_error::ErrorKind`                       | `EvStatus` (`From<ErrorKind>`) + `ev_last_error` | thrown `Error` | Godot exception | Rust panic | Shared classification lives in `elevator_core::host_error`; FFI maps it to `EvStatus`. wasm / gdext consume `ErrorKind::label()` for kebab-case classification strings. |
| ABI / wire version   | `elevator_core::HOST_PROTOCOL_VERSION`        | `EV_ABI_VERSION` (literal, asserted equal to core) | `ABI_VERSION` (refs core) | `ABI_VERSION` (refs core) | crate semver | FFI keeps a literal so cbindgen can emit `#define EV_ABI_VERSION` in the generated C header; a compile-time `assert!` ties the literal to core. |

## Error vocabulary

The FFI's `EvStatus` enum classifies failure modes in a way that
non-FFI hosts also need (e.g. *which kind of error did the wasm
binding throw?*). The intended classification:

- `Ok` — success.
- `NullArg` — required pointer / handle was null.
- `InvalidArg` — argument is not null but is malformed (bad utf-8,
  invalid entity id, out-of-range value).
- `NotFound` — referenced entity does not exist (or has been
  removed) at the time of the call.
- `Capacity` — operation would exceed a configured limit (rider
  weight, line size, …).
- `Panic` — internal panic recovered at the host boundary; the
  callable is unsafe to retry without recreating the handle.

Today only the FFI lifts this vocabulary into a typed enum. Future
PRs will lift these to a shared module so wasm / gdext error
constructors map their underlying language errors onto the same
classification.

## Migration plan (multi-PR)

The work below is intentionally incremental — each step is small,
ships independently, and keeps every host runnable.

1. ✅ **Shared log severity constants** (this PR) — `LEVEL_TRACE`
   … `LEVEL_ERROR` lifted from FFI's hardcoded values into
   `elevator_core::events::log_format`. Hosts that surface
   formatted log records reference the constants instead of
   knowing "1 means debug" out-of-band.
2. ✅ **Cross-host log drain** (#656) — wasm and gdext expose
   `peekLogMessages` / `peek_log_messages` mirroring FFI's
   `ev_drain_log_messages`. Bevy is intentionally skipped because
   it has native `tracing`.
3. ✅ **Shared error classification** —
   `elevator_core::host_error::ErrorKind` is the cross-host failure
   vocabulary (`NullArg`, `InvalidUtf8`, `ConfigLoad`,
   `ConfigParse`, `BuildFailed`, `NotFound`, `InvalidArg`,
   `Panic`). FFI provides `impl From<ErrorKind> for EvStatus`; new
   FFI / wasm / gdext call sites should produce errors via the
   shared kind so the integer / string / Variant representations
   stay aligned. Adoption across existing call sites is
   intentionally incremental — the shared enum is the foothold,
   not a flag-day migration.
4. ✅ **Snapshot field-set guard** — a tripwire test
   (`elevator_ffi::tests::snapshot_dto_field_names_locked`) locks
   the field names on every snapshot DTO (`EvElevatorView`,
   `EvStopView`, `EvRiderView`, `EvMetricsView`, `EvFrame`) using
   the existing `MultiHostLayout::fields()` registry. When a field
   is added, removed, or renamed, the test fails and walks the
   developer through the parity update sequence (wasm DTO → gdext
   dict → bump `HOST_PROTOCOL_VERSION` if breaking → update the
   locked list). Catches the silent-drift failure mode without
   requiring CI access to wasm / gdext crate internals.
5. ✅ **Wire-version constant** — `elevator_core::HOST_PROTOCOL_VERSION`
   is the single source of truth. wasm's `ABI_VERSION` and gdext's
   `ABI_VERSION` reference it directly at compile time; FFI keeps a
   literal `EV_ABI_VERSION` (so cbindgen can resolve it into the
   generated C header) plus a `const _: () = assert!(...)` guard
   that traps any drift. `scripts/check-abi-pins.sh` was extended to
   verify both literal and reference shapes.
6. ✅ **`HostBinding` pattern (closing decision: documented
   contract, no Rust trait)** — see [Close-out](#close-out-trait-or-pattern)
   below. The trait shape was rejected after steps 3-5 made the
   per-host divergence concrete; the pattern landed instead is
   *this document plus per-host adapter modules in core*
   (`events::log_format`, `host_error::ErrorKind`, the
   `HOST_PROTOCOL_VERSION` constant), backed by tripwire tests
   in the FFI crate.

All six steps are complete. Future per-method coverage continues
to land via [`bindings.toml`](binding-coverage.md); cross-host
concerns track in the parity table above.

## Close-out: trait or pattern?

Steps 3-5 deliberately exercised the cross-host vocabulary by
landing real, observable changes in three host crates. With those
in main, the trait-vs-pattern question that step 6 deferred has
a clear answer: **shared types in `elevator-core`, hand-written
per-host adapters, no Rust trait**. The reasoning, in plain
terms:

1. **The host I/O types are too divergent for a useful trait.**
   FFI returns `EvStatus` integers and `*const T` slice pointers.
   wasm returns `tsify`-derived discriminated unions over
   `JsValue`. gdext returns Godot `Variant` dictionaries. Bevy
   emits ECS messages. A trait abstracting these would need
   associated types for *every* return shape — at which point
   each host's `impl` is a thicker translation layer than the
   direct hand-written adapter it replaces.

2. **The actual sharing happens at the data layer, not the
   method layer.** `events::log_format::format_event`,
   `host_error::ErrorKind`, and `HOST_PROTOCOL_VERSION` are
   plain values / enums — every host already references them
   directly. There is no place a `trait HostBinding { fn
   ev_status(...) }` would slot in without re-introducing the
   per-host divergence we just removed.

3. **The tripwire pattern (step 4) covers the drift risk a
   trait would have caught.** `snapshot_dto_field_names_locked`
   forces a deliberate sync when a snapshot DTO changes, with
   the parity-update sequence spelled out in the test's doc
   comment. That achieves the trait's main value (preventing
   silent drift) without the type gymnastics.

So `HostBinding` lands as: this document + the shared types in
core + tripwire tests. Adding a Rust trait later is still
possible if a concrete need surfaces, but speculatively
introducing one would constrain future host evolution without
buying real safety.

## Next steps

- Read [Binding Coverage Manifest](binding-coverage.md) for the
  per-method coverage view that complements this page.
- Pick a host you ship against in [Using the Bindings](using-the-bindings.md)
  and check the relevant column above for known gaps.
- The umbrella issue [#655] is closed; this document is the
  ongoing tracker for cross-host parity changes. Edit it directly
  when a new concern appears or an existing one shifts.

## Cross-references

- [Binding Coverage Manifest](binding-coverage.md) — per-method
  coverage in `bindings.toml`.
- [Using the Bindings](using-the-bindings.md) — host-by-host
  consumer guide.
- Issue [#655] — the umbrella issue, closed by this document's
  step 6. Future cross-host parity work edits this page directly
  instead of opening a new umbrella.
- Issue [#656] — log-drain parity, completed.

[#655]: https://github.com/andymai/elevator-core/issues/655
[#656]: https://github.com/andymai/elevator-core/issues/656
