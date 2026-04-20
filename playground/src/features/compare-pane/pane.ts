import { CanvasRenderer } from "../../render";
import { buildScenarioRon, type Overrides } from "../../domain";
import { Sim } from "../../sim";
import type {
  CarBubble,
  Metrics,
  RepositionStrategyName,
  ScenarioMeta,
  StrategyName,
} from "../../types";
import { initMetricRows } from "../scoreboard";
import { renderPaneStrategyInfo, renderPaneRepositionInfo } from "../strategy-picker";
import type { PaneHandles } from "./handles";
import type { MetricKey } from "../scoreboard";

export const COLOR_A = "#7dd3fc";
export const COLOR_B = "#fda4af";

export interface Pane {
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
   * [`updateBubbles`] so the map never grows past `cars x 1`.
   */
  bubbles: Map<number, CarBubble>;
  /**
   * Wall-clock ms after which the pane's decision line (the
   * `Car X -> <stop>` readout) should fade out. We keep the text
   * visible after fade-out so the last known decision is still there
   * on the next pulse, just at reduced opacity — makes compare mode
   * read as "here's the story" rather than flashing on/off.
   */
  decisionExpiresAt: number;
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

export function disposePane(pane: Pane | null): void {
  pane?.sim.dispose();
  pane?.renderer.dispose();
}

/** Run `fn` against each active pane. Lets call sites fan out without null-checks. */
export function forEachPane(state: PaneState, fn: (pane: Pane) => void): void {
  if (state.paneA) fn(state.paneA);
  if (state.paneB) fn(state.paneB);
}
