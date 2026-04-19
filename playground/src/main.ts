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
const WAIT_HISTORY_LEN = 120;
const COLOR_A = "#7dd3fc";
const COLOR_B = "#fda4af";

const speedLabel = (v: number): string => `${v}\u00d7`;
const intensityLabel = (v: number): string => `${v.toFixed(1)}\u00d7`;

interface Pane {
  strategy: StrategyName;
  sim: Sim;
  renderer: CanvasRenderer;
  metricsEl: HTMLElement;
  waitHistory: number[];
  latestMetrics: Metrics | null;
  /**
   * Per-car speech bubbles. Keyed by car entity id. Each entry fades
   * after [`BUBBLE_TTL_MS`] wall-clock milliseconds; stale entries are
   * evicted lazily in [`updateBubbles`] so the map never grows past
   * `cars × 1`.
   */
  bubbles: Map<number, CarBubble>;
}

/**
 * How long a speech bubble lingers after its triggering event, in
 * wall-clock milliseconds. Chosen so that under 1× playback the bubble
 * reads comfortably; at 16× it's short enough that stale events don't
 * linger past the action they describe.
 */
const BUBBLE_TTL_MS = 1400;

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
}

interface UiHandles {
  scenarioSelect: HTMLSelectElement;
  strategyASelect: HTMLSelectElement;
  strategyBSelect: HTMLSelectElement;
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
  loop(state);
}

/**
 * Canonicalise legacy scenario ids (e.g. `"office-5"`) through the
 * `scenarioById` fallback so the rest of boot operates on the current
 * canonical id. Strategy is intentionally left alone: on first load
 * we honour whatever the permalink encoded — the snap-to-scenario-default
 * behavior only fires on an interactive scenario change, not on boot.
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
    return {
      root,
      value: get<HTMLElement>(".tweak-value"),
      defaultV: get<HTMLElement>(".tweak-default-v"),
      dec: get<HTMLButtonElement>(".tweak-dec"),
      inc: get<HTMLButtonElement>(".tweak-inc"),
      reset: get<HTMLButtonElement>(".tweak-reset"),
    };
  };
  const tweakRows: Record<ParamKey, TweakRowHandles> = {
    cars: tweakRow("cars"),
    maxSpeed: tweakRow("maxSpeed"),
    weightCapacity: tweakRow("weightCapacity"),
    doorCycleSec: tweakRow("doorCycleSec"),
  };
  const ui: UiHandles = {
    scenarioSelect: q<HTMLSelectElement>("scenario"),
    strategyASelect: q<HTMLSelectElement>("strategy-a"),
    strategyBSelect: q<HTMLSelectElement>("strategy-b"),
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
    paneA: paneHandles("a", COLOR_A),
    paneB: paneHandles("b", COLOR_B),
  };

  for (const s of SCENARIOS) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    opt.title = s.description;
    ui.scenarioSelect.appendChild(opt);
  }
  for (const name of UI_STRATEGIES) {
    for (const select of [ui.strategyASelect, ui.strategyBSelect]) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = STRATEGY_LABELS[name];
      select.appendChild(opt);
    }
  }

  // Rewire the intensity slider now that the semantics changed from
  // "absolute riders/min" to "0.5x–2x multiplier". Driven here rather
  // than in HTML so permalinks with stale `t=` values still land in
  // the new range.
  ui.intensityInput.min = "0.5";
  ui.intensityInput.max = "2";
  ui.intensityInput.step = "0.1";

  return ui;
}

function applyPermalinkToUi(p: PermalinkState, ui: UiHandles): void {
  ui.scenarioSelect.value = p.scenario;
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
  // Apply the scenario's commercial-feature hook once on load. The
  // user can still swap strategies afterwards; the hook's effects
  // stick only as long as the strategy it tuned remains active.
  sim.applyHook(scenario.hook);
  const renderer = new CanvasRenderer(handles.canvas, handles.accent);
  handles.name.textContent = STRATEGY_LABELS[strategy];
  initMetricRows(handles.metrics);
  return {
    strategy,
    sim,
    renderer,
    metricsEl: handles.metrics,
    waitHistory: [],
    latestMetrics: null,
    bubbles: new Map(),
  };
}

async function resetAll(state: State, ui: UiHandles): Promise<void> {
  const token = ++state.initToken;
  ui.loader.classList.add("show");
  const scenario = scenarioById(state.permalink.scenario);
  // Swap in the fresh TrafficDriver *before* creating panes. If paneB
  // construction throws after paneA was installed, the surviving paneA
  // must see the reset seed — not the previous driver's accumulator.
  state.traffic = new TrafficDriver(state.permalink.seed);
  state.traffic.setPhases(scenario.phases);
  state.traffic.setIntensity(state.permalink.intensity);
  // Scenario-level abandonment — converted from seconds to ticks using
  // the sim's 60 Hz canonical rate. Scenarios omitting `abandonAfterSec`
  // (convention burst) keep the pre-patience "wait forever" behavior
  // so their stress tests stay punishing.
  state.traffic.setPatienceTicks(
    scenario.abandonAfterSec ? Math.round(scenario.abandonAfterSec * 60) : 0,
  );
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
    if (scenario.seedSpawns > 0) {
      const snapForSeed = state.paneA.sim.snapshot();
      for (let i = 0; i < scenario.seedSpawns; i += 1) {
        // Abuse drainSpawns by feeding a full minute's worth of
        // elapsed time at 300 riders/min so the driver emits the
        // seed count from the first phase's distribution.
        const specs = state.traffic.drainSpawns(snapForSeed, 1 / 300);
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
        // Break once we've seeded enough — drainSpawns caps per-frame
        // output at its internal accumulator, so we just loop until
        // cumulative emission >= the target.
        if (specs.length === 0) break;
      }
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
  ui.scenarioSelect.addEventListener("change", async () => {
    const scenario = scenarioById(ui.scenarioSelect.value);
    // Snap pane A (and pane B when in single-pane mode) to the
    // scenario's recommended strategy. In compare mode we leave both
    // panes alone so the user's comparison setup survives.
    const nextStrategyA = state.permalink.compare
      ? state.permalink.strategyA
      : scenario.defaultStrategy;
    // Clear all parameter overrides on scenario switch — every
    // scenario has its own physics envelope (a 0.5 m/s slider value
    // makes sense for residential, makes no sense for the space
    // elevator) so cross-scenario carry-over surprised more than it
    // helped during early prototyping.
    state.permalink = {
      ...state.permalink,
      scenario: scenario.id,
      strategyA: nextStrategyA,
      overrides: {},
    };
    ui.strategyASelect.value = nextStrategyA;
    await resetAll(state, ui);
    renderTweakPanel(scenario, state.permalink.overrides, ui);
    toast(ui, `${scenario.label} · ${STRATEGY_LABELS[nextStrategyA]}`);
  });
  // Strategy changes reset the whole comparator so both panes stay aligned
  // on the same rider stream from t=0 — mixing pre- and post-change metrics
  // would make the scoreboard misleading.
  ui.strategyASelect.addEventListener("change", async () => {
    state.permalink = {
      ...state.permalink,
      strategyA: ui.strategyASelect.value as StrategyName,
    };
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
    row.dec.addEventListener("click", () => bumpParam(state, ui, key, -1));
    row.inc.addEventListener("click", () => bumpParam(state, ui, key, +1));
    row.reset.addEventListener("click", () => resetParam(state, ui, key));
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
}

function loop(state: State): void {
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
        // layer the freshest per-car action.
        const events = pane.sim.drainEvents();
        updateBubbles(pane, events);
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

      updateScoreboard(state);
      // Phase indicator updates at ~15 Hz so it stays readable even
      // when the sim is racing ahead.
      if ((uiFrame += 1) % 4 === 0) updatePhaseIndicatorFromState(state);
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
  // Evict stale bubbles lazily before handing the map to the renderer.
  const now = performance.now();
  for (const [carId, bubble] of pane.bubbles) {
    if (bubble.expiresAt <= now) pane.bubbles.delete(carId);
  }
  pane.renderer.draw(snap, pane.waitHistory, speed, pane.bubbles);
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
function updateBubbles(pane: Pane, events: BubbleEvent[]): void {
  if (events.length === 0) return;
  const expiresAt = performance.now() + BUBBLE_TTL_MS;
  const snap = pane.sim.snapshot();
  const stopName = (id: number): string => resolveStopName(snap, id);
  for (const ev of events) {
    const text = bubbleTextFor(ev, stopName);
    if (text === null) continue;
    // Some events are rider-scoped rather than car-scoped (spawn,
    // abandon). bubbleTextFor returns `null` for those, so we only
    // get here when `ev` carries an `elevator` field.
    const carId = (ev as { elevator?: number }).elevator;
    if (carId === undefined) continue;
    pane.bubbles.set(carId, { text, expiresAt });
  }
}

/** Map an event to a short human-readable bubble text, or `null` for
 *  events that have no car to attach to (rider-spawned, rider-abandoned). */
function bubbleTextFor(ev: BubbleEvent, stopName: (id: number) => string): string | null {
  switch (ev.kind) {
    case "elevator-assigned":
      return `Heading to ${stopName(ev.stop)}`;
    case "elevator-departed":
      return `Leaving ${stopName(ev.stop)}`;
    case "elevator-arrived":
      return `Arrived at ${stopName(ev.stop)}`;
    case "door-opened":
      return "Doors open";
    case "door-closed":
      return "Doors closed";
    case "rider-boarded":
      return "Boarding";
    case "rider-exited":
      return `Dropping off at ${stopName(ev.stop)}`;
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
  if (!ui.phaseLabel) return;
  const label = state.traffic.currentPhaseLabel();
  ui.phaseLabel.textContent = label || "—";
}

function updatePhaseIndicatorFromState(state: State): void {
  const el = document.getElementById("phase-label");
  if (!el) return;
  const label = state.traffic.currentPhaseLabel();
  if (el.textContent !== label) el.textContent = label || "—";
}

function updateScoreboard(state: State): void {
  const paneA = state.paneA;
  if (!paneA?.latestMetrics) return;
  const paneB = state.paneB;
  if (paneB?.latestMetrics) {
    const compare = diffMetrics(paneA.latestMetrics, paneB.latestMetrics);
    renderMetricRows(paneA.metricsEl, paneA.latestMetrics, compare.a);
    renderMetricRows(paneB.metricsEl, paneB.latestMetrics, compare.b);
  } else {
    renderMetricRows(paneA.metricsEl, paneA.latestMetrics, null);
  }
}

type Verdict = "win" | "lose" | "tie";
interface MetricVerdicts {
  avg_wait_s: Verdict;
  max_wait_s: Verdict;
  delivered: Verdict;
  abandoned: Verdict;
  utilization: Verdict;
}
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
// We build the DOM once and mutate text + verdict in place every frame.
const METRIC_DEFS: Array<[string, keyof MetricVerdicts]> = [
  ["Avg wait", "avg_wait_s"],
  ["Max wait", "max_wait_s"],
  ["Delivered", "delivered"],
  ["Abandoned", "abandoned"],
  ["Utilization", "utilization"],
];

function metricValue(m: Metrics, key: keyof MetricVerdicts): string {
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
    const row = document.createElement("div");
    row.className = "metric-row";
    const ks = document.createElement("span");
    ks.className = "metric-k";
    ks.textContent = label;
    const vs = document.createElement("span");
    vs.className = "metric-v";
    row.append(ks, vs);
    frag.appendChild(row);
  }
  root.replaceChildren(frag);
}

function renderMetricRows(
  root: HTMLElement,
  m: Metrics,
  verdicts: MetricVerdicts | null,
): void {
  const rows = root.children;
  for (let i = 0; i < METRIC_DEFS.length; i++) {
    const row = rows[i] as HTMLElement;
    const key = METRIC_DEFS[i][1];
    const verdict = verdicts ? verdicts[key] : "";
    if (row.dataset.verdict !== verdict) row.dataset.verdict = verdict;
    const vs = row.lastElementChild as HTMLElement;
    const val = metricValue(m, key);
    if (vs.textContent !== val) vs.textContent = val;
  }
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

void boot();
