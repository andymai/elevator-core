# Stability Policy

This document defines what **stability** means for `elevator-core` and the
other crates in this workspace. It is a promise about the rate at which
APIs change, not a promise that they never will.

## Status levels

Each public item (module, type, function, feature flag) is classified as
**Stable**, **Experimental**, or **Internal**. The
[crate layout table](crates/elevator-core/src/lib.rs) in the `elevator-core`
rustdoc shows the per-module assignment.

### Stable

A stable API has earned the following pledge:

- **Breaking changes ship only in planned major versions.** A major bump
  that touches a stable API is announced in a GitHub issue at least
  **60 days** before the release, along with a migration note in the
  CHANGELOG preamble.
- **Deprecation precedes removal.** A stable API scheduled for removal
  is marked `#[deprecated]` for **at least one major version** before it
  is actually deleted. Users get a compiler warning with a pointer to
  the replacement.
- **Semver is honored strictly.** No sneaking a breaking change into a
  minor or patch release. If you want to fix a bug whose fix changes
  behavior, either ship the fix behind a new function or wait for a
  major.

### Experimental

An experimental API signals: *the shape is still being discovered*.
Expect breakage in any minor version, with no deprecation cycle. The
API is real, not a stub — it's fully implemented and tested — but its
contract may shift as the design matures.

If you depend on an experimental API, pin to an exact minor version in
your `Cargo.toml` and expect a migration task when you upgrade:

```toml
# Depending on an experimental API? Pin the minor, not the major.
elevator-core = "=15.1"
```

Experimental APIs graduate to stable by explicit CHANGELOG entry. The
table in the crate-root docs is the source of truth.

### Internal

Internal items are `pub(crate)` or `#[doc(hidden)]`. They are not part
of the supported surface; using them from outside the crate (via reflection,
macros, or forks) is unsupported and subject to change without notice.

## Day-one classification

As of `elevator-core` v15.1.0, these items are **stable**:

- `sim::Simulation::{new, step, spawn_rider, build_rider, drain_events,
  drain_events_where, metrics, snapshot, current_tick, dt, world,
  world_mut}`
- `builder::SimulationBuilder` (entire public surface)
- `events::Event` (enum, `#[non_exhaustive]`)
- `error::SimError` (enum, `#[non_exhaustive]`)
- `metrics::Metrics` (entire public surface)
- `stop::{StopId, StopConfig}`
- `entity::{ElevatorId, RiderId, EntityId}`
- `components::{Weight, Speed, Accel}` and `components::units::UnitError`
- `snapshot::WorldSnapshot`

These items are **experimental** and may change in any minor version:

- `dispatch::DispatchStrategy` and all built-in strategies
  (`ScanDispatch`, `LookDispatch`, `NearestCarDispatch`, `EtdDispatch`,
  `DestinationDispatch`). The plugin contract may shift as we
  incorporate more dispatch algorithms.
- `hooks::{Phase, PhaseHooks}` — the phase-hook registration surface.
- `topology::*` — connectivity graph and multi-line routing queries.
- `tagged_metrics::*` — per-tag metric accumulators.
- `scenario::*` — deterministic scenario replay.
- `traffic::*` (feature-gated) — traffic generation.
- `query::*` — the query builder.
- `world::World::{insert_ext, ext, ext_mut, ...}` — extension-component APIs.
- `config::*` — RON deserialization surface. Field additions are
  `#[serde(default)]`-gated when possible, but removals and type
  changes can happen here.
- `movement::*` — trapezoidal-motion primitives. Useful as building
  blocks but not committed.
- `energy::*` (feature-gated) — simplified per-elevator energy model.
  Opt-in via the `energy` feature; the accounting model may shift.
- `time::TimeAdapter` — tick-to-wall-clock conversion utility.
- `ids::*` — config-level typed identifiers (`GroupId`, etc.).

These items are **internal**:

- `systems::*` — per-phase tick logic (`pub(crate)`).
- `door::*`, `eta::*` — low-level building blocks re-exported only
  where practical.
- Anything `#[doc(hidden)]`.

## Wrapper crates

The wrapper crates — `elevator-bevy`, `elevator-ffi`, `elevator-gdext`,
`elevator-wasm` — have their own versioning cadence. Their stability
is **not** covered by this document. They pin specific minor/major
releases of `elevator-core` and may evolve independently.

## How this evolves

- When an experimental API stabilizes, a dedicated `feat:` entry in the
  CHANGELOG calls it out (title begins with `stabilize: <module>`).
- When a stable API is scheduled for breaking change, a GitHub issue
  opens at least 60 days in advance with a migration guide.
- This document is kept in sync with the crate-root stability table;
  the table is the canonical list and this document explains the rules.

## Cadence commitment

`elevator-core` shipped 15 major versions between v1.0.0 (2025) and
v15.0.0 (2026-04-16). That cadence is driven by API discovery, not
instability of the implementation — the library has had 604 lib tests,
156 doc tests, and a mutation-tested kernel throughout. Going forward:

- **Stable surface**: at most one breaking change per 60 days.
  Experimental surface has no such bound.
- **Planned majors** will bundle breaking changes together to minimize
  consumer-side churn.

This cadence commitment applies **going forward only**; it is not
retroactive.
