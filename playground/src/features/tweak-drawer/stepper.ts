import {
  compactOverrides,
  isOverridden,
  resolveParam,
  scenarioById,
  type Overrides,
  type ParamKey,
} from "../../domain";
import { toast } from "../../platform";
import { applyHotSwapAndRender, type HotSwapState } from "./hot-swap";
import { labelForKey, type TweakPanelUi } from "./render";

/** Narrow interface for stepper UI — extends TweakPanelUi with toast element. */
export interface StepperUi extends TweakPanelUi {
  toast: HTMLElement;
}

/** Narrow interface for stepper state. */
export interface StepperState extends HotSwapState {
  permalink: { scenario: string; overrides: Overrides };
}

function clampToRange(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Round `v` to the nearest multiple of `step` measured from `min`.
 * Used by `bumpParam` so successive +/- clicks always land on
 * canonical grid values regardless of the starting point.
 */
function snapToStep(v: number, min: number, step: number): number {
  const stepsFromMin = Math.round((v - min) / step);
  return min + stepsFromMin * step;
}

/**
 * Step a single param up or down by its scenario-defined step size,
 * then apply the change. Quietly clamps to the param's range so a
 * disabled +/- button can't be activated via keyboard repeat.
 */
export function bumpParam(
  state: StepperState,
  ui: StepperUi,
  key: ParamKey,
  dir: number,
  resetAll: () => Promise<void>,
): void {
  const scenario = scenarioById(state.permalink.scenario);
  const range = scenario.tweakRanges[key];
  const current = resolveParam(scenario, key, state.permalink.overrides);
  const next = clampToRange(current + dir * range.step, range.min, range.max);
  // Round to a multiple of `step` so the steppers always land on a
  // canonical lattice point — protects against floating-point drift
  // accumulating over repeated clicks.
  const snapped = snapToStep(next, range.min, range.step);
  setOverride(state, ui, key, snapped, resetAll);
}

export function resetParam(
  state: StepperState,
  ui: StepperUi,
  key: ParamKey,
  resetAll: () => Promise<void>,
): void {
  const scenario = scenarioById(state.permalink.scenario);
  const next = { ...state.permalink.overrides };
  Reflect.deleteProperty(next, key);
  state.permalink = { ...state.permalink, overrides: next };
  // Per-key reset of the live-mutated knobs goes through the same
  // hot-swap path so metrics don't reset; cars-count reset rebuilds.
  if (key === "cars") {
    void resetAll();
    toast(ui.toast, "Cars reset");
  } else {
    applyHotSwapAndRender(state, ui, scenario, resetAll);
    toast(ui.toast, `${labelForKey(key)} reset`);
  }
}

export async function resetAllOverrides(
  state: StepperState,
  ui: StepperUi,
  resetAll: () => Promise<void>,
): Promise<void> {
  const scenario = scenarioById(state.permalink.scenario);
  const hadCarsOverride = isOverridden(
    scenario,
    "cars",
    resolveParam(scenario, "cars", state.permalink.overrides),
  );
  state.permalink = { ...state.permalink, overrides: {} };
  if (hadCarsOverride) {
    await resetAll();
  } else {
    applyHotSwapAndRender(state, ui, scenario, resetAll);
  }
  toast(ui.toast, "Parameters reset");
}

/**
 * Update one override and apply it: hot-swap for live-mutated keys,
 * full sim rebuild for `cars`. Keeps the in-memory permalink in sync
 * and re-renders the drawer.
 */
function setOverride(
  state: StepperState,
  ui: TweakPanelUi,
  key: ParamKey,
  value: number,
  resetAll: () => Promise<void>,
): void {
  const scenario = scenarioById(state.permalink.scenario);
  const next: Overrides = { ...state.permalink.overrides, [key]: value };
  state.permalink = {
    ...state.permalink,
    overrides: compactOverrides(scenario, next),
  };
  if (key === "cars") {
    void resetAll();
  } else {
    applyHotSwapAndRender(state, ui, scenario, resetAll);
  }
}
