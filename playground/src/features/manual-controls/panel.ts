import { applyPhysicsOverrides } from "../../domain";
import type { CanvasRenderer } from "../../render";
import type { HitZone } from "../../render/draw-cockpit";
import type { Sim } from "../../sim";
import type { ScenarioMeta } from "../../types";
import { mountCockpitConsole, type CockpitConsoleHandle, type OverridesGetter } from "./console";

/** Static DOM containers the cockpit panel hydrates. All must exist in `index.html`. */
export interface ManualControlsRoots {
  /** Throttle host inside the console — the throttle component owns its inner markup. */
  throttle: HTMLElement;
  velocityReadout: HTMLElement;
  doorOpen: HTMLButtonElement;
  doorClose: HTMLButtonElement;
  doorHold: HTMLButtonElement;
  emergencyStop: HTMLButtonElement;
  spawnRider: HTMLButtonElement;
}

export interface ManualControlsHandle {
  /** Per-frame update with the live sim handle. */
  update(sim: Sim): void;
  /** Tear down listeners — called when the scenario switches away. */
  dispose(): void;
}

/**
 * Mount the operator cockpit panel for `scenario` against `sim`.
 *
 * The panel's job is small now: it hydrates the cockpit console
 * (throttle + door buttons + spawn) and wires the canvas hit-test
 * dispatcher in the renderer to call `sim.pressHallCall` /
 * `sim.openDoor` / `sim.closeDoor` when the user clicks zones in the
 * building elevation. Every frame it pushes refreshed
 * `CockpitRenderState` (hall-call lamp map + hint copy) into the
 * renderer so the elevation reads the engine's authoritative state.
 *
 * `getOverrides` returns the user's *current* tweak-drawer state.
 * Must be a getter, not a value — the hot-swap path in
 * `tweak-drawer/stepper.ts` replaces `state.permalink.overrides`
 * with a new object without remounting the cockpit, so a captured
 * snapshot would go stale and the throttle clamp would freeze at
 * the boot-time max-speed.
 *
 * The scenario locks `cars` at 1 (`tweakRanges.cars: {min:1,max:1}`)
 * and `manualControl.allowAddRemoveCar: false`, which removes the
 * whole "preserve service-mode picks across rebuilds" plumbing the
 * previous implementation needed.
 */
export function mountManualControls(
  sim: Sim,
  scenario: ScenarioMeta,
  getOverrides: OverridesGetter,
  roots: ManualControlsRoots,
  renderer: CanvasRenderer,
): ManualControlsHandle {
  const meta = scenario.manualControl;
  if (!meta) {
    throw new Error("mountManualControls called for non-cockpit scenario");
  }
  const initialView = sim.worldView();

  // Cockpit console — the right-rail driver controls. The hint
  // banner is drawn on the canvas elevation, not in the console DOM,
  // so the console doesn't need a hint root.
  const cockpit: CockpitConsoleHandle = mountCockpitConsole(
    sim,
    scenario,
    getOverrides,
    initialView,
    {
      throttle: roots.throttle,
      velocityReadout: roots.velocityReadout,
      doorOpen: roots.doorOpen,
      doorClose: roots.doorClose,
      doorHold: roots.doorHold,
      emergencyStop: roots.emergencyStop,
      spawnRider: roots.spawnRider,
    },
  );

  // Apply the scenario's default service mode so the engine state
  // matches what the cockpit assumes (Manual = throttle drives the
  // cab). Cockpit scenarios default to "manual"; non-manual values
  // fall through unchanged.
  if (meta.defaultServiceMode !== "normal") {
    for (const car of initialView.cars) {
      try {
        sim.setServiceMode(BigInt(car.id), meta.defaultServiceMode);
      } catch (e) {
        console.warn("setServiceMode (boot):", e);
      }
    }
  }

  // Canvas click dispatcher: hall-call lamp zones press a hall call;
  // door zones toggle the cab doors.
  //
  // In Manual mode (cockpit default) `pressHallCall` records the call
  // and lights the lamp but does NOT trigger auto-dispatch — the
  // operator sees the lamp and chooses to drive there. The try/catch
  // is defensive against a malformed StopRef, not service-mode
  // rejection (the engine doesn't gate hall calls on service mode).
  const onCanvasClick = (zone: HitZone): void => {
    const carRef = cockpit.carRef();
    if (zone.kind === "hall-up" || zone.kind === "hall-down") {
      try {
        sim.pressHallCall(BigInt(zone.ref), zone.kind === "hall-up" ? "up" : "down");
      } catch (e) {
        console.warn("pressHallCall:", e);
      }
      return;
    }
    // zone.kind === "doors" — toggle. Read the car's current phase
    // from a fresh worldView; door-opening / loading → close;
    // otherwise → open.
    const view = sim.worldView();
    const car = view.cars.find((c) => BigInt(c.id) === carRef);
    const phase = car?.phase;
    try {
      if (phase === "loading" || phase === "door-opening") {
        sim.closeDoor(carRef);
      } else {
        sim.openDoor(carRef);
      }
    } catch (e) {
      console.warn("toggle door:", e);
    }
  };
  renderer.setCockpitClickHandler(onCanvasClick);

  // Reuse one map across frames; clearing is cheaper than
  // re-allocating + GC'ing 60×/sec for a 5-stop building.
  const hallCallsByStop = new Map<number, { up: boolean; down: boolean }>();

  return {
    update(currentSim): void {
      const view = currentSim.worldView();
      cockpit.update(view);

      // Push authoritative cockpit state to the renderer. Hall-call
      // lamps come straight from `WorldView.stops[].hall_calls` (the
      // engine's acknowledged-call lamps) so the elevation matches
      // engine state exactly — no reflection lag.
      hallCallsByStop.clear();
      for (const stop of view.stops) {
        hallCallsByStop.set(stop.entity_id, {
          up: stop.hall_calls.up,
          down: stop.hall_calls.down,
        });
      }
      renderer.setCockpitState({
        hallCallsByStop,
        hint: scenario.featureHint,
        maxSpeed: applyPhysicsOverrides(scenario, getOverrides()).maxSpeed,
      });
    },
    dispose(): void {
      renderer.setCockpitClickHandler(null);
      // Defensive: clear the renderer's cockpit state too. The next
      // mount (compare-pane.makePane) will set it again with fresh
      // defaults; this guards against a hypothetical reorder where
      // the renderer is reused for a non-cockpit scenario before
      // makePane runs.
      renderer.setCockpitState(null);
      cockpit.dispose();
    },
  };
}
