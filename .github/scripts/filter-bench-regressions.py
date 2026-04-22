#!/usr/bin/env python3
"""Filter Criterion "Performance has regressed." lines by median change %.

Criterion's built-in regression detection is purely p-value-based: any
statistically significant change fires, including sub-%% drift that's noise
on a shared CI runner. This script reads `bench-output.log`, keeps only the
regressions whose median change exceeds a threshold, and writes the same
4-line context blocks the old `grep -B 3` emitted.

Args:
    sys.argv[1]: path to append `regressed=true|false` to ($GITHUB_OUTPUT).
    sys.argv[2]: minimum |median change %| to alert on (e.g. "5.0").
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CHANGE_RE = re.compile(
    r"change:\s*\["
    r"([+\-]?\d+(?:\.\d+)?)%\s+"
    r"([+\-]?\d+(?:\.\d+)?)%\s+"
    r"([+\-]?\d+(?:\.\d+)?)%"
    r"\]"
)


def main() -> int:
    github_output = Path(sys.argv[1])
    threshold = float(sys.argv[2])

    lines = Path("bench-output.log").read_text().splitlines(keepends=True)

    out: list[str] = []
    for i, line in enumerate(lines):
        if "Performance has regressed." not in line:
            continue
        ctx = lines[max(0, i - 3) : i + 1]
        change_line = next((l for l in ctx if "change:" in l), None)
        if change_line:
            m = CHANGE_RE.search(change_line)
            if m and abs(float(m.group(2))) < threshold:
                continue
        out.extend(ctx)
        out.append("\n")

    if out:
        Path("regressions.txt").write_text("".join(out))
        print(f"== Regressions above {threshold}% detected ==")
        sys.stdout.write("".join(out))
        with github_output.open("a") as g:
            g.write("regressed=true\n")
    else:
        print(f"No regressions above {threshold}% threshold.")
        with github_output.open("a") as g:
            g.write("regressed=false\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
