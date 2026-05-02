/**
 * Header-level Compare ⇆ Quest toggle.
 *
 * Two responsibilities:
 *
 * 1. `applyPlaygroundMode` — reflect the active mode in the DOM by
 *    hiding the chrome that doesn't belong to the active surface.
 *    Compare mode owns the layout panes, scenario picker, controls
 *    bar, and cabin-color legend; Quest mode owns the curriculum
 *    pane. Called from boot before first paint so a Quest deep-link
 *    doesn't flash the compare-mode chrome on cold load.
 *
 * 2. `wireModeToggle` — sync the toggle's pressed state to the
 *    current mode and turn clicks into a permalink-preserving
 *    navigation. We deliberately reload rather than swap modes in
 *    place: Monaco's lazy mount, the compare render loop, and the
 *    wasm sim's lifecycle all assume a single mode for the page's
 *    lifetime, and a hard reload is far simpler than threading
 *    teardown for each.
 */
import type { PlaygroundMode } from "../domain";

/** Elements that exist for compare mode and have no Quest meaning. */
const COMPARE_CHROME_IDS = ["layout", "scenario-picker", "controls-bar", "cabin-legend"] as const;

/** Elements that exist for Quest mode only. */
const QUEST_CHROME_IDS = ["quest-pane"] as const;

/**
 * Apply the active playground mode to the DOM. Idempotent — safe to
 * call repeatedly. Quest pane uses `flex` as its visible display so we
 * pair the `hidden` toggle with `flex` rather than relying on Tailwind's
 * default block.
 */
export function applyPlaygroundMode(mode: PlaygroundMode): void {
  const isQuest = mode === "quest";
  for (const id of COMPARE_CHROME_IDS) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", isQuest);
  }
  for (const id of QUEST_CHROME_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle("hidden", !isQuest);
    el.classList.toggle("flex", isQuest);
  }
}

/**
 * Wire the Compare ⇆ Quest segmented toggle.
 *
 * Reflects the active mode via `data-active` (Tailwind's
 * `data-[active=true]:*` variants render the pressed chip) and
 * `aria-selected`. Clicks rewrite the URL to swap modes and reload —
 * the new mode flows through `boot()` cleanly, including Monaco's
 * lazy-load on first Quest entry.
 */
export function wireModeToggle(currentMode: PlaygroundMode): void {
  const root = document.getElementById("mode-toggle");
  if (!root) return;
  const buttons = root.querySelectorAll<HTMLButtonElement>("button[data-mode]");
  for (const btn of buttons) {
    const isActive = btn.dataset["mode"] === currentMode;
    btn.dataset["active"] = String(isActive);
    btn.setAttribute("aria-selected", String(isActive));
  }
  root.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest<HTMLButtonElement>("button[data-mode]");
    if (!btn) return;
    const next = btn.dataset["mode"];
    if (next !== "compare" && next !== "quest") return;
    if (next === currentMode) return;
    const url = new URL(window.location.href);
    if (next === "compare") {
      // `qs` is a Quest-only key; drop it so a returning compare-mode
      // URL stays clean.
      url.searchParams.delete("m");
      url.searchParams.delete("qs");
    } else {
      url.searchParams.set("m", next);
    }
    window.location.assign(url.toString());
  });
}
