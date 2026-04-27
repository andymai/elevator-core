import type { Sim } from "../../sim";
import type { EventDto, ScenarioMeta, ServiceModeName } from "../../types";
import { mountCarControls, type CarControlsHandle } from "./car-controls";
import { mountHallButtons, type HallButtonsHandle } from "./hall-buttons";
import { mountSpawnForm } from "./spawn-form";
import { appendEvents } from "./event-log";

/** Containers the panel hydrates. All must exist in `index.html`. */
export interface ManualControlsRoots {
  hallButtons: HTMLElement;
  carControls: HTMLElement;
  spawnForm: HTMLElement;
  eventLog: HTMLElement;
  addCarBtn: HTMLButtonElement;
}

export interface ManualControlsHandle {
  /** Per-frame update with a fresh sim handle and worldView snapshot. */
  update(sim: Sim, events: EventDto[]): void;
  /** Currently focused car ref, or null if no car has been clicked yet. */
  selectedCarRef(): bigint | null;
  /** Tear down listeners — called when scenario switches away. */
  dispose(): void;
}

// Module-level so the cabin renderer can read the focused car without
// threading a handle through the render loop. Reset by `dispose()`.
let SELECTED: bigint | null = null;
export function selectedCarId(): bigint | null {
  return SELECTED;
}

/**
 * Mount the manual-controls side panel against `sim` for `scenario`.
 * Builds the hall-button rows, per-car blocks, spawn form, and event
 * log; applies the scenario's `defaultServiceMode` to every car.
 */
export function mountManualControls(
  sim: Sim,
  scenario: ScenarioMeta,
  roots: ManualControlsRoots,
): ManualControlsHandle {
  const meta = scenario.manualControl;
  if (!meta) {
    throw new Error("mountManualControls called for non-manual scenario");
  }
  let initialView = sim.worldView();

  const hall: HallButtonsHandle = mountHallButtons(roots.hallButtons, scenario, initialView, {
    onPress: (stopRef, dir) => {
      try {
        sim.pressHallCall(stopRef, dir);
      } catch (e) {
        // Engine rejects calls outside the served range or from cars in
        // a non-Normal mode. Swallow — the lit-state stays unchanged
        // since the call wasn't actually accepted.
        console.warn("pressHallCall:", e);
      }
    },
  });

  const cars: CarControlsHandle = mountCarControls(roots.carControls, scenario, initialView, {
    setServiceMode: (carRef, mode) => {
      sim.setServiceMode(carRef, mode);
    },
    pressCarButton: (carRef, stopRef) => {
      try {
        sim.pressCarButton(carRef, stopRef);
      } catch (e) {
        console.warn("pressCarButton:", e);
      }
    },
    openDoor: (carRef) => {
      safe(() => {
        sim.openDoor(carRef);
      });
    },
    closeDoor: (carRef) => {
      safe(() => {
        sim.closeDoor(carRef);
      });
    },
    holdDoor: (carRef, ticks) => {
      safe(() => {
        sim.holdDoor(carRef, ticks);
      });
    },
    cancelDoorHold: (carRef) => {
      safe(() => {
        sim.cancelDoorHold(carRef);
      });
    },
    setTargetVelocity: (carRef, velocity) => {
      safe(() => {
        sim.setTargetVelocity(carRef, velocity);
      });
    },
    emergencyStop: (carRef) => {
      safe(() => {
        sim.emergencyStop(carRef);
      });
    },
    selectCar: (carRef) => {
      SELECTED = carRef;
    },
  });

  // Apply the scenario's default service mode to every car so the UI
  // dropdown and the engine state agree on first paint. Skipped when
  // the default is "normal" (the engine default) — pointless work.
  if (meta.defaultServiceMode !== "normal") {
    for (const car of initialView.cars) {
      try {
        sim.setServiceMode(BigInt(car.id), meta.defaultServiceMode);
      } catch (e) {
        console.warn("setServiceMode (boot):", e);
      }
    }
  }

  mountSpawnForm(roots.spawnForm, scenario, {
    spawn: (origin, dest, weight) => {
      try {
        sim.spawnRider(origin, dest, weight);
      } catch (e) {
        console.warn("spawnRider:", e);
      }
    },
  });

  // Initial event-log clear — leftover entries from a prior scenario
  // would confuse "what just happened" given the panel re-mounts.
  roots.eventLog.replaceChildren();

  // Add Car B / Remove Car B toggle. Mutates topology via the sim's
  // addElevator / removeElevator wasm bindings.
  const addCarBtn = roots.addCarBtn;
  const updateAddCarBtn = (): void => {
    const view = sim.worldView();
    const max = scenario.tweakRanges.cars.max;
    if (!meta.allowAddRemoveCar || view.cars.length >= max) {
      addCarBtn.hidden = view.cars.length === 1 || !meta.allowAddRemoveCar;
      addCarBtn.textContent = view.cars.length >= max ? "Remove Car B" : "Add Car B";
      addCarBtn.disabled = !meta.allowAddRemoveCar;
      addCarBtn.hidden = !meta.allowAddRemoveCar;
      return;
    }
    addCarBtn.hidden = false;
    addCarBtn.disabled = false;
    addCarBtn.textContent = view.cars.length >= 2 ? "Remove Car B" : "Add Car B";
  };
  const onAddCar = (): void => {
    const view = sim.worldView();
    if (view.cars.length >= scenario.tweakRanges.cars.max) {
      // Remove the last car. Riders aboard get ejected to the nearest
      // enabled stop per `Simulation::remove_elevator` semantics.
      const last = view.cars[view.cars.length - 1];
      if (!last) return;
      try {
        sim.removeElevator(BigInt(last.id));
      } catch (e) {
        console.warn("removeElevator:", e);
      }
    } else {
      // Add to the first line at the lobby (position 0). Inherits the
      // scenario's elevator-physics defaults (max_speed / capacity).
      const firstLine = view.lines[0];
      if (!firstLine) return;
      try {
        sim.addElevator(BigInt(firstLine.id), 0, {
          maxSpeed: scenario.elevatorDefaults.maxSpeed,
          weightCapacity: scenario.elevatorDefaults.weightCapacity,
        });
      } catch (e) {
        console.warn("addElevator:", e);
      }
    }
    // Topology changed; the panel needs a full re-mount to surface the
    // new car block. Rebuild via `mountCarControls` against the fresh
    // worldView.
    rebuildCarControls();
    updateAddCarBtn();
  };
  addCarBtn.addEventListener("click", onAddCar);
  updateAddCarBtn();

  let carsHandle = cars;
  const rebuildCarControls = (): void => {
    initialView = sim.worldView();
    carsHandle = mountCarControls(roots.carControls, scenario, initialView, {
      setServiceMode: (carRef, mode) => {
        sim.setServiceMode(carRef, mode);
      },
      pressCarButton: (carRef, stopRef) => {
        sim.pressCarButton(carRef, stopRef);
      },
      openDoor: (carRef) => {
        safe(() => {
          sim.openDoor(carRef);
        });
      },
      closeDoor: (carRef) => {
        safe(() => {
          sim.closeDoor(carRef);
        });
      },
      holdDoor: (carRef, ticks) => {
        safe(() => {
          sim.holdDoor(carRef, ticks);
        });
      },
      cancelDoorHold: (carRef) => {
        safe(() => {
          sim.cancelDoorHold(carRef);
        });
      },
      setTargetVelocity: (carRef, velocity) => {
        safe(() => {
          sim.setTargetVelocity(carRef, velocity);
        });
      },
      emergencyStop: (carRef) => {
        safe(() => {
          sim.emergencyStop(carRef);
        });
      },
      selectCar: (carRef) => {
        SELECTED = carRef;
      },
    });
    // If the previously selected car was removed, fall back to the
    // first remaining car so the cutaway always has a focus.
    if (SELECTED !== null && !initialView.cars.some((c) => BigInt(c.id) === SELECTED)) {
      SELECTED = carsHandle.firstCarRef();
    }
    if (SELECTED === null) {
      SELECTED = carsHandle.firstCarRef();
    }
    // Re-apply the default service mode to any newly added cars.
    if (meta.defaultServiceMode !== "normal") {
      for (const car of initialView.cars) {
        try {
          sim.setServiceMode(BigInt(car.id), meta.defaultServiceMode satisfies ServiceModeName);
        } catch {
          /* ignore — engine validates */
        }
      }
    }
  };

  // Pick the first car as the initial cutaway focus.
  SELECTED = cars.firstCarRef();

  return {
    update(currentSim, events): void {
      // The shell may swap `Sim` instances on a reset; rebuild
      // controls against the new one if so.
      if (currentSim !== sim) {
        rebuildCarControls();
      }
      const view = currentSim.worldView();
      hall.sync(view);
      carsHandle.sync(view, SELECTED);
      appendEvents(roots.eventLog, events);
      updateAddCarBtn();
    },
    selectedCarRef: () => SELECTED,
    dispose(): void {
      addCarBtn.removeEventListener("click", onAddCar);
      roots.hallButtons.replaceChildren();
      roots.carControls.replaceChildren();
      roots.spawnForm.replaceChildren();
      roots.eventLog.replaceChildren();
      SELECTED = null;
    },
  };
}

function safe(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    console.warn("manual-controls action:", e);
  }
}
