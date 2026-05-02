/**
 * Tap-to-insert chips beneath the editor.
 *
 * Each unlocked-API entry maps to a snippet — a paste-ready
 * one-liner the player can drop into the editor with a single
 * click/tap. On mobile the chip row is the primary input affordance
 * for adding code; on desktop it's a faster path than typing the
 * full call.
 *
 * The chip row re-renders on stage navigation: locked methods
 * disappear, freshly-unlocked methods appear with a subtle accent
 * the first time they show up. (Actually we render every time
 * without the "fresh" treatment for v1; the per-stage-novelty
 * highlight is a follow-up.)
 */

import { unlockedEntries } from "./api-reference";
import type { QuestEditor } from "./editor";
import type { Stage } from "./stages";

export interface SnippetPickerHandles {
  readonly root: HTMLElement;
}

/**
 * Curated insert templates per wasm method. Mirrors API_REFERENCE
 * entries (the registry-completeness test should eventually pin
 * snippets to the reference too — for v1 the lookup falls back to
 * a generic `sim.{name}();` template, which is good enough for
 * methods I haven't hand-tuned yet).
 */
const SNIPPETS: Record<string, string> = {
  pushDestination: "sim.pushDestination(0n, 2n);",
  hallCalls: "const calls = sim.hallCalls();",
  carCalls: "const inside = sim.carCalls(0n);",
  drainEvents: "const events = sim.drainEvents();",
  setStrategy: 'sim.setStrategy("etd");',
  setStrategyJs: `sim.setStrategyJs("my-rank", (ctx) => {
  return Math.abs(ctx.carPosition - ctx.stopPosition);
});`,
  setServiceMode: 'sim.setServiceMode(0n, "manual");',
  setTargetVelocity: "sim.setTargetVelocity(0n, 2.0);",
  holdDoor: "sim.holdDoor(0n);",
  cancelDoorHold: "sim.cancelDoorHold(0n);",
  emergencyStop: "sim.emergencyStop(0n);",
  shortestRoute: "const route = sim.shortestRoute(0n, 4n);",
  reroute: "sim.reroute(/* riderRef */, [0n, 4n]);",
  transferPoints: "const transfers = sim.transferPoints();",
  reachableStopsFrom: "const reachable = sim.reachableStopsFrom(0n);",
  addStop: 'const newStop = sim.addStop("F6", 20.0);',
  addStopToLine: "sim.addStopToLine(/* lineRef */, /* stopRef */);",
  assignLineToGroup: "sim.assignLineToGroup(/* lineRef */, /* groupRef */);",
  reassignElevatorToLine: "sim.reassignElevatorToLine(0n, /* lineRef */);",
};

function snippetFor(name: string): string {
  return SNIPPETS[name] ?? `sim.${name}();`;
}

export function wireSnippetPicker(): SnippetPickerHandles {
  const root = document.getElementById("quest-snippets");
  if (!root) throw new Error("snippet-picker: missing #quest-snippets");
  return { root };
}

export function renderSnippets(
  handles: SnippetPickerHandles,
  stage: Stage,
  editor: QuestEditor,
): void {
  while (handles.root.firstChild) {
    handles.root.removeChild(handles.root.firstChild);
  }
  const entries = unlockedEntries(stage.unlockedApi);
  if (entries.length === 0) return;

  for (const entry of entries) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className =
      "inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-elevated border border-stroke-subtle text-content text-[11.5px] font-mono cursor-pointer transition-colors duration-fast hover:bg-surface-hover hover:border-stroke";
    chip.textContent = entry.name;
    chip.title = `Insert: ${snippetFor(entry.name)}`;
    chip.addEventListener("click", () => {
      editor.insertAtCursor(snippetFor(entry.name));
    });
    handles.root.appendChild(chip);
  }
}
