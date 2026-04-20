import type { BubbleEvent, Metrics, Snapshot, StrategyName, TrafficMode } from "./types";

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
  trafficMode?(): string;
  setStrategy(name: string): boolean;
  spawnRider(
    origin: number,
    destination: number,
    weight: number,
    patienceTicks?: number,
  ): void;
  setTrafficRate(ridersPerMinute: number): void;
  trafficRate(): number;
  snapshot(): unknown;
  drainEvents(): unknown;
  metrics(): unknown;
  waitingCountAt(stopId: number): number;
  free(): void;
  // Live elevator-physics setters (uniform across every car). Optional
  // until a fresh wasm-pack build ships them; the playground falls back
  // to a sim rebuild when absent so a stale `public/pkg/` doesn't break
  // local dev.
  setMaxSpeedAll?(speed: number): void;
  setWeightCapacityAll?(capacityKg: number): void;
  setDoorOpenTicksAll?(ticks: number): void;
  setDoorTransitionTicksAll?(ticks: number): void;
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

  /**
   * Drain queued sim events into a typed array. Called once per frame
   * by the playground's render pipeline to update per-car speech
   * bubbles; also keeps the wasm `EventBus` from growing without bound
   * during long sessions (previously the bus was drained-and-discarded
   * inside `step` for exactly that reason).
   */
  drainEvents(): BubbleEvent[] {
    const raw = this.#inner.drainEvents();
    // The wasm bindgen surface returns `unknown` because the Rust side
    // serialises via `serde-wasm-bindgen`. The DTO shape is authored in
    // `crates/elevator-wasm/src/dto.rs` and mirrored by `BubbleEvent`;
    // the tagged-union `kind: string` fallback absorbs any future variant
    // the UI doesn't special-case.
    return (raw as BubbleEvent[] | null | undefined) ?? [];
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

  /**
   * Current traffic mode from the core TrafficDetector. Returns
   * `"Idle"` when the getter is missing from a stale `public/pkg/`
   * build, keeping the UI robust across wasm rebuilds.
   */
  trafficMode(): TrafficMode {
    return (this.#inner.trafficMode?.() as TrafficMode) ?? "Idle";
  }

  setStrategy(name: StrategyName): boolean {
    return this.#inner.setStrategy(name);
  }

  spawnRider(
    origin: number,
    destination: number,
    weight: number,
    patienceTicks?: number,
  ): void {
    this.#inner.spawnRider(origin, destination, weight, patienceTicks);
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

  metrics(): Metrics {
    return this.#inner.metrics() as Metrics;
  }

  waitingCountAt(stopId: number): number {
    return this.#inner.waitingCountAt(stopId);
  }

  /**
   * Hot-swap building physics across every elevator. Returns `true`
   * when the wasm setters were available and applied; `false` when
   * the live build predates them (caller can fall back to a full
   * sim rebuild). All four parameters are applied as a unit so a
   * partial swap can't leave the sim in an inconsistent state.
   */
  applyPhysicsLive(params: {
    maxSpeed: number;
    weightCapacityKg: number;
    doorOpenTicks: number;
    doorTransitionTicks: number;
  }): boolean {
    const w = this.#inner;
    if (
      !w.setMaxSpeedAll ||
      !w.setWeightCapacityAll ||
      !w.setDoorOpenTicksAll ||
      !w.setDoorTransitionTicksAll
    ) {
      return false;
    }
    // Each `setAll` is a `wasm_bindgen` function that throws on the
    // underlying `SimError` (validation failures, non-finite inputs).
    // Slider bounds plus `Math.max(1, ...)` in params.ts mean we
    // shouldn't hit that path — but if we do, swallow the throw and
    // report "not all live" so the caller falls back to a full
    // `resetAll` rather than leaving the sim partially mutated (which
    // in compare mode could desync the two panes).
    try {
      w.setMaxSpeedAll(params.maxSpeed);
      w.setWeightCapacityAll(params.weightCapacityKg);
      w.setDoorOpenTicksAll(params.doorOpenTicks);
      w.setDoorTransitionTicksAll(params.doorTransitionTicks);
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    this.#inner.free();
  }
}
