import { setShortcutSheetOpen } from "../features/keyboard-shortcuts";
import {
  renderPaneStrategyInfo,
  renderPaneRepositionInfo,
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
import type { ScenarioSwitchHooks } from "../features/scenario-picker";
import {
  setTweakOpen,
  renderTweakPanel,
  bumpParam,
  resetParam,
  resetAllOverrides,
} from "../features/tweak-drawer";
import { attachHoldToRepeat, toast } from "../platform";
import {
  DEFAULT_STATE,
  PARAM_KEYS,
  SCENARIOS,
  scenarioById,
  encodePermalink,
  syncPermalinkUrl,
} from "../domain";
import type { State } from "./state";
import type { UiHandles } from "./wire-ui";
import { resetAll } from "./reset";
import { speedLabel, intensityLabel, randomSeedWord } from "./apply-permalink";

export function attachListeners(state: State, ui: UiHandles): void {
  const doResetAll = (): Promise<void> => resetAll(state, ui);

  const switchHooks: ScenarioSwitchHooks = {
    renderPaneStrategyInfo,
    renderPaneRepositionInfo,
    refreshStrategyPopovers: () => {
      refreshStrategyPopovers(state, ui, doResetAll);
      refreshRepositionPopovers(state, ui, doResetAll);
    },
    renderTweakPanel: () => {
      const scenario = scenarioById(state.permalink.scenario);
      renderTweakPanel(scenario, state.permalink.overrides, ui);
    },
  };

  ui.scenarioCards.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest<HTMLElement>(".scenario-card");
    if (!card) return;
    const id = card.dataset["scenarioId"];
    if (!id || id === state.permalink.scenario) return;
    void switchScenario(state, ui, id, doResetAll, switchHooks);
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
    syncPermalinkUrl(state.permalink);
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
    syncPermalinkUrl(state.permalink);
    void resetAll(state, ui);
  });
  ui.seedShuffleBtn.addEventListener("click", () => {
    const next = randomSeedWord();
    ui.seedInput.value = next;
    state.permalink = { ...state.permalink, seed: next };
    syncPermalinkUrl(state.permalink);
    void resetAll(state, ui).then(() => {
      toast(ui.toast, `Seed: ${next}`);
    });
  });
  // Sliders fire `input` continuously while the user drags. We only
  // sync the URL on `change` (drag end / commit) so the address bar
  // doesn't churn on every pixel — `replaceState` is cheap but the
  // visible URL flicker is distracting.
  ui.speedInput.addEventListener("input", () => {
    const v = Number(ui.speedInput.value);
    state.permalink.speed = v;
    ui.speedLabel.textContent = speedLabel(v);
  });
  ui.speedInput.addEventListener("change", () => {
    syncPermalinkUrl(state.permalink);
  });
  ui.intensityInput.addEventListener("input", () => {
    const v = Number(ui.intensityInput.value);
    state.permalink.intensity = v;
    state.traffic.setIntensity(v);
    ui.intensityLabel.textContent = intensityLabel(v);
  });
  ui.intensityInput.addEventListener("change", () => {
    syncPermalinkUrl(state.permalink);
  });

  // Sync at attach time so the initial render doesn't rely on HTML
  // defaults matching the TS init value.
  const renderPlayButton = (): void => {
    const label = state.running ? "Pause" : "Play";
    ui.playBtn.dataset["state"] = state.running ? "running" : "paused";
    ui.playBtn.setAttribute("aria-label", label);
    ui.playBtn.title = label;
  };
  renderPlayButton();
  ui.playBtn.addEventListener("click", () => {
    state.running = !state.running;
    renderPlayButton();
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
    // Both success and failure show the same toast — the URL was
    // already pushed to the address bar, so even if clipboard is
    // unavailable (insecure context) the user still has the link.
    void navigator.clipboard.writeText(url).then(
      () => {
        toast(ui.toast, "Permalink copied");
      },
      () => {
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
  attachKeyboardShortcuts(state, ui, switchHooks);
  attachOutsideClickForPopovers(ui);
}

/**
 * Global keyboard shortcuts. Gated on focused element — typing into a
 * number input (seed) or a select shouldn't steal Space/R/C for the
 * app. The tweak row's arrow-key nudge is registered separately so it
 * still fires when the row itself is focused.
 */
function attachKeyboardShortcuts(
  state: State,
  ui: UiHandles,
  switchHooks: ScenarioSwitchHooks,
): void {
  window.addEventListener("keydown", (ev) => {
    // Quest mode is its own surface. Every shortcut here drives the
    // compare-mode chrome (Pause sim, Reset sim, Compare toggle, Share,
    // Tweak, scenario cards) — none of which exist in Quest. Worse:
    // single-letter shortcuts like `s`, `r`, `c`, `t`, `?` collide
    // with characters the player needs to type into the Monaco editor,
    // and the global handler intercepts the keydown in the bubble
    // phase and `preventDefault`s the input even though the textarea
    // already received it. Bail out wholesale in Quest mode.
    if (state.permalink.mode === "quest") return;
    if (ev.target instanceof HTMLElement) {
      const tag = ev.target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        ev.target.isContentEditable ||
        // Defensive belt for any future Monaco mount in compare mode:
        // the editor's hidden `<textarea>` already trips the tag check
        // above, but the wider monaco-editor surface includes a
        // contenteditable child for IME composition.
        ev.target.closest(".monaco-editor")
      ) {
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
        void switchScenario(state, ui, scenario.id, () => resetAll(state, ui), switchHooks);
      }
    }
  });
}
