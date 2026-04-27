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
  awk '
    function count_braces(s,    n, c, i) {
      n = 0
      for (i = 1; i <= length(s); i++) {
        c = substr(s, i, 1)
        if (c == "{") n++
        else if (c == "}") n--
      }
      return n
    }
    /^impl([[:space:]]+|[[:space:]]*<.*>[[:space:]]+)([a-zA-Z_][a-zA-Z0-9_:]*::)?Simulation([[:space:]]|<|\{)/ {
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
  echo "wasm + ffi status (exported name, skip:<reason>, or todo:<phase>)."
  status=1
fi

if [[ -n "$stale" ]]; then
  echo "::error::bindings.toml has entries for non-existent methods:"
  echo "$stale" | sed 's/^/  - /'
  echo ""
  echo "Either restore the method in code or remove the manifest entry."
  status=1
fi

# Validate status fields and emit progress summary. Each `wasm =` / `ffi =`
# line must be either an identifier (exported name), `skip:<reason>`, or
# `todo:<phase>`. Anything else is malformed.
malformed=$(awk '
  /^\s*(wasm|ffi)\s*=\s*"/ {
    match($0, /^\s*(wasm|ffi)\s*=\s*"([^"]*)"/, m)
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

if [[ $status -ne 0 ]]; then
  exit $status
fi

# ── Progress summary ───────────────────────────────────────────────────
total=$(echo "$code_methods" | wc -l)

# Categorize each wasm / ffi status line.
read -r wasm_exported wasm_skipped wasm_todo \
        ffi_exported  ffi_skipped  ffi_todo < <(
  awk '
    BEGIN { we=0; ws=0; wt=0; fe=0; fs=0; ft=0 }
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
    END { print we, ws, wt, fe, fs, ft }
  ' "$MANIFEST"
)

echo "ok: bindings.toml is in sync with $total public Simulation methods"
echo ""
printf "  %-12s %10s %10s %10s\n" "binding" "exported" "skipped" "todo"
printf "  %-12s %10s %10s %10s\n" "wasm" "$wasm_exported" "$wasm_skipped" "$wasm_todo"
printf "  %-12s %10s %10s %10s\n" "ffi"  "$ffi_exported"  "$ffi_skipped"  "$ffi_todo"
