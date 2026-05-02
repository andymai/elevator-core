import { describe, expect, it } from "vitest";
import { formatDetail, STAGES, type GradeInputs } from "../features/quest";
import type { MetricsDto } from "../types";

// Pin the formatDetail contract: passing runs get the success line,
// failing runs prefer the stage-authored `failHint` when present and
// fall back to the generic "pass condition wasn't met" sentence
// otherwise. Also assert that every stage in the registry ships a
// `failHint` — a stage without one delivers an unactionable failure
// modal, which was the original UX gap this feature closes.

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
    endTick: 600,
    delivered: 5,
    abandoned: 0,
    ...over,
  };
}

describe("quest: formatDetail", () => {
  it("renders the success line when the run passed", () => {
    const out = formatDetail(grade({ delivered: 5, endTick: 487 }), true);
    expect(out).toBe("5 delivered, 0 abandoned · finished by tick 487.");
  });

  it("falls back to the generic message when no failHint is supplied", () => {
    const out = formatDetail(grade({ delivered: 2 }), false);
    expect(out).toContain("2 delivered, 0 abandoned");
    expect(out).toContain("pass condition wasn't met");
  });

  it("uses the stage-authored failHint when the run failed", () => {
    const out = formatDetail(
      grade({ delivered: 2 }),
      false,
      ({ delivered }) => `Need 5, got ${delivered} — try again.`,
    );
    expect(out).toBe("2 delivered, 0 abandoned. Need 5, got 2 — try again.");
  });

  it("falls back when failHint returns an empty string", () => {
    const out = formatDetail(grade({ delivered: 2 }), false, () => "");
    expect(out).toContain("pass condition wasn't met");
  });

  it("falls back when failHint throws — a hint bug must not blank the modal", () => {
    const out = formatDetail(grade({ delivered: 2 }), false, () => {
      throw new Error("boom");
    });
    expect(out).toContain("2 delivered, 0 abandoned");
    expect(out).toContain("pass condition wasn't met");
  });

  it("ignores failHint on a passing run", () => {
    const out = formatDetail(
      grade({ delivered: 5, endTick: 600 }),
      true,
      () => "should not appear",
    );
    expect(out).not.toContain("should not appear");
    expect(out).toContain("finished by tick 600");
  });
});

describe("quest: every stage ships a failHint", () => {
  // A stage without a failHint silently degrades to the generic
  // "pass condition wasn't met" line — the exact UX gap this feature
  // is meant to close. Pin completeness here so a future stage can't
  // ship without one.
  it.each(STAGES.map((s) => [s.id, s] as const))("%s has a failHint", (_id, stage) => {
    expect(stage.failHint).toBeDefined();
    expect(typeof stage.failHint).toBe("function");
  });

  it("every failHint produces a non-empty diagnostic for a zero-delivered grade", () => {
    const failingGrade = grade({ delivered: 0, abandoned: 0 });
    for (const stage of STAGES) {
      const hint = stage.failHint?.(failingGrade);
      expect(hint, `stage ${stage.id} returned empty failHint`).toBeTruthy();
    }
  });
});
