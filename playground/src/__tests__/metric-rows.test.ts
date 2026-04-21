import { describe, expect, it } from "vitest";
import { diffMetrics, metricValue } from "../features/scoreboard/metric-rows";
import type { MetricsDto } from "../types";

function makeMetrics(overrides: Partial<MetricsDto> = {}): MetricsDto {
  return {
    delivered: 100,
    abandoned: 5,
    spawned: 110,
    settled: 0,
    rerouted: 0,
    throughput: 0,
    avg_wait_s: 10.0,
    max_wait_s: 30.0,
    avg_ride_s: 20.0,
    utilization: 0.75,
    abandonment_rate: 0.05,
    total_distance: 0,
    total_moves: 0,
    ...overrides,
  };
}

describe("diffMetrics: verdict assignment", () => {
  it("all metrics equal → all ties", () => {
    const m = makeMetrics();
    const { a, b } = diffMetrics(m, m);
    expect(a.avg_wait_s).toBe("tie");
    expect(a.max_wait_s).toBe("tie");
    expect(a.delivered).toBe("tie");
    expect(a.abandoned).toBe("tie");
    expect(a.utilization).toBe("tie");
    expect(b.avg_wait_s).toBe("tie");
    expect(b.max_wait_s).toBe("tie");
    expect(b.delivered).toBe("tie");
    expect(b.abandoned).toBe("tie");
    expect(b.utilization).toBe("tie");
  });

  it("A has better (lower) avg_wait_s → A wins that metric", () => {
    const ma = makeMetrics({ avg_wait_s: 8.0 });
    const mb = makeMetrics({ avg_wait_s: 12.0 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.avg_wait_s).toBe("win");
    expect(b.avg_wait_s).toBe("lose");
  });

  it("B has better (lower) avg_wait_s → B wins that metric", () => {
    const ma = makeMetrics({ avg_wait_s: 15.0 });
    const mb = makeMetrics({ avg_wait_s: 5.0 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.avg_wait_s).toBe("lose");
    expect(b.avg_wait_s).toBe("win");
  });

  it("B has better (higher) utilization → B wins that metric", () => {
    const ma = makeMetrics({ utilization: 0.5 });
    const mb = makeMetrics({ utilization: 0.9 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.utilization).toBe("lose");
    expect(b.utilization).toBe("win");
  });

  it("A has better (higher) delivered → A wins delivered", () => {
    const ma = makeMetrics({ delivered: 200 });
    const mb = makeMetrics({ delivered: 100 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.delivered).toBe("win");
    expect(b.delivered).toBe("lose");
  });

  it("A has better (lower) abandoned → A wins abandoned", () => {
    const ma = makeMetrics({ abandoned: 1 });
    const mb = makeMetrics({ abandoned: 20 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.abandoned).toBe("win");
    expect(b.abandoned).toBe("lose");
  });

  it("zero values produce ties when both are zero", () => {
    const ma = makeMetrics({ avg_wait_s: 0, delivered: 0, abandoned: 0, utilization: 0 });
    const mb = makeMetrics({ avg_wait_s: 0, delivered: 0, abandoned: 0, utilization: 0 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.avg_wait_s).toBe("tie");
    expect(a.delivered).toBe("tie");
    expect(a.abandoned).toBe("tie");
    expect(a.utilization).toBe("tie");
    expect(b.avg_wait_s).toBe("tie");
  });

  it("avg_wait within epsilon (0.05) is a tie, not a win", () => {
    // 10.0 vs 10.04 — displays as "10.0 s" in both panes; must not flicker
    const ma = makeMetrics({ avg_wait_s: 10.0 });
    const mb = makeMetrics({ avg_wait_s: 10.04 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.avg_wait_s).toBe("tie");
    expect(b.avg_wait_s).toBe("tie");
  });

  it("utilization within epsilon (0.005) is a tie", () => {
    const ma = makeMetrics({ utilization: 0.75 });
    const mb = makeMetrics({ utilization: 0.754 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.utilization).toBe("tie");
    expect(b.utilization).toBe("tie");
  });

  it("delivered within epsilon (0.5) is a tie — handles fractional accumulator drift", () => {
    const ma = makeMetrics({ delivered: 100 });
    const mb = makeMetrics({ delivered: 100 });
    const { a, b } = diffMetrics(ma, mb);
    expect(a.delivered).toBe("tie");
    expect(b.delivered).toBe("tie");
  });
});

describe("metricValue: display formatting", () => {
  const m = makeMetrics({
    avg_wait_s: 12.34,
    max_wait_s: 45.6,
    delivered: 200,
    abandoned: 7,
    utilization: 0.834,
  });

  it("avg_wait_s formats as seconds with 1 decimal", () => {
    expect(metricValue(m, "avg_wait_s")).toBe("12.3 s");
  });

  it("max_wait_s formats as seconds with 1 decimal", () => {
    expect(metricValue(m, "max_wait_s")).toBe("45.6 s");
  });

  it("delivered formats as integer string", () => {
    expect(metricValue(m, "delivered")).toBe("200");
  });

  it("abandoned formats as integer string", () => {
    expect(metricValue(m, "abandoned")).toBe("7");
  });

  it("utilization formats as rounded percentage with no decimal", () => {
    expect(metricValue(m, "utilization")).toBe("83%");
  });

  it("utilization at 0 → 0%", () => {
    expect(metricValue(makeMetrics({ utilization: 0 }), "utilization")).toBe("0%");
  });

  it("utilization at 1 → 100%", () => {
    expect(metricValue(makeMetrics({ utilization: 1 }), "utilization")).toBe("100%");
  });

  it("avg_wait_s rounds correctly at boundary", () => {
    // 10.05 → toFixed(1) → "10.1"
    expect(metricValue(makeMetrics({ avg_wait_s: 10.05 }), "avg_wait_s")).toBe("10.1 s");
  });
});
