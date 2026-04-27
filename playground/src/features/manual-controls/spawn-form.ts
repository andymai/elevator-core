import { el } from "../../platform";
import type { ScenarioMeta } from "../../types";

/**
 * Spawn-rider form: origin / destination dropdowns + weight input
 * + spawn button. Wraps `Sim.spawnRider`, which takes config-level
 * `StopId`s (small integers from the RON) — not entity refs.
 */
export interface SpawnFormHandlers {
  spawn: (originStopId: number, destStopId: number, weight: number) => void;
}

export function mountSpawnForm(
  container: HTMLElement,
  scenario: ScenarioMeta,
  handlers: SpawnFormHandlers,
): void {
  container.replaceChildren();

  // Stops are listed by RON-config index, which maps 1:1 to StopId.
  // The spawn API takes the `StopId(N)` value, so use the array index.
  const stopOptions = scenario.stops.map((s, i) => ({ id: i, name: s.name }));

  const fromField = stopField("From", stopOptions, 0);
  const toField = stopField("To", stopOptions, Math.min(stopOptions.length - 1, 1));

  const weightField = el("div", "manual-spawn-field");
  weightField.append(el("span", "manual-spawn-label", "Weight"));
  const weightInput = document.createElement("input");
  weightInput.type = "number";
  weightInput.className = "manual-spawn-weight";
  weightInput.min = "20";
  weightInput.max = "300";
  weightInput.step = "5";
  // Default = midpoint of scenario's weight range so the spawn lands
  // squarely inside the boarding distribution and reads as "typical".
  const [lo, hi] = scenario.passengerWeightRange;
  weightInput.value = String(Math.round((lo + hi) / 2));
  weightField.append(weightInput);

  const spawnBtn = el("button", "manual-spawn-btn", "Spawn");
  spawnBtn.type = "button";
  spawnBtn.addEventListener("click", () => {
    const origin = Number(fromField.select.value);
    const dest = Number(toField.select.value);
    if (origin === dest) return; // engine would reject; skip silently
    const weight = Number(weightInput.value) || 75;
    handlers.spawn(origin, dest, weight);
  });

  container.append(fromField.root, toField.root, weightField, spawnBtn);
}

interface StopFieldHandle {
  root: HTMLElement;
  select: HTMLSelectElement;
}

function stopField(
  label: string,
  options: Array<{ id: number; name: string }>,
  defaultIndex: number,
): StopFieldHandle {
  const root = el("div", "manual-spawn-field");
  root.append(el("span", "manual-spawn-label", label));
  const select = document.createElement("select");
  select.className = "manual-spawn-select";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = String(opt.id);
    o.textContent = opt.name;
    select.appendChild(o);
  }
  select.value = String(options[defaultIndex]?.id ?? 0);
  root.append(select);
  return { root, select };
}
