#!/usr/bin/env python3
"""Filter Criterion "Performance has regressed." lines by median change %.

Criterion's built-in regression detection is purely p-value-based: any
statistically significant change fires, including sub-%% drift that's noise
on a shared CI runner. This script keeps only the regressions whose median
change exceeds a threshold.

To suppress single-day runner-variance noise (see issues #547, #557, #734,
#803), the script can also intersect today's regressions against a list of
bench names that regressed on the *previous* nightly. Only regressions that
appear on two consecutive runs are treated as confirmed and surface in the
issue-open output.

To suppress *shared-runner-speed* variance (issues #907/#908/#913/#914/#916 —
a uniform ~7-16% "regression" across every unrelated bench when a later
nightly lands on a faster/slower `ubuntu-latest` instance), the script divides
the runner-speed factor back out. The `calibration/fixed_workload` bench
(benches/calibration_bench.rs) contains no elevator-core code, so its
change% is a pure reading of this runner vs the baseline runner. Each real
bench's change is adjusted by that factor before the magnitude gate:
`adjusted = min((1 + change/100) / (1 + calib/100) - 1, change)`. A genuine
per-bench regression diverges from calibration and survives; a whole-suite
runner scale cancels. If the calibration reading is absent (the one-night
warm-up right after this ships, before calibration has a prior baseline), the
script falls back to raw change% so detection is never silently weakened.

The `min(..., change)` clamp makes the adjustment damping-only — see `adjust()`
for why an unclamped divide-out amplified +3% into +15.6% and produced the
false positives in #923/#924.

Args:
    sys.argv[1]: path to append `regressed=true|false` and `gate=two-day|
        single-run` outputs to ($GITHUB_OUTPUT). Callers can use the `gate`
        value to vary issue-body wording when the persistence gate falls
        back to single-run (first deploy day).
    sys.argv[2]: minimum |median change %| to alert on (e.g. "5.0").
    sys.argv[3]: path to the Criterion bench output log to filter.
    sys.argv[4] (optional): path to the previous nightly's regression-name
        list. If the file is absent, no confirmation gate is applied and
        the script falls back to single-run behaviour. If the file is
        present but empty (yesterday had no regressions), the two-day gate
        still applies and the intersection is empty.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Criterion prints negatives with a Unicode minus (U+2212), not ASCII '-', so
# the sign class accepts both — otherwise a faster-runner calibration reading
# (negative change) fails to parse and silently drops to the raw fallback.
_SIGN = r"[+\-−]?"
CHANGE_RE = re.compile(
    rf"change:\s*\["
    rf"({_SIGN}\d+(?:\.\d+)?)%\s+"
    rf"({_SIGN}\d+(?:\.\d+)?)%\s+"
    rf"({_SIGN}\d+(?:\.\d+)?)%"
    rf"\]"
)

CURRENT_LIST = Path("regressions-current.txt")
ISSUE_BODY = Path("regressions.txt")

# The synthetic runner-speed bench (benches/calibration_bench.rs). Its median
# change% is the shared-runner speed factor we divide out. Excluded from the
# reported/persisted regression set — it is instrumentation, not a finding.
CALIBRATION_NAME = "calibration/fixed_workload"


def _pct(raw: str) -> float:
    """Parse a criterion percentage, normalizing its Unicode minus to ASCII."""
    return float(raw.replace("−", "-"))


def calibration_change(lines: list[str]) -> float | None:
    """Median change% of the calibration bench, or None if it has no change
    line yet (first nightly after this ships — no prior baseline to compare)."""
    for i, line in enumerate(lines):
        if CALIBRATION_NAME not in line:
            continue
        for follow in lines[i : i + 6]:
            if "change:" in follow:
                m = CHANGE_RE.search(follow)
                if m:
                    return _pct(m.group(2))
    return None


def adjust(change_pct: float, calib_pct: float | None) -> float:
    """Divide the runner-speed factor out of a bench's change%. With no
    calibration reading, pass the raw change through unchanged (fallback).

    The result is clamped to never exceed the raw change: calibration may only
    *shrink* a reported regression, never inflate one. Without the clamp a
    faster-than-baseline runner amplifies instead of cancelling — on run
    29680411190 calibration read −10.87% while four `dispatch_comparison/
    *_50e_200s` benches read +3%, and `(1.03)/(0.8913)−1 = +15.6%` cleared the
    5% gate (issues #923/#924). The divide-out assumes runner speed is a single
    scalar every bench shares; it isn't, because the calibration walk is
    memory-bandwidth-bound while the dispatch benches are branch-bound, so the
    two diverge across runner instances. Damping-only keeps the whole-suite
    cancellation this was built for while making that divergence unable to
    manufacture a regression.
    """
    if calib_pct is None:
        return change_pct
    scale = 1.0 + calib_pct / 100.0
    if scale <= 0.0:  # absurd reading — don't trust it, fall back to raw
        return change_pct
    adjusted = ((1.0 + change_pct / 100.0) / scale - 1.0) * 100.0
    return min(adjusted, change_pct)


def regression_block(lines: list[str], verdict_idx: int) -> tuple[str, str]:
    """Resolve the (bench_name, block) for a 'Performance has regressed.' line.

    Criterion's summary block starts at an *unindented* line — the bench id,
    sometimes with `time:` appended when the id is short — and the
    time:/thrpt:/change:/verdict lines below it are indented. Scanning back to
    the first unindented line is robust to how many stat lines criterion emits;
    a fixed offset breaks when a `Throughput`-configured bench adds a `thrpt:`
    line (greptile/cubic P2 on #920). The name is normalized to the bare
    criterion id so it stays stable across nights for the persistence gate and
    the calibration-skip substring match is reliable."""
    start = verdict_idx
    for j in range(verdict_idx - 1, max(-1, verdict_idx - 9), -1):
        if lines[j].strip() and not lines[j][:1].isspace():
            start = j
            break
    name = lines[start].strip()
    if name.startswith("Benchmarking "):
        name = name[len("Benchmarking ") :].rsplit(":", 1)[0]
    for tail in ("time:", "thrpt:"):
        name = name.split(tail, 1)[0]
    name = name.strip() or f"unknown_{verdict_idx}"
    return name, "".join(lines[start : verdict_idx + 1])


def main() -> int:
    github_output = Path(sys.argv[1])
    threshold = float(sys.argv[2])
    bench_log = Path(sys.argv[3])
    previous_list = Path(sys.argv[4]) if len(sys.argv) > 4 else None

    lines = bench_log.read_text().splitlines(keepends=True)

    calib = calibration_change(lines)
    if calib is None:
        print(
            "warning: no calibration/fixed_workload change reading in this run — "
            "using raw change% (expected on the first nightly after the "
            "calibration bench ships, before it has a prior baseline)."
        )

    todays: dict[str, str] = {}
    for i, line in enumerate(lines):
        if "Performance has regressed." not in line:
            continue
        name, block = regression_block(lines, i)
        if CALIBRATION_NAME in name:
            continue
        change_line = next((l for l in block.splitlines() if "change:" in l), None)
        if change_line:
            m = CHANGE_RE.search(change_line)
            if m and adjust(_pct(m.group(2)), calib) < threshold:
                continue
        todays[name] = block + "\n"

    CURRENT_LIST.write_text("\n".join(sorted(todays)) + ("\n" if todays else ""))

    if previous_list and previous_list.exists():
        previous = {
            line.strip() for line in previous_list.read_text().splitlines() if line.strip()
        }
        confirmed = {name: blob for name, blob in todays.items() if name in previous}
        gate = "two-day"
    else:
        confirmed = dict(todays)
        gate = "single-run"

    with github_output.open("a") as g:
        g.write(f"gate={gate}\n")
        g.write(f"regressed={'true' if confirmed else 'false'}\n")

    if confirmed:
        ISSUE_BODY.write_text("\n".join(confirmed[n] for n in sorted(confirmed)))
        print(f"== Regressions above {threshold}% [{gate} gate] ==")
        sys.stdout.write(ISSUE_BODY.read_text())
    elif todays:
        print(
            f"{len(todays)} regression(s) above {threshold}% today, "
            f"none also flagged on the previous nightly [{gate} gate]. "
            "Treating as runner variance."
        )
    else:
        print(f"No regressions above {threshold}% threshold.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
