import { scenarioById, STRATEGY_LABELS, type PermalinkState } from "../../domain";
import { toast } from "../../platform";
import type { RepositionStrategyName, StrategyName } from "../../types";
import { syncScenarioCards } from "./cards";

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
export interface ScenarioSwitchUi {
  paneA: ScenarioPaneHandles;
  paneB: ScenarioPaneHandles;
  scenarioCards: HTMLElement;
  toast: HTMLElement;
  compareToggle: HTMLInputElement;
  layout: HTMLElement;
}

/**
 * Callback the shell passes so scenario-picker can trigger cross-feature
 * side-effects (strategy info, tweak panel, popovers) without importing
 * those features directly.
 */
export interface ScenarioSwitchHooks {
  renderPaneStrategyInfo: (pane: ScenarioPaneHandles, strategy: StrategyName) => void;
  refreshStrategyPopovers: () => void;
  renderTweakPanel: () => void;
  /**
   * Refresh the reposition-strategy chip on a pane. Mirrors
   * `renderPaneStrategyInfo` and is invoked when a scenario's
   * `defaultReposition` snaps the chip to a new value.
   */
  renderPaneRepositionInfo: (pane: ScenarioPaneHandles, reposition: RepositionStrategyName) => void;
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
  hooks: ScenarioSwitchHooks,
): Promise<void> {
  const scenario = scenarioById(scenarioId);
  // Manual-control scenarios force compare off, swap the layout mode,
  // and toggle the body's `scenarioMode` flag (CSS rules in style.css
  // hide the compare toggle and intensity slider keyed off that). Other
  // scenarios clear the flag so the standard chrome reappears.
  const isManual = scenario.manualControl !== undefined;
  if (isManual) {
    state.permalink.compare = false;
    ui.compareToggle.checked = false;
    document.body.dataset["scenarioMode"] = "manual-control";
    ui.layout.dataset["mode"] = "manual-control";
  } else {
    delete document.body.dataset["scenarioMode"];
    if (ui.layout.dataset["mode"] === "manual-control") {
      ui.layout.dataset["mode"] = state.permalink.compare ? "compare" : "single";
    }
  }
  // Snap pane A (and pane B when in single-pane mode) to the
  // scenario's recommended strategy. In compare mode we leave both
  // panes alone so the user's comparison setup survives.
  const nextStrategyA = state.permalink.compare
    ? state.permalink.strategyA
    : scenario.defaultStrategy;
  // Reposition is snapped on scenario switch only when the scenario
  // opts in via `defaultReposition` — carrying a Lobby pick from a
  // skyscraper into the space elevator made every idle climber
  // slide back to the ground, which defeats the spread layout. The
  // playback-speed slider is *not* touched here; that's a per-user
  // preference, and a long-haul scenario where individual trips
  // take minutes is intentional, not a UX bug.
  const nextReposition: RepositionStrategyName =
    scenario.defaultReposition !== undefined && !state.permalink.compare
      ? scenario.defaultReposition
      : state.permalink.repositionA;
  state.permalink = {
    ...state.permalink,
    scenario: scenario.id,
    strategyA: nextStrategyA,
    repositionA: nextReposition,
    overrides: {},
  };
  hooks.renderPaneStrategyInfo(ui.paneA, nextStrategyA);
  hooks.renderPaneRepositionInfo(ui.paneA, nextReposition);
  hooks.refreshStrategyPopovers();
  syncScenarioCards(ui, scenario.id);
  await resetAll();
  hooks.renderTweakPanel();
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
