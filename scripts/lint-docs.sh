#!/usr/bin/env bash
# lint-docs.sh -- Fast documentation linter for the elevator-core mdBook.
#
# Checks:
#   1. mdBook builds without errors
#   2. Every internal [text](file.md) link resolves to an existing file
#   3. No `ignore` fences in docs/ or rustdoc; they hide drift from `cargo test --doc`
#   4. Every chapter starts with a level-1 heading
#   5. No heading-level skips (e.g., ## then ####)
#   6. No references to deleted files (old chapter names)
#   7. Every chapter (except SUMMARY.md) has a "Next steps" section
#   8. Mermaid node labels don't open with a markdown list/blockquote/heading
#      marker -- mermaid renders those as the literal text
#      "Unsupported markdown: list/blockquote/heading" instead of the
#      intended label.
#   9. Type::method references inside ```rust fences resolve to a known
#      type (one of: a `pub struct/enum/trait/type Name` declared in the
#      workspace, a stdlib/ecosystem allowlist entry, or a type defined
#      inline elsewhere in the same chapter). Catches doc rot when a
#      core type is renamed without sweeping the docs.
#
# Usage:
#   scripts/lint-docs.sh          # run all checks
#   scripts/lint-docs.sh --quick  # skip mdbook build (faster for pre-commit)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS_SRC="$REPO_ROOT/docs/src"
ERRORS=0

err() {
    echo "  ERROR: $1" >&2
    ERRORS=$((ERRORS + 1))
}

# ── 1. mdBook build ───────────────────────────────────────────────
if [[ "${1:-}" != "--quick" ]]; then
    echo "checking mdbook build..."
    if ! mdbook build "$REPO_ROOT/docs" 2>&1 | grep -q 'HTML book written'; then
        err "mdbook build failed"
    fi
fi

# ── 2. Internal links ────────────────────────────────────────────
echo "checking internal links..."
for f in "$DOCS_SRC"/*.md; do
    fname="$(basename "$f")"
    # Match [text](foo-bar.md) and [text](foo-bar.md#anchor), capturing just the filename.
    # Use process substitution to keep the while loop in the current shell
    # so err() increments ERRORS in the parent scope.
    while IFS= read -r target; do
        if [[ ! -f "$DOCS_SRC/$target" ]]; then
            err "$fname: broken link to $target"
        fi
    done < <(grep -oP '\]\(\K[a-z][-a-z0-9]*\.md(?=[)#])' "$f" 2>/dev/null)
done

# ── 3. Forbid `ignore` fences ─────────────────────────────────────
# Every Rust fence must compile via `cargo test --doc`. Use bare ```rust
# (compiled and run) or ```rust,no_run (compiled only). Any fence tagged
# `ignore` (bare `ignore`, `rust,ignore`, or combinations) lets drift slip
# in silently, so it is not allowed — in the mdBook chapters OR in rustdoc
# comments inside the workspace's Rust sources.
echo "checking code fence annotations..."
ignore_err() {
    err "$1: \`\`\`ignore is not allowed (use rust or rust,no_run so the fence is type-checked)"
}
# Chapters and README: fence opens a line like ```rust,ignore or ```ignore.
# README.md is included in the doctest pipeline via `include_str!`, so it
# belongs under the same policy as the mdBook chapters.
while IFS=: read -r file line _; do
    ignore_err "${file#"$REPO_ROOT/"}:$line"
done < <(grep -HnE '^```.*\bignore\b' "$DOCS_SRC"/*.md "$REPO_ROOT"/README.md 2>/dev/null || true)
# Rustdoc: fence inside /// or //! comments — same rule applies.
while IFS=: read -r file line _; do
    ignore_err "${file#"$REPO_ROOT/"}:$line"
done < <(grep -rHnE '^\s*(///|//!)\s*```.*\bignore\b' "$REPO_ROOT"/crates/*/src 2>/dev/null || true)

# ── 4, 5, 7. Per-file structure checks ──────────────────────────
# Single pass per file: first-line heading, heading-level skips, "Next steps" section
echo "checking chapter structure..."
for f in "$DOCS_SRC"/*.md; do
    fname="$(basename "$f")"
    [[ "$fname" == "SUMMARY.md" ]] && continue

    prev_level=0
    in_fence=false
    has_next_steps=false
    lineno=0

    while IFS= read -r line; do
        lineno=$((lineno + 1))

        # Check 4: first line must be a level-1 heading
        if (( lineno == 1 )) && [[ "$line" != "# "* ]]; then
            err "$fname: first line is not a level-1 heading"
        fi

        # Toggle fence state on ``` lines
        if [[ "$line" == '```'* ]]; then
            if $in_fence; then in_fence=false; else in_fence=true; fi
            continue
        fi
        $in_fence && continue

        # Check 7: look for "Next steps" heading
        if [[ "$line" == "## Next steps"* ]]; then
            has_next_steps=true
        fi

        # Check 5: detect heading-level skips
        case "$line" in
            '#### '*)  level=4 ;;
            '### '*)   level=3 ;;
            '## '*)    level=2 ;;
            '# '*)     level=1 ;;
            *)         continue ;;
        esac
        if (( prev_level > 0 && level > prev_level + 1 )); then
            err "$fname: heading level skips from $prev_level to $level"
        fi
        prev_level=$level
    done < "$f"

    if ! $has_next_steps; then
        err "$fname: missing '## Next steps' section"
    fi
done

# ── 6. No references to deleted files ────────────────────────────
echo "checking for stale references..."
STALE_PATTERNS="\bapi-reference\.md\b|\bcore-concepts\.md\b|\bextensions-and-hooks\.md\b|\bgetting-started\.md\b|\bmetrics-and-events\.md\b|\bnon-bevy-integration\.md\b|\bsnapshots-and-determinism\.md\b|\(dispatch\.md[)#]"
while IFS=: read -r file line content; do
    err "$(basename "$file"):$line: stale reference: $content"
done < <(grep -Pn "$STALE_PATTERNS" "$DOCS_SRC"/*.md 2>/dev/null || true)

# ── 8. Mermaid label markdown-marker mangling ────────────────────
# Inside ```mermaid fences, mermaid 10+/11 runs HTML-label text
# through a markdown parser. A label that opens with `N.`, `N)`, `-`,
# `*`, `+`, `>`, or `#` (each followed by a space) is interpreted as a
# list/blockquote/heading and replaced with the literal text
# "Unsupported markdown: list/blockquote/heading". Catch the family of
# regressions before it hits the rendered docs.
echo "checking mermaid node labels..."
while IFS=: read -r file line content; do
    err "$(basename "$file"):$line: mermaid label opens with a markdown marker (renders as 'Unsupported markdown: ...'): $content"
done < <(awk '
    FNR == 1                   { in_m=0 }
    /^```mermaid[[:space:]]*$/ { in_m=1; next }
    /^```/                     { in_m=0; next }
    in_m && match($0, /"([0-9]+[.)]|[-*+]|>|#) /) {
        printf "%s:%d:%s\n", FILENAME, FNR, $0
    }
' "$DOCS_SRC"/*.md)

# ── 9. Code-symbol references inside ```rust fences ──────────────
# For every `Type::method` reference inside a ```rust fence in
# docs/src/*.md, verify that `Type` is one of:
#   - a public type declared in the workspace (`pub (struct|enum|trait|type)`),
#   - a stdlib / ecosystem name on the allowlist below, or
#   - a type defined inline elsewhere in the same chapter (tutorial
#     types like `struct PriorityDispatch` shouldn't be flagged).
# Method-level checking is intentionally out of scope: derive macros
# (`#[derive(Default)]`) and trait impls (`From::from`) make method
# resolution noisy without strict crate-level rustdoc parsing. The
# rename signal we want — "the docs reference a Type that no longer
# exists" — falls out of the type-level check alone.
echo "checking code-symbol references..."

OUR_TYPES_FILE="$(mktemp)"
ALLOW_TYPES_FILE="$(mktemp)"
LOCAL_TYPES_FILE="$(mktemp)"
trap 'rm -f "$OUR_TYPES_FILE" "$ALLOW_TYPES_FILE" "$LOCAL_TYPES_FILE"' EXIT

{
    grep -rohP '\bpub (struct|enum|trait|type) \K[A-Z][A-Za-z0-9_]*' \
        "$REPO_ROOT"/crates/*/src/ 2>/dev/null
    # typed_entity_id! macro-generated wrappers (see entity.rs).
    printf '%s\n' ElevatorId RiderId StopId GroupId EntityId
} | sort -u > "$OUR_TYPES_FILE"

cat > "$ALLOW_TYPES_FILE" <<'ALLOW'
App
AppExit
Arc
AsMut
AsRef
BTreeMap
BTreeSet
Bound
Box
Cell
Clone
Commands
Component
Debug
Default
Display
Drop
Duration
Eq
Error
FixedUpdate
Fn
FnMut
FnOnce
From
Handle
Hash
HashMap
HashSet
Instant
Into
IntoIterator
IntoSystem
Iterator
Mutex
OnAdd
OnEnter
OnExit
Option
Ord
PartialEq
PartialOrd
Path
PathBuf
Plugin
Query
Range
RangeInclusive
Rc
RefCell
Res
ResMut
Resource
Result
Rng
RngCore
RwLock
Schedule
SeedableRng
Send
Sized
SmallRng
StdRng
String
Sync
SystemSet
ThreadRng
Time
ToString
Trigger
Update
Vec
VecDeque
World
ALLOW

for f in "$DOCS_SRC"/*.md; do
    fname="$(basename "$f")"
    [[ "$fname" == "SUMMARY.md" ]] && continue

    # Local types: any `(struct|enum|trait|type) Name` that appears
    # inside any code fence in this file (rust, text, gdscript, etc.).
    awk '
        /^```/ { in_f = !in_f; next }
        in_f && match($0, /(struct|enum|trait|type)[[:space:]]+[A-Z][A-Za-z0-9_]*/) {
            n = split(substr($0, RSTART, RLENGTH), a, /[[:space:]]+/)
            print a[n]
        }
    ' "$f" | sort -u > "$LOCAL_TYPES_FILE"

    while IFS= read -r ref; do
        type="${ref%%::*}"
        grep -qFx "$type" "$OUR_TYPES_FILE"   && continue
        grep -qFx "$type" "$ALLOW_TYPES_FILE" && continue
        grep -qFx "$type" "$LOCAL_TYPES_FILE" && continue
        err "$fname: unknown type in code fence: $ref (renamed? add to allowlist if intentional)"
    done < <(awk '/^```rust/{in_f=1; next} /^```/{in_f=0; next} in_f' "$f" \
              | grep -oP '[A-Z][A-Za-z0-9]*::[a-zA-Z_][A-Za-z0-9_]*' | sort -u)
done

# ── Summary ──────────────────────────────────────────────────────
echo ""
if (( ERRORS > 0 )); then
    echo "docs lint: $ERRORS error(s) found" >&2
    exit 1
else
    echo "docs lint: all checks passed"
fi
