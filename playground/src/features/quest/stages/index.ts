/**
 * Quest stage registry.
 *
 * Stages are listed in display order. The registry is a simple
 * array so the picker UI can iterate it directly. New stages export
 * from a `stage-NN-slug.ts` module and append it here — no central
 * type wrangling required.
 */

import type { Stage } from "./types";
import { STAGE_01_FIRST_FLOOR } from "./stage-01-first-floor";
import { STAGE_02_LISTEN_UP } from "./stage-02-listen-up";
import { STAGE_03_CAR_BUTTONS } from "./stage-03-car-buttons";
import { STAGE_04_BUILTIN } from "./stage-04-builtin";
import { STAGE_05_CHOOSE } from "./stage-05-choose";
import { STAGE_06_RANK_FIRST } from "./stage-06-rank-first";
import { STAGE_07_BEAT_ETD } from "./stage-07-beat-etd";
import { STAGE_08_EVENTS } from "./stage-08-events";
import { STAGE_09_MANUAL } from "./stage-09-manual";
import { STAGE_10_HOLD_DOORS } from "./stage-10-hold-doors";
import { STAGE_11_FIRE_ALARM } from "./stage-11-fire-alarm";
import { STAGE_12_ROUTES } from "./stage-12-routes";
import { STAGE_13_TRANSFERS } from "./stage-13-transfers";
import { STAGE_14_BUILD_FLOOR } from "./stage-14-build-floor";
import { STAGE_15_SKY_LOBBY } from "./stage-15-sky-lobby";

export const STAGES: readonly Stage[] = [
  STAGE_01_FIRST_FLOOR,
  STAGE_02_LISTEN_UP,
  STAGE_03_CAR_BUTTONS,
  STAGE_04_BUILTIN,
  STAGE_05_CHOOSE,
  STAGE_06_RANK_FIRST,
  STAGE_07_BEAT_ETD,
  STAGE_08_EVENTS,
  STAGE_09_MANUAL,
  STAGE_10_HOLD_DOORS,
  STAGE_11_FIRE_ALARM,
  STAGE_12_ROUTES,
  STAGE_13_TRANSFERS,
  STAGE_14_BUILD_FLOOR,
  STAGE_15_SKY_LOBBY,
];

/** Look up a stage by id. Returns `undefined` if no match. */
export function stageById(id: string): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

/**
 * Resolve the stage immediately following `currentId` in the registry's
 * display order, or `undefined` if `currentId` is the last stage or
 * isn't in the registry. Powers the results modal's "Next stage" CTA.
 */
export function nextStage(currentId: string): Stage | undefined {
  const idx = STAGES.findIndex((s) => s.id === currentId);
  if (idx < 0) return undefined;
  return STAGES[idx + 1];
}

export type {
  Stage,
  StageSection,
  Baseline,
  StarCount,
  UnlockedApi,
  SeededRider,
  GradeInputs,
  PassFn,
  StarFn,
} from "./types";
