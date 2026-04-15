# elevator-ffi

Stable C ABI over [`elevator-core`](../elevator-core) for native interop —
designed for loading the simulation into Unity (P/Invoke) and other non-Rust
hosts, plus a smoke-test C# console harness.

The crate builds as `cdylib`, `staticlib`, and `rlib`. A C header is generated
by `build.rs` via [cbindgen](https://github.com/mozilla/cbindgen) into
[`include/elevator_ffi.h`](include/elevator_ffi.h) and committed to the repo.

## ABI version

```c
uint32_t v = ev_abi_version();  // must equal EV_ABI_VERSION from the header
```

Always check this at startup. Any breaking layout change bumps the constant.

## Lifecycle

```c
EvSim *sim = ev_sim_create("assets/config/default.ron");
if (!sim) { fprintf(stderr, "%s\n", ev_last_error()); return 1; }

for (int i = 0; i < 1000; ++i) ev_sim_step(sim);

EvFrame frame;
ev_sim_frame(sim, &frame);
// frame.elevators / .stops / .riders are borrowed, valid until the next
// ev_sim_frame call on this handle. Do not free them.

ev_sim_destroy(sim);
```

## Snapshot ownership

`ev_sim_frame` populates an `EvFrame` whose array pointers reference an
internal buffer owned by the handle. **Those pointers are valid only until the
next call to `ev_sim_frame` on the same handle.** Never retain them across
calls; never `free()` them.

Stop-name slices (`EvStopView.name_ptr` / `name_len`) follow the same rule —
they are UTF-8 bytes borrowed from the same buffer and are **not**
null-terminated.

## Thread safety

Each `EvSim *` is single-threaded. Serialize all calls on a given handle.
Distinct handles can be driven from distinct threads. The global log callback
installed via `ev_set_log_callback` is protected by an internal mutex.

## Error model

Every entrypoint returns an `EvStatus` (or null for constructors). On a
non-`Ok` status, a thread-local human-readable description is available via
`ev_last_error()`, valid until the next FFI call on the same thread. Panics
in Rust are caught at the boundary and reported as `EvStatus::Panic`.

## Consuming from C#

```csharp
using System.Runtime.InteropServices;

public static class Ev {
    [DllImport("elevator_ffi")] public static extern uint ev_abi_version();
    [DllImport("elevator_ffi")] public static extern IntPtr ev_sim_create(string path);
    [DllImport("elevator_ffi")] public static extern void ev_sim_destroy(IntPtr sim);
    [DllImport("elevator_ffi")] public static extern int ev_sim_step(IntPtr sim);
    // ... see include/elevator_ffi.h for the full surface
}
```

For Unity, drop the compiled `libelevator_ffi.so` / `.dylib` / `.dll` into
`Assets/Plugins/` and call through `DllImport("elevator_ffi")` as above.

## Building

```bash
cargo build -p elevator-ffi --release
# artefacts in target/release/:
#   libelevator_ffi.so / .dylib / .dll   (cdylib — for P/Invoke)
#   libelevator_ffi.a  / elevator_ffi.lib (staticlib — for embedded linking)
```

The header is regenerated on every build via `build.rs` and checked in.
