import type { RepositionStrategyName, StrategyName } from "../../types";
import { toast } from "../../platform";
import { scenarioById } from "../../domain";
import { STRATEGY_DESCRIPTIONS, STRATEGY_LABELS, UI_STRATEGIES } from "./labels";
import { renderPopoverOptions } from "./popover-options";
import { closeAllPopovers } from "./reposition-popover";
import { syncSheetCompact } from "../scenario-picker";

/** Narrow interface — only the fields strategy popovers need from a pane. */
export interface StrategyPaneHandles {
  name: HTMLElement;
  desc: HTMLElement;
  trigger: HTMLButtonElement;
  popover: HTMLElement;
  which: "a" | "b";
}

/** Narrow interface — only the fields strategy popovers need from UiHandles. */
export interface StrategyUiHandles {
  paneA: StrategyPaneHandles & RepositionPaneHandles;
  paneB: StrategyPaneHandles & RepositionPaneHandles;
  toast: HTMLElement;
  sheetScenario: HTMLElement;
  sheetStrategy: HTMLElement;
}

/** Fields needed from reposition pane handles for closeAllPopovers. */
export interface RepositionPaneHandles {
  repoTrigger: HTMLButtonElement;
  repoName: HTMLElement;
  repoPopover: HTMLElement;
}

/** Narrow interface for state access. */
export interface StrategyState {
  permalink: {
    strategyA: StrategyName;
    strategyB: StrategyName;
    repositionA: RepositionStrategyName;
    repositionB: RepositionStrategyName;
    compare: boolean;
    scenario: string;
  };
}

/**
 * Sync a pane's header chip + description subtitle to the given
 * strategy. Used on boot, on scenario switch (pane A), and on each
 * popover pick. The chip's label lives in a nested `#name-*` span so
 * the caret glyph next to it stays untouched.
 */
export function renderPaneStrategyInfo(pane: StrategyPaneHandles, strategy: StrategyName): void {
  const label = STRATEGY_LABELS[strategy];
  const desc = STRATEGY_DESCRIPTIONS[strategy];
  if (pane.name.textContent !== label) pane.name.textContent = label;
  if (pane.desc.textContent !== desc) pane.desc.textContent = desc;
  pane.trigger.setAttribute("aria-label", `Change dispatch strategy (currently ${label})`);
  pane.trigger.title = desc;
}

function renderStrategyPopover(
  pane: StrategyPaneHandles,
  currentStrategy: StrategyName,
  siblingStrategy: StrategyName | null,
  siblingLabel: "A" | "B",
  onPick: (s: StrategyName) => void,
): void {
  renderPopoverOptions(
    pane.popover,
    UI_STRATEGIES,
    STRATEGY_LABELS,
    STRATEGY_DESCRIPTIONS,
    "strategy",
    currentStrategy,
    siblingStrategy,
    siblingLabel,
    onPick,
  );
}

/** Re-render both pane popovers from current state. Cheap (12 rows). */
export function refreshStrategyPopovers(
  state: StrategyState,
  ui: StrategyUiHandles,
  resetAll: () => Promise<void>,
): void {
  const { strategyA, strategyB, compare } = state.permalink;
  renderStrategyPopover(
    ui.paneA,
    strategyA,
    compare ? strategyB : null,
    "B",
    (s) => void pickStrategy(state, ui, "a", s, resetAll),
  );
  renderStrategyPopover(
    ui.paneB,
    strategyB,
    compare ? strategyA : null,
    "A",
    (s) => void pickStrategy(state, ui, "b", s, resetAll),
  );
}

function setStrategyPopoverOpen(pane: StrategyPaneHandles, open: boolean): void {
  pane.popover.hidden = !open;
  pane.trigger.setAttribute("aria-expanded", String(open));
}

export function isAnyStrategyPopoverOpen(ui: StrategyUiHandles): boolean {
  return !ui.paneA.popover.hidden || !ui.paneB.popover.hidden;
}

export function closeAllStrategyPopovers(ui: StrategyUiHandles): void {
  setStrategyPopoverOpen(ui.paneA, false);
  setStrategyPopoverOpen(ui.paneB, false);
}

/**
 * Wire a pane's chip trigger to toggle its popover. Closing the
 * sibling popover on open keeps only one panel visible at a time.
 */
export function attachStrategyPopover(
  state: StrategyState,
  ui: StrategyUiHandles,
  pane: StrategyPaneHandles & RepositionPaneHandles,
  resetAll: () => Promise<void>,
): void {
  pane.trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const willOpen = pane.popover.hidden;
    closeAllPopovers(ui);
    if (willOpen) {
      // Refresh just before opening so (also in A/B) badges reflect
      // the current state even if the sibling just changed strategy.
      refreshStrategyPopovers(state, ui, resetAll);
      setStrategyPopoverOpen(pane, true);
    }
  });
}

/**
 * Apply a strategy choice from a popover. Noop when the user picks
 * the already-active strategy. Otherwise updates the permalink,
 * refreshes both popovers (so (also in …) badges stay accurate), and
 * triggers `resetAll` so both panes restart on the same rider stream
 * — which is the only way the scoreboard stays apples-to-apples.
 */
async function pickStrategy(
  state: StrategyState,
  ui: StrategyUiHandles,
  which: "a" | "b",
  strategy: StrategyName,
  resetAll: () => Promise<void>,
): Promise<void> {
  const current = which === "a" ? state.permalink.strategyA : state.permalink.strategyB;
  if (current === strategy) {
    closeAllStrategyPopovers(ui);
    return;
  }
  if (which === "a") {
    state.permalink = { ...state.permalink, strategyA: strategy };
    renderPaneStrategyInfo(ui.paneA, strategy);
    syncSheetCompact(ui, scenarioById(state.permalink.scenario).label, strategy);
  } else {
    state.permalink = { ...state.permalink, strategyB: strategy };
    renderPaneStrategyInfo(ui.paneB, strategy);
  }
  refreshStrategyPopovers(state, ui, resetAll);
  closeAllStrategyPopovers(ui);
  await resetAll();
  toast(ui.toast, `${which === "a" ? "A" : "B"}: ${STRATEGY_LABELS[strategy]}`);
}
