/**
 * Mount the Quest mode UI shell.
 *
 * Q-09 ships the smallest possible visible signal that
 * `?m=quest` is wired end-to-end: a stage banner with title, brief,
 * and starter code. The Monaco editor mount, run button, and
 * results modal land in follow-up PRs that build on this anchor.
 *
 * The function is intentionally idempotent and side-effect-light so
 * the shell can call it from `boot.ts` without coordinating with the
 * existing compare-mode render loop.
 */

import { STAGES } from "./stages";
import type { Stage } from "./stages";

export interface QuestPaneHandles {
  readonly root: HTMLElement;
  readonly title: HTMLElement;
  readonly brief: HTMLElement;
  readonly starter: HTMLElement;
}

/**
 * Wire the Quest pane DOM. Throws if the expected anchor isn't in
 * the document — the caller should only invoke this when in Quest
 * mode (the index.html ships the section hidden by default).
 */
export function wireQuestPane(): QuestPaneHandles {
  const root = document.getElementById("quest-pane");
  if (!root) throw new Error("quest-pane: missing #quest-pane");
  const title = document.getElementById("quest-stage-title");
  const brief = document.getElementById("quest-stage-brief");
  const starter = document.getElementById("quest-starter-code");
  if (!title || !brief || !starter) {
    throw new Error("quest-pane: missing stage banner elements");
  }
  return { root, title, brief, starter };
}

/** Render a stage's banner content into the wired pane. */
export function renderStage(handles: QuestPaneHandles, stage: Stage): void {
  handles.title.textContent = stage.title;
  handles.brief.textContent = stage.brief;
  handles.starter.textContent = stage.starterCode;
}

/**
 * Show the Quest pane and hide the existing compare layout.
 *
 * Compare mode keeps its DOM intact — we toggle visibility rather
 * than tear it down so the user can flip back via permalink without
 * a remount cost. The bottom controls bar stays visible because it
 * carries the seed and speed inputs which Quest will eventually
 * read too.
 */
export function showQuestPane(handles: QuestPaneHandles): void {
  const layout = document.getElementById("layout");
  if (layout) layout.classList.add("hidden");
  handles.root.classList.remove("hidden");
  handles.root.classList.add("flex");
}

/** Inverse of `showQuestPane`. */
export function hideQuestPane(handles: QuestPaneHandles): void {
  handles.root.classList.add("hidden");
  handles.root.classList.remove("flex");
  const layout = document.getElementById("layout");
  if (layout) layout.classList.remove("hidden");
}

/**
 * Boot the Quest pane: wire DOM, render the first stage, swap the
 * visible layout. Returns the handles so future iterations can keep
 * a reference for re-rendering on stage navigation.
 */
export function bootQuestPane(): QuestPaneHandles {
  const handles = wireQuestPane();
  // Stage selection by permalink is a Q-12 concern; for now Stage 1
  // is the default. The registry ordering is the canonical
  // curriculum sequence.
  const firstStage = STAGES[0];
  if (!firstStage) {
    throw new Error("quest-pane: stage registry is empty");
  }
  renderStage(handles, firstStage);
  showQuestPane(handles);
  return handles;
}
