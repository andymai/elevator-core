#!/usr/bin/env python3
"""Unit tests for filter-bench-regressions.py.

The regression math lives entirely in the filter, so this is the real
correctness gate for the calibration-relative detection (issues
#907/#908/#913/#914/#916). Run: python3 .github/scripts/test_filter_bench_regressions.py
"""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "filter_bench_regressions",
    Path(__file__).with_name("filter-bench-regressions.py"),
)
assert _spec and _spec.loader
flt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(flt)


def _fmt(v: float) -> str:
    # Match criterion: ASCII '+' for positives, Unicode minus for negatives.
    return f"+{v:.4f}" if v >= 0 else f"−{abs(v):.4f}"


def bench_block(name: str, change_pct: float, regressed: bool) -> str:
    verdict = (
        "Performance has regressed." if regressed else "No change in performance."
    )
    lo, hi = change_pct - 1.0, change_pct + 1.0
    return (
        f"{name}\n"
        f"                        time:   [10.0 µs 11.0 µs 12.0 µs]\n"
        f"                        change: [{_fmt(lo)}% {_fmt(change_pct)}% {_fmt(hi)}%] (p = 0.00 < 0.05)\n"
        f"                        {verdict}\n\n"
    )


def run_filter(log_text: str, previous: list[str] | None, threshold: float = 5.0):
    """Drive main() over a synthetic log; return (regressed, gate, issue_body)."""
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        log = d / "bench-output.log"
        log.write_text(log_text)
        gh_out = d / "gh_output"
        gh_out.write_text("")
        argv = [str(gh_out), str(threshold), str(log)]
        prev_path = None
        if previous is not None:
            prev_path = d / "regressions-previous.txt"
            prev_path.write_text("\n".join(previous) + ("\n" if previous else ""))
            argv.append(str(prev_path))

        # main() writes regressions-current.txt / regressions.txt relative to
        # cwd, so run it inside the temp dir.
        import os

        cwd = os.getcwd()
        old_argv = flt.sys.argv
        try:
            os.chdir(d)
            flt.sys.argv = ["filter", *argv]
            flt.main()
        finally:
            os.chdir(cwd)
            flt.sys.argv = old_argv

        out = dict(
            line.split("=", 1)
            for line in gh_out.read_text().splitlines()
            if "=" in line
        )
        body_path = d / "regressions.txt"
        body = body_path.read_text() if body_path.exists() else ""
        return out.get("regressed"), out.get("gate"), body


class CalibrationAdjustmentTest(unittest.TestCase):
    def test_uniform_runner_scale_is_cancelled(self):
        # Every bench +12%, calibration also +12% → adjusted ≈ 0 → not a
        # regression even though yesterday flagged the same names.
        names = ["query_tuple/10000_entities", "dispatch/10e_50s"]
        log = "".join(bench_block(n, 12.0, True) for n in names)
        log += bench_block(flt.CALIBRATION_NAME, 12.0, True)
        regressed, _, body = run_filter(log, previous=names)
        self.assertEqual(regressed, "false")
        self.assertEqual(body, "")

    def test_real_single_bench_regression_survives(self):
        # One bench +12%, calibration flat → adjusted ≈ +12% → confirmed.
        log = bench_block("dispatch/10e_50s", 12.0, True)
        log += bench_block("query_tuple/10000_entities", 0.2, False)
        log += bench_block(flt.CALIBRATION_NAME, 0.0, False)
        regressed, gate, body = run_filter(log, previous=["dispatch/10e_50s"])
        self.assertEqual(regressed, "true")
        self.assertEqual(gate, "two-day")
        self.assertIn("dispatch/10e_50s", body)

    def test_runner_faster_never_regresses(self):
        # Benches +2%, calibration +10% → adjusted negative → filtered.
        names = ["query_tuple/10000_entities"]
        log = "".join(bench_block(n, 2.0, True) for n in names)
        log += bench_block(flt.CALIBRATION_NAME, 10.0, False)
        regressed, _, _ = run_filter(log, previous=names)
        self.assertEqual(regressed, "false")

    def test_negative_calibration_unicode_minus_parses(self):
        # Runner slightly faster than baseline (calibration −4%, Unicode minus)
        # while one bench genuinely regressed +9% → adjusted ≈ +13.5% survives.
        log = bench_block("dispatch/10e_50s", 9.0, True)
        log += bench_block(flt.CALIBRATION_NAME, -4.0, False)
        regressed, _, body = run_filter(log, previous=["dispatch/10e_50s"])
        self.assertEqual(flt.calibration_change(log.splitlines(keepends=True)), -4.0)
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)

    def test_calibration_missing_falls_back_to_raw(self):
        # No calibration line at all → raw change% gates (old behavior).
        names = ["query_tuple/10000_entities"]
        log = "".join(bench_block(n, 12.0, True) for n in names)
        regressed, _, body = run_filter(log, previous=names)
        self.assertEqual(regressed, "true")
        self.assertIn("query_tuple/10000_entities", body)

    def test_calibration_never_reported(self):
        # Calibration flagged as regressed by criterion must not appear in the
        # findings, and must not itself trip the gate.
        log = bench_block(flt.CALIBRATION_NAME, 30.0, True)
        regressed, _, body = run_filter(log, previous=[flt.CALIBRATION_NAME])
        self.assertEqual(regressed, "false")
        self.assertNotIn(flt.CALIBRATION_NAME, body)


class NameExtractionTest(unittest.TestCase):
    def test_throughput_line_does_not_shift_name(self):
        # A Throughput-configured bench adds a `thrpt:` line — the name must
        # still resolve, and a regressed calibration entry with a thrpt line
        # must still be skipped (greptile/cubic P2).
        block = (
            f"{flt.CALIBRATION_NAME}\n"
            "                        time:   [3.0 ms 3.1 ms 3.2 ms]\n"
            "                        thrpt:  [1.0 elem/s 1.1 elem/s 1.2 elem/s]\n"
            "                        change: [+11.0% +12.0% +13.0%] (p = 0.00 < 0.05)\n"
            "                        Performance has regressed.\n\n"
        )
        regressed, _, body = run_filter(block, previous=[flt.CALIBRATION_NAME])
        self.assertEqual(regressed, "false")
        self.assertNotIn("time:", body)

    def test_same_line_name_and_time(self):
        # Criterion prints short ids as `<id>  time: [...]` on one line.
        log = (
            "query_riders/100_riders time:   [18.0 µs 18.4 µs 18.9 µs]\n"
            "                        change: [+11.0% +12.0% +13.0%] (p = 0.00 < 0.05)\n"
            "                        Performance has regressed.\n\n"
        )
        log += bench_block(flt.CALIBRATION_NAME, 0.0, False)
        _, _, body = run_filter(log, previous=["query_riders/100_riders"])
        self.assertIn("query_riders/100_riders", body)
        # The persisted name must be the bare id, not the id+time string.
        name, _ = flt.regression_block(log.splitlines(keepends=True), 2)
        self.assertEqual(name, "query_riders/100_riders")


class HelperMathTest(unittest.TestCase):
    def test_adjust_cancels_matching_scale(self):
        self.assertAlmostEqual(flt.adjust(12.0, 12.0), 0.0, places=6)

    def test_adjust_fallback_when_none(self):
        self.assertEqual(flt.adjust(12.0, None), 12.0)

    def test_adjust_absurd_scale_falls_back(self):
        self.assertEqual(flt.adjust(12.0, -150.0), 12.0)


if __name__ == "__main__":
    unittest.main()
