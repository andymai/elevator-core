/**
 * Wire format for the Quest worker.
 *
 * The worker owns a `WasmSim` and runs every operation against it on the
 * worker thread. The main thread keeps a `WorkerSim` handle that wraps
 * `postMessage` in a promise-based API.
 *
 * Each request carries a numeric `id` so the host can correlate the
 * matching response — the worker replies in order today, but pinning
 * that as a contract via `id` lets us add concurrent requests later
 * without breaking callers.
 */

import type { EventDto, MetricsDto, Snapshot, StrategyName } from "../../types";

/** Init payload sent by the host before any tick request. */
export interface InitPayload {
  /** RON-encoded `SimConfig`. */
  readonly configRon: string;
  /** Built-in dispatch strategy name. */
  readonly strategy: StrategyName;
  /** Reposition strategy name; omit to use the scenario default. */
  readonly reposition?: string;
  /**
   * URL of `pkg/elevator_wasm.js`, resolved on the host against
   * `document.baseURI`. Workers don't have `document`, so the host
   * resolves the deploy-aware path once and forwards it.
   */
  readonly wasmJsUrl: string;
  /** URL of `pkg/elevator_wasm_bg.wasm`, resolved the same way. */
  readonly wasmBgUrl: string;
}

/**
 * Snapshot bundle returned after a `tick` request.
 *
 * `snapshot` and `events` are only populated when the host requested
 * visuals (`wantVisuals: true` on the `TickRequest`). In the headless
 * grading path they're undefined — the worker skips both wasm calls
 * entirely so we don't pay for snapshot serialization or event drain
 * on every batch when only `metrics` + `tick` are read.
 */
export interface TickResultPayload {
  readonly tick: number;
  readonly metrics: MetricsDto;
  readonly snapshot?: Snapshot;
  readonly events?: readonly EventDto[];
}

// ─── Host → Worker ──────────────────────────────────────────────────

export interface InitRequest {
  readonly kind: "init";
  readonly id: number;
  readonly payload: InitPayload;
}

export interface TickRequest {
  readonly kind: "tick";
  readonly id: number;
  readonly ticks: number;
  /**
   * Set true when the host needs the snapshot + event bundle for a
   * visualizer or replay. Default false — saves a wasm `snapshot()`
   * and a wasm `drainEvents()` per batch in the headless grading
   * path, which on stage-15-scale configs is a measurable win.
   */
  readonly wantVisuals?: boolean;
}

export interface SpawnRiderRequest {
  readonly kind: "spawn-rider";
  readonly id: number;
  readonly origin: number;
  readonly destination: number;
  readonly weight: number;
  readonly patienceTicks?: number;
}

export interface SetStrategyRequest {
  readonly kind: "set-strategy";
  readonly id: number;
  readonly strategy: StrategyName;
}

export interface ResetRequest {
  readonly kind: "reset";
  readonly id: number;
  readonly payload: InitPayload;
}

/**
 * Run player-authored controller code against the wasm sim.
 *
 * The worker compiles `source` as a function body that receives `sim`
 * as its only argument and executes it once. The `sim` handed to the
 * controller is a Proxy that gates calls by `unlockedApi`: methods in
 * the list pass through to the underlying wasm sim, methods not in
 * the list throw a stage-aware error. Untrusted code is isolated in
 * the worker thread (no DOM, no parent globals).
 *
 * Pass an empty `unlockedApi` to lock everything (mostly useful for
 * tests). Pass `null` to disable gating entirely — the controller
 * sees the full sim surface.
 */
export interface LoadControllerRequest {
  readonly kind: "load-controller";
  readonly id: number;
  readonly source: string;
  readonly unlockedApi: readonly string[] | null;
}

export type HostToWorker =
  | InitRequest
  | TickRequest
  | SpawnRiderRequest
  | SetStrategyRequest
  | ResetRequest
  | LoadControllerRequest;

// ─── Worker → Host ──────────────────────────────────────────────────

export interface OkResponse {
  readonly kind: "ok";
  readonly id: number;
}

export interface TickResponse {
  readonly kind: "tick-result";
  readonly id: number;
  readonly result: TickResultPayload;
}

export interface SpawnResponse {
  readonly kind: "spawn-result";
  readonly id: number;
  readonly riderId: bigint | null;
  readonly error: string | null;
}

export interface ErrorResponse {
  readonly kind: "error";
  readonly id: number;
  readonly message: string;
}

export type WorkerToHost = OkResponse | TickResponse | SpawnResponse | ErrorResponse;
