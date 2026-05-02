/// <reference lib="webworker" />
/**
 * Quest worker entry. Owns a `WasmSim` and answers requests from the
 * host. Each response carries the request's `id` so the host can match
 * it against a pending promise.
 *
 * The worker doesn't drive its own loop — the host pulls ticks via
 * `tick` requests at the cadence it wants. Keeping that pull-model
 * here matches the existing playground's main-thread pattern where
 * `requestAnimationFrame` decides when to step.
 */
declare const self: DedicatedWorkerGlobalScope;

import type { HostToWorker, InitPayload, TickResultPayload, WorkerToHost } from "./protocol";

interface WasmModule {
  default: (input: string) => Promise<unknown>;
  WasmSim: WasmSimCtor;
}

interface WasmSimCtor {
  new (configRon: string, strategy: string, reposition?: string): WasmSimInstance;
}

interface WasmSimInstance {
  stepMany(n: number): void;
  currentTick(): bigint;
  setStrategy(name: string): boolean;
  spawnRider(
    origin: number,
    destination: number,
    weight: number,
    patienceTicks?: number,
  ): { kind: "ok"; value: bigint } | { kind: "err"; error: string };
  snapshot(): TickResultPayload["snapshot"];
  drainEvents(): TickResultPayload["events"][number][];
  metrics(): TickResultPayload["metrics"];
  free(): void;
}

let sim: WasmSimInstance | null = null;

function post(msg: WorkerToHost): void {
  self.postMessage(msg);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function loadAndConstruct(payload: InitPayload): Promise<WasmSimInstance> {
  // `@vite-ignore` keeps Vite from trying to bundle the URL — at
  // runtime it's whatever path the host resolved against
  // `document.baseURI`, and that path doesn't exist relative to the
  // worker bundle. The worker just imports it raw.
  const mod = (await import(/* @vite-ignore */ payload.wasmJsUrl)) as WasmModule;
  await mod.default(payload.wasmBgUrl);
  return new mod.WasmSim(payload.configRon, payload.strategy, payload.reposition);
}

async function handleInit(id: number, payload: InitPayload): Promise<void> {
  try {
    sim?.free();
    sim = await loadAndConstruct(payload);
    post({ kind: "ok", id });
  } catch (err) {
    sim = null;
    post({ kind: "error", id, message: errorMessage(err) });
  }
}

function handleTick(id: number, ticks: number): void {
  if (!sim) {
    post({ kind: "error", id, message: "tick before init" });
    return;
  }
  try {
    sim.stepMany(ticks);
    const result: TickResultPayload = {
      snapshot: sim.snapshot(),
      tick: Number(sim.currentTick()),
      events: sim.drainEvents(),
      metrics: sim.metrics(),
    };
    post({ kind: "tick-result", id, result });
  } catch (err) {
    post({ kind: "error", id, message: errorMessage(err) });
  }
}

function handleSpawnRider(
  id: number,
  origin: number,
  destination: number,
  weight: number,
  patienceTicks: number | undefined,
): void {
  if (!sim) {
    post({ kind: "error", id, message: "spawn-rider before init" });
    return;
  }
  try {
    const r = sim.spawnRider(origin, destination, weight, patienceTicks);
    if (r.kind === "ok") {
      post({ kind: "spawn-result", id, riderId: r.value, error: null });
    } else {
      post({ kind: "spawn-result", id, riderId: null, error: r.error });
    }
  } catch (err) {
    post({ kind: "error", id, message: errorMessage(err) });
  }
}

function handleSetStrategy(id: number, strategy: string): void {
  if (!sim) {
    post({ kind: "error", id, message: "set-strategy before init" });
    return;
  }
  try {
    const ok = sim.setStrategy(strategy);
    if (ok) {
      post({ kind: "ok", id });
    } else {
      post({ kind: "error", id, message: `unknown strategy: ${strategy}` });
    }
  } catch (err) {
    post({ kind: "error", id, message: errorMessage(err) });
  }
}

/**
 * Strip network-capable globals before running untrusted code.
 *
 * The worker context is *less* isolated than the comment originally
 * claimed: workers retain `fetch`, `WebSocket`, `BroadcastChannel`,
 * the `Worker` constructor, and `importScripts`, any of which would
 * let player code exfiltrate data or pull in arbitrary external
 * script. wasm is already loaded by the time we get here — none of
 * these are needed for sim operations afterwards.
 *
 * We override on both the instance (`self`) and the prototype
 * (`WorkerGlobalScope.prototype`). Without the prototype hop a hostile
 * controller could sidestep the instance shadowing via
 * `Object.getPrototypeOf(self).fetch.call(self, ...)`. Idempotent
 * across calls because subsequent overrides set the same `undefined`.
 */
function lockdownWorkerGlobals(): void {
  const g = self as unknown as Record<string, unknown>;
  const proto: unknown = Object.getPrototypeOf(self);
  const protoBag =
    proto !== null && typeof proto === "object" ? (proto as Record<string, unknown>) : null;
  const banned = [
    "fetch",
    "WebSocket",
    "EventSource",
    "BroadcastChannel",
    "Worker",
    "SharedWorker",
    "importScripts",
    "XMLHttpRequest",
  ];
  for (const name of banned) {
    g[name] = undefined;
    if (protoBag) protoBag[name] = undefined;
  }
}

function handleLoadController(id: number, source: string): void {
  if (!sim) {
    post({ kind: "error", id, message: "load-controller before init" });
    return;
  }
  lockdownWorkerGlobals();
  try {
    // Compile the player's source as a function body and run it once
    // against the live sim handle. Combined with the lockdown above,
    // the worker thread is now meaningfully isolated: no DOM, no
    // network, no script-loading. The `sim` argument is the only
    // engine-side surface the controller can touch. Strict mode keeps
    // user code from polluting the worker scope via implicit globals.
    //
    // No timeout in this PR — `Function`-compiled code can't be
    // interrupted from inside the worker (synchronous infinite loops
    // block the message loop). The host-side `loadController` adds a
    // race-against-timeout that rejects on the host side; tearing
    // down + re-spawning the worker on timeout is the stage-runner's
    // job once it ships in Q-09+.
    const FunctionCtor = Function;
    const factory = FunctionCtor("sim", `"use strict";\n${source}`) as (
      simArg: WasmSimInstance,
    ) => void;
    factory(sim);
    post({ kind: "ok", id });
  } catch (err) {
    post({ kind: "error", id, message: errorMessage(err) });
  }
}

self.addEventListener("message", (event: MessageEvent<HostToWorker>) => {
  const msg = event.data;
  switch (msg.kind) {
    case "init":
      void handleInit(msg.id, msg.payload);
      return;
    case "reset":
      void handleInit(msg.id, msg.payload);
      return;
    case "tick":
      handleTick(msg.id, msg.ticks);
      return;
    case "spawn-rider":
      handleSpawnRider(msg.id, msg.origin, msg.destination, msg.weight, msg.patienceTicks);
      return;
    case "set-strategy":
      handleSetStrategy(msg.id, msg.strategy);
      return;
    case "load-controller":
      handleLoadController(msg.id, msg.source);
      return;
  }
});
