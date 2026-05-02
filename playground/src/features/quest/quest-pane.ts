/**
 * Mount the Quest mode UI shell.
 *
 * Owns the `grid` ⇆ `stage` view toggle, the Monaco editor, the live
 * shaft canvas, the per-stage panels (snippets, hints, API,
 * reference solution), and the run lifecycle. Stage navigation runs
 * through the grid-card picker; cold boot lands on the grid unless
 * a `?qs=` permalink names a specific stage. Per-stage code and
 * earned stars persist via `storage.ts`.
 */

import { renderApiPanel, wireApiPanel, type ApiPanelHandles } from "./api-panel";
import { requireElement } from "./dom-utils";
import { mountQuestEditor, type QuestEditor } from "./editor";
import { renderHints, wireHintsDrawer, type HintsDrawerHandles } from "./hints-drawer";
import { renderQuestGrid, wireQuestGrid, type QuestGridHandles } from "./quest-grid";
import {
  renderReferencePanel,
  wireReferencePanel,
  type ReferencePanelHandles,
} from "./reference-panel";
import { showResults, wireResultsModal } from "./results-modal";
import { renderSnippets, wireSnippetPicker, type SnippetPickerHandles } from "./snippet-picker";
import { formatProgress } from "./stage-progress";
import { runStage } from "./stage-runner";
import { nextStage, STAGES, stageById } from "./stages";
import type { Stage } from "./stages";
import { clearCode, loadBestStars, loadCode, saveBestStars, saveCode } from "./storage";
import { CanvasRenderer } from "../../render";
import type { Snapshot } from "../../types";

/** Accent for car bodies in the Quest shaft visualization. */
const QUEST_SHAFT_ACCENT = "#f59e0b";

/** Star slots per stage — used to render the "★★☆" / "★☆☆" displays. */
const MAX_STARS_PER_STAGE = 3;

export interface QuestPaneHandles {
  readonly root: HTMLElement;
  readonly gridView: HTMLElement;
  readonly stageView: HTMLElement;
  readonly backBtn: HTMLButtonElement;
  readonly title: HTMLElement;
  readonly brief: HTMLElement;
  readonly stageStars: HTMLElement;
  readonly editorHost: HTMLElement;
  readonly runBtn: HTMLButtonElement;
  readonly resetBtn: HTMLButtonElement;
  readonly result: HTMLElement;
  /**
   * Live tick/delivered/avg-wait readout shown beside the Run row
   * while a stage is running. Distinct from `result` so screen
   * readers (which announce `result` via `aria-live`) don't get
   * spammed by the per-batch update stream.
   */
  readonly progress: HTMLElement;
  /** Canvas for the live shaft visualization. */
  readonly shaft: HTMLCanvasElement;
  /** Idle-state overlay shown when no run is in flight. */
  readonly shaftIdle: HTMLElement;
}

/** Top-level Quest view modes. */
export type QuestView = "grid" | "stage";

/**
 * Wire the Quest pane DOM. Throws if any expected anchor is missing —
 * the caller should only invoke this when in Quest mode (the
 * index.html ships the section hidden by default).
 */
export function wireQuestPane(): QuestPaneHandles {
  const m = "quest-pane";
  return {
    root: requireElement("quest-pane", m),
    gridView: requireElement("quest-grid", m),
    stageView: requireElement("quest-stage-view", m),
    backBtn: requireElement("quest-back-to-grid", m) as HTMLButtonElement,
    title: requireElement("quest-stage-title", m),
    brief: requireElement("quest-stage-brief", m),
    stageStars: requireElement("quest-stage-stars", m),
    editorHost: requireElement("quest-editor", m),
    runBtn: requireElement("quest-run", m) as HTMLButtonElement,
    resetBtn: requireElement("quest-reset", m) as HTMLButtonElement,
    result: requireElement("quest-result", m),
    progress: requireElement("quest-progress", m),
    shaft: requireElement("quest-shaft", m) as HTMLCanvasElement,
    shaftIdle: requireElement("quest-shaft-idle", m),
  };
}

/** Render the static parts of a stage (title, brief, star tier). */
export function renderStage(handles: QuestPaneHandles, stage: Stage): void {
  handles.title.textContent = stage.title;
  handles.brief.textContent = stage.brief;
  const stars = loadBestStars(stage.id);
  if (stars === 0) {
    handles.stageStars.textContent = "";
  } else {
    handles.stageStars.textContent = "★".repeat(stars) + "☆".repeat(MAX_STARS_PER_STAGE - stars);
  }
}

/**
 * Toggle which view (grid or stage) is visible. Called from both
 * the boot decision and the back-button / card-click handlers.
 * Idempotent. The current value is also tracked separately by
 * `bootQuestPane` so run-completion guards can suppress UI updates
 * when the player has navigated to the grid mid-run.
 */
function setView(handles: QuestPaneHandles, view: QuestView): void {
  handles.gridView.classList.toggle("hidden", view !== "grid");
  handles.gridView.classList.toggle("flex", view === "grid");
  handles.stageView.classList.toggle("hidden", view !== "stage");
  handles.stageView.classList.toggle("flex", view === "stage");
}

/**
 * Shared mutable flag so the stage-change / back-to-grid handlers
 * can stop an in-flight run's rAF loop. Without it, the loop's
 * closure-local flag stays `true` after navigation and keeps
 * painting the previous stage's snapshot through the (transparent)
 * idle overlay on whatever view follows.
 */
interface RunLoop {
  active: boolean;
}

/**
 * Boot the Quest pane: wire DOM, render the requested stage, mount
 * the editor with the stage's starter code, and wire navigation +
 * lifecycle. The `onStageChange` callback notifies boot.ts so the
 * permalink can sync.
 *
 * `initialStageId` may be empty / unrecognised; the function falls
 * back to STAGES[0] for editor content and lands on the grid view
 * unless `landOn` says otherwise.
 *
 * `landOn` is the cold-boot view; defaults to "grid" so a permalink
 * without `?qs=` opens to the curriculum overview. `boot.ts` passes
 * "stage" when a `?qs=` was explicitly set, taking the player
 * straight to the stage they shared.
 */
export async function bootQuestPane(opts: {
  initialStageId: string;
  landOn?: QuestView;
  onStageChange?: (stageId: string) => void;
  onBackToGrid?: () => void;
}): Promise<{ handles: QuestPaneHandles; editor: QuestEditor }> {
  const handles = wireQuestPane();

  const resolveStage = (id: string): Stage => {
    const found = stageById(id);
    if (found) return found;
    const fallback = STAGES[0];
    if (!fallback) throw new Error("quest-pane: stage registry is empty");
    return fallback;
  };

  let activeStage = resolveStage(opts.initialStageId);
  /**
   * Mirror of the visible view. Tracked alongside `activeStage` so
   * an in-flight run that completes after the player has clicked
   * "← Stages" can suppress its results modal — `activeStage.id ===
   * stage.id` alone wouldn't catch this, since `enterGrid` doesn't
   * change `activeStage`.
   */
  let currentView: QuestView = "grid";
  renderStage(handles, activeStage);

  // Side panel: list the methods unlocked at the active stage.
  const apiPanel: ApiPanelHandles = wireApiPanel();
  renderApiPanel(apiPanel, activeStage);
  // Hints drawer: collapsed-by-default progressive nudges.
  const hints: HintsDrawerHandles = wireHintsDrawer();
  renderHints(hints, activeStage);
  // Reference solution: hidden until the player passes the active
  // stage at least once.
  const reference: ReferencePanelHandles = wireReferencePanel();
  renderReferencePanel(reference, activeStage);
  // Grid view: re-rendered on initial mount and after every grade so
  // a fresh star count propagates to the cards.
  const grid: QuestGridHandles = wireQuestGrid();

  // Live shaft renderer. Reuses the compare-mode CanvasRenderer so
  // car kinematics, door cycles, and rider tweens look identical to
  // the rest of the playground. `bootQuestPane` runs exactly once
  // per page (the mode toggle hard-reloads on swap), so the
  // renderer's resize listener lives for the page lifetime —
  // `dispose()` is intentionally never called since there's no
  // remount path that would benefit.
  const shaftRenderer = new CanvasRenderer(handles.shaft, QUEST_SHAFT_ACCENT);
  const runLoop: RunLoop = { active: false };

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

  // Per-stage code persistence. Monaco's onDidChange fires for every
  // content change including programmatic `setValue`, so the
  // `suppressSave` flag gates the debounce while we rehydrate from
  // storage — otherwise stage-swap and Reset would silently re-save
  // the starter code 300ms later, defeating the clear.
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

  // Snippet chips are rendered per-stage and re-rendered on swap.
  const snippets: SnippetPickerHandles = wireSnippetPicker();
  renderSnippets(snippets, activeStage, editor);

  /** Snap any in-flight run's rAF loop and reset the canvas to idle. */
  const stopLoopAndResetCanvas = (): void => {
    runLoop.active = false;
    handles.shaftIdle.hidden = false;
    const ctx = handles.shaft.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, handles.shaft.width, handles.shaft.height);
  };

  /** Common prep when transitioning into a new stage's editor view. */
  const enterStage = (next: Stage, { fromGrid }: { fromGrid: boolean }): void => {
    flushSave();
    activeStage = next;
    renderStage(handles, next);
    renderApiPanel(apiPanel, next);
    renderHints(hints, next);
    renderReferencePanel(reference, next);
    renderSnippets(snippets, next, editor);
    setEditorSilently(loadCode(next.id) ?? next.starterCode);
    handles.result.textContent = "";
    handles.progress.textContent = "";
    stopLoopAndResetCanvas();
    setView(handles, "stage");
    currentView = "stage";
    // Notify boot.ts so the permalink picks up the new stage id.
    // `fromGrid` would skip this when the grid card click path
    // already handled URL sync — but today both paths funnel through
    // the same callback, so the parameter is purely for future-proofing
    // (e.g. a deep-link re-render that shouldn't double-write the URL).
    void fromGrid;
    opts.onStageChange?.(next.id);
  };

  /** Common prep when leaving the stage view back to the grid. */
  const enterGrid = (): void => {
    flushSave();
    stopLoopAndResetCanvas();
    handles.result.textContent = "";
    handles.progress.textContent = "";
    setView(handles, "grid");
    currentView = "grid";
    // Re-render the grid so star counts reflect any stages the
    // player just passed before backing out.
    renderQuestGrid(grid, (stageId) => {
      enterStage(resolveStage(stageId), { fromGrid: true });
    });
    opts.onBackToGrid?.();
  };

  // Initial grid render so cards exist before the player ever clicks
  // Back. Cheap (15 cards) and avoids a flash of empty grid the
  // first time someone navigates back from a stage.
  renderQuestGrid(grid, (stageId) => {
    enterStage(resolveStage(stageId), { fromGrid: true });
  });

  // Cold-boot view: stage if the caller asked for it (typically when
  // a `?qs=` permalink picked a specific stage), else grid.
  const initialView = opts.landOn ?? "grid";
  setView(handles, initialView);
  currentView = initialView;

  // Run button — closure captures `activeStage` so a navigation
  // between presses pulls the new stage cleanly.
  const runOnce = async (): Promise<void> => {
    const stage = activeStage;
    handles.runBtn.disabled = true;
    handles.result.textContent = "Running…";
    handles.progress.textContent = "";

    // Live shaft loop. Snapshots arrive from the worker every batch
    // (~3-5 Hz). Cache the latest one and let an rAF loop redraw
    // every animation frame so the renderer's tweens fill the gaps
    // between server-side updates.
    let latestSnap: Snapshot | null = null;
    let snapshotsRendered = 0;
    runLoop.active = true;
    const renderTick = (): void => {
      if (!runLoop.active) return;
      if (latestSnap !== null) {
        shaftRenderer.draw(latestSnap, 1);
      }
      requestAnimationFrame(renderTick);
    };
    handles.shaftIdle.hidden = true;
    requestAnimationFrame(renderTick);

    try {
      // Cap the controller's initial run at one second — long enough
      // for honest setup work, short enough that an infinite loop
      // bubbles up as a timeout.
      // The "still active" predicate gates every player-facing UI
      // update from a settling run. Both halves matter:
      //
      //   - `currentView === "stage"` — the player navigated to the
      //     grid mid-run; pinning the modal over the curriculum
      //     overview would be jarring and wrong.
      //   - `activeStage.id === stage.id` — the player swapped to a
      //     different stage; the outgoing run's result belongs to the
      //     stage they left, not the one they're looking at now.
      //
      // Star banking happens unconditionally below — a passed run
      // earns its stars regardless of where the player ended up.
      const stillActive = (): boolean => currentView === "stage" && activeStage.id === stage.id;

      const result = await runStage(stage, editor.getValue(), {
        timeoutMs: 1000,
        onProgress: (grade) => {
          if (!stillActive()) return;
          handles.progress.textContent = formatProgress(grade);
        },
        onSnapshot: (snap) => {
          latestSnap = snap;
          snapshotsRendered += 1;
        },
      });
      if (result.passed) {
        const previous = loadBestStars(stage.id);
        if (result.stars > previous) {
          saveBestStars(stage.id, result.stars);
          // Re-render the grid (progress meter + per-card stars) so
          // that backing out to it later reflects the new score —
          // even if the player has already navigated away.
          renderQuestGrid(grid, (stageId) => {
            enterStage(resolveStage(stageId), { fromGrid: true });
          });
          if (stillActive()) renderStage(handles, activeStage);
        }
        if (stillActive()) {
          // Pass `collapse: false` so a panel the player already
          // expanded doesn't snap shut on a re-grade.
          renderReferencePanel(reference, activeStage, { collapse: false });
        }
      }
      if (stillActive()) {
        handles.result.textContent = "";
        handles.progress.textContent = "";
        const next = result.passed ? nextStage(stage.id) : undefined;
        const onNext = next
          ? () => {
              enterStage(next, { fromGrid: false });
            }
          : undefined;
        showResults(modal, result, () => void runOnce(), stage.failHint, onNext);
      }
    } catch (err) {
      if (currentView === "stage" && activeStage.id === stage.id) {
        const msg = err instanceof Error ? err.message : String(err);
        // Errors stay inline — the modal is for graded outcomes.
        handles.result.textContent = `Error: ${msg}`;
        handles.progress.textContent = "";
      }
    } finally {
      handles.runBtn.disabled = false;
      // Stop the rAF loop. The canvas keeps its last drawn frame so
      // the player can study the final state.
      runLoop.active = false;
      // Bring the idle overlay back only if no snapshot ever
      // rendered (e.g. controller threw before the first batch).
      // Clear the canvas in that branch so a previous run's frozen
      // frame doesn't show through the transparent overlay.
      if (snapshotsRendered === 0) {
        const ctx = handles.shaft.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, handles.shaft.width, handles.shaft.height);
        handles.shaftIdle.hidden = false;
      }
    }
  };
  handles.runBtn.addEventListener("click", () => {
    void runOnce();
  });

  // Reset: drop the saved entry and rehydrate the starter. Confirm
  // first because it's destructive.
  handles.resetBtn.addEventListener("click", () => {
    const ok = window.confirm(`Reset ${activeStage.title} to its starter code?`);
    if (!ok) return;
    clearCode(activeStage.id);
    setEditorSilently(activeStage.starterCode);
    handles.result.textContent = "";
  });

  // Back to grid.
  handles.backBtn.addEventListener("click", () => {
    enterGrid();
  });

  return { handles, editor };
}
