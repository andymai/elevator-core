import {
  PARAM_KEYS,
  defaultFor,
  isOverridden,
  resolveParam,
  type Overrides,
  type ParamKey,
} from "../../domain";
import type { ScenarioMeta } from "../../types";
import type { TweakRowHandles } from "./handles";

/** Narrow interface — only the fields the tweak panel render needs. */
export interface TweakPanelUi {
  tweakBtn: HTMLButtonElement;
  tweakPanel: HTMLElement;
  tweakRows: Record<ParamKey, TweakRowHandles>;
  tweakResetAllBtn: HTMLButtonElement;
}

/**
 * Format a tweak value for the readout. `cars` and `weightCapacity`
 * step in whole units so they read as integers; speed and door cycle
 * use one decimal to match their step sizes.
 */
function formatTweakValue(key: ParamKey, value: number): string {
  switch (key) {
    case "cars":
      return String(Math.round(value));
    case "weightCapacity":
      return String(Math.round(value));
    case "maxSpeed":
    case "doorCycleSec":
      return value.toFixed(1);
  }
}

export function labelForKey(key: ParamKey): string {
  switch (key) {
    case "cars":
      return "Cars";
    case "maxSpeed":
      return "Max speed";
    case "weightCapacity":
      return "Capacity";
    case "doorCycleSec":
      return "Door cycle";
  }
}

/**
 * Refresh every drawer row to reflect the current scenario + overrides.
 * Called on boot, on scenario switch, and after each stepper click.
 *
 * Side effects beyond the displayed values:
 *  - Disables `+`/`-` at the slider's bounds so users can't push the
 *    value out of range (defensive — `resolveParam` clamps anyway).
 *  - Toggles the per-row "Reset" button visibility based on whether
 *    the row's value differs from the scenario default.
 *  - Toggles the "Reset all" button visibility based on whether *any*
 *    row is overridden.
 */
export function renderTweakPanel(
  scenario: ScenarioMeta,
  overrides: Overrides,
  ui: TweakPanelUi,
): void {
  let anyOverridden = false;
  for (const key of PARAM_KEYS) {
    const row = ui.tweakRows[key];
    const range = scenario.tweakRanges[key];
    const value = resolveParam(scenario, key, overrides);
    const def = defaultFor(scenario, key);
    const overridden = isOverridden(scenario, key, value);
    if (overridden) anyOverridden = true;
    row.value.textContent = formatTweakValue(key, value);
    row.defaultV.textContent = formatTweakValue(key, def);
    row.dec.disabled = value <= range.min + 1e-9;
    row.inc.disabled = value >= range.max - 1e-9;
    row.root.dataset["overridden"] = String(overridden);
    row.reset.hidden = !overridden;
    // Sync the slider track: fill reflects progress to current value,
    // default mark pins the scenario default, thumb sits on current.
    // Clamped span and guarded against degenerate single-value ranges
    // (e.g. space elevator cars locked at 1..1) so the computed ratios
    // stay finite.
    const span = Math.max(range.max - range.min, 1e-9);
    const pct = Math.max(0, Math.min(1, (value - range.min) / span));
    const defPct = Math.max(0, Math.min(1, (def - range.min) / span));
    if (row.trackFill) row.trackFill.style.width = `${(pct * 100).toFixed(1)}%`;
    if (row.trackThumb) row.trackThumb.style.left = `${(pct * 100).toFixed(1)}%`;
    if (row.trackDefault) row.trackDefault.style.left = `${(defPct * 100).toFixed(1)}%`;
  }
  ui.tweakResetAllBtn.hidden = !anyOverridden;
}

export function setTweakOpen(ui: TweakPanelUi, open: boolean): void {
  ui.tweakBtn.setAttribute("aria-expanded", open ? "true" : "false");
  ui.tweakPanel.hidden = !open;
}
