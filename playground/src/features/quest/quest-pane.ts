/**
 * Mount the Quest mode UI shell.
 *
 * Q-09 added the visible banner; Q-10 swaps the static starter-code
 * `<pre>` for a Monaco editor and wires the Run button to
 * `runStage`. Result text lands in `#quest-result` so screen readers
 * pick up the pass/star outcome via `aria-live`.
 *
 * The function is intentionally idempotent and side-effect-light so
 * the shell can call it from `boot.ts` without coordinating with the
 * existing compare-mode render loop.
 */

import { mountQuestEditor, type QuestEditor } from "./editor";
import { runStage } from "./stage-runner";
import { STAGES } from "./stages";
import type { Stage } from "./stages";

export interface QuestPaneHandles {
  readonly root: HTMLElement;
  readonly title: HTMLElement;
  readonly brief: HTMLElement;
  readonly editorHost: HTMLElement;
  readonly runBtn: HTMLButtonElement;
  readonly result: HTMLElement;
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
  const editorHost = document.getElementById("quest-editor");
  const runBtn = document.getElementById("quest-run");
  const result = document.getElementById("quest-result");
  if (!title || !brief || !editorHost || !runBtn || !result) {
    throw new Error("quest-pane: missing stage banner elements");
  }
  return {
    root,
    title,
    brief,
    editorHost,
    runBtn: runBtn as HTMLButtonElement,
    result,
  };
}

/** Render the static parts of a stage (title, brief). */
export function renderStage(handles: QuestPaneHandles, stage: Stage): void {
  handles.title.textContent = stage.title;
  handles.brief.textContent = stage.brief;
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
 * Wire the Run button to execute the editor's current text against
 * the supplied stage. While a run is in flight the button is
 * disabled and the result panel shows "Running…"; on completion it
 * shows pass/fail + star count, or the error message on throw.
 */
function attachRunButton(handles: QuestPaneHandles, editor: QuestEditor, stage: Stage): void {
  handles.runBtn.addEventListener("click", () => {
    void executeRun(handles, editor, stage);
  });
}

async function executeRun(
  handles: QuestPaneHandles,
  editor: QuestEditor,
  stage: Stage,
): Promise<void> {
  handles.runBtn.disabled = true;
  handles.result.textContent = "Running…";
  try {
    // Cap the controller's initial run at one second — long enough
    // for honest setup work, short enough that an infinite loop
    // bubbles up as a timeout instead of blocking indefinitely.
    const result = await runStage(stage, editor.getValue(), { timeoutMs: 1000 });
    if (result.passed) {
      const stars = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
      handles.result.textContent = `Passed — ${stars} (${result.grade.delivered} delivered, tick ${result.grade.endTick})`;
    } else {
      handles.result.textContent = `Did not pass — ${result.grade.delivered} delivered, ${result.grade.abandoned} abandoned`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    handles.result.textContent = `Error: ${msg}`;
  } finally {
    handles.runBtn.disabled = false;
  }
}

/**
 * Boot the Quest pane: wire DOM, render the first stage, mount the
 * editor with the stage's starter code, attach the run button.
 *
 * Returns the handles plus the editor handle so future iterations
 * can re-render on stage navigation. The mount is async because
 * Monaco loads lazily.
 */
export async function bootQuestPane(): Promise<{
  handles: QuestPaneHandles;
  editor: QuestEditor;
}> {
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
  // Disable Run while the Monaco bundle loads so a click before
  // mount completes doesn't run against an undefined editor. The
  // attachRunButton path re-enables it after each run.
  handles.runBtn.disabled = true;
  handles.result.textContent = "Loading editor…";
  const editor = await mountQuestEditor({
    container: handles.editorHost,
    initialValue: firstStage.starterCode,
    language: "typescript",
  });
  handles.runBtn.disabled = false;
  handles.result.textContent = "";
  attachRunButton(handles, editor, firstStage);
  return { handles, editor };
}
