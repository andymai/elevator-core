# Host Binding Parity

This page is the cross-host contract for `elevator-core`'s binding crates: the non-method surfaces that every host (FFI, wasm, gdext, Bevy, GameMaker) is expected to expose, and the agreed semantics for each. It is the counterpart to the [Binding Coverage Manifest](binding-coverage.md) — the manifest tracks every `Simulation::*` method one-by-one; this page tracks the snapshot, event, error, and ABI-version concerns that don't live on `Simulation` but still have to align across hosts.

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

## Next steps

- [Binding Coverage Manifest](binding-coverage.md) — the per-method coverage view that complements this page.
- [Using the Bindings](using-the-bindings.md) — host-by-host consumer guide; cross-reference the parity table above for known gaps in the host you ship against.
- [Supporting Crates](supporting-crates.md) — the build-time crates (`elevator-layout-*`, `elevator-contract`) that enforce the parity contract in CI.

## History

The contract above is the result of incremental work across several
PRs, originally tracked under issue [#655] ("Add HostBinding
abstraction trait shared across binding crates"). The umbrella issue
is closed; further cross-host parity changes edit this page directly
instead of opening a new umbrella.

<details>
<summary>Migration plan (all complete)</summary>

The work was intentionally incremental — each step shipped
independently and kept every host runnable.

1. **Shared log severity constants** — `LEVEL_TRACE` … `LEVEL_ERROR` lifted from FFI's hardcoded values into `elevator_core::events::log_format`. Hosts that surface formatted log records reference the constants instead of knowing "1 means debug" out-of-band.
2. **Cross-host log drain** ([#656]) — wasm and gdext expose `peekLogMessages` / `peek_log_messages` mirroring FFI's `ev_drain_log_messages`. Bevy is intentionally skipped because it has native `tracing`.
3. **Shared error classification** — `elevator_core::host_error::ErrorKind` is the cross-host failure vocabulary (`NullArg`, `InvalidUtf8`, `ConfigLoad`, `ConfigParse`, `BuildFailed`, `NotFound`, `InvalidArg`, `Panic`). FFI provides `impl From<ErrorKind> for EvStatus`; new FFI / wasm / gdext call sites should produce errors via the shared kind so the integer / string / Variant representations stay aligned. Adoption across existing call sites is intentionally incremental — the shared enum is the foothold, not a flag-day migration.
4. **Snapshot field-set guard** — a tripwire test (`elevator_ffi::tests::snapshot_dto_field_names_locked`) locks the field names on every snapshot DTO (`EvElevatorView`, `EvStopView`, `EvRiderView`, `EvMetricsView`, `EvFrame`) using the existing `MultiHostLayout::fields()` registry. When a field is added, removed, or renamed, the test fails and walks the developer through the parity update sequence (wasm DTO → gdext dict → bump `HOST_PROTOCOL_VERSION` if breaking → update the locked list). Catches the silent-drift failure mode without requiring CI access to wasm / gdext crate internals.
5. **Wire-version constant** — `elevator_core::HOST_PROTOCOL_VERSION` is the single source of truth. wasm's `ABI_VERSION` and gdext's `ABI_VERSION` reference it directly at compile time; FFI keeps a literal `EV_ABI_VERSION` (so cbindgen can resolve it into the generated C header) plus a `const _: () = assert!(...)` guard that traps any drift. `scripts/check-abi-pins.sh` verifies both literal and reference shapes.
6. **`HostBinding` pattern** — see the close-out section below.

</details>

<details>
<summary>Close-out: documented contract, no Rust trait</summary>

Steps 3–5 deliberately exercised the cross-host vocabulary by landing
real, observable changes in three host crates. With those in main,
the trait-vs-pattern question that step 6 deferred had a clear
answer: **shared types in `elevator-core`, hand-written per-host
adapters, no Rust trait**. The reasoning:

1. **The host I/O types are too divergent for a useful trait.** FFI returns `EvStatus` integers and `*const T` slice pointers. wasm returns `tsify`-derived discriminated unions over `JsValue`. gdext returns Godot `Variant` dictionaries. Bevy emits ECS messages. A trait abstracting these would need associated types for *every* return shape — at which point each host's `impl` is a thicker translation layer than the direct hand-written adapter it replaces.
2. **The actual sharing happens at the data layer, not the method layer.** `events::log_format::format_event`, `host_error::ErrorKind`, and `HOST_PROTOCOL_VERSION` are plain values / enums — every host already references them directly. There is no place a `trait HostBinding { fn ev_status(...) }` would slot in without re-introducing the per-host divergence we just removed.
3. **The tripwire pattern (step 4) covers the drift risk a trait would have caught.** `snapshot_dto_field_names_locked` forces a deliberate sync when a snapshot DTO changes, with the parity-update sequence spelled out in the test's doc comment. That achieves the trait's main value (preventing silent drift) without the type gymnastics.

So `HostBinding` landed as: this document + the shared types in core
+ tripwire tests. Adding a Rust trait later is still possible if a
concrete need surfaces, but speculatively introducing one would
constrain future host evolution without buying real safety.

</details>

[#655]: https://github.com/andymai/elevator-core/issues/655
[#656]: https://github.com/andymai/elevator-core/issues/656
