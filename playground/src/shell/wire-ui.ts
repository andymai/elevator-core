import type { TweakRowHandles } from "../features/tweak-drawer";
import { COLOR_A, COLOR_B, type PaneHandles } from "../features/compare-pane";
import { renderScenarioCards } from "../features/scenario-picker";
import { PARAM_KEYS, type ParamKey } from "../domain";

export interface UiHandles {
  scenarioCards: HTMLElement;
  compareToggle: HTMLInputElement;
  seedInput: HTMLInputElement;
  seedShuffleBtn: HTMLButtonElement;
  speedInput: HTMLInputElement;
  speedLabel: HTMLElement;
  intensityInput: HTMLInputElement;
  intensityLabel: HTMLElement;
  playBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  tweakBtn: HTMLButtonElement;
  tweakPanel: HTMLElement;
  tweakResetAllBtn: HTMLButtonElement;
  tweakRows: Record<ParamKey, TweakRowHandles>;
  layout: HTMLElement;
  loader: HTMLElement;
  toast: HTMLElement;
  phaseStrip: HTMLElement | null;
  phaseLabel: HTMLElement | null;
  phaseProgress: HTMLElement | null;
  verdictRibbon: HTMLElement;
  shortcutsBtn: HTMLButtonElement;
  shortcutSheet: HTMLElement;
  shortcutSheetClose: HTMLButtonElement;
  paneA: PaneHandles;
  paneB: PaneHandles;
}

export function wireUi(): UiHandles {
  const q = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`missing element #${id}`);
    return el;
  };
  const qOpt = (id: string): HTMLElement | null => document.getElementById(id);
  const paneHandles = (suffix: "a" | "b", accent: string): PaneHandles => ({
    root: q(`pane-${suffix}`),
    canvas: q(`shaft-${suffix}`) as HTMLCanvasElement,
    name: q(`name-${suffix}`),
    mode: q(`mode-${suffix}`),
    desc: q(`desc-${suffix}`),
    metrics: q(`metrics-${suffix}`),
    trigger: q(`strategy-trigger-${suffix}`) as HTMLButtonElement,
    popover: q(`strategy-popover-${suffix}`),
    repoTrigger: q(`repo-trigger-${suffix}`) as HTMLButtonElement,
    repoName: q(`repo-name-${suffix}`),
    repoPopover: q(`repo-popover-${suffix}`),
    accent,
    which: suffix,
  });
  const tweakRow = (key: ParamKey): TweakRowHandles => {
    const root = document.querySelector<HTMLElement>(`.tweak-row[data-key="${key}"]`);
    if (!root) throw new Error(`missing tweak row for ${key}`);
    const get = (sel: string): HTMLElement => {
      const el = root.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`missing ${sel} in tweak row ${key}`);
      return el;
    };
    const getOpt = (sel: string): HTMLElement | null => root.querySelector<HTMLElement>(sel);
    return {
      root,
      value: get(".tweak-value"),
      defaultV: get(".tweak-default-v"),
      dec: get(".tweak-dec") as HTMLButtonElement,
      inc: get(".tweak-inc") as HTMLButtonElement,
      reset: get(".tweak-reset") as HTMLButtonElement,
      trackFill: getOpt(".tweak-track-fill"),
      trackDefault: getOpt(".tweak-track-default"),
      trackThumb: getOpt(".tweak-track-thumb"),
    };
  };
  const tweakRows: Record<ParamKey, TweakRowHandles> = {} as Record<ParamKey, TweakRowHandles>;
  for (const key of PARAM_KEYS) {
    tweakRows[key] = tweakRow(key);
  }
  const ui: UiHandles = {
    scenarioCards: q("scenario-cards"),
    compareToggle: q("compare") as HTMLInputElement,
    seedInput: q("seed") as HTMLInputElement,
    seedShuffleBtn: q("seed-shuffle") as HTMLButtonElement,
    speedInput: q("speed") as HTMLInputElement,
    speedLabel: q("speed-label"),
    intensityInput: q("traffic") as HTMLInputElement,
    intensityLabel: q("traffic-label"),
    playBtn: q("play") as HTMLButtonElement,
    resetBtn: q("reset") as HTMLButtonElement,
    shareBtn: q("share") as HTMLButtonElement,
    tweakBtn: q("tweak") as HTMLButtonElement,
    tweakPanel: q("tweak-panel"),
    tweakResetAllBtn: q("tweak-reset-all") as HTMLButtonElement,
    tweakRows,
    layout: q("layout"),
    loader: q("loader"),
    toast: q("toast"),
    phaseStrip: qOpt("phase-strip"),
    phaseLabel: qOpt("phase-label"),
    phaseProgress: qOpt("phase-progress-fill"),
    verdictRibbon: q("verdict-ribbon"),
    shortcutsBtn: q("shortcuts") as HTMLButtonElement,
    shortcutSheet: q("shortcut-sheet"),
    shortcutSheetClose: q("shortcut-sheet-close") as HTMLButtonElement,
    paneA: paneHandles("a", COLOR_A),
    paneB: paneHandles("b", COLOR_B),
  };

  renderScenarioCards(ui);

  const controlsBar = document.getElementById("controls-bar");
  if (controlsBar) {
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const h = Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
      document.documentElement.style.setProperty("--controls-bar-h", `${h}px`);
    });
    ro.observe(controlsBar);
  }

  return ui;
}
