import { describe, expect, it } from "vitest";
import { STAGES, stageById } from "../features/quest";

describe("quest: stage registry", () => {
  it("contains at least one stage", () => {
    expect(STAGES.length).toBeGreaterThan(0);
  });

  it("ids are unique across the registry", () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stageById round-trips by id", () => {
    for (const stage of STAGES) {
      expect(stageById(stage.id)?.id).toBe(stage.id);
    }
  });

  it("stageById returns undefined for unknown ids", () => {
    expect(stageById("does-not-exist")).toBeUndefined();
  });

  it("each stage has at most two star tiers", () => {
    // 1★ comes from `passFn`; `starFns` covers the 2★ and 3★ bonus
    // tiers only. The results modal renders at most 3 stars total.
    for (const stage of STAGES) {
      expect(stage.starFns.length).toBeLessThanOrEqual(2);
    }
  });

  it("each stage's unlockedApi is non-empty", () => {
    // A stage with no unlocked methods has no way to interact with the
    // sim — it would be unsolvable.
    for (const stage of STAGES) {
      expect(stage.unlockedApi.length).toBeGreaterThan(0);
    }
  });

  it("starter code is a non-trivial string", () => {
    for (const stage of STAGES) {
      expect(stage.starterCode.length).toBeGreaterThan(10);
    }
  });

  it("stage 1 (first-floor) is the curriculum entry point", () => {
    // Stage 1 must exist and unlock `pushDestination` — removing it
    // would break onboarding for every new player.
    const stage1 = stageById("first-floor");
    expect(stage1).toBeDefined();
    expect(stage1?.unlockedApi).toContain("pushDestination");
  });
});
