#!/usr/bin/env bash
# lint-docs.sh -- Fast documentation linter for the elevator-core mdBook.
#
# Checks:
#   1. mdBook builds without errors
#   2. Every internal [text](file.md) link resolves to an existing file
#   3. No bare ```rust code fences (must be rust,no_run or rust,ignore)
#   4. Every chapter starts with a level-1 heading
#   5. No heading-level skips (e.g., ## then ####)
#   6. No references to deleted files (old chapter names)
#   7. Every chapter (except SUMMARY.md) has a "Next steps" section
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

# ── 3. Bare ```rust fences ───────────────────────────────────────
echo "checking code fence annotations..."
while IFS=: read -r file line _; do
    err "$(basename "$file"):$line: bare \`\`\`rust (use rust,no_run or rust,ignore)"
done < <(grep -Hn '^```rust$' "$DOCS_SRC"/*.md 2>/dev/null || true)

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

# ── Summary ──────────────────────────────────────────────────────
echo ""
if (( ERRORS > 0 )); then
    echo "docs lint: $ERRORS error(s) found" >&2
    exit 1
else
    echo "docs lint: all checks passed"
fi
