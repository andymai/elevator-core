/**
 * Quest stage registry.
 *
 * Stages are listed in display order. The registry is intentionally a
 * simple array so the picker UI (Q-12+) can iterate it directly. New
 * stages add an export from a `stage-NN-slug.ts` module and append it
 * here — no central type wrangling required.
 */

import type { Stage } from "./types";
import { STAGE_01_FIRST_FLOOR } from "./stage-01-first-floor";

export const STAGES: readonly Stage[] = [STAGE_01_FIRST_FLOOR];

/** Look up a stage by id. Returns `undefined` if no match. */
export function stageById(id: string): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

export type { Stage, Baseline, UnlockedApi, GradeInputs, PassFn, StarFn } from "./types";
