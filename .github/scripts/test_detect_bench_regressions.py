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

CAL = det.CALIBRATION_NAME


def write_estimates(root: Path, means: dict[str, float]) -> None:
    """Lay out a target/criterion tree the way Criterion does."""
    for name, mean in means.items():
        d = root / Path(*name.split("/")) / "new"
        d.mkdir(parents=True, exist_ok=True)
        (d / "estimates.json").write_text(
            json.dumps({"mean": {"point_estimate": mean}, "std_dev": {"point_estimate": 1.0}})
        )


def nights(count: int, **benches: float) -> list[dict[str, float]]:
    """`count` identical nightlies, each holding the given bench means."""
    return [dict(benches) for _ in range(count)]


def column(history: list[dict[str, float]], name: str) -> list[float]:
    return [n[name] for n in history if name in n]


def run_detect(
    means: dict[str, float],
    history: dict[str, list[float]] | list[dict[str, float]] | None,
    previous: list[str] | None,
    threshold: float = 5.0,
):
    """Drive main(); return (regressed, gate, body, history_after).

    `history` accepts the current per-nightly list or the older per-bench
    column layout, so the migration path stays covered by the same cases.
    """
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        root = d / "criterion"
        write_estimates(root, means)
        hist_path = d / "bench-history.json"
        if isinstance(history, list):
            hist_path.write_text(json.dumps({"version": 2, "nightlies": history}))
        elif history is not None:
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
        after = json.loads(hist_path.read_text())["nightlies"]
        return out.get("regressed"), out.get("gate"), body, after


class MedianBaselineTest(unittest.TestCase):
    def test_regression_above_median_is_flagged(self):
        # Stable at 100, tonight 112 → +12% over median.
        regressed, gate, body, _ = run_detect(
            {"dispatch/10e_50s": 112.0, CAL: 100.0},
            history=nights(5, **{"dispatch/10e_50s": 100.0, CAL: 100.0}),
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "true")
        self.assertEqual(gate, "two-day")
        self.assertIn("dispatch/10e_50s", body)

    def test_single_outlier_night_does_not_move_the_baseline(self):
        # One wild night in history must not become the comparison point.
        history = [
            {"dispatch/10e_50s": v, CAL: 100.0} for v in (100.0, 100.0, 60.0, 100.0, 100.0)
        ]
        regressed, _, _, _ = run_detect(
            {"dispatch/10e_50s": 102.0, CAL: 100.0},
            history=history,
            previous=["dispatch/10e_50s"],
        )
        # Median is 100, not 60 — tonight is +2%, under the gate.
        self.assertEqual(regressed, "false")

    def test_uniform_runner_slowdown_within_a_class_cancels(self):
        # Whole suite 2% slower including calibration → adjusted ~0. The step
        # stays inside MACHINE_TOL, so it is residual drift rather than a
        # different machine class.
        means = {
            "dispatch/10e_50s": 102.0,
            "query_tuple/1000_entities": 102.0,
            CAL: 102.0,
        }
        regressed, _, body, _ = run_detect(
            means, history=nights(5, **{k: 100.0 for k in means}), previous=list(means)
        )
        self.assertEqual(regressed, "false")
        self.assertEqual(body, "")

    def test_faster_runner_cannot_inflate(self):
        # The #923/#924 shape: calibration faster, benches 3% slower.
        # Damping-only holds them at +3%, below the gate.
        means = {
            "dispatch_comparison/etd_50e_200s": 103.0,
            "dispatch_comparison/rsr_50e_200s": 103.0,
            CAL: 97.5,
        }
        regressed, _, body, _ = run_detect(
            means, history=nights(5, **{k: 100.0 for k in means}), previous=list(means)
        )
        self.assertEqual(regressed, "false")
        self.assertEqual(body, "")

    def test_real_regression_survives_faster_runner(self):
        # Calibration slightly faster but the bench is 20% slower — genuinely
        # diverges, so it must still be reported.
        means = {"dispatch/10e_50s": 120.0, CAL: 98.0}
        regressed, _, body, _ = run_detect(
            means,
            history=nights(5, **{"dispatch/10e_50s": 100.0, CAL: 100.0}),
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)

    def test_persistence_gate_requires_two_nights(self):
        means = {"dispatch/10e_50s": 120.0, CAL: 100.0}
        regressed, gate, _, _ = run_detect(
            means, history=nights(5, **{"dispatch/10e_50s": 100.0, CAL: 100.0}), previous=[]
        )
        self.assertEqual(regressed, "false")
        self.assertEqual(gate, "two-day")

    def test_regression_persists_across_nights_so_gate_can_confirm(self):
        # After a regression lands it stays above the rolling median on the
        # following night too, so the two-day gate can actually confirm it.
        hist = nights(5, **{"dispatch/10e_50s": 100.0, CAL: 100.0})
        means = {"dispatch/10e_50s": 120.0, CAL: 100.0}
        n1, _, _, after = run_detect(means, history=hist, previous=[])
        self.assertEqual(n1, "false")  # night one: flagged but unconfirmed
        n2, _, body, _ = run_detect(means, history=after, previous=["dispatch/10e_50s"])
        self.assertEqual(n2, "true")  # night two: confirmed
        self.assertIn("dispatch/10e_50s", body)


class MachineStratificationTest(unittest.TestCase):
    """The `ubuntu-latest` pool cycles between CPU SKUs 10-15% apart."""

    def _mixed_pool(self):
        # Five nightlies on the fast class, four on a class 15% slower.
        return nights(5, **{"dispatch/10e_50s": 100.0, CAL: 100.0}) + nights(
            4, **{"dispatch/10e_50s": 115.0, CAL: 115.0}
        )

    def test_slow_machine_is_compared_against_its_own_class(self):
        # Tonight lands on the slow class and is normal *for that class*.
        # Blending both classes would put the median at 100 and report +18%.
        regressed, _, body, _ = run_detect(
            {"dispatch/10e_50s": 118.0, CAL: 115.0},
            history=self._mixed_pool(),
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "false")
        self.assertEqual(body, "")

    def test_regression_on_a_slow_machine_is_still_caught(self):
        # Stratification must not blunt detection: same slow class, but the
        # bench is 22% above where that class normally sits.
        regressed, _, body, _ = run_detect(
            {"dispatch/10e_50s": 140.0, CAL: 115.0},
            history=self._mixed_pool(),
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)

    def test_fast_machine_does_not_read_as_an_improvement_then_regression(self):
        # Tonight lands on the fast class and is normal for it.
        regressed, _, _, _ = run_detect(
            {"dispatch/10e_50s": 101.0, CAL: 100.0},
            history=self._mixed_pool(),
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "false")

    def test_unseen_machine_class_is_recorded_but_not_gated(self):
        # Only one prior nightly on this class — below MIN_SAMPLES.
        history = nights(6, **{"dispatch/10e_50s": 100.0, CAL: 100.0}) + nights(
            1, **{"dispatch/10e_50s": 130.0, CAL: 130.0}
        )
        regressed, _, _, after = run_detect(
            {"dispatch/10e_50s": 400.0, CAL: 130.0},
            history=history,
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "false")
        self.assertEqual(column(after, "dispatch/10e_50s")[-1], 400.0)

    def test_within_tolerance_counts_as_the_same_class(self):
        # Repeat visits to one SKU hold within ~1%, well inside MACHINE_TOL.
        history = [
            {"dispatch/10e_50s": 100.0, CAL: c} for c in (100.0, 100.5, 99.4, 100.8, 99.7)
        ]
        regressed, _, body, _ = run_detect(
            {"dispatch/10e_50s": 120.0, CAL: 100.2},
            history=history,
            previous=["dispatch/10e_50s"],
        )
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)

    def test_comparable_keeps_everything_when_class_is_unknown(self):
        history = nights(3, **{CAL: 100.0}) + nights(3, **{CAL: 130.0})
        self.assertEqual(det.comparable(history, None), history)

    def test_baseline_is_capped_at_baseline_samples(self):
        # A long same-class tail must not hold a landed regression down: only
        # the most recent BASELINE_SAMPLES contribute.
        old = nights(det.BASELINE_SAMPLES + 3, **{"dispatch/10e_50s": 100.0, CAL: 100.0})
        recent = nights(det.BASELINE_SAMPLES, **{"dispatch/10e_50s": 200.0, CAL: 100.0})
        regressed, _, _, _ = run_detect(
            {"dispatch/10e_50s": 205.0, CAL: 100.0},
            history=old + recent,
            previous=["dispatch/10e_50s"],
        )
        # Median of the last BASELINE_SAMPLES is 200, so tonight is +2.5%.
        self.assertEqual(regressed, "false")


class WarmupTest(unittest.TestCase):
    def test_no_history_records_but_does_not_gate(self):
        means = {"dispatch/10e_50s": 500.0, CAL: 100.0}
        regressed, _, _, after = run_detect(means, history=None, previous=None)
        self.assertEqual(regressed, "false")
        self.assertEqual(column(after, "dispatch/10e_50s"), [500.0])

    def test_below_min_samples_is_not_gated(self):
        hist = nights(det.MIN_SAMPLES - 1, **{"dispatch/10e_50s": 100.0})
        regressed, _, _, _ = run_detect(
            {"dispatch/10e_50s": 500.0}, history=hist, previous=["dispatch/10e_50s"]
        )
        self.assertEqual(regressed, "false")

    def test_new_bench_warms_up_without_muting_established_ones(self):
        means = {"dispatch/10e_50s": 120.0, "brand/new": 100.0, CAL: 100.0}
        hist = nights(5, **{"dispatch/10e_50s": 100.0, CAL: 100.0})
        regressed, _, body, _ = run_detect(means, history=hist, previous=list(means))
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)
        self.assertNotIn("brand/new", body)


class HistoryFileTest(unittest.TestCase):
    def test_tonight_is_appended_after_detection(self):
        hist = nights(3, **{"dispatch/10e_50s": 100.0, CAL: 100.0})
        means = {"dispatch/10e_50s": 108.0, CAL: 100.0}
        _, _, _, after = run_detect(means, history=hist, previous=None)
        self.assertEqual(column(after, "dispatch/10e_50s"), [100.0, 100.0, 100.0, 108.0])

    def test_history_is_capped(self):
        hist = nights(det.HISTORY_LEN + 4, **{"dispatch/10e_50s": 100.0, CAL: 100.0})
        _, _, _, after = run_detect(
            {"dispatch/10e_50s": 100.0, CAL: 100.0}, history=hist, previous=None
        )
        self.assertEqual(len(after), det.HISTORY_LEN)

    def test_legacy_column_history_is_transposed_not_discarded(self):
        # Columns were appended once per nightly, so index k lines up across
        # benches. Rebuilding keeps a cached history usable.
        legacy = {"dispatch/10e_50s": [100.0, 115.0, 100.0], CAL: [100.0, 115.0, 100.0]}
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "h.json"
            p.write_text(json.dumps({"version": 1, "entries": legacy}))
            got = det.load_history(p)
        self.assertEqual(
            got,
            [
                {"dispatch/10e_50s": 100.0, CAL: 100.0},
                {"dispatch/10e_50s": 115.0, CAL: 115.0},
                {"dispatch/10e_50s": 100.0, CAL: 100.0},
            ],
        )

    def test_legacy_short_column_is_dropped_not_guessed(self):
        # A short column is ambiguous: the bench may have been added late or
        # may have failed on an intermediate night. Guessing would pair its
        # samples with another night's calibration and stratify on the wrong
        # machine class, so it warms up instead.
        legacy = {"old/bench": [1.0, 2.0, 3.0], "new/bench": [9.0], CAL: [10.0, 20.0, 30.0]}
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "h.json"
            p.write_text(json.dumps({"version": 1, "entries": legacy}))
            got = det.load_history(p)
        self.assertEqual(
            got,
            [
                {"old/bench": 1.0, CAL: 10.0},
                {"old/bench": 2.0, CAL: 20.0},
                {"old/bench": 3.0, CAL: 30.0},
            ],
        )

    def test_legacy_history_without_full_calibration_is_discarded(self):
        # Every rebuilt night needs a calibration sample; without one the
        # machine class is unknowable and the history has no value.
        legacy = {"old/bench": [1.0, 2.0, 3.0], CAL: [10.0]}
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "h.json"
            p.write_text(json.dumps({"version": 1, "entries": legacy}))
            self.assertEqual(det.load_history(p), [])

    def test_corrupt_history_is_treated_as_empty(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "h.json"
            p.write_text("{not json")
            self.assertEqual(det.load_history(p), [])

    def test_missing_calibration_falls_back_to_raw(self):
        # calibration_bench produced nothing this run: detection must still
        # work, gating on the raw change vs median.
        hist = nights(5, **{"dispatch/10e_50s": 100.0})
        regressed, _, body, _ = run_detect(
            {"dispatch/10e_50s": 120.0}, history=hist, previous=["dispatch/10e_50s"]
        )
        self.assertEqual(regressed, "true")
        self.assertIn("dispatch/10e_50s", body)

    def test_calibration_never_reported(self):
        hist = nights(5, **{CAL: 100.0})
        regressed, _, body, _ = run_detect(
            {CAL: 200.0}, history=hist, previous=[CAL]
        )
        self.assertEqual(regressed, "false")
        self.assertNotIn(CAL, body)


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

    def test_comparable_splits_on_machine_tol(self):
        inside = 100.0 * (1 + det.MACHINE_TOL * 0.5)
        outside = 100.0 * (1 + det.MACHINE_TOL * 2)
        history = [{CAL: inside}, {CAL: outside}]
        self.assertEqual(det.comparable(history, 100.0), [{CAL: inside}])

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
