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
 * We override on `self` *and on every prototype up the chain*. The
 * banned globals (`fetch`, `WebSocket`, etc.) live on
 * `WorkerGlobalScope.prototype`, which is two hops above
 * `DedicatedWorkerGlobalScope`. Shadowing only the first level still
 * lets a hostile controller reach the original via
 * `Object.getPrototypeOf(Object.getPrototypeOf(self)).fetch.call(self, …)`.
 * Walking until `null` covers the chain regardless of how vendors
 * structure it. Each override is wrapped in try/catch — best-effort
 * rather than all-or-nothing — since some prototype slots are
 * non-configurable.
 */
function lockdownWorkerGlobals(): void {
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
  // Always shadow on the instance so direct `self.fetch` resolves to
  // `undefined`. Then walk the prototype chain and clear at every
  // level that owns the name — but stop short of `Object.prototype`
  // so we don't pollute every plain object in the worker. In
  // practice the banned names are own properties of either
  // `WorkerGlobalScope.prototype` or its dedicated subclass.
  const instance = self as unknown as Record<string, unknown>;
  for (const name of banned) {
    try {
      instance[name] = undefined;
    } catch {
      /* non-writable on the instance — best-effort */
    }
  }
  let level: unknown = Object.getPrototypeOf(self);
  while (level !== null && level !== Object.prototype) {
    const bag = level as Record<string, unknown>;
    for (const name of banned) {
      if (!Object.prototype.hasOwnProperty.call(bag, name)) continue;
      try {
        bag[name] = undefined;
      } catch {
        /* non-writable / non-configurable — best-effort */
      }
    }
    level = Object.getPrototypeOf(level);
  }
}

/**
 * Wrap the wasm sim in a Proxy that gates method access by the
 * stage's `unlockedApi`. A locked method throws a stage-aware error
 * pointing the player at what their stage actually unlocks; a name
 * that doesn't exist on the underlying sim falls through unchanged
 * (typo'd properties read as `undefined`, matching the bare wasm
 * surface). `null` skips gating entirely — the controller sees the
 * full sim, matching pre-Q-16 behaviour.
 */
function gatedSim(
  realSim: WasmSimInstance,
  unlockedApi: readonly string[] | null,
): WasmSimInstance {
  if (unlockedApi === null) return realSim;
  const allowed = new Set(unlockedApi);
  const proxy = new Proxy(realSim as unknown as Record<string, unknown>, {
    get(target, prop, receiver) {
      if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
      const raw = Reflect.get(target, prop, receiver);
      // Non-functions (snapshots, fields) and unlocked methods both
      // pass through. Unknown properties also pass through —
      // returning `undefined` matches what plain wasm would do and
      // surfaces typos as `not a function` from the call site.
      if (typeof raw !== "function" || allowed.has(prop)) {
        return typeof raw === "function" ? raw.bind(target) : raw;
      }
      return () => {
        throw new Error(
          `sim.${prop} is locked at this stage. Unlocked methods: ${[...allowed].sort().join(", ") || "(none)"}.`,
        );
      };
    },
  });
  return proxy as unknown as WasmSimInstance;
}

function handleLoadController(
  id: number,
  source: string,
  unlockedApi: readonly string[] | null,
): void {
  if (!sim) {
    post({ kind: "error", id, message: "load-controller before init" });
    return;
  }
  lockdownWorkerGlobals();
  try {
    // Compile the player's source as a function body and run it once
    // against a gated sim handle. Combined with the worker thread's
    // global lockdown, the controller is now bounded both by the
    // worker boundary (no DOM, no network) and by the per-stage
    // unlockedApi list (only the methods the curriculum has
    // introduced so far).
    //
    // No timeout in this PR — `Function`-compiled code can't be
    // interrupted from inside the worker. The host-side
    // `loadController` adds a race-against-timeout.
    const FunctionCtor = Function;
    const factory = FunctionCtor("sim", `"use strict";\n${source}`) as (
      simArg: WasmSimInstance,
    ) => void;
    factory(gatedSim(sim, unlockedApi));
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
      handleLoadController(msg.id, msg.source, msg.unlockedApi);
      return;
    default: {
      // Reply with an error on the request id so the host's pending
      // promise rejects instead of hanging forever. Casting to silence
      // the exhaustive-switch narrowing — by definition we're here
      // because the protocol added a kind the worker doesn't handle.
      const unknown = msg as { id?: number; kind?: string };
      if (typeof unknown.id === "number") {
        post({
          kind: "error",
          id: unknown.id,
          message: `worker: unknown message kind "${String(unknown.kind)}"`,
        });
      }
      return;
    }
  }
});
