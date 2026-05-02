/**
 * Render the canonical reference-solution drawer for a stage.
 *
 * The panel lives beneath the hints drawer in the Quest pane. It
 * stays hidden until the player has earned at least 1★ on the
 * stage (a bare pass) — at which point the canonical solution
 * unlocks as a collapsible read-only block. A stage that doesn't
 * ship a `referenceSolution` keeps the panel hidden regardless of
 * grade, so adding solutions per stage stays incremental.
 *
 * The panel renders as `<pre><code>` rather than a second Monaco
 * instance: a Monaco mount per panel adds ~3 MB of editor surface
 * for read-only display, and the player already has the language-
 * service-aware editor up top for live work.
 */

import { clearChildren, requireElement } from "./dom-utils";
import type { Stage } from "./stages";
import { loadBestStars } from "./storage";

export interface ReferencePanelHandles {
  readonly root: HTMLDetailsElement;
  readonly status: HTMLElement;
  readonly code: HTMLElement;
}

export function wireReferencePanel(): ReferencePanelHandles {
  return {
    root: requireElement("quest-reference", "reference-panel") as HTMLDetailsElement,
    status: requireElement("quest-reference-status", "reference-panel"),
    code: requireElement("quest-reference-code", "reference-panel"),
  };
}

export function renderReferencePanel(handles: ReferencePanelHandles, stage: Stage): void {
  const solution = stage.referenceSolution;
  const stars = loadBestStars(stage.id);
  // Hide the panel completely if the stage doesn't ship a solution
  // OR the player hasn't passed yet. Hiding the entire `<details>`
  // (rather than rendering a "locked" placeholder) keeps the UI
  // clean for stages still being authored.
  if (!solution || stars === 0) {
    handles.root.hidden = true;
    handles.root.removeAttribute("open");
    return;
  }
  handles.root.hidden = false;
  handles.status.textContent = stars === 3 ? "(mastered)" : "(unlocked)";
  clearChildren(handles.code);
  // textContent escapes HTML — cheaper and safer than innerHTML
  // for the verbatim code block.
  handles.code.textContent = solution;
  // Collapse on stage navigation so the next stage's panel doesn't
  // pop open with stale code visible.
  handles.root.removeAttribute("open");
}
