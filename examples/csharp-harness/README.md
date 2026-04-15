# C# harness for elevator-ffi

Smoke test that proves the `elevator-ffi` C ABI loads and works end-to-end
under .NET via `[DllImport]`. This is the same path Unity will use.

## Run

From the repo root:

```bash
just harness-smoke
```

This builds the FFI cdylib, stages it under
`examples/csharp-harness/runtimes/linux-x64/native/`, builds the C# harness,
and runs it against `assets/config/default.ron`.

## What it does

1. Checks `ev_abi_version() == 1`.
2. Calls `ev_sim_create(path)`.
3. Steps the simulation 600 times.
4. Calls `ev_sim_frame(...)` and prints the metrics view.
5. Asserts `current_tick > 0` and the frame contains elevators and stops.

Exits non-zero on any failure.

## Why it exists

Unity has its own load cycle, asset pipeline, and editor quirks. This
harness lets us catch FFI ABI breakage in CI without spinning up the Unity
editor.
