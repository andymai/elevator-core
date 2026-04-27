import { el } from "../../platform";
import type { CarView, ScenarioMeta, ServiceModeName, WorldView } from "../../types";

/**
 * Per-car control block: service-mode dropdown, in-cab car-buttons,
 * door commands, manual-mode velocity slider, emergency stop.
 *
 * The car-button strip uses the scenario's stops (not WorldView's) so
 * the floor labels stay stable even if `addStop` adds runtime stops
 * mid-session — runtime stops would lack a friendly label and the
 * scenario's hand-written names are the playground's only source.
 */
export interface CarControlsHandlers {
  setServiceMode: (carRef: bigint, mode: ServiceModeName) => void;
  pressCarButton: (carRef: bigint, stopRef: bigint) => void;
  openDoor: (carRef: bigint) => void;
  closeDoor: (carRef: bigint) => void;
  holdDoor: (carRef: bigint, ticks: number) => void;
  cancelDoorHold: (carRef: bigint) => void;
  setTargetVelocity: (carRef: bigint, velocity: number) => void;
  emergencyStop: (carRef: bigint) => void;
  /** Notify panel state when the user clicks a car header to focus it. */
  selectCar: (carRef: bigint) => void;
}

interface CarBlock {
  carRef: bigint;
  root: HTMLElement;
  modeSelect: HTMLSelectElement;
  carButtons: Map<bigint, HTMLButtonElement>;
  velocitySlider: HTMLInputElement;
  velocityRow: HTMLElement;
  velocityReadout: HTMLElement;
  estopBtn: HTMLButtonElement;
  doorButtons: HTMLButtonElement[];
}

export interface CarControlsHandle {
  sync(view: WorldView, selectedRef: bigint | null): void;
  /** First car ref currently rendered, for cold-boot selection. */
  firstCarRef(): bigint | null;
  /**
   * Snapshot of every car block's currently-selected service mode,
   * keyed by car ref. The panel reads this each frame and pushes it
   * to the cabin renderer so the cabin badge / OOS door colour / OOS
   * rider greying track the dropdown — without this, the renderer
   * would never see service-mode changes.
   */
  serviceModes(): Map<bigint, ServiceModeName>;
}

const SERVICE_MODES: Array<{ value: ServiceModeName; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "manual", label: "Manual" },
  { value: "inspection", label: "Inspection" },
  { value: "outofservice", label: "Out of service" },
];

export function mountCarControls(
  container: HTMLElement,
  scenario: ScenarioMeta,
  initial: WorldView,
  handlers: CarControlsHandlers,
  /**
   * Per-car mode to seed the dropdown with on (re)mount. Used by the
   * panel's Add/Remove Car path to preserve user-picked modes across
   * a rebuild — without this, adding Car B would snap Car A back to
   * the scenario's default. Missing entries fall back to
   * `scenario.manualControl.defaultServiceMode`.
   */
  initialModes?: Map<bigint, ServiceModeName>,
): CarControlsHandle {
  container.replaceChildren();
  const blocks: CarBlock[] = [];

  // Build a name lookup once: scenario stops carry friendly labels;
  // WorldView gives the entity refs. Match by name.
  const nameByRef = new Map<bigint, string>(
    initial.stops.map((s) => [BigInt(s.entity_id), s.name]),
  );

  // Stops served by *each* car. For the small office every car serves
  // every stop, but we read it from WorldView to stay correct under
  // multi-line scenarios should this UI ever be reused.
  const servesByCar = new Map<bigint, bigint[]>();
  for (const car of initial.cars) {
    const carRef = BigInt(car.id);
    const lineRef = BigInt(car.line);
    const line = initial.lines.find((l) => BigInt(l.id) === lineRef);
    const serves = line?.stop_ids.map((id) => BigInt(id)) ?? [];
    servesByCar.set(carRef, serves);
  }

  for (const car of initial.cars) {
    const carRef = BigInt(car.id);
    const initialMode =
      initialModes?.get(carRef) ?? scenario.manualControl?.defaultServiceMode ?? "normal";
    blocks.push(buildCarBlock(scenario, car, nameByRef, servesByCar, handlers, initialMode));
  }
  for (const block of blocks) container.append(block.root);

  return {
    sync(view: WorldView, selectedRef: bigint | null): void {
      for (const block of blocks) {
        const car = view.cars.find((c) => BigInt(c.id) === block.carRef);
        if (!car) continue;
        // Highlight selected block via accent border. Lit on currently
        // selected for cabin cutaway; dimmed otherwise.
        block.root.dataset["selected"] = selectedRef === block.carRef ? "true" : "false";
        block.root.style.borderColor =
          selectedRef === block.carRef ? "color-mix(in srgb, var(--accent) 55%, transparent)" : "";
        // Velocity readout follows the engine's physical velocity so
        // users see the slider command vs actual motion. Manual mode
        // keeps the slider live; other modes disable it. The block's
        // `data-mode` attribute drives a CSS rule that *collapses* the
        // VEL row + E-Stop entirely outside manual mode — disabled
        // affordances were pulling the eye toward unusable controls.
        const mode = block.modeSelect.value;
        const inManual = mode === "manual";
        block.root.dataset["mode"] = mode;
        block.velocityRow.dataset["disabled"] = inManual ? "false" : "true";
        block.velocitySlider.disabled = !inManual;
        block.estopBtn.disabled = !inManual;
        block.velocityReadout.textContent = `${car.v.toFixed(1)} m/s`;
        // Door buttons and car buttons remain enabled in every mode —
        // the door-command queue is mode-agnostic and the engine just
        // ignores car calls for OutOfService cars.
        for (const btn of block.doorButtons) btn.disabled = false;
        // Car-button lit state: the engine doesn't expose pending
        // car-calls in WorldView, so we approximate from `target` —
        // the dispatched stop. Good enough for a hands-on demo; a
        // future enhancement could surface the full car-call queue.
        for (const [stopRef, btn] of block.carButtons) {
          btn.dataset["lit"] =
            car.target !== undefined && BigInt(car.target) === stopRef ? "true" : "false";
        }
      }
    },
    firstCarRef(): bigint | null {
      return blocks[0]?.carRef ?? null;
    },
    serviceModes(): Map<bigint, ServiceModeName> {
      const map = new Map<bigint, ServiceModeName>();
      for (const block of blocks) {
        map.set(block.carRef, block.modeSelect.value as ServiceModeName);
      }
      return map;
    },
  };
}

function buildCarBlock(
  scenario: ScenarioMeta,
  car: CarView,
  nameByRef: Map<bigint, string>,
  servesByCar: Map<bigint, bigint[]>,
  handlers: CarControlsHandlers,
  initialMode: ServiceModeName,
): CarBlock {
  const carRef = BigInt(car.id);
  const root = el("div", "manual-car-block");
  // CSS reads `data-mode` to collapse the VEL row + E-Stop unless
  // the block is in manual. The seeded value matches the dropdown
  // initial selection so the first paint shows the right chrome.
  root.dataset["mode"] = initialMode;
  root.tabIndex = 0;
  root.addEventListener("click", () => {
    handlers.selectCar(carRef);
  });
  root.addEventListener("focus", () => {
    handlers.selectCar(carRef);
  });

  const header = el("div", "manual-car-header");
  const name = el("span", "manual-car-name", carLabel(car));
  const modeSelect = document.createElement("select");
  modeSelect.className = "manual-car-mode-select";
  for (const m of SERVICE_MODES) {
    const opt = document.createElement("option");
    opt.value = m.value;
    opt.textContent = m.label;
    modeSelect.appendChild(opt);
  }
  // Seeded dropdown value: caller-supplied (preserved across rebuild)
  // or the scenario default. panel.ts applies the same value to the
  // sim immediately after mount.
  modeSelect.value = initialMode;
  modeSelect.addEventListener("change", () => {
    handlers.setServiceMode(carRef, modeSelect.value as ServiceModeName);
  });
  // Stop event bubbling so opening the dropdown doesn't re-trigger
  // selectCar via the root click handler (already selected anyway,
  // but keeps the focus-ring stable).
  modeSelect.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  header.append(name, modeSelect);

  // Car-button strip: one per stop the car's line serves. Top floor
  // first to mirror the cabin cutaway's vertical orientation.
  const carButtonsRow = el("div", "manual-car-buttons");
  const serves = servesByCar.get(carRef) ?? [];
  // Order by descending y in scenario (top floor first).
  const ordered = [...serves].sort((a, b) => {
    const ya = scenario.stops.find((s) => s.name === nameByRef.get(a))?.positionM ?? 0;
    const yb = scenario.stops.find((s) => s.name === nameByRef.get(b))?.positionM ?? 0;
    return yb - ya;
  });
  const carButtons = new Map<bigint, HTMLButtonElement>();
  for (const stopRef of ordered) {
    const label = nameByRef.get(stopRef) ?? "?";
    const btn = el("button", "manual-car-btn");
    btn.type = "button";
    btn.title = `Car call: ${label}`;
    // Compact label: first character of stop name + a digit if present.
    btn.textContent = abbrev(label);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      handlers.pressCarButton(carRef, stopRef);
    });
    carButtonsRow.append(btn);
    carButtons.set(stopRef, btn);
  }

  // Door command row: Open / Close / Hold +30 / Cancel hold.
  const doorRow = el("div", "manual-door-row");
  const openBtn = doorBtn("Open", () => {
    handlers.openDoor(carRef);
  });
  const closeBtn = doorBtn("Close", () => {
    handlers.closeDoor(carRef);
  });
  const holdBtn = doorBtn("Hold +30", () => {
    handlers.holdDoor(carRef, 30);
  });
  const cancelBtn = doorBtn("Cancel hold", () => {
    handlers.cancelDoorHold(carRef);
  });
  doorRow.append(openBtn, closeBtn, holdBtn, cancelBtn);
  const doorButtons = [openBtn, closeBtn, holdBtn, cancelBtn];

  // Manual velocity row: slider commands `set_target_velocity`. Only
  // active in Manual mode (engine rejects velocity commands in other
  // modes — the disable mirrors that).
  const velocityRow = el("div", "manual-velocity-row");
  velocityRow.dataset["disabled"] = "true";
  const maxSpeed = scenario.elevatorDefaults.maxSpeed;
  const velocitySlider = document.createElement("input");
  velocitySlider.type = "range";
  velocitySlider.min = String(-maxSpeed);
  velocitySlider.max = String(maxSpeed);
  velocitySlider.step = "0.1";
  velocitySlider.value = "0";
  velocitySlider.disabled = true;
  velocitySlider.addEventListener("input", () => {
    handlers.setTargetVelocity(carRef, Number(velocitySlider.value));
  });
  velocitySlider.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  const velocityReadout = el("span", "manual-velocity-readout", "0.0 m/s");
  velocityRow.append(el("span", "manual-velocity-label", "Vel"), velocitySlider, velocityReadout);

  const estopBtn = el("button", "manual-estop-btn", "E-Stop");
  estopBtn.type = "button";
  estopBtn.disabled = true;
  estopBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handlers.emergencyStop(carRef);
    // Snap slider back to zero so the next drag starts from rest —
    // the engine has already zeroed `manual_target_velocity`.
    velocitySlider.value = "0";
  });

  root.append(header, carButtonsRow, doorRow, velocityRow, estopBtn);

  return {
    carRef,
    root,
    modeSelect,
    carButtons,
    velocitySlider,
    velocityRow,
    velocityReadout,
    estopBtn,
    doorButtons,
  };
}

function doorBtn(label: string, onClick: () => void): HTMLButtonElement {
  const btn = el("button", "manual-door-btn", label);
  btn.type = "button";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function carLabel(car: CarView): string {
  // CarView has no name field; synthesise from id slot. The first
  // car gets "Car A", subsequent runtime-added cars get sequential
  // letters. Approximate — we don't have the scenario's RON name here.
  return `Car ${slotLetter(car.id)}`;
}

function slotLetter(id: number): string {
  // Pull the slot index out of the FFI-encoded id (low 32 bits) and
  // map 0→A, 1→B, etc.

  const slot = (id & 0xffff_ffff) % 26;
  return String.fromCharCode(65 + slot);
}

function abbrev(label: string): string {
  // "Lobby" → "L"; "Floor 2" → "2"; otherwise first character.
  const num = label.match(/\d+/);
  if (num) return num[0];
  return label.charAt(0).toUpperCase();
}
