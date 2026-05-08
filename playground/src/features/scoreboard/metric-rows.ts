import { el } from "../../platform";
import type { MetricKey, MetricsDto } from "../../types";
import { buildSparkline } from "./sparkline";

const SVG_NS = "http://www.w3.org/2000/svg";

// Metric row layout: 5 fixed rows, always the same keys in the same order.
// We build the DOM once and mutate text + verdict + sparkline + delta in
// place every frame.
export const METRIC_DEFS: Array<[string, MetricKey]> = [
  ["wait avg", "avg_wait_s"],
  ["wait max", "max_wait_s"],
  ["delivered", "delivered"],
  ["abandoned", "abandoned"],
  ["util", "utilization"],
];

export function metricValue(m: MetricsDto, key: MetricKey): string {
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

// Arithmetic delta from `self` to `other` for the cell's metric. Sign
// reflects raw difference; the verdict (win/lose/tie) drives color
// independently. Returned text is "▴ +0.3 s" / "▾ −2 %"; callers hide
// the element on tie to mirror the verdict's epsilon-based smoothing.
//
// Glyphs use the smaller `▴`/`▾` (U+25B4 / U+25BE) rather than the
// chunkier `▲`/`▼`; under the mono family they line up vertically with
// the sign character, and they read as a delta indicator without
// dominating the delta row visually.
function metricDelta(self: MetricsDto, other: MetricsDto, key: MetricKey): string {
  const sv = numericMetric(self, key);
  const ov = numericMetric(other, key);
  const diff = sv - ov;
  const arrow = diff > 0 ? "▴" : "▾";
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const mag = Math.abs(diff);
  switch (key) {
    case "avg_wait_s":
    case "max_wait_s":
      return `${arrow} ${sign}${mag.toFixed(1)} s`;
    case "delivered":
    case "abandoned":
      return `${arrow} ${sign}${mag.toFixed(0)}`;
    case "utilization":
      return `${arrow} ${sign}${(mag * 100).toFixed(0)}%`;
  }
}

function numericMetric(m: MetricsDto, key: MetricKey): number {
  switch (key) {
    case "avg_wait_s":
      return m.avg_wait_s;
    case "max_wait_s":
      return m.max_wait_s;
    case "delivered":
      return m.delivered;
    case "abandoned":
      return m.abandoned;
    case "utilization":
      return m.utilization;
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
export function diffMetrics(
  a: MetricsDto,
  b: MetricsDto,
): { a: MetricVerdicts; b: MetricVerdicts } {
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
    // Layout flips between desktop (vertical stack inside each cell of
    // a 5-col strip) and mobile (single-col list with the row laid out
    // horizontally as label / value / delta / sparkline). The split is
    // entirely CSS-driven via `.metric-strip` + `.metric-row` rules in
    // style.css, so the DOM here is the same in both modes.
    // `data-verdict` on the row drives delta + sparkline color via
    // attribute selectors in style.css.
    const row = el("div", "metric-row");
    // SVG sparkline lives in the metric row and is mutated in place
    // each frame. SVG (not canvas) keeps it crisp at any DPR and lets
    // CSS drive the stroke colour via the `.metric-row[data-verdict]`
    // selectors in style.css (tertiary by default; --ok / --bad on
    // win / lose).
    const spark = document.createElementNS(SVG_NS, "svg");
    spark.classList.add("metric-spark");
    spark.setAttribute("viewBox", "0 0 100 14");
    spark.setAttribute("preserveAspectRatio", "none");
    spark.appendChild(document.createElementNS(SVG_NS, "path"));
    // Trailing-dot anchor at the latest sample. Sized in viewBox units
    // (slight oval under the non-uniform 100×14 stretch is fine — at
    // sparkline screen sizes it reads as a small "now" marker).
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.classList.add("metric-spark-dot");
    dot.setAttribute("r", "1.4");
    spark.appendChild(dot);
    row.append(
      el("span", "metric-k", label),
      el("span", "metric-v"),
      el("span", "metric-d"),
      spark,
    );
    frag.appendChild(row);
  }
  root.replaceChildren(frag);
}

export function renderMetricRows(
  root: HTMLElement,
  m: MetricsDto,
  verdicts: MetricVerdicts | null,
  history: Record<MetricKey, number[]>,
  other: MetricsDto | null,
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
    const ds = row.children[2] as HTMLElement;
    // Show delta only in compare mode and only when the verdict is
    // non-tie — ties + single-pane render an empty string so no
    // arrow/sign is drawn. The slot itself stays at `.metric-d`'s
    // reserved height so toggling Compare doesn't reflow the strip.
    const showDelta = other !== null && verdict !== "tie" && verdict !== "";
    const deltaText = showDelta ? metricDelta(m, other, key) : "";
    if (ds.textContent !== deltaText) ds.textContent = deltaText;
    const spark = row.children[3] as SVGSVGElement;
    const path = spark.firstElementChild as SVGPathElement;
    const dot = spark.children[1] as SVGCircleElement;
    const sl = buildSparkline(history[key]);
    if (path.getAttribute("d") !== sl.d) path.setAttribute("d", sl.d);
    dot.setAttribute("cx", sl.lastX.toFixed(2));
    dot.setAttribute("cy", sl.lastY.toFixed(2));
  }
}
