import { applyPhysicsOverrides, type Overrides } from "../../domain";
import type { Sim } from "../../sim";
import type { ScenarioMeta, WorldView } from "../../types";
import { mountThrottle, type ThrottleHandle } from "./throttle";

/**
 * Getter for the live overrides bag. Must read state at call time
 * — the tweak-drawer hot-swap path replaces `state.permalink.overrides`
 * with a new object without remounting the cockpit, so a captured
 * reference goes stale immediately after the user nudges the slider.
 */
export type OverridesGetter = () => Overrides;

/**
 * Cockpit console: the right-rail (or bottom-bar on mobile portrait)
 * driver controls. Hydrates the static markup placed in `index.html`
 * — caller passes in references to the existing throttle, door
 * buttons, spawn button, and velocity readout elements.
 *
 * The console orchestrates one car. The cockpit scenario locks
 * `tweakRanges.cars` to {min: 1, max: 1} so there's always exactly
 * one — `update()` reads `view.cars[0]` directly. If a future
 * scenario reused this console with multiple cars, we'd need a
 * "currently driving" car ref instead.
 */
export interface CockpitConsoleRoots {
  throttle: HTMLElement;
  velocityReadout: HTMLElement;
  doorOpen: HTMLButtonElement;
  doorClose: HTMLButtonElement;
  doorHold: HTMLButtonElement;
  emergencyStop: HTMLButtonElement;
  spawnRider: HTMLButtonElement;
}

export interface CockpitConsoleHandle {
  /** Per-frame update; the panel passes the latest worldView snapshot. */
  update(view: WorldView): void;
  /** The driven car's wasm entity ref. Stable for the panel's lifetime. */
  carRef(): bigint;
  dispose(): void;
}

/** Door dwell extension when HOLD is pressed (60 Hz ticks → 1 s). */
const HOLD_TICKS = 60;

export function mountCockpitConsole(
  sim: Sim,
  scenario: ScenarioMeta,
  getOverrides: OverridesGetter,
  view: WorldView,
  roots: CockpitConsoleRoots,
): CockpitConsoleHandle {
  const firstCar = view.cars[0];
  if (firstCar === undefined) {
    throw new Error("mountCockpitConsole: scenario has no cars");
  }
  // The cockpit scenario locks cars at 1 and disables Add/Remove,
  // so this ref stays valid for the panel's lifetime. A sim reset
  // re-mounts the whole panel via resetAll → mountManualControls,
  // capturing a fresh ref then.
  const carRef = BigInt(firstCar.id);

  // Resolve the effective max speed against the *current* overrides.
  // Calling `getOverrides()` each frame is mandatory: the tweak
  // drawer's hot-swap path replaces the overrides object without
  // remounting, so a captured snapshot would go stale and the
  // throttle clamp would diverge from the engine's actual ceiling.
  const resolvedMaxSpeed = (): number => applyPhysicsOverrides(scenario, getOverrides()).maxSpeed;

  // ─── Throttle ───────────────────────────────────────────────────
  const throttle: ThrottleHandle = mountThrottle(roots.throttle, {
    maxSpeed: resolvedMaxSpeed(),
    onChange: (v) => {
      try {
        sim.setTargetVelocity(carRef, v);
      } catch (e) {
        console.warn("setTargetVelocity:", e);
      }
    },
  });

  // ─── Door buttons ───────────────────────────────────────────────
  const onOpen = (): void => {
    safe(() => {
      sim.openDoor(carRef);
    });
  };
  const onClose = (): void => {
    safe(() => {
      sim.closeDoor(carRef);
    });
  };
  const onHold = (): void => {
    safe(() => {
      sim.holdDoor(carRef, HOLD_TICKS);
    });
  };
  const onEStop = (): void => {
    safe(() => {
      sim.emergencyStop(carRef);
    });
    // E-Stop drives the engine velocity to 0 directly; bring the
    // throttle thumb back to centre so the visual matches the cab.
    throttle.centre();
  };
  roots.doorOpen.addEventListener("click", onOpen);
  roots.doorClose.addEventListener("click", onClose);
  roots.doorHold.addEventListener("click", onHold);
  roots.emergencyStop.addEventListener("click", onEStop);

  // ─── Spawn rider ────────────────────────────────────────────────
  // Picks a random origin / destination pair (ensuring origin !=
  // destination) and a random weight inside the scenario's range.
  // `spawnRider` takes RON-config StopId integers (small ints from 0
  // to N-1), which maps 1:1 to scenario.stops indices.
  const onSpawn = (): void => {
    const n = scenario.stops.length;
    if (n < 2) return;
    const origin = Math.floor(Math.random() * n);
    let dest = Math.floor(Math.random() * (n - 1));
    if (dest >= origin) dest += 1;
    const [lo, hi] = scenario.passengerWeightRange;
    const weight = Math.round(lo + Math.random() * (hi - lo));
    safe(() => {
      sim.spawnRider(origin, dest, weight);
    });
  };
  roots.spawnRider.addEventListener("click", onSpawn);

  // ─── Velocity readout ───────────────────────────────────────────
  // Reads the *engine-reported* velocity (CarDto.v) — the throttle
  // commands a target, but with the trapezoidal profile the actual
  // velocity can lag while the cab is accelerating, and that's the
  // number the driver should see.
  let lastReadout = "";
  let lastMaxSpeed = resolvedMaxSpeed();

  return {
    update(currentView): void {
      const car = currentView.cars[0];
      if (car === undefined) return;

      // Velocity readout: quantise to one decimal so micro-jitter
      // near zero doesn't thrash the DOM and the readout stays
      // calm to read.
      const v = car.v;
      const text = `${v >= 0 ? "+" : ""}${v.toFixed(1)} m/s`;
      if (text !== lastReadout) {
        roots.velocityReadout.textContent = text;
        lastReadout = text;
      }
      // Update throttle bound when overrides change live (tweak
      // drawer hot-swap). Skipped when unchanged so the per-frame
      // call stays cheap.
      const max = resolvedMaxSpeed();
      if (max !== lastMaxSpeed) {
        throttle.setMaxSpeed(max);
        lastMaxSpeed = max;
      }
    },
    carRef: () => carRef,
    dispose() {
      throttle.dispose();
      roots.doorOpen.removeEventListener("click", onOpen);
      roots.doorClose.removeEventListener("click", onClose);
      roots.doorHold.removeEventListener("click", onHold);
      roots.emergencyStop.removeEventListener("click", onEStop);
      roots.spawnRider.removeEventListener("click", onSpawn);
    },
  };
}

function safe(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    console.warn("cockpit-console:", e);
  }
}
