import { updatePhaseIndicator, updatePhaseProgress } from "../features/phase-strip";
import { diffMetrics, renderMetricRows } from "../features/scoreboard";
import type { Pane } from "../features/compare-pane";
import { forEachPane, renderPane, updateBubbles, updateModeBadge } from "../features/compare-pane";
import type { Snapshot } from "../types";
import type { State } from "./state";
import type { UiHandles } from "./wire-ui";
import { drainSeedBatch } from "./reset";

/**
 * Step the pane and return the post-step snapshot if any events fired
 * (so the bubbles + assignment paths could consume it). Returning the
 * snapshot lets the caller reuse it as the spawn driver's input,
 * cutting a redundant WASM/JS boundary crossing per pane per frame.
 */
function stepPaneAndDrain(pane: Pane, ticks: number): Snapshot | null {
  pane.sim.step(ticks);
  const events = pane.sim.drainEvents();
  if (events.length === 0) return null;
  const snap = pane.sim.snapshot();
  updateBubbles(pane, events, snap);
  // Resolve line at event time from the current snapshot so the
  // renderer can key assignments per-(stop, line). Unknown cars
  // (disabled, despawned) skip the map — they wouldn't draw anyway.
  const carLine = new Map<number, number>();
  for (const car of snap.cars) carLine.set(car.id, car.line);
  for (const ev of events) {
    if (ev.kind === "elevator-assigned") {
      const line = carLine.get(ev.elevator);
      if (line !== undefined) {
        pane.renderer.pushAssignment(ev.stop, ev.elevator, line);
      }
    }
  }
  return snap;
}

function updateScoreboard(state: State): void {
  const paneA = state.paneA;
  if (!paneA?.latestMetrics) return;
  const paneB = state.paneB;
  if (paneB?.latestMetrics) {
    const compare = diffMetrics(paneA.latestMetrics, paneB.latestMetrics);
    renderMetricRows(
      paneA.metricsEl,
      paneA.latestMetrics,
      compare.a,
      paneA.metricHistory,
      paneB.latestMetrics,
    );
    renderMetricRows(
      paneB.metricsEl,
      paneB.latestMetrics,
      compare.b,
      paneB.metricHistory,
      paneA.latestMetrics,
    );
  } else {
    renderMetricRows(paneA.metricsEl, paneA.latestMetrics, null, paneA.metricHistory, null);
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
      // Step both panes; capture paneA's post-step snapshot when its
      // events branch already paid for one so the spawn driver below
      // can reuse it instead of double-paying the WASM/JS crossing.
      let snapA = stepPaneAndDrain(paneA, ticks);
      if (paneB) stepPaneAndDrain(paneB, ticks);

      // Progressive pre-seed: drain the remaining quota in per-frame
      // batches. While seeding is active we suppress the normal
      // wall-clock drain below so the driver's accumulator — which
      // also advances here — stays dedicated to the initial crowd.
      // When the last rider lands we re-seat the driver so the
      // scenario's day cycle starts from t=0.
      if (state.seeding) {
        drainSeedBatch(state);
        snapA = null;
      }
      // Fan-out spawns to both sims so the comparison is apples-to-apples.
      // Clamp wall-clock first (to guard against tab-switch catch-up, which
      // restores rAF with a multi-second delta), *then* scale by speed so
      // the phase clock and spawn cadence track the sim's actual rate.
      // At 8× the raw sim-time delta is ~0.128 s per 16 ms frame, which
      // would exceed the driver's internal 4/60 sec clamp every frame
      // and silently throttle phases to half speed. Skipped while seeding.
      const clampedWall = Math.min(elapsed, 4 / 60);
      const simElapsed = clampedWall * ticks;
      let specs: ReturnType<typeof state.traffic.drainSpawns> = [];
      if (!state.seeding) {
        const driverSnap = snapA ?? paneA.sim.snapshot();
        specs = state.traffic.drainSpawns(driverSnap, simElapsed);
        snapA = driverSnap;
      }
      for (const spec of specs) {
        forEachPane(state, (pane) => {
          const r = pane.sim.spawnRider(
            spec.originStopId,
            spec.destStopId,
            spec.weight,
            spec.patienceTicks,
          );
          if (r.kind === "err") {
            console.warn(`spawnRider failed: ${r.error}`);
          }
        });
      }

      // Re-snapshot each pane post-spawn so waiting dots reflect the
      // new riders. When no spawns landed this frame, paneA's snapshot
      // is unchanged from `snapA` and we can pass it through directly.
      const speed = state.permalink.speed;
      const renderSnapA = specs.length > 0 || snapA === null ? paneA.sim.snapshot() : snapA;
      renderPane(paneA, renderSnapA, speed);
      if (paneB) {
        renderPane(paneB, paneB.sim.snapshot(), speed);
      }

      updateScoreboard(state);
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
