import { generate as generateRandomWords } from "random-words";
import { CanvasRenderer } from "./canvas";
import { updatePhaseIndicator, updatePhaseProgress } from "./features/phase-strip";
import { setShortcutSheetOpen } from "./features/keyboard-shortcuts";
import {
  type MetricKey,
  METRIC_KEYS,
  METRIC_HISTORY_LEN,
  diffMetrics,
  initMetricRows,
  renderMetricRows,
  renderVerdictRibbon,
} from "./features/scoreboard";
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
} from "./features/strategy-picker";
import {
  renderScenarioCards,
  syncScenarioCards,
  syncSheetCompact,
  switchScenario,
  reconcileStrategyWithScenario,
} from "./features/scenario-picker";
import {
  type TweakRowHandles,
  renderTweakPanel,
  setTweakOpen,
  bumpParam,
  resetParam,
  resetAllOverrides,
} from "./features/tweak-drawer";
import { attachHoldToRepeat, toast } from "./platform";
import {
  DEFAULT_STATE,
  PARAM_KEYS,
  SCENARIOS,
  buildScenarioRon,
  compactOverrides,
  decodePermalink,
  encodePermalink,
  hashSeedWord,
  scenarioById,
  type Overrides,
  type ParamKey,
  type PermalinkState,
} from "./domain";
import { Sim, loadWasm } from "./sim";
import { TrafficDriver } from "./sim";
import type {
  BubbleEvent,
  CarBubble,
  Metrics,
  RepositionStrategyName,
  ScenarioMeta,
  Snapshot,
  StrategyName,
} from "./types";

// The playground is a side-by-side comparator: up to two sims run the same
// rider stream under different dispatch strategies. In single mode only
// pane A is visible. A lightweight scoreboard highlights which strategy is
// winning on each live metric.

/**
 * Draw a random seed word from the `random-words` dictionary
 * (~1800 short English words). Bounded length so the field stays
 * readable in the compact control strip — typical results look like
 * "orange", "window", "market", "static".
 */
function randomSeedWord(): string {
  const word = generateRandomWords({ exactly: 1, minLength: 3, maxLength: 8 });
  // `generate` can return a single string or a string array depending
  // on options; normalise to the first element.
  return Array.isArray(word) ? (word[0] ?? "seed") : word;
}

const COLOR_A = "#7dd3fc";
const COLOR_B = "#fda4af";

/**
 * How long a pane's decision-narration line stays at full opacity
 * after a fresh `elevator-assigned` event. After this window the line
 * dims but stays readable — users can still see the most recent
 * decision after a lull, just with lower visual priority.
 */
const DECISION_TTL_MS = 1800;

const speedLabel = (v: number): string => `${v}\u00d7`;
const intensityLabel = (v: number): string => `${v.toFixed(1)}\u00d7`;

interface Pane {
  strategy: StrategyName;
  sim: Sim;
  renderer: CanvasRenderer;
  metricsEl: HTMLElement;
  modeEl: HTMLElement;
  decisionEl: HTMLElement;
  /**
   * Rolling per-metric history for the inline sparklines that live in
   * each metric row. Capped at `METRIC_HISTORY_LEN` samples; keys
   * mirror `MetricVerdicts` and we keep raw numbers, doing the chart
   * math at render time.
   */
  metricHistory: Record<MetricKey, number[]>;
  latestMetrics: Metrics | null;
  /**
   * Per-car speech bubbles. Keyed by car entity id. Each entry fades
   * per its event-kind TTL; stale entries are evicted lazily in
   * [`updateBubbles`] so the map never grows past `cars × 1`.
   */
  bubbles: Map<number, CarBubble>;
  /**
   * Wall-clock ms after which the pane's decision line (the
   * `Car X → <stop>` readout) should fade out. We keep the text
   * visible after fade-out so the last known decision is still there
   * on the next pulse, just at reduced opacity — makes compare mode
   * read as "here's the story" rather than flashing on/off.
   */
  decisionExpiresAt: number;
}

/**
 * Per-event speech-bubble lifetimes in wall-clock milliseconds. Events
 * that carry more information (destination, dropoff) linger; transient
 * events (door open) dismiss quickly so the per-car bubble cycles
 * through the action it describes without feeling stale at 16×.
 */
const BUBBLE_TTL_BY_KIND: Record<string, number> = {
  "elevator-assigned": 1400,
  "elevator-arrived": 1200,
  "elevator-repositioning": 1600,
  "door-opened": 550,
  "rider-boarded": 850,
  "rider-exited": 1600,
};
const BUBBLE_TTL_DEFAULT_MS = 1000;

interface State {
  running: boolean;
  ready: boolean;
  permalink: PermalinkState;
  paneA: Pane | null;
  paneB: Pane | null;
  traffic: TrafficDriver;
  lastFrameTime: number;
  /**
   * Monotonic counter incremented at the start of every reset. An async reset
   * handler that finishes after a newer one started must abort, otherwise
   * its late `makePane` result overwrites the newer pane and the old Sim
   * stays referenced (and gets `step()`-ed on freed wasm memory next frame).
   */
  initToken: number;
  /**
   * Progressive pre-seed state for scenarios with `seedSpawns > 0`.
   * Instead of blocking the loader on hundreds of synchronous
   * `spawnRider` calls, we hand the quota to the render loop and
   * inject a per-frame batch until `remaining` hits zero. `null`
   * when not seeding (the common case for day-cycle scenarios).
   */
  seeding: { remaining: number } | null;
}

/**
 * Per-frame cap on `drainSpawns` calls during progressive seeding.
 * At convention-burst's keynote rate (110 riders/min, 4/60-s dt) the
 * driver's accumulator grows ~0.12 per call, so this yields ~24
 * riders per frame — the full 120-rider seed drains in ~5 frames
 * (~80 ms wall-clock) without ever blocking the loader.
 */
const SEED_CALLS_PER_FRAME = 200;

interface PaneHandles {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  name: HTMLElement;
  mode: HTMLElement;
  decision: HTMLElement;
  desc: HTMLElement;
  metrics: HTMLElement;
  trigger: HTMLButtonElement;
  popover: HTMLElement;
  /** Reposition-strategy chip — the second ("Park: …") chip in the pane header. */
  repoTrigger: HTMLButtonElement;
  repoName: HTMLElement;
  repoPopover: HTMLElement;
  accent: string;
  /** "a" or "b" — used by the popover wiring to route picks back. */
  which: "a" | "b";
}

interface UiHandles {
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
  phaseLabel: HTMLElement | null;
  phaseProgress: HTMLElement | null;
  verdictRibbon: HTMLElement;
  shortcutsBtn: HTMLButtonElement;
  shortcutSheet: HTMLElement;
  shortcutSheetClose: HTMLButtonElement;
  sheet: HTMLElement;
  sheetToggle: HTMLButtonElement;
  sheetScenario: HTMLElement;
  sheetStrategy: HTMLElement;
  sheetPlay: HTMLElement;
  paneA: PaneHandles;
  paneB: PaneHandles;
}

async function boot(): Promise<void> {
  // Kick off the wasm fetch + compile *before* DOM wiring so the
  // ~hundreds-of-ms WebAssembly.instantiate overlaps with synchronous
  // JS work (scenario-card rendering, handle lookups, permalink
  // decode). `loadWasm` memoises via an internal promise, so the
  // subsequent `Sim.create` calls in `makePane` await the same
  // module without re-fetching.
  const wasmReady = loadWasm();
  // Swallow rejections here; `makePane` will re-await the same
  // promise and surface the error through the Init-failed toast.
  wasmReady.catch(() => {});
  const ui = wireUi();
  // Detect "first load" = bare URL with no seed explicitly in it.
  // On first load we roll a random seed word and push it back via
  // `replaceState` so *refresh* stays reproducible (the URL now
  // carries the rolled seed). Shared links naturally carry `k=…` so
  // they take the else branch and use the sender's seed as-is.
  const hadSeedInUrl = new URLSearchParams(window.location.search).has("k");
  const permalink = { ...DEFAULT_STATE, ...decodePermalink(window.location.search) };
  if (!hadSeedInUrl) {
    permalink.seed = randomSeedWord();
    const url = new URL(window.location.href);
    url.searchParams.set("k", permalink.seed);
    window.history.replaceState(null, "", url.toString());
  }
  // If the permalink points at a scenario we don't have, fall back to the
  // scenario's `defaultStrategy` for pane A so "Share link from hotel"
  // doesn't deliver a mismatched config to the recipient.
  reconcileStrategyWithScenario(permalink);
  // Compact decoded overrides against the resolved scenario so a URL
  // that carries values matching the current default (possible if a
  // scenario default shifted between share-time and load-time) doesn't
  // spuriously auto-open the drawer with zero active highlights.
  // `encodePermalink`'s contract is that callers compact first; this
  // is the decode-side counterpart, done once at boot rather than in
  // every subsequent write path.
  const scenario = scenarioById(permalink.scenario);
  permalink.overrides = compactOverrides(scenario, permalink.overrides);
  applyPermalinkToUi(permalink, ui);
  const state: State = {
    running: true,
    ready: false,
    permalink,
    paneA: null,
    paneB: null,
    traffic: new TrafficDriver(hashSeedWord(permalink.seed)),
    lastFrameTime: performance.now(),
    initToken: 0,
    seeding: null,
  };
  attachListeners(state, ui);
  await resetAll(state, ui);
  state.ready = true;
  loop(state, ui);
}

function wireUi(): UiHandles {
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
    decision: q(`decision-${suffix}`),
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
  const tweakRows: Record<ParamKey, TweakRowHandles> = {
    cars: tweakRow("cars"),
    maxSpeed: tweakRow("maxSpeed"),
    weightCapacity: tweakRow("weightCapacity"),
    doorCycleSec: tweakRow("doorCycleSec"),
  };
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
    phaseLabel: qOpt("phase-label"),
    phaseProgress: qOpt("phase-progress-fill"),
    verdictRibbon: q("verdict-ribbon"),
    shortcutsBtn: q("shortcuts") as HTMLButtonElement,
    shortcutSheet: q("shortcut-sheet"),
    shortcutSheetClose: q("shortcut-sheet-close") as HTMLButtonElement,
    sheet: q("controls-sheet"),
    sheetToggle: q("sheet-toggle") as HTMLButtonElement,
    sheetScenario: q("sheet-scenario"),
    sheetStrategy: q("sheet-strategy"),
    sheetPlay: q("sheet-play"),
    paneA: paneHandles("a", COLOR_A),
    paneB: paneHandles("b", COLOR_B),
  };

  renderScenarioCards(ui);

  return ui;
}

function applyPermalinkToUi(p: PermalinkState, ui: UiHandles): void {
  ui.compareToggle.checked = p.compare;
  ui.layout.dataset["mode"] = p.compare ? "compare" : "single";
  ui.seedInput.value = p.seed;
  ui.speedInput.value = String(p.speed);
  ui.speedLabel.textContent = speedLabel(p.speed);
  ui.intensityInput.value = String(p.intensity);
  ui.intensityLabel.textContent = intensityLabel(p.intensity);
  renderPaneStrategyInfo(ui.paneA, p.strategyA);
  renderPaneStrategyInfo(ui.paneB, p.strategyB);
  renderPaneRepositionInfo(ui.paneA, p.repositionA);
  renderPaneRepositionInfo(ui.paneB, p.repositionB);
  syncScenarioCards(ui, p.scenario);
  const scenario = scenarioById(p.scenario);
  syncSheetCompact(ui, scenario.label, p.strategyA);
  // Auto-open the drawer when the permalink carries any override —
  // the recipient sees what the sender customized without an extra
  // click. A clean URL leaves the drawer closed so first-time
  // visitors meet the unchanged playground.
  if (Object.keys(p.overrides).length > 0) {
    setTweakOpen(ui, true);
  }
  renderTweakPanel(scenario, p.overrides, ui);
}

/** Run `fn` against each active pane. Lets call sites fan out without null-checks. */
function forEachPane(state: State, fn: (pane: Pane) => void): void {
  if (state.paneA) fn(state.paneA);
  if (state.paneB) fn(state.paneB);
}

function disposePane(pane: Pane | null): void {
  pane?.sim.dispose();
  pane?.renderer.dispose();
}

async function makePane(
  handles: PaneHandles,
  strategy: StrategyName,
  reposition: RepositionStrategyName,
  scenario: ScenarioMeta,
  overrides: Overrides,
): Promise<Pane> {
  // Always regenerate RON so user overrides (including non-default
  // car count) are baked into the initial sim. Hot-swappable knobs
  // could in principle apply post-construction via `applyPhysicsLive`,
  // but baking them in keeps the sim's initial state identical to
  // a recipient who loads the same permalink — no transient first-
  // tick using defaults followed by a setter call.
  const ron = buildScenarioRon(scenario, overrides);
  const sim = await Sim.create(ron, strategy, reposition);
  const renderer = new CanvasRenderer(handles.canvas, handles.accent);
  // Scenarios with a lot of floors need a taller shaft on mobile, or
  // the 42-floor skyscraper crushes into a 6-px-per-story smear. The
  // CSS rule reads `--shaft-min-h` inside a `max-width: 767px` media
  // query; floor here means the mobile layout will stretch to fit and
  // the main column scrolls. Desktop ignores the variable.
  const wrap = handles.canvas.parentElement;
  if (wrap) {
    const stopCount = scenario.stops.length;
    const perStoryPx = 16;
    const minShaftPx = Math.max(200, stopCount * perStoryPx);
    wrap.style.setProperty("--shaft-min-h", `${minShaftPx}px`);
  }
  renderPaneStrategyInfo(handles, strategy);
  renderPaneRepositionInfo(handles, reposition);
  initMetricRows(handles.metrics);
  handles.decision.textContent = "";
  handles.decision.dataset["active"] = "false";
  handles.decision.dataset["pulse"] = "false";
  return {
    strategy,
    sim,
    renderer,
    metricsEl: handles.metrics,
    modeEl: handles.mode,
    decisionEl: handles.decision,
    metricHistory: {
      avg_wait_s: [],
      max_wait_s: [],
      delivered: [],
      abandoned: [],
      utilization: [],
    },
    latestMetrics: null,
    bubbles: new Map(),
    decisionExpiresAt: 0,
  };
}

/**
 * Re-apply a scenario's traffic configuration to the current driver.
 * Called once after constructing a fresh driver, and again after
 * seed-spawn pumping has advanced its internal cycle clock — re-seating
 * the phase schedule puts the cycle back at t=0 so the first real frame
 * opens on the scenario's first phase.
 */
function configureTraffic(state: State, scenario: ScenarioMeta): void {
  state.traffic.setPhases(scenario.phases);
  state.traffic.setIntensity(state.permalink.intensity);
  // Scenario-level abandonment — converted from seconds to ticks using
  // the sim's 60 Hz canonical rate. Scenarios omitting `abandonAfterSec`
  // (convention burst) keep "wait forever" so their stress tests stay
  // punishing.
  state.traffic.setPatienceTicks(
    scenario.abandonAfterSec ? Math.round(scenario.abandonAfterSec * 60) : 0,
  );
}

async function resetAll(state: State, ui: UiHandles): Promise<void> {
  const token = ++state.initToken;
  ui.loader.classList.add("show");
  const scenario = scenarioById(state.permalink.scenario);
  // Swap in the fresh TrafficDriver *before* creating panes. If paneB
  // construction throws after paneA was installed, the surviving paneA
  // must see the reset seed — not the previous driver's accumulator.
  state.traffic = new TrafficDriver(hashSeedWord(state.permalink.seed));
  configureTraffic(state, scenario);
  // Tear the old panes down *before* building new ones so the freed wasm
  // memory is released before we allocate the replacements.
  disposePane(state.paneA);
  disposePane(state.paneB);
  state.paneA = null;
  state.paneB = null;
  try {
    // Build both panes *before* attaching either to `state`. Attaching
    // pane A while pane B is still awaiting wasm instantiation lets
    // the render loop fire rAF in between, stepping pane A alone while
    // pane B is still at tick 0. The panes then desync by the ticks
    // accumulated during that window, ruining apples-to-apples
    // comparison. Serialising the construction here is fine (wasm
    // instantiation is cheap once the module is cached), and the
    // atomic assignment below guarantees both panes enter the loop on
    // exactly the same tick.
    const paneA = await makePane(
      ui.paneA,
      state.permalink.strategyA,
      state.permalink.repositionA,
      scenario,
      state.permalink.overrides,
    );
    let paneB: Pane | null = null;
    if (state.permalink.compare) {
      try {
        paneB = await makePane(
          ui.paneB,
          state.permalink.strategyB,
          state.permalink.repositionB,
          scenario,
          state.permalink.overrides,
        );
      } catch (err) {
        disposePane(paneA);
        throw err;
      }
    }
    if (token !== state.initToken) {
      disposePane(paneA);
      disposePane(paneB);
      return;
    }
    state.paneA = paneA;
    state.paneB = paneB;
    // Progressive pre-seed: instead of pumping hundreds of spawns
    // synchronously (which blocked the loader for ~50 ms even warm),
    // hand the quota to the render loop. It injects per-frame
    // batches starting the next rAF and re-seats the driver via
    // `configureTraffic` once the quota drains, so the scenario's
    // day-cycle clock still starts from t=0.
    state.seeding = scenario.seedSpawns > 0 ? { remaining: scenario.seedSpawns } : null;
    updatePhaseIndicator(state, ui);
    renderTweakPanel(scenario, state.permalink.overrides, ui);
  } catch (err) {
    if (token === state.initToken) {
      toast(ui.toast, `Init failed: ${(err as Error).message}`);
    }
    throw err;
  } finally {
    if (token === state.initToken) {
      ui.loader.classList.remove("show");
    }
  }
}

function attachListeners(state: State, ui: UiHandles): void {
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

function loop(state: State, ui: UiHandles): void {
  let uiFrame = 0;
  const frame = (): void => {
    const now = performance.now();
    const elapsed = (now - state.lastFrameTime) / 1000;
    state.lastFrameTime = now;

    // Only step when every pane required by the current mode is
    // ready — in compare mode that means both A and B must be
    // attached before either advances, so they always step on the
    // exact same tick. Without this guard a brief window between
    // `state.paneA = paneA` and `state.paneB = paneB` (during the
    // awaited pane-B construction) would let pane A race ahead.
    const paneA = state.paneA;
    const paneB = state.paneB;
    const panesReady = paneA !== null && (!state.permalink.compare || paneB !== null);
    if (state.running && state.ready && panesReady) {
      const ticks = state.permalink.speed;
      forEachPane(state, (pane) => {
        pane.sim.step(ticks);
        // Drain events every frame so the wasm `EventBus` can't grow
        // unbounded during long sessions, and feed the speech-bubble
        // layer the freshest per-car action. The decision narration
        // piggybacks on the same event stream — `pushDecision` only
        // reacts to `elevator-assigned`, which is strategy-level
        // dispatch output rather than the per-car action bubbles.
        const events = pane.sim.drainEvents();
        if (events.length > 0) {
          const snap = pane.sim.snapshot();
          const stopName = (id: number): string => resolveStopName(snap, id);
          updateBubbles(pane, events, snap);
          for (const ev of events) pushDecision(pane, ev, stopName);
        }
      });

      // Progressive pre-seed: drain the remaining quota in per-frame
      // batches. While seeding is active we suppress the normal
      // wall-clock drain below so the driver's accumulator — which
      // also advances here — stays dedicated to the initial crowd.
      // When the last rider lands we re-seat the driver so the
      // scenario's day cycle starts from t=0.
      if (state.seeding) {
        drainSeedBatch(state);
      }

      const snapA = paneA.sim.snapshot();
      // Fan-out spawns to both sims so the comparison is apples-to-apples.
      // Clamp wall-clock first (to guard against tab-switch catch-up, which
      // restores rAF with a multi-second delta), *then* scale by speed so
      // the phase clock and spawn cadence track the sim's actual rate.
      // At 8× the raw sim-time delta is ~0.128 s per 16 ms frame, which
      // would exceed the driver's internal 4/60 sec clamp every frame
      // and silently throttle phases to half speed. Skipped while seeding.
      const clampedWall = Math.min(elapsed, 4 / 60);
      const simElapsed = clampedWall * ticks;
      const specs = state.seeding ? [] : state.traffic.drainSpawns(snapA, simElapsed);
      for (const spec of specs) {
        forEachPane(state, (pane) => {
          pane.sim.spawnRider(spec.originStopId, spec.destStopId, spec.weight, spec.patienceTicks);
        });
      }

      // Re-snapshot each pane post-spawn so waiting dots reflect the new riders.
      const speed = state.permalink.speed;
      renderPane(paneA, paneA.sim.snapshot(), speed);
      if (paneB) {
        renderPane(paneB, paneB.sim.snapshot(), speed);
      }

      updateScoreboard(state, ui);
      // Phase indicator updates at ~15 Hz so it stays readable even
      // when the sim is racing ahead.
      if ((uiFrame += 1) % 4 === 0) {
        updatePhaseIndicator(state, ui);
        updatePhaseProgress(state, ui);
      }
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function renderPane(pane: Pane, snap: Snapshot, speed: number): void {
  const metrics = pane.sim.metrics();
  pane.latestMetrics = metrics;
  for (const key of METRIC_KEYS) {
    const arr = pane.metricHistory[key];
    arr.push(metrics[key]);
    if (arr.length > METRIC_HISTORY_LEN) arr.shift();
  }
  // Evict stale bubbles lazily before handing the map to the renderer.
  const now = performance.now();
  for (const [carId, bubble] of pane.bubbles) {
    if (bubble.expiresAt <= now) pane.bubbles.delete(carId);
  }
  pane.renderer.draw(snap, speed, pane.bubbles);
  // Decay the decision line: past TTL we dim the text instead of
  // clearing it, so compare-mode users can still see the last known
  // assignment while knowing it's stale.
  if (pane.decisionEl.dataset["active"] === "true" && now > pane.decisionExpiresAt) {
    pane.decisionEl.dataset["active"] = "false";
  }
}

/**
 * Translate this frame's raw events into per-car speech-bubble state.
 * Latest event wins — at high speed multipliers a single frame can
 * contain many events per car, and keeping just the last keeps the
 * UI readable without pathologically long message queues.
 *
 * Uses stop name/id lookups from the pane's latest snapshot via
 * [`resolveStopName`]; unresolved stop ids fall back to the numeric
 * id rather than dropping the bubble.
 */
function updateBubbles(pane: Pane, events: BubbleEvent[], snap: Snapshot): void {
  const bornAt = performance.now();
  const stopName = (id: number): string => resolveStopName(snap, id);
  for (const ev of events) {
    const text = bubbleTextFor(ev, stopName);
    if (text === null) continue;
    // Some events are rider-scoped rather than car-scoped (spawn,
    // abandon). bubbleTextFor returns `null` for those, so we only
    // get here when `ev` carries an `elevator` field.
    const carId = (ev as { elevator?: number }).elevator;
    if (carId === undefined) continue;
    const ttl = BUBBLE_TTL_BY_KIND[ev.kind] ?? BUBBLE_TTL_DEFAULT_MS;
    pane.bubbles.set(carId, { text, bornAt, expiresAt: bornAt + ttl });
  }
}

/** Map an event to a short bubble string (icon glyph + phrase), or
 *  `null` when the event has no car to attach to, or when emitting a
 *  bubble for it would add more noise than signal. `elevator-departed`
 *  and `door-closed` are intentionally suppressed because the prior
 *  bubble ("Arrived at X", "Doors open") already narrates the context
 *  and re-firing on closure makes the car feel chatty without adding
 *  information. */
function bubbleTextFor(ev: BubbleEvent, stopName: (id: number) => string): string | null {
  switch (ev.kind) {
    case "elevator-assigned":
      return `\u203a To ${stopName(ev.stop)}`;
    case "elevator-repositioning":
      return `\u21BB Reposition to ${stopName(ev.stop)}`;
    case "elevator-arrived":
      return `\u25cf At ${stopName(ev.stop)}`;
    case "door-opened":
      return "\u25cc Doors open";
    case "rider-boarded":
      return "\u002b Boarding";
    case "rider-exited":
      return `\u2193 Off at ${stopName(ev.stop)}`;
    default:
      return null;
  }
}

/** Look up a stop's human-readable name by `entity_id` from a snapshot,
 *  falling back to the numeric id when the stop isn't in this frame's
 *  snapshot (can happen briefly after a config reset). */
function resolveStopName(snap: Snapshot, stopEntityId: number): string {
  const stop = snap.stops.find((s) => s.entity_id === stopEntityId);
  return stop?.name ?? `stop #${stopEntityId}`;
}

function updateScoreboard(state: State, ui: UiHandles): void {
  const paneA = state.paneA;
  if (!paneA?.latestMetrics) return;
  const paneB = state.paneB;
  if (paneB?.latestMetrics) {
    const compare = diffMetrics(paneA.latestMetrics, paneB.latestMetrics);
    renderMetricRows(paneA.metricsEl, paneA.latestMetrics, compare.a, paneA.metricHistory);
    renderMetricRows(paneB.metricsEl, paneB.latestMetrics, compare.b, paneB.metricHistory);
    renderVerdictRibbon(ui.verdictRibbon, compare.a);
  } else {
    renderMetricRows(paneA.metricsEl, paneA.latestMetrics, null, paneA.metricHistory);
    ui.verdictRibbon.hidden = true;
  }
  updateModeBadge(paneA);
  if (paneB) updateModeBadge(paneB);
}

/**
 * Reflect the pane's current `TrafficMode` onto its header badge. The
 * `data-mode` attribute drives per-mode colour in CSS; textContent is
 * only rewritten when it actually changed so the DOM stays quiet for
 * steady-state frames (keeps devtools' "attribute changed" traces
 * readable during debugging).
 */
function updateModeBadge(pane: Pane): void {
  const mode = pane.sim.trafficMode();
  if (pane.modeEl.dataset["mode"] !== mode) {
    pane.modeEl.dataset["mode"] = mode;
    pane.modeEl.textContent = mode;
  }
}

// ─── Progressive pre-seed ────────────────────────────────────────────

/**
 * Inject a per-frame batch of pre-seed riders. Pumps `drainSpawns`
 * up to `SEED_CALLS_PER_FRAME` times at the driver's 4/60-s dt cap,
 * stopping early when the scenario's quota is met. When the quota
 * drains we re-seat the driver via `configureTraffic` so the
 * scenario's day-cycle clock starts from t=0 on the next frame.
 *
 * Callers must check `state.seeding` before invoking; this function
 * assumes it's non-null. The rider-count check inside the inner loop
 * lets a single `drainSpawns` call emitting multiple specs stop
 * exactly at the quota rather than overshooting.
 */
function drainSeedBatch(state: State): void {
  if (!state.seeding || !state.paneA) return;
  const snap = state.paneA.sim.snapshot();
  const dt = 4 / 60;
  for (let c = 0; c < SEED_CALLS_PER_FRAME && state.seeding.remaining > 0; c++) {
    const specs = state.traffic.drainSpawns(snap, dt);
    for (const spec of specs) {
      forEachPane(state, (pane) => {
        pane.sim.spawnRider(spec.originStopId, spec.destStopId, spec.weight, spec.patienceTicks);
      });
      state.seeding.remaining -= 1;
      if (state.seeding.remaining <= 0) break;
    }
  }
  if (state.seeding.remaining <= 0) {
    configureTraffic(state, scenarioById(state.permalink.scenario));
    state.seeding = null;
  }
}

// ─── Decision narration ──────────────────────────────────────────────

function pushDecision(pane: Pane, ev: BubbleEvent, stopName: (id: number) => string): void {
  if (ev.kind !== "elevator-assigned") return;
  const el = pane.decisionEl;
  const text = `Car ${ev.elevator} \u2192 ${stopName(ev.stop)}`;
  if (el.textContent !== text) el.textContent = text;
  el.dataset["active"] = "true";
  pane.decisionExpiresAt = performance.now() + DECISION_TTL_MS;
  // Retrigger the pulse keyframes by flipping data-pulse in the next
  // frame — clearing synchronously has no effect because the same
  // animation name stays active.
  el.dataset["pulse"] = "false";
  requestAnimationFrame(() => {
    el.dataset["pulse"] = "true";
  });
}

void boot();
