import { CanvasRenderer } from "./canvas";
import {
  PARAM_KEYS,
  applyPhysicsOverrides,
  buildScenarioRon,
  compactOverrides,
  defaultFor,
  isOverridden,
  resolveParam,
  type Overrides,
  type ParamKey,
} from "./params";
import { DEFAULT_STATE, decodePermalink, encodePermalink, type PermalinkState } from "./permalink";
import { SCENARIOS, scenarioById } from "./scenarios";
import { Sim } from "./sim";
import { TrafficDriver } from "./traffic";
import type {
  BubbleEvent,
  CarBubble,
  Metrics,
  ScenarioMeta,
  Snapshot,
  StrategyName,
} from "./types";

// The playground is a side-by-side comparator: up to two sims run the same
// rider stream under different dispatch strategies. In single mode only
// pane A is visible. A lightweight scoreboard highlights which strategy is
// winning on each live metric.

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
  destination: "Destination-control: riders pick their floor at the lobby; the group optimises assignments.",
  rsr: "Relative System Response — a wait-aware variant of ETD that penalises long queues.",
};
const WAIT_HISTORY_LEN = 120;
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
  waitHistory: number[];
  /**
   * Rolling per-metric history for inline sparklines. Matches the
   * wait-history length so every row's trace covers the same window.
   * Keys mirror `MetricVerdicts`; we keep raw numbers and do the chart
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
}

interface PaneHandles {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  name: HTMLElement;
  mode: HTMLElement;
  decision: HTMLElement;
  metrics: HTMLElement;
  accent: string;
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
  strategyASelect: HTMLSelectElement;
  strategyBSelect: HTMLSelectElement;
  strategyDesc: HTMLElement;
  compareToggle: HTMLInputElement;
  strategyBWrap: HTMLElement;
  seedInput: HTMLInputElement;
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
  featureHint: HTMLElement | null;
  phaseProgress: HTMLElement | null;
  verdictRibbon: HTMLElement;
  shortcutsBtn: HTMLButtonElement;
  shortcutSheet: HTMLElement;
  shortcutSheetClose: HTMLButtonElement;
  paneA: PaneHandles;
  paneB: PaneHandles;
}

async function boot(): Promise<void> {
  const ui = wireUi();
  const permalink = { ...DEFAULT_STATE, ...decodePermalink(window.location.search) };
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
    traffic: new TrafficDriver(permalink.seed),
    lastFrameTime: performance.now(),
    initToken: 0,
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
  const q = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`missing element #${id}`);
    return el as T;
  };
  const qOpt = <T extends HTMLElement>(id: string): T | null =>
    (document.getElementById(id) as T | null) ?? null;
  const paneHandles = (suffix: "a" | "b", accent: string): PaneHandles => ({
    root: q(`pane-${suffix}`),
    canvas: q<HTMLCanvasElement>(`shaft-${suffix}`),
    name: q(`name-${suffix}`),
    mode: q(`mode-${suffix}`),
    decision: q(`decision-${suffix}`),
    metrics: q(`metrics-${suffix}`),
    accent,
  });
  const tweakRow = (key: ParamKey): TweakRowHandles => {
    const root = document.querySelector<HTMLElement>(`.tweak-row[data-key="${key}"]`);
    if (!root) throw new Error(`missing tweak row for ${key}`);
    const get = <T extends HTMLElement>(sel: string): T => {
      const el = root.querySelector<T>(sel);
      if (!el) throw new Error(`missing ${sel} in tweak row ${key}`);
      return el;
    };
    const getOpt = <T extends HTMLElement>(sel: string): T | null =>
      root.querySelector<T>(sel) ?? null;
    return {
      root,
      value: get<HTMLElement>(".tweak-value"),
      defaultV: get<HTMLElement>(".tweak-default-v"),
      dec: get<HTMLButtonElement>(".tweak-dec"),
      inc: get<HTMLButtonElement>(".tweak-inc"),
      reset: get<HTMLButtonElement>(".tweak-reset"),
      trackFill: getOpt<HTMLElement>(".tweak-track-fill"),
      trackDefault: getOpt<HTMLElement>(".tweak-track-default"),
      trackThumb: getOpt<HTMLElement>(".tweak-track-thumb"),
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
    strategyASelect: q<HTMLSelectElement>("strategy-a"),
    strategyBSelect: q<HTMLSelectElement>("strategy-b"),
    strategyDesc: q("strategy-desc"),
    compareToggle: q<HTMLInputElement>("compare"),
    strategyBWrap: q("strategy-b-wrap"),
    seedInput: q<HTMLInputElement>("seed"),
    speedInput: q<HTMLInputElement>("speed"),
    speedLabel: q("speed-label"),
    intensityInput: q<HTMLInputElement>("traffic"),
    intensityLabel: q("traffic-label"),
    playBtn: q<HTMLButtonElement>("play"),
    resetBtn: q<HTMLButtonElement>("reset"),
    shareBtn: q<HTMLButtonElement>("share"),
    tweakBtn: q<HTMLButtonElement>("tweak"),
    tweakPanel: q("tweak-panel"),
    tweakResetAllBtn: q<HTMLButtonElement>("tweak-reset-all"),
    tweakRows,
    layout: q("layout"),
    loader: q("loader"),
    toast: q("toast"),
    phaseLabel: qOpt("phase-label"),
    featureHint: qOpt("feature-hint"),
    phaseProgress: qOpt("phase-progress-fill"),
    verdictRibbon: q("verdict-ribbon"),
    shortcutsBtn: q<HTMLButtonElement>("shortcuts"),
    shortcutSheet: q("shortcut-sheet"),
    shortcutSheetClose: q<HTMLButtonElement>("shortcut-sheet-close"),
    paneA: paneHandles("a", COLOR_A),
    paneB: paneHandles("b", COLOR_B),
  };

  renderScenarioCards(ui);
  for (const name of UI_STRATEGIES) {
    for (const select of [ui.strategyASelect, ui.strategyBSelect]) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = STRATEGY_LABELS[name];
      select.appendChild(opt);
    }
  }

  return ui;
}

function applyPermalinkToUi(p: PermalinkState, ui: UiHandles): void {
  ui.strategyASelect.value = p.strategyA;
  ui.strategyBSelect.value = p.strategyB;
  ui.compareToggle.checked = p.compare;
  ui.strategyBWrap.classList.toggle("hidden", !p.compare);
  ui.layout.dataset.mode = p.compare ? "compare" : "single";
  ui.seedInput.value = String(p.seed);
  ui.speedInput.value = String(p.speed);
  ui.speedLabel.textContent = speedLabel(p.speed);
  ui.intensityInput.value = String(p.intensity);
  ui.intensityLabel.textContent = intensityLabel(p.intensity);
  renderStrategyDesc(ui, p.strategyA);
  syncScenarioCards(ui, p.scenario);
  const scenario = scenarioById(p.scenario);
  if (ui.featureHint) ui.featureHint.textContent = scenario.featureHint;
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
function renderTweakPanel(
  scenario: ScenarioMeta,
  overrides: Overrides,
  ui: UiHandles,
): void {
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
    row.root.dataset.overridden = String(overridden);
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
    if (row.trackDefault)
      row.trackDefault.style.left = `${(defPct * 100).toFixed(1)}%`;
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
  const sim = await Sim.create(ron, strategy);
  const renderer = new CanvasRenderer(handles.canvas, handles.accent);
  handles.name.textContent = STRATEGY_LABELS[strategy];
  initMetricRows(handles.metrics);
  handles.decision.textContent = "";
  handles.decision.dataset.active = "false";
  handles.decision.dataset.pulse = "false";
  return {
    strategy,
    sim,
    renderer,
    metricsEl: handles.metrics,
    modeEl: handles.mode,
    decisionEl: handles.decision,
    waitHistory: [],
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
  state.traffic = new TrafficDriver(state.permalink.seed);
  configureTraffic(state, scenario);
  // Tear the old panes down *before* building new ones so the freed wasm
  // memory is released before we allocate the replacements.
  disposePane(state.paneA);
  disposePane(state.paneB);
  state.paneA = null;
  state.paneB = null;
  try {
    const paneA = await makePane(
      ui.paneA,
      state.permalink.strategyA,
      scenario,
      state.permalink.overrides,
    );
    if (token !== state.initToken) {
      disposePane(paneA);
      return;
    }
    state.paneA = paneA;
    if (state.permalink.compare) {
      const paneB = await makePane(
        ui.paneB,
        state.permalink.strategyB,
        scenario,
        state.permalink.overrides,
      );
      if (token !== state.initToken) {
        disposePane(paneB);
        return;
      }
      state.paneB = paneB;
    }
    // Seed pre-loaded spawns (convention scenario) once both panes are
    // live so the injection is apples-to-apples across compared sims.
    // `drainSpawns` internally caps dt to 4/60 s so we pump it at that
    // cap until cumulative emission reaches the target. The driver
    // advances its internal cycle clock while pumping, so we reconfigure
    // it afterwards — otherwise a big seed would eat into the opening
    // phase before the user sees a single real frame.
    if (scenario.seedSpawns > 0) {
      const snapForSeed = state.paneA.sim.snapshot();
      const dtPerCall = 4 / 60;
      let emitted = 0;
      // Hard cap on iterations — if the scenario has a zero-rate
      // current phase or no addressable stops, drainSpawns will
      // return empty forever and we must bail instead of spinning.
      const maxCalls = 10000;
      for (let i = 0; i < maxCalls && emitted < scenario.seedSpawns; i += 1) {
        const specs = state.traffic.drainSpawns(snapForSeed, dtPerCall);
        if (specs.length === 0) break;
        for (const spec of specs) {
          forEachPane(state, (pane) =>
            pane.sim.spawnRider(
              spec.originStopId,
              spec.destStopId,
              spec.weight,
              spec.patienceTicks,
            ),
          );
          emitted += 1;
          if (emitted >= scenario.seedSpawns) break;
        }
      }
      configureTraffic(state, scenario);
    }
    if (ui.featureHint) ui.featureHint.textContent = scenario.featureHint;
    updatePhaseIndicator(state, ui);
    renderTweakPanel(scenario, state.permalink.overrides, ui);
  } catch (err) {
    if (token === state.initToken) {
      toast(ui, `Init failed: ${(err as Error).message}`);
    }
    throw err;
  } finally {
    if (token === state.initToken) {
      ui.loader.classList.remove("show");
    }
  }
}

function attachListeners(state: State, ui: UiHandles): void {
  ui.scenarioCards.addEventListener("click", async (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest<HTMLElement>(".scenario-card");
    if (!card) return;
    const id = card.dataset.scenarioId;
    if (!id || id === state.permalink.scenario) return;
    await switchScenario(state, ui, id);
  });
  // Strategy changes reset the whole comparator so both panes stay aligned
  // on the same rider stream from t=0 — mixing pre- and post-change metrics
  // would make the scoreboard misleading.
  ui.strategyASelect.addEventListener("change", async () => {
    const strategyA = ui.strategyASelect.value as StrategyName;
    state.permalink = { ...state.permalink, strategyA };
    renderStrategyDesc(ui, strategyA);
    await resetAll(state, ui);
    toast(ui, `A: ${STRATEGY_LABELS[state.permalink.strategyA]}`);
  });
  ui.strategyBSelect.addEventListener("change", async () => {
    state.permalink = {
      ...state.permalink,
      strategyB: ui.strategyBSelect.value as StrategyName,
    };
    if (state.permalink.compare) {
      await resetAll(state, ui);
      toast(ui, `B: ${STRATEGY_LABELS[state.permalink.strategyB]}`);
    }
  });
  ui.compareToggle.addEventListener("change", async () => {
    state.permalink = { ...state.permalink, compare: ui.compareToggle.checked };
    ui.strategyBWrap.classList.toggle("hidden", !state.permalink.compare);
    ui.layout.dataset.mode = state.permalink.compare ? "compare" : "single";
    await resetAll(state, ui);
    toast(ui, state.permalink.compare ? "Compare on" : "Compare off");
  });
  ui.seedInput.addEventListener("change", async () => {
    const seed = Number(ui.seedInput.value);
    if (!Number.isFinite(seed)) return;
    state.permalink = { ...state.permalink, seed };
    await resetAll(state, ui);
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
  });
  ui.resetBtn.addEventListener("click", () => {
    void resetAll(state, ui);
    toast(ui, "Reset");
  });

  // ── Tweak panel ──────────────────────────────────────────────────
  ui.tweakBtn.addEventListener("click", () => {
    const open = ui.tweakBtn.getAttribute("aria-expanded") !== "true";
    setTweakOpen(ui, open);
  });
  for (const key of PARAM_KEYS) {
    const row = ui.tweakRows[key];
    attachHoldToRepeat(row.dec, () => bumpParam(state, ui, key, -1));
    attachHoldToRepeat(row.inc, () => bumpParam(state, ui, key, +1));
    row.reset.addEventListener("click", () => resetParam(state, ui, key));
    // Arrow keys on the focused row nudge the value just like clicking
    // +/-. We gate on exact key so Page/Home/End still reach the
    // scroll-to-section defaults the browser provides.
    row.root.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowUp" || ev.key === "ArrowRight") {
        ev.preventDefault();
        bumpParam(state, ui, key, +1);
      } else if (ev.key === "ArrowDown" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        bumpParam(state, ui, key, -1);
      }
    });
  }
  ui.tweakResetAllBtn.addEventListener("click", () => {
    void resetAllOverrides(state, ui);
  });
  ui.shareBtn.addEventListener("click", async () => {
    const qs = encodePermalink(state.permalink);
    const url = `${window.location.origin}${window.location.pathname}${qs}`;
    window.history.replaceState(null, "", qs);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast(ui, "Permalink copied");
  });

  // ── Shortcut sheet + global keys ─────────────────────────────────
  ui.shortcutsBtn.addEventListener("click", () =>
    setShortcutSheetOpen(ui, ui.shortcutSheet.hidden),
  );
  ui.shortcutSheetClose.addEventListener("click", () => setShortcutSheetOpen(ui, false));
  ui.shortcutSheet.addEventListener("click", (ev) => {
    // Click on the dim backdrop closes the sheet; clicks inside
    // `.shortcut-sheet-inner` bubble through unless stopped.
    if (ev.target === ui.shortcutSheet) setShortcutSheetOpen(ui, false);
  });
  attachKeyboardShortcuts(state, ui);
}

/**
 * Install a pointer+repeat binding on a stepper button. First press
 * fires immediately; holding past `initialDelay` starts a steady
 * `interval` repeat. We stop on any `pointerup`/`pointerleave`/blur so
 * the repeat can't outlive the press. The original click handler is
 * *not* registered — this function replaces it.
 */
function attachHoldToRepeat(btn: HTMLButtonElement, fn: () => void): void {
  const initialDelay = 380;
  const interval = 70;
  let timer = 0;
  let repeat = 0;
  const stop = (): void => {
    if (timer) window.clearTimeout(timer);
    if (repeat) window.clearInterval(repeat);
    timer = 0;
    repeat = 0;
  };
  btn.addEventListener("pointerdown", (ev) => {
    if (btn.disabled) return;
    ev.preventDefault();
    fn();
    timer = window.setTimeout(() => {
      repeat = window.setInterval(() => {
        if (btn.disabled) {
          stop();
          return;
        }
        fn();
      }, interval);
    }, initialDelay);
  });
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("blur", stop);
  // Keyboard activation (Enter / Space) still fires a normal click;
  // register a click listener so that path works too. Using pointer-
  // based press detection means the click event would otherwise fire
  // a second time after pointerup — guarded by checking whether the
  // pointer sequence already fired.
  btn.addEventListener("click", (ev) => {
    if ((ev as PointerEvent).pointerType) return;
    fn();
  });
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
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
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

    if (state.running && state.ready && state.paneA) {
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

      const snapA = state.paneA.sim.snapshot();
      // Fan-out spawns to both sims so the comparison is apples-to-apples.
      // `elapsed` is wall-clock; scaling by `ticks` keeps the sim-time
      // budget the driver operates on in lockstep with the actual
      // simulation advance.
      const simElapsed = elapsed * ticks;
      const specs = state.traffic.drainSpawns(snapA, simElapsed);
      for (const spec of specs) {
        forEachPane(state, (pane) =>
          pane.sim.spawnRider(
            spec.originStopId,
            spec.destStopId,
            spec.weight,
            spec.patienceTicks,
          ),
        );
      }

      // Re-snapshot each pane post-spawn so waiting dots reflect the new riders.
      const speed = state.permalink.speed;
      renderPane(state.paneA, state.paneA.sim.snapshot(), speed);
      if (state.paneB) {
        renderPane(state.paneB, state.paneB.sim.snapshot(), speed);
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
  pane.waitHistory.push(metrics.avg_wait_s);
  if (pane.waitHistory.length > WAIT_HISTORY_LEN) pane.waitHistory.shift();
  for (const key of METRIC_KEYS) {
    const arr = pane.metricHistory[key];
    arr.push(metrics[key]);
    if (arr.length > WAIT_HISTORY_LEN) arr.shift();
  }
  // Evict stale bubbles lazily before handing the map to the renderer.
  const now = performance.now();
  for (const [carId, bubble] of pane.bubbles) {
    if (bubble.expiresAt <= now) pane.bubbles.delete(carId);
  }
  pane.renderer.draw(snap, pane.waitHistory, speed, pane.bubbles);
  // Decay the decision line: past TTL we dim the text instead of
  // clearing it, so compare-mode users can still see the last known
  // assignment while knowing it's stale.
  if (pane.decisionEl.dataset.active === "true" && now > pane.decisionExpiresAt) {
    pane.decisionEl.dataset.active = "false";
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
  if (pane.modeEl.dataset.mode !== mode) {
    pane.modeEl.dataset.mode = mode;
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

/** Build an HTML element with a className and optional text in one call. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function initMetricRows(root: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (const [label] of METRIC_DEFS) {
    const row = el("div", "metric-row");
    // SVG sparkline lives in the metric row and is mutated in place each
    // frame. Using SVG (not another canvas) keeps it crisp at any DPR
    // and lets CSS drive the stroke color via `currentColor` / the
    // `data-verdict` attribute on the row.
    const spark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    spark.classList.add("metric-spark");
    spark.setAttribute("viewBox", "0 0 100 14");
    spark.setAttribute("preserveAspectRatio", "none");
    spark.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    row.append(el("span", "metric-k", label), el("span", "metric-v"), spark);
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
    const row = rows[i] as HTMLElement;
    const key = METRIC_DEFS[i][1];
    const verdict = verdicts ? verdicts[key] : "";
    if (row.dataset.verdict !== verdict) row.dataset.verdict = verdict;
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
 * viewBox. The path uses the last up-to-`WAIT_HISTORY_LEN` samples
 * and auto-scales to the min/max within that window so the trace
 * always fills the vertical range regardless of absolute magnitude.
 * An empty or single-sample window draws a flat baseline.
 */
function buildSparklinePath(values: number[]): string {
  if (values.length < 2) return "M 0 13 L 100 13";
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  const n = values.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 100;
    // Inverted y-axis so higher values sit higher on the chart.
    const y = span > 0 ? 13 - ((values[i] - min) / span) * 12 : 7;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trim();
}

let toastTimer = 0;
function toast(ui: UiHandles, msg: string): void {
  ui.toast.textContent = msg;
  ui.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 1600);
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
  delete next[key];
  state.permalink = { ...state.permalink, overrides: next };
  // Per-key reset of the live-mutated knobs goes through the same
  // hot-swap path so metrics don't reset; cars-count reset rebuilds.
  if (key === "cars") {
    void resetAll(state, ui);
    toast(ui, "Cars reset");
  } else {
    applyHotSwapAndRender(state, ui, scenario);
    toast(ui, `${labelForKey(key)} reset`);
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
  toast(ui, "Parameters reset");
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
function applyHotSwapAndRender(
  state: State,
  ui: UiHandles,
  scenario: ScenarioMeta,
): void {
  const physics = applyPhysicsOverrides(scenario, state.permalink.overrides);
  const params = {
    maxSpeed: physics.maxSpeed,
    weightCapacityKg: physics.weightCapacity,
    doorOpenTicks: physics.doorOpenTicks,
    doorTransitionTicks: physics.doorTransitionTicks,
  };
  let allLive = true;
  forEachPane(state, (pane) => {
    if (!pane.sim.applyPhysicsLive(params)) allLive = false;
  });
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

// ─── Scenario cards ──────────────────────────────────────────────────

function renderScenarioCards(ui: UiHandles): void {
  const frag = document.createDocumentFragment();
  SCENARIOS.forEach((s, i) => {
    const card = el("button", "scenario-card");
    card.type = "button";
    card.dataset.scenarioId = s.id;
    card.setAttribute("aria-pressed", "false");
    const label = el("span", "scenario-card-label");
    label.append(
      el("span", "", s.label),
      el("span", "scenario-card-kbd", String(i + 1)),
    );
    card.append(
      label,
      el("span", "scenario-card-desc", s.description),
      el("span", "scenario-card-hint", s.featureHint),
    );
    frag.appendChild(card);
  });
  ui.scenarioCards.replaceChildren(frag);
}

function syncScenarioCards(ui: UiHandles, scenarioId: string): void {
  for (const card of ui.scenarioCards.children) {
    const el = card as HTMLElement;
    el.setAttribute(
      "aria-pressed",
      el.dataset.scenarioId === scenarioId ? "true" : "false",
    );
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
async function switchScenario(
  state: State,
  ui: UiHandles,
  scenarioId: string,
): Promise<void> {
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
  ui.strategyASelect.value = nextStrategyA;
  renderStrategyDesc(ui, nextStrategyA);
  syncScenarioCards(ui, scenario.id);
  await resetAll(state, ui);
  renderTweakPanel(scenario, state.permalink.overrides, ui);
  toast(ui, `${scenario.label} · ${STRATEGY_LABELS[nextStrategyA]}`);
}

// ─── Strategy description ────────────────────────────────────────────

function renderStrategyDesc(ui: UiHandles, strategy: StrategyName): void {
  ui.strategyDesc.textContent = STRATEGY_DESCRIPTIONS[strategy];
}

// ─── Verdict ribbon ──────────────────────────────────────────────────

function renderVerdictRibbon(root: HTMLElement, verdictsA: MetricVerdicts): void {
  if (root.childElementCount === 0) {
    root.appendChild(el("span", "verdict-ribbon-title", "Who's winning?"));
    for (const [label] of METRIC_DEFS) {
      const cell = el("div", "verdict-cell");
      cell.append(
        el("span", "verdict-cell-k", label),
        el("span", "verdict-cell-winner"),
      );
      root.appendChild(cell);
    }
  }
  root.hidden = false;
  for (let i = 0; i < METRIC_DEFS.length; i++) {
    const cell = root.children[i + 1] as HTMLElement;
    const key = METRIC_DEFS[i][1];
    const { winner, text } = verdictToWinner(verdictsA[key]);
    if (cell.dataset.winner !== winner) cell.dataset.winner = winner;
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
  el.dataset.active = "true";
  pane.decisionExpiresAt = performance.now() + DECISION_TTL_MS;
  // Retrigger the pulse keyframes by flipping data-pulse in the next
  // frame — clearing synchronously has no effect because the same
  // animation name stays active.
  el.dataset.pulse = "false";
  requestAnimationFrame(() => {
    el.dataset.pulse = "true";
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
