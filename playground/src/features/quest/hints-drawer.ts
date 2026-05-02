/**
 * Render the hints drawer for a stage.
 *
 * Each stage carries a 1–3 entry `hints` array — the curriculum's
 * progressive nudges from "where to look in the API" to "the
 * specific optimization the 3★ tier rewards." Hints are rendered
 * staged: the first is visible the moment the drawer opens, and
 * the rest sit behind a "Show N more" button. A stuck player gets
 * the entry-level nudge without paying the spoiler cost on the
 * 3★ hint just to peek; a player who needs the full ladder is one
 * click away.
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

/** Class marker used to find and remove the staged-reveal button on re-render. */
const MORE_BTN_CLASS = "quest-hints-more";

export function renderHints(handles: HintsDrawerHandles, stage: Stage): void {
  clearChildren(handles.list);
  // Drop any leftover Show-more button from a previous stage's render.
  // Multiple drawers shouldn't exist on a page, but be defensive: if
  // a stale button slips through, the next stage would render with
  // both buttons in the DOM.
  for (const stale of handles.root.querySelectorAll(`.${MORE_BTN_CLASS}`)) {
    stale.remove();
  }

  const total = stage.hints.length;
  if (total === 0) {
    handles.count.textContent = "(none for this stage)";
    handles.root.removeAttribute("open");
    return;
  }
  handles.count.textContent = `(${total})`;

  stage.hints.forEach((hint, idx) => {
    const item = document.createElement("li");
    item.className = "text-content-secondary leading-snug marker:text-content-tertiary";
    item.textContent = hint;
    if (idx > 0) item.hidden = true;
    handles.list.appendChild(item);
  });

  if (total > 1) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = `${MORE_BTN_CLASS} mt-1.5 ml-5 self-start text-[11.5px] tracking-[0.01em] text-content-tertiary hover:text-content underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0`;
    more.textContent = `Show ${total - 1} more`;
    more.addEventListener("click", () => {
      for (const item of handles.list.querySelectorAll<HTMLLIElement>("li[hidden]")) {
        item.hidden = false;
      }
      more.remove();
    });
    handles.root.appendChild(more);
  }

  // Collapse on stage change so a player navigating between stages
  // doesn't get a wall-of-text the moment they pick a new one.
  handles.root.removeAttribute("open");
}
