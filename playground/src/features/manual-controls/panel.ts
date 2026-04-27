import { el } from "../../platform";
import type { Sim } from "../../sim";
import type { EventDto, ScenarioMeta, ServiceModeName, WorldView } from "../../types";
import { mountCallLog, type CallLogHandle } from "./call-log";

/**
 * API explorer panel. Surfaces every imperative wasm method as a
 * dedicated widget, each labelled with the literal API signature.
 * Outgoing calls and curated engine events both stream into a live
 * call log at the bottom of the panel.
 *
 * Sections, top-to-bottom:
 *   1. Hall calls          — `sim.pressHallCall(stopRef, dir)`
 *   2. Per-car blocks      — every `setServiceMode`, `pressCarButton`,
 *                            `openDoor`, `closeDoor`, `holdDoor`,
 *                            `cancelDoorHold`, `setTargetVelocity`,
 *                            `emergencyStop` on each live elevator
 *   3. Lifecycle           — `sim.addElevator` / `sim.removeElevator`
 *   4. Spawn rider         — `sim.spawnRider(origin, dest, weight)`
 *   5. Call log            — outgoing → / incoming ← stream
 *
 * The scenario locks `cars` to {min:1, max:3}; per-car blocks
 * rebuild on every Add / Remove. Hall and spawn sections are stable
 * across rebuilds.
 */
export interface ManualControlsRoots {
  hallButtons: HTMLElement;
  carControls: HTMLElement;
  spawnForm: HTMLElement;
  eventLog: HTMLElement;
  addCarBtn: HTMLButtonElement;
  featureHint: HTMLElement;
}

export interface ManualControlsHandle {
  /** Per-frame update: events drained from `paneA.sim`. */
  update(sim: Sim, events: EventDto[]): void;
  dispose(): void;
}

const HOLD_TICKS = 60;

interface HallButtonsHandle {
  sync(view: WorldView): void;
}

interface CarBlocksHandle {
  /** Rebuild on Add / Remove (the car list changed). */
  rebuild(view: WorldView): void;
  sync(view: WorldView): void;
}

export function mountManualControls(
  sim: Sim,
  scenario: ScenarioMeta,
  roots: ManualControlsRoots,
): ManualControlsHandle {
  const meta = scenario.manualControl;
  if (!meta) {
    throw new Error("mountManualControls called for non-API-explorer scenario");
  }

  // Feature-hint banner above the controls.
  if (scenario.featureHint && scenario.featureHint.length > 0) {
    roots.featureHint.textContent = scenario.featureHint;
    roots.featureHint.hidden = false;
  } else {
    roots.featureHint.hidden = true;
  }

  const log: CallLogHandle = mountCallLog(roots.eventLog);

  // Apply the scenario's default service mode to every car so the
  // engine and the per-car dropdown agree on first paint.
  if (meta.defaultServiceMode !== "normal") {
    for (const car of sim.worldView().cars) {
      try {
        sim.setServiceMode(BigInt(car.id), meta.defaultServiceMode);
      } catch (e) {
        console.warn("setServiceMode (boot):", e);
      }
    }
  }

  const hall = mountHallButtons(roots.hallButtons, scenario, sim, log);
  const cars = mountCarBlocks(roots.carControls, scenario, sim, log);
  cars.rebuild(sim.worldView());
  mountSpawnForm(roots.spawnForm, scenario, sim, log);

  // Lifecycle: Add / Remove Car. Same UI affordance as before but
  // labelled with the wasm method names so devs see what fires.
  const addBtn = roots.addCarBtn;
  let lastBtnText: string | null = null;
  const updateAddBtn = (): void => {
    if (!meta.allowAddRemoveCar) {
      addBtn.hidden = true;
      return;
    }
    const view = sim.worldView();
    const max = scenario.tweakRanges.cars.max;
    const atMax = view.cars.length >= max;
    addBtn.hidden = false;
    const next = atMax ? "sim.removeElevator(carRef)" : "sim.addElevator(lineRef, …)";
    if (next !== lastBtnText) {
      addBtn.textContent = next;
      lastBtnText = next;
    }
  };
  const onAddCar = (): void => {
    const view = sim.worldView();
    const max = scenario.tweakRanges.cars.max;
    if (view.cars.length >= max) {
      const last = view.cars[view.cars.length - 1];
      if (!last) return;
      const ref = BigInt(last.id);
      log.call(`sim.removeElevator(e${last.id})`);
      try {
        sim.removeElevator(ref);
      } catch (e) {
        log.callFailed(`sim.removeElevator(e${last.id})`, e);
      }
    } else {
      const firstLine = view.lines[0];
      if (!firstLine) return;
      const lineRef = BigInt(firstLine.id);
      log.call(`sim.addElevator(line${firstLine.id}, 0)`);
      try {
        sim.addElevator(lineRef, 0, {
          maxSpeed: scenario.elevatorDefaults.maxSpeed,
          weightCapacity: scenario.elevatorDefaults.weightCapacity,
        });
      } catch (e) {
        log.callFailed(`sim.addElevator(line${firstLine.id}, 0)`, e);
      }
    }
    cars.rebuild(sim.worldView());
    updateAddBtn();
  };
  addBtn.addEventListener("click", onAddCar);
  updateAddBtn();

  return {
    update(currentSim, events): void {
      const view = currentSim.worldView();
      hall.sync(view);
      cars.sync(view);
      log.events(events);
      updateAddBtn();
    },
    dispose(): void {
      addBtn.removeEventListener("click", onAddCar);
      log.dispose();
      roots.hallButtons.replaceChildren();
      roots.carControls.replaceChildren();
      roots.spawnForm.replaceChildren();
      roots.featureHint.hidden = true;
      roots.featureHint.textContent = "";
    },
  };
}

// ─── Hall call buttons ─────────────────────────────────────────────

function mountHallButtons(
  container: HTMLElement,
  scenario: ScenarioMeta,
  sim: Sim,
  log: CallLogHandle,
): HallButtonsHandle {
  container.replaceChildren();
  // Sort by descending position so top floor is at the top of the list.
  const stops = [...scenario.stops]
    .map((s, i) => ({ ...s, configIndex: i }))
    .sort((a, b) => b.positionM - a.positionM);

  const rows: Array<{
    configIndex: number;
    name: string;
    upBtn: HTMLButtonElement | null;
    downBtn: HTMLButtonElement | null;
  }> = [];
  // Capture stop entity refs once at mount. The api-explorer
  // scenario doesn't add stops at runtime, and a sim reset
  // re-mounts the whole panel — so a captured ref is correct for
  // this panel's lifetime. Keep this comment if we ever generalise.
  const initialView = sim.worldView();

  for (const stop of stops) {
    const row = el("div", "api-row api-row-hall");
    const sigEl = el("span", "api-sig");
    const labelChip = el("span", "api-stop-name", stop.name);
    row.append(sigEl);
    row.append(labelChip);

    const isTop = stop === stops[0];
    const isBottom = stop === stops[stops.length - 1];
    const liveStop = initialView.stops[stop.configIndex];
    if (!liveStop) continue;
    const stopRef = BigInt(liveStop.entity_id);

    let upBtn: HTMLButtonElement | null = null;
    let downBtn: HTMLButtonElement | null = null;
    const buttons = el("span", "api-row-actions");

    if (!isTop) {
      upBtn = makeApiButton("▲", "api-hall-btn", () => {
        const sig = `sim.pressHallCall(${stop.name}, "up")`;
        log.call(sig);
        try {
          sim.pressHallCall(stopRef, "up");
        } catch (e) {
          log.callFailed(sig, e);
        }
      });
      buttons.append(upBtn);
    }
    if (!isBottom) {
      downBtn = makeApiButton("▼", "api-hall-btn", () => {
        const sig = `sim.pressHallCall(${stop.name}, "down")`;
        log.call(sig);
        try {
          sim.pressHallCall(stopRef, "down");
        } catch (e) {
          log.callFailed(sig, e);
        }
      });
      buttons.append(downBtn);
    }
    row.append(buttons);

    sigEl.textContent = `sim.pressHallCall(${stop.name}, dir)`;
    container.append(row);
    rows.push({ configIndex: stop.configIndex, name: stop.name, upBtn, downBtn });
  }

  return {
    sync(view: WorldView): void {
      for (const row of rows) {
        const stop = view.stops[row.configIndex];
        if (!stop) continue;
        if (row.upBtn) row.upBtn.dataset["lit"] = stop.hall_calls.up ? "true" : "false";
        if (row.downBtn) row.downBtn.dataset["lit"] = stop.hall_calls.down ? "true" : "false";
      }
    },
  };
}

// ─── Per-car blocks ────────────────────────────────────────────────

function mountCarBlocks(
  container: HTMLElement,
  scenario: ScenarioMeta,
  sim: Sim,
  log: CallLogHandle,
): CarBlocksHandle {
  // The blocks rebuild on every Add / Remove. `syncers` are the
  // per-frame update hooks (lit-state, velocity readout) re-bound
  // each rebuild; `userState` survives rebuilds so Add Car C
  // doesn't reset Car A's service mode and slider position back
  // to scenario defaults.
  let syncers: Array<(view: WorldView) => void> = [];
  const userState = new Map<number, { mode: ServiceModeName; velocity: number }>();

  const rebuild = (view: WorldView): void => {
    // Drop state for cars that no longer exist (Remove Car).
    const liveIds = new Set(view.cars.map((c) => c.id));
    for (const id of [...userState.keys()]) {
      if (!liveIds.has(id)) userState.delete(id);
    }

    container.replaceChildren();
    syncers = [];

    view.cars.forEach((car, idx) => {
      const block = el("div", "api-car-block");
      const carRef = BigInt(car.id);
      // Friendly per-block label. WorldView's CarView doesn't expose
      // the RON `name` field, so we synthesise A/B/C from index —
      // cars are stable across rebuilds within a scenario.
      const carName = `Car ${String.fromCharCode(65 + idx)}`;
      const persisted = userState.get(car.id);
      const header = el("div", "api-car-header");
      header.append(el("span", "api-car-name", carName));
      block.append(header);

      // setServiceMode
      const modeRow = el("div", "api-row");
      const modeSig = el("span", "api-sig", `sim.setServiceMode(${carName}, mode)`);
      modeRow.append(modeSig);
      const select = document.createElement("select");
      select.className = "api-mode-select";
      const modes: Array<{ value: ServiceModeName; label: string }> = [
        { value: "normal", label: "normal" },
        { value: "manual", label: "manual" },
        { value: "inspection", label: "inspection" },
        { value: "outofservice", label: "outofservice" },
      ];
      for (const m of modes) {
        const opt = document.createElement("option");
        opt.value = m.value;
        opt.textContent = m.label;
        select.append(opt);
      }
      // `WorldView` doesn't expose service mode per-car, so we
      // track the user's selection in `userState` and treat the
      // dropdown as the source of truth across rebuilds. Initial
      // value: previously-picked mode (across an Add/Remove rebuild)
      // or scenario default for fresh cars.
      const initialMode: ServiceModeName =
        persisted?.mode ?? scenario.manualControl?.defaultServiceMode ?? "normal";
      select.value = initialMode;
      // Seed the persisted state for fresh cars so a later remove of
      // a different car doesn't drop this entry on the next rebuild.
      if (!persisted) userState.set(car.id, { mode: initialMode, velocity: 0 });
      select.addEventListener("change", () => {
        const mode = select.value as ServiceModeName;
        const sig = `sim.setServiceMode(${carName}, "${mode}")`;
        log.call(sig);
        try {
          sim.setServiceMode(carRef, mode);
          const entry = userState.get(car.id);
          if (entry) entry.mode = mode;
        } catch (e) {
          log.callFailed(sig, e);
        }
      });
      modeRow.append(select);
      block.append(modeRow);

      // pressCarButton — one per stop. Map keyed by the engine's
      // stop entity_id (u32 slot, matches `CarView.target`) so the
      // per-frame syncer can `=== target` directly without
      // index-juggling.
      const carBtnRow = el("div", "api-row");
      carBtnRow.append(el("span", "api-sig", `sim.pressCarButton(${carName}, stopRef)`));
      const carBtns = el("span", "api-row-actions");
      const carBtnByStop = new Map<number, HTMLButtonElement>();
      const sortedStops = [...scenario.stops]
        .map((s, i) => ({ ...s, configIndex: i }))
        .sort((a, b) => b.positionM - a.positionM);
      for (const stop of sortedStops) {
        const liveStop = view.stops[stop.configIndex];
        if (!liveStop) continue;
        const stopEntityId = liveStop.entity_id;
        const stopRef = BigInt(stopEntityId);
        const btn = makeApiButton(abbrev(stop.name), "api-car-btn", () => {
          const sig = `sim.pressCarButton(${carName}, ${stop.name})`;
          log.call(sig);
          try {
            sim.pressCarButton(carRef, stopRef);
          } catch (e) {
            log.callFailed(sig, e);
          }
        });
        btn.title = `Car call: ${stop.name}`;
        carBtns.append(btn);
        carBtnByStop.set(stopEntityId, btn);
      }
      carBtnRow.append(carBtns);
      block.append(carBtnRow);

      // Door commands: open / close / hold / cancelHold
      const doorRow = el("div", "api-row");
      doorRow.append(el("span", "api-sig", `sim.openDoor / closeDoor / holdDoor / cancelDoorHold`));
      const doorBtns = el("span", "api-row-actions");
      doorBtns.append(
        makeApiButton("openDoor", "api-door-btn", () => {
          const sig = `sim.openDoor(${carName})`;
          log.call(sig);
          try {
            sim.openDoor(carRef);
          } catch (e) {
            log.callFailed(sig, e);
          }
        }),
      );
      doorBtns.append(
        makeApiButton("closeDoor", "api-door-btn", () => {
          const sig = `sim.closeDoor(${carName})`;
          log.call(sig);
          try {
            sim.closeDoor(carRef);
          } catch (e) {
            log.callFailed(sig, e);
          }
        }),
      );
      doorBtns.append(
        makeApiButton(`holdDoor(${HOLD_TICKS})`, "api-door-btn", () => {
          const sig = `sim.holdDoor(${carName}, ${HOLD_TICKS})`;
          log.call(sig);
          try {
            sim.holdDoor(carRef, HOLD_TICKS);
          } catch (e) {
            log.callFailed(sig, e);
          }
        }),
      );
      doorBtns.append(
        makeApiButton("cancelDoorHold", "api-door-btn", () => {
          const sig = `sim.cancelDoorHold(${carName})`;
          log.call(sig);
          try {
            sim.cancelDoorHold(carRef);
          } catch (e) {
            log.callFailed(sig, e);
          }
        }),
      );
      doorRow.append(doorBtns);
      block.append(doorRow);

      // setTargetVelocity — slider with engine-reported readout.
      //
      // `input` fires every drag-pixel; `change` fires on release.
      // We push the live value into the engine on `input` so the
      // cab tracks the slider continuously, but only log a single
      // line per drag on `change` — otherwise the call log fills
      // with one entry per pixel travelled.
      const velRow = el("div", "api-row api-row-vel");
      velRow.append(el("span", "api-sig", `sim.setTargetVelocity(${carName}, v)`));
      const velControls = el("span", "api-row-actions");
      const slider = document.createElement("input");
      slider.type = "range";
      slider.className = "api-vel-slider";
      slider.min = String(-scenario.elevatorDefaults.maxSpeed);
      slider.max = String(scenario.elevatorDefaults.maxSpeed);
      slider.step = "0.1";
      slider.value = String(persisted?.velocity ?? 0);
      const initialV = Number(slider.value);
      const readout = el(
        "span",
        "api-vel-readout",
        `${initialV >= 0 ? "+" : ""}${initialV.toFixed(1)} m/s`,
      );
      slider.addEventListener("input", () => {
        const v = Number(slider.value);
        try {
          sim.setTargetVelocity(carRef, v);
          const entry = userState.get(car.id);
          if (entry) entry.velocity = v;
        } catch {
          // Surface only on `change`; per-pixel errors would spam.
        }
      });
      slider.addEventListener("change", () => {
        const v = Number(slider.value);
        const sig = `sim.setTargetVelocity(${carName}, ${v.toFixed(2)})`;
        log.call(sig);
        try {
          sim.setTargetVelocity(carRef, v);
        } catch (e) {
          log.callFailed(sig, e);
        }
      });
      velControls.append(slider);
      velControls.append(readout);
      velRow.append(velControls);
      block.append(velRow);

      // emergencyStop
      const eStopRow = el("div", "api-row");
      eStopRow.append(el("span", "api-sig", `sim.emergencyStop(${carName})`));
      const eStopBtn = makeApiButton("emergencyStop", "api-estop-btn", () => {
        const sig = `sim.emergencyStop(${carName})`;
        log.call(sig);
        try {
          sim.emergencyStop(carRef);
        } catch (e) {
          log.callFailed(sig, e);
        }
        slider.value = "0";
        readout.textContent = "+0.0 m/s";
      });
      const eStopActions = el("span", "api-row-actions");
      eStopActions.append(eStopBtn);
      eStopRow.append(eStopActions);
      block.append(eStopRow);

      container.append(block);

      // Per-frame sync for this car: refresh `pressCarButton` lit
      // state and the velocity readout from engine state. The
      // slider stays at the *commanded* position (whatever the user
      // last set) — the readout shows *actual* engine velocity,
      // which lags during accel/decel due to the trapezoidal profile.
      let lastReadout = readout.textContent;
      const lastLit = new Map<number, boolean>();
      syncers.push((v) => {
        const live = v.cars.find((c) => c.id === car.id);
        if (!live) return;
        // Lit-state for car-call buttons — only DOM-mutate on change.
        const target = live.target;
        for (const [stopEntityId, btn] of carBtnByStop) {
          const lit = target !== undefined && target === stopEntityId;
          if (lastLit.get(stopEntityId) !== lit) {
            btn.dataset["lit"] = lit ? "true" : "false";
            lastLit.set(stopEntityId, lit);
          }
        }
        // Velocity readout — quantise to one decimal so micro-jitter
        // near zero doesn't thrash the DOM.
        const engineV = live.v;
        const text = `${engineV >= 0 ? "+" : ""}${engineV.toFixed(1)} m/s`;
        if (text !== lastReadout) {
          readout.textContent = text;
          lastReadout = text;
        }
      });
    });
  };

  return {
    rebuild,
    sync(view) {
      for (const fn of syncers) fn(view);
    },
  };
}

// ─── Spawn rider form ──────────────────────────────────────────────

function mountSpawnForm(
  container: HTMLElement,
  scenario: ScenarioMeta,
  sim: Sim,
  log: CallLogHandle,
): void {
  container.replaceChildren();
  container.append(el("span", "api-sig", `sim.spawnRider(origin, dest, weight)`));
  const fields = el("span", "api-row-actions api-spawn-fields");

  const stopOptions = scenario.stops.map((s, i) => ({ id: i, name: s.name }));
  const fromSelect = makeSelect("api-spawn-select", stopOptions, 0);
  const toSelect = makeSelect("api-spawn-select", stopOptions, Math.min(stopOptions.length - 1, 1));

  const weightInput = document.createElement("input");
  weightInput.type = "number";
  weightInput.className = "api-spawn-weight";
  const [lo, hi] = scenario.passengerWeightRange;
  weightInput.min = String(Math.round(lo));
  weightInput.max = String(Math.round(hi));
  weightInput.step = "5";
  weightInput.value = String(Math.round((lo + hi) / 2));

  const spawnBtn = makeApiButton("spawnRider", "api-spawn-btn", () => {
    const origin = Number(fromSelect.value);
    const dest = Number(toSelect.value);
    const weight = Number(weightInput.value) || 75;
    const originName = scenario.stops[origin]?.name ?? `s${origin}`;
    const destName = scenario.stops[dest]?.name ?? `s${dest}`;
    const sig = `sim.spawnRider(${originName}, ${destName}, ${weight})`;
    if (origin === dest) {
      // Engine would reject; surface why in the log instead of
      // silently no-op'ing.
      log.callFailed(sig, new Error("origin === destination"));
      return;
    }
    log.call(sig);
    try {
      sim.spawnRider(origin, dest, weight);
    } catch (e) {
      log.callFailed(sig, e);
    }
  });

  fields.append(fromSelect);
  fields.append(el("span", "api-spawn-arrow", "→"));
  fields.append(toSelect);
  fields.append(weightInput);
  fields.append(el("span", "api-spawn-unit", "kg"));
  fields.append(spawnBtn);
  container.append(fields);
}

// ─── Helpers ───────────────────────────────────────────────────────

function makeApiButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const btn = el("button", className, label);
  btn.type = "button";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function makeSelect(
  className: string,
  options: Array<{ id: number; name: string }>,
  defaultIndex: number,
): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = className;
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = String(opt.id);
    o.textContent = opt.name;
    select.append(o);
  }
  select.value = String(options[defaultIndex]?.id ?? 0);
  return select;
}

function abbrev(name: string): string {
  const num = name.match(/\d+/);
  if (num) return num[0];
  return name.charAt(0).toUpperCase();
}
