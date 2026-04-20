import { applyPhysicsOverrides, type Overrides } from "../../domain";
import type { ScenarioMeta } from "../../types";
import { renderTweakPanel, type TweakPanelUi } from "./render";

/** Narrow interface for a sim pane that supports live physics. */
export interface HotSwapPane {
  sim: {
    applyPhysicsLive(params: {
      maxSpeed: number;
      weightCapacityKg: number;
      doorOpenTicks: number;
      doorTransitionTicks: number;
    }): boolean;
  };
}

/** Narrow interface for state during hot-swap. */
export interface HotSwapState {
  paneA: HotSwapPane | null;
  paneB: HotSwapPane | null;
  permalink: { overrides: Overrides };
}

/**
 * Push max-speed / capacity / door-cycle into the live sim via the
 * uniform setters and refresh the drawer's display values. Used for
 * every override change *except* cars-count, which needs a full
 * `resetAll`.
 *
 * If the wasm build predates the setters (`applyPhysicsLive` returns
 * `false`), fall back to a sim rebuild — same observable result, just
 * with a metrics reset. This keeps local dev usable when the
 * playground reloads ahead of a fresh `wasm-pack build`.
 */
export function applyHotSwapAndRender(
  state: HotSwapState,
  ui: TweakPanelUi,
  scenario: ScenarioMeta,
  resetAll: () => Promise<void>,
): void {
  const physics = applyPhysicsOverrides(scenario, state.permalink.overrides);
  const params = {
    maxSpeed: physics.maxSpeed,
    weightCapacityKg: physics.weightCapacity,
    doorOpenTicks: physics.doorOpenTicks,
    doorTransitionTicks: physics.doorTransitionTicks,
  };
  const panes = [state.paneA, state.paneB].filter((p): p is HotSwapPane => p !== null);
  const allLive = panes.every((pane) => pane.sim.applyPhysicsLive(params));
  renderTweakPanel(scenario, state.permalink.overrides, ui);
  if (!allLive) void resetAll();
}
