import { CanvasRenderer } from "../../render";
import { applyPhysicsOverrides, buildScenarioRon, type Overrides } from "../../domain";
import { Sim } from "../../sim";
import type {
  CarBubble,
  MetricsDto,
  MetricKey,
  RepositionStrategyName,
  ScenarioMeta,
  StrategyName,
} from "../../types";
import type { PaneHandles } from "./handles";

export const COLOR_A = "#7dd3fc";
export const COLOR_B = "#fda4af";

export interface Pane {
  strategy: StrategyName;
  sim: Sim;
  renderer: CanvasRenderer;
  metricsEl: HTMLElement;
  modeEl: HTMLElement;
  /**
   * Rolling per-metric history for the inline sparklines that live in
   * each metric row. Capped at `METRIC_HISTORY_LEN` samples; keys
   * mirror `MetricVerdicts` and we keep raw numbers, doing the chart
   * math at render time.
   */
  metricHistory: Record<MetricKey, number[]>;
  latestMetrics: MetricsDto | null;
  /**
   * Per-car speech bubbles. Keyed by car entity id. Each entry fades
   * per its event-kind TTL; stale entries are evicted lazily in
   * [`updateBubbles`] so the map never grows past `cars x 1`.
   */
  bubbles: Map<number, CarBubble>;
}

/**
 * Narrow interface for the state object that `forEachPane` needs.
 * Avoids importing the full `State` type (which lives in main.ts) and
 * prevents circular dependencies.
 */
export interface PaneState {
  paneA: Pane | null;
  paneB: Pane | null;
  permalink: { compare: boolean };
}

export async function makePane(
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
  // Tether-mode rendering opts in via scenario metadata. Without
  // this hookup the renderer falls back to the standard per-line
  // column layout — which fails badly at 35,786 km axes.
  renderer.setTetherConfig(scenario.tether ?? null);
  // Manual-control rendering is gated on the same opt-in pattern. The
  // panel.update() call from the loop pushes a richer state object
  // each frame (selected car, per-car service mode, hall-call lamps);
  // here we just toggle the cutaway path on with empty maps.
  if (scenario.manualControl) {
    renderer.setManualControlState({
      selectedCarId: null,
      serviceModeByCar: new Map(),
      hallCallsByStop: new Map(),
    });
  } else {
    renderer.setManualControlState(null);
  }
  if (scenario.tether) {
    // Use the override-merged physics so a shared permalink with a
    // tweaked max-speed (e.g. `?s=space-elevator&ms=2000`) shows
    // accurate ETA / phase classification immediately, instead of
    // waiting for the user to nudge the slider and trigger the
    // hot-swap path.
    const phys = applyPhysicsOverrides(scenario, overrides);
    renderer.setTetherPhysics(phys.maxSpeed, phys.acceleration, phys.deceleration);
  }
  // Scenarios with many floors need a taller shaft, or the 42-floor
  // skyscraper crushes into a 6-px-per-story smear. The CSS applies
  // `min-height: var(--shaft-min-h)` so the page scrolls instead.
  // Tether mode needs far more headroom — the log axis compresses
  // 5+ decades into the visible range, and on mobile portrait the
  // upper decades (Karman / LEO / GEO) end up with overlapping
  // labels unless the canvas is tall enough to space them out.
  const wrap = handles.canvas.parentElement;
  if (wrap) {
    const stopCount = scenario.stops.length;
    const perStoryPx = 16;
    const minShaftPx = scenario.tether ? 640 : Math.max(200, stopCount * perStoryPx);
    wrap.style.setProperty("--shaft-min-h", `${minShaftPx}px`);
  }
  return {
    strategy,
    sim,
    renderer,
    metricsEl: handles.metrics,
    modeEl: handles.mode,
    metricHistory: {
      avg_wait_s: [],
      max_wait_s: [],
      delivered: [],
      abandoned: [],
      utilization: [],
    },
    latestMetrics: null,
    bubbles: new Map(),
  };
}

export function disposePane(pane: Pane | null): void {
  pane?.sim.dispose();
  pane?.renderer.dispose();
}

/** Run `fn` against each active pane. Lets call sites fan out without null-checks. */
export function forEachPane(state: PaneState, fn: (pane: Pane) => void): void {
  if (state.paneA) fn(state.paneA);
  if (state.paneB) fn(state.paneB);
}
