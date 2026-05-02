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

import { requireElement } from "./dom-utils";
import type { Stage } from "./stages";
import { loadBestStars } from "./storage";

export interface ReferencePanelHandles {
  readonly root: HTMLDetailsElement;
  readonly status: HTMLElement;
  readonly code: HTMLElement;
}

export interface RenderReferenceOptions {
  /**
   * Collapse the drawer when re-rendering. Default `true` — the right
   * behaviour on initial mount and stage navigation, where the player
   * hasn't expressed an opinion yet. Pass `false` when the re-render
   * is driven by an in-place state change (e.g. the player just
   * earned more stars on the active stage) so a panel they already
   * expanded doesn't snap shut on them.
   */
  readonly collapse?: boolean;
}

export function wireReferencePanel(): ReferencePanelHandles {
  return {
    root: requireElement("quest-reference", "reference-panel") as HTMLDetailsElement,
    status: requireElement("quest-reference-status", "reference-panel"),
    code: requireElement("quest-reference-code", "reference-panel"),
  };
}

export function renderReferencePanel(
  handles: ReferencePanelHandles,
  stage: Stage,
  options: RenderReferenceOptions = {},
): void {
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
  // textContent replaces all children atomically and escapes HTML —
  // no clearChildren needed first.
  handles.code.textContent = solution;
  if (options.collapse !== false) {
    handles.root.removeAttribute("open");
  }
}
