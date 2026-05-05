# Config Versioning

`SimConfig` (the RON format under `assets/config/`) carries an explicit
`schema_version: u32` field that the core validates at construction
time. This page is the canonical reference for what the version means,
when to bump it, and how to migrate older configs.

## Why explicit versioning

Without an explicit version, a legacy `assets/config/*.ron` loaded by a
newer build would silently fall through `serde`'s `default` paths for
any newly-added fields and reject any removed-or-renamed fields with a
generic deserialization error. Both modes mask intent: the operator
sees a config that "looks loaded" but is actually running a different
shape than they wrote.

The explicit `schema_version` makes the contract observable:

- A *legacy* config (no `schema_version` field) deserializes to
  `schema_version: 0` via `#[serde(default)]`.
- `Simulation::new` rejects `schema_version: 0` with an `InvalidConfig`
  error pointing at this page, so the operator audits the field
  defaults rather than running a silent migration.
- A config with `schema_version > CURRENT_CONFIG_SCHEMA_VERSION` is
  rejected as forward-incompatible; the operator must upgrade
  `elevator-core` or downgrade the config.

## Asymmetry with snapshot versioning

Snapshots (see [Snapshot Versioning](snapshot-versioning.md)) carry
*two* version markers — a `u32` schema number and a crate-version
string in the bytes envelope. Configs only need the `u32`, because:

- Configs are human-edited RON, so the `crate-version` envelope (which
  pins encoder details for postcard) has no equivalent — RON is
  text-stable across crate versions.
- The set of compatible mismatches is much smaller: there is no
  "savefile from a different patch release" case. Either the schema
  matches or it does not.

## Bump triggers

Bump `CURRENT_CONFIG_SCHEMA_VERSION` (in `crates/elevator-core/src/config.rs`)
when *any* of these change in a way that legacy `assets/config/*.ron`
files would silently mis-deserialize:

- A field is removed or renamed.
- A field's type changes (`u32` → `Option<u32>`, `Vec<T>` → `BTreeMap<K, T>`).
- A field's default value changes in a way that materially alters
  behaviour (e.g. flipping a feature flag's default, changing a
  capacity threshold).
- The set of valid enum variants expands and the additions are not
  marked `#[non_exhaustive]`-safe (the legacy config would silently
  pick the deserialization fallback on the new variants).

Do **not** bump for:

- Adding a new optional field with `#[serde(default)]` whose default
  matches existing behaviour. Legacy configs continue to deserialize
  correctly; bumping would force operators to audit an unchanged shape.
- Pure refactors that reorder fields, rename internal types, or
  reorganize modules without changing the RON shape.

## Migration playbook

When bumping the version, in the same PR:

1. Update `CURRENT_CONFIG_SCHEMA_VERSION` and the doc comment on the
   constant naming the change.
2. Update every `assets/config/*.ron` to declare the new
   `schema_version` value.
3. Add a migration entry to this page (a "v1 → v2" subsection) listing
   every changed field and the manual edit operators must apply.
4. If the change is mechanical, ship a one-shot upgrade tool
   (`elevator-config-upgrade --from 1 --to 2 < old.ron > new.ron`)
   alongside the doc.

The migration entries are kept in this doc so an operator carrying a
pinned config across multiple core upgrades has a single canonical
source for the diff. Migration code does not live in `core` itself —
the validator is intentionally strict about version mismatches; the
upgrade lives outside the read path.

## Migrations

Versions issued so far. Each section below lists the field changes the
operator must apply when moving a config from the previous version to
the current one.

### v0 → v1 (initial versioning)

There is no shape change; v1 is the first explicit version marker. To
adopt:

- Open the RON file and add `schema_version: 1,` as the first field
  inside the top-level `SimConfig(...)` block.
- Run `cargo run -- path/to/config.ron` (or `Simulation::new` from
  Rust) to confirm validation passes.

After v1, every v(N) → v(N+1) transition will have a real shape diff
and an entry here.

## Related

- [`crates/elevator-core/src/config.rs`](https://docs.rs/elevator-core/latest/elevator_core/config/index.html)
  — the `SimConfig` struct definition and `CURRENT_CONFIG_SCHEMA_VERSION`.
- [Snapshot Versioning](snapshot-versioning.md) — the parallel policy
  for `WorldSnapshot` bytes.
- `Simulation::new` — the validator that surfaces version mismatches
  as `SimError::InvalidConfig { field: "schema_version", reason: ... }`.

## Next steps

- For new configs, copy `assets/config/default.ron` and adjust — it
  always pins to the current schema version.
- For older configs, use the v0 → v1 entry above as a template; future
  bumps will add new entries describing each shape change.
