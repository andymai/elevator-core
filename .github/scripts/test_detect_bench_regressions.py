#!/usr/bin/env python3
"""Unit tests for detect-bench-regressions.py.

The detection math is the whole correctness surface of the nightly bench
gate, so this is where it is exercised. Run:
python3 .github/scripts/test_detect_bench_regressions.py
"""

from __future__ import annotations

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "detect_bench_regressions",
    Path(__file__).with_name("detect-bench-regressions.py"),
)
assert _spec and _spec.loader
det = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(det)


def write_estimates(root: Path, means: dict[str, float]) -> None:
    """Lay out a target/criterion tree the way Criterion does."""
    for name, mean in means.items():
        d = root / Path(*name.split("/")) / "new"
        d.mkdir(parents=True, exist_ok=True)
        (d / "estimates.json").write_text(
            json.dumps({"mean": {"point_estimate": mean}, "std_dev": {"point_estimate": 1.0}})
        )


def run_detect(
    means: dict[str, float],
    history: dict[str, list[float]] | None,
    previous: list[str] | None,
    threshold: float = 5.0,
):
    """Drive main(); return (regressed, gate, body, history_after)."""
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        root = d / "criterion"
        write_estimates(root, means)
        hist_path = d / "bench-history.json"
        if history is not None:
            hist_path.write_text(json.dumps({"version": 1, "entries": history}))
        gh_out = d / "gh_output"
        gh_out.write_text("")
        argv = [str(gh_out), str(threshold), str(root), str(hist_path)]
        if previous is not None:
            prev_path = d / "regressions-previous.txt"
            prev_path.write_text("\n".join(previous) + ("\n" if previous else ""))
            argv.append(str(prev_path))

        cwd = os.getcwd()
        old_argv = det.sys.argv
        try:
            os.chdir(d)
            det.sys.argv = ["detect", *argv]
            det.main()
        finally:
            os.chdir(cwd)
            det.sys.argv = old_argv

        out = dict(
            line.split("=", 1) for line in gh_out.read_text().splitlines() if "=" in line
        )
        body_path = d / "regressions.txt"
        body = body_path.read_text() if body_path.exists() else ""
        after = json.loads(hist_path.read_text())["entries"]
        return out.get("regressed"), out.get("gate"), body, after


class MedianBaselineTest(unittest.TestCase):
    def test_regression_above_median_is_flagged(self):
        # Stable at 100, tonight 112 → +12% over median.
        regressed, gate, body, _ = run_detect(
            {"dispatch/10e_50s": 112.0, det.CALIBRATION_NAME: 100.0},
            history={"dispatch/10e_50s": [100.0] * 5, det.CALIBRATION_NAME: [100.0] * 5},
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "true")
        self.assertEqual(gate, "two-day")
        self.assertIn("dispatch/10e_50s", body)

    def test_single_outlier_night_does_not_move_the_baseline(self):
        # This is the property the per-SHA freeze was reaching for. One wild
        # night in history must not become the comparison point.
        history = [100.0, 100.0, 60.0, 100.0, 100.0]  # 60.0 is the outlier
        regressed, _, _, _ = run_detect(
            {"dispatch/10e_50s": 102.0, det.CALIBRATION_NAME: 100.0},
            history={"dispatch/10e_50s": history, det.CALIBRATION_NAME: [100.0] * 5},
            previous=["dispatch/10e_50s"],
        )
        # Median is 100, not 60 — tonight is +2%, under the gate.
        self.assertEqual(regressed, "false")

    def test_uniform_runner_slowdown_cancels(self):
        # Whole suite 12% slower including calibration → adjusted ~0.
        means = {
            "dispatch/10e_50s": 112.0,
            "query_tuple/1000_entities": 112.0,
            det.CALIBRATION_NAME: 112.0,
        }
        hist = {name: [100.0] * 5 for name in means}
        regressed, _, body, _ = run_detect(means, history=hist, previous=list(means))
        self.assertEqual(regressed, "false")
        self.assertEqual(body, "")

    def test_faster_runner_cannot_inflate(self):
        # The #923/#924 shape: calibration 10.9% faster, benches 3% slower.
        # Damping-only holds them at +3%, below the gate.
        means = {
            "dispatch_comparison/etd_50e_200s": 103.0,
            "dispatch_comparison/rsr_50e_200s": 103.0,
            det.CALIBRATION_NAME: 89.135,
        }
        hist = {name: [100.0] * 5 for name in means}
        regressed, _, body, _ = run_detect(means, history=hist, previous=list(means))
        self.assertEqual(regressed, "false")
        self.assertEqual(body, "")

    def test_real_regression_survives_faster_runner(self):
        # Calibration 5% faster but the bench is 20% slower — genuinely
        # diverges, so it must still be reported.
        means = {"dispatch/10e_50s": 120.0, det.CALIBRATION_NAME: 95.0}
        hist = {name: [100.0] * 5 for name in means}
        regressed, _, body, _ = run_detect(means, history=hist, previous=["dispatch/10e_50s"])
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)

    def test_persistence_gate_requires_two_nights(self):
        means = {"dispatch/10e_50s": 120.0, det.CALIBRATION_NAME: 100.0}
        hist = {name: [100.0] * 5 for name in means}
        regressed, gate, _, _ = run_detect(means, history=hist, previous=[])
        self.assertEqual(regressed, "false")
        self.assertEqual(gate, "two-day")

    def test_regression_persists_across_nights_so_gate_can_confirm(self):
        # The property the per-SHA lock destroyed: after a regression lands,
        # it stays above the rolling median on the following night too, so
        # the two-day gate can actually confirm it.
        hist = {"dispatch/10e_50s": [100.0] * 5, det.CALIBRATION_NAME: [100.0] * 5}
        means = {"dispatch/10e_50s": 120.0, det.CALIBRATION_NAME: 100.0}
        n1, _, _, after = run_detect(means, history=hist, previous=[])
        self.assertEqual(n1, "false")  # night one: flagged but unconfirmed
        n2, _, body, _ = run_detect(means, history=after, previous=["dispatch/10e_50s"])
        self.assertEqual(n2, "true")  # night two: confirmed
        self.assertIn("dispatch/10e_50s", body)


class WarmupTest(unittest.TestCase):
    def test_no_history_records_but_does_not_gate(self):
        means = {"dispatch/10e_50s": 500.0, det.CALIBRATION_NAME: 100.0}
        regressed, _, _, after = run_detect(means, history=None, previous=None)
        self.assertEqual(regressed, "false")
        self.assertEqual(after["dispatch/10e_50s"], [500.0])

    def test_below_min_samples_is_not_gated(self):
        hist = {"dispatch/10e_50s": [100.0] * (det.MIN_SAMPLES - 1)}
        means = {"dispatch/10e_50s": 500.0}
        regressed, _, _, _ = run_detect(means, history=hist, previous=["dispatch/10e_50s"])
        self.assertEqual(regressed, "false")

    def test_new_bench_warms_up_without_muting_established_ones(self):
        means = {"dispatch/10e_50s": 120.0, "brand/new": 100.0, det.CALIBRATION_NAME: 100.0}
        hist = {"dispatch/10e_50s": [100.0] * 5, det.CALIBRATION_NAME: [100.0] * 5}
        regressed, _, body, _ = run_detect(means, history=hist, previous=list(means))
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)
        self.assertNotIn("brand/new", body)


class HistoryFileTest(unittest.TestCase):
    def test_tonight_is_appended_after_detection(self):
        hist = {"dispatch/10e_50s": [100.0] * 3, det.CALIBRATION_NAME: [100.0] * 3}
        means = {"dispatch/10e_50s": 108.0, det.CALIBRATION_NAME: 100.0}
        _, _, _, after = run_detect(means, history=hist, previous=None)
        self.assertEqual(after["dispatch/10e_50s"], [100.0, 100.0, 100.0, 108.0])

    def test_history_is_capped(self):
        hist = {"dispatch/10e_50s": [100.0] * (det.HISTORY_LEN + 4)}
        means = {"dispatch/10e_50s": 100.0}
        _, _, _, after = run_detect(means, history=hist, previous=None)
        self.assertEqual(len(after["dispatch/10e_50s"]), det.HISTORY_LEN)

    def test_corrupt_history_is_treated_as_empty(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "h.json"
            p.write_text("{not json")
            self.assertEqual(det.load_history(p), {})

    def test_missing_calibration_falls_back_to_raw(self):
        # calibration_bench produced nothing this run: detection must still
        # work, gating on the raw change vs median.
        means = {"dispatch/10e_50s": 120.0}
        hist = {"dispatch/10e_50s": [100.0] * 5}
        regressed, _, body, _ = run_detect(means, history=hist, previous=["dispatch/10e_50s"])
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)

    def test_calibration_never_reported(self):
        means = {det.CALIBRATION_NAME: 200.0}
        hist = {det.CALIBRATION_NAME: [100.0] * 5}
        regressed, _, body, _ = run_detect(means, history=hist, previous=[det.CALIBRATION_NAME])
        self.assertEqual(regressed, "false")
        self.assertNotIn(det.CALIBRATION_NAME, body)


class HelperMathTest(unittest.TestCase):
    def test_adjust_cancels_matching_scale(self):
        self.assertAlmostEqual(det.adjust(12.0, 12.0), 0.0, places=6)

    def test_adjust_never_exceeds_raw(self):
        self.assertAlmostEqual(det.adjust(3.0, -10.865), 3.0, places=6)

    def test_adjust_fallback_when_none(self):
        self.assertEqual(det.adjust(12.0, None), 12.0)

    def test_adjust_absurd_scale_falls_back(self):
        self.assertEqual(det.adjust(12.0, -150.0), 12.0)

    def test_pct_above_median_uses_median_not_mean(self):
        # Mean of this is 92, median is 100 — must use the median.
        self.assertAlmostEqual(det.pct_above_median(110.0, [100.0, 100.0, 60.0, 100.0]), 10.0)

    def test_read_today_parses_criterion_layout(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "criterion"
            write_estimates(root, {"dispatch_comparison/etd_50e_200s": 9_223_500.0})
            got = det.read_today(str(root))
            self.assertEqual(got, {"dispatch_comparison/etd_50e_200s": 9_223_500.0})

    def test_read_today_handles_a_bench_group_named_criterion(self):
        # Resolving the id relative to root (rather than by locating a
        # "criterion" path component) keeps this from silently mis-keying.
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "criterion"
            write_estimates(root, {"some_group/criterion": 100.0})
            self.assertEqual(det.read_today(str(root)), {"some_group/criterion": 100.0})

    def test_read_today_ignores_root_named_something_else(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / "not-criterion"
            write_estimates(root, {"a/b": 12.0})
            self.assertEqual(det.read_today(str(root)), {"a/b": 12.0})


if __name__ == "__main__":
    unittest.main()
