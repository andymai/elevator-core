import { describe, expect, it } from "vitest";
import { formatProgress, type GradeInputs } from "../features/quest";
import type { MetricsDto } from "../types";

// `formatProgress` shapes the live "Tick X · Y delivered · Zs avg wait"
// readout that runs beneath the Run button while a stage is executing.
// The cases below pin the elision rules so a future tweak to the format
// can't silently drop the early-batch "waiting…" message or paint
// `0.0s avg wait` before the first rider has been delivered.

function metrics(over: Partial<MetricsDto> = {}): MetricsDto {
  return {
    delivered: 0,
    abandoned: 0,
    spawned: 0,
    settled: 0,
    rerouted: 0,
    throughput: 0,
    avg_wait_s: 0,
    max_wait_s: 0,
    avg_ride_s: 0,
    utilization: 0,
    abandonment_rate: 0,
    total_distance: 0,
    total_moves: 0,
    ...over,
  };
}

function grade(over: Partial<GradeInputs> = {}): GradeInputs {
  return {
    metrics: metrics(),
    endTick: 60,
    delivered: 0,
    abandoned: 0,
    ...over,
  };
}

describe("quest: formatProgress", () => {
  it("shows waiting… on the first batch with no riders moved", () => {
    expect(formatProgress(grade({ endTick: 60 }))).toBe("Tick 60 · waiting…");
  });

  it("includes delivered count once any rider has arrived", () => {
    expect(formatProgress(grade({ endTick: 240, delivered: 3 }))).toBe("Tick 240 · 3 delivered");
  });

  it("renders avg wait once samples exist, to one decimal place", () => {
    const out = formatProgress(
      grade({
        endTick: 600,
        delivered: 5,
        metrics: metrics({ delivered: 5, avg_wait_s: 12.345 }),
      }),
    );
    expect(out).toBe("Tick 600 · 5 delivered · 12.3s avg wait");
  });

  it("includes abandons clause only when non-zero", () => {
    const withAbandons = formatProgress(grade({ endTick: 480, delivered: 4, abandoned: 1 }));
    expect(withAbandons).toBe("Tick 480 · 4 delivered · 1 abandoned");
    const clean = formatProgress(grade({ endTick: 480, delivered: 4, abandoned: 0 }));
    expect(clean).toBe("Tick 480 · 4 delivered");
  });

  it("omits avg wait when the metric is zero or non-finite", () => {
    const zero = formatProgress(
      grade({ endTick: 120, delivered: 1, metrics: metrics({ delivered: 1, avg_wait_s: 0 }) }),
    );
    expect(zero).toBe("Tick 120 · 1 delivered");
    const nan = formatProgress(
      grade({ endTick: 120, delivered: 1, metrics: metrics({ delivered: 1, avg_wait_s: NaN }) }),
    );
    expect(nan).toBe("Tick 120 · 1 delivered");
  });
});
