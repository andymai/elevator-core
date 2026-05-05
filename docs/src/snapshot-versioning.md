# Snapshot Versioning

This page formalises the contract for two distinct version markers that
ride along with every snapshot: a `schema_version: u32` and a crate
semver string. They mean different things, are checked through different
paths, and bump on different signals. This page is the canonical
reference; the constants in `crates/elevator-core/src/snapshot.rs`
defer to it.

## What gets versioned

Two markers travel with a snapshot:

- **`schema_version: u32`** lives on `WorldSnapshot` itself. It is
  serialized into RON, JSON, and any other custom serde format. The
  current value is `SNAPSHOT_SCHEMA_VERSION` in `snapshot.rs`.
- **Crate semver string** (`env!("CARGO_PKG_VERSION")`) is wrapped
  around the payload by `SnapshotEnvelope` and serialized only when
  using the bytes path (`Simulation::snapshot_bytes` /
  `Simulation::restore_bytes` — postcard-encoded).

The two paths therefore have asymmetric guarantees:

| Path | `schema_version` checked | Crate version checked |
|------|--------------------------|-----------------------|
| `WorldSnapshot::restore` (RON / JSON / arbitrary serde) | yes | no — the format has no envelope |
| `Simulation::restore_bytes` (postcard envelope) | yes (transitively, via inner `restore`) | yes |

Both reject mismatches with [`SimError::SnapshotVersion`].

## When to bump `schema_version`

Bump the `u32` when the snapshot layout changes in a way that an older
binary *should not* silently load. The classic trap, fixed in #295, is
serde's `#[serde(default)]`: an old snapshot loaded by a new binary
quietly fills missing fields with their defaults, masking the fact that
the data was written by a different schema. The version field exists to
convert that silent acceptance into an explicit `SnapshotVersion` error.

Bump triggers:

- A field changes meaning (same name, different semantics).
- A field is removed and the new code can't reconstruct it from what's
  left.
- The shape of an existing variant changes (renamed enum variants,
  re-ordered tuple fields, anything that breaks structural compat).
- A new field is added whose absence would *silently* miscompute on
  restore — for example, a counter where "missing = 0" is wrong.

Do **not** bump for:

- Purely additive fields whose serde default is genuinely correct on
  legacy snapshots (the field is a new aggregate that starts empty, a
  cooldown map that's allowed to be empty, etc.). Add the field with
  `#[serde(default)]` and document why "missing = default" is safe in
  the field's doc comment. Pre-versioning examples include
  `arrival_log_retention`, `destination_log`, and `reposition_cooldowns`
  — each carries a doc comment explaining the legacy behaviour.

When you bump, update the constant in one place
(`SNAPSHOT_SCHEMA_VERSION`) and add a regression test that mounts a
snapshot from the previous version and asserts `SimError::SnapshotVersion`.
The existing snapshot tests in
`crates/elevator-core/src/tests/snapshot_tests.rs` cover this pattern.

## When the crate version is the right gate

The crate semver string in the bytes envelope is a stricter check: it
rejects *any* version mismatch, even patch bumps that didn't touch the
schema. That's intentional for the bytes path — bincode/postcard
encodings are sensitive to layout changes the schema version doesn't
catch (e.g. a pure ordering change in a struct's field declaration
re-encodes differently on the wire). Tying it to the crate version
means "this exact build produced this exact bytes layout, no compat
layer".

If you need cross-version bytes compatibility, that is an explicit
feature request — and it will require either a stable serializer (we
don't currently provide one) or migrating to a self-describing format
like RON for the cross-build hop, then re-encoding to bytes locally.

## Migration policy

The current policy is **strict-reject only**: snapshots from a different
`schema_version` (RON/JSON) or a different crate version (bytes) error
out. There is no migration layer.

A future migration path, if added, would live on `WorldSnapshot::restore`
and dispatch on `self.version`:

1. The schema version stays a single `u32` constant.
2. Each bump from `N` to `N+1` lands with an in-tree `migrate_v{N}_to_v{N+1}`
   function that runs *before* the strict version check and rewrites
   the deserialized snapshot in place.
3. Test fixtures from version `N` are kept under
   `crates/elevator-core/tests/fixtures/snapshots/` and round-tripped
   through `restore` to prove the migration chain.

Until migration support exists, the contract is: **callers that need to
load older snapshots must keep the old binary around and re-snapshot
under the new one**. For RON/JSON consumers this is sometimes a manual
fixup — for bytes consumers it is unavoidable.

## Quick reference

- Bump `schema_version` for any *layout* or *semantic* change that
  isn't trivially additive-with-correct-default.
- The crate version covers the bytes-envelope path; you do not bump it
  manually for snapshots — `cargo` does it on every release.
- Both checks return [`SimError::SnapshotVersion`] with `saved` and
  `current` strings the host can surface to the user.
- New additive field with safe default → just add it, document the
  default in the field's doc comment, no version bump.

## Next steps

- Read [Snapshots and Determinism](snapshots-determinism.md) for usage
  patterns and the determinism contract on the *encoded* bytes.
- The constants and types referenced here live in
  `crates/elevator-core/src/snapshot.rs`; the matching error variant is
  `SimError::SnapshotVersion` in
  `crates/elevator-core/src/error.rs`.

[`SimError::SnapshotVersion`]: https://docs.rs/elevator-core/latest/elevator_core/error/enum.SimError.html#variant.SnapshotVersion
