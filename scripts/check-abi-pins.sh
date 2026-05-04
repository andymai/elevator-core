#!/usr/bin/env bash
# Cross-consumer ABI-version gate.
#
# Every consumer of elevator-ffi embeds the ABI version it was built
# against as a hardcoded constant. If the lib bumps EV_ABI_VERSION
# without each consumer updating, drift surfaces in production rather
# than in CI. This script extracts every such constant from the
# watched files and fails if any two values disagree.
#
# Watched files + grep patterns:
#   crates/elevator-ffi/include/elevator_ffi.h    `#define EV_ABI_VERSION N`  (source of truth)
#   crates/elevator-ffi/src/lib.rs                `pub const EV_ABI_VERSION: u32 = N`
#   examples/csharp-harness/Program.cs            `private const uint EXPECTED_ABI = N`
#   examples/gms2-harness/main.c                  `#define EXPECTED_ABI N`
#   examples/gms2-extension/README.md             `// expect: "ABI version: N"`
#   crates/elevator-wasm/src/lib.rs               `pub const ABI_VERSION: u32 = N`
#   crates/elevator-gdext/src/sim_node.rs         `const ABI_VERSION: u32 = N`
#
# Output on success: `ok: ABI version is in sync at N across <count> watched files`
# Output on failure: a per-file table showing which versions live where.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Each entry: "<path>|<extractor pattern>" where the pattern is a
# `grep -oE` regex that captures only the integer literal.
WATCHED=(
  "crates/elevator-ffi/include/elevator_ffi.h|#define EV_ABI_VERSION [0-9]+"
  "crates/elevator-ffi/src/lib.rs|pub const EV_ABI_VERSION: u32 = [0-9]+"
  "examples/csharp-harness/Program.cs|private const uint EXPECTED_ABI = [0-9]+"
  "examples/gms2-harness/main.c|#define EXPECTED_ABI [0-9]+"
  # Anchored to the literal verification-recipe comment so a future
  # changelog / migration-guide section in the README that mentions
  # an old version doesn't trick `head -1` into extracting it.
  "examples/gms2-extension/README.md|// expect: \"ABI version: [0-9]+\""
  "crates/elevator-wasm/src/lib.rs|pub const ABI_VERSION: u32 = [0-9]+"
  "crates/elevator-gdext/src/sim_node.rs|pub const ABI_VERSION: u32 = [0-9]+"
)

declare -A versions
declare -a missing=()

for entry in "${WATCHED[@]}"; do
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
  echo "Resolve by updating each pin to match the EV_ABI_VERSION value"
  echo "in crates/elevator-ffi/include/elevator_ffi.h (the source of truth)."
  status=1
fi

if (( status != 0 )); then
  exit $status
fi

# Success: report the agreed-on value and the count of files checked.
agreed=$(printf '%s\n' "${!unique[@]}")
echo "ok: ABI version is in sync at $agreed across ${#versions[@]} watched files"
