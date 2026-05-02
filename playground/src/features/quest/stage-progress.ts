/**
 * Format a per-batch grade as a one-line progress readout for the
 * Quest run row.
 *
 * Avg wait is omitted on the very first batch (when `delivered === 0`)
 * because the underlying metric has no samples yet and would render
 * as "0.0s avg wait" — misleading for both screen-reading and casual
 * scanning. Likewise the abandons clause only appears when at least
 * one rider has abandoned, so a clean run keeps the text short.
 */
import type { GradeInputs } from "./stages";

export function formatProgress(grade: GradeInputs): string {
  const head = `Tick ${grade.endTick}`;
  if (grade.delivered === 0 && grade.abandoned === 0) {
    return `${head} · waiting…`;
  }
  const parts = [head, `${grade.delivered} delivered`];
  if (grade.abandoned > 0) parts.push(`${grade.abandoned} abandoned`);
  const avg = grade.metrics.avg_wait_s;
  if (grade.delivered > 0 && Number.isFinite(avg) && avg > 0) {
    parts.push(`${avg.toFixed(1)}s avg wait`);
  }
  return parts.join(" · ");
}
