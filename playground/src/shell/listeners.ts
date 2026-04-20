import { setShortcutSheetOpen } from "../features/keyboard-shortcuts";
import {
  refreshStrategyPopovers,
  refreshRepositionPopovers,
  isAnyStrategyPopoverOpen,
  isAnyRepositionPopoverOpen,
  closeAllPopovers,
  attachStrategyPopover,
  attachRepositionPopover,
  attachOutsideClickForPopovers,
} from "../features/strategy-picker";
import { switchScenario } from "../features/scenario-picker";
import { setTweakOpen, bumpParam, resetParam, resetAllOverrides } from "../features/tweak-drawer";
import { attachHoldToRepeat, toast } from "../platform";
import { DEFAULT_STATE, PARAM_KEYS, SCENARIOS, encodePermalink } from "../domain";
import type { State } from "./state";
import type { UiHandles } from "./wire-ui";
import { resetAll } from "./reset";
import { speedLabel, intensityLabel, randomSeedWord } from "./apply-permalink";

export function attachListeners(state: State, ui: UiHandles): void {
  const doResetAll = (): Promise<void> => resetAll(state, ui);

  ui.scenarioCards.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest<HTMLElement>(".scenario-card");
    if (!card) return;
    const id = card.dataset["scenarioId"];
    if (!id || id === state.permalink.scenario) return;
    void switchScenario(state, ui, id, doResetAll);
  });
  // Strategy picks reset the whole comparator so both panes stay aligned
  // on the same rider stream from t=0 — mixing pre- and post-change metrics
  // would make the scoreboard misleading.
  attachStrategyPopover(state, ui, ui.paneA, doResetAll);
  attachStrategyPopover(state, ui, ui.paneB, doResetAll);
  attachRepositionPopover(state, ui, ui.paneA, doResetAll);
  attachRepositionPopover(state, ui, ui.paneB, doResetAll);
  refreshStrategyPopovers(state, ui, doResetAll);
  refreshRepositionPopovers(state, ui, doResetAll);
  ui.compareToggle.addEventListener("change", () => {
    state.permalink = { ...state.permalink, compare: ui.compareToggle.checked };
    ui.layout.dataset["mode"] = state.permalink.compare ? "compare" : "single";
    // `also in …` badges depend on compare state, so re-render both
    // dispatch and reposition popovers when the toggle flips.
    refreshStrategyPopovers(state, ui, doResetAll);
    refreshRepositionPopovers(state, ui, doResetAll);
    void resetAll(state, ui).then(() => {
      toast(ui.toast, state.permalink.compare ? "Compare on" : "Compare off");
    });
  });
  ui.seedInput.addEventListener("change", () => {
    const seed = ui.seedInput.value.trim() || DEFAULT_STATE.seed;
    ui.seedInput.value = seed;
    if (seed === state.permalink.seed) return;
    state.permalink = { ...state.permalink, seed };
    void resetAll(state, ui);
  });
  ui.seedShuffleBtn.addEventListener("click", () => {
    const next = randomSeedWord();
    ui.seedInput.value = next;
    state.permalink = { ...state.permalink, seed: next };
    void resetAll(state, ui).then(() => {
      toast(ui.toast, `Seed: ${next}`);
    });
  });
  ui.speedInput.addEventListener("input", () => {
    const v = Number(ui.speedInput.value);
    state.permalink.speed = v;
    ui.speedLabel.textContent = speedLabel(v);
  });
  ui.intensityInput.addEventListener("input", () => {
    const v = Number(ui.intensityInput.value);
    state.permalink.intensity = v;
    state.traffic.setIntensity(v);
    ui.intensityLabel.textContent = intensityLabel(v);
  });

  ui.playBtn.addEventListener("click", () => {
    state.running = !state.running;
    ui.playBtn.textContent = state.running ? "Pause" : "Play";
    // Pause glyph when running (offering "pause"), play glyph when paused.
    ui.sheetPlay.textContent = state.running ? "\u23F8" : "\u25B6";
  });

  // ── Bottom sheet (mobile drawer) ─────────────────────────────────
  ui.sheetToggle.addEventListener("click", () => {
    const open = ui.sheet.dataset["open"] !== "true";
    ui.sheet.dataset["open"] = String(open);
    ui.sheetToggle.setAttribute("aria-expanded", String(open));
  });
  // The play glyph lives inside the sheet handle; stop propagation so
  // tapping it doesn't also open/close the sheet.
  ui.sheetPlay.addEventListener("click", (ev) => {
    ev.stopPropagation();
    ui.playBtn.click();
  });
  ui.resetBtn.addEventListener("click", () => {
    void resetAll(state, ui);
    toast(ui.toast, "Reset");
  });

  // ── Tweak panel ──────────────────────────────────────────────────
  ui.tweakBtn.addEventListener("click", () => {
    const open = ui.tweakBtn.getAttribute("aria-expanded") !== "true";
    setTweakOpen(ui, open);
  });
  for (const key of PARAM_KEYS) {
    const row = ui.tweakRows[key];
    attachHoldToRepeat(row.dec, () => {
      bumpParam(state, ui, key, -1, doResetAll);
    });
    attachHoldToRepeat(row.inc, () => {
      bumpParam(state, ui, key, 1, doResetAll);
    });
    row.reset.addEventListener("click", () => {
      resetParam(state, ui, key, doResetAll);
    });
    // Arrow keys on the focused row nudge the value just like clicking
    // +/-. We gate on exact key so Page/Home/End still reach the
    // scroll-to-section defaults the browser provides.
    row.root.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowUp" || ev.key === "ArrowRight") {
        ev.preventDefault();
        bumpParam(state, ui, key, 1, doResetAll);
      } else if (ev.key === "ArrowDown" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        bumpParam(state, ui, key, -1, doResetAll);
      }
    });
  }
  ui.tweakResetAllBtn.addEventListener("click", () => {
    void resetAllOverrides(state, ui, doResetAll);
  });
  ui.shareBtn.addEventListener("click", () => {
    const qs = encodePermalink(state.permalink);
    const url = `${window.location.origin}${window.location.pathname}${qs}`;
    window.history.replaceState(null, "", qs);
    void navigator.clipboard.writeText(url).then(
      () => {
        toast(ui.toast, "Permalink copied");
      },
      () => {
        // Clipboard unavailable (insecure context) — still show feedback
        // since the URL was pushed to the address bar.
        toast(ui.toast, "Permalink copied");
      },
    );
  });

  // ── Shortcut sheet + global keys ─────────────────────────────────
  ui.shortcutsBtn.addEventListener("click", () => {
    setShortcutSheetOpen(ui, ui.shortcutSheet.hidden);
  });
  ui.shortcutSheetClose.addEventListener("click", () => {
    setShortcutSheetOpen(ui, false);
  });
  ui.shortcutSheet.addEventListener("click", (ev) => {
    // Click on the dim backdrop closes the sheet; clicks inside
    // `.shortcut-sheet-inner` bubble through unless stopped.
    if (ev.target === ui.shortcutSheet) setShortcutSheetOpen(ui, false);
  });
  attachKeyboardShortcuts(state, ui);
  attachOutsideClickForPopovers(ui);
}

/**
 * Global keyboard shortcuts. Gated on focused element — typing into a
 * number input (seed) or a select shouldn't steal Space/R/C for the
 * app. The tweak row's arrow-key nudge is registered separately so it
 * still fires when the row itself is focused.
 */
function attachKeyboardShortcuts(state: State, ui: UiHandles): void {
  window.addEventListener("keydown", (ev) => {
    const target = ev.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
        return;
      }
    }
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    switch (ev.key) {
      case " ": {
        ev.preventDefault();
        ui.playBtn.click();
        return;
      }
      case "r":
      case "R": {
        ev.preventDefault();
        ui.resetBtn.click();
        return;
      }
      case "c":
      case "C": {
        ev.preventDefault();
        ui.compareToggle.click();
        return;
      }
      case "s":
      case "S": {
        ev.preventDefault();
        ui.shareBtn.click();
        return;
      }
      case "t":
      case "T": {
        ev.preventDefault();
        ui.tweakBtn.click();
        return;
      }
      case "?":
      case "/": {
        ev.preventDefault();
        setShortcutSheetOpen(ui, ui.shortcutSheet.hidden);
        return;
      }
      case "Escape": {
        if (isAnyStrategyPopoverOpen(ui) || isAnyRepositionPopoverOpen(ui)) {
          ev.preventDefault();
          closeAllPopovers(ui);
          return;
        }
        if (!ui.shortcutSheet.hidden) {
          ev.preventDefault();
          setShortcutSheetOpen(ui, false);
        }
        return;
      }
    }
    // 1..N → scenario cards. Guarded to the SCENARIOS array length so
    // extra digits are inert rather than reaching an undefined slot.
    const n = Number(ev.key);
    if (Number.isInteger(n) && n >= 1 && n <= SCENARIOS.length) {
      const scenario = SCENARIOS[n - 1];
      if (!scenario) return;
      if (scenario.id !== state.permalink.scenario) {
        ev.preventDefault();
        void switchScenario(state, ui, scenario.id, () => resetAll(state, ui));
      }
    }
  });
}
