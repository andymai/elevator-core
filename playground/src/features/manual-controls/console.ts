import type { Sim } from "../../sim";
import type { ScenarioMeta, WorldView } from "../../types";
import { mountThrottle, type ThrottleHandle } from "./throttle";

/**
 * Cockpit console: the right-rail (or bottom-bar on mobile portrait)
 * driver controls. Hydrates the static markup placed in `index.html`
 * — caller passes in references to the existing throttle, door
 * buttons, spawn button, velocity readout, and hint elements.
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
  update(sim: Sim, view: WorldView): void;
  /** Currently driven car ref, or null before first frame. */
  carRef(): bigint | null;
  dispose(): void;
}

/** Door dwell extension when HOLD is pressed (60 Hz ticks → 0.5 s). */
const HOLD_TICKS = 30;

export function mountCockpitConsole(
  sim: Sim,
  scenario: ScenarioMeta,
  view: WorldView,
  roots: CockpitConsoleRoots,
): CockpitConsoleHandle {
  const firstCar = view.cars[0];
  if (firstCar === undefined) {
    throw new Error("mountCockpitConsole: scenario has no cars");
  }
  // Capture the car ref once. The cockpit scenario locks cars at 1
  // and disables Add/Remove, so this stays valid for the panel's
  // lifetime — no rebuilds needed across `update()` calls.
  let carRef = BigInt(firstCar.id);

  // ─── Throttle ───────────────────────────────────────────────────
  const throttle: ThrottleHandle = mountThrottle(roots.throttle, {
    maxSpeed: scenario.elevatorDefaults.maxSpeed,
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
  // Reads the *engine-reported* velocity (CarDto.v) — the slider
  // commands a target, but with the trapezoidal profile the actual
  // velocity can lag while the cab is accelerating, and that's the
  // number the driver should see.
  let lastReadout = "";

  return {
    update(currentSim, currentView): void {
      // The shell may swap `Sim` instances on a reset; refresh the
      // car ref from the new view.
      const car = currentView.cars[0];
      if (car === undefined) return;
      if (currentSim !== sim || currentView !== view) {
        // Underlying sim changed (reset / scenario switch). Caller
        // should be remounting the panel; refresh the car ref.
        carRef = BigInt(car.id);
      }
      const v = car.v;
      // Quantise to one decimal so micro-jitter at near-zero doesn't
      // thrash the DOM (and makes the readout calmer to read).
      const text = `${v >= 0 ? "+" : ""}${v.toFixed(1)} m/s`;
      if (text !== lastReadout) {
        roots.velocityReadout.textContent = text;
        lastReadout = text;
      }
      // Update throttle bound when scenario physics change live.
      const max = scenario.elevatorDefaults.maxSpeed;
      throttle.setMaxSpeed(max);
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
