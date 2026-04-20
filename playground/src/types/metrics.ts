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
