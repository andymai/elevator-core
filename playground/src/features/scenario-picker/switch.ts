import { scenarioById } from "../../domain";
import type { PermalinkState } from "../../domain";
import type { ParamKey } from "../../domain";
import { toast } from "../../platform";
import {
  STRATEGY_LABELS,
  renderPaneStrategyInfo,
  refreshStrategyPopovers,
} from "../strategy-picker";
import { syncScenarioCards } from "./cards";
import { syncSheetCompact } from "./sheet-compact";
import { renderTweakPanel, type TweakPanelUi } from "../tweak-drawer";
import type { TweakRowHandles } from "../tweak-drawer";

/** Narrow pane handles for scenario switching. */
interface ScenarioPaneHandles {
  name: HTMLElement;
  desc: HTMLElement;
  trigger: HTMLButtonElement;
  popover: HTMLElement;
  which: "a" | "b";
  repoTrigger: HTMLButtonElement;
  repoName: HTMLElement;
  repoPopover: HTMLElement;
}

/** Narrow interface — only the fields scenario switching needs from state. */
export interface ScenarioSwitchState {
  permalink: PermalinkState;
}

/** Narrow interface — only the fields scenario switching needs from UiHandles. */
export interface ScenarioSwitchUi extends TweakPanelUi {
  paneA: ScenarioPaneHandles;
  paneB: ScenarioPaneHandles;
  scenarioCards: HTMLElement;
  sheetScenario: HTMLElement;
  sheetStrategy: HTMLElement;
  toast: HTMLElement;
  tweakRows: Record<ParamKey, TweakRowHandles>;
  tweakResetAllBtn: HTMLButtonElement;
}

/**
 * Shared by keyboard shortcuts and scenario-card clicks so both paths
 * dispatch the same transition.
 *
 * Overrides are cleared on scenario switch — every scenario has a
 * distinct physics envelope (a 0.5 m/s slider makes sense for a
 * residential tower, not for a 50 m/s climber on a tether) so
 * cross-scenario carry-over surprised more than it helped during
 * early prototyping.
 */
export async function switchScenario(
  state: ScenarioSwitchState,
  ui: ScenarioSwitchUi,
  scenarioId: string,
  resetAll: () => Promise<void>,
): Promise<void> {
  const scenario = scenarioById(scenarioId);
  // Snap pane A (and pane B when in single-pane mode) to the
  // scenario's recommended strategy. In compare mode we leave both
  // panes alone so the user's comparison setup survives.
  const nextStrategyA = state.permalink.compare
    ? state.permalink.strategyA
    : scenario.defaultStrategy;
  state.permalink = {
    ...state.permalink,
    scenario: scenario.id,
    strategyA: nextStrategyA,
    overrides: {},
  };
  renderPaneStrategyInfo(ui.paneA, nextStrategyA);
  refreshStrategyPopovers(state, ui, resetAll);
  syncScenarioCards(ui, scenario.id);
  syncSheetCompact(ui, scenario.label, nextStrategyA);
  await resetAll();
  renderTweakPanel(scenario, state.permalink.overrides, ui);
  toast(ui.toast, `${scenario.label} \u00b7 ${STRATEGY_LABELS[nextStrategyA]}`);
}

/**
 * Canonicalise legacy scenario ids through the `scenarioById` fallback
 * so the rest of boot operates on the current canonical id. Strategy is
 * intentionally left alone: on first load we honour whatever the
 * permalink encoded — the snap-to-scenario-default behaviour only
 * fires on an interactive scenario change, not on boot.
 */
export function reconcileStrategyWithScenario(p: PermalinkState): void {
  const scenario = scenarioById(p.scenario);
  p.scenario = scenario.id;
}
