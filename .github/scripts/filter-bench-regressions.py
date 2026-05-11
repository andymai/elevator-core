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

CHANGE_RE = re.compile(
    r"change:\s*\["
    r"([+\-]?\d+(?:\.\d+)?)%\s+"
    r"([+\-]?\d+(?:\.\d+)?)%\s+"
    r"([+\-]?\d+(?:\.\d+)?)%"
    r"\]"
)

CURRENT_LIST = Path("regressions-current.txt")
ISSUE_BODY = Path("regressions.txt")


def main() -> int:
    github_output = Path(sys.argv[1])
    threshold = float(sys.argv[2])
    bench_log = Path(sys.argv[3])
    previous_list = Path(sys.argv[4]) if len(sys.argv) > 4 else None

    lines = bench_log.read_text().splitlines(keepends=True)

    todays: dict[str, str] = {}
    for i, line in enumerate(lines):
        if "Performance has regressed." not in line:
            continue
        ctx = lines[max(0, i - 3) : i + 1]
        change_line = next((l for l in ctx if "change:" in l), None)
        if change_line:
            m = CHANGE_RE.search(change_line)
            if m and abs(float(m.group(2))) < threshold:
                continue
        name = ctx[0].strip() if ctx else f"unknown_{i}"
        todays[name] = "".join(ctx) + "\n"

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
