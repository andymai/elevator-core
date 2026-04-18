# Stability and Versioning

`elevator-core` classifies every public item as **stable**, **experimental**, or **internal**, and the crate makes a specific promise about how quickly each kind can break. This chapter summarises the rules; the repo's [`STABILITY.md`](https://github.com/andymai/elevator-core/blob/main/STABILITY.md) is the authoritative source.

## Three status levels

**Stable.** Breaking changes ship only in planned major versions. Majors that touch a stable API are announced in a GitHub issue at least 60 days before the release, with a CHANGELOG migration note. `#[deprecated]` precedes removal by at least one major.

**Experimental.** The shape is still being discovered. May break in any minor version with no deprecation cycle. The API is real — fully implemented and tested — but the contract can shift as the design matures.

**Internal.** `pub(crate)` or `#[doc(hidden)]`. Not supported for use outside the crate.

## Where to find the current classification

The module table at the top of the [`elevator-core` crate docs](https://docs.rs/elevator-core) has a Stability column for every row and is the canonical list. `STABILITY.md` lists the per-item day-one classification — check it before taking a dependency on a specific module.

## Depending on experimental APIs

Pin to an exact minor version:

```toml
# Use this if you touch hooks, topology, traffic, extensions, or any
# other experimental area:
elevator-core = "=15.2"
```

When you bump the minor, expect a short migration task. The CHANGELOG will call out what changed.

## Cadence commitment

The stable surface has a bounded break rate; planned majors bundle changes together. Experimental surface has no such cap. The commitment applies to releases after v15.1.0 — see [`STABILITY.md`](https://github.com/andymai/elevator-core/blob/main/STABILITY.md) for the specific bound and retroactivity note.

## Next steps

- [`STABILITY.md`](https://github.com/andymai/elevator-core/blob/main/STABILITY.md) — full policy text, deprecation rules, and per-item day-one classification.
- [Introduction](introduction.md) — what the library does and doesn't do.
- [Testing Your Simulation](testing.md) — the invariants you can rely on under the stability policy.
