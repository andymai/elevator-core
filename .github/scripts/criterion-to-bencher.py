#!/usr/bin/env python3
"""Convert Criterion's JSON estimates into libtest "bencher" lines.

github-action-benchmark's `cargo` tool parses the libtest format
(`test NAME ... bench: N ns/iter (+/- M)`), which Criterion never emits.
Criterion's own `bench-output.log` is consumed by the regression detector
in its native format, so we cannot change that. Instead we read the
machine-readable estimates Criterion writes under target/criterion/ and
emit a separate bencher-format file for the publish step.

Names come from the directory path (reliable), not the log (where Criterion
drops the name prefix in non-TTY runs). Values are nanoseconds.
"""
import glob
import json
import os
import sys

root = sys.argv[1] if len(sys.argv) > 1 else "target/criterion"
lines = []
for est in sorted(glob.glob(os.path.join(root, "**", "new", "estimates.json"), recursive=True)):
    parts = est.split(os.sep)
    ci = len(parts) - 1 - parts[::-1].index("criterion") if "criterion" in parts else 0
    name = "/".join(parts[ci + 1:-2])
    with open(est) as f:
        data = json.load(f)
    mean = data.get("mean", {}).get("point_estimate")
    if mean is None:
        continue
    spread = (data.get("std_dev") or {}).get("point_estimate")
    if spread is None:
        spread = data.get("mean", {}).get("standard_error", 0.0)
    lines.append(f"test {name} ... bench: {round(mean)} ns/iter (+/- {round(spread)})")

if not lines:
    sys.exit("criterion-to-bencher: no estimates found under " + root)
sys.stdout.write("\n".join(lines) + "\n")
