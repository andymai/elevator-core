import type { Pane } from "../features/compare-pane";
import type { TrafficDriver } from "../sim";
import type { PermalinkState } from "../domain";

export interface State {
  running: boolean;
  ready: boolean;
  permalink: PermalinkState;
  paneA: Pane | null;
  paneB: Pane | null;
  traffic: TrafficDriver;
  lastFrameTime: number;
  /**
   * Monotonic counter incremented at the start of every reset. An async reset
   * handler that finishes after a newer one started must abort, otherwise
   * its late `makePane` result overwrites the newer pane and the old Sim
   * stays referenced (and gets `step()`-ed on freed wasm memory next frame).
   */
  initToken: number;
  /**
   * Progressive pre-seed state for scenarios with `seedSpawns > 0`.
   * Instead of blocking the loader on hundreds of synchronous
   * `spawnRider` calls, we hand the quota to the render loop and
   * inject a per-frame batch until `remaining` hits zero. `null`
   * when not seeding (the common case for day-cycle scenarios).
   */
  seeding: { remaining: number } | null;
}
