/**
 * Quest-mode runtime state — extracted from `quest-pane.ts` so the
 * mutable bindings that used to live in the `bootQuestPane` closure
 * (`activeStage`, `currentView`, the in-flight rAF loop flag) have
 * an explicit, testable surface instead of being smuggled across
 * event handlers via captured-`let` bindings.
 *
 * The captured-mutable-state pattern was the structural seam that
 * leaked the `state.permalink.overrides` lifecycle bug at the
 * permalink boundary — keeping all of that here, behind a thin
 * record, makes the dependency graph between view, runner, and
 * navigation explicit.
 */

import type { Stage } from "./stages";

/** Top-level Quest view modes. */
export type QuestView = "grid" | "stage";

/**
 * Shared mutable flag the navigation handlers and the run-button
 * handler both look at. The rAF loop checks `active` every frame so
 * a navigation away from the stage during an in-flight run cancels
 * the redraw without waiting for the worker to settle.
 */
export interface RunLoop {
  active: boolean;
}

/**
 * Runtime state for the Quest pane. Owned by `bootQuestPane`,
 * passed by reference to handlers and the runner so they read/write
 * a single source of truth.
 */
export interface QuestState {
  /** Stage the editor is currently bound to. */
  activeStage: Stage;
  /** Visible view (grid vs. stage). */
  currentView: QuestView;
  /** Run-loop kill switch shared with the rAF redraw closure. */
  readonly runLoop: RunLoop;
}

/**
 * Minimal stage reference for code paths that only need an id +
 * display name (permalink sync, navigation callbacks). Distinct
 * from the full `Stage` so a permalink module never has to depend
 * on grading logic, starter code, or seed-rider definitions.
 */
export interface StageHandle {
  readonly id: string;
  readonly title: string;
}

/** Build a fresh `QuestState`. */
export function createQuestState(activeStage: Stage, currentView: QuestView): QuestState {
  return {
    activeStage,
    currentView,
    runLoop: { active: false },
  };
}

/** Swap in a new stage. */
export function setActiveStage(state: QuestState, stage: Stage): void {
  state.activeStage = stage;
}

/** Toggle visible view. */
export function setCurrentView(state: QuestState, view: QuestView): void {
  state.currentView = view;
}

/** Cancel any in-flight rAF redraw. */
export function stopRunLoop(state: QuestState): void {
  state.runLoop.active = false;
}

/** Project a `Stage` to a `StageHandle`. */
export function stageHandleFor(stage: Stage): StageHandle {
  return { id: stage.id, title: stage.title };
}

/**
 * Predicate the runner uses to gate UI updates from a settling run.
 * Returns true only when the player is still on the stage view and
 * still bound to the same stage that started the run — both halves
 * matter, since either a navigation to the grid or a stage swap
 * mid-run should suppress the modal/results paint.
 */
export function isRunStillBound(state: QuestState, stage: Stage): boolean {
  return state.currentView === "stage" && state.activeStage.id === stage.id;
}
