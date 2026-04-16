#!/usr/bin/env bash
# lint-docs.sh -- Fast documentation linter for the elevator-core mdBook.
#
# Checks:
#   1. mdBook builds without errors
#   2. Every internal [text](file.md) link resolves to an existing file
#   3. No bare ```rust code fences (must be rust,no_run or rust,ignore)
#   4. No Unicode em-dashes (use -- for consistency)
#   5. Every chapter starts with a level-1 heading
#   6. No heading-level skips (e.g., ## then ####)
#   7. No references to deleted files (old chapter names)
#   8. Every chapter (except SUMMARY.md) has a "Next steps" section
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
    # Extract link targets like [text](foo-bar.md) or [text](foo-bar.md#anchor)
    grep -oP '\]\(\K[a-z][-a-z0-9]*\.md(?=#[^)]*\)|\))' "$f" 2>/dev/null | while read -r target; do
        target="${target%)}"
        if [[ ! -f "$DOCS_SRC/$target" ]]; then
            err "$fname: broken link to $target"
        fi
    done
done

# ── 3. Bare ```rust fences ───────────────────────────────────────
echo "checking code fence annotations..."
while IFS=: read -r file line _; do
    err "$file:$line: bare \`\`\`rust (use rust,no_run or rust,ignore)"
done < <(grep -Hrn '^```rust$' "$DOCS_SRC"/*.md 2>/dev/null || true)

# ── 4. Unicode em-dashes ─────────────────────────────────────────
echo "checking dash consistency..."
while IFS=: read -r file line _; do
    err "$file:$line: Unicode em-dash found (use -- instead)"
done < <(grep -Pn '—' "$DOCS_SRC"/*.md 2>/dev/null || true)

# ── 5. Level-1 heading on line 1 ─────────────────────────────────
echo "checking chapter headings..."
for f in "$DOCS_SRC"/*.md; do
    fname="$(basename "$f")"
    [[ "$fname" == "SUMMARY.md" ]] && continue
    first="$(head -1 "$f")"
    if [[ "$first" != "# "* ]]; then
        err "$fname: first line is not a level-1 heading"
    fi
done

# ── 6. No heading-level skips (outside code fences) ──────────────
for f in "$DOCS_SRC"/*.md; do
    fname="$(basename "$f")"
    [[ "$fname" == "SUMMARY.md" ]] && continue
    prev_level=0
    in_fence=false
    while IFS= read -r line; do
        # Toggle fence state on ``` lines
        if [[ "$line" == '```'* ]]; then
            if $in_fence; then in_fence=false; else in_fence=true; fi
            continue
        fi
        $in_fence && continue
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
done

# ── 7. No references to deleted files ────────────────────────────
echo "checking for stale references..."
STALE_PATTERNS="\bapi-reference\.md|\bcore-concepts\.md|\bextensions-and-hooks\.md|\bgetting-started\.md|\bmetrics-and-events\.md|\bnon-bevy-integration\.md|\bsnapshots-and-determinism\.md|\(dispatch\.md[)#]"
while IFS=: read -r file line content; do
    err "$file:$line: stale reference: $content"
done < <(grep -Pn "$STALE_PATTERNS" "$DOCS_SRC"/*.md 2>/dev/null || true)

# ── 8. Next steps section ────────────────────────────────────────
echo "checking Next steps sections..."
for f in "$DOCS_SRC"/*.md; do
    fname="$(basename "$f")"
    [[ "$fname" == "SUMMARY.md" ]] && continue
    if ! grep -q '^## Next steps' "$f"; then
        err "$fname: missing '## Next steps' section"
    fi
done

# ── Summary ──────────────────────────────────────────────────────
echo ""
if (( ERRORS > 0 )); then
    echo "docs lint: $ERRORS error(s) found" >&2
    exit 1
else
    echo "docs lint: all checks passed"
fi
