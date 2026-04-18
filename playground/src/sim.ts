import type { Metrics, SimEvent, Snapshot, StrategyName } from "./types";

// Thin TS wrapper around `WasmSim` that narrows JS values returned by
// serde-wasm-bindgen to our typed DTOs. Kept deliberately small — we don't
// want a leaky abstraction over the bindgen surface.

interface WasmModule {
  default: (input?: unknown) => Promise<unknown>;
  WasmSim: WasmSimCtor;
  builtinStrategies: () => string[];
}

interface WasmSimCtor {
  new (configRon: string, strategy: string): WasmSimInstance;
}

interface WasmSimInstance {
  stepMany(n: number): void;
  dt(): number;
  currentTick(): bigint;
  strategyName(): string;
  setStrategy(name: string): boolean;
  spawnRider(origin: number, destination: number, weight: number): void;
  setTrafficRate(ridersPerMinute: number): void;
  trafficRate(): number;
  snapshot(): unknown;
  drainEvents(): unknown;
  metrics(): unknown;
  waitingCountAt(stopId: number): number;
  free(): void;
}

let modPromise: Promise<WasmModule> | null = null;

/** Load the wasm-pack bundle exactly once and cache the resolved module. */
export async function loadWasm(): Promise<WasmModule> {
  if (!modPromise) {
    // Resolve relative to the document, not the bundled module URL. Vite's
    // `base: "./"` rewrites static hrefs in HTML to be page-relative, but
    // `import.meta.env.BASE_URL` evaluates to the literal `"./"` at runtime.
    // A dynamic `import("./pkg/...")` from a module under `/assets/` then
    // resolves against the module's URL → `/assets/pkg/...` → 404. Building
    // the URL via `document.baseURI` resolves against the page in both
    // local dev (`http://localhost:5173/`) and the subpath deploy
    // (`https://andymai.github.io/elevator-core/playground/`).
    const url = new URL("pkg/elevator_wasm.js", document.baseURI).href;
    const wasmUrl = new URL("pkg/elevator_wasm_bg.wasm", document.baseURI).href;
    modPromise = import(/* @vite-ignore */ url).then(async (mod) => {
      await (mod as WasmModule).default(wasmUrl);
      return mod as WasmModule;
    });
  }
  return modPromise;
}

/** Typed, disposable wrapper around `WasmSim`. */
export class Sim {
  #inner: WasmSimInstance;
  #dt: number;

  constructor(inner: WasmSimInstance) {
    this.#inner = inner;
    this.#dt = inner.dt();
  }

  static async create(ron: string, strategy: StrategyName): Promise<Sim> {
    const mod = await loadWasm();
    return new Sim(new mod.WasmSim(ron, strategy));
  }

  step(n: number): void {
    this.#inner.stepMany(n);
  }

  get dt(): number {
    return this.#dt;
  }

  tick(): number {
    // bigint → number is safe for any realistic playground session.
    return Number(this.#inner.currentTick());
  }

  strategyName(): StrategyName {
    return this.#inner.strategyName() as StrategyName;
  }

  setStrategy(name: StrategyName): boolean {
    return this.#inner.setStrategy(name);
  }

  spawnRider(origin: number, destination: number, weight: number): void {
    this.#inner.spawnRider(origin, destination, weight);
  }

  setTrafficRate(ridersPerMinute: number): void {
    this.#inner.setTrafficRate(ridersPerMinute);
  }

  trafficRate(): number {
    return this.#inner.trafficRate();
  }

  snapshot(): Snapshot {
    return this.#inner.snapshot() as Snapshot;
  }

  drainEvents(): SimEvent[] {
    return this.#inner.drainEvents() as SimEvent[];
  }

  metrics(): Metrics {
    return this.#inner.metrics() as Metrics;
  }

  waitingCountAt(stopId: number): number {
    return this.#inner.waitingCountAt(stopId);
  }

  dispose(): void {
    this.#inner.free();
  }
}
