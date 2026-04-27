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
 * Door state with a 0..1 transition progress for animation.
 */
export interface DoorView {
    /**
     * Steady-state or transition state. `closed`/`open` are stable;
     * `opening`/`closing` are transient and `progress` advances over them.
     */
    state: "closed" | "opening" | "open" | "closing" | "unknown";
    /**
     * Progress through the current transition, 0..1. `0.0` for `closed` and
     * `open` (steady states) and at the start of `opening`/`closing`; `1.0`
     * at the end of a transition.
     */
    progress: number;
}

/**
 * Flattened event DTO. Every variant includes a `kind` discriminator and the
 * engine tick at which it was emitted; the remaining fields vary by kind.
 * Unknown variants (added to core later) fall back to `{ kind: \"other\" }` so
 * the UI stays forward-compatible.
 */
export type EventDto = { kind: "rider-spawned"; tick: number; rider: number; origin: number; destination: number } | { kind: "rider-boarded"; tick: number; rider: number; elevator: number } | { kind: "rider-exited"; tick: number; rider: number; elevator: number; stop: number } | { kind: "rider-abandoned"; tick: number; rider: number; stop: number } | { kind: "elevator-arrived"; tick: number; elevator: number; stop: number } | { kind: "elevator-departed"; tick: number; elevator: number; stop: number } | { kind: "door-opened"; tick: number; elevator: number } | { kind: "door-closed"; tick: number; elevator: number } | { kind: "elevator-assigned"; tick: number; elevator: number; stop: number } | { kind: "elevator-repositioning"; tick: number; elevator: number; stop: number } | { kind: "other"; tick: number; label: string };

/**
 * Hall-call lamp state at a stop. The per-line assignment maps let
 * renderers show \"the low-bank car is coming for the up call\" by
 * looking up which car serves which line at this floor.
 */
export interface StopHallCalls {
    /**
     * Up-button lamp lit (a hall call is acknowledged).
     */
    up: boolean;
    /**
     * Down-button lamp lit.
     */
    down: boolean;
    /**
     * `(line, car)` pairs for the up call\'s per-line assignments.
     */
    up_assigned: LineCarPair[];
    /**
     * `(line, car)` pairs for the down call\'s per-line assignments.
     */
    down_assigned: LineCarPair[];
}

/**
 * One line\'s share of a stop\'s waiting queue.
 */
export interface WaitingByLine {
    /**
     * Line entity id. Matches `CarDto.line` for cars running on this line.
     */
    line: number;
    /**
     * Waiting riders whose current route leg routes through this line.
     */
    count: number;
}

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
 * Per-elevator view for the game renderer.
 */
export interface CarView {
    /**
     * Stable entity ref. Matches the value `WasmSim::addElevator` returned.
     */
    id: number;
    /**
     * Line entity ref the car runs on.
     */
    line: number;
    /**
     * Group id the car\'s line belongs to.
     */
    group: number;
    /**
     * Position along the shaft axis.
     */
    y: number;
    /**
     * Signed velocity (+up, -down).
     */
    v: number;
    /**
     * Phase label (matches `CarDto.phase`).
     */
    phase: "idle" | "moving" | "repositioning" | "door-opening" | "loading" | "door-closing" | "stopped" | "unknown";
    /**
     * Target stop entity ref, if any.
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
     * Entity refs of riders aboard (for game-side `TenantData` lookup).
     * Use `.length` for the count.
     */
    rider_ids: number[];
    /**
     * Door FSM state with transition progress.
     */
    door: DoorView;
    /**
     * Direction lamp: car will accept up-pickups.
     */
    going_up: boolean;
    /**
     * Direction lamp: car will accept down-pickups.
     */
    going_down: boolean;
    /**
     * ETA to `target` in seconds, or `None` if not currently dispatched
     * to a known stop or the destination queue is empty.
     */
    eta_seconds: number | undefined;
}

/**
 * Per-group metadata.
 */
export interface GroupView {
    id: number;
    name: string;
    /**
     * Lines that belong to this group.
     */
    line_ids: number[];
}

/**
 * Per-line metadata.
 */
export interface LineView {
    id: number;
    group: number;
    name: string;
    min_position: number;
    max_position: number;
    /**
     * Stops served, in entity-id order.
     */
    stop_ids: number[];
    /**
     * Cars on this line.
     */
    car_ids: number[];
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
     * Waiting riders partitioned by the line that will serve their
     * current route leg. Sums to `waiting` minus any riders without a
     * Route / with a Walk leg. Used by the renderer to split the
     * waiting queue across multi-line stops (sky-lobby, street lobby
     * with service bank, etc.).
     */
    waiting_by_line: WaitingByLine[];
    /**
     * Resident rider count (O(1)).
     */
    residents: number;
}

/**
 * Per-stop rider population partitioned by lifecycle phase. Useful
 * for \"this floor is overcrowded\" / \"queue is long\" UI cues.
 */
export interface WaitingPhaseBreakdown {
    /**
     * Riders awaiting pickup at this stop.
     */
    waiting: number;
    /**
     * Riders parked at this stop (game-managed residents).
     */
    resident: number;
    /**
     * Riders who gave up here (kept until despawned).
     */
    abandoned: number;
}

/**
 * Per-stop view for the game renderer.
 */
export interface StopView {
    /**
     * Stable entity ref. Matches the value `WasmSim::addStop` returned.
     */
    entity_id: number;
    /**
     * Config-level `StopId`, or `u32::MAX` for runtime-added stops.
     */
    stop_id: number;
    /**
     * Human-readable name.
     */
    name: string;
    /**
     * Position along the shaft axis.
     */
    y: number;
    /**
     * Lines that serve this stop (multi-line stops list more than one).
     */
    line_ids: number[];
    /**
     * Waiting riders heading up. Total count is in `phases.waiting`.
     */
    waiting_up: number;
    /**
     * Waiting riders heading down.
     */
    waiting_down: number;
    /**
     * Waiting riders partitioned by line.
     */
    waiting_by_line: WaitingByLineU64[];
    /**
     * Population partition by phase.
     */
    phases: WaitingPhaseBreakdown;
    /**
     * Hall-call lamps + per-line assignments.
     */
    hall_calls: StopHallCalls;
}

/**
 * Top-level game-facing view returned by [`crate::WasmSim::world_view`].
 */
export interface WorldView {
    tick: number;
    dt: number;
    cars: CarView[];
    stops: StopView[];
    lines: LineView[];
    groups: GroupView[];
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
 * `(line, car)` pair carried by [`StopHallCalls`]. Tuples don\'t tsify
 * cleanly, so use a named struct.
 */
export interface LineCarPair {
    line: number;
    car: number;
}

/**
 * `WorldView`-flavoured `WaitingByLine` carrying `u64` line refs.
 * (The existing `WaitingByLine` in `dto.rs` uses `u32` for `Snapshot`.)
 */
export interface WaitingByLineU64 {
    line: number;
    count: number;
}


/**
 * Opaque simulation handle for JS.
 */
export class WasmSim {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Riders who abandoned the call at `stop_ref` (gave up waiting).
     * Useful for rendering "frustrated" indicators or computing service
     * quality metrics. Returns an empty array for missing stops.
     */
    abandonedAt(stop_ref: bigint): BigUint64Array;
    /**
     * Number of abandoned riders at `stop_ref`. Faster than counting
     * `abandonedAt`.
     */
    abandonedCountAt(stop_ref: bigint): number;
    /**
     * Abort the elevator's in-flight movement. The car decelerates to
     * the nearest reachable stop; subsequent dispatch / queue entries
     * resume from there.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator.
     */
    abortMovement(elevator_ref: bigint): void;
    /**
     * Add a new elevator to a line at `starting_position`. Optional
     * physics overrides; defaults match `ElevatorParams::default`.
     * Returns the elevator entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist, the position is
     * non-finite, the physics are invalid, or the line's `max_cars` is
     * already reached.
     */
    addElevator(line_ref: bigint, starting_position: number, max_speed?: number | null, weight_capacity?: number | null): bigint;
    /**
     * Add a new dispatch group with the given name and strategy.
     * Returns the group ID as a `u32` (groups have flat numeric IDs).
     *
     * # Errors
     *
     * Returns a JS error if `dispatch_strategy` is not a recognised name
     * (`"scan" | "look" | "nearest" | "etd" | "destination" | "rsr"`).
     */
    addGroup(name: string, dispatch_strategy: string): number;
    /**
     * Add a new line to an existing group. Returns the line entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the group does not exist or the range is
     * non-finite or inverted.
     */
    addLine(group_id: number, name: string, min_position: number, max_position: number, max_cars?: number | null): bigint;
    /**
     * Add a stop to a line at the given position. Returns the stop
     * entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or the position is
     * non-finite.
     */
    addStop(line_ref: bigint, name: string, position: number): bigint;
    /**
     * Add an existing stop entity to a line's served list. The stop
     * must already exist (via `addStop` on some line, or from config).
     *
     * # Errors
     *
     * Returns a JS error if the stop or line entity does not exist.
     */
    addStopToLine(stop_ref: bigint, line_ref: bigint): void;
    /**
     * Entity ids of every line in the simulation, across all groups.
     */
    allLines(): BigUint64Array;
    /**
     * Every tag currently registered in the simulation.
     */
    allTags(): string[];
    /**
     * Reassign a line to a different group. Returns the previous group
     * id so the caller can detect a no-op (returned id == passed id).
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or `new_group_id`
     * is not a valid group.
     */
    assignLineToGroup(line_ref: bigint, new_group_id: number): number;
    /**
     * Car currently assigned to serve the call at `(stop_ref, direction)`,
     * or `0` (slotmap-null) if none. At stops served by multiple lines
     * this returns the entry with the numerically smallest line-entity
     * key (stable across ticks).
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     */
    assignedCar(stop_ref: bigint, direction: string): bigint;
    /**
     * Per-line cars assigned to the call at `(stop_ref, direction)`.
     * Returns a flat array of alternating `[line_ref, car_ref, ...]`
     * pairs. Empty when dispatch has no assignments yet.
     *
     * Iteration order is stable by line-entity id (`BTreeMap`).
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     */
    assignedCarsByLine(stop_ref: bigint, direction: string): BigUint64Array;
    /**
     * Best ETA (ticks) to `stop_ref` across every dispatch-eligible
     * elevator, optionally filtered by indicator-lamp `direction`
     * (`"up"` / `"down"` / `"either"`). Returns a flat
     * `[elevator_ref, eta_ticks]` pair, or an empty array if no
     * eligible car has the stop queued.
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"` /
     * `"either"`.
     */
    bestEta(stop_ref: bigint, direction: string): BigUint64Array;
    /**
     * Distance `elevator_ref` would travel if it began decelerating
     * from its current velocity at its configured deceleration rate.
     * Returns `undefined` for missing entities or stationary cars.
     */
    brakingDistance(elevator_ref: bigint): number | undefined;
    /**
     * Cancel any pending hold extension on the doors.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     */
    cancelDoorHold(elevator_ref: bigint): void;
    /**
     * Empty an elevator's destination queue. Any in-progress trip
     * continues to its current target (the queue is the *future*
     * schedule); to also abort the in-flight trip, call
     * `abortMovement` after.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator.
     */
    clearDestinations(elevator_ref: bigint): void;
    /**
     * Request the doors to close now. Forces an early close unless a
     * rider is mid-boarding/exiting.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     */
    closeDoor(elevator_ref: bigint): void;
    /**
     * Current tick counter.
     */
    currentTick(): bigint;
    /**
     * Despawn a rider mid-flight. The rider is ejected from any
     * boarding car and dropped from the world.
     *
     * # Errors
     *
     * Returns a JS error if `rider_ref` is not a rider entity.
     */
    despawnRider(rider_ref: bigint): void;
    /**
     * Snapshot of `elevator_ref`'s destination queue as a `Vec<u64>` of
     * stop refs in service order. Empty if the elevator has no queue or
     * is missing.
     */
    destinationQueue(elevator_ref: bigint): BigUint64Array;
    /**
     * Disable an entity (elevator or stop). Disabled elevators eject
     * their riders and are excluded from dispatch; disabled stops
     * invalidate routes that reference them.
     *
     * # Errors
     *
     * Returns a JS error if `entity_ref` does not exist.
     */
    disable(entity_ref: bigint): void;
    /**
     * Drain all queued events since the last call.
     */
    drainEvents(): EventDto[];
    /**
     * Tick duration in seconds.
     */
    dt(): number;
    /**
     * Indicator-lamp direction of `elevator_ref`: `"up"`, `"down"`, or
     * `"either"` (idle / no committed direction). Returns `undefined`
     * for missing entities.
     */
    elevatorDirection(elevator_ref: bigint): string | undefined;
    /**
     * Whether `elevator_ref` is currently committed downward. Returns
     * `undefined` for missing entities.
     */
    elevatorGoingDown(elevator_ref: bigint): boolean | undefined;
    /**
     * Whether `elevator_ref` is currently committed upward. Returns
     * `undefined` for missing entities. A car that's `Either`-direction
     * reports `false` here and `false` in `elevatorGoingDown`.
     */
    elevatorGoingUp(elevator_ref: bigint): boolean | undefined;
    /**
     * Fraction of `elevator_ref`'s capacity currently occupied (by weight),
     * in `[0.0, 1.0]`. Returns `undefined` for missing entities.
     */
    elevatorLoad(elevator_ref: bigint): number | undefined;
    /**
     * Total number of completed trips by `elevator_ref` since spawn.
     * Returns `undefined` for missing entities.
     */
    elevatorMoveCount(elevator_ref: bigint): bigint | undefined;
    /**
     * Entity ids of all elevators currently assigned to `line_ref`.
     */
    elevatorsOnLine(line_ref: bigint): BigUint64Array;
    /**
     * Command an immediate stop on a Manual-mode elevator. Sets the
     * target velocity to zero and emits a distinct event so games can
     * distinguish an emergency stop from a deliberate hold.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is not in
     * Manual mode.
     */
    emergencyStop(elevator_ref: bigint): void;
    /**
     * Re-enable a previously-disabled entity (elevator or stop).
     *
     * # Errors
     *
     * Returns a JS error if `entity_ref` does not exist.
     */
    enable(entity_ref: bigint): void;
    /**
     * Estimated ticks remaining before `car_ref` reaches `stop_ref`.
     *
     * Includes any in-progress door cycle, intermediate stops in the
     * car's destination queue, and the trapezoidal travel time for each
     * leg. Returns ticks rather than seconds so consumers can compare
     * with `currentTick`.
     *
     * # Errors
     *
     * Returns a JS error if the elevator/stop does not exist, the
     * elevator is in a service mode excluded from dispatch, or `stop`
     * is not in the car's destination queue.
     */
    eta(car_ref: bigint, stop_ref: bigint): bigint;
    /**
     * Estimated ticks remaining before the assigned car reaches the
     * call at `(stop_ref, direction)`.
     *
     * # Errors
     *
     * Returns a JS error if no hall call exists at `(stop, direction)`,
     * no car is assigned to it, the assigned car has no positional
     * data, or `direction` is not `"up"` / `"down"`.
     */
    etaForCall(stop_ref: bigint, direction: string): bigint;
    /**
     * Find the stop entity at `position` that's served by `line_ref`,
     * or `0` (slotmap-null) if none. Lets consumers disambiguate
     * co-located stops on different lines (sky-lobby served by
     * multiple banks, parallel shafts at the same physical floor)
     * without offset hacks.
     */
    findStopAtPositionOnLine(position: number, line_ref: bigint): bigint;
    /**
     * Position of the next stop in `elevator_ref`'s destination queue,
     * or current target if mid-trip. Returns `undefined` if the queue
     * is empty or the entity is not an elevator.
     */
    futureStopPosition(elevator_ref: bigint): number | undefined;
    /**
     * Group ids of every group with a line that serves `stop_ref`.
     */
    groupsServingStop(stop_ref: bigint): Uint32Array;
    /**
     * Extend the doors' open dwell by `ticks`. Cumulative across calls.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist, is disabled,
     * or `ticks` is zero.
     */
    holdDoor(elevator_ref: bigint, ticks: number): void;
    /**
     * Total number of currently-idle elevators across the simulation.
     * "Idle" = phase is `Idle` (not parked at a stop with riders or
     * repositioning).
     */
    idleElevatorCount(): number;
    /**
     * Whether `entity_ref` is currently disabled (out of service / not
     * participating in dispatch). Returns `false` for nonexistent
     * entities — distinguish via `isElevator` / `isStop` first.
     */
    isDisabled(entity_ref: bigint): boolean;
    /**
     * Whether `entity_ref` resolves to an elevator entity in the world.
     */
    isElevator(entity_ref: bigint): boolean;
    /**
     * Whether `entity_ref` resolves to a rider entity in the world.
     */
    isRider(entity_ref: bigint): boolean;
    /**
     * Whether `entity_ref` resolves to a stop entity in the world.
     */
    isStop(entity_ref: bigint): boolean;
    /**
     * Entity ids of every elevator currently repositioning (heading to
     * a parking stop with no rider obligation).
     */
    iterRepositioningElevators(): BigUint64Array;
    /**
     * Total number of lines across all groups.
     */
    lineCount(): number;
    /**
     * Line entity that `elevator_ref` runs on, or `0` (slotmap-null)
     * if missing or not an elevator.
     */
    lineForElevator(elevator_ref: bigint): bigint;
    /**
     * Entity ids of every line in `group_id`. Empty if the group does
     * not exist.
     */
    linesInGroup(group_id: number): BigUint64Array;
    /**
     * Entity ids of every line that serves `stop_ref`. Useful for
     * disambiguating sky-lobby calls served by multiple banks.
     */
    linesServingStop(stop_ref: bigint): BigUint64Array;
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
     * Number of riders currently aboard `elevator_ref`. Returns `0` for
     * missing entities (`Simulation::occupancy` returns 0 for both
     * "not an elevator" and "empty cab" — distinguish via `isElevator`).
     */
    occupancy(elevator_ref: bigint): number;
    /**
     * Request the doors of an elevator to open. Applied immediately at a
     * stopped car with closed/closing doors; otherwise queued.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     */
    openDoor(elevator_ref: bigint): void;
    /**
     * Pin the call at `(stop_ref, direction)` to `car_ref`, locking it
     * out of dispatch reassignment.
     *
     * # Errors
     *
     * Returns a JS error if the elevator/stop does not exist, the line
     * does not serve the stop, no hall call exists at that
     * `(stop, direction)`, or `direction` is not `"up"` / `"down"`.
     */
    pinAssignment(car_ref: bigint, stop_ref: bigint, direction: string): void;
    /**
     * Sub-tick interpolated position of `entity_ref` for smooth render
     * frames. `alpha` is in `[0.0, 1.0]` — `0.0` = current tick,
     * `1.0` = next tick. Returns `undefined` if the entity has no
     * position component.
     */
    positionAt(entity_ref: bigint, alpha: number): number | undefined;
    /**
     * Press a car-button (in-cab floor request) targeting `stop_ref`.
     *
     * # Errors
     *
     * Returns a JS error if the elevator or stop does not exist.
     */
    pressCarButton(elevator_ref: bigint, stop_ref: bigint): void;
    /**
     * Press a hall call at a stop with direction `"up"` or `"down"`.
     *
     * # Errors
     *
     * Returns a JS error if the stop does not exist or `direction` is
     * not `"up"` or `"down"`.
     */
    pressHallCall(stop_ref: bigint, direction: string): void;
    /**
     * Append `stop_ref` to the back of `elevator_ref`'s destination queue.
     * Adjacent duplicates are suppressed (no-op if the queue's last
     * entry already equals `stop_ref`).
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     */
    pushDestination(elevator_ref: bigint, stop_ref: bigint): void;
    /**
     * Insert `stop_ref` at the front of `elevator_ref`'s destination
     * queue ("go here next"). On the next `AdvanceQueue` phase the car
     * redirects to this new front if it differs from the current target.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     */
    pushDestinationFront(elevator_ref: bigint, stop_ref: bigint): void;
    /**
     * Stops reachable from `from_stop` via the line-graph (BFS through
     * shared elevators). Excludes `from_stop` itself.
     */
    reachableStopsFrom(from_stop_ref: bigint): BigUint64Array;
    /**
     * Reassign an elevator to a different line. Disabled cars stay
     * disabled; in-flight cars are aborted to the nearest reachable
     * stop on the new line.
     *
     * # Errors
     *
     * Returns a JS error if the elevator or new line does not exist.
     */
    reassignElevatorToLine(elevator_ref: bigint, new_line_ref: bigint): void;
    /**
     * Clear the queue and immediately recall the elevator to `stop_ref`.
     * Equivalent to `clearDestinations` + `pushDestination(stop_ref)`,
     * emitted as a single `ElevatorRecalled` event so games can render a
     * distinct callout (lobby drill, fire-service recall, etc.).
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     */
    recallTo(elevator_ref: bigint, stop_ref: bigint): void;
    /**
     * Remove an elevator (riders ejected to the nearest enabled stop).
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist.
     */
    removeElevator(elevator_ref: bigint): void;
    /**
     * Remove a line and all its elevators (riders ejected to nearest stop).
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist.
     */
    removeLine(line_ref: bigint): void;
    /**
     * Remove the reposition strategy from `group_id`. Idle elevators
     * stay where they parked instead of moving toward a target.
     */
    removeReposition(group_id: number): void;
    /**
     * Remove a stop. In-flight riders to/from it are rerouted, ejected,
     * or abandoned per `Simulation::remove_stop` semantics.
     *
     * # Errors
     *
     * Returns a JS error if the stop does not exist.
     */
    removeStop(stop_ref: bigint): void;
    /**
     * Remove a stop from a line's served list. The stop entity itself
     * remains in the world — call `removeStop` to fully despawn.
     *
     * # Errors
     *
     * Returns a JS error if the line entity does not exist.
     */
    removeStopFromLine(stop_ref: bigint, line_ref: bigint): void;
    /**
     * Active reposition strategy name (one of `adaptive | predictive
     * | lobby | spread | none`). Used by the playground to label the
     * second chip in each pane header.
     */
    repositionStrategyName(): string;
    /**
     * Replace a rider's destination with `new_destination`. Re-routes
     * in-flight riders to head to the new stop after their current leg.
     *
     * # Errors
     *
     * Returns a JS error if the rider or destination does not exist.
     */
    reroute(rider_ref: bigint, new_destination_ref: bigint): void;
    /**
     * Number of resident riders at `stop_ref`. Faster than counting
     * `residentsAt` since it skips the array allocation.
     */
    residentCountAt(stop_ref: bigint): number;
    /**
     * Riders settled / resident at `stop_ref` (e.g. tenants for a
     * residential building's "home floor" model). Returns an empty
     * array for missing stops.
     */
    residentsAt(stop_ref: bigint): BigUint64Array;
    /**
     * Riders currently aboard `elevator_ref`. Empty if the cab is
     * empty or `elevator_ref` is not an elevator.
     */
    ridersOn(elevator_ref: bigint): BigUint64Array;
    /**
     * Step the simulation forward up to `max_ticks` ticks, stopping
     * early if the world becomes "quiet" (no in-flight riders, no
     * pending hall calls, all cars idle). Returns the number of ticks
     * actually run.
     *
     * # Errors
     *
     * Returns a JS error if the world fails to quiet within `max_ticks`
     * (infinite-loop guard).
     */
    runUntilQuiet(max_ticks: bigint): bigint;
    /**
     * Get the current operational mode of an elevator as a label string.
     * Returns `"normal"` for missing/disabled elevators (matches core's
     * `service_mode` accessor, which returns the default rather than
     * erroring).
     */
    serviceMode(elevator_ref: bigint): string;
    /**
     * Set the acceleration rate (distance/tick²) for a single elevator.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or
     * `acceleration` is non-positive / non-finite.
     */
    setAcceleration(elevator_ref: bigint, acceleration: number): void;
    /**
     * Set how many ticks the per-rider arrival log retains. Global
     * setting; higher values trade memory for longer post-trip
     * queries.
     */
    setArrivalLogRetentionTicks(retention_ticks: bigint): void;
    /**
     * Swap every group's dispatcher to a DCS instance with the given
     * deferred-commitment window. `window_ticks = 0` is equivalent to
     * no window (immediate sticky).
     */
    setDcsWithCommitmentWindow(window_ticks: bigint): void;
    /**
     * Set the deceleration rate (distance/tick²) for a single elevator.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or
     * `deceleration` is non-positive / non-finite.
     */
    setDeceleration(elevator_ref: bigint, deceleration: number): void;
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
     * Replace an elevator's forbidden-stops set. Pass an empty array to
     * clear all restrictions.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist.
     */
    setElevatorRestrictedStops(elevator_ref: bigint, stop_refs: BigUint64Array): void;
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
     * Resize a line's reachable position range. The new range may
     * grow or shrink the line; cars outside the new bounds are
     * clamped to the boundary.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or the range is
     * non-finite or inverted.
     */
    setLineRange(line_ref: bigint, min_position: number, max_position: number): void;
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
     * Replace a rider's allowed-stops set. Empty array clears the
     * restriction (rider can use any stop).
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist.
     */
    setRiderAccess(rider_ref: bigint, allowed_stop_refs: BigUint64Array): void;
    /**
     * Set the operational mode of an elevator.
     *
     * `mode` is one of: `"normal"`, `"independent"`, `"inspection"`,
     * `"manual"`, `"out-of-service"`. Modes are orthogonal to the
     * elevator's phase. Leaving Manual zeroes velocity and clears any
     * queued door commands.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or the mode
     * label is unknown.
     */
    setServiceMode(elevator_ref: bigint, mode: string): void;
    /**
     * Swap the dispatch strategy by name. Returns `true` on success.
     *
     * State is preserved; only the assignment policy changes. Unknown names
     * return `false` so the UI can round-trip arbitrary dropdown values
     * without panicking.
     */
    setStrategy(name: string): boolean;
    /**
     * Set the target velocity for a Manual-mode elevator (distance/tick).
     * Positive = up, negative = down. The car ramps toward the target
     * using its configured acceleration / deceleration.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist, is not in
     * Manual mode, or `velocity` is non-finite.
     */
    setTargetVelocity(elevator_ref: bigint, velocity: number): void;
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
     * Mark a rider as settled at their current stop. Settled riders
     * move from the waiting/riding pools into the resident pool —
     * useful for "tenants who arrived home" semantics.
     *
     * # Errors
     *
     * Returns a JS error if the rider does not exist.
     */
    settleRider(rider_ref: bigint): void;
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
     * Spawn a rider between two stops identified by their entity refs
     * (`BigInt`). Companion to [`spawn_rider`](Self::spawn_rider) for
     * runtime-added stops that have no config-time `StopId`.
     * Returns the new rider's entity ref so consumers can correlate
     * with subsequent `rider-*` events.
     *
     * # Errors
     *
     * Returns a JS error if either stop does not exist, the origin
     * equals the destination, or no group serves both stops.
     */
    spawnRiderByRef(origin_ref: bigint, destination_ref: bigint, weight: number, patience_ticks?: number | null): bigint;
    /**
     * Step the simulation forward `n` ticks.
     */
    stepMany(n: number): void;
    /**
     * Resolve a config-time `StopId` (the small `u32` from the RON
     * config) to its runtime `EntityId`. Returns `0` (slotmap-null)
     * for unknown ids.
     */
    stopEntity(stop_id: number): bigint;
    /**
     * Entity ids of every stop served by `line_ref`. Order is
     * unspecified — sort by `positionAt` if you need axis order.
     */
    stopsServedByLine(line_ref: bigint): BigUint64Array;
    /**
     * Active strategy name.
     */
    strategyName(): string;
    /**
     * Attach `tag` to `entity_ref`.
     *
     * # Errors
     *
     * Returns a JS error if `entity_ref` does not exist.
     */
    tagEntity(entity_ref: bigint, tag: string): void;
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
     * Stops where multiple lines intersect — the natural transfer
     * candidates for multi-leg routes (e.g. sky-lobby in a tall
     * building, transfer station in a transit network).
     */
    transferPoints(): BigUint64Array;
    /**
     * Release a previous pin at `(stop_ref, direction)`. No-op if the
     * call does not exist or wasn't pinned.
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     */
    unpinAssignment(stop_ref: bigint, direction: string): void;
    /**
     * Remove `tag` from `entity_ref`. No-op if the entity wasn't tagged.
     */
    untagEntity(entity_ref: bigint, tag: string): void;
    /**
     * Current velocity (distance/tick) of `elevator_ref`. Positive = up,
     * negative = down. Returns `undefined` if the entity has no velocity
     * component (i.e. is not an elevator).
     */
    velocity(elevator_ref: bigint): number | undefined;
    /**
     * Riders currently waiting at `stop_ref`. Returns an empty array
     * for missing stops.
     */
    waitingAt(stop_ref: bigint): BigUint64Array;
    /**
     * Convenience: waiting rider count at a specific stop id.
     */
    waitingCountAt(stop_id: number): number;
    /**
     * Per-line waiting counts at `stop_ref`. Returns a flat array of
     * alternating `[line_ref, count, line_ref, count, ...]` pairs.
     * `count` is encoded as `u64` for symmetry with the entity refs.
     */
    waitingCountsByLineAt(stop_ref: bigint): BigUint64Array;
    /**
     * Up/down split of riders currently waiting at `stop_ref`. Returns
     * `[up_count, down_count]`; both `0` for missing stops.
     */
    waitingDirectionCountsAt(stop_ref: bigint): Uint32Array;
    /**
     * Pull a richer game-facing view: door progress, direction lamps,
     * per-car ETAs, hall-call lamp state, and topology metadata
     * (groups + lines). Designed for game-side renderers that need
     * more than `snapshot()` exposes. All entity refs are `u64`
     * (`BigInt`) matching the live-mutation API.
     */
    worldView(): WorldView;
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
    readonly wasmsim_abandonedAt: (a: number, b: bigint) => [number, number];
    readonly wasmsim_abandonedCountAt: (a: number, b: bigint) => number;
    readonly wasmsim_abortMovement: (a: number, b: bigint) => [number, number];
    readonly wasmsim_addElevator: (a: number, b: bigint, c: number, d: number, e: number, f: number, g: number) => [bigint, number, number];
    readonly wasmsim_addGroup: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly wasmsim_addLine: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [bigint, number, number];
    readonly wasmsim_addStop: (a: number, b: bigint, c: number, d: number, e: number) => [bigint, number, number];
    readonly wasmsim_addStopToLine: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_allLines: (a: number) => [number, number];
    readonly wasmsim_allTags: (a: number) => [number, number];
    readonly wasmsim_assignLineToGroup: (a: number, b: bigint, c: number) => [number, number, number];
    readonly wasmsim_assignedCar: (a: number, b: bigint, c: number, d: number) => [bigint, number, number];
    readonly wasmsim_assignedCarsByLine: (a: number, b: bigint, c: number, d: number) => [number, number, number, number];
    readonly wasmsim_bestEta: (a: number, b: bigint, c: number, d: number) => [number, number, number, number];
    readonly wasmsim_brakingDistance: (a: number, b: bigint) => [number, number];
    readonly wasmsim_cancelDoorHold: (a: number, b: bigint) => [number, number];
    readonly wasmsim_clearDestinations: (a: number, b: bigint) => [number, number];
    readonly wasmsim_closeDoor: (a: number, b: bigint) => [number, number];
    readonly wasmsim_currentTick: (a: number) => bigint;
    readonly wasmsim_despawnRider: (a: number, b: bigint) => [number, number];
    readonly wasmsim_destinationQueue: (a: number, b: bigint) => [number, number];
    readonly wasmsim_disable: (a: number, b: bigint) => [number, number];
    readonly wasmsim_drainEvents: (a: number) => [number, number];
    readonly wasmsim_dt: (a: number) => number;
    readonly wasmsim_elevatorDirection: (a: number, b: bigint) => [number, number];
    readonly wasmsim_elevatorGoingDown: (a: number, b: bigint) => number;
    readonly wasmsim_elevatorGoingUp: (a: number, b: bigint) => number;
    readonly wasmsim_elevatorLoad: (a: number, b: bigint) => [number, number];
    readonly wasmsim_elevatorMoveCount: (a: number, b: bigint) => [number, bigint];
    readonly wasmsim_elevatorsOnLine: (a: number, b: bigint) => [number, number];
    readonly wasmsim_emergencyStop: (a: number, b: bigint) => [number, number];
    readonly wasmsim_enable: (a: number, b: bigint) => [number, number];
    readonly wasmsim_eta: (a: number, b: bigint, c: bigint) => [bigint, number, number];
    readonly wasmsim_etaForCall: (a: number, b: bigint, c: number, d: number) => [bigint, number, number];
    readonly wasmsim_findStopAtPositionOnLine: (a: number, b: number, c: bigint) => bigint;
    readonly wasmsim_futureStopPosition: (a: number, b: bigint) => [number, number];
    readonly wasmsim_groupsServingStop: (a: number, b: bigint) => [number, number];
    readonly wasmsim_holdDoor: (a: number, b: bigint, c: number) => [number, number];
    readonly wasmsim_idleElevatorCount: (a: number) => number;
    readonly wasmsim_isDisabled: (a: number, b: bigint) => number;
    readonly wasmsim_isElevator: (a: number, b: bigint) => number;
    readonly wasmsim_isRider: (a: number, b: bigint) => number;
    readonly wasmsim_isStop: (a: number, b: bigint) => number;
    readonly wasmsim_iterRepositioningElevators: (a: number) => [number, number];
    readonly wasmsim_lineCount: (a: number) => number;
    readonly wasmsim_lineForElevator: (a: number, b: bigint) => bigint;
    readonly wasmsim_linesInGroup: (a: number, b: number) => [number, number];
    readonly wasmsim_linesServingStop: (a: number, b: bigint) => [number, number];
    readonly wasmsim_metrics: (a: number) => any;
    readonly wasmsim_new: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly wasmsim_occupancy: (a: number, b: bigint) => number;
    readonly wasmsim_openDoor: (a: number, b: bigint) => [number, number];
    readonly wasmsim_pinAssignment: (a: number, b: bigint, c: bigint, d: number, e: number) => [number, number];
    readonly wasmsim_positionAt: (a: number, b: bigint, c: number) => [number, number];
    readonly wasmsim_pressCarButton: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_pressHallCall: (a: number, b: bigint, c: number, d: number) => [number, number];
    readonly wasmsim_pushDestination: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_pushDestinationFront: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_reachableStopsFrom: (a: number, b: bigint) => [number, number];
    readonly wasmsim_reassignElevatorToLine: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_recallTo: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_removeElevator: (a: number, b: bigint) => [number, number];
    readonly wasmsim_removeLine: (a: number, b: bigint) => [number, number];
    readonly wasmsim_removeReposition: (a: number, b: number) => void;
    readonly wasmsim_removeStop: (a: number, b: bigint) => [number, number];
    readonly wasmsim_removeStopFromLine: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_repositionStrategyName: (a: number) => [number, number];
    readonly wasmsim_reroute: (a: number, b: bigint, c: bigint) => [number, number];
    readonly wasmsim_residentCountAt: (a: number, b: bigint) => number;
    readonly wasmsim_residentsAt: (a: number, b: bigint) => [number, number];
    readonly wasmsim_ridersOn: (a: number, b: bigint) => [number, number];
    readonly wasmsim_runUntilQuiet: (a: number, b: bigint) => [bigint, number, number];
    readonly wasmsim_serviceMode: (a: number, b: bigint) => [number, number];
    readonly wasmsim_setAcceleration: (a: number, b: bigint, c: number) => [number, number];
    readonly wasmsim_setArrivalLogRetentionTicks: (a: number, b: bigint) => void;
    readonly wasmsim_setDcsWithCommitmentWindow: (a: number, b: bigint) => void;
    readonly wasmsim_setDeceleration: (a: number, b: bigint, c: number) => [number, number];
    readonly wasmsim_setDoorOpenTicksAll: (a: number, b: number) => [number, number];
    readonly wasmsim_setDoorTransitionTicksAll: (a: number, b: number) => [number, number];
    readonly wasmsim_setElevatorRestrictedStops: (a: number, b: bigint, c: number, d: number) => [number, number];
    readonly wasmsim_setEtdWithWaitSquaredWeight: (a: number, b: number) => void;
    readonly wasmsim_setHallCallModeDestination: (a: number) => void;
    readonly wasmsim_setLineRange: (a: number, b: bigint, c: number, d: number) => [number, number];
    readonly wasmsim_setMaxSpeedAll: (a: number, b: number) => [number, number];
    readonly wasmsim_setReposition: (a: number, b: number, c: number) => number;
    readonly wasmsim_setRepositionPredictiveParking: (a: number, b: bigint) => void;
    readonly wasmsim_setRiderAccess: (a: number, b: bigint, c: number, d: number) => [number, number];
    readonly wasmsim_setServiceMode: (a: number, b: bigint, c: number, d: number) => [number, number];
    readonly wasmsim_setStrategy: (a: number, b: number, c: number) => number;
    readonly wasmsim_setTargetVelocity: (a: number, b: bigint, c: number) => [number, number];
    readonly wasmsim_setTrafficRate: (a: number, b: number) => void;
    readonly wasmsim_setWeightCapacityAll: (a: number, b: number) => [number, number];
    readonly wasmsim_settleRider: (a: number, b: bigint) => [number, number];
    readonly wasmsim_snapshot: (a: number) => any;
    readonly wasmsim_spawnRider: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasmsim_spawnRiderByRef: (a: number, b: bigint, c: bigint, d: number, e: number) => [bigint, number, number];
    readonly wasmsim_stepMany: (a: number, b: number) => void;
    readonly wasmsim_stopEntity: (a: number, b: number) => bigint;
    readonly wasmsim_stopsServedByLine: (a: number, b: bigint) => [number, number];
    readonly wasmsim_strategyName: (a: number) => [number, number];
    readonly wasmsim_tagEntity: (a: number, b: bigint, c: number, d: number) => [number, number];
    readonly wasmsim_trafficMode: (a: number) => [number, number];
    readonly wasmsim_trafficRate: (a: number) => number;
    readonly wasmsim_transferPoints: (a: number) => [number, number];
    readonly wasmsim_unpinAssignment: (a: number, b: bigint, c: number, d: number) => [number, number];
    readonly wasmsim_untagEntity: (a: number, b: bigint, c: number, d: number) => void;
    readonly wasmsim_velocity: (a: number, b: bigint) => [number, number];
    readonly wasmsim_waitingAt: (a: number, b: bigint) => [number, number];
    readonly wasmsim_waitingCountAt: (a: number, b: number) => number;
    readonly wasmsim_waitingCountsByLineAt: (a: number, b: bigint) => [number, number];
    readonly wasmsim_waitingDirectionCountsAt: (a: number, b: bigint) => [number, number];
    readonly wasmsim_worldView: (a: number) => any;
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
