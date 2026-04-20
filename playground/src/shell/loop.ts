import { updatePhaseIndicator, updatePhaseProgress } from "../features/phase-strip";
import { diffMetrics, renderMetricRows, renderVerdictRibbon } from "../features/scoreboard";
import {
  forEachPane,
  renderPane,
  resolveStopName,
  updateBubbles,
  pushDecision,
  updateModeBadge,
} from "../features/compare-pane";
import type { State } from "./state";
import type { UiHandles } from "./wire-ui";
import { drainSeedBatch } from "./reset";

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

export function loop(state: State, ui: UiHandles): void {
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
