# Integration Gallery

`elevator-core` ships several supporting crates that don't surface a runtime API of their own — they exist to keep the binding crates honest, to drive cross-host code generation, or to validate snapshot determinism. This page is the narrative index for those crates; for hands-on integration with a host language see [Using the Bindings](using-the-bindings.md).

## elevator-tui

A terminal viewer with pause / step / strategy-swap controls, doubling as a headless smoke runner. The TUI never mutates state outside the simulation it owns, so it is also the canonical example of a "read-only host" — its column in `bindings.toml` shows the inverse pattern from a write-heavy host like GMS.

```bash
cargo run -p elevator-tui                # interactive viewer
cargo run -p elevator-tui -- --headless  # smoke run (CI uses this)
```

See [TUI Debugger](tui-debugger.md) for the full key map and panel layout.

## elevator-contract

A cross-host snapshot-determinism harness. It runs every scenario in `assets/contract-corpus/` against the elevator-core API directly and compares the resulting `Simulation::snapshot_checksum()` against the golden value committed in `assets/contract-corpus/golden.txt`. The wasm binding runs the same scenarios through `wasm-bindgen` in a headless browser via `wasm-pack test`. Both hosts share `golden.txt` as the reference; either disagreeing means a host regression.

```bash
cargo run -p elevator-contract                # core-side run
wasm-pack test --headless --firefox crates/elevator-wasm  # wasm-side run
```

See [Snapshots and Determinism](snapshots-determinism.md) for the determinism contract these checksums encode.

## elevator-layout-derive

A `proc-macro` crate exposing `#[derive(MultiHostLayout)]`. Annotating a `#[repr(C)]` struct registers its field layout with `elevator-layout-runtime` so the codegen step can emit matching record types in the host languages. This is the load-bearing piece that lets the C# / GML / harness code stay in sync with the Rust struct without hand-mirroring.

The crate exposes only the macro; it has no runtime. Adding a new exported `#[repr(C)]` shape means slapping `#[derive(MultiHostLayout)]` on it and rebuilding — the codegen pickup is automatic.

## elevator-layout-runtime

The registry of layout metadata that `elevator-layout-derive` writes into and `elevator-layout-codegen` reads from. This crate exists purely to break the dependency cycle: the derive macro and the codegen tool are both compile-time, but the registered metadata has to outlive a single compilation unit. The runtime crate is what makes that possible.

Consumers should treat this crate as an implementation detail; nothing in its API is meant to be called directly.

## elevator-layout-codegen

A binary that reads `elevator-layout-runtime` and emits matching record types to:

- `crates/elevator-ffi/src/csharp.rs` (C# bindings)
- the GameMaker GML wrapper scripts
- the `MultiHostLayout`-driven harness asserts in the FFI test suite

```bash
cargo run -p elevator-layout-codegen
```

CI runs this in dry-run mode and fails if the output drifts from what's checked in, so a Rust-side struct edit can't ship without the host bindings being regenerated in the same PR.

## See also

- [Binding Coverage Manifest](binding-coverage.md) — `bindings.toml` policy.
- [Using the Bindings](using-the-bindings.md) — host-facing usage docs for wasm / FFI / gdext / GameMaker.
- [Stability and Versioning](stability.md) — how API breaks are signalled across these crates.

## Next steps

- For host-language integration with a runtime API surface, head to
  [Using the Bindings](using-the-bindings.md) — the gallery covers the
  *supporting* crates rather than the binding crates themselves.
- For the determinism contract that `elevator-contract` checksums
  enforce, read [Snapshots and Determinism](snapshots-determinism.md).
