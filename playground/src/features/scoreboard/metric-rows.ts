import { el } from "../../platform";
import type { Metrics } from "../../types";
import { buildSparklinePath } from "./sparkline";

/**
 * Keys for the metric strip rows. Kept as a string literal union so
 * `MetricVerdicts` and `Pane.metricHistory` both index the same set
 * and a typo in one spot surfaces at the other.
 */
export type MetricKey = "avg_wait_s" | "max_wait_s" | "delivered" | "abandoned" | "utilization";
export const METRIC_KEYS: MetricKey[] = [
  "avg_wait_s",
  "max_wait_s",
  "delivered",
  "abandoned",
  "utilization",
];

export const METRIC_HISTORY_LEN = 120;

// Metric row layout: 5 fixed rows, always the same keys in the same order.
// We build the DOM once and mutate text + verdict + sparkline in place
// every frame.
export const METRIC_DEFS: Array<[string, MetricKey]> = [
  ["Avg wait", "avg_wait_s"],
  ["Max wait", "max_wait_s"],
  ["Delivered", "delivered"],
  ["Abandoned", "abandoned"],
  ["Utilization", "utilization"],
];

function metricValue(m: Metrics, key: MetricKey): string {
  switch (key) {
    case "avg_wait_s":
      return `${m.avg_wait_s.toFixed(1)} s`;
    case "max_wait_s":
      return `${m.max_wait_s.toFixed(1)} s`;
    case "delivered":
      return String(m.delivered);
    case "abandoned":
      return String(m.abandoned);
    case "utilization":
      return `${(m.utilization * 100).toFixed(0)}%`;
  }
}

export type Verdict = "win" | "lose" | "tie";
export type MetricVerdicts = Record<MetricKey, Verdict>;

/**
 * Epsilon-based verdict so two panes that render identical values in the
 * metric strip (e.g. `0.0 s` vs `0.04 s` both display as `0.0 s`) don't
 * flicker between win/lose on floating-point noise. Epsilons match the UI's
 * display precision (`toFixed(1)` for times, `toFixed(0)` on the percent).
 */
export function diffMetrics(a: Metrics, b: Metrics): { a: MetricVerdicts; b: MetricVerdicts } {
  const cmp = (
    x: number,
    y: number,
    epsilon: number,
    higherBetter: boolean,
  ): [Verdict, Verdict] => {
    if (Math.abs(x - y) < epsilon) return ["tie", "tie"];
    const aWins = higherBetter ? x > y : x < y;
    return aWins ? ["win", "lose"] : ["lose", "win"];
  };
  const [aw, bw] = cmp(a.avg_wait_s, b.avg_wait_s, 0.05, false);
  const [amx, bmx] = cmp(a.max_wait_s, b.max_wait_s, 0.05, false);
  const [ad, bd] = cmp(a.delivered, b.delivered, 0.5, true);
  const [aab, bab] = cmp(a.abandoned, b.abandoned, 0.5, false);
  const [au, bu] = cmp(a.utilization, b.utilization, 0.005, true);
  return {
    a: { avg_wait_s: aw, max_wait_s: amx, delivered: ad, abandoned: aab, utilization: au },
    b: { avg_wait_s: bw, max_wait_s: bmx, delivered: bd, abandoned: bab, utilization: bu },
  };
}

export function initMetricRows(root: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (const [label] of METRIC_DEFS) {
    const row = el(
      "div",
      "metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal",
    );
    // SVG sparkline lives in the metric row and is mutated in place each
    // frame. Using SVG (not another canvas) keeps it crisp at any DPR
    // and lets CSS drive the stroke color via `currentColor` / the
    // `data-verdict` attribute on the row.
    const spark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    spark.classList.add("metric-spark");
    spark.setAttribute("viewBox", "0 0 100 14");
    spark.setAttribute("preserveAspectRatio", "none");
    spark.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    row.append(
      el(
        "span",
        "text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",
        label,
      ),
      el("span", "metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),
      spark,
    );
    frag.appendChild(row);
  }
  root.replaceChildren(frag);
}

export function renderMetricRows(
  root: HTMLElement,
  m: Metrics,
  verdicts: MetricVerdicts | null,
  history: Record<MetricKey, number[]>,
): void {
  const rows = root.children;
  for (let i = 0; i < METRIC_DEFS.length; i++) {
    const row = rows[i] as HTMLElement | undefined;
    if (!row) continue;
    const def = METRIC_DEFS[i];
    if (!def) continue;
    const key = def[1];
    const verdict = verdicts ? verdicts[key] : "";
    if (row.dataset["verdict"] !== verdict) row.dataset["verdict"] = verdict;
    const vs = row.children[1] as HTMLElement;
    const val = metricValue(m, key);
    if (vs.textContent !== val) vs.textContent = val;
    const spark = row.children[2] as SVGSVGElement;
    const path = spark.firstElementChild as SVGPathElement;
    const d = buildSparklinePath(history[key]);
    if (path.getAttribute("d") !== d) path.setAttribute("d", d);
  }
}
