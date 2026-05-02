/**
 * Main-thread handle for the Quest worker.
 *
 * Wraps the typed `postMessage` protocol in a promise-based API. Each
 * outbound request gets a unique numeric id; the matching response
 * resolves a pending promise stored in the `pending` map.
 */

import type { RepositionStrategyName, StrategyName } from "../../types";
import type { HostToWorker, InitPayload, TickResultPayload, WorkerToHost } from "./protocol";

interface PendingResolver {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export interface WorkerSimOptions {
  readonly configRon: string;
  readonly strategy: StrategyName;
  readonly reposition?: RepositionStrategyName;
}

/** Instantiate a Quest worker and complete its `init` handshake. */
export async function createWorkerSim(opts: WorkerSimOptions): Promise<WorkerSim> {
  // Vite bundles `?worker` imports as a separate chunk and produces a
  // constructor that builds a fresh Worker per call. The `module`
  // type lets the worker use ESM `import` for protocol types.
  const QuestWorker = (await import("./worker.ts?worker")).default;
  const worker = new QuestWorker();
  const handle = new WorkerSim(worker);
  await handle.init(opts);
  return handle;
}

export class WorkerSim {
  readonly #worker: Worker;
  readonly #pending = new Map<number, PendingResolver>();
  #nextId = 1;
  #disposed = false;

  constructor(worker: Worker) {
    this.#worker = worker;
    this.#worker.addEventListener("message", this.#onMessage);
  }

  async init(opts: WorkerSimOptions): Promise<void> {
    await this.#request<undefined>({
      kind: "init",
      id: this.#takeId(),
      payload: this.#payload(opts),
    });
  }

  async tick(ticks: number): Promise<TickResultPayload> {
    return this.#request<TickResultPayload>({
      kind: "tick",
      id: this.#takeId(),
      ticks,
    });
  }

  async spawnRider(
    origin: number,
    destination: number,
    weight: number,
    patienceTicks?: number,
  ): Promise<bigint> {
    return this.#request<bigint>({
      kind: "spawn-rider",
      id: this.#takeId(),
      origin,
      destination,
      weight,
      // `exactOptionalPropertyTypes` rejects an explicit `undefined` on
      // an optional field — spread when present so the request shape
      // matches the protocol type literally.
      ...(patienceTicks !== undefined ? { patienceTicks } : {}),
    });
  }

  async setStrategy(strategy: StrategyName): Promise<void> {
    await this.#request<undefined>({
      kind: "set-strategy",
      id: this.#takeId(),
      strategy,
    });
  }

  async reset(opts: WorkerSimOptions): Promise<void> {
    await this.#request<undefined>({
      kind: "reset",
      id: this.#takeId(),
      payload: this.#payload(opts),
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#worker.removeEventListener("message", this.#onMessage);
    this.#worker.terminate();
    const err = new Error("WorkerSim disposed");
    for (const resolver of this.#pending.values()) {
      resolver.reject(err);
    }
    this.#pending.clear();
  }

  #takeId(): number {
    return this.#nextId++;
  }

  #payload(opts: WorkerSimOptions): InitPayload {
    // `document.baseURI` resolves the deploy-aware path so a
    // GitHub-Pages subpath deploy (`/elevator-core/playground/`) ends
    // up with the right wasm URL. Workers don't have `document`, so we
    // resolve once on the host and forward the absolute URL.
    const wasmJsUrl = new URL("pkg/elevator_wasm.js", document.baseURI).href;
    const wasmBgUrl = new URL("pkg/elevator_wasm_bg.wasm", document.baseURI).href;
    return {
      configRon: opts.configRon,
      strategy: opts.strategy,
      wasmJsUrl,
      wasmBgUrl,
      ...(opts.reposition !== undefined ? { reposition: opts.reposition } : {}),
    };
  }

  async #request<T>(msg: HostToWorker): Promise<T> {
    if (this.#disposed) {
      throw new Error("WorkerSim disposed");
    }
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(msg.id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.#worker.postMessage(msg);
    });
  }

  readonly #onMessage = (event: MessageEvent<WorkerToHost>): void => {
    const msg = event.data;
    const resolver = this.#pending.get(msg.id);
    if (!resolver) {
      // Late reply for an already-disposed request, or a bug. Either
      // way it's not actionable here.
      return;
    }
    this.#pending.delete(msg.id);
    switch (msg.kind) {
      case "ok":
        resolver.resolve(undefined);
        return;
      case "tick-result":
        resolver.resolve(msg.result);
        return;
      case "spawn-result":
        if (msg.error !== null) {
          resolver.reject(new Error(msg.error));
        } else {
          resolver.resolve(msg.riderId);
        }
        return;
      case "error":
        resolver.reject(new Error(msg.message));
        return;
    }
  };
}
