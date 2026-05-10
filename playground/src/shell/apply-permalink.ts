import { renderPaneStrategyInfo, renderPaneRepositionInfo } from "../features/strategy-picker";
import { syncScenarioCards } from "../features/scenario-picker";
import { setTweakOpen, renderTweakPanel } from "../features/tweak-drawer";
import { scenarioById, type PermalinkState } from "../domain";
import { generate as generateRandomWords } from "random-words";
import type { UiHandles } from "./wire-ui";

export const speedLabel = (v: number): string => `${v}\u00d7`;
export const intensityLabel = (v: number): string => `${v.toFixed(1)}\u00d7`;

/** Narrow shape both `applyPermalinkToUi` and `switchScenario` can satisfy. */
export interface CompareToggleHandles {
  compareToggle: HTMLInputElement;
  layout: HTMLElement;
}

/**
 * Drive the compare-toggle's checked / disabled / mode-class triplet.
 * Called from both permalink application and scenario switching so a
 * scenario that opts out of compare can't drift between them.
 */
export function syncCompareToggle(
  ui: CompareToggleHandles,
  scenarioDisablesCompare: boolean,
  preferredCompare: boolean,
): void {
  const effectiveCompare = scenarioDisablesCompare ? false : preferredCompare;
  ui.compareToggle.checked = effectiveCompare;
  ui.compareToggle.disabled = scenarioDisablesCompare;
  ui.compareToggle.title = scenarioDisablesCompare
    ? "Compare is unavailable for this scenario"
    : "";
  ui.layout.dataset["mode"] = effectiveCompare ? "compare" : "single";
}

/**
 * Draw a random seed word from the `random-words` dictionary
 * (~1800 short English words). Bounded length so the field stays
 * readable in the compact control strip — typical results look like
 * "orange", "window", "market", "static".
 */
export function randomSeedWord(): string {
  const word = generateRandomWords({ exactly: 1, minLength: 3, maxLength: 8 });
  // `generate` can return a single string or a string array depending
  // on options; normalise to the first element.
  return Array.isArray(word) ? (word[0] ?? "seed") : word;
}

export function applyPermalinkToUi(p: PermalinkState, ui: UiHandles): void {
  const scenario = scenarioById(p.scenario);
  // Scenarios that opt out of compare mode (e.g. horizontal pedway,
  // whose stacked-lane layout doesn't tile vertically into the
  // compare grid) coerce the toggle off and disable the control while
  // active. The permalink keeps its prior value so toggling back to a
  // compare-capable scenario restores the user's preference.
  syncCompareToggle(ui, scenario.disableCompare === true, p.compare);
  ui.seedInput.value = p.seed;
  ui.speedInput.value = String(p.speed);
  ui.speedLabel.textContent = speedLabel(p.speed);
  ui.intensityInput.value = String(p.intensity);
  ui.intensityLabel.textContent = intensityLabel(p.intensity);
  renderPaneStrategyInfo(ui.paneA, p.strategyA);
  renderPaneStrategyInfo(ui.paneB, p.strategyB);
  renderPaneRepositionInfo(ui.paneA, p.repositionA);
  renderPaneRepositionInfo(ui.paneB, p.repositionB);
  syncScenarioCards(ui, p.scenario);
  // Auto-open the drawer when the permalink carries any override —
  // the recipient sees what the sender customized without an extra
  // click. A clean URL leaves the drawer closed so first-time
  // visitors meet the unchanged playground.
  if (Object.keys(p.overrides).length > 0) {
    setTweakOpen(ui, true);
  }
  renderTweakPanel(scenario, p.overrides, ui);
}
