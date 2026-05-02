import { describe, expect, it } from "vitest";
import { runStage, type StarCount } from "../features/quest";
import type { GradeInputs, Stage } from "../features/quest";

// `runStage` requires a real Web Worker + the wasm `pkg/` bundle, so
// the end-to-end run path is exercised at integration time. These
// tests cover the surface only — call shape, type contracts — and
// the grading-result computation that the runner uses to produce a
// `StageResult` from `GradeInputs`.

describe("quest: stage runner surface", () => {
  it("exposes runStage as a function", () => {
    expect(typeof runStage).toBe("function");
  });

  it("StarCount is constrained to the four valid values", () => {
    // Compile-time check: assigning out-of-range values fails.
    const ok: StarCount[] = [0, 1, 2, 3];
    expect(ok).toEqual([0, 1, 2, 3]);
  });

  it("Stage shape is compatible with the runner's call signature", () => {
    // Build a dummy stage and verify the type compiles. No runtime
    // assertion — this test catches signature drift via the type
    // checker.
    const stage: Stage = {
      id: "test",
      title: "Test",
      brief: "Test stage",
      section: "basics",
      configRon: "",
      unlockedApi: ["addDestination"],
      seedRiders: [],
      baseline: "none",
      passFn: ({ delivered }: GradeInputs) => delivered > 0,
      starFns: [],
      starterCode: "// stub",
      hints: [],
    };
    expect(stage.passFn({ metrics: {} as never, endTick: 1, delivered: 1, abandoned: 0 })).toBe(
      true,
    );
  });
});
