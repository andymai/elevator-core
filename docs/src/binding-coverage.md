# Binding Coverage Manifest

This page documents `bindings.toml` — the workspace-root manifest that
records, for every public method on `impl Simulation`, whether and how
each binding crate (FFI, wasm, gdext, Bevy, TUI, GMS) exposes it. CI
enforces the file via `scripts/check-bindings.sh`; an unlisted method or
a stale entry fails the workspace build.

## Why it exists

The core crate is the source of truth, and several host crates wrap it.
Without a single contract, "fully supported in language X" drifts
silently — a new core method ships, no binding picks it up, and consumers
have to discover the gap by trying it. `bindings.toml` makes that
decision explicit: every `pub fn` on `Simulation` either has a binding
under each host or has a recorded reason for not having one.

It is intentionally a *coverage* manifest, not a generator. Bindings are
still hand-written so each host can shape its idiomatic surface; the
manifest exists only to prevent silent drift.

For *non-method* host concerns — error marshalling, log-drain
semantics, ABI / wire version, snapshot field-set parity — see
[Host Binding Parity](host-binding-parity.md), the cross-host
contract that complements this manifest.

## Taxonomy

Each entry is keyed by Rust method name and lists one status per host
column (`wasm`, `ffi`, `tui`, `gms`, `gdext`, `bevy`). Three status
shapes are accepted:

| Status            | Meaning                                                     |
|-------------------|-------------------------------------------------------------|
| `<exported-name>` | Bound. Value is the host-facing name (e.g. `stepMany`, `ev_sim_step`, the GDScript callable, the TUI panel that uses it). |
| `skip:<reason>`   | Intentionally not bound. The reason is mandatory and must explain *why* — lifetimes, internal detail, covered by a different binding, read-only viewer, etc. |
| `todo:<phase>`    | Planned for a named phase. CI accepts it (warning, not error); once that phase ships the entry flips to either an exported name or a skip. |

Two phase markers are currently in use:

- `plugin-layer` — used only in the `bevy` column. Until a Bevy plugin
  layer ships, every non-`internal` method's `bevy` slot carries this
  marker. It is the *expected* state, not an actionable gap.
- `future-binding` — used only in the `gdext` column. These are the
  real "pick this up next" queue entries.

The check script breaks these out so `future-binding` work doesn't get
lost in `plugin-layer` noise.

## Categories

Every entry also carries a `category` field, which groups related
methods so the manifest stays scannable as it grows. Definitions live in
`[categories]` at the top of `bindings.toml`. The most useful ones to
recognize when adding new methods:

- `lifecycle` — construction, ticking, run-loops.
- `dispatch` — strategy swap, pinning, ETA queries.
- `riders`, `routes`, `topology`, `buttons` — domain mutations.
- `introspection` — read-only world queries.
- `parameters` — runtime tuning of speed/capacity/door timings.
- `events`, `metrics`, `hooks`, `tagging` — observability.
- `internal` — methods that return `&World` / `&mut World` or other
  internal slices and should never be bound.

Choose the category that matches *what the method does for the host*,
not the file it lives in.

## Workflow

### Adding a new `Simulation` method

1. Land the implementation in `crates/elevator-core/src/sim.rs` (or
   `src/sim/*.rs`).
2. In the same PR, add a new `[[methods]]` entry to `bindings.toml`
   alphabetized within its category section.
3. Fill every host column. The default for a new method is usually
   `todo:future-binding` (gdext) and `todo:plugin-layer` (bevy); for
   `wasm`/`ffi`/`gms` you must either bind it now or write a `skip:`
   reason.
4. Run `scripts/check-bindings.sh` locally — it's also part of the
   pre-commit hook.

### Renaming a method

The manifest is keyed on the Rust method name. Renaming is a two-line
edit: update the `name` field and (if the rename changes the host
binding name) update each host's exported name. CI catches the
rename-without-update case as a `STALE` failure.

### Removing a method

Delete both the implementation and the manifest entry. CI fails on
`STALE` entries (manifest references a method that no longer exists),
which is the prompt to clean up.

### Choosing `skip` vs `todo`

- Use `skip:<reason>` when the method *cannot* be bound under that host
  — borrows internal state, exposes lifetimes a host can't model, or is
  superseded by a different exported surface (e.g. wasm prefers a
  flattened DTO). The reason must read clearly enough that a future
  reader doesn't think it's a forgotten gap.
- Use `todo:<phase>` when binding is *deferred*, not refused. The phase
  string is what tells reviewers when to expect coverage.

If the answer is "we just haven't decided", that's a `todo:` until the
decision is made.

## Worked example

A new method `Simulation::set_floor_pressure(&mut self, stop: StopId, n: u32)`
ships in `sim.rs`. The corresponding manifest entry:

```toml
[[methods]]
name     = "set_floor_pressure"
category = "parameters"
wasm     = "setFloorPressure"
ffi      = "ev_sim_set_floor_pressure"
tui      = "skip:read-only viewer"
gms      = "ev_sim_set_floor_pressure"
gdext    = "todo:future-binding"
bevy     = "todo:plugin-layer"
```

Reading left-to-right: bound under wasm, FFI, and GameMaker; skipped in
the TUI because the TUI is a read-only viewer; queued for gdext under
the standard future-binding phase; queued for bevy under the standard
plugin-layer phase.

## Related

- `bindings.toml` — the manifest itself, with the current header comment
  kept in sync with this page.
- `scripts/check-bindings.sh` — the CI gate.
- [Using the Bindings](using-the-bindings.md) — host-facing usage docs.

## Next steps

- Read [Using the Bindings](using-the-bindings.md) for hands-on usage of
  each host crate.
- Browse `bindings.toml` to see the current state of every method × host
  pair, and use the `future-binding` filter to find work to pick up.
