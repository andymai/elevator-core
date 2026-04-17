# Stability and Versioning

`elevator-core` classifies every public item as **stable**, **experimental**, or **internal**, and the crate makes a specific promise about how quickly each kind can break. This chapter summarises the rules; the repo's [`STABILITY.md`](https://github.com/andymai/elevator-core/blob/main/STABILITY.md) is the authoritative source.

## Three status levels

**Stable.** Breaking changes ship only in planned major versions. Majors that touch a stable API are announced in a GitHub issue at least 60 days before the release, with a CHANGELOG migration note. `#[deprecated]` precedes removal by at least one major.

**Experimental.** The shape is still being discovered. May break in any minor version with no deprecation cycle. The API is real — fully implemented and tested — but the contract can shift as the design matures.

**Internal.** `pub(crate)` or `#[doc(hidden)]`. Not supported for use outside the crate.

## Where to find the current classification

The module table at the top of the [`elevator-core` crate docs](https://docs.rs/elevator-core) is the canonical list. Every row has a Stability column. That table and `STABILITY.md` move together — if you're deciding whether to depend on a specific module, check the table first.

As of v15.1.0 these items are stable: [`Simulation`](https://docs.rs/elevator-core/latest/elevator_core/sim/struct.Simulation.html)'s core methods, [`SimulationBuilder`](https://docs.rs/elevator-core/latest/elevator_core/builder/struct.SimulationBuilder.html), [`Event`](https://docs.rs/elevator-core/latest/elevator_core/events/enum.Event.html), [`SimError`](https://docs.rs/elevator-core/latest/elevator_core/error/enum.SimError.html), the ID newtypes, the physical-unit newtypes (`Weight`, `Speed`, `Accel`), and [`WorldSnapshot`](https://docs.rs/elevator-core/latest/elevator_core/snapshot/struct.WorldSnapshot.html).

Experimental areas: `dispatch::*`, `hooks::*`, `topology::*`, `tagged_metrics::*`, `scenario::*`, `traffic::*`, `query::*`, `world` extension APIs, `config::*`, and `movement::*`.

## Depending on experimental APIs

Pin to an exact minor version:

```toml
# Use this if you touch dispatch, hooks, topology, traffic, extensions,
# or any other experimental area:
elevator-core = "=15.1"
```

When you bump the minor, expect a short migration task. The CHANGELOG will call out what changed.

## Cadence commitment

`elevator-core` shipped 15 majors between v1.0 and v15.0 during API discovery. Going forward: **at most one breaking change to the stable surface per 60 days**, with planned majors bundling breaks together. Experimental surface isn't bound by this cap.

The cadence commitment is not retroactive — it applies to releases after v15.1.0.

## Next steps

- [`STABILITY.md`](https://github.com/andymai/elevator-core/blob/main/STABILITY.md) — full policy text, deprecation rules, and per-item day-one classification.
- [Introduction](introduction.md) — what the library does and doesn't do.
- [Testing Your Simulation](testing.md) — the invariants you can rely on under the stability policy.
