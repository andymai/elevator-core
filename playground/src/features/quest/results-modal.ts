/**
 * Results modal — shown after a `runStage` settles.
 *
 * Replaces the inline result text with a focused dialog so the
 * pass/fail outcome can't be missed under a long editor or hidden
 * behind a results-pending state. The inline `<span>` from the
 * Run row stays as a status hint while the modal is closed (the
 * "Loading editor…" affordance still uses it), so the modal is
 * additive — it appears on settle and dismisses on close or retry.
 */

import { requireElement } from "./dom-utils";
import type { GradeInputs } from "./stages";
import type { StageResult } from "./stage-runner";

export interface ResultsModalHandles {
  readonly root: HTMLElement;
  readonly title: HTMLElement;
  readonly stars: HTMLElement;
  readonly detail: HTMLElement;
  readonly close: HTMLButtonElement;
  readonly retry: HTMLButtonElement;
}

export function wireResultsModal(): ResultsModalHandles {
  const m = "results-modal";
  return {
    root: requireElement("quest-results-modal", m),
    title: requireElement("quest-results-title", m),
    stars: requireElement("quest-results-stars", m),
    detail: requireElement("quest-results-detail", m),
    close: requireElement("quest-results-close", m) as HTMLButtonElement,
    retry: requireElement("quest-results-retry", m) as HTMLButtonElement,
  };
}

/**
 * Show the modal with a graded `StageResult` payload. The retry
 * button's behaviour is wired by the caller via `onRetry` so the
 * modal stays decoupled from the run mechanics.
 */
export function showResults(
  handles: ResultsModalHandles,
  result: StageResult,
  onRetry: () => void,
): void {
  if (result.passed) {
    handles.title.textContent = result.stars === 3 ? "Mastered!" : "Passed";
    handles.stars.textContent = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
  } else {
    handles.title.textContent = "Did not pass";
    handles.stars.textContent = "";
  }
  handles.detail.textContent = formatDetail(result.grade, result.passed);

  // Bind a fresh retry handler each show so a previous run's
  // closure doesn't leak. Same for close — `addEventListener` with
  // `{ once: true }` keeps us from accumulating listeners across
  // many runs.
  handles.retry.onclick = () => {
    hideResults(handles);
    onRetry();
  };
  handles.close.onclick = () => {
    hideResults(handles);
  };

  handles.root.classList.add("show");
  // Focus the close button so keyboard users can dismiss without
  // hunting for the dialog's tabbable surface.
  handles.close.focus();
}

export function hideResults(handles: ResultsModalHandles): void {
  handles.root.classList.remove("show");
}

function formatDetail(grade: GradeInputs, passed: boolean): string {
  const ticks = `tick ${grade.endTick}`;
  const counts = `${grade.delivered} delivered, ${grade.abandoned} abandoned`;
  if (passed) {
    return `${counts} · finished by ${ticks}.`;
  }
  return `${counts}. The pass condition wasn't met within the run budget.`;
}
