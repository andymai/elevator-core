import { describe, expect, it } from "vitest";
import { nextStage, STAGES, type Stage } from "../features/quest";

// `nextStage` walks the curriculum's display order; the modal's
// "Next stage" CTA is the user-visible end of that walk. Pin the
// helper's edge cases (unknown id, last stage) and the registry
// traversal so a future shuffle can't silently break the success-
// path advance. Modal-DOM behaviour (hidden flag, focus target,
// retry-demoted) is verified manually — the test environment runs
// without a DOM and the existing surface tests don't pull one in.

describe("quest: nextStage", () => {
  it("returns the next stage in registry order", () => {
    const first = STAGES[0];
    expect(first).toBeDefined();
    if (!first) return;
    const next = nextStage(first.id);
    expect(next).toBeDefined();
    expect(next?.id).toBe(STAGES[1]?.id);
  });

  it("returns undefined for the last stage", () => {
    const last = STAGES[STAGES.length - 1];
    expect(last).toBeDefined();
    if (!last) return;
    expect(nextStage(last.id)).toBeUndefined();
  });

  it("returns undefined for an unknown stage id", () => {
    expect(nextStage("not-a-real-stage-id")).toBeUndefined();
  });

  it("walks the full registry without skipping or repeating", () => {
    const visited: string[] = [];
    let current: Stage | undefined = STAGES[0];
    while (current) {
      visited.push(current.id);
      current = nextStage(current.id);
    }
    expect(visited).toEqual(STAGES.map((s) => s.id));
  });
});
