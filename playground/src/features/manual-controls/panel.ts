import type { CanvasRenderer } from "../../render";
import type { HitZone } from "../../render/draw-cockpit";
import type { Sim } from "../../sim";
import type { EventDto, ScenarioMeta } from "../../types";
import { mountCockpitConsole, type CockpitConsoleHandle } from "./console";

/** Static DOM containers the cockpit panel hydrates. All must exist in `index.html`. */
export interface ManualControlsRoots {
  /** Right-rail (or bottom-bar) cockpit console root. */
  console: HTMLElement;
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
  /** Per-frame update with the live sim handle and the latest events drain. */
  update(sim: Sim, events: EventDto[]): void;
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
 * The scenario locks `cars` at 1 and disables Add/Remove (see
 * `manualControl.allowAddRemoveCar: false`), which removes the whole
 * "preserve service-mode picks across rebuilds" plumbing the previous
 * implementation needed.
 */
export function mountManualControls(
  sim: Sim,
  scenario: ScenarioMeta,
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
  const cockpit: CockpitConsoleHandle = mountCockpitConsole(sim, scenario, initialView, {
    throttle: roots.throttle,
    velocityReadout: roots.velocityReadout,
    doorOpen: roots.doorOpen,
    doorClose: roots.doorClose,
    doorHold: roots.doorHold,
    emergencyStop: roots.emergencyStop,
    spawnRider: roots.spawnRider,
  });

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
  // door zones toggle the cab doors. The engine rejects calls that
  // don't make sense for the current service mode (e.g.
  // `pressHallCall` in Manual mode), which surfaces here as a thrown
  // exception we swallow — the visual lamp state stays whatever
  // WorldView reports next frame.
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
    if (carRef === null) return;
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

  return {
    update(currentSim, _events): void {
      void _events;
      const view = currentSim.worldView();
      cockpit.update(currentSim, view);

      // Push authoritative cockpit state to the renderer. Hall-call
      // lamps come straight from `WorldView.stops[].hall_calls` (the
      // engine's acknowledged-call lamps) so the elevation matches
      // engine state exactly — no reflection lag.
      const hallCallsByStop = new Map<number, { up: boolean; down: boolean }>();
      for (const stop of view.stops) {
        hallCallsByStop.set(stop.entity_id, {
          up: stop.hall_calls.up,
          down: stop.hall_calls.down,
        });
      }
      renderer.setCockpitState({
        hallCallsByStop,
        hint: scenario.featureHint,
      });
    },
    dispose(): void {
      renderer.setCockpitClickHandler(null);
      cockpit.dispose();
    },
  };
}
