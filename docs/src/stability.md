# Stability and Versioning

`elevator-core` classifies every public item as **stable**, **experimental**, or **internal**. Each level has a different break-rate guarantee. This page covers what those guarantees mean and how to work with them; the repo's [`STABILITY.md`](https://github.com/andymai/elevator-core/blob/main/STABILITY.md) is the authoritative source for the per-item classification.

## The three status levels

### Stable

A stable API ships breaking changes **only in planned major versions**. Three rules back the guarantee:

- **Majors are announced.** A major bump that touches a stable API opens a GitHub issue at least 60 days before the release, with a migration note staged in the CHANGELOG preamble.
- **Deprecation precedes removal.** A stable API on its way out is marked `#[deprecated]` for at least one major before deletion. Compiler warnings point you at the replacement.
- **Semver is honoured strictly.** Bug fixes that change behaviour either land behind a new function or wait for the next major.

The current stable surface includes `Simulation`, `SimulationBuilder`, `Event`, `SimError`, `Metrics`, the entity IDs (`StopId`, `RiderId`, `ElevatorId` — declared in `entity::` and `stop::`), `WorldSnapshot`, and the `DispatchStrategy` trait with all built-in strategies. See `STABILITY.md` for the full enumeration.

### Experimental

Experimental APIs signal *the shape is still being discovered*. They may break in any minor version with no deprecation cycle. The API is real — fully implemented and tested — but the contract can shift as the design matures.

Currently experimental: `hooks::*`, `topology::*`, `tagged_metrics::*`, `scenario::*`, `traffic::*`, `query::*`, the extension-component APIs on `World`, the RON `config::*` surface, `movement::*` primitives, `energy::*`, `time::TimeAdapter`, and `ids::*` (config-level identifiers like `GroupId` — distinct from the entity IDs above, which are stable).

If you depend on one of these, pin the minor version:

```toml
# Replace X.Y with the minor you are targeting.
elevator-core = "=X.Y"
```

When you bump the pin, expect a short migration. The CHANGELOG calls out what moved.

### Internal

Items marked `pub(crate)` or `#[doc(hidden)]` are not part of the supported surface. Anything in `systems::*`, low-level door/ETA primitives, and `#[doc(hidden)]` re-exports falls here. Using these from outside the crate (via reflection, macros, or forks) is unsupported.

## Non-breaking changes you should expect

Several kinds of change look like API breaks but are deliberately *not* covered by the stability policy:

- **Adding variants to `#[non_exhaustive]` enums.** `Event` and `SimError` are non-exhaustive; new variants ship in `feat:` commits, not `feat!:`.
- **Adding fields with `#[serde(default)]`.** RON config additions are gated by serde defaults whenever possible; older configs continue to load.
- **Adding optional builder methods.** `SimulationBuilder` and `RiderBuilder` accept new methods without breaking existing call sites.

These appear in the CHANGELOG under feature additions, not migrations.

## Cadence commitment

The stable surface has a bounded break rate; planned majors bundle changes to minimise consumer-side churn. The experimental surface has no such cap. The bound and its scope are spelled out in [`STABILITY.md` § Cadence commitment](https://github.com/andymai/elevator-core/blob/main/STABILITY.md#cadence-commitment).

## Where to look up an item's status

Two sources, in order of recency:

1. **The crate-root module table** in the [`elevator-core` rustdoc](https://docs.rs/elevator-core). Every module row carries a Stability column; this is the live snapshot.
2. **`STABILITY.md`** in the repo. The History section there records when items graduated from experimental to stable, which the rustdoc table does not.

## Next steps

- [`STABILITY.md`](https://github.com/andymai/elevator-core/blob/main/STABILITY.md) — full policy text, deprecation rules, graduation history.
- [Testing Your Simulation](testing.md) — the invariants you can rely on under the stability policy.
- [Snapshots and Determinism](snapshots-determinism.md) — the determinism contract that anchors what "stable behaviour" means.
