import { describe, expect, it } from "vitest";

import { STAGES } from "../features/quest";
import {
  createQuestState,
  isRunStillBound,
  setActiveStage,
  setCurrentView,
  stageHandleFor,
  stopRunLoop,
} from "../features/quest/quest-state";

const firstStage = STAGES[0];
const secondStage = STAGES[1];
if (!firstStage || !secondStage) {
  throw new Error("quest registry must have at least two stages for these tests");
}

describe("quest-state", () => {
  it("createQuestState seeds a fresh, inactive run loop", () => {
    const state = createQuestState(firstStage, "grid");
    expect(state.activeStage.id).toBe(firstStage.id);
    expect(state.currentView).toBe("grid");
    expect(state.runLoop.active).toBe(false);
  });

  it("setActiveStage swaps the bound stage in place", () => {
    const state = createQuestState(firstStage, "stage");
    setActiveStage(state, secondStage);
    expect(state.activeStage.id).toBe(secondStage.id);
    // currentView stays — stage swaps don't toggle the visible view.
    expect(state.currentView).toBe("stage");
  });

  it("setCurrentView toggles between grid and stage", () => {
    const state = createQuestState(firstStage, "grid");
    setCurrentView(state, "stage");
    expect(state.currentView).toBe("stage");
    setCurrentView(state, "grid");
    expect(state.currentView).toBe("grid");
  });

  it("stopRunLoop flips the rAF kill switch", () => {
    const state = createQuestState(firstStage, "stage");
    state.runLoop.active = true;
    stopRunLoop(state);
    expect(state.runLoop.active).toBe(false);
  });

  it("isRunStillBound is true when both view and stage match", () => {
    const state = createQuestState(firstStage, "stage");
    expect(isRunStillBound(state, firstStage)).toBe(true);
  });

  it("isRunStillBound is false after navigating to the grid mid-run", () => {
    const state = createQuestState(firstStage, "stage");
    setCurrentView(state, "grid");
    expect(isRunStillBound(state, firstStage)).toBe(false);
  });

  it("isRunStillBound is false after swapping to a different stage mid-run", () => {
    const state = createQuestState(firstStage, "stage");
    // The run started against firstStage; the player swaps to secondStage.
    setActiveStage(state, secondStage);
    expect(isRunStillBound(state, firstStage)).toBe(false);
    expect(isRunStillBound(state, secondStage)).toBe(true);
  });

  it("stageHandleFor projects to a minimal { id, title } record", () => {
    const handle = stageHandleFor(firstStage);
    expect(handle).toEqual({ id: firstStage.id, title: firstStage.title });
  });
});
