/**
 * Schema for a single Quest curriculum stage.
 *
 * Each stage is its own typed module under `stages/`. The fields are
 * intentionally small and serializable so the registry can be loaded
 * incrementally as the curriculum grows.
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

/**
 * Deterministic rider arrival, seeded by the stage runner before (and
 * during) the controller's run. The wasm `Sim::step()` does not pump
 * the RON `passenger_spawning` block — that block exists for the
 * Rust-side `PoissonSource` only — so without explicit seeding every
 * Quest stage runs an empty building. Stages encode their scenario
 * here as a list of arrivals; the runner spawns each entry host-side
 * (bypassing the per-stage `unlockedApi` gate that scopes the
 * controller's own access) at the requested tick.
 *
 * `origin` and `destination` are config-time `StopId` numeric values
 * (the same `StopId(N)` ids declared in the stage's `configRon`),
 * not the bigint entity refs returned by runtime APIs. The runner
 * routes through `WasmSim::spawnRider`, which takes `u32` stop ids.
 */
export interface SeededRider {
  /** Stop id where the rider appears. Must match a `StopConfig` in `configRon`. */
  readonly origin: number;
  /** Stop id the rider wants to reach. */
  readonly destination: number;
  /**
   * Rider weight in kg. Defaults to 75 when omitted. Affects car-
   * capacity arithmetic; tune up to exercise weight rejections, down
   * for crowded scenarios.
   */
  readonly weight?: number;
  /**
   * Tick budget after which the rider abandons. Omit to use the
   * sim's default. Shorter values stress dispatch latency; longer
   * values prevent abandons in stages that grade on `delivered`
   * alone.
   */
  readonly patienceTicks?: number;
  /**
   * Tick at which the runner spawns this rider. Defaults to 0
   * (spawn at run start). Riders with `atTick > 0` spawn at the
   * first batch boundary that crosses their tick — the runner does
   * not pause inside a batch.
   */
  readonly atTick?: number;
}

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

/**
 * Pass condition for a stage. `true` means the player cleared it —
 * which equals **1★** in the grading UX. `false` means the run failed
 * the stage outright (no stars awarded, retry required).
 */
export type PassFn = (inputs: GradeInputs) => boolean;

/**
 * Bonus star-tier predicates evaluated only after `passFn` returns
 * `true`. They map to **2★ and 3★** in the grading UX:
 *
 *   - `starFns[0]` → 2★
 *   - `starFns[1]` → 3★
 *
 * Length is at most 2. Tiers are evaluated in order and stop at the
 * first one that returns `false`, so a stage that only defines a 2★
 * bonus has no 3★ tier and players cap at 2★. A stage with no entries
 * is pass-or-fail only (max 1★).
 */
export type StarFn = (inputs: GradeInputs) => boolean;

/** Star count earned on a stage. 0 = not passed; 1–3 = grade tiers. */
export type StarCount = 0 | 1 | 2 | 3;

/**
 * Curriculum sections used to group stages in the grid navigator.
 * Pinned via union type so a stage with an unrecognised section
 * fails the typecheck rather than rendering under "—".
 */
export type StageSection = "basics" | "strategies" | "events-manual" | "topology";

export interface Stage {
  /** Stable URL-safe slug; permalinks key off this. */
  readonly id: string;
  /** Display title (≤30 chars). */
  readonly title: string;
  /** One-line brief shown above the editor. */
  readonly brief: string;
  /**
   * Curriculum section the stage belongs to. Drives section grouping
   * in the grid navigator (basics → strategies → events-manual →
   * topology). Required so a forgotten annotation lands in a typecheck
   * error instead of silently going un-grouped.
   */
  readonly section: StageSection;
  /** RON-encoded `SimConfig`. */
  readonly configRon: string;
  /** Methods the controller is allowed to call on `sim`. */
  readonly unlockedApi: UnlockedApi;
  /**
   * Riders the runner injects on the player's behalf. Required for
   * graded stages: `passFn` predicates check `delivered`/`abandoned`,
   * and the wasm `step()` does not generate riders — so a stage
   * without `seedRiders` runs an empty building and never passes.
   */
  readonly seedRiders: readonly SeededRider[];
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
  /** Reference solution — unlocked after a 1★ pass. */
  readonly referenceSolution?: string;
  /**
   * Optional stage-authored explanation of *what specifically failed*
   * for a given grade. The results modal renders this in place of its
   * generic "pass condition wasn't met" line, so a player who just
   * failed sees the missed threshold and their actual number — e.g.
   * "Need 30 delivered, you got 12 — try setStrategy('etd')."
   *
   * Only invoked when `passFn` returns `false`. Stages without a
   * `failHint` keep the generic fallback so the schema stays
   * non-breaking.
   */
  readonly failHint?: (grade: GradeInputs) => string;
}
