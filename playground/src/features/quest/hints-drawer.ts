/**
 * Render the hints drawer for a stage.
 *
 * Each stage carries a 1–3 entry `hints` array — the curriculum's
 * progressive nudges from "where to look in the API" to "the
 * specific optimization the 3★ tier rewards." This module renders
 * them inside the index.html `<details>` so a click expands the
 * full list, and re-renders on stage navigation.
 *
 * Design choice: render every hint at once rather than gating
 * reveals one-by-one. Progressive reveal is tempting but invites
 * a click-through-everything reflex; collapsed-by-default behind
 * a `<details>` tag keeps frustrated players in reach of the help
 * while letting confident ones ignore the panel entirely.
 */

import { clearChildren, requireElement } from "./dom-utils";
import type { Stage } from "./stages";

export interface HintsDrawerHandles {
  readonly root: HTMLDetailsElement;
  readonly count: HTMLElement;
  readonly list: HTMLOListElement;
}

export function wireHintsDrawer(): HintsDrawerHandles {
  return {
    root: requireElement("quest-hints", "hints-drawer") as HTMLDetailsElement,
    count: requireElement("quest-hints-count", "hints-drawer"),
    list: requireElement("quest-hints-list", "hints-drawer") as HTMLOListElement,
  };
}

export function renderHints(handles: HintsDrawerHandles, stage: Stage): void {
  clearChildren(handles.list);
  const total = stage.hints.length;
  if (total === 0) {
    handles.count.textContent = "(none for this stage)";
    handles.root.removeAttribute("open");
    return;
  }
  handles.count.textContent = `(${total})`;
  for (const hint of stage.hints) {
    const item = document.createElement("li");
    item.className = "text-content-secondary leading-snug marker:text-content-tertiary";
    item.textContent = hint;
    handles.list.appendChild(item);
  }
  // Collapse on stage change so a player navigating between stages
  // doesn't get a wall-of-text the moment they pick a new one.
  handles.root.removeAttribute("open");
}
