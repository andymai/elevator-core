import { describe, expect, it } from "vitest";
import { STAGES } from "../features/quest";

// `Stage.referenceSolution` is the canonical-solution payload that
// gets unlocked in the Quest pane after a 1★ pass. Authoring is
// rolling out per stage — the curriculum's first five stages ship
// today, with the rest scheduled for follow-up PRs as the API
// patterns get pinned. These tests pin two contracts:
//
//   1. Stages that *claim* a solution (referenceSolution defined)
//      must ship a non-trivial, non-empty string. A blank or
//      whitespace-only entry would render an empty unlocked panel,
//      which is worse than no panel at all.
//   2. The first five curriculum stages must each carry a
//      reference solution. This pin guards against a regression
//      where a refactor accidentally drops a referenceSolution
//      field while leaving the test list untouched.

const STAGES_WITH_REFERENCE = ["first-floor", "listen-up", "car-buttons", "builtin", "choose"];

describe("quest: referenceSolution authoring", () => {
  it.each(STAGES.filter((s) => s.referenceSolution !== undefined).map((s) => [s.id, s] as const))(
    "%s ships a non-empty referenceSolution",
    (_id, stage) => {
      expect(stage.referenceSolution).toBeDefined();
      expect(typeof stage.referenceSolution).toBe("string");
      expect(stage.referenceSolution?.trim().length ?? 0).toBeGreaterThan(0);
    },
  );

  it.each(STAGES_WITH_REFERENCE)("stage %s has a referenceSolution", (id) => {
    const stage = STAGES.find((s) => s.id === id);
    expect(stage).toBeDefined();
    expect(stage?.referenceSolution).toBeDefined();
    expect(typeof stage?.referenceSolution).toBe("string");
  });

  it("every shipped reference solution mentions the `sim` API", () => {
    // Sanity check: the curriculum's reference solutions are JS/TS
    // controllers that drive the wasm sim, so a solution that never
    // calls `sim.*` is almost certainly placeholder text. Cheap
    // guard against an authoring slip where the comment block was
    // committed without the actual code.
    for (const stage of STAGES) {
      if (stage.referenceSolution === undefined) continue;
      expect(
        stage.referenceSolution.includes("sim."),
        `stage ${stage.id} reference solution doesn't reference sim.*`,
      ).toBe(true);
    }
  });
});
