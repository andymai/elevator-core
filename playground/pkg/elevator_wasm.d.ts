/* tslint:disable */
/* eslint-disable */
/**
 * Aggregate metrics DTO. Wait/ride times are converted to seconds using the
 * sim\'s tick rate so the UI doesn\'t have to know about ticks.
 */
export interface MetricsDto {
    delivered: number;
    abandoned: number;
    spawned: number;
    settled: number;
    rerouted: number;
    throughput: number;
    avg_wait_s: number;
    max_wait_s: number;
    avg_ride_s: number;
    utilization: number;
    abandonment_rate: number;
    total_distance: number;
    total_moves: number;
}

/**
 * Flattened event DTO. Every variant includes a `kind` discriminator and the
 * engine tick at which it was emitted; the remaining fields vary by kind.
 * Unknown variants (added to core later) fall back to `{ kind: \"other\" }` so
 * the UI stays forward-compatible.
 */
export type EventDto = { kind: "rider-spawned"; tick: number; rider: number; origin: number; destination: number } | { kind: "rider-boarded"; tick: number; rider: number; elevator: number } | { kind: "rider-exited"; tick: number; rider: number; elevator: number; stop: number } | { kind: "rider-abandoned"; tick: number; rider: number; stop: number } | { kind: "elevator-arrived"; tick: number; elevator: number; stop: number } | { kind: "elevator-departed"; tick: number; elevator: number; stop: number } | { kind: "door-opened"; tick: number; elevator: number } | { kind: "door-closed"; tick: number; elevator: number } | { kind: "elevator-assigned"; tick: number; elevator: number; stop: number } | { kind: "elevator-repositioning"; tick: number; elevator: number; stop: number } | { kind: "other"; tick: number; label: string };

/**
 * Per-elevator rendering snapshot.
 */
export interface CarDto {
    /**
     * Stable entity id (hashable as a JS number).
     */
    id: number;
    /**
     * Line entity id the car belongs to (for multi-line rendering).
     */
    line: number;
    /**
     * Position along the shaft axis.
     */
    y: number;
    /**
     * Signed velocity (+up, -down).
     */
    v: number;
    /**
     * Short phase label (`idle`, `moving`, `repositioning`, `door-opening`,
     * `loading`, `door-closing`, `stopped`).
     */
    phase: "idle" | "moving" | "repositioning" | "door-opening" | "loading" | "door-closing" | "stopped" | "unknown";
    /**
     * Target stop entity id, if any.
     */
    target: number | undefined;
    /**
     * Current load weight.
     */
    load: number;
    /**
     * Capacity weight.
     */
    capacity: number;
    /**
     * Number of riders currently aboard.
     */
    riders: number;
    /**
     * Minimum y-position of a stop the car\'s line serves. Renderers
     * use this (with `max_served_y`) to draw the shaft channel only
     * over the range the car can actually reach — an express elevator
     * that skips mid floors gets a short visible shaft, while a
     * service elevator spanning the basement to the mechanical room
     * gets a long one.
     */
    min_served_y: number;
    /**
     * Maximum y-position of a stop the car\'s line serves.
     */
    max_served_y: number;
}

/**
 * Per-stop rendering snapshot.
 */
export interface StopDto {
    /**
     * Stable entity id (matches `CarDto.target` for rendering assignment lines).
     */
    entity_id: number;
    /**
     * Config-level `StopId`. The UI passes this back to `spawnRider` to
     * create riders between stops. Stops added at runtime (not present in
     * the initial config lookup) report `u32::MAX` as a sentinel so the UI
     * can reject them rather than silently routing riders to `StopId(0)`.
     */
    stop_id: number;
    /**
     * Human-readable stop name.
     */
    name: string;
    /**
     * Position along the shaft axis.
     */
    y: number;
    /**
     * Waiting rider count (O(1)).
     */
    waiting: number;
    /**
     * Waiting riders whose current route destination lies above this stop.
     * Partition of `waiting`; sum may be less than `waiting` for riders
     * without a Route (none in the playground, but the API is defensive).
     */
    waiting_up: number;
    /**
     * Waiting riders whose current route destination lies below this stop.
     */
    waiting_down: number;
    /**
     * Resident rider count (O(1)).
     */
    residents: number;
}

/**
 * Top-level snapshot returned by [`WasmSim::snapshot`](crate::WasmSim::snapshot).
 */
export interface Snapshot {
    /**
     * Current tick counter.
     */
    tick: number;
    /**
     * Seconds per tick.
     */
    dt: number;
    /**
     * Elevator cars.
     */
    cars: CarDto[];
    /**
     * Configured stops.
     */
    stops: StopDto[];
}


/**
 * Opaque simulation handle for JS.
 */
export class WasmSim {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Current tick counter.
     */
    currentTick(): bigint;
    /**
     * Drain all queued events since the last call.
     */
    drainEvents(): EventDto[];
    /**
     * Tick duration in seconds.
     */
    dt(): number;
    /**
     * Current aggregate metrics.
     */
    metrics(): MetricsDto;
    /**
     * Construct a new simulation from a RON-encoded [`SimConfig`] and a
     * dispatch strategy name (`"scan" | "look" | "nearest" | "etd" | "destination"`).
     *
     * # Errors
     *
     * Returns a JS error if the RON fails to parse, the config fails
     * validation, or `strategy` is not a recognised built-in.
     */
    constructor(config_ron: string, strategy: string, reposition?: string | null);
    /**
     * Active reposition strategy name (one of `adaptive | predictive
     * | lobby | spread | none`). Used by the playground to label the
     * second chip in each pane header.
     */
    repositionStrategyName(): string;
    /**
     * Swap every group's dispatcher to a DCS instance with the given
     * deferred-commitment window. `window_ticks = 0` is equivalent to
     * no window (immediate sticky).
     */
    setDcsWithCommitmentWindow(window_ticks: bigint): void;
    /**
     * Set `door_open_ticks` (dwell duration) on every elevator.
     *
     * Takes effect on the **next** door cycle — an in-progress dwell
     * completes its original timing to avoid visual glitches. See
     * [`Simulation::set_door_open_ticks`](elevator_core::sim::Simulation::set_door_open_ticks).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `ticks`
     * is zero.
     */
    setDoorOpenTicksAll(ticks: number): void;
    /**
     * Set `door_transition_ticks` (open- and close-transition duration)
     * on every elevator.
     *
     * Takes effect on the next door cycle. See
     * [`Simulation::set_door_transition_ticks`](elevator_core::sim::Simulation::set_door_transition_ticks).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `ticks`
     * is zero.
     */
    setDoorTransitionTicksAll(ticks: number): void;
    /**
     * Swap every group's dispatcher to a tuned ETD instance that
     * applies the group-time squared-wait fairness bonus. Higher
     * `weight` values bias dispatch more aggressively toward stops
     * with older waiters; `0.0` matches the default ETD.
     */
    setEtdWithWaitSquaredWeight(weight: number): void;
    /**
     * Flip every group in the sim into the DCS hall-call mode. Required
     * before `DestinationDispatch` can see rider destinations. Scenarios
     * that want DCS (e.g. the hotel) call this once on load.
     */
    setHallCallModeDestination(): void;
    /**
     * Set `max_speed` (m/s) on every elevator in the sim.
     *
     * Velocity is preserved across the change; the movement integrator
     * clamps to the new cap on the next tick. See
     * [`Simulation::set_max_speed`](elevator_core::sim::Simulation::set_max_speed).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `speed` is
     * not a positive finite number.
     */
    setMaxSpeedAll(speed: number): void;
    /**
     * Swap the reposition strategy by name. Returns `true` on success.
     * State is preserved — only the idle-parking policy changes.
     * Unknown names return `false` so the UI can round-trip arbitrary
     * dropdown values without panicking.
     *
     * Applies to every group unconditionally — the constructor path
     * is the only place scenario-declared reposition strategies get
     * preserved. A live swap signals "user wants this strategy now"
     * for all groups.
     */
    setReposition(name: string): boolean;
    /**
     * Install `PredictiveParking` as the reposition strategy for every
     * group, with the given rolling window. Used by the residential
     * scenario to spotlight arrival-rate-driven pre-positioning.
     */
    setRepositionPredictiveParking(window_ticks: bigint): void;
    /**
     * Swap the dispatch strategy by name. Returns `true` on success.
     *
     * State is preserved; only the assignment policy changes. Unknown names
     * return `false` so the UI can round-trip arbitrary dropdown values
     * without panicking.
     */
    setStrategy(name: string): boolean;
    /**
     * Record a target traffic rate (riders per minute). The playground driver
     * interprets this value externally and calls [`spawn_rider`](Self::spawn_rider)
     * accordingly — the core sim is unaffected so determinism is preserved.
     *
     * [`spawn_rider`]: Self::spawn_rider
     */
    setTrafficRate(riders_per_minute: number): void;
    /**
     * Set `weight_capacity` (kg) on every elevator in the sim.
     *
     * Applied immediately. A new cap below `current_load` leaves the
     * car temporarily overweight (no riders ejected); subsequent
     * boarding rejects further additions. See
     * [`Simulation::set_weight_capacity`](elevator_core::sim::Simulation::set_weight_capacity).
     *
     * # Errors
     *
     * Surfaces the underlying `SimError` as a `JsError` if `capacity`
     * is not a positive finite number.
     */
    setWeightCapacityAll(capacity: number): void;
    /**
     * Pull a cheap snapshot for rendering.
     */
    snapshot(): Snapshot;
    /**
     * Spawn a single rider between two stop ids at the given weight.
     *
     * When `patience_ticks` is provided (non-zero), the rider gets a
     * [`Patience`](elevator_core::components::Patience) budget —
     * riders waiting longer than that transition to `Abandoned` in
     * the `advance_transient` phase. Heavy-load scenarios need this
     * so queues can self-regulate: without abandonment, a two-car
     * office under a 65-riders/min lunchtime pattern grows its
     * waiting-count monotonically because demand persistently
     * exceeds cruise throughput and no one ever leaves.
     *
     * Pass `0` (or omit on the JS side via `undefined`) to disable
     * abandonment for this rider — preserves the pre-patience
     * behavior for scenarios that want bounded queues.
     *
     * # Errors
     *
     * Returns a JS error if either stop id is unknown, the rider is
     * rejected by the sim, or the `(origin, destination)` route
     * can't be auto-detected.
     */
    spawnRider(origin: number, destination: number, weight: number, patience_ticks?: number | null): void;
    /**
     * Step the simulation forward `n` ticks.
     */
    stepMany(n: number): void;
    /**
     * Active strategy name.
     */
    strategyName(): string;
    /**
     * Current traffic mode as classified by `TrafficDetector`.
     *
     * Returns one of `"Idle" | "UpPeak" | "InterFloor" | "DownPeak"`.
     * The UI renders this next to the strategy picker so users can see
     * `AdaptiveParking`'s mode-gated branching live as the simulation
     * swings between morning rush, midday drift, and evening rush.
     */
    trafficMode(): string;
    /**
     * Current traffic rate (riders/minute).
     */
    trafficRate(): number;
    /**
     * Convenience: waiting rider count at a specific stop id.
     */
    waitingCountAt(stop_id: number): number;
}

/**
 * List of built-in reposition-strategy names in a stable order (for
 * populating the "Park:" popover in the playground).
 */
export function builtinRepositionStrategies(): any[];

/**
 * List of built-in strategy names in a stable order (for populating dropdowns).
 */
export function builtinStrategies(): any[];

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmsim_free: (a: number, b: number) => void;
    readonly builtinRepositionStrategies: () => [number, number];
    readonly builtinStrategies: () => [number, number];
    readonly wasmsim_currentTick: (a: number) => bigint;
    readonly wasmsim_drainEvents: (a: number) => [number, number];
    readonly wasmsim_dt: (a: number) => number;
    readonly wasmsim_metrics: (a: number) => any;
    readonly wasmsim_new: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly wasmsim_repositionStrategyName: (a: number) => [number, number];
    readonly wasmsim_setDcsWithCommitmentWindow: (a: number, b: bigint) => void;
    readonly wasmsim_setDoorOpenTicksAll: (a: number, b: number) => [number, number];
    readonly wasmsim_setDoorTransitionTicksAll: (a: number, b: number) => [number, number];
    readonly wasmsim_setEtdWithWaitSquaredWeight: (a: number, b: number) => void;
    readonly wasmsim_setHallCallModeDestination: (a: number) => void;
    readonly wasmsim_setMaxSpeedAll: (a: number, b: number) => [number, number];
    readonly wasmsim_setReposition: (a: number, b: number, c: number) => number;
    readonly wasmsim_setRepositionPredictiveParking: (a: number, b: bigint) => void;
    readonly wasmsim_setStrategy: (a: number, b: number, c: number) => number;
    readonly wasmsim_setTrafficRate: (a: number, b: number) => void;
    readonly wasmsim_setWeightCapacityAll: (a: number, b: number) => [number, number];
    readonly wasmsim_snapshot: (a: number) => any;
    readonly wasmsim_spawnRider: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmsim_stepMany: (a: number, b: number) => void;
    readonly wasmsim_strategyName: (a: number) => [number, number];
    readonly wasmsim_trafficMode: (a: number) => [number, number];
    readonly wasmsim_trafficRate: (a: number) => number;
    readonly wasmsim_waitingCountAt: (a: number, b: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
