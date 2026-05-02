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
    // A wasm panic or unhandled worker exception fires `error` /
    // `messageerror` on the `Worker` object itself, not `message`. Without
    // these listeners every pending promise hangs forever instead of
    // rejecting — and the next request silently posts into a worker
    // that's already dead.
    this.#worker.addEventListener("error", this.#onWorkerError);
    this.#worker.addEventListener("messageerror", this.#onWorkerError);
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

  /**
   * Run player-authored controller code against the worker's sim.
   *
   * The source is compiled and executed once with `sim` in scope; any
   * registered callbacks (e.g. `sim.setStrategyJs(name, rank)`) fire
   * on subsequent ticks. Throws if the source fails to compile or
   * the controller throws during execution.
   *
   * Pass `timeoutMs` to bound how long the controller's initial run
   * may take. On timeout the host promise rejects; the worker thread
   * itself is still alive but blocked, so the stage runner that wraps
   * this call should `dispose()` and re-spawn the handle. Callers
   * that don't supply a timeout get the underlying request's
   * unbounded wait — fine for trusted controllers but unsafe for
   * student-facing stages.
   */
  async loadController(source: string, timeoutMs?: number): Promise<void> {
    const request = this.#request<undefined>({
      kind: "load-controller",
      id: this.#takeId(),
      source,
    });
    if (timeoutMs === undefined) {
      await request;
      return;
    }
    // Attach a `.catch` so the underlying request promise has a
    // handler regardless of which side of the race wins. Otherwise:
    // when the timeout fires first, `Promise.race` rejects and we
    // throw, but the request is still pending. A later `dispose()`
    // rejects every entry in `#pending`, and that rejection lands on
    // an unhandled promise — every student timeout produces a noisy
    // "Uncaught (in promise) WorkerSim disposed" in the console.
    request.catch(() => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`controller did not return within ${timeoutMs}ms`));
      }, timeoutMs);
    });
    try {
      await Promise.race([request, timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
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
    this.#worker.removeEventListener("error", this.#onWorkerError);
    this.#worker.removeEventListener("messageerror", this.#onWorkerError);
    this.#worker.terminate();
    this.#rejectAllPending(new Error("WorkerSim disposed"));
  }

  #rejectAllPending(reason: Error): void {
    for (const resolver of this.#pending.values()) {
      resolver.reject(reason);
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

  readonly #onWorkerError = (event: Event): void => {
    // `ErrorEvent.message` is the most useful detail. Duck-type the
    // property instead of `instanceof ErrorEvent` so the same code
    // path works in node-based test envs that don't ship the DOM
    // class as a global.
    const candidate: unknown = (event as { message?: unknown }).message;
    const message =
      typeof candidate === "string" && candidate.length > 0
        ? candidate
        : "worker errored before responding";
    this.#disposed = true;
    this.#worker.terminate();
    this.#rejectAllPending(new Error(message));
  };

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
