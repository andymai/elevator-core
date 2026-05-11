import { withAlpha } from "../../render/color-utils";
import type { CarDto, Snapshot } from "../../types";
import type { Pane } from "./pane";

/**
 * Two compact color-tagged rows showing per-loop demand for airport
 * scenarios: "Outer: N trains · M waiting" / "Inner: ...". Lazily
 * created on first render; removed when the scenario is not airport.
 *
 * `cars active` counts non-idle cars on each loop (anything that's
 * moving, repositioning, or dwelling at a stop). `waiting` sums
 * per-line waiting counts across all stops the loop serves.
 */

interface PanelHandles {
  root: HTMLElement;
  outerTrains: HTMLElement;
  outerWaiting: HTMLElement;
  innerTrains: HTMLElement;
  innerWaiting: HTMLElement;
  outerDot: HTMLElement;
  innerDot: HTMLElement;
}

const panelByMetricEl = new WeakMap<HTMLElement, PanelHandles>();

export function updateAirportLoopPanel(pane: Pane, snap: Snapshot): void {
  const meta = pane.scenario.airport;
  const existing = panelByMetricEl.get(pane.metricsEl);
  if (!meta) {
    existing?.root.remove();
    panelByMetricEl.delete(pane.metricsEl);
    return;
  }
  const handles = existing ?? createPanel(pane.metricsEl);
  // Dots track the pane accent so the panel stays inside the playground's
  // accent-driven color vocabulary instead of carrying scenario-specific
  // amber/teal. Outer = full accent, inner = muted variant.
  handles.outerDot.style.backgroundColor = withAlpha(pane.accent, 0.9);
  handles.innerDot.style.backgroundColor = withAlpha(pane.accent, 0.55);
  const { outerTrains, outerWaiting, innerTrains, innerWaiting } = countByLoop(
    snap,
    meta.outerStopCount,
  );
  handles.outerTrains.textContent = String(outerTrains);
  handles.outerWaiting.textContent = String(outerWaiting);
  handles.innerTrains.textContent = String(innerTrains);
  handles.innerWaiting.textContent = String(innerWaiting);
}

interface LoopCounts {
  outerTrains: number;
  outerWaiting: number;
  innerTrains: number;
  innerWaiting: number;
}

function countByLoop(snap: Snapshot, outerStopCount: number): LoopCounts {
  // Line entity ids — outer line declared first in the RON, so the
  // lower id is outer. Cars with neither id are dropped defensively.
  const distinctLines = [...new Set(snap.cars.map((c) => c.line))].sort((a, b) => a - b);
  const outerLine = distinctLines[0];
  const innerLine = distinctLines[1];

  let outerTrains = 0;
  let innerTrains = 0;
  for (const car of snap.cars) {
    if (!isActive(car)) continue;
    if (car.line === outerLine) outerTrains++;
    else if (car.line === innerLine) innerTrains++;
  }

  let outerWaiting = 0;
  let innerWaiting = 0;
  for (let i = 0; i < snap.stops.length; i++) {
    const stop = snap.stops[i];
    if (!stop) continue;
    const onOuter = i < outerStopCount;
    if (onOuter) outerWaiting += stop.waiting;
    else innerWaiting += stop.waiting;
  }

  return { outerTrains, outerWaiting, innerTrains, innerWaiting };
}

function isActive(car: CarDto): boolean {
  return car.phase !== "idle";
}

function createPanel(metricsEl: HTMLElement): PanelHandles {
  const root = document.createElement("div");
  root.className =
    "airport-loop-panel flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[11px] text-content-secondary tabular-nums border-b border-stroke-subtle";
  const outerRow = createRow("Outer");
  const innerRow = createRow("Inner");
  root.append(outerRow.row, innerRow.row);
  metricsEl.insertAdjacentElement("afterend", root);
  const handles: PanelHandles = {
    root,
    outerTrains: outerRow.trains,
    outerWaiting: outerRow.waiting,
    innerTrains: innerRow.trains,
    innerWaiting: innerRow.waiting,
    outerDot: outerRow.dot,
    innerDot: innerRow.dot,
  };
  panelByMetricEl.set(metricsEl, handles);
  return handles;
}

function createRow(label: string): {
  row: HTMLElement;
  trains: HTMLElement;
  waiting: HTMLElement;
  dot: HTMLElement;
} {
  const row = document.createElement("div");
  row.className = "flex items-center gap-2";
  const dot = document.createElement("span");
  dot.className = "inline-block w-2 h-2 rounded-full shrink-0";
  const labelEl = document.createElement("span");
  labelEl.className = "uppercase tracking-wider text-content-tertiary";
  labelEl.textContent = label;
  const trains = document.createElement("span");
  trains.className = "font-medium";
  trains.textContent = "0";
  const trainsSuffix = document.createElement("span");
  trainsSuffix.className = "text-content-tertiary";
  trainsSuffix.textContent = "trains";
  const sep = document.createElement("span");
  sep.className = "text-content-tertiary";
  sep.textContent = "·";
  const waiting = document.createElement("span");
  waiting.className = "font-medium";
  waiting.textContent = "0";
  const waitingSuffix = document.createElement("span");
  waitingSuffix.className = "text-content-tertiary";
  waitingSuffix.textContent = "waiting";
  row.append(dot, labelEl, trains, trainsSuffix, sep, waiting, waitingSuffix);
  return { row, trains, waiting, dot };
}
