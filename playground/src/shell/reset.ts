import { type Pane, makePane, disposePane, forEachPane } from "../features/compare-pane";
import { mountManualControls } from "../features/manual-controls";
import { updatePhaseIndicator } from "../features/phase-strip";
import { initMetricRows } from "../features/scoreboard";
import { renderPaneStrategyInfo, renderPaneRepositionInfo } from "../features/strategy-picker";
import { renderTweakPanel } from "../features/tweak-drawer";
import { hashSeedWord, scenarioById } from "../domain";
import { toast } from "../platform";
import { TrafficDriver } from "../sim";
import type { ScenarioMeta } from "../types";
import type { State } from "./state";
import type { UiHandles } from "./wire-ui";

/**
 * Per-frame cap on `drainSpawns` calls during progressive seeding.
 * At convention-burst's keynote rate (110 riders/min, 4/60-s dt) the
 * driver's accumulator grows ~0.12 per call, so this yields ~24
 * riders per frame — the full 120-rider seed drains in ~5 frames
 * (~80 ms wall-clock) without ever blocking the loader.
 */
const SEED_CALLS_PER_FRAME = 200;

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

export async function resetAll(state: State, ui: UiHandles): Promise<void> {
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
  // Drop any manual-controls panel from the previous scenario; the new
  // scenario remounts below if it's also manual.
  state.manualControls?.dispose();
  state.manualControls = null;
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
    renderPaneStrategyInfo(ui.paneA, state.permalink.strategyA);
    renderPaneRepositionInfo(ui.paneA, state.permalink.repositionA);
    initMetricRows(ui.paneA.metrics);
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
        renderPaneStrategyInfo(ui.paneB, state.permalink.strategyB);
        renderPaneRepositionInfo(ui.paneB, state.permalink.repositionB);
        initMetricRows(ui.paneB.metrics);
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
    // Mount the manual-controls side panel for manual-control scenarios.
    // The panel reads `paneA.sim` for entity refs and pushes the full
    // CabinRenderState (selected car, per-car mode, hall-call lamps)
    // into `paneA.renderer` on every `update()` tick.
    if (scenario.manualControl !== undefined) {
      state.manualControls = mountManualControls(
        paneA.sim,
        scenario,
        {
          hallButtons: ui.manualHallButtons,
          carControls: ui.manualCarControls,
          spawnForm: ui.manualSpawnForm,
          eventLog: ui.manualEventLog,
          addCarBtn: ui.manualAddCarBtn,
          featureHint: ui.manualFeatureHint,
        },
        paneA.renderer,
      );
    }
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
export function drainSeedBatch(state: State): void {
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
