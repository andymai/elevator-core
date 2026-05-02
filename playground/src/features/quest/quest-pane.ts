/**
 * Mount the Quest mode UI shell.
 *
 * Renders the stage banner, mounts the Monaco editor, wires the
 * Run/Reset buttons and stage navigator, and hosts per-stage
 * persistence. The function is idempotent and side-effect-light so
 * the shell can call it from `boot.ts` without coordinating with the
 * existing compare-mode render loop.
 */

import { renderApiPanel, wireApiPanel, type ApiPanelHandles } from "./api-panel";
import { clearChildren, requireElement } from "./dom-utils";
import { mountQuestEditor, type QuestEditor } from "./editor";
import { renderHints, wireHintsDrawer, type HintsDrawerHandles } from "./hints-drawer";
import { showResults, wireResultsModal, type ResultsModalHandles } from "./results-modal";
import { renderSnippets, wireSnippetPicker, type SnippetPickerHandles } from "./snippet-picker";
import { runStage, type StageResult } from "./stage-runner";
import { STAGES, stageById } from "./stages";
import type { StarCount, Stage } from "./stages";
import { clearCode, loadBestStars, loadCode, saveBestStars, saveCode } from "./storage";

export interface QuestPaneHandles {
  readonly root: HTMLElement;
  readonly title: HTMLElement;
  readonly brief: HTMLElement;
  readonly select: HTMLSelectElement;
  readonly editorHost: HTMLElement;
  readonly runBtn: HTMLButtonElement;
  readonly resetBtn: HTMLButtonElement;
  readonly result: HTMLElement;
}

/**
 * Wire the Quest pane DOM. Throws if any expected anchor is missing —
 * the caller should only invoke this when in Quest mode (the
 * index.html ships the section hidden by default).
 */
export function wireQuestPane(): QuestPaneHandles {
  const m = "quest-pane";
  return {
    root: requireElement("quest-pane", m),
    title: requireElement("quest-stage-title", m),
    brief: requireElement("quest-stage-brief", m),
    select: requireElement("quest-stage-select", m) as HTMLSelectElement,
    editorHost: requireElement("quest-editor", m),
    runBtn: requireElement("quest-run", m) as HTMLButtonElement,
    resetBtn: requireElement("quest-reset", m) as HTMLButtonElement,
    result: requireElement("quest-result", m),
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
function populateStageSelect(handles: QuestPaneHandles): void {
  clearChildren(handles.select);
  STAGES.forEach((stage, index) => {
    const opt = document.createElement("option");
    opt.value = stage.id;
    opt.textContent = stageOptionLabel(stage, index, loadBestStars(stage.id));
    handles.select.appendChild(opt);
  });
}

/**
 * Build the option label for a stage. Earned stars (1–3) are appended
 * as filled glyphs; unstarred stages keep the bare title to avoid
 * cluttering the picker before the player has scored anything.
 */
function stageOptionLabel(stage: Stage, index: number, stars: StarCount): string {
  const ordinal = String(index + 1).padStart(2, "0");
  const head = `${ordinal} · ${stage.title}`;
  return stars === 0 ? head : `${head} ${"★".repeat(stars)}`;
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
  onGraded: (stage: Stage, result: StageResult) => void,
): void {
  const runOnce = (): void => {
    void executeRun(handles, modal, editor, getStage(), runOnce, onGraded);
  };
  handles.runBtn.addEventListener("click", runOnce);
}

async function executeRun(
  handles: QuestPaneHandles,
  modal: ResultsModalHandles,
  editor: QuestEditor,
  stage: Stage,
  retry: () => void,
  onGraded: (stage: Stage, result: StageResult) => void,
): Promise<void> {
  handles.runBtn.disabled = true;
  handles.result.textContent = "Running…";
  try {
    // Cap the controller's initial run at one second — long enough
    // for honest setup work, short enough that an infinite loop
    // bubbles up as a timeout instead of blocking indefinitely.
    const result = await runStage(stage, editor.getValue(), { timeoutMs: 1000 });
    // Always grade — a passed run earns its stars even if the player
    // navigated to a different stage during the run window. Only
    // surface the modal/inline status if the player is still looking
    // at the same stage; otherwise hijacking their context with an
    // old result is more confusing than silently banking the score.
    onGraded(stage, result);
    if (handles.select.value === stage.id) {
      handles.result.textContent = "";
      showResults(modal, result, retry);
    }
  } catch (err) {
    if (handles.select.value === stage.id) {
      const msg = err instanceof Error ? err.message : String(err);
      // Errors stay inline — the modal is for graded outcomes.
      // A controller throw is a code bug the player needs to see in
      // place, not a result to celebrate or retry.
      handles.result.textContent = `Error: ${msg}`;
    }
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
  handles.resetBtn.disabled = true;
  handles.result.textContent = "Loading editor…";
  const editor = await mountQuestEditor({
    container: handles.editorHost,
    initialValue: loadCode(activeStage.id) ?? activeStage.starterCode,
    language: "typescript",
  });
  handles.runBtn.disabled = false;
  handles.resetBtn.disabled = false;
  handles.result.textContent = "";
  const modal = wireResultsModal();
  attachRunButton(
    handles,
    modal,
    editor,
    () => activeStage,
    (stage, result) => {
      // Persist a new high score and refresh the picker labels so the
      // ★ glyphs reflect the win without waiting for a remount. After
      // rebuilding the options we restore `activeStage.id` (not the
      // graded stage's id) — if the player navigated mid-run, the
      // dropdown should track wherever they landed, not snap back.
      if (result.passed) {
        const previous = loadBestStars(stage.id);
        if (result.stars > previous) {
          saveBestStars(stage.id, result.stars);
          populateStageSelect(handles);
          handles.select.value = activeStage.id;
        }
      }
    },
  );

  // Persist edits per stage so refresh / stage-swap don't wipe the
  // player's work. Monaco's onDidChange fires for every content
  // change including programmatic `setValue`, so a `suppressSave`
  // flag gates the debounce while we rehydrate from storage —
  // otherwise stage-swap and Reset would silently re-save the
  // starter code 300ms later, defeating the clear.
  const SAVE_DEBOUNCE_MS = 300;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let suppressSave = false;
  const scheduleSave = (): void => {
    if (suppressSave) return;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCode(activeStage.id, editor.getValue());
      saveTimer = null;
    }, SAVE_DEBOUNCE_MS);
  };
  const flushSave = (): void => {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    saveCode(activeStage.id, editor.getValue());
  };
  const setEditorSilently = (text: string): void => {
    suppressSave = true;
    try {
      editor.setValue(text);
    } finally {
      suppressSave = false;
    }
  };
  editor.onDidChange(() => {
    scheduleSave();
  });

  // Snippet picker — chips paste pre-built API calls into the
  // editor at the cursor. Wired here (after editor mount) so the
  // chip click handlers have a real editor to insert into.
  const snippets: SnippetPickerHandles = wireSnippetPicker();
  renderSnippets(snippets, activeStage, editor);

  // Reset: drop the saved entry and rehydrate the starter. Confirm
  // first because it's destructive — the player's only undo is
  // Monaco's edit history, which doesn't survive a refresh.
  handles.resetBtn.addEventListener("click", () => {
    const ok = window.confirm(`Reset ${activeStage.title} to its starter code?`);
    if (!ok) return;
    clearCode(activeStage.id);
    setEditorSilently(activeStage.starterCode);
    handles.result.textContent = "";
  });

  // Stage navigator: save the outgoing stage's edits, then rehydrate
  // the next stage from its saved entry (or starter on first visit).
  // Saving on swap covers the "user edited then immediately picked a
  // different stage" race that would otherwise lose the last <300ms
  // of typing to the debounce.
  handles.select.addEventListener("change", () => {
    flushSave();
    const next = resolveStage(handles.select.value);
    activeStage = next;
    renderStage(handles, next);
    renderApiPanel(apiPanel, next);
    renderHints(hints, next);
    renderSnippets(snippets, next, editor);
    setEditorSilently(loadCode(next.id) ?? next.starterCode);
    handles.result.textContent = "";
    opts.onStageChange?.(next.id);
  });

  return { handles, editor };
}
