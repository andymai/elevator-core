#!/usr/bin/env bash
# Verifies every `pub fn` on `impl Simulation` is enumerated in bindings.toml.
#
# Failure modes (fail CI):
#   - MISSING:  method exists in code but isn't listed in bindings.toml
#   - STALE:    entry exists in bindings.toml but no such method in code
#   - MALFORMED: a status field isn't `<name>`, `skip:<reason>`, or `todo:<phase>`
#
# `todo:*` statuses are accepted (they're how phased rollout is tracked)
# and reported in the progress summary, but never fail CI.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$REPO_ROOT/bindings.toml"
SIM_FILES=("$REPO_ROOT/crates/elevator-core/src/sim.rs"
           "$REPO_ROOT"/crates/elevator-core/src/sim/*.rs)

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: $MANIFEST not found" >&2
  exit 2
fi

# Public methods inside `impl Simulation` blocks. Tracks brace depth so
# only methods inside the matching impl get collected — Rider/Builder
# helpers in the same files don't pollute the list.
extract_pub_fns() {
  gawk '
    function count_braces(s,    n, c, i) {
      n = 0
      for (i = 1; i <= length(s); i++) {
        c = substr(s, i, 1)
        if (c == "{") n++
        else if (c == "}") n--
      }
      return n
    }
    /^impl([[:space:]]+|[[:space:]]*<[^>]*>[[:space:]]+)([a-zA-Z_][a-zA-Z0-9_:]*::)?Simulation([[:space:]]|<|\{)/ {
      in_sim = 1
      depth = 0
    }
    in_sim {
      depth += count_braces($0)
      if (match($0, /^    pub (async |const |unsafe )?fn ([a-zA-Z_][a-zA-Z0-9_]*)/, m)) {
        print m[2]
      }
      if (depth == 0 && /\}/) in_sim = 0
    }
  ' "$@" | sort -u
}

extract_manifest_names() {
  grep -E '^\s*name\s*=\s*"[a-zA-Z_][a-zA-Z0-9_]*"' "$MANIFEST" \
    | sed -E 's/.*name\s*=\s*"([^"]+)".*/\1/' \
    | sort -u
}

code_methods=$(extract_pub_fns "${SIM_FILES[@]}")
manifest_methods=$(extract_manifest_names)

missing=$(comm -23 <(echo "$code_methods") <(echo "$manifest_methods"))
stale=$(comm -13 <(echo "$code_methods") <(echo "$manifest_methods"))

status=0

if [[ -n "$missing" ]]; then
  echo "::error::bindings.toml is missing entries for these public methods:"
  echo "$missing" | sed 's/^/  - /'
  echo ""
  echo "Add a [[methods]] entry to bindings.toml for each, with explicit"
  echo "wasm + ffi + tui + gms + gdext + bevy status (exported name, skip:<reason>, or todo:<phase>)."
  status=1
fi

if [[ -n "$stale" ]]; then
  echo "::error::bindings.toml has entries for non-existent methods:"
  echo "$stale" | sed 's/^/  - /'
  echo ""
  echo "Either restore the method in code or remove the manifest entry."
  status=1
fi

# Validate status fields and emit progress summary. Each
# `wasm = ` / `ffi = ` / `tui = ` / `gms = ` / `gdext = ` / `bevy = `
# line must be either an identifier (exported name), `skip:<reason>`,
# or `todo:<phase>`. Anything else is malformed. `gawk` (not `awk`)
# is required because the 3-argument `match()` capture-array form is
# a gawk extension — on macOS BSD awk it silently no-ops and lets
# malformed values through.
malformed=$(gawk '
  /^\s*(wasm|ffi|tui|gms|gdext|bevy)\s*=\s*"/ {
    match($0, /^\s*(wasm|ffi|tui|gms|gdext|bevy)\s*=\s*"([^"]*)"/, m)
    binding = m[1]
    value = m[2]
    if (value ~ /^skip:.+/) next
    if (value ~ /^todo:.+/) next
    if (value ~ /^[a-zA-Z_][a-zA-Z0-9_]*$/) next
    print NR ": " binding " = \"" value "\""
  }
' "$MANIFEST")

if [[ -n "$malformed" ]]; then
  echo "::error::bindings.toml has malformed status fields (line: binding = value):"
  echo "$malformed" | sed 's/^/  - /'
  echo ""
  echo "Each status must be an identifier, skip:<reason>, or todo:<phase>."
  status=1
fi

# Per-block completeness: every [[methods]] block must declare all
# six required status columns. The malformed check above only
# validates the format of lines that are already present, so a block
# that simply omits e.g. `gdext` would slip through silently.
incomplete=$(gawk '
  function flush(    missing) {
    if (!in_block) return
    missing = ""
    if (!has_wasm)  missing = missing " wasm"
    if (!has_ffi)   missing = missing " ffi"
    if (!has_tui)   missing = missing " tui"
    if (!has_gms)   missing = missing " gms"
    if (!has_gdext) missing = missing " gdext"
    if (!has_bevy)  missing = missing " bevy"
    if (missing != "") print (name == "" ? "<unnamed>" : name) " (block at line " block_line "): missing" missing
  }
  /^\[\[methods\]\]/ {
    flush()
    in_block = 1; block_line = NR
    name = ""
    has_wasm = 0; has_ffi = 0; has_tui = 0
    has_gms = 0; has_gdext = 0; has_bevy = 0
    next
  }
  /^\s*\[/ && !/^\[\[methods\]\]/ { flush(); in_block = 0 }
  in_block && /^name\s*=\s*"/ { match($0, /"([^"]+)"/, m); name = m[1] }
  in_block && /^\s*wasm\s*=\s*"/  { has_wasm  = 1 }
  in_block && /^\s*ffi\s*=\s*"/   { has_ffi   = 1 }
  in_block && /^\s*tui\s*=\s*"/   { has_tui   = 1 }
  in_block && /^\s*gms\s*=\s*"/   { has_gms   = 1 }
  in_block && /^\s*gdext\s*=\s*"/ { has_gdext = 1 }
  in_block && /^\s*bevy\s*=\s*"/  { has_bevy  = 1 }
  END { flush() }
' "$MANIFEST")

if [[ -n "$incomplete" ]]; then
  echo "::error::bindings.toml has [[methods]] blocks missing required columns:"
  echo "$incomplete" | sed 's/^/  - /'
  echo ""
  echo "Every entry must declare wasm, ffi, tui, gms, gdext, and bevy (exported name, skip:<reason>, or todo:<phase>)."
  status=1
fi

if [[ $status -ne 0 ]]; then
  exit $status
fi

# ── Progress summary ───────────────────────────────────────────────────
total=$(echo "$code_methods" | wc -l)

# Categorize each wasm / ffi / tui / gms / gdext / bevy status line.
read -r wasm_exported wasm_skipped wasm_todo \
        ffi_exported  ffi_skipped  ffi_todo \
        tui_exported  tui_skipped  tui_todo \
        gms_exported  gms_skipped  gms_todo \
        gdext_exported gdext_skipped gdext_todo \
        bevy_exported bevy_skipped bevy_todo < <(
  gawk '
    BEGIN {
      we=0; ws=0; wt=0
      fe=0; fs=0; ft=0
      te=0; ts=0; tt=0
      ge=0; gs=0; gt=0
      gxe=0; gxs=0; gxt=0
      be=0; bs=0; bt=0
    }
    /^\s*wasm\s*=\s*"/ {
      match($0, /^\s*wasm\s*=\s*"([^"]*)"/, m); v = m[1]
      if (v ~ /^skip:/) ws++
      else if (v ~ /^todo:/) wt++
      else we++
    }
    /^\s*ffi\s*=\s*"/ {
      match($0, /^\s*ffi\s*=\s*"([^"]*)"/, m); v = m[1]
      if (v ~ /^skip:/) fs++
      else if (v ~ /^todo:/) ft++
      else fe++
    }
    /^\s*tui\s*=\s*"/ {
      match($0, /^\s*tui\s*=\s*"([^"]*)"/, m); v = m[1]
      if (v ~ /^skip:/) ts++
      else if (v ~ /^todo:/) tt++
      else te++
    }
    /^\s*gms\s*=\s*"/ {
      match($0, /^\s*gms\s*=\s*"([^"]*)"/, m); v = m[1]
      if (v ~ /^skip:/) gs++
      else if (v ~ /^todo:/) gt++
      else ge++
    }
    /^\s*gdext\s*=\s*"/ {
      match($0, /^\s*gdext\s*=\s*"([^"]*)"/, m); v = m[1]
      if (v ~ /^skip:/) gxs++
      else if (v ~ /^todo:/) gxt++
      else gxe++
    }
    /^\s*bevy\s*=\s*"/ {
      match($0, /^\s*bevy\s*=\s*"([^"]*)"/, m); v = m[1]
      if (v ~ /^skip:/) bs++
      else if (v ~ /^todo:/) bt++
      else be++
    }
    END { print we, ws, wt, fe, fs, ft, te, ts, tt, ge, gs, gt, gxe, gxs, gxt, be, bs, bt }
  ' "$MANIFEST"
)

echo "ok: bindings.toml is in sync with $total public Simulation methods"
echo ""
printf "  %-12s %10s %10s %10s\n" "binding" "exported" "skipped" "todo"
printf "  %-12s %10s %10s %10s\n" "wasm"  "$wasm_exported"  "$wasm_skipped"  "$wasm_todo"
printf "  %-12s %10s %10s %10s\n" "ffi"   "$ffi_exported"   "$ffi_skipped"   "$ffi_todo"
printf "  %-12s %10s %10s %10s\n" "tui"   "$tui_exported"   "$tui_skipped"   "$tui_todo"
printf "  %-12s %10s %10s %10s\n" "gms"   "$gms_exported"   "$gms_skipped"   "$gms_todo"
printf "  %-12s %10s %10s %10s\n" "gdext" "$gdext_exported" "$gdext_skipped" "$gdext_todo"
printf "  %-12s %10s %10s %10s\n" "bevy"  "$bevy_exported"  "$bevy_skipped"  "$bevy_todo"
