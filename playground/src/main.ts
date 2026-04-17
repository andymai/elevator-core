import { CanvasRenderer } from "./canvas";
import { drawBars, drawSparkline, Heatmap } from "./charts";
import { EventLog } from "./eventLog";
import { GifRecorder, downloadEventsCsv, downloadMetricsCsv } from "./export";
import { DEFAULT_STATE, decodePermalink, encodePermalink, type PermalinkState } from "./permalink";
import { SCENARIOS, scenarioById } from "./scenarios";
import { Sim } from "./sim";
import { TrafficDriver } from "./traffic";
import type { Metrics, StrategyName } from "./types";

// Premium playground entry point. Composes: sim + traffic driver + canvas
// renderer + 3 charts + event log + export tools + permalink state + a small
// requestAnimationFrame loop. Designed to feel snappy at 60 FPS with a 60 Hz
// sim clock (one sim tick per animation frame per speed multiplier).

const SIM_TICK_PER_FRAME = 1;
const METRICS_HISTORY = 120;

interface UiState {
  running: boolean;
  speed: number;
  permalink: PermalinkState;
  sim: Sim | null;
  traffic: TrafficDriver;
  metricsHistory: Metrics[];
  metricsSamples: Array<{ tick: number; metrics: Metrics }>;
  lastFrameTime: number;
  heatmap: Heatmap;
  renderer: CanvasRenderer;
  eventLog: EventLog;
  gifRecorder: GifRecorder;
}

async function boot(): Promise<void> {
  const ui = wireUi();
  const permalink = { ...DEFAULT_STATE, ...decodePermalink(window.location.search) };
  const state: UiState = {
    running: true,
    speed: permalink.speed,
    permalink,
    sim: null,
    traffic: new TrafficDriver(permalink.seed),
    metricsHistory: [],
    metricsSamples: [],
    lastFrameTime: performance.now(),
    heatmap: new Heatmap(ui.heatmapCanvas, 90),
    renderer: new CanvasRenderer(ui.shaftCanvas),
    eventLog: new EventLog(ui.eventLogList),
    gifRecorder: new GifRecorder(ui.shaftCanvas),
  };

  await resetSim(state, ui);
  attachListeners(state, ui);
  loop(state, ui);
}

interface UiHandles {
  scenarioSelect: HTMLSelectElement;
  strategySelect: HTMLSelectElement;
  seedInput: HTMLInputElement;
  speedInput: HTMLInputElement;
  speedLabel: HTMLElement;
  trafficInput: HTMLInputElement;
  trafficLabel: HTMLElement;
  playBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  csvEventsBtn: HTMLButtonElement;
  csvMetricsBtn: HTMLButtonElement;
  gifBtn: HTMLButtonElement;
  shaftCanvas: HTMLCanvasElement;
  waitChart: HTMLCanvasElement;
  queueChart: HTMLCanvasElement;
  heatmapCanvas: HTMLCanvasElement;
  eventLogList: HTMLElement;
  metricsPanel: HTMLElement;
  toast: HTMLElement;
}

function wireUi(): UiHandles {
  const q = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`missing element #${id}`);
    return el as T;
  };
  const ui: UiHandles = {
    scenarioSelect: q<HTMLSelectElement>("scenario"),
    strategySelect: q<HTMLSelectElement>("strategy"),
    seedInput: q<HTMLInputElement>("seed"),
    speedInput: q<HTMLInputElement>("speed"),
    speedLabel: q("speed-label"),
    trafficInput: q<HTMLInputElement>("traffic"),
    trafficLabel: q("traffic-label"),
    playBtn: q<HTMLButtonElement>("play"),
    resetBtn: q<HTMLButtonElement>("reset"),
    shareBtn: q<HTMLButtonElement>("share"),
    csvEventsBtn: q<HTMLButtonElement>("csv-events"),
    csvMetricsBtn: q<HTMLButtonElement>("csv-metrics"),
    gifBtn: q<HTMLButtonElement>("gif"),
    shaftCanvas: q<HTMLCanvasElement>("shaft"),
    waitChart: q<HTMLCanvasElement>("wait-chart"),
    queueChart: q<HTMLCanvasElement>("queue-chart"),
    heatmapCanvas: q<HTMLCanvasElement>("heatmap"),
    eventLogList: q("event-log"),
    metricsPanel: q("metrics"),
    toast: q("toast"),
  };

  for (const s of SCENARIOS) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    opt.title = s.description;
    ui.scenarioSelect.appendChild(opt);
  }
  for (const strat of ["scan", "look", "nearest", "etd", "destination"] as StrategyName[]) {
    const opt = document.createElement("option");
    opt.value = strat;
    opt.textContent = strat.toUpperCase();
    ui.strategySelect.appendChild(opt);
  }

  return ui;
}

async function resetSim(state: UiState, ui: UiHandles): Promise<void> {
  state.sim?.dispose();
  state.sim = null;
  state.metricsHistory = [];
  state.metricsSamples = [];
  state.eventLog.reset();
  state.heatmap.reset();

  const scenario = scenarioById(state.permalink.scenario);
  applyPermalinkToUi(state.permalink, ui);

  const sim = await Sim.create(scenario.ron, state.permalink.strategy);
  sim.setTrafficRate(state.permalink.trafficRate);
  state.sim = sim;
  state.traffic = new TrafficDriver(state.permalink.seed);
  toast(ui, `${scenario.label} · ${state.permalink.strategy.toUpperCase()}`);
}

function applyPermalinkToUi(p: PermalinkState, ui: UiHandles): void {
  ui.scenarioSelect.value = p.scenario;
  ui.strategySelect.value = p.strategy;
  ui.seedInput.value = String(p.seed);
  ui.speedInput.value = String(p.speed);
  ui.speedLabel.textContent = `${p.speed}×`;
  ui.trafficInput.value = String(p.trafficRate);
  ui.trafficLabel.textContent = `${p.trafficRate} / min`;
}

function attachListeners(state: UiState, ui: UiHandles): void {
  ui.scenarioSelect.addEventListener("change", () => {
    state.permalink = { ...state.permalink, scenario: ui.scenarioSelect.value };
    const scenario = scenarioById(state.permalink.scenario);
    state.permalink.trafficRate = scenario.suggestedTrafficRate;
    void resetSim(state, ui);
  });
  ui.strategySelect.addEventListener("change", () => {
    state.permalink = { ...state.permalink, strategy: ui.strategySelect.value as StrategyName };
    state.sim?.setStrategy(state.permalink.strategy);
    toast(ui, `strategy → ${state.permalink.strategy.toUpperCase()}`);
  });
  ui.seedInput.addEventListener("change", () => {
    const seed = Number(ui.seedInput.value);
    if (Number.isFinite(seed)) {
      state.permalink = { ...state.permalink, seed };
      void resetSim(state, ui);
    }
  });
  ui.speedInput.addEventListener("input", () => {
    const v = Number(ui.speedInput.value);
    state.permalink.speed = v;
    state.speed = v;
    ui.speedLabel.textContent = `${v}×`;
  });
  ui.trafficInput.addEventListener("input", () => {
    const v = Number(ui.trafficInput.value);
    state.permalink.trafficRate = v;
    state.sim?.setTrafficRate(v);
    ui.trafficLabel.textContent = `${v} / min`;
  });

  ui.playBtn.addEventListener("click", () => {
    state.running = !state.running;
    ui.playBtn.textContent = state.running ? "Pause" : "Play";
  });
  ui.resetBtn.addEventListener("click", () => {
    void resetSim(state, ui);
  });
  ui.shareBtn.addEventListener("click", async () => {
    const qs = encodePermalink(state.permalink);
    const url = `${window.location.origin}${window.location.pathname}${qs}`;
    window.history.replaceState(null, "", qs);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast(ui, "Permalink copied");
  });
  ui.csvEventsBtn.addEventListener("click", () => {
    downloadEventsCsv(state.eventLog.snapshot(), "elevator-events.csv");
  });
  ui.csvMetricsBtn.addEventListener("click", () => {
    downloadMetricsCsv(state.metricsSamples, "elevator-metrics.csv");
  });
  ui.gifBtn.addEventListener("click", async () => {
    if (state.gifRecorder.isRecording) {
      toast(ui, "Encoding GIF…");
      await state.gifRecorder.finish("elevator-playground.gif");
      ui.gifBtn.textContent = "Record";
      toast(ui, "GIF saved");
    } else {
      await state.gifRecorder.start();
      ui.gifBtn.textContent = "Stop & save";
      toast(ui, "Recording GIF");
    }
  });
}

function loop(state: UiState, ui: UiHandles): void {
  const frame = (): void => {
    const now = performance.now();
    const elapsed = (now - state.lastFrameTime) / 1000;
    state.lastFrameTime = now;

    if (state.running && state.sim) {
      const ticks = SIM_TICK_PER_FRAME * state.speed;
      state.sim.step(ticks);
      const snapshot = state.sim.snapshot();
      state.traffic.tickSpawns(state.sim, snapshot, state.permalink.trafficRate, elapsed);

      state.renderer.draw(snapshot);
      const metrics = state.sim.metrics();
      state.metricsHistory.push(metrics);
      if (state.metricsHistory.length > METRICS_HISTORY) state.metricsHistory.shift();
      state.metricsSamples.push({ tick: snapshot.tick, metrics });
      if (state.metricsSamples.length > 1000) state.metricsSamples.shift();

      state.heatmap.record(snapshot);
      drawMetricsPanel(ui.metricsPanel, metrics, snapshot.tick, snapshot.dt);
      drawSparkline(
        ui.waitChart,
        state.metricsHistory.map((m) => m.avg_wait_s),
        "Avg wait (s)",
      );
      drawBars(
        ui.queueChart,
        snapshot.stops.map((s) => s.waiting),
        "Waiting per stop",
      );
      state.heatmap.draw();

      state.eventLog.append(state.sim.drainEvents());
      state.gifRecorder.captureIfDue();
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function drawMetricsPanel(root: HTMLElement, m: Metrics, tick: number, dt: number): void {
  const simSeconds = tick * dt;
  const rows: Array<[string, string]> = [
    ["sim time", fmtDuration(simSeconds)],
    ["delivered", String(m.delivered)],
    ["abandoned", String(m.abandoned)],
    ["throughput (hr)", String(Math.round(m.throughput * (3600 / 60)))],
    ["avg wait", `${m.avg_wait_s.toFixed(1)} s`],
    ["max wait", `${m.max_wait_s.toFixed(1)} s`],
    ["avg ride", `${m.avg_ride_s.toFixed(1)} s`],
    ["utilization", `${(m.utilization * 100).toFixed(0)}%`],
    ["abandonment", `${(m.abandonment_rate * 100).toFixed(1)}%`],
    ["distance", `${m.total_distance.toFixed(1)} m`],
  ];
  // Build via DOM APIs instead of innerHTML to keep this XSS-safe even when
  // future metric labels come from untrusted config or user input.
  const frag = document.createDocumentFragment();
  for (const [k, v] of rows) {
    const row = document.createElement("div");
    row.className = "row";
    const ks = document.createElement("span");
    ks.className = "k";
    ks.textContent = k;
    const vs = document.createElement("span");
    vs.className = "v";
    vs.textContent = v;
    row.append(ks, vs);
    frag.appendChild(row);
  }
  root.replaceChildren(frag);
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s.toFixed(0)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}m ${rem}s`;
}

let toastTimer = 0;
function toast(ui: UiHandles, msg: string): void {
  ui.toast.textContent = msg;
  ui.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ui.toast.classList.remove("show"), 1800);
}

void boot();
