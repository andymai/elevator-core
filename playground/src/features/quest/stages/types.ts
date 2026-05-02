/**
 * Schema for a single Quest curriculum stage.
 *
 * Each stage is its own typed module under `stages/`. The fields are
 * intentionally small and serializable so the registry can be loaded
 * incrementally as the curriculum grows. Q-09 grafts richer grading
 * (`starFns`, results modal); Q-10 adds the reference solution
 * gating; for v1 the schema covers what stages 1–3 need.
 */

import type { MetricsDto } from "../../../types";

/**
 * Right-pane baseline that runs alongside the player's controller.
 * `none` and `self-autopilot` are special-cased: the right pane shows
 * objective progress only / shows the same controller running on
 * autopilot, respectively. Built-in strategy names match the
 * `setStrategy` selector.
 */
export type Baseline = "none" | "self-autopilot" | "scan" | "look" | "nearest" | "etd" | "rsr";

/** Subset of wasm `sim.*` methods the stage exposes to the controller. */
export type UnlockedApi = readonly string[];

/** Inputs supplied to grading callbacks at run end. */
export interface GradeInputs {
  readonly metrics: MetricsDto;
  /** Tick at which the controller's run terminated. */
  readonly endTick: number;
  /** Total riders delivered (sum of arrived). */
  readonly delivered: number;
  /** Total riders that abandoned the wait. */
  readonly abandoned: number;
}

/** Pass condition for a stage — `true` means the player cleared it. */
export type PassFn = (inputs: GradeInputs) => boolean;

/**
 * Star tier predicates. Length is at most 3 — the tiers are evaluated
 * in order (`starFns[0]` → 1★, `[1]` → 2★, `[2]` → 3★) and stop at
 * the first one that returns `false`. A stage with no star tiers is
 * pass/fail only.
 */
export type StarFn = (inputs: GradeInputs) => boolean;

export interface Stage {
  /** Stable URL-safe slug; permalinks key off this. */
  readonly id: string;
  /** Display title (≤30 chars). */
  readonly title: string;
  /** One-line brief shown above the editor. */
  readonly brief: string;
  /** RON-encoded `SimConfig`. */
  readonly configRon: string;
  /** Methods the controller is allowed to call on `sim`. */
  readonly unlockedApi: UnlockedApi;
  /** What runs in the right pane during the run. */
  readonly baseline: Baseline;
  /** Pass condition. */
  readonly passFn: PassFn;
  /** Star tiers, evaluated in order. May be empty for pass/fail-only stages. */
  readonly starFns: readonly StarFn[];
  /** Initial code shown in the editor. */
  readonly starterCode: string;
  /** Progressive hints, revealed one at a time on demand. */
  readonly hints: readonly string[];
  /** Reference solution — unlocked after a 1★ pass (Q-10). */
  readonly referenceSolution?: string;
}
