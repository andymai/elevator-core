import { generate as generateRandomWords } from "random-words";
import { CanvasRenderer } from "./canvas";
import { attachHoldToRepeat, el, toast } from "./platform";
import {
  DEFAULT_STATE,
  PARAM_KEYS,
  SCENARIOS,
  applyPhysicsOverrides,
  buildScenarioRon,
  compactOverrides,
  decodePermalink,
  defaultFor,
  encodePermalink,
  hashSeedWord,
  isOverridden,
  resolveParam,
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

const UI_STRATEGIES: StrategyName[] = ["scan", "look", "nearest", "etd", "destination", "rsr"];
const STRATEGY_LABELS: Record<StrategyName, string> = {
  scan: "SCAN",
  look: "LOOK",
  nearest: "NEAREST",
  etd: "ETD",
  destination: "DCS",
  rsr: "RSR",
};

/**
 * One-liners shown under the strategy selector. Tuned to be readable
 * at a glance without jargon while still being specific enough to
 * differentiate the six strategies. The phrasing leads with behavior,
 * not mechanism — a reader new to vertical-transport theory should
 * still come away with a sense of what each controller does.
 */
const STRATEGY_DESCRIPTIONS: Record<StrategyName, string> = {
  scan: "Sweeps end-to-end like a disk head — simple, predictable, ignores who's waiting longest.",
  look: "Like SCAN but reverses early when nothing's queued further — a practical baseline.",
  nearest: "Grabs whichever call is closest right now. Fast under light load, thrashes under rush.",
  etd: "Estimated time of dispatch — assigns calls to whichever car can finish fastest.",
  destination:
    "Destination-control: riders pick their floor at the lobby; the group optimises assignments.",
  rsr: "Relative System Response — a wait-aware variant of ETD that penalises long queues.",
};

const UI_REPOSITION_STRATEGIES: RepositionStrategyName[] = [
  "adaptive",
  "predictive",
  "lobby",
  "spread",
  "none",
];
const REPOSITION_LABELS: Record<RepositionStrategyName, string> = {
  adaptive: "Adaptive",
  predictive: "Predictive",
  lobby: "Lobby",
  spread: "Spread",
  none: "Stay",
};
/**
 * One-liners surfaced in the reposition-strategy popover. Each names
 * *what* an idle car does, not the mechanism — users pick by
 * observable behaviour rather than implementation detail.
 */
const REPOSITION_DESCRIPTIONS: Record<RepositionStrategyName, string> = {
  adaptive:
    "Switches based on traffic — returns to lobby during up-peak, predicts hot floors otherwise. The default.",
  predictive: "Always parks idle cars near whichever floor has seen the most recent arrivals.",
  lobby: "Sends every idle car back to the ground floor to prime the morning-rush pickup.",
  spread: "Keeps idle cars fanned out across the shaft so any floor has a nearby option.",
  none: "Leaves idle cars wherever they finished their last delivery.",
};
const METRIC_HISTORY_LEN = 120;
const COLOR_A = "#7dd3fc";
const COLOR_B = "#fda4af";

/**
 * Keys for the metric strip rows. Kept as a string literal union so
 * `MetricVerdicts` and `Pane.metricHistory` both index the same set
 * and a typo in one spot surfaces at the other.
 */
type MetricKey = "avg_wait_s" | "max_wait_s" | "delivered" | "abandoned" | "utilization";
const METRIC_KEYS: MetricKey[] = [
  "avg_wait_s",
  "max_wait_s",
  "delivered",
  "abandoned",
  "utilization",
];

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

interface TweakRowHandles {
  root: HTMLElement;
  value: HTMLElement;
  defaultV: HTMLElement;
  dec: HTMLButtonElement;
  inc: HTMLButtonElement;
  reset: HTMLButtonElement;
  trackFill: HTMLElement | null;
  trackDefault: HTMLElement | null;
  trackThumb: HTMLElement | null;
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

/**
 * Canonicalise legacy scenario ids through the `scenarioById` fallback
 * so the rest of boot operates on the current canonical id. Strategy is
 * intentionally left alone: on first load we honour whatever the
 * permalink encoded — the snap-to-scenario-default behaviour only
 * fires on an interactive scenario change, not on boot.
 */
function reconcileStrategyWithScenario(p: PermalinkState): void {
  const scenario = scenarioById(p.scenario);
  p.scenario = scenario.id;
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

/**
 * Format a tweak value for the readout. `cars` and `weightCapacity`
 * step in whole units so they read as integers; speed and door cycle
 * use one decimal to match their step sizes.
 */
function formatTweakValue(key: ParamKey, value: number): string {
  switch (key) {
    case "cars":
      return String(Math.round(value));
    case "weightCapacity":
      return String(Math.round(value));
    case "maxSpeed":
    case "doorCycleSec":
      return value.toFixed(1);
  }
}

/**
 * Refresh every drawer row to reflect the current scenario + overrides.
 * Called on boot, on scenario switch, and after each stepper click.
 *
 * Side effects beyond the displayed values:
 *  - Disables `+`/`-` at the slider's bounds so users can't push the
 *    value out of range (defensive — `resolveParam` clamps anyway).
 *  - Toggles the per-row "Reset" button visibility based on whether
 *    the row's value differs from the scenario default.
 *  - Toggles the "Reset all" button visibility based on whether *any*
 *    row is overridden.
 */
function renderTweakPanel(scenario: ScenarioMeta, overrides: Overrides, ui: UiHandles): void {
  let anyOverridden = false;
  for (const key of PARAM_KEYS) {
    const row = ui.tweakRows[key];
    const range = scenario.tweakRanges[key];
    const value = resolveParam(scenario, key, overrides);
    const def = defaultFor(scenario, key);
    const overridden = isOverridden(scenario, key, value);
    if (overridden) anyOverridden = true;
    row.value.textContent = formatTweakValue(key, value);
    row.defaultV.textContent = formatTweakValue(key, def);
    row.dec.disabled = value <= range.min + 1e-9;
    row.inc.disabled = value >= range.max - 1e-9;
    row.root.dataset["overridden"] = String(overridden);
    row.reset.hidden = !overridden;
    // Sync the slider track: fill reflects progress to current value,
    // default mark pins the scenario default, thumb sits on current.
    // Clamped span and guarded against degenerate single-value ranges
    // (e.g. space elevator cars locked at 1..1) so the computed ratios
    // stay finite.
    const span = Math.max(range.max - range.min, 1e-9);
    const pct = Math.max(0, Math.min(1, (value - range.min) / span));
    const defPct = Math.max(0, Math.min(1, (def - range.min) / span));
    if (row.trackFill) row.trackFill.style.width = `${(pct * 100).toFixed(1)}%`;
    if (row.trackThumb) row.trackThumb.style.left = `${(pct * 100).toFixed(1)}%`;
    if (row.trackDefault) row.trackDefault.style.left = `${(defPct * 100).toFixed(1)}%`;
  }
  ui.tweakResetAllBtn.hidden = !anyOverridden;
}

function setTweakOpen(ui: UiHandles, open: boolean): void {
  ui.tweakBtn.setAttribute("aria-expanded", open ? "true" : "false");
  ui.tweakPanel.hidden = !open;
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
  ui.scenarioCards.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest<HTMLElement>(".scenario-card");
    if (!card) return;
    const id = card.dataset["scenarioId"];
    if (!id || id === state.permalink.scenario) return;
    void switchScenario(state, ui, id);
  });
  // Strategy picks reset the whole comparator so both panes stay aligned
  // on the same rider stream from t=0 — mixing pre- and post-change metrics
  // would make the scoreboard misleading.
  attachStrategyPopover(state, ui, ui.paneA);
  attachStrategyPopover(state, ui, ui.paneB);
  attachRepositionPopover(state, ui, ui.paneA);
  attachRepositionPopover(state, ui, ui.paneB);
  refreshStrategyPopovers(state, ui);
  refreshRepositionPopovers(state, ui);
  ui.compareToggle.addEventListener("change", () => {
    state.permalink = { ...state.permalink, compare: ui.compareToggle.checked };
    ui.layout.dataset["mode"] = state.permalink.compare ? "compare" : "single";
    // `also in …` badges depend on compare state, so re-render both
    // dispatch and reposition popovers when the toggle flips.
    refreshStrategyPopovers(state, ui);
    refreshRepositionPopovers(state, ui);
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
      bumpParam(state, ui, key, -1);
    });
    attachHoldToRepeat(row.inc, () => {
      bumpParam(state, ui, key, 1);
    });
    row.reset.addEventListener("click", () => {
      resetParam(state, ui, key);
    });
    // Arrow keys on the focused row nudge the value just like clicking
    // +/-. We gate on exact key so Page/Home/End still reach the
    // scroll-to-section defaults the browser provides.
    row.root.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowUp" || ev.key === "ArrowRight") {
        ev.preventDefault();
        bumpParam(state, ui, key, 1);
      } else if (ev.key === "ArrowDown" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        bumpParam(state, ui, key, -1);
      }
    });
  }
  ui.tweakResetAllBtn.addEventListener("click", () => {
    void resetAllOverrides(state, ui);
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
        void switchScenario(state, ui, scenario.id);
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

function updatePhaseIndicator(state: State, ui: UiHandles): void {
  const el = ui.phaseLabel;
  if (!el) return;
  const next = state.traffic.currentPhaseLabel() || "—";
  if (el.textContent !== next) el.textContent = next;
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

type Verdict = "win" | "lose" | "tie";
type MetricVerdicts = Record<MetricKey, Verdict>;
/**
 * Epsilon-based verdict so two panes that render identical values in the
 * metric strip (e.g. `0.0 s` vs `0.04 s` both display as `0.0 s`) don't
 * flicker between win/lose on floating-point noise. Epsilons match the UI's
 * display precision (`toFixed(1)` for times, `toFixed(0)` on the percent).
 */
function diffMetrics(a: Metrics, b: Metrics): { a: MetricVerdicts; b: MetricVerdicts } {
  const cmp = (
    x: number,
    y: number,
    epsilon: number,
    higherBetter: boolean,
  ): [Verdict, Verdict] => {
    if (Math.abs(x - y) < epsilon) return ["tie", "tie"];
    const aWins = higherBetter ? x > y : x < y;
    return aWins ? ["win", "lose"] : ["lose", "win"];
  };
  const [aw, bw] = cmp(a.avg_wait_s, b.avg_wait_s, 0.05, false);
  const [amx, bmx] = cmp(a.max_wait_s, b.max_wait_s, 0.05, false);
  const [ad, bd] = cmp(a.delivered, b.delivered, 0.5, true);
  const [aab, bab] = cmp(a.abandoned, b.abandoned, 0.5, false);
  const [au, bu] = cmp(a.utilization, b.utilization, 0.005, true);
  return {
    a: { avg_wait_s: aw, max_wait_s: amx, delivered: ad, abandoned: aab, utilization: au },
    b: { avg_wait_s: bw, max_wait_s: bmx, delivered: bd, abandoned: bab, utilization: bu },
  };
}

// Metric row layout: 5 fixed rows, always the same keys in the same order.
// We build the DOM once and mutate text + verdict + sparkline in place
// every frame.
const METRIC_DEFS: Array<[string, MetricKey]> = [
  ["Avg wait", "avg_wait_s"],
  ["Max wait", "max_wait_s"],
  ["Delivered", "delivered"],
  ["Abandoned", "abandoned"],
  ["Utilization", "utilization"],
];

function metricValue(m: Metrics, key: MetricKey): string {
  switch (key) {
    case "avg_wait_s":
      return `${m.avg_wait_s.toFixed(1)} s`;
    case "max_wait_s":
      return `${m.max_wait_s.toFixed(1)} s`;
    case "delivered":
      return String(m.delivered);
    case "abandoned":
      return String(m.abandoned);
    case "utilization":
      return `${(m.utilization * 100).toFixed(0)}%`;
  }
}

function initMetricRows(root: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (const [label] of METRIC_DEFS) {
    const row = el(
      "div",
      "metric-row flex flex-col gap-[3px] px-2.5 py-[7px] bg-surface-elevated border border-stroke-subtle rounded-md transition-colors duration-normal",
    );
    // SVG sparkline lives in the metric row and is mutated in place each
    // frame. Using SVG (not another canvas) keeps it crisp at any DPR
    // and lets CSS drive the stroke color via `currentColor` / the
    // `data-verdict` attribute on the row.
    const spark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    spark.classList.add("metric-spark");
    spark.setAttribute("viewBox", "0 0 100 14");
    spark.setAttribute("preserveAspectRatio", "none");
    spark.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    row.append(
      el(
        "span",
        "text-[9.5px] uppercase tracking-[0.08em] text-content-disabled font-medium",
        label,
      ),
      el("span", "metric-v text-[15px] text-content font-medium [font-feature-settings:'tnum'_1]"),
      spark,
    );
    frag.appendChild(row);
  }
  root.replaceChildren(frag);
}

function renderMetricRows(
  root: HTMLElement,
  m: Metrics,
  verdicts: MetricVerdicts | null,
  history: Record<MetricKey, number[]>,
): void {
  const rows = root.children;
  for (let i = 0; i < METRIC_DEFS.length; i++) {
    const row = rows[i] as HTMLElement | undefined;
    if (!row) continue;
    const def = METRIC_DEFS[i];
    if (!def) continue;
    const key = def[1];
    const verdict = verdicts ? verdicts[key] : "";
    if (row.dataset["verdict"] !== verdict) row.dataset["verdict"] = verdict;
    const vs = row.children[1] as HTMLElement;
    const val = metricValue(m, key);
    if (vs.textContent !== val) vs.textContent = val;
    const spark = row.children[2] as SVGSVGElement;
    const path = spark.firstElementChild as SVGPathElement;
    const d = buildSparklinePath(history[key]);
    if (path.getAttribute("d") !== d) path.setAttribute("d", d);
  }
}

/**
 * Build an SVG path `d` string sampling `values` across a 100×14
 * viewBox. The path uses the last up-to-`METRIC_HISTORY_LEN` samples
 * and auto-scales to the min/max within that window so the trace
 * always fills the vertical range regardless of absolute magnitude.
 * An empty or single-sample window draws a flat baseline.
 */
function buildSparklinePath(values: number[]): string {
  if (values.length < 2) return "M 0 13 L 100 13";
  let min = values[0] ?? 0;
  let max = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (v === undefined) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  const n = values.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 100;
    // Inverted y-axis so higher values sit higher on the chart.
    const y = span > 0 ? 13 - (((values[i] ?? 0) - min) / span) * 12 : 7;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trim();
}

// ─── Tweak panel: state mutation ─────────────────────────────────────

/**
 * Step a single param up or down by its scenario-defined step size,
 * then apply the change. Quietly clamps to the param's range so a
 * disabled +/- button can't be activated via keyboard repeat.
 */
function bumpParam(state: State, ui: UiHandles, key: ParamKey, dir: number): void {
  const scenario = scenarioById(state.permalink.scenario);
  const range = scenario.tweakRanges[key];
  const current = resolveParam(scenario, key, state.permalink.overrides);
  const next = clampToRange(current + dir * range.step, range.min, range.max);
  // Round to a multiple of `step` so the steppers always land on a
  // canonical lattice point — protects against floating-point drift
  // accumulating over repeated clicks.
  const snapped = snapToStep(next, range.min, range.step);
  setOverride(state, ui, scenario, key, snapped);
}

function resetParam(state: State, ui: UiHandles, key: ParamKey): void {
  const scenario = scenarioById(state.permalink.scenario);
  const next = { ...state.permalink.overrides };
  Reflect.deleteProperty(next, key);
  state.permalink = { ...state.permalink, overrides: next };
  // Per-key reset of the live-mutated knobs goes through the same
  // hot-swap path so metrics don't reset; cars-count reset rebuilds.
  if (key === "cars") {
    void resetAll(state, ui);
    toast(ui.toast, "Cars reset");
  } else {
    applyHotSwapAndRender(state, ui, scenario);
    toast(ui.toast, `${labelForKey(key)} reset`);
  }
}

async function resetAllOverrides(state: State, ui: UiHandles): Promise<void> {
  const scenario = scenarioById(state.permalink.scenario);
  const hadCarsOverride = isOverridden(
    scenario,
    "cars",
    resolveParam(scenario, "cars", state.permalink.overrides),
  );
  state.permalink = { ...state.permalink, overrides: {} };
  if (hadCarsOverride) {
    await resetAll(state, ui);
  } else {
    applyHotSwapAndRender(state, ui, scenario);
  }
  toast(ui.toast, "Parameters reset");
}

/**
 * Update one override and apply it: hot-swap for live-mutated keys,
 * full sim rebuild for `cars`. Keeps the in-memory permalink in sync
 * and re-renders the drawer.
 */
function setOverride(
  state: State,
  ui: UiHandles,
  scenario: ScenarioMeta,
  key: ParamKey,
  value: number,
): void {
  const next: Overrides = { ...state.permalink.overrides, [key]: value };
  state.permalink = {
    ...state.permalink,
    overrides: compactOverrides(scenario, next),
  };
  if (key === "cars") {
    void resetAll(state, ui);
  } else {
    applyHotSwapAndRender(state, ui, scenario);
  }
}

/**
 * Push max-speed / capacity / door-cycle into the live sim via the
 * uniform setters and refresh the drawer's display values. Used for
 * every override change *except* cars-count, which needs a full
 * `resetAll`.
 *
 * If the wasm build predates the setters (`applyPhysicsLive` returns
 * `false`), fall back to a sim rebuild — same observable result, just
 * with a metrics reset. This keeps local dev usable when the
 * playground reloads ahead of a fresh `wasm-pack build`.
 */
function applyHotSwapAndRender(state: State, ui: UiHandles, scenario: ScenarioMeta): void {
  const physics = applyPhysicsOverrides(scenario, state.permalink.overrides);
  const params = {
    maxSpeed: physics.maxSpeed,
    weightCapacityKg: physics.weightCapacity,
    doorOpenTicks: physics.doorOpenTicks,
    doorTransitionTicks: physics.doorTransitionTicks,
  };
  const panes = [state.paneA, state.paneB].filter((p): p is Pane => p !== null);
  const allLive = panes.every((pane) => pane.sim.applyPhysicsLive(params));
  renderTweakPanel(scenario, state.permalink.overrides, ui);
  if (!allLive) void resetAll(state, ui);
}

function clampToRange(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Round `v` to the nearest multiple of `step` measured from `min`.
 * Used by `bumpParam` so successive +/- clicks always land on
 * canonical grid values regardless of the starting point.
 */
function snapToStep(v: number, min: number, step: number): number {
  const stepsFromMin = Math.round((v - min) / step);
  return min + stepsFromMin * step;
}

function labelForKey(key: ParamKey): string {
  switch (key) {
    case "cars":
      return "Cars";
    case "maxSpeed":
      return "Max speed";
    case "weightCapacity":
      return "Capacity";
    case "doorCycleSec":
      return "Door cycle";
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

// ─── Scenario cards ──────────────────────────────────────────────────

// Compact pill tabs — used to be full-sized cards with a description
// block; that was ~55 px of vertical chrome. Now a single row of
// short buttons that show the scenario name and a numeric shortcut
// badge. Description is accessible via the `title` tooltip so
// nothing is lost, just de-weighted.
const SCENARIO_CARD_CLS =
  "scenario-card inline-flex items-center gap-1.5 px-2.5 py-1 " +
  "bg-surface-elevated border border-stroke-subtle rounded-md " +
  "text-content-secondary text-[12px] font-medium cursor-pointer " +
  "transition-colors duration-fast select-none whitespace-nowrap " +
  "hover:bg-surface-hover hover:border-stroke " +
  "aria-pressed:bg-accent-muted aria-pressed:text-content " +
  "aria-pressed:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] " +
  "max-md:flex-none max-md:snap-start";
const SCENARIO_KBD_CLS =
  "inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 " +
  "text-[9.5px] font-semibold text-content-disabled bg-surface border border-stroke " +
  "rounded-sm tabular-nums";

function renderScenarioCards(ui: UiHandles): void {
  const frag = document.createDocumentFragment();
  SCENARIOS.forEach((s, i) => {
    const card = el("button", SCENARIO_CARD_CLS);
    card.type = "button";
    card.dataset["scenarioId"] = s.id;
    card.setAttribute("aria-pressed", "false");
    // Description dropped to the native tooltip — compact tabs keep
    // just the label + shortcut key. Users hover (desktop) or long-
    // press (touch) to see the longer description if they want it.
    card.title = s.description;
    card.append(el("span", "", s.label), el("span", SCENARIO_KBD_CLS, String(i + 1)));
    frag.appendChild(card);
  });
  ui.scenarioCards.replaceChildren(frag);
}

function syncScenarioCards(ui: UiHandles, scenarioId: string): void {
  for (const card of ui.scenarioCards.children) {
    const el = card as HTMLElement;
    el.setAttribute("aria-pressed", el.dataset["scenarioId"] === scenarioId ? "true" : "false");
  }
}

/**
 * Shared by keyboard shortcuts and scenario-card clicks so both paths
 * dispatch the same transition.
 *
 * Overrides are cleared on scenario switch — every scenario has a
 * distinct physics envelope (a 0.5 m/s slider makes sense for a
 * residential tower, not for a 50 m/s climber on a tether) so
 * cross-scenario carry-over surprised more than it helped during
 * early prototyping.
 */
function syncSheetCompact(ui: UiHandles, scenarioLabel: string, strategyA: StrategyName): void {
  ui.sheetScenario.textContent = scenarioLabel;
  ui.sheetStrategy.textContent = STRATEGY_LABELS[strategyA];
}

async function switchScenario(state: State, ui: UiHandles, scenarioId: string): Promise<void> {
  const scenario = scenarioById(scenarioId);
  // Snap pane A (and pane B when in single-pane mode) to the
  // scenario's recommended strategy. In compare mode we leave both
  // panes alone so the user's comparison setup survives.
  const nextStrategyA = state.permalink.compare
    ? state.permalink.strategyA
    : scenario.defaultStrategy;
  state.permalink = {
    ...state.permalink,
    scenario: scenario.id,
    strategyA: nextStrategyA,
    overrides: {},
  };
  renderPaneStrategyInfo(ui.paneA, nextStrategyA);
  refreshStrategyPopovers(state, ui);
  syncScenarioCards(ui, scenario.id);
  syncSheetCompact(ui, scenario.label, nextStrategyA);
  await resetAll(state, ui);
  renderTweakPanel(scenario, state.permalink.overrides, ui);
  toast(ui.toast, `${scenario.label} \u00b7 ${STRATEGY_LABELS[nextStrategyA]}`);
}

// ─── Strategy chip + popover ─────────────────────────────────────────

/**
 * Sync a pane's header chip + description subtitle to the given
 * strategy. Used on boot, on scenario switch (pane A), and on each
 * popover pick. The chip's label lives in a nested `#name-*` span so
 * the caret glyph next to it stays untouched.
 */
function renderPaneStrategyInfo(pane: PaneHandles, strategy: StrategyName): void {
  const label = STRATEGY_LABELS[strategy];
  const desc = STRATEGY_DESCRIPTIONS[strategy];
  if (pane.name.textContent !== label) pane.name.textContent = label;
  if (pane.desc.textContent !== desc) pane.desc.textContent = desc;
  pane.trigger.setAttribute("aria-label", `Change dispatch strategy (currently ${label})`);
  pane.trigger.title = desc;
}

/**
 * Sync the reposition chip for a pane. Mirrors
 * `renderPaneStrategyInfo` but writes to the `repo-*` handles so the
 * same chip/popover interaction pattern reuses across both.
 */
function renderPaneRepositionInfo(pane: PaneHandles, reposition: RepositionStrategyName): void {
  const label = REPOSITION_LABELS[reposition];
  const desc = REPOSITION_DESCRIPTIONS[reposition];
  const chipText = `Park: ${label}`;
  if (pane.repoName.textContent !== chipText) pane.repoName.textContent = chipText;
  pane.repoTrigger.setAttribute("aria-label", `Change idle-parking strategy (currently ${label})`);
  pane.repoTrigger.title = desc;
}

/**
 * Build the popover's option list for a pane. Each row renders the
 * strategy label, a one-liner description, and — when compare mode is
 * on — a muted "also in A"/"also in B" tag whenever that strategy is
 * already active on the sibling pane. Shared by both the dispatch and
 * reposition popover renderers via `renderStrategyPopover` /
 * `renderRepositionPopover`.
 */
function renderPopoverOptions<T extends string>(
  container: HTMLElement,
  options: readonly T[],
  labels: Record<T, string>,
  descriptions: Record<T, string>,
  dataKey: string,
  current: T,
  sibling: T | null,
  siblingLabel: "A" | "B",
  onPick: (v: T) => void,
): void {
  const frag = document.createDocumentFragment();
  for (const opt of options) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "strategy-option";
    row.setAttribute("role", "menuitemradio");
    row.setAttribute("aria-checked", opt === current ? "true" : "false");
    row.dataset[dataKey] = opt;

    const header = document.createElement("span");
    header.className = "strategy-option-name";
    const labelSpan = document.createElement("span");
    labelSpan.className = "strategy-option-label";
    labelSpan.textContent = labels[opt];
    header.appendChild(labelSpan);

    if (sibling && opt === sibling) {
      const badge = document.createElement("span");
      badge.className = "strategy-option-sibling";
      badge.textContent = `also in ${siblingLabel}`;
      header.appendChild(badge);
    }

    const desc = document.createElement("span");
    desc.className = "strategy-option-desc";
    desc.textContent = descriptions[opt];

    row.append(header, desc);
    row.addEventListener("click", () => {
      onPick(opt);
    });
    frag.appendChild(row);
  }
  container.replaceChildren(frag);
}

function renderStrategyPopover(
  pane: PaneHandles,
  currentStrategy: StrategyName,
  siblingStrategy: StrategyName | null,
  siblingLabel: "A" | "B",
  onPick: (s: StrategyName) => void,
): void {
  renderPopoverOptions(
    pane.popover,
    UI_STRATEGIES,
    STRATEGY_LABELS,
    STRATEGY_DESCRIPTIONS,
    "strategy",
    currentStrategy,
    siblingStrategy,
    siblingLabel,
    onPick,
  );
}

/** Re-render both pane popovers from current state. Cheap (12 rows). */
function refreshStrategyPopovers(state: State, ui: UiHandles): void {
  const { strategyA, strategyB, compare } = state.permalink;
  renderStrategyPopover(
    ui.paneA,
    strategyA,
    compare ? strategyB : null,
    "B",
    (s) => void pickStrategy(state, ui, "a", s),
  );
  renderStrategyPopover(
    ui.paneB,
    strategyB,
    compare ? strategyA : null,
    "A",
    (s) => void pickStrategy(state, ui, "b", s),
  );
}

function setStrategyPopoverOpen(pane: PaneHandles, open: boolean): void {
  pane.popover.hidden = !open;
  pane.trigger.setAttribute("aria-expanded", String(open));
}

function isAnyStrategyPopoverOpen(ui: UiHandles): boolean {
  return !ui.paneA.popover.hidden || !ui.paneB.popover.hidden;
}

function closeAllStrategyPopovers(ui: UiHandles): void {
  setStrategyPopoverOpen(ui.paneA, false);
  setStrategyPopoverOpen(ui.paneB, false);
}

/**
 * Wire a pane's chip trigger to toggle its popover. Closing the
 * sibling popover on open keeps only one panel visible at a time.
 */
function attachStrategyPopover(state: State, ui: UiHandles, pane: PaneHandles): void {
  pane.trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const willOpen = pane.popover.hidden;
    closeAllPopovers(ui);
    if (willOpen) {
      // Refresh just before opening so (also in A/B) badges reflect
      // the current state even if the sibling just changed strategy.
      refreshStrategyPopovers(state, ui);
      setStrategyPopoverOpen(pane, true);
    }
  });
}

/**
 * Global outside-click listener that dismisses any open strategy
 * popover when the click lands outside both a popover and its
 * trigger. Registered once; both panes share the handler so we
 * don't accidentally leak an open popover when the DOM is rebuilt.
 */
function attachOutsideClickForPopovers(ui: UiHandles): void {
  document.addEventListener("click", (ev) => {
    if (!isAnyStrategyPopoverOpen(ui) && !isAnyRepositionPopoverOpen(ui)) return;
    const target = ev.target;
    if (!(target instanceof Node)) return;
    for (const pane of [ui.paneA, ui.paneB] as const) {
      if (pane.popover.contains(target)) return;
      if (pane.trigger.contains(target)) return;
      if (pane.repoPopover.contains(target)) return;
      if (pane.repoTrigger.contains(target)) return;
    }
    closeAllPopovers(ui);
  });
}

/**
 * Apply a strategy choice from a popover. Noop when the user picks
 * the already-active strategy. Otherwise updates the permalink,
 * refreshes both popovers (so (also in …) badges stay accurate), and
 * triggers `resetAll` so both panes restart on the same rider stream
 * — which is the only way the scoreboard stays apples-to-apples.
 */
async function pickStrategy(
  state: State,
  ui: UiHandles,
  which: "a" | "b",
  strategy: StrategyName,
): Promise<void> {
  const current = which === "a" ? state.permalink.strategyA : state.permalink.strategyB;
  if (current === strategy) {
    closeAllStrategyPopovers(ui);
    return;
  }
  if (which === "a") {
    state.permalink = { ...state.permalink, strategyA: strategy };
    renderPaneStrategyInfo(ui.paneA, strategy);
    syncSheetCompact(ui, scenarioById(state.permalink.scenario).label, strategy);
  } else {
    state.permalink = { ...state.permalink, strategyB: strategy };
    renderPaneStrategyInfo(ui.paneB, strategy);
  }
  refreshStrategyPopovers(state, ui);
  closeAllStrategyPopovers(ui);
  await resetAll(state, ui);
  toast(ui.toast, `${which === "a" ? "A" : "B"}: ${STRATEGY_LABELS[strategy]}`);
}

// ─── Reposition chip + popover ──────────────────────────────────────

function renderRepositionPopover(
  pane: PaneHandles,
  currentReposition: RepositionStrategyName,
  siblingReposition: RepositionStrategyName | null,
  siblingLabel: "A" | "B",
  onPick: (r: RepositionStrategyName) => void,
): void {
  renderPopoverOptions(
    pane.repoPopover,
    UI_REPOSITION_STRATEGIES,
    REPOSITION_LABELS,
    REPOSITION_DESCRIPTIONS,
    "reposition",
    currentReposition,
    siblingReposition,
    siblingLabel,
    onPick,
  );
}

function refreshRepositionPopovers(state: State, ui: UiHandles): void {
  const { repositionA, repositionB, compare } = state.permalink;
  renderRepositionPopover(
    ui.paneA,
    repositionA,
    compare ? repositionB : null,
    "B",
    (r) => void pickReposition(state, ui, "a", r),
  );
  renderRepositionPopover(
    ui.paneB,
    repositionB,
    compare ? repositionA : null,
    "A",
    (r) => void pickReposition(state, ui, "b", r),
  );
}

function setRepositionPopoverOpen(pane: PaneHandles, open: boolean): void {
  pane.repoPopover.hidden = !open;
  pane.repoTrigger.setAttribute("aria-expanded", String(open));
}

function isAnyRepositionPopoverOpen(ui: UiHandles): boolean {
  return !ui.paneA.repoPopover.hidden || !ui.paneB.repoPopover.hidden;
}

function closeAllRepositionPopovers(ui: UiHandles): void {
  setRepositionPopoverOpen(ui.paneA, false);
  setRepositionPopoverOpen(ui.paneB, false);
}

/** Close any popover (dispatch or reposition) on any pane. */
function closeAllPopovers(ui: UiHandles): void {
  closeAllStrategyPopovers(ui);
  closeAllRepositionPopovers(ui);
}

function attachRepositionPopover(state: State, ui: UiHandles, pane: PaneHandles): void {
  pane.repoTrigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const willOpen = pane.repoPopover.hidden;
    closeAllPopovers(ui);
    if (willOpen) {
      refreshRepositionPopovers(state, ui);
      setRepositionPopoverOpen(pane, true);
    }
  });
}

async function pickReposition(
  state: State,
  ui: UiHandles,
  which: "a" | "b",
  reposition: RepositionStrategyName,
): Promise<void> {
  const current = which === "a" ? state.permalink.repositionA : state.permalink.repositionB;
  if (current === reposition) {
    closeAllRepositionPopovers(ui);
    return;
  }
  if (which === "a") {
    state.permalink = { ...state.permalink, repositionA: reposition };
    renderPaneRepositionInfo(ui.paneA, reposition);
  } else {
    state.permalink = { ...state.permalink, repositionB: reposition };
    renderPaneRepositionInfo(ui.paneB, reposition);
  }
  refreshRepositionPopovers(state, ui);
  closeAllRepositionPopovers(ui);
  await resetAll(state, ui);
  toast(ui.toast, `${which === "a" ? "A" : "B"} park: ${REPOSITION_LABELS[reposition]}`);
}

// ─── Verdict ribbon ──────────────────────────────────────────────────

function renderVerdictRibbon(root: HTMLElement, verdictsA: MetricVerdicts): void {
  if (root.childElementCount === 0) {
    root.appendChild(
      el(
        "span",
        "text-[10.5px] uppercase tracking-[0.08em] text-content-disabled font-medium whitespace-nowrap max-md:col-span-full",
        "Who's winning?",
      ),
    );
    for (const [label] of METRIC_DEFS) {
      // `.verdict-cell` stays — CSS keys the winner-color cascade off its
      // `[data-winner]` attribute. `.verdict-cell-winner` also stays — it's
      // the child that cascade colors.
      const cell = el(
        "div",
        "verdict-cell flex items-center gap-1.5 px-2 py-1 rounded-sm bg-surface-elevated border border-stroke-subtle tabular-nums overflow-hidden",
      );
      cell.append(
        el("span", "text-[10.5px] uppercase tracking-[0.06em] text-content-disabled", label),
        el("span", "verdict-cell-winner font-semibold text-content tracking-[0.02em]"),
      );
      root.appendChild(cell);
    }
  }
  root.hidden = false;
  for (let i = 0; i < METRIC_DEFS.length; i++) {
    const cell = root.children[i + 1] as HTMLElement | undefined;
    if (!cell) continue;
    const def = METRIC_DEFS[i];
    if (!def) continue;
    const key = def[1];
    const { winner, text } = verdictToWinner(verdictsA[key]);
    if (cell.dataset["winner"] !== winner) cell.dataset["winner"] = winner;
    const winnerEl = cell.lastElementChild as HTMLElement;
    if (winnerEl.textContent !== text) winnerEl.textContent = text;
  }
}

function verdictToWinner(v: Verdict): { winner: "A" | "B" | "tie"; text: string } {
  switch (v) {
    case "win":
      return { winner: "A", text: "A" };
    case "lose":
      return { winner: "B", text: "B" };
    case "tie":
      return { winner: "tie", text: "Tie" };
  }
}

// ─── Phase progress ──────────────────────────────────────────────────

function updatePhaseProgress(state: State, ui: UiHandles): void {
  if (!ui.phaseProgress) return;
  const pct = Math.round(state.traffic.progressInPhase() * 1000) / 10;
  const next = `${pct}%`;
  if (ui.phaseProgress.style.width !== next) ui.phaseProgress.style.width = next;
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

// ─── Shortcut sheet ──────────────────────────────────────────────────

function setShortcutSheetOpen(ui: UiHandles, open: boolean): void {
  const wasOpen = !ui.shortcutSheet.hidden;
  if (open === wasOpen) return;
  ui.shortcutSheet.hidden = !open;
  // Focus management — the sheet is modal-like but not a real <dialog>,
  // so we shuttle focus manually. Opening moves focus into the sheet
  // (so Escape / Tab land predictably); closing returns focus to the
  // trigger so keyboard flow doesn't snap back to <body>.
  if (open) {
    ui.shortcutSheetClose.focus();
  } else {
    ui.shortcutsBtn.focus();
  }
}

void boot();
