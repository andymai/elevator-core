#!/usr/bin/env python3
"""Generate the GameMaker Studio 2 GML wrapper file for elevator-ffi.

Inputs:
  - bindings.toml at the repo root (read for the `gms` column on every
    `[[methods]]` entry derived from a public Simulation method).
  - crates/elevator-ffi/include/elevator_ffi.h (cbindgen output, read
    for function signatures so we know argument count + which arg is a
    string vs scalar).

Output:
  - examples/gms2-extension/extension/elevator_ffi/elevator_ffi_generated.gml

Why two inputs: bindings.toml is the authoritative coverage manifest
for Simulation methods, but the FFI surface also includes "free"
helpers (`ev_abi_version`, `ev_last_error`, `ev_drain_log_messages`,
`ev_pending_log_message_count`, `ev_set_log_callback`) that aren't
tied to any Simulation method and so don't appear in the manifest.
The allowlist in `FREE_HELPERS` below tracks those — keep it in sync
with the relevant `pub extern "C"` blocks in
crates/elevator-ffi/src/lib.rs.

Run from the repo root:
    python3 scripts/gen-gms-bindings.py

Determinism: output is sorted by function name so re-runs produce
byte-identical files. Commit the generated GML so users cloning the
repo don't need Python to import the extension.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BINDINGS = REPO_ROOT / "bindings.toml"
HEADER = REPO_ROOT / "crates" / "elevator-ffi" / "include" / "elevator_ffi.h"
FFI_CARGO_TOML = REPO_ROOT / "crates" / "elevator-ffi" / "Cargo.toml"
EXT_DIR = (
    REPO_ROOT / "examples" / "gms2-extension" / "extension" / "elevator_ffi"
)
OUT = EXT_DIR / "elevator_ffi_generated.gml"
YY_OUT = EXT_DIR / "elevator_ffi.yy"


def read_ffi_crate_version() -> str:
    """Pull the current `elevator-ffi` crate version off Cargo.toml.

    GMS uses the manifest's `extensionVersion` to decide whether a
    re-imported extension needs refreshing in an existing project,
    so it must track the crate version on every release-please bump
    — otherwise consumers carrying a stale import won't see ABI
    breaks (which release-please bumps the major on for elevator-ffi).
    """
    for line in FFI_CARGO_TOML.read_text().splitlines():
        m = re.match(r'^version\s*=\s*"([^"]+)"', line)
        if m:
            return m.group(1)
    raise RuntimeError(
        f"could not find `version = \"...\"` in {FFI_CARGO_TOML}"
    )

# FFI helpers that aren't tied to a Simulation method and so don't
# appear in bindings.toml. Each entry is (name, gms_status). Status
# follows the same rules as bindings.toml: an exported name to expose,
# or `skip:<reason>`. Keep in sync with the corresponding
# `pub extern "C"` blocks in crates/elevator-ffi/src/lib.rs.
#
# Note: ev_sim_create IS in bindings.toml (under Simulation::new with
# gms = "ev_sim_create"), so it's picked up via parse_bindings — don't
# duplicate it here. ev_sim_destroy stays because Simulation::drop
# isn't tracked as a Simulation method in the manifest. The dedup
# pass in main() catches any accidental overlap defensively.
FREE_HELPERS: list[tuple[str, str]] = [
    ("ev_abi_version", "ev_abi_version"),
    ("ev_last_error", "ev_last_error"),
    ("ev_sim_destroy", "ev_sim_destroy"),
    ("ev_set_log_callback", "skip:no_function_pointers — GML cannot pass C function pointers"),
    ("ev_drain_log_messages", "ev_drain_log_messages"),
    ("ev_pending_log_message_count", "ev_pending_log_message_count"),
]


def parse_bindings() -> list[tuple[str, str]]:
    """Return [(method_name, gms_status), ...] for every [[methods]] block."""
    text = BINDINGS.read_text()
    blocks = re.split(r"\n\[\[methods\]\]\n", text)
    out: list[tuple[str, str]] = []
    for block in blocks[1:]:
        name_m = re.search(r'^name\s*=\s*"([^"]+)"', block, re.MULTILINE)
        gms_m = re.search(r'^gms\s*=\s*"([^"]*)"', block, re.MULTILINE)
        if name_m and gms_m:
            out.append((name_m.group(1), gms_m.group(1)))
    return out


def parse_header_signatures() -> dict[str, dict]:
    """Return {fn_name: {"return": "real"|"string", "args": ["real"|"string", ...]}}.

    The header is cbindgen output: each declaration starts with a
    return-type keyword followed by the function name and `(`,
    possibly continues across multiple lines, and ends with `);`.
    """
    text = HEADER.read_text()
    # Strip block comments and line comments — they can contain
    # parentheses that confuse the regex.
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = re.sub(r"//.*", "", text)

    decls: dict[str, dict] = {}
    # Match a return type, function name, and the parenthesised arg
    # list (across newlines), terminated by `);`. The space between
    # return type and name is `\s*` (not `\s+`) because cbindgen emits
    # pointer returns like `const char *name(...)` and `struct EvSim
    # *name(...)` with no whitespace between `*` and the name.
    pattern = re.compile(
        r"(?P<ret>(?:enum\s+EvStatus|const\s+char\s*\*|struct\s+EvSim\s*\*"
        r"|uint32_t|uint64_t|int8_t|int32_t|int64_t|double|bool|void))\s*"
        r"(?P<name>ev_[a-zA-Z0-9_]+)\s*"
        r"\((?P<args>[^)]*)\)\s*;",
        re.DOTALL,
    )
    for m in pattern.finditer(text):
        name = m.group("name")
        ret = m.group("ret").strip()
        raw_args = m.group("args").strip()
        args: list[str] = []
        if raw_args and raw_args != "void":
            for arg in raw_args.split(","):
                arg = arg.strip()
                # Strip the parameter name; keep just the type.
                args.append(classify_arg(arg))
        decls[name] = {
            "return": classify_return(ret),
            "args": args,
        }
    return decls


def classify_arg(arg: str) -> str:
    """Return 'string' for char*-flavoured args, 'real' for everything else."""
    # `const char *path` or `char *path` → string
    if re.search(r"\bchar\s*\*", arg) and "void" not in arg:
        return "string"
    # `struct Option_EvLogFn` (function-pointer wrapper) — flagged at
    # caller; classify_arg returning 'real' would be misleading. The
    # gen function refuses to emit external_define for callbacks, so
    # we surface this here too.
    if "EvLogFn" in arg or "Option_" in arg:
        return "callback"
    return "real"


def classify_return(ret: str) -> str:
    """Return one of:

    - ``"string"``  — ``char *`` return; bind as ``ty_string``.
    - ``"double"``  — native ``double`` return; bind as ``ty_real``, no shim.
    - ``"void"``    — no return value; bind as ``ty_real`` against the
      original symbol. GMS expects a return type for every
      ``external_define``; ``ty_real`` is the safe placeholder since
      the caller discards the result and the integer-return-register
      hazard does not apply (nothing to read).
    - ``"shim"``    — integer / enum / bool / pointer return; bind as
      ``ty_real`` and target the ``_gms`` companion symbol so the value
      lands in the float return register on every platform (issue #876).
    """
    if "char" in ret:
        return "string"
    if ret.strip() == "double":
        return "double"
    if ret.strip() == "void":
        return "void"
    return "shim"


def emit_define(fn: str, sig: dict) -> str:
    """Emit a single `external_define` block + GML wrapper function.

    For "shim" returns, `external_define` targets the `<fn>_gms`
    companion symbol so the value lands in the float return register
    (`xmm0` / `d0`) on every platform — see crates/elevator-ffi/src/gms_shims.rs.
    The GML function name itself stays unchanged so call sites don't move.
    """
    return_kind = sig["return"]
    return_type = "ty_string" if return_kind == "string" else "ty_real"
    # External C symbol targeted by external_define. Only `shim`
    # returns route through the `_gms` companion; native double,
    # string, and void returns call the original symbol directly
    # (void-returning fns like `ev_sim_destroy` have no `_gms`
    # companion — see the void-classification rationale in
    # classify_return).
    c_symbol = f"{fn}_gms" if return_kind == "shim" else fn
    arg_count = len(sig["args"])
    arg_types = ", ".join(
        "ty_string" if a == "string" else "ty_real" for a in sig["args"]
    )
    arg_names = ", ".join(f"a{i}" for i in range(arg_count))
    call_args = (", " + arg_names) if arg_count else ""
    arg_types_clause = (", " + arg_types) if arg_count else ""

    lines = [
        f"// {fn} — auto-generated wrapper.",
        f"global._{fn}_handle = external_define(",
        f'    "elevator_ffi", "{c_symbol}", dll_cdecl, {return_type}, {arg_count}{arg_types_clause}',
        ");",
        f"function {fn}({arg_names}) {{",
        f"    return external_call(global._{fn}_handle{call_args});",
        "}",
        "",
    ]
    return "\n".join(lines)


def emit_skip(fn: str, reason: str) -> str:
    return f"// {fn} — skipped: {reason}\n\n"


# ── GameMaker Studio 2 extension manifest (.yy) emission ──────────────────
#
# Schema reverse-engineered from YoYoGames/GMEXT-Steamworks (the only
# public reference extension with the same cross-platform x64 desktop
# shape we target). GameMaker writes .yy files as JSON-with-trailing-
# commas, fixed field order per resource type, and no whitespace
# between sibling fields inside a resource record. The emitters below
# match that exactly so re-saving the manifest in GMS produces a
# zero-byte diff (otherwise contributors get a noisy regen step every
# time someone opens the project).
#
# Why empty `functions` in v1: the existing
# `elevator_ffi_generated.gml` already does `external_define` for
# every shim, so declaring the same functions in the manifest would
# double-bind and error at import time. Migrating function decls
# into the manifest (and dropping `elevator_ffi_generated.gml`) is a
# follow-up — see issue #869's "Notes on the schema".


def yy_dump(value: object, indent: int) -> str:
    """Emit a GMS-flavoured JSON fragment.

    Differences from `json.dumps`:
    - Trailing commas after the last element in every object/array.
    - No space after `:` between key and value.
    - Arrays and objects with nested resources break across lines;
      flat / leaf records stay on one line (mirrors the Steamworks
      pattern).

    The function only handles `dict`, `list`, `str`, `int`, `float`,
    `bool`, and `None`. Anything else raises.
    """
    pad = "  " * indent

    if isinstance(value, dict):
        if not value:
            return "{}"
        # If every child is a leaf (str/int/bool/None/empty list),
        # emit single-line.
        if all(_is_leaf(v) for v in value.values()):
            parts = [f'"{k}":{yy_dump(v, 0)}' for k, v in value.items()]
            return "{" + ",".join(parts) + ",}"
        # Multi-line for nested.
        inner_pad = "  " * (indent + 1)
        lines = []
        for k, v in value.items():
            lines.append(f'{inner_pad}"{k}":{yy_dump(v, indent + 1)}')
        return "{\n" + ",\n".join(lines) + ",\n" + pad + "}"

    if isinstance(value, list):
        if not value:
            return "[]"
        if all(_is_leaf(v) for v in value):
            parts = [yy_dump(v, 0) for v in value]
            return "[" + ",".join(parts) + ",]"
        inner_pad = "  " * (indent + 1)
        lines = [f"{inner_pad}{yy_dump(v, indent + 1)}" for v in value]
        return "[\n" + ",\n".join(lines) + ",\n" + pad + "]"

    if isinstance(value, bool):
        # `bool` must come before `int` — `isinstance(True, int)` is True.
        return "true" if value else "false"
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        # GMS uses standard JSON string escaping. Double quotes,
        # backslashes, and control chars need escaping; everything
        # else passes through.
        escaped = (
            value.replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
        )
        return f'"{escaped}"'

    raise TypeError(f"yy_dump: unsupported type {type(value).__name__}")


def _is_leaf(v: object) -> bool:
    """A leaf value (no nested objects/non-empty lists) renders inline."""
    if isinstance(v, (str, int, float, bool)) or v is None:
        return True
    if isinstance(v, list):
        return not v
    if isinstance(v, dict):
        return not v
    return False


def build_proxy_file(name: str, target_mask: int) -> dict:
    """One per-platform proxy entry. Field order matches Steamworks."""
    return {
        "$GMProxyFile": "",
        "%Name": name,
        "name": name,
        "resourceType": "GMProxyFile",
        "resourceVersion": "2.0",
        "TargetMask": target_mask,
    }


def build_cdylib_file_entry() -> dict:
    """The single `GMExtensionFile` entry that resolves the elevator-ffi
    cdylib for each target platform.

    `functions` is intentionally empty for v1 — see the file-level
    docstring above. `ProxyFiles` declares the per-platform binary
    GMS should swap in at build time. Target masks copied verbatim
    from the Steamworks reference manifest (the only public GMS
    extension I could find with the same Win/macOS/Linux desktop x64
    shape we ship).
    """
    return {
        "$GMExtensionFile": "v1",
        "%Name": "elevator_ffi.ext",
        "constants": [],
        "copyToTargets": 194,
        "filename": "elevator_ffi.ext",
        "final": "",
        "functions": [],
        "init": "",
        "kind": 4,
        "name": "elevator_ffi.ext",
        "origname": "elevator_ffi.dll",
        "ProxyFiles": [
            build_proxy_file("libelevator_ffi.dylib", 1),
            build_proxy_file("libelevator_ffi.so", 7),
            build_proxy_file("elevator_ffi.dll", 6),
        ],
        "resourceType": "GMExtensionFile",
        "resourceVersion": "2.0",
        "uncompress": False,
        "usesRunnerInterface": True,
    }


def build_extension_root() -> dict:
    """Top-level `GMExtension` resource. Field order matches the
    Steamworks reference verbatim — GMS appears to be strict about
    field order on re-save (re-ordering produces noisy diffs even
    when nothing else changed)."""
    return {
        "$GMExtension": "",
        "%Name": "elevator_ffi",
        "androidactivityinject": "",
        "androidclassname": "",
        "androidcodeinjection": "",
        "androidinject": "",
        "androidmanifestinject": "",
        "androidPermissions": [],
        "androidProps": False,
        "androidsourcedir": "",
        "author": "",
        "classname": "",
        "ConfigValues": {},
        "copyToTargets": 194,
        "description": "Native FFI bridge to elevator-core. Auto-generated manifest — see scripts/gen-gms-bindings.py.",
        "exportToGame": True,
        "extensionVersion": read_ffi_crate_version(),
        "files": [build_cdylib_file_entry()],
        "gradleinject": "",
        "hasConvertedCodeInjection": True,
        "helpfile": "",
        "HTML5CodeInjection": "",
        "html5Props": False,
        "IncludedResources": [],
        "installdir": "",
        "iosCocoaPodDependencies": "",
        "iosCocoaPods": "",
        "ioscodeinjection": "",
        "iosdelegatename": "",
        "iosplistinject": "",
        "iosProps": False,
        "iosSystemFrameworkEntries": [],
        "iosThirdPartyFrameworkEntries": [],
        "license": "MIT OR Apache-2.0",
        "maccompilerflags": "",
        "maclinkerflags": "",
        "macsourcedir": "",
        "name": "elevator_ffi",
        "options": [],
        "optionsFile": "options.json",
        "packageId": "",
        "parent": {
            "name": "elevator_ffi",
            "path": "folders/elevator_ffi.yy",
        },
        "productId": "",
        "resourceType": "GMExtension",
        "resourceVersion": "2.0",
        "sourcedir": "",
        "supportedTargets": 113497714299118,
        "tvosclassname": "",
        "tvosCocoaPodDependencies": "",
        "tvosCocoaPods": "",
        "tvoscodeinjection": "",
        "tvosdelegatename": "",
        "tvosmaccompilerflags": "",
        "tvosmaclinkerflags": "",
        "tvosplistinject": "",
        "tvosProps": False,
        "tvosSystemFrameworkEntries": [],
        "tvosThirdPartyFrameworkEntries": [],
    }


def emit_yy_manifest() -> str:
    """Render the GMExtension manifest as a GMS-flavoured JSON document."""
    return yy_dump(build_extension_root(), 0) + "\n"


def main() -> int:
    sigs = parse_header_signatures()
    bindings_entries = parse_bindings()

    # Build the full export list: gms-tracked Simulation methods +
    # free helpers. Resolve the gms_status to an FFI symbol via the
    # bindings.toml convention (gms mirrors ffi for Simulation
    # methods; for free helpers the FREE_HELPERS table carries the
    # symbol directly).
    exports: list[tuple[str, str]] = []  # [(ffi_symbol, comment_for_skip)]
    skips: list[tuple[str, str]] = []

    # First, walk Simulation methods. The gms value is either an
    # `ev_sim_*` symbol or a `skip:<reason>` / `todo:<phase>`. We
    # emit only exported symbols; everything else gets a // comment.
    for method_name, gms in bindings_entries:
        if gms.startswith("skip:") or gms.startswith("todo:"):
            skips.append((method_name, gms))
            continue
        if gms not in sigs:
            print(f"warning: bindings.toml lists gms = \"{gms}\" but the symbol "
                  f"isn't declared in elevator_ffi.h", file=sys.stderr)
            continue
        exports.append((gms, ""))

    # Then, walk free helpers.
    for symbol, status in FREE_HELPERS:
        if status.startswith("skip:") or status.startswith("todo:"):
            skips.append((symbol, status))
            continue
        if symbol not in sigs:
            print(f"warning: FREE_HELPERS lists {symbol} but the symbol isn't "
                  f"declared in elevator_ffi.h", file=sys.stderr)
            continue
        exports.append((symbol, ""))

    # Filter out exports whose signature has a callback arg —
    # external_define can't bind those even if bindings.toml says
    # otherwise. Surface as a skip with a clear reason. Dedup on
    # symbol name as a defensive measure: if a future contributor
    # adds an entry to FREE_HELPERS that shadows a bindings.toml
    # name, we keep only the first occurrence rather than emitting
    # duplicate `function` declarations (which GML treats as a
    # compile-time error).
    exports_clean: list[str] = []
    seen: set[str] = set()
    for fn, _ in exports:
        if fn in seen:
            continue
        seen.add(fn)
        if "callback" in sigs[fn]["args"]:
            skips.append((fn, "skip:no_function_pointers — signature contains a callback"))
        else:
            exports_clean.append(fn)

    exports_clean.sort()
    skips.sort()

    body_parts: list[str] = []
    body_parts.append(
        "// AUTO-GENERATED by scripts/gen-gms-bindings.py — DO NOT EDIT BY HAND.\n"
        "//\n"
        "// To regenerate:\n"
        "//     python3 scripts/gen-gms-bindings.py\n"
        "//\n"
        "// Each function below is an external_define against the elevator_ffi\n"
        "// cdylib (resolved per-platform by GameMaker — see binaries/ in this\n"
        "// extension folder). Hand-written helpers for struct decoding live in\n"
        "// elevator_ffi.gml.\n"
        "//\n"
        "// Calling convention: dll_cdecl. On x64 (the only target GMS supports\n"
        "// since 2022.8) this is ABI-equivalent to dll_stdcall — we pick\n"
        "// dll_cdecl to match the Microsoft x64 ABI emitted by Rust's\n"
        "// extern \"C\".\n"
        "//\n"
        "// Return-register bridge: functions whose Rust signature declares an\n"
        "// integer, enum, bool, or pointer return type are bound to the\n"
        "// `_gms` companion symbol exported by crates/elevator-ffi/src/gms_shims.rs.\n"
        "// The shim forwards the call and bit-reinterprets the underlying\n"
        "// return as `f64` so GMS's `ty_real` read of `xmm0` / `d0` observes\n"
        "// the correct value on every platform (issue #876). The GML wrapper\n"
        "// name itself is unchanged — only the underlying C symbol differs.\n"
        "// Native `double`-returning fns and `char *`-returning fns are\n"
        "// bound to the original symbol directly.\n"
        "\n"
    )

    for fn in exports_clean:
        body_parts.append(emit_define(fn, sigs[fn]))

    if skips:
        body_parts.append(
            "\n// ── Skipped FFI symbols ────────────────────────────────────\n"
            "// These appear on the C ABI surface but are intentionally not\n"
            "// bound to GML. See bindings.toml for the per-Simulation-method\n"
            "// rationale, or scripts/gen-gms-bindings.py FREE_HELPERS for\n"
            "// non-method helpers.\n\n"
        )
        for name, reason in skips:
            body_parts.append(f"// {name} — {reason}\n")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("".join(body_parts))
    print(
        f"wrote {OUT.relative_to(REPO_ROOT)}: "
        f"{len(exports_clean)} exported, {len(skips)} skipped"
    )

    # ── GMExtension manifest ──────────────────────────────────────────
    # The .yy lets consumers drag-and-drop the extension folder into
    # GameMaker Studio's Asset Browser instead of running through the
    # 5-step manual recipe in `examples/gms2-extension/README.md`. It
    # ships zero function declarations for v1 — functions still bind
    # through `external_define` in `elevator_ffi_generated.gml` to
    # avoid double-definition errors at import time. Migrating function
    # decls into the manifest is a follow-up — see issue #869.
    YY_OUT.write_text(emit_yy_manifest())
    print(f"wrote {YY_OUT.relative_to(REPO_ROOT)}: GMExtension manifest")
    return 0


if __name__ == "__main__":
    sys.exit(main())
