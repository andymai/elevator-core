import type {
  EventDto,
  MetricsDto,
  RepositionStrategyName,
  ServiceModeName,
  Snapshot,
  StrategyName,
  TrafficMode,
  WorldView,
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
  worldView(): WorldView;
  drainEvents(): EventDto[];
  metrics(): MetricsDto;
  waitingCountAt(stopId: number): number;
  free(): void;
  setMaxSpeedAll(speed: number): void;
  setWeightCapacityAll(capacityKg: number): void;
  setDoorOpenTicksAll(ticks: number): void;
  setDoorTransitionTicksAll(ticks: number): void;
  // Manual control + service mode (BigInt entity refs come from worldView()).
  setServiceMode(elevatorRef: bigint, mode: string): void;
  pressHallCall(stopRef: bigint, direction: string): void;
  pressCarButton(elevatorRef: bigint, stopRef: bigint): void;
  openDoor(elevatorRef: bigint): void;
  closeDoor(elevatorRef: bigint): void;
  holdDoor(elevatorRef: bigint, ticks: number): void;
  cancelDoorHold(elevatorRef: bigint): void;
  setTargetVelocity(elevatorRef: bigint, velocity: number): void;
  emergencyStop(elevatorRef: bigint): void;
  addElevator(
    lineRef: bigint,
    startingPosition: number,
    maxSpeed?: number,
    weightCapacity?: number,
  ): bigint;
  removeElevator(elevatorRef: bigint): void;
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

  worldView(): WorldView {
    return this.#inner.worldView();
  }

  metrics(): MetricsDto {
    return this.#inner.metrics();
  }

  waitingCountAt(stopId: number): number {
    return this.#inner.waitingCountAt(stopId);
  }

  // ── Manual control + service mode ────────────────────────────────
  // Entity refs are bigint, sourced from `worldView()`. Mirrors the
  // wasm crate's section at crates/elevator-wasm/src/lib.rs (manual
  // control + service mode block).

  setServiceMode(elevatorRef: bigint, mode: ServiceModeName): void {
    this.#inner.setServiceMode(elevatorRef, mode);
  }

  pressHallCall(stopRef: bigint, direction: "up" | "down"): void {
    this.#inner.pressHallCall(stopRef, direction);
  }

  pressCarButton(elevatorRef: bigint, stopRef: bigint): void {
    this.#inner.pressCarButton(elevatorRef, stopRef);
  }

  openDoor(elevatorRef: bigint): void {
    this.#inner.openDoor(elevatorRef);
  }

  closeDoor(elevatorRef: bigint): void {
    this.#inner.closeDoor(elevatorRef);
  }

  holdDoor(elevatorRef: bigint, ticks: number): void {
    this.#inner.holdDoor(elevatorRef, ticks);
  }

  cancelDoorHold(elevatorRef: bigint): void {
    this.#inner.cancelDoorHold(elevatorRef);
  }

  setTargetVelocity(elevatorRef: bigint, velocity: number): void {
    this.#inner.setTargetVelocity(elevatorRef, velocity);
  }

  emergencyStop(elevatorRef: bigint): void {
    this.#inner.emergencyStop(elevatorRef);
  }

  addElevator(
    lineRef: bigint,
    startingPosition: number,
    options?: { maxSpeed?: number; weightCapacity?: number },
  ): bigint {
    return this.#inner.addElevator(
      lineRef,
      startingPosition,
      options?.maxSpeed,
      options?.weightCapacity,
    );
  }

  removeElevator(elevatorRef: bigint): void {
    this.#inner.removeElevator(elevatorRef);
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
