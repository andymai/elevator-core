/**
 * Render the unlocked-API reference panel for a stage.
 *
 * The panel sits beneath the editor and re-renders on stage
 * navigation to reflect that stage's `unlockedApi`. It deliberately
 * shows only what's unlocked — locked methods don't render at all,
 * so the panel doubles as a quiet hint about the curriculum's
 * progression.
 */

import { unlockedEntries } from "./api-reference";
import type { Stage } from "./stages";

export interface ApiPanelHandles {
  readonly root: HTMLElement;
}

export function wireApiPanel(): ApiPanelHandles {
  const root = document.getElementById("quest-api-panel");
  if (!root) throw new Error("api-panel: missing #quest-api-panel");
  return { root };
}

export function renderApiPanel(handles: ApiPanelHandles, stage: Stage): void {
  // Clear via removeChild so we don't trip the no-innerHTML rule.
  while (handles.root.firstChild) {
    handles.root.removeChild(handles.root.firstChild);
  }
  const entries = unlockedEntries(stage.unlockedApi);
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-content-tertiary text-[11px] m-0";
    empty.textContent = "No methods unlocked at this stage.";
    handles.root.appendChild(empty);
    return;
  }

  const heading = document.createElement("p");
  heading.className =
    "m-0 text-[10.5px] uppercase tracking-[0.08em] text-content-tertiary font-medium";
  heading.textContent = `Unlocked at this stage (${entries.length})`;
  handles.root.appendChild(heading);

  const list = document.createElement("ul");
  list.className =
    "m-0 mt-1.5 p-0 list-none flex flex-col gap-1 text-[12px] leading-snug max-h-[200px] overflow-y-auto";
  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle/50";

    const sig = document.createElement("code");
    sig.className = "block font-mono text-[12px] text-content";
    sig.textContent = entry.signature;
    item.appendChild(sig);

    const desc = document.createElement("p");
    desc.className = "m-0 mt-0.5 text-[11.5px] text-content-secondary";
    desc.textContent = entry.description;
    item.appendChild(desc);

    list.appendChild(item);
  }
  handles.root.appendChild(list);
}
