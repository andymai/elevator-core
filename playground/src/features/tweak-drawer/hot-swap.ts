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
  /**
   * Optional renderer hook for HUD-bearing scenes (tether climber chips,
   * airport train HUDs). Building scenarios leave this undefined; the
   * space-elevator and airport scenes thread max-speed changes through
   * so the inline ETA readouts reflect the live tweak instead of the
   * scenario default.
   */
  renderer?: {
    setPhysics(maxSpeed: number, acceleration: number, deceleration: number): void;
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
  // HUD ETA readouts rely on the active max-speed. Push the new value
  // to renderers that expose the hook — both tether and airport scenes
  // do.
  if (allLive) {
    for (const pane of panes) {
      pane.renderer?.setPhysics(physics.maxSpeed, physics.acceleration, physics.deceleration);
    }
  }
  renderTweakPanel(scenario, state.permalink.overrides, ui);
  if (!allLive) void resetAll();
}
