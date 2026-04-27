import type { RepositionStrategyName } from "../../types";
import { toast } from "../../platform";
import { syncPermalinkUrl } from "../../domain";
import { REPOSITION_DESCRIPTIONS, REPOSITION_LABELS, UI_REPOSITION_STRATEGIES } from "./labels";
import { renderPopoverOptions } from "./popover-options";
import {
  closeAllStrategyPopovers,
  isAnyStrategyPopoverOpen,
  type RepositionPaneHandles,
  type StrategyPaneHandles,
  type StrategyState,
  type StrategyUiHandles,
} from "./dispatch-popover";

/**
 * Sync the reposition chip for a pane. Mirrors
 * `renderPaneStrategyInfo` but writes to the `repo-*` handles so the
 * same chip/popover interaction pattern reuses across both.
 */
export function renderPaneRepositionInfo(
  pane: RepositionPaneHandles,
  reposition: RepositionStrategyName,
): void {
  const label = REPOSITION_LABELS[reposition];
  const desc = REPOSITION_DESCRIPTIONS[reposition];
  if (pane.repoName.textContent !== label) pane.repoName.textContent = label;
  pane.repoTrigger.setAttribute("aria-label", `Change idle-parking strategy (currently ${label})`);
  pane.repoTrigger.title = desc;
}

function renderRepositionPopover(
  pane: RepositionPaneHandles,
  currentReposition: RepositionStrategyName,
  siblingReposition: RepositionStrategyName | null,
  siblingLabel: "A" | "B",
  onPick: (r: RepositionStrategyName) => void,
): void {
  renderPopoverOptions(
    pane.repoPopover,
    UI_REPOSITION_STRATEGIES,
    REPOSITION_LABELS,
    REPOSITION_DESCRIPTIONS,
    "reposition",
    currentReposition,
    siblingReposition,
    siblingLabel,
    onPick,
  );
}

export function refreshRepositionPopovers(
  state: StrategyState,
  ui: StrategyUiHandles,
  resetAll: () => Promise<void>,
): void {
  const { repositionA, repositionB, compare } = state.permalink;
  renderRepositionPopover(
    ui.paneA,
    repositionA,
    compare ? repositionB : null,
    "B",
    (r) => void pickReposition(state, ui, "a", r, resetAll),
  );
  renderRepositionPopover(
    ui.paneB,
    repositionB,
    compare ? repositionA : null,
    "A",
    (r) => void pickReposition(state, ui, "b", r, resetAll),
  );
}

function setRepositionPopoverOpen(pane: RepositionPaneHandles, open: boolean): void {
  pane.repoPopover.hidden = !open;
  pane.repoTrigger.setAttribute("aria-expanded", String(open));
}

export function isAnyRepositionPopoverOpen(ui: StrategyUiHandles): boolean {
  return !ui.paneA.repoPopover.hidden || !ui.paneB.repoPopover.hidden;
}

function closeAllRepositionPopovers(ui: StrategyUiHandles): void {
  setRepositionPopoverOpen(ui.paneA, false);
  setRepositionPopoverOpen(ui.paneB, false);
}

/** Close any popover (dispatch or reposition) on any pane. */
export function closeAllPopovers(ui: StrategyUiHandles): void {
  closeAllStrategyPopovers(ui);
  closeAllRepositionPopovers(ui);
}

export function attachRepositionPopover(
  state: StrategyState,
  ui: StrategyUiHandles,
  pane: StrategyPaneHandles & RepositionPaneHandles,
  resetAll: () => Promise<void>,
): void {
  pane.repoTrigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const willOpen = pane.repoPopover.hidden;
    closeAllPopovers(ui);
    if (willOpen) {
      refreshRepositionPopovers(state, ui, resetAll);
      setRepositionPopoverOpen(pane, true);
    }
  });
}

async function pickReposition(
  state: StrategyState,
  ui: StrategyUiHandles,
  which: "a" | "b",
  reposition: RepositionStrategyName,
  resetAll: () => Promise<void>,
): Promise<void> {
  const current = which === "a" ? state.permalink.repositionA : state.permalink.repositionB;
  if (current === reposition) {
    closeAllRepositionPopovers(ui);
    return;
  }
  if (which === "a") {
    state.permalink = { ...state.permalink, repositionA: reposition };
    renderPaneRepositionInfo(ui.paneA, reposition);
  } else {
    state.permalink = { ...state.permalink, repositionB: reposition };
    renderPaneRepositionInfo(ui.paneB, reposition);
  }
  syncPermalinkUrl(state.permalink);
  refreshRepositionPopovers(state, ui, resetAll);
  closeAllRepositionPopovers(ui);
  await resetAll();
  toast(ui.toast, `${which === "a" ? "A" : "B"} park: ${REPOSITION_LABELS[reposition]}`);
}

/**
 * Global outside-click listener that dismisses any open strategy
 * popover when the click lands outside both a popover and its
 * trigger. Registered once; both panes share the handler so we
 * don't accidentally leak an open popover when the DOM is rebuilt.
 */
export function attachOutsideClickForPopovers(ui: StrategyUiHandles): void {
  document.addEventListener("click", (ev) => {
    if (!isAnyStrategyPopoverOpen(ui) && !isAnyRepositionPopoverOpen(ui)) return;
    const target = ev.target;
    if (!(target instanceof Node)) return;
    for (const pane of [ui.paneA, ui.paneB] as const) {
      if (pane.popover.contains(target)) return;
      if (pane.trigger.contains(target)) return;
      if (pane.repoPopover.contains(target)) return;
      if (pane.repoTrigger.contains(target)) return;
    }
    closeAllPopovers(ui);
  });
}
