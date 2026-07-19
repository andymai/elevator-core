#!/usr/bin/env python3
"""Detect bench regressions against a rolling median of the last N nightlies.

Detection deliberately does not use Criterion's own `change:` lines, which
compare against a per-SHA-locked baseline. That pairing could not work:
the baseline froze on the *first* nightly to measure a commit, so a
genuine regression was visible for exactly one night (the nightly right
after the new SHA landed, compared against the prior SHA) and that same
night re-locked the baseline. Every later night compared the SHA against
itself, where no code difference exists. Because the issue-open gate
requires a bench to regress on two *consecutive* nightlies, it could only
ever confirm noise — which does recur on same-SHA nights — and never a real
regression. Issues #923/#924 are that failure mode.

Here the baseline is instead the per-bench median of the last N nightly
measurements, read from Criterion's machine-readable estimates.json rather
than from its change lines. Two properties follow:

- A single unusually fast or slow runner moves the median by at most one
  sample out of N, so the comparison point stays stable night to night.
  That is what the per-SHA freeze was reaching for, without freezing.
- A real regression stays above the median for several consecutive nights
  after it lands (until enough post-regression samples accumulate to drag
  the median up), so the two-day persistence gate can finally confirm one.

Runner-speed variance is still divided out using the synthetic
`calibration/fixed_workload` bench, computed the same way (tonight vs its
own median). The adjustment is clamped to damping-only: it may shrink a
reported regression but never inflate one, because calibration is
memory-bandwidth-bound while the sim benches are branch-bound and the two
diverge across runner instances.

Args:
    sys.argv[1]: path to append `regressed=`/`gate=` outputs to ($GITHUB_OUTPUT).
    sys.argv[2]: minimum calibration-adjusted % above median to alert on.
    sys.argv[3]: Criterion output root (target/criterion).
    sys.argv[4]: rolling history JSON path, read then rewritten in place.
    sys.argv[5] (optional): previous nightly's regression-name list. Absent
        file falls back to single-run behaviour.
"""

from __future__ import annotations

import glob
import json
import os
import statistics
import sys
from pathlib import Path

CURRENT_LIST = Path("regressions-current.txt")
ISSUE_BODY = Path("regressions.txt")

CALIBRATION_NAME = "calibration/fixed_workload"

# Nightlies retained per bench. Seven keeps a week of history, so a single
# outlier runner is outvoted while a real regression still takes over the
# median within a week of landing.
HISTORY_LEN = 7

# Below this many prior samples the median is not yet trustworthy, so the
# bench is recorded but not gated. Applies per bench, so a newly added
# bench warms up without suppressing detection on established ones.
MIN_SAMPLES = 3


def read_today(root: str) -> dict[str, float]:
    """Per-bench mean estimate in ns, keyed by criterion id.

    Names come from the directory path rather than the log: Criterion drops
    the name prefix in non-TTY runs, which is why criterion-to-bencher.py
    reads the paths too. The id is taken relative to `root` rather than by
    locating a "criterion" path component, so a bench group named
    `criterion` cannot shift the split and silently yield the wrong key.
    """
    out: dict[str, float] = {}
    pattern = os.path.join(root, "**", "new", "estimates.json")
    for est in sorted(glob.glob(pattern, recursive=True)):
        parts = os.path.relpath(est, root).split(os.sep)
        if len(parts) < 3 or parts[-2:] != ["new", "estimates.json"]:
            continue
        name = "/".join(parts[:-2])
        try:
            with open(est) as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue
        mean = (data.get("mean") or {}).get("point_estimate")
        if isinstance(mean, (int, float)) and mean > 0:
            out[name] = float(mean)
    return out


def load_history(path: Path) -> dict[str, list[float]]:
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return {}
    entries = raw.get("entries") if isinstance(raw, dict) else None
    if not isinstance(entries, dict):
        return {}
    clean: dict[str, list[float]] = {}
    for name, samples in entries.items():
        if isinstance(samples, list):
            vals = [float(s) for s in samples if isinstance(s, (int, float)) and s > 0]
            if vals:
                clean[name] = vals[-HISTORY_LEN:]
    return clean


def save_history(path: Path, history: dict[str, list[float]], today: dict[str, float]) -> None:
    merged = {name: list(samples) for name, samples in history.items()}
    for name, value in today.items():
        merged.setdefault(name, []).append(value)
        merged[name] = merged[name][-HISTORY_LEN:]
    path.write_text(json.dumps({"version": 1, "entries": merged}, indent=1, sort_keys=True) + "\n")


def adjust(change_pct: float, calib_pct: float | None) -> float:
    """Divide the runner-speed factor out, clamped to damping-only.

    Without the clamp a faster-than-baseline runner amplifies rather than
    cancels: calibration -10.87% against a bench at +3% yields +15.6%, which
    is how #923/#924 cleared a 5% gate on a 3% reading.
    """
    if calib_pct is None:
        return change_pct
    scale = 1.0 + calib_pct / 100.0
    if scale <= 0.0:  # absurd reading — don't trust it, fall back to raw
        return change_pct
    adjusted = ((1.0 + change_pct / 100.0) / scale - 1.0) * 100.0
    return min(adjusted, change_pct)


def pct_above_median(value: float, samples: list[float]) -> float | None:
    """Percent by which `value` exceeds the median of `samples`."""
    if len(samples) < MIN_SAMPLES:
        return None
    med = statistics.median(samples)
    if med <= 0:
        return None
    return (value / med - 1.0) * 100.0


def fmt_ns(ns: float) -> str:
    for unit, scale in (("s", 1e9), ("ms", 1e6), ("µs", 1e3)):
        if ns >= scale:
            return f"{ns / scale:.4g} {unit}"
    return f"{ns:.4g} ns"


def block(name: str, today: float, samples: list[float], raw: float, adjusted: float) -> str:
    med = statistics.median(samples)
    note = "" if abs(adjusted - raw) < 0.005 else f"  (calibration-adjusted from {raw:+.2f}%)"
    return (
        f"{name}\n"
        f"    median of last {len(samples)} nightlies: {fmt_ns(med)}\n"
        f"    tonight:                       {fmt_ns(today)}\n"
        f"    change: {adjusted:+.2f}%{note}\n\n"
    )


def main() -> int:
    github_output = Path(sys.argv[1])
    threshold = float(sys.argv[2])
    criterion_root = sys.argv[3]
    history_path = Path(sys.argv[4])
    previous_list = Path(sys.argv[5]) if len(sys.argv) > 5 else None

    today = read_today(criterion_root)
    if not today:
        sys.exit(f"detect-bench-regressions: no estimates found under {criterion_root}")
    history = load_history(history_path)

    # Distinguish the two ways calibration can be unavailable: a warming-up
    # history is expected and benign, a missing bench means calibration_bench
    # did not produce a result this run and wants investigating.
    calib = None
    if CALIBRATION_NAME not in today:
        print(
            f"warning: {CALIBRATION_NAME} produced no measurement this run — "
            "runner-speed adjustment disabled, gating on raw change vs median. "
            "This is not expected; check whether calibration_bench failed."
        )
    else:
        calib = pct_above_median(today[CALIBRATION_NAME], history.get(CALIBRATION_NAME, []))
        if calib is None:
            print(
                f"warning: {CALIBRATION_NAME} has fewer than {MIN_SAMPLES} nightlies "
                "of history — gating on raw change vs median until it warms up."
            )

    todays: dict[str, str] = {}
    for name, value in sorted(today.items()):
        if name == CALIBRATION_NAME:
            continue
        samples = history.get(name, [])
        raw = pct_above_median(value, samples)
        if raw is None:
            continue
        adjusted = adjust(raw, calib)
        if adjusted >= threshold:
            todays[name] = block(name, value, samples, raw, adjusted)

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

    # Written after detection so tonight's sample never influences the median
    # it was compared against.
    save_history(history_path, history, today)

    with github_output.open("a") as g:
        g.write(f"gate={gate}\n")
        g.write(f"regressed={'true' if confirmed else 'false'}\n")

    if confirmed:
        ISSUE_BODY.write_text("".join(confirmed[n] for n in sorted(confirmed)))
        print(f"== Regressions above {threshold}% vs median [{gate} gate] ==")
        sys.stdout.write(ISSUE_BODY.read_text())
    elif todays:
        print(
            f"{len(todays)} regression(s) above {threshold}% vs median today, "
            f"none also flagged on the previous nightly [{gate} gate]. "
            "Treating as runner variance."
        )
    else:
        print(f"No regressions above {threshold}% vs the rolling median.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
