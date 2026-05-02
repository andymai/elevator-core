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
  /**
   * "Next stage" CTA. Hidden by default and only revealed when the
   * caller supplies an `onNext` handler — i.e. the run passed and a
   * later stage exists in the registry. When visible the retry button
   * gets demoted (via `data-demoted=true`) so the dialog has one
   * primary action, not two competing accents.
   */
  readonly next: HTMLButtonElement;
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
    next: requireElement("quest-results-next", m) as HTMLButtonElement,
  };
}

/**
 * Show the modal with a graded `StageResult` payload. Caller-supplied
 * callbacks decouple the modal from run mechanics:
 *
 *   - `onRetry` fires on the Run again button.
 *   - `onNext`, when supplied, fires on the Next stage button. Pass
 *     `undefined` (or omit) to hide the button entirely — typical for
 *     fails, the last stage in the registry, or any case where there's
 *     no obvious "next" target.
 *
 * `failHint` is the active stage's optional diagnostic — when the
 * grade fails, the modal renders this in place of the generic "pass
 * condition wasn't met" line so the player sees the missed threshold
 * and their actual number.
 */
export function showResults(
  handles: ResultsModalHandles,
  result: StageResult,
  onRetry: () => void,
  failHint?: (grade: GradeInputs) => string,
  onNext?: () => void,
): void {
  if (result.passed) {
    handles.title.textContent = result.stars === 3 ? "Mastered!" : "Passed";
    handles.stars.textContent = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
  } else {
    handles.title.textContent = "Did not pass";
    handles.stars.textContent = "";
  }
  handles.detail.textContent = formatDetail(result.grade, result.passed, failHint);

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

  // Next-stage CTA is the success-path primary action. When shown,
  // demote Run again to the secondary slot so the dialog reads with
  // a single accented button.
  const nextHandler = result.passed ? onNext : undefined;
  if (nextHandler) {
    handles.next.hidden = false;
    handles.next.onclick = () => {
      hideResults(handles);
      nextHandler();
    };
    handles.retry.dataset["demoted"] = "true";
  } else {
    handles.next.hidden = true;
    handles.next.onclick = null;
    delete handles.retry.dataset["demoted"];
  }

  handles.root.classList.add("show");
  // Focus the success-path primary if it's there, otherwise fall back
  // to Close so keyboard users can always dismiss with Enter / Esc.
  if (nextHandler) {
    handles.next.focus();
  } else {
    handles.close.focus();
  }
}

export function hideResults(handles: ResultsModalHandles): void {
  handles.root.classList.remove("show");
}

export function formatDetail(
  grade: GradeInputs,
  passed: boolean,
  failHint?: (grade: GradeInputs) => string,
): string {
  const ticks = `tick ${grade.endTick}`;
  const counts = `${grade.delivered} delivered, ${grade.abandoned} abandoned`;
  if (passed) {
    return `${counts} · finished by ${ticks}.`;
  }
  if (failHint) {
    // Stage-authored hint takes precedence on failure. Errors thrown
    // by the hint must not blank the modal, so fall through to the
    // generic message rather than letting the throw escape.
    try {
      const hint = failHint(grade);
      if (hint) return `${counts}. ${hint}`;
    } catch {
      // Drop to generic fallback below.
    }
  }
  return `${counts}. The pass condition wasn't met within the run budget.`;
}
