/**
 * Build an SVG path `d` string sampling `values` across a 100x14
 * viewBox. The path uses the last up-to-`METRIC_HISTORY_LEN` samples
 * and auto-scales to the min/max within that window so the trace
 * always fills the vertical range regardless of absolute magnitude.
 * An empty or single-sample window draws a flat baseline.
 */
export function buildSparklinePath(values: number[]): string {
  if (values.length < 2) return "M 0 13 L 100 13";
  let min = values[0] ?? 0;
  let max = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (v === undefined) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  const n = values.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 100;
    // Inverted y-axis so higher values sit higher on the chart.
    const y = span > 0 ? 13 - (((values[i] ?? 0) - min) / span) * 12 : 7;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trim();
}
