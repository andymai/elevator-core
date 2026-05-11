import { renderPaneStrategyInfo, renderPaneRepositionInfo } from "../features/strategy-picker";
import { syncScenarioCards } from "../features/scenario-picker";
import { setTweakOpen, renderTweakPanel } from "../features/tweak-drawer";
import { scenarioById, type PermalinkState } from "../domain";
import { generate as generateRandomWords } from "random-words";
import type { ScenarioMeta } from "../types";
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

/**
 * Disable compare-toggle and per-pane strategy triggers when a scenario
 * carries `airport` metadata. Concentric viz doesn't survive a half-
 * width compare canvas, and the RON's per-group LoopSchedule is the
 * only dispatch that makes sense — letting the strategy switcher
 * overwrite it via `Sim.setStrategy` would silently break the demo.
 * Also force-uncheck compare when entering single-pane scenarios so the
 * visual state matches the gated `state.permalink.compare = false`.
 */
export function applyScenarioGating(ui: UiHandles, scenario: ScenarioMeta): boolean {
  const singlePane = scenario.airport !== undefined;
  ui.compareToggle.disabled = singlePane;
  ui.paneA.trigger.disabled = singlePane;
  ui.paneB.trigger.disabled = singlePane;
  if (singlePane) {
    ui.compareToggle.checked = false;
    ui.layout.dataset["mode"] = "single";
  }
  return singlePane;
}

export function applyPermalinkToUi(p: PermalinkState, ui: UiHandles): void {
  const scenario = scenarioById(p.scenario);
  if (applyScenarioGating(ui, scenario)) {
    // Single-pane scenarios bake compare=false back into the permalink
    // state so a hand-crafted `?compare=true` URL doesn't propagate that
    // stale flag the next time `syncPermalinkUrl` runs.
    p.compare = false;
  } else {
    ui.compareToggle.checked = p.compare;
    ui.layout.dataset["mode"] = p.compare ? "compare" : "single";
  }
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
