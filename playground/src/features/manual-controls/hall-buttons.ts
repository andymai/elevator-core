import { el } from "../../platform";
import type { ScenarioMeta, WorldView } from "../../types";

/**
 * Hall-call rows. One row per stop, each with the floor name on the
 * left and `[▲][▼]` buttons on the right. Top floor has no `▲`,
 * bottom floor has no `▼` — those calls would be trivially rejected
 * by the engine, so omit them rather than render disabled affordances.
 *
 * Buttons fire `pressHallCall(stopRef, "up"|"down")` on click. The lit
 * state is read each frame from `WorldView.stops[i].hall_calls.{up,down}`.
 */
export interface HallButtonHandlers {
  onPress: (stopRef: bigint, direction: "up" | "down") => void;
}

export interface HallButtonsHandle {
  /** Initial mount creates DOM; sync flips `data-lit` per frame. */
  sync(view: WorldView): void;
}

export function mountHallButtons(
  container: HTMLElement,
  scenario: ScenarioMeta,
  initial: WorldView,
  handlers: HallButtonHandlers,
): HallButtonsHandle {
  container.replaceChildren();
  // Match scenario stops to WorldView entries by name. Names are unique
  // within a scenario (asserted by RON validation) so this is safe.
  const stopByName = new Map(initial.stops.map((s) => [s.name, s]));
  const rows: Array<{ stopRef: bigint; up?: HTMLButtonElement; down?: HTMLButtonElement }> = [];
  // Top→bottom matches the cabin cutaway's vertical axis (highest
  // floor at the top of the panel). Scenarios list stops bottom-up,
  // so reverse for display.
  const ordered = [...scenario.stops].reverse();
  ordered.forEach((stop, i) => {
    const view = stopByName.get(stop.name);
    if (!view) return;
    const isTop = i === 0;
    const isBottom = i === ordered.length - 1;
    const row = el("div", "manual-hall-row");
    row.append(el("span", "manual-hall-name", stop.name));
    // tsify emits u64 entity refs as TS `number`. Convert to BigInt
    // for the mutation API which takes wasm-bindgen u64 → BigInt args.
    const stopRef = BigInt(view.entity_id);
    const entry: (typeof rows)[number] = { stopRef };
    if (!isTop) {
      const up = el("button", "manual-hall-btn");
      up.type = "button";
      up.textContent = "▲";
      up.title = `Hall call: ${stop.name} ↑`;
      up.addEventListener("click", () => {
        handlers.onPress(stopRef, "up");
      });
      row.append(up);
      entry.up = up;
    } else {
      // Spacer keeps grid columns aligned across rows.
      row.append(el("span", "w-7"));
    }
    if (!isBottom) {
      const down = el("button", "manual-hall-btn");
      down.type = "button";
      down.textContent = "▼";
      down.title = `Hall call: ${stop.name} ↓`;
      down.addEventListener("click", () => {
        handlers.onPress(stopRef, "down");
      });
      row.append(down);
      entry.down = down;
    } else {
      row.append(el("span", "w-7"));
    }
    rows.push(entry);
    container.append(row);
  });

  return {
    sync(view: WorldView): void {
      for (const row of rows) {
        const stop = view.stops.find((s) => BigInt(s.entity_id) === row.stopRef);
        if (!stop) continue;
        if (row.up) row.up.dataset["lit"] = stop.hall_calls.up ? "true" : "false";
        if (row.down) row.down.dataset["lit"] = stop.hall_calls.down ? "true" : "false";
      }
    },
  };
}
