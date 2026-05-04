# elevator-ffi for GameMaker Studio 2

Native-extension bundle for consuming [`elevator-ffi`](../../crates/elevator-ffi)
from GameMaker Studio 2 (LTS 2024+, x64 desktop targets only — Windows,
macOS, Ubuntu).

## What's in here

```
extension/elevator_ffi/
├── elevator_ffi.yy                  GMS extension manifest (placeholder — see below)
├── elevator_ffi.gml                 Hand-written: handle helpers + struct decoders
├── elevator_ffi_generated.gml       Auto-generated: external_define for every FFI fn
└── binaries/
    └── .gitkeep                     Populated at release time (or locally — see below)
```

`elevator_ffi_generated.gml` is regenerated from
[`bindings.toml`](../../bindings.toml) (the `gms` column) and the
cbindgen-produced
[`elevator_ffi.h`](../../crates/elevator-ffi/include/elevator_ffi.h)
by [`scripts/gen-gms-bindings.py`](../../scripts/gen-gms-bindings.py).

## How GameMaker reaches the cdylib

GameMaker's `external_define` only supports `ty_real` (double) and
`ty_string` (UTF-8 char\*) as argument and return types. Strategies
the bundle uses to bridge the gap:

| Need | Strategy |
|---|---|
| Opaque handles (`EvSim *`) | Round-trip through `ty_real`. User-space x64 addresses fit in 47 bits, well inside a double's 53-bit mantissa. |
| Out-param scalars (`*mut u32`, `*mut u64`, `*mut f64`) | Allocate a small GameMaker `buffer`, pass `buffer_get_address()` as a `ty_real`, read with `buffer_peek` after the call. |
| Out-param structs (`*mut EvFrame`, `*mut EvEvent[]`, `*mut EvLogMessage[]`) | Same buffer pattern; decode field-by-field with `buffer_peek`. The hand-written `elevator_ffi.gml` provides decoders for the complex shapes; extend following the documented byte-offset constants. |
| Function pointers (`ev_set_log_callback`) | **Unreachable from GML.** Use the polling alternative `ev_drain_log_messages` instead. |

`extension/elevator_ffi/elevator_ffi_generated.gml` does the
boilerplate `external_define` + `external_call` round-trip for every
FFI function the manifest marks as exported (`gms = "..."` in
`bindings.toml`). Hand-written helpers in `elevator_ffi.gml` cover
the cases that need GML-side decoding.

## Installing (end users)

Download `elevator_ffi_gms2-<version>.zip` from the
[Releases page](https://github.com/andymai/elevator-core/releases?q=elevator-ffi)
— the [release-please packaging
job](../../.github/workflows/release-please.yml) attaches it to every
`elevator-ffi-v*` tag with all three platform binaries plus the dual
MIT/Apache LICENSE files pre-staged. Extract the zip and follow the
manual import recipe at the bottom of this README.

## Local testing (developers)

To test against a local build of the cdylib instead of waiting for a
tagged release:

```bash
# 1. Build the cdylib
cargo build -p elevator-ffi --release

# 2. Copy the produced artefact into the extension folder.
#    (cargo writes to a workspace-local target/release/ unless you
#    set CARGO_TARGET_DIR; adjust the source path accordingly.)
cp target/release/libelevator_ffi.so \
   examples/gms2-extension/extension/elevator_ffi/binaries/    # Linux
# or libelevator_ffi.dylib on macOS, elevator_ffi.dll on Windows

# 3. Open a fresh GameMaker Studio 2 project and import the extension
#    folder. From Asset Browser → right-click → Add → Existing Asset →
#    pick examples/gms2-extension/extension/elevator_ffi/.
```

## Smoke testing without GameMaker

The
[`examples/gms2-harness`](../gms2-harness) C program exercises the
FFI under the same type constraints GML imposes (pointer-as-double,
buffer out-params, no callbacks). Build and run:

```bash
cargo build -p elevator-ffi --release
bash examples/gms2-harness/build.sh
```

CI runs this on Linux (`.github/workflows/ci.yml` `ffi-harness`
matrix). The harness includes static asserts on every
`EvLogMessage` field offset, so a future cbindgen reorder fails CI
*here* before the GML decoder in `elevator_ffi.gml` breaks.

## Supported targets

- **Windows x64 desktop**: `elevator_ffi.dll`
- **macOS arm64 desktop**: `libelevator_ffi.dylib` (Intel Mac is a
  follow-up — see PR 3's risk note)
- **Ubuntu x64 desktop**: `libelevator_ffi.so`
- **HTML5, mobile, consoles**: not supported. HTML5 needs
  [`elevator-wasm`](../../crates/elevator-wasm) with a different
  glue layer; mobile/console builds need entirely different native
  build paths.

x64-only since GameMaker Studio v2022.8 dropped 32-bit Windows. The
pointer-as-double round-trip relies on this — file an issue if you
need a different target.

## Manifest (`elevator_ffi.yy`) — work in progress

The `.yy` file in this folder is a structural placeholder. GameMaker
Studio 2's extension manifest schema evolves across LTS versions, so
a follow-up PR adds verified `.yy` + `.yymps` packaging once the
format has been exercised against a working extension import.

Until then, treat the bundle as a folder of GML scripts + binaries
that you manually wire up by:

1. Creating a new extension in your GMS project (Asset Browser →
   right-click → Create → Extension).
2. Setting the extension's name to `elevator_ffi`.
3. Adding the platform-appropriate binary as a Proxy File.
4. Adding `elevator_ffi.gml` and `elevator_ffi_generated.gml` as
   extension scripts.
5. Setting the extension's calling convention to `dll_cdecl` (the
   default; on x64 this is ABI-equivalent to `dll_stdcall`).

Manual GMS verification recipe (post-import):

```gml
// In any object's Create event:
show_debug_message("ABI version: " + string(ev_abi_version()));
// expect: "ABI version: 5"

var _sim = ev_sim_create("path/to/your/config.ron");
for (var i = 0; i < 100; i++) ev_sim_step(_sim);
ev_sim_destroy(_sim);
```

If `ev_abi_version()` returns 0 or the call hangs, the extension
isn't loading the right binary — check the Proxy File mapping in the
extension's properties panel.

## Regenerating the bindings

After any change to the FFI surface (new `pub extern "C"` in
`crates/elevator-ffi/src/lib.rs`, ABI bump, or `gms` column update in
`bindings.toml`), regenerate:

```bash
python3 scripts/gen-gms-bindings.py
```

The generated `elevator_ffi_generated.gml` is committed so users
don't need Python to import the extension — but contributors must
regenerate after any FFI change.
