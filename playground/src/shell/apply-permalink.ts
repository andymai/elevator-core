import { renderPaneStrategyInfo, renderPaneRepositionInfo } from "../features/strategy-picker";
import { syncScenarioCards } from "../features/scenario-picker";
import { setTweakOpen, renderTweakPanel } from "../features/tweak-drawer";
import { scenarioById, type PermalinkState } from "../domain";
import { generate as generateRandomWords } from "random-words";
import type { ScenarioMeta } from "../types";
import type { UiHandles } from "./wire-ui";
import { AIRPORT_DISPATCH_LABEL, AIRPORT_DISPATCH_DESC } from "./airport-labels";

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

/**
 * Single-pane gating for scenarios that can't survive compare mode
 * (concentric viz at half-width) and that hard-pin their dispatch via
 * RON per-group config (LoopSchedule). Disables the relevant triggers,
 * forces compare off in the UI, overwrites the dispatch chip text,
 * and hides the parking chip entirely since the scenario has no
 * reposition strategy. Must run AFTER `renderPaneStrategyInfo` /
 * `renderPaneRepositionInfo` so overrides aren't clobbered.
 */
export function applyScenarioGating(ui: UiHandles, scenario: ScenarioMeta): boolean {
  const singlePane = scenario.airport !== undefined;
  ui.compareToggle.disabled = singlePane;
  ui.paneA.trigger.disabled = singlePane;
  ui.paneB.trigger.disabled = singlePane;
  ui.paneA.repoTrigger.disabled = singlePane;
  ui.paneB.repoTrigger.disabled = singlePane;
  for (const pane of [ui.paneA, ui.paneB]) {
    const parkSection = pane.repoTrigger.closest(".pane-section");
    if (parkSection instanceof HTMLElement) parkSection.hidden = singlePane;
    if (singlePane) {
      pane.name.textContent = AIRPORT_DISPATCH_LABEL;
      pane.desc.textContent = AIRPORT_DISPATCH_DESC;
    }
  }
  if (singlePane) {
    ui.compareToggle.checked = false;
    ui.layout.dataset["mode"] = "single";
  }
  return singlePane;
}

export function applyPermalinkToUi(p: PermalinkState, ui: UiHandles): void {
  const scenario = scenarioById(p.scenario);
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
  // Gating runs LAST so its dispatch/parking chip-label overrides
  // win over the generic strategy/reposition info renders above.
  // Also bakes compare=false back into the permalink state when the
  // scenario forces single-pane, so stale `?compare=true` URLs don't
  // propagate through the next `syncPermalinkUrl`.
  if (applyScenarioGating(ui, scenario)) {
    p.compare = false;
  } else {
    ui.compareToggle.checked = p.compare;
    ui.layout.dataset["mode"] = p.compare ? "compare" : "single";
  }
  // Auto-open the drawer when the permalink carries any override —
  // the recipient sees what the sender customized without an extra
  // click. A clean URL leaves the drawer closed so first-time
  // visitors meet the unchanged playground.
  if (Object.keys(p.overrides).length > 0) {
    setTweakOpen(ui, true);
  }
  renderTweakPanel(scenario, p.overrides, ui);
}
