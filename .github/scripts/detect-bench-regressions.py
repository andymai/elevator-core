#!/usr/bin/env python3
"""Detect bench regressions against a rolling median of comparable nightlies.

Baseline selection is machine-stratified. The `ubuntu-latest` pool cycles
between a handful of distinct CPU SKUs, and the spread between them dwarfs
the effect sizes worth alerting on: across 25 consecutive nightlies with no
change to simulation code, whole-suite swings of -20% to +12% tracked which
SKU the run landed on. A median taken over *all* recent nightlies therefore
blends hardware, and a bench compared against it is measured mostly by which
machine it drew rather than by its code.

The synthetic `calibration/fixed_workload` bench (benches/calibration_bench.rs,
no elevator-core code) identifies the SKU: its reading is sharply quantized,
clustering within 1% for repeat visits to the same machine class while classes
sit 10-15% apart. Only prior nightlies whose calibration lands within
MACHINE_TOL of tonight's are eligible as baseline samples, so the comparison is
like-for-like hardware. Nights on a machine class with too little history are
recorded but not gated, which is why HISTORY_LEN spans several weeks: a class
seen occasionally still accumulates MIN_SAMPLES within the window.

Within a class the residual runner drift is divided out from each bench and
clamped to damping-only: the adjustment may shrink a reported regression but
never inflate one. Calibration is memory-bandwidth-bound while the sim benches
are branch-bound, so the two diverge and an unclamped divide-out turns a small
noise reading into a large one (#923/#924).

Detection deliberately does not use Criterion's own `change:` lines. Those
compare against a per-SHA-locked baseline that froze on the first nightly to
measure a commit, making a real regression visible for exactly one night and
re-locking the baseline that same night. Since the issue-open gate requires a
bench to regress on two consecutive nightlies, that pairing could only ever
confirm same-SHA noise. The rolling median read from machine-readable
estimates.json is what makes the persistence gate meaningful: it stays put
night to night, so a real regression keeps clearing the threshold until enough
post-regression samples accumulate to move it.

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

# Nightlies retained. Baseline samples are drawn only from those matching
# tonight's machine class, so the window must span enough nights for an
# infrequent class to reach MIN_SAMPLES. Three weeks covers a class seen on
# roughly one night in five.
HISTORY_LEN = 21

# Most recent same-class nightlies contributing to a bench's median. Capped
# below HISTORY_LEN so a regression that lands is not held down indefinitely
# by a long tail of pre-regression samples.
BASELINE_SAMPLES = 7

# Below this many comparable samples the median is not trustworthy, so the
# bench is recorded but not gated. Applies per bench, so a newly added bench
# warms up without suppressing detection on established ones.
MIN_SAMPLES = 3

# Relative calibration spread within which two nightlies count as the same
# machine class. Repeat visits to one class hold within 1%; the nearest
# distinct classes sit ~10% apart, so this separates them with wide margin.
MACHINE_TOL = 0.03


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


def _clean_nightly(raw: object) -> dict[str, float] | None:
    if not isinstance(raw, dict):
        return None
    vals = {
        name: float(v)
        for name, v in raw.items()
        if isinstance(name, str) and isinstance(v, (int, float)) and v > 0
    }
    return vals or None


def load_history(path: Path) -> list[dict[str, float]]:
    """Nightlies oldest-first, each a bench-name -> ns mapping.

    Accepts the older per-bench-list layout by transposing it, which keeps a
    cached history usable instead of forcing a multi-week warm-up. Only
    columns holding a sample for every retained night are transposed: that
    layout appended once per nightly per bench that reported, so a bench
    missing from any night leaves a gap indistinguishable from a short tail.
    Guessing where the gap falls would pair its samples with another night's
    calibration and stratify on the wrong machine class, so short columns are
    dropped and left to warm up.
    """
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(raw, dict):
        return []

    nightlies = raw.get("nightlies")
    if isinstance(nightlies, list):
        out = [n for n in (_clean_nightly(r) for r in nightlies) if n]
        return out[-HISTORY_LEN:]

    entries = raw.get("entries")
    if not isinstance(entries, dict):
        return []
    columns = {
        name: [float(s) for s in samples if isinstance(s, (int, float)) and s > 0]
        for name, samples in entries.items()
        if isinstance(name, str) and isinstance(samples, list)
    }
    columns = {name: vals for name, vals in columns.items() if vals}
    if not columns:
        return []
    depth = max(len(v) for v in columns.values())
    aligned = {name: vals for name, vals in columns.items() if len(vals) == depth}
    if CALIBRATION_NAME not in aligned:
        # Without a calibration sample per night the machine class is unknown
        # for every rebuilt night, which is the whole point of the history.
        return []
    return [{name: vals[k] for name, vals in aligned.items()} for k in range(depth)][-HISTORY_LEN:]


def save_history(path: Path, history: list[dict[str, float]], today: dict[str, float]) -> None:
    merged = [*history, dict(today)][-HISTORY_LEN:]
    path.write_text(json.dumps({"version": 2, "nightlies": merged}, indent=1) + "\n")


def comparable(history: list[dict[str, float]], calib_today: float | None) -> list[dict[str, float]]:
    """Prior nightlies measured on the same machine class as tonight.

    Without a calibration reading the class is unknown, so every nightly stays
    eligible — a wider baseline is better than none, and the caller warns.
    """
    if calib_today is None or calib_today <= 0:
        return history
    out = []
    for night in history:
        prior = night.get(CALIBRATION_NAME)
        if prior and abs(prior / calib_today - 1.0) <= MACHINE_TOL:
            out.append(night)
    return out


def adjust(change_pct: float, calib_pct: float | None) -> float:
    """Divide the residual runner-speed factor out, clamped to damping-only.

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


def samples_for(name: str, nights: list[dict[str, float]]) -> list[float]:
    return [v for v in (night.get(name) for night in nights) if v][-BASELINE_SAMPLES:]


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
        f"    median of {len(samples)} comparable nightlies: {fmt_ns(med)}\n"
        f"    tonight:                          {fmt_ns(today)}\n"
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

    calib_today = today.get(CALIBRATION_NAME)
    if calib_today is None:
        print(
            f"warning: {CALIBRATION_NAME} produced no measurement this run — "
            "machine class unknown, comparing against every retained nightly. "
            "This is not expected; check whether calibration_bench failed."
        )
    nights = comparable(history, calib_today)
    print(
        f"{len(nights)} of {len(history)} retained nightlies match tonight's machine class"
        + (f" (calibration {fmt_ns(calib_today)})" if calib_today else "")
    )

    # Residual drift within the class. Stratification removes the between-SKU
    # step; this catches whatever spread is left inside one class.
    calib = None
    if calib_today is not None:
        calib = pct_above_median(calib_today, samples_for(CALIBRATION_NAME, nights))

    todays: dict[str, str] = {}
    for name, value in sorted(today.items()):
        if name == CALIBRATION_NAME:
            continue
        samples = samples_for(name, nights)
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
