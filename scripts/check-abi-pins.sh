#!/usr/bin/env bash
# Cross-consumer ABI-version gate.
#
# `elevator_core::HOST_PROTOCOL_VERSION` is the single source of
# truth. The Rust binding crates (FFI, wasm, gdext) reference it at
# compile time, so they cannot drift in-source — but the C header
# and the C# / GMS2 example harnesses still embed a literal copy
# that has to be updated by hand. This script enforces that those
# literal copies match core's value.
#
# Watched files:
#   crates/elevator-core/src/lib.rs               `pub const HOST_PROTOCOL_VERSION: u32 = N`  (source of truth)
#   crates/elevator-ffi/include/elevator_ffi.h    `#define EV_ABI_VERSION N`
#   examples/csharp-harness/Program.cs            `private const uint EXPECTED_ABI = N`
#   examples/gms2-harness/main.c                  `#define EXPECTED_ABI N`
#   examples/gms2-extension/README.md             `// expect: "ABI version: N"`
#
# The Rust crates that reference `elevator_core::HOST_PROTOCOL_VERSION`
# (FFI's `EV_ABI_VERSION`, wasm's `ABI_VERSION`, gdext's `ABI_VERSION`)
# are also verified for *presence* of the reference — if someone
# regresses one back to a literal, we want to know.
#
# Output on success: `ok: ABI version is in sync at N across <count> watched files`
# Output on failure: a per-file table showing which versions live where.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Files whose value is extracted as an integer literal. FFI keeps a
# literal in `lib.rs` (cbindgen resolves it into the generated C
# header — a cross-crate `const` reference would not survive that
# codegen). A compile-time `assert!` in `lib.rs` ties FFI's literal
# to core's `HOST_PROTOCOL_VERSION` so the two cannot drift.
LITERAL_WATCHED=(
  "crates/elevator-core/src/lib.rs|pub const HOST_PROTOCOL_VERSION: u32 = [0-9]+"
  "crates/elevator-ffi/src/lib.rs|pub const EV_ABI_VERSION: u32 = [0-9]+"
  "crates/elevator-ffi/include/elevator_ffi.h|#define EV_ABI_VERSION [0-9]+"
  "examples/csharp-harness/Program.cs|private const uint EXPECTED_ABI = [0-9]+"
  "examples/gms2-harness/main.c|#define EXPECTED_ABI [0-9]+"
  # Anchored to the literal verification-recipe comment so a future
  # changelog / migration-guide section in the README that mentions
  # an old version doesn't trick `head -1` into extracting it.
  "examples/gms2-extension/README.md|// expect: \"ABI version: [0-9]+\""
)

# Files that must reference `elevator_core::HOST_PROTOCOL_VERSION`.
# These get the source-of-truth value implicitly via Rust's compiler;
# we only verify the reference is present (regression guard against
# someone reintroducing a literal).
REFERENCE_WATCHED=(
  "crates/elevator-wasm/src/lib.rs|pub const ABI_VERSION: u32 = elevator_core::HOST_PROTOCOL_VERSION"
  "crates/elevator-gdext/src/sim_node.rs|pub const ABI_VERSION: u32 = elevator_core::HOST_PROTOCOL_VERSION"
)

declare -A versions
declare -a missing=()

for entry in "${LITERAL_WATCHED[@]}"; do
  path="${entry%%|*}"
  pattern="${entry#*|}"
  abs="$REPO_ROOT/$path"
  if [[ ! -f "$abs" ]]; then
    missing+=("$path")
    continue
  fi
  match=$(grep -oE "$pattern" "$abs" | head -1 || true)
  if [[ -z "$match" ]]; then
    missing+=("$path")
    continue
  fi
  # Pull the last integer literal out of the matched line; the
  # README's anchor ends with a closing quote, not a digit, so a
  # bare `[0-9]+$` won't anchor against the line end. Take the last
  # digit run via a tail call instead.
  version=$(echo "$match" | grep -oE '[0-9]+' | tail -1)
  versions["$path"]="$version"
done

# Reference checks: presence-only. The Rust compiler enforces value
# equality at build time; this guard catches the regression where a
# crate is changed back to a literal.
core_version="${versions[crates/elevator-core/src/lib.rs]:-}"
for entry in "${REFERENCE_WATCHED[@]}"; do
  path="${entry%%|*}"
  pattern="${entry#*|}"
  abs="$REPO_ROOT/$path"
  if [[ ! -f "$abs" ]]; then
    missing+=("$path")
    continue
  fi
  if ! grep -qF "$pattern" "$abs"; then
    missing+=("$path (missing: $pattern)")
    continue
  fi
  # Track under the core value so the disagreement check below
  # reports a single coherent table.
  versions["$path"]="$core_version"
done

status=0

if (( ${#missing[@]} > 0 )); then
  echo "::error::check-abi-pins.sh could not extract a version from these files:"
  printf '  - %s\n' "${missing[@]}"
  echo ""
  echo "Either the file is missing or the watched pattern no longer matches."
  echo "Update WATCHED in scripts/check-abi-pins.sh if the constant moved."
  status=1
fi

# Count distinct values across the captured set.
declare -A unique
for v in "${versions[@]}"; do
  unique["$v"]=1
done

if (( ${#unique[@]} > 1 )); then
  echo "::error::ABI version pins disagree across consumers:"
  for path in "${!versions[@]}"; do
    printf '  %-60s %s\n' "$path" "${versions[$path]}"
  done | sort
  echo ""
  echo "Resolve by updating each literal pin to match HOST_PROTOCOL_VERSION"
  echo "in crates/elevator-core/src/lib.rs (the single source of truth)."
  status=1
fi

if (( status != 0 )); then
  exit $status
fi

# Success: report the agreed-on value and the count of files checked.
agreed=$(printf '%s\n' "${!unique[@]}")
echo "ok: ABI version is in sync at $agreed across ${#versions[@]} watched files"
