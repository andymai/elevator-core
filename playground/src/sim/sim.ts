import type {
  EventDto,
  MetricsDto,
  RepositionStrategyName,
  Snapshot,
  StrategyName,
  TrafficMode,
} from "../types";

// Thin TS wrapper around `WasmSim`. The wasm-bindgen generated class
// (in public/pkg/elevator_wasm.d.ts) carries full type info for DTOs,
// but the dynamic import prevents static type-checking at the boundary.
// These interfaces keep the wrapper self-describing.

interface WasmModule {
  default: (input?: unknown) => Promise<unknown>;
  WasmSim: WasmSimCtor;
  builtinStrategies: () => string[];
}

interface WasmSimCtor {
  new (configRon: string, strategy: string, reposition?: string): WasmSimInstance;
}

interface WasmSimInstance {
  stepMany(n: number): void;
  dt(): number;
  currentTick(): bigint;
  strategyName(): string;
  trafficMode(): string;
  setStrategy(name: string): boolean;
  spawnRider(origin: number, destination: number, weight: number, patienceTicks?: number): void;
  setTrafficRate(ridersPerMinute: number): void;
  trafficRate(): number;
  snapshot(): Snapshot;
  drainEvents(): EventDto[];
  metrics(): MetricsDto;
  waitingCountAt(stopId: number): number;
  free(): void;
  setMaxSpeedAll(speed: number): void;
  setWeightCapacityAll(capacityKg: number): void;
  setDoorOpenTicksAll(ticks: number): void;
  setDoorTransitionTicksAll(ticks: number): void;
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
  readonly #inner: WasmSimInstance;
  readonly #dt: number;

  constructor(inner: WasmSimInstance) {
    this.#inner = inner;
    this.#dt = inner.dt();
  }

  static async create(
    ron: string,
    strategy: StrategyName,
    reposition?: RepositionStrategyName,
  ): Promise<Sim> {
    const mod = await loadWasm();
    return new Sim(new mod.WasmSim(ron, strategy, reposition));
  }

  step(n: number): void {
    this.#inner.stepMany(n);
  }

  drainEvents(): EventDto[] {
    return this.#inner.drainEvents();
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

  trafficMode(): TrafficMode {
    return this.#inner.trafficMode() as TrafficMode;
  }

  setStrategy(name: StrategyName): boolean {
    return this.#inner.setStrategy(name);
  }

  spawnRider(origin: number, destination: number, weight: number, patienceTicks?: number): void {
    this.#inner.spawnRider(origin, destination, weight, patienceTicks);
  }

  setTrafficRate(ridersPerMinute: number): void {
    this.#inner.setTrafficRate(ridersPerMinute);
  }

  trafficRate(): number {
    return this.#inner.trafficRate();
  }

  snapshot(): Snapshot {
    return this.#inner.snapshot();
  }

  metrics(): MetricsDto {
    return this.#inner.metrics();
  }

  waitingCountAt(stopId: number): number {
    return this.#inner.waitingCountAt(stopId);
  }

  applyPhysicsLive(params: {
    maxSpeed: number;
    weightCapacityKg: number;
    doorOpenTicks: number;
    doorTransitionTicks: number;
  }): boolean {
    try {
      this.#inner.setMaxSpeedAll(params.maxSpeed);
      this.#inner.setWeightCapacityAll(params.weightCapacityKg);
      this.#inner.setDoorOpenTicksAll(params.doorOpenTicks);
      this.#inner.setDoorTransitionTicksAll(params.doorTransitionTicks);
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    this.#inner.free();
  }
}
