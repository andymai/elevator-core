/**
 * Run a Quest stage end-to-end.
 *
 * The runner wires the worker, the controller-source eval path, and
 * the stage's grading callbacks into a single async call:
 *
 *   1. Spawn a `WorkerSim` from `stage.configRon`.
 *   2. Hand the controller source to the worker.
 *   3. Step the sim in batches until the pass condition fires or the
 *      tick budget runs out.
 *   4. Build `GradeInputs` from the latest metrics and apply
 *      `passFn` + `starFns` to compute the result.
 *   5. Tear the worker down on the way out (success or failure).
 *
 * The runner is intentionally headless — `quest-pane` drives the UI
 * (results modal, retry, navigation) on top of the resolved
 * `StageResult`.
 */

import { createWorkerSim } from "./worker-sim";
import type { GradeInputs, StarCount, Stage } from "./stages";
import type { MetricsDto, Snapshot } from "../../types";

export interface StageResult {
  /** `true` iff the stage's `passFn` returned `true` for the final grade. */
  readonly passed: boolean;
  /**
   * Total stars: 0 if not passed, 1 for a bare pass, +1 per star tier
   * the player cleared in order. Caps at 3.
   */
  readonly stars: StarCount;
  /** Inputs the grading callbacks saw — useful for debugging UI. */
  readonly grade: GradeInputs;
}

export interface RunStageOptions {
  /**
   * Hard cap on simulation ticks. Default 1500 — enough for a five-rider
   * scenario at 60 ticks-per-second to play out across ~25 sim-seconds.
   * Stages with longer day cycles should pass an explicit budget.
   */
  readonly maxTicks?: number;
  /** Worker-side controller-execution timeout in ms. */
  readonly timeoutMs?: number;
  /**
   * Number of sim ticks per `tick()` request. Smaller batches let the
   * runner check `passFn` more frequently and exit earlier; larger
   * batches reduce postMessage round trips. Default 60 (one sim-second
   * at the standard tick rate).
   */
  readonly batchTicks?: number;
  /**
   * Called after each batch with the latest grade. Lets the host paint
   * tick-by-tick progress while the sim runs. Throws are caught — a
   * UI update error must not abort an in-flight run.
   */
  readonly onProgress?: (grade: GradeInputs) => void;
  /**
   * Called after each batch with the latest sim snapshot. Setting this
   * implicitly opts into the worker's `wantVisuals: true` path so the
   * snapshot bundle gets serialized — leave it `undefined` for headless
   * grading runs and the runner skips the per-batch snapshot/event
   * computation. Throws are caught for the same reason as `onProgress`.
   */
  readonly onSnapshot?: (snap: Snapshot) => void;
}

/**
 * Run `source` against `stage`, returning the grade.
 *
 * The promise rejects if the worker fails to spawn, the controller
 * source fails to compile, or the controller throws during execution.
 * A `passFn === false` result resolves with `passed: false, stars: 0`
 * — that's a graded outcome, not an error.
 */
export async function runStage(
  stage: Stage,
  source: string,
  opts: RunStageOptions = {},
): Promise<StageResult> {
  const maxTicks = opts.maxTicks ?? 1500;
  const batchTicks = opts.batchTicks ?? 60;

  const sim = await createWorkerSim({
    configRon: stage.configRon,
    // The baseline strategy seeds dispatch before the controller runs;
    // a `setStrategyJs` call in the controller (when `setStrategyJs`
    // is unlocked) replaces it. SCAN is a safe default — every config
    // accepts it, and it produces movement so a controller that
    // forgets to set its own strategy still makes progress.
    strategy: "scan",
  });

  try {
    // Forward the stage's unlocked API list so the worker's sim
    // proxy throws on calls outside the curriculum's current step.
    // `Stage.unlockedApi` is `readonly` and the protocol's field
    // is also readonly — the reference passes straight through
    // structured-clone, no copy involved.
    const loadOptions: { timeoutMs?: number; unlockedApi: readonly string[] } = {
      unlockedApi: stage.unlockedApi,
    };
    if (opts.timeoutMs !== undefined) loadOptions.timeoutMs = opts.timeoutMs;
    await sim.loadController(source, loadOptions);

    let lastMetrics: MetricsDto | null = null;
    let endTick = 0;

    const wantVisuals = opts.onSnapshot !== undefined;
    while (endTick < maxTicks) {
      const remaining = maxTicks - endTick;
      const step = Math.min(batchTicks, remaining);
      const result = await sim.tick(step, wantVisuals ? { wantVisuals: true } : undefined);
      lastMetrics = result.metrics;
      endTick = result.tick;
      const grade = makeGrade(lastMetrics, endTick);
      if (opts.onProgress) {
        try {
          opts.onProgress(grade);
        } catch {
          // A UI bug in the progress renderer must not abort the run.
        }
      }
      if (opts.onSnapshot && result.snapshot) {
        try {
          opts.onSnapshot(result.snapshot);
        } catch {
          // A UI bug in the snapshot renderer must not abort the run.
        }
      }
      if (stage.passFn(grade)) {
        return finalize(stage, grade, true);
      }
    }

    if (lastMetrics === null) {
      // `maxTicks <= 0` — shouldn't happen with the default, but
      // guard so the type narrows below.
      throw new Error("runStage: maxTicks must be positive");
    }
    // Loop exited because every tested batch's `passFn` returned
    // `false` — pass that through so `finalize` doesn't re-evaluate.
    return finalize(stage, makeGrade(lastMetrics, endTick), false);
  } finally {
    sim.dispose();
  }
}

function makeGrade(metrics: MetricsDto, endTick: number): GradeInputs {
  return {
    metrics,
    endTick,
    delivered: metrics.delivered,
    abandoned: metrics.abandoned,
  };
}

/**
 * Build the final `StageResult` from a grade. `passed` is supplied by
 * the caller — both call sites in `runStage` already know it (one
 * from the early-exit `passFn(grade)` branch, the other from the
 * loop's exit condition), so `finalize` doesn't re-evaluate.
 */
function finalize(stage: Stage, grade: GradeInputs, passed: boolean): StageResult {
  if (!passed) {
    return { passed: false, stars: 0, grade };
  }
  let stars: StarCount = 1;
  // `starFns[0]` → 2★, `starFns[1]` → 3★. Stop at the first tier
  // that fails, so a 3★ requires 2★ to also be `true` — matches the
  // schema's "evaluated in order" contract.
  if (stage.starFns[0]?.(grade)) {
    stars = 2;
    if (stage.starFns[1]?.(grade)) {
      stars = 3;
    }
  }
  return { passed: true, stars, grade };
}
