import { CanvasRenderer } from "./canvas";
import { DEFAULT_STATE, decodePermalink, encodePermalink, type PermalinkState } from "./permalink";
import { SCENARIOS, scenarioById } from "./scenarios";
import { Sim } from "./sim";
import { TrafficDriver } from "./traffic";
import type { Metrics, Snapshot, StrategyName } from "./types";

// The playground is a side-by-side comparator: up to two sims run the same
// rider stream under different dispatch strategies. In single mode only
// pane A is visible. A lightweight scoreboard highlights which strategy is
// winning on each live metric.

const UI_STRATEGIES: StrategyName[] = ["scan", "look", "nearest", "etd"];
const STRATEGY_LABELS: Record<StrategyName, string> = {
  scan: "SCAN",
  look: "LOOK",
  nearest: "NEAREST",
  etd: "ETD",
};
const WAIT_HISTORY_LEN = 120;
const COLOR_A = "#7dd3fc";
const COLOR_B = "#fda4af";

const speedLabel = (v: number): string => `${v}\u00d7`;
const trafficLabel = (v: number): string => `${v} / min`;

interface Pane {
  strategy: StrategyName;
  sim: Sim;
  renderer: CanvasRenderer;
  metricsEl: HTMLElement;
  waitHistory: number[];
  latestMetrics: Metrics | null;
}

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

interface UiHandles {
  scenarioSelect: HTMLSelectElement;
  strategyASelect: HTMLSelectElement;
  strategyBSelect: HTMLSelectElement;
  compareToggle: HTMLInputElement;
  strategyBWrap: HTMLElement;
  seedInput: HTMLInputElement;
  speedInput: HTMLInputElement;
  speedLabel: HTMLElement;
  trafficInput: HTMLInputElement;
  trafficLabel: HTMLElement;
  playBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  layout: HTMLElement;
  loader: HTMLElement;
  toast: HTMLElement;
  paneA: PaneHandles;
  paneB: PaneHandles;
}

async function boot(): Promise<void> {
  const ui = wireUi();
  const permalink = { ...DEFAULT_STATE, ...decodePermalink(window.location.search) };
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

function wireUi(): UiHandles {
  const q = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`missing element #${id}`);
    return el as T;
  };
  const paneHandles = (suffix: "a" | "b", accent: string): PaneHandles => ({
    root: q(`pane-${suffix}`),
    canvas: q<HTMLCanvasElement>(`shaft-${suffix}`),
    name: q(`name-${suffix}`),
    metrics: q(`metrics-${suffix}`),
    accent,
  });
  const ui: UiHandles = {
    scenarioSelect: q<HTMLSelectElement>("scenario"),
    strategyASelect: q<HTMLSelectElement>("strategy-a"),
    strategyBSelect: q<HTMLSelectElement>("strategy-b"),
    compareToggle: q<HTMLInputElement>("compare"),
    strategyBWrap: q("strategy-b-wrap"),
    seedInput: q<HTMLInputElement>("seed"),
    speedInput: q<HTMLInputElement>("speed"),
    speedLabel: q("speed-label"),
    trafficInput: q<HTMLInputElement>("traffic"),
    trafficLabel: q("traffic-label"),
    playBtn: q<HTMLButtonElement>("play"),
    resetBtn: q<HTMLButtonElement>("reset"),
    shareBtn: q<HTMLButtonElement>("share"),
    layout: q("layout"),
    loader: q("loader"),
    toast: q("toast"),
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
  ui.trafficInput.value = String(p.trafficRate);
  ui.trafficLabel.textContent = trafficLabel(p.trafficRate);
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
  state: State,
): Promise<Pane> {
  const scenario = scenarioById(state.permalink.scenario);
  const sim = await Sim.create(scenario.ron, strategy);
  sim.setTrafficRate(state.permalink.trafficRate);
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
  };
}

async function resetAll(state: State, ui: UiHandles): Promise<void> {
  const token = ++state.initToken;
  ui.loader.classList.add("show");
  // Swap in the fresh TrafficDriver *before* creating panes. If paneB
  // construction throws after paneA was installed, the surviving paneA
  // must see the reset seed — not the previous driver's accumulator.
  state.traffic = new TrafficDriver(state.permalink.seed);
  // Tear the old panes down *before* building new ones so the freed wasm
  // memory is released before we allocate the replacements.
  disposePane(state.paneA);
  disposePane(state.paneB);
  state.paneA = null;
  state.paneB = null;
  try {
    const paneA = await makePane(ui.paneA, state.permalink.strategyA, state);
    if (token !== state.initToken) {
      disposePane(paneA);
      return;
    }
    state.paneA = paneA;
    if (state.permalink.compare) {
      const paneB = await makePane(ui.paneB, state.permalink.strategyB, state);
      if (token !== state.initToken) {
        disposePane(paneB);
        return;
      }
      state.paneB = paneB;
    }
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
    state.permalink = {
      ...state.permalink,
      scenario: scenario.id,
      trafficRate: scenario.suggestedTrafficRate,
    };
    ui.trafficInput.value = String(state.permalink.trafficRate);
    ui.trafficLabel.textContent = trafficLabel(state.permalink.trafficRate);
    // Bump max when the scenario's default exceeds the range slider cap.
    ui.trafficInput.max = String(
      Math.max(Number(ui.trafficInput.max), state.permalink.trafficRate + 20),
    );
    await resetAll(state, ui);
    toast(ui, `${scenario.label}`);
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
  ui.trafficInput.addEventListener("input", () => {
    const v = Number(ui.trafficInput.value);
    state.permalink.trafficRate = v;
    forEachPane(state, (pane) => pane.sim.setTrafficRate(v));
    ui.trafficLabel.textContent = trafficLabel(v);
  });

  ui.playBtn.addEventListener("click", () => {
    state.running = !state.running;
    ui.playBtn.textContent = state.running ? "Pause" : "Play";
  });
  ui.resetBtn.addEventListener("click", () => {
    void resetAll(state, ui);
    toast(ui, "Reset");
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
  const frame = (): void => {
    const now = performance.now();
    const elapsed = (now - state.lastFrameTime) / 1000;
    state.lastFrameTime = now;

    if (state.running && state.ready && state.paneA) {
      const ticks = state.permalink.speed;
      forEachPane(state, (pane) => pane.sim.step(ticks));

      const snapA = state.paneA.sim.snapshot();
      // Fan-out spawns to both sims so the comparison is apples-to-apples.
      const specs = state.traffic.drainSpawns(snapA, state.permalink.trafficRate, elapsed);
      for (const spec of specs) {
        forEachPane(state, (pane) =>
          pane.sim.spawnRider(spec.originStopId, spec.destStopId, spec.weight),
        );
      }

      // Re-snapshot each pane post-spawn so waiting dots reflect the new riders.
      const speed = state.permalink.speed;
      renderPane(state.paneA, state.paneA.sim.snapshot(), speed);
      if (state.paneB) {
        renderPane(state.paneB, state.paneB.sim.snapshot(), speed);
      }

      updateScoreboard(state);
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
  pane.renderer.draw(snap, pane.waitHistory, speed);
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

void boot();
