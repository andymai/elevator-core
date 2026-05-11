import { renderPaneStrategyInfo, renderPaneRepositionInfo } from "../features/strategy-picker";
import { syncScenarioCards } from "../features/scenario-picker";
import { setTweakOpen, renderTweakPanel } from "../features/tweak-drawer";
import { scenarioById, type PermalinkState } from "../domain";
import { generate as generateRandomWords } from "random-words";
import type { UiHandles } from "./wire-ui";

export const speedLabel = (v: number): string => `${v}\u00d7`;
export const intensityLabel = (v: number): string => `${v.toFixed(1)}\u00d7`;

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
  // Airport-mode scenarios force single-pane: the concentric-rings
  // renderer is not designed to survive a half-width compare canvas,
  // and there's only one strategy that makes sense (LoopSchedule, set
  // per-group in the RON), so the strategy popover is hidden too.
  // When switching away, the toggles re-enable; the user's previous
  // compare preference isn't restored.
  const singlePane = scenario.airport !== undefined;
  const effectiveCompare = singlePane ? false : p.compare;
  ui.compareToggle.checked = effectiveCompare;
  ui.compareToggle.disabled = singlePane;
  ui.layout.dataset["mode"] = effectiveCompare ? "compare" : "single";
  ui.seedInput.value = p.seed;
  ui.speedInput.value = String(p.speed);
  ui.speedLabel.textContent = speedLabel(p.speed);
  ui.intensityInput.value = String(p.intensity);
  ui.intensityLabel.textContent = intensityLabel(p.intensity);
  renderPaneStrategyInfo(ui.paneA, p.strategyA);
  renderPaneStrategyInfo(ui.paneB, p.strategyB);
  renderPaneRepositionInfo(ui.paneA, p.repositionA);
  renderPaneRepositionInfo(ui.paneB, p.repositionB);
  // Hide the strategy popover trigger on airport scenarios — the RON's
  // per-group LoopSchedule is the only dispatch that makes sense.
  ui.paneA.trigger.disabled = singlePane;
  ui.paneB.trigger.disabled = singlePane;
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
