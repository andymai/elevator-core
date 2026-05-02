/**
 * Mount the Quest mode UI shell.
 *
 * Q-09 added the visible banner; Q-10 swaps the static starter-code
 * `<pre>` for a Monaco editor and wires the Run button to
 * `runStage`. Q-15 adds the stage navigator: a `<select>` lets the
 * player switch between every stage in the registry, and the chosen
 * stage round-trips through the permalink as `?qs=`.
 *
 * The function is intentionally idempotent and side-effect-light so
 * the shell can call it from `boot.ts` without coordinating with the
 * existing compare-mode render loop.
 */

import { renderApiPanel, wireApiPanel, type ApiPanelHandles } from "./api-panel";
import { mountQuestEditor, type QuestEditor } from "./editor";
import { renderHints, wireHintsDrawer, type HintsDrawerHandles } from "./hints-drawer";
import { showResults, wireResultsModal, type ResultsModalHandles } from "./results-modal";
import { runStage } from "./stage-runner";
import { STAGES, stageById } from "./stages";
import type { Stage } from "./stages";

export interface QuestPaneHandles {
  readonly root: HTMLElement;
  readonly title: HTMLElement;
  readonly brief: HTMLElement;
  readonly select: HTMLSelectElement;
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
  const select = document.getElementById("quest-stage-select");
  const editorHost = document.getElementById("quest-editor");
  const runBtn = document.getElementById("quest-run");
  const result = document.getElementById("quest-result");
  if (!title || !brief || !select || !editorHost || !runBtn || !result) {
    throw new Error("quest-pane: missing stage banner elements");
  }
  return {
    root,
    title,
    brief,
    select: select as HTMLSelectElement,
    editorHost,
    runBtn: runBtn as HTMLButtonElement,
    result,
  };
}

/** Render the static parts of a stage (title, brief, picker selection). */
export function renderStage(handles: QuestPaneHandles, stage: Stage): void {
  handles.title.textContent = stage.title;
  handles.brief.textContent = stage.brief;
  if (handles.select.value !== stage.id) {
    handles.select.value = stage.id;
  }
}

/** Populate the stage picker from the registry. Idempotent. */
export function populateStageSelect(handles: QuestPaneHandles): void {
  // Clear in case of re-entry — `populateStageSelect` is called on
  // every Quest mount and the registry is the source of truth.
  while (handles.select.firstChild) {
    handles.select.removeChild(handles.select.firstChild);
  }
  STAGES.forEach((stage, index) => {
    const opt = document.createElement("option");
    opt.value = stage.id;
    opt.textContent = `${String(index + 1).padStart(2, "0")} · ${stage.title}`;
    handles.select.appendChild(opt);
  });
}

/**
 * Show the Quest pane and hide the existing compare layout.
 *
 * Compare mode keeps its DOM intact — we toggle visibility rather
 * than tear it down so the user can flip back via permalink without
 * a remount cost.
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
 * the active stage. The stage is read via the supplied getter on
 * each click so a navigation between Run presses pulls the new
 * stage cleanly.
 */
function attachRunButton(
  handles: QuestPaneHandles,
  modal: ResultsModalHandles,
  editor: QuestEditor,
  getStage: () => Stage,
): void {
  const runOnce = (): void => {
    void executeRun(handles, modal, editor, getStage(), runOnce);
  };
  handles.runBtn.addEventListener("click", runOnce);
}

async function executeRun(
  handles: QuestPaneHandles,
  modal: ResultsModalHandles,
  editor: QuestEditor,
  stage: Stage,
  retry: () => void,
): Promise<void> {
  handles.runBtn.disabled = true;
  handles.result.textContent = "Running…";
  try {
    // Cap the controller's initial run at one second — long enough
    // for honest setup work, short enough that an infinite loop
    // bubbles up as a timeout instead of blocking indefinitely.
    const result = await runStage(stage, editor.getValue(), { timeoutMs: 1000 });
    handles.result.textContent = "";
    showResults(modal, result, retry);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Errors stay inline — the modal is for graded outcomes.
    // A controller throw is a code bug the player needs to see in
    // place, not a result to celebrate or retry.
    handles.result.textContent = `Error: ${msg}`;
  } finally {
    handles.runBtn.disabled = false;
  }
}

/**
 * Boot the Quest pane: wire DOM, render the requested stage, mount
 * the editor with the stage's starter code, attach the run button
 * and stage navigator. The `onStageChange` callback notifies the
 * caller (boot.ts) so the permalink can sync.
 */
export async function bootQuestPane(opts: {
  initialStageId: string;
  onStageChange?: (stageId: string) => void;
}): Promise<{ handles: QuestPaneHandles; editor: QuestEditor }> {
  const handles = wireQuestPane();
  populateStageSelect(handles);

  const resolveStage = (id: string): Stage => {
    const found = stageById(id);
    if (found) return found;
    const fallback = STAGES[0];
    if (!fallback) throw new Error("quest-pane: stage registry is empty");
    return fallback;
  };

  let activeStage = resolveStage(opts.initialStageId);
  renderStage(handles, activeStage);
  showQuestPane(handles);

  // Side panel: list the methods unlocked at the active stage.
  // Re-renders on stage change so the player always sees what
  // `sim.*` is currently allowed to call.
  const apiPanel: ApiPanelHandles = wireApiPanel();
  renderApiPanel(apiPanel, activeStage);
  // Hints drawer: collapsed-by-default progressive nudges.
  const hints: HintsDrawerHandles = wireHintsDrawer();
  renderHints(hints, activeStage);

  // Disable Run while the Monaco bundle loads so a click before
  // mount completes doesn't run against an undefined editor.
  handles.runBtn.disabled = true;
  handles.result.textContent = "Loading editor…";
  const editor = await mountQuestEditor({
    container: handles.editorHost,
    initialValue: activeStage.starterCode,
    language: "typescript",
  });
  handles.runBtn.disabled = false;
  handles.result.textContent = "";
  const modal = wireResultsModal();
  attachRunButton(handles, modal, editor, () => activeStage);

  // Stage navigator: rewrite the editor's contents to the new
  // stage's starter and clear the result panel. A user mid-edit
  // loses their work — by design for v1; a "discard your code?"
  // confirm is a follow-up nicety.
  handles.select.addEventListener("change", () => {
    const next = resolveStage(handles.select.value);
    activeStage = next;
    renderStage(handles, next);
    renderApiPanel(apiPanel, next);
    renderHints(hints, next);
    editor.setValue(next.starterCode);
    handles.result.textContent = "";
    opts.onStageChange?.(next.id);
  });

  return { handles, editor };
}
