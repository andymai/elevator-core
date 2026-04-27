/* @ts-self-types="./elevator_wasm.d.ts" */

/**
 * Opaque simulation handle for JS.
 */
export class WasmSim {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WasmSimFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wasmsim_free(ptr, 0);
    }
    /**
     * Riders who abandoned the call at `stop_ref` (gave up waiting).
     * Useful for rendering "frustrated" indicators or computing service
     * quality metrics. Returns an empty array for missing stops.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    abandonedAt(stop_ref) {
        const ret = wasm.wasmsim_abandonedAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Number of abandoned riders at `stop_ref`. Faster than counting
     * `abandonedAt`.
     * @param {bigint} stop_ref
     * @returns {number}
     */
    abandonedCountAt(stop_ref) {
        const ret = wasm.wasmsim_abandonedCountAt(this.__wbg_ptr, stop_ref);
        return ret >>> 0;
    }
    /**
     * Abort the elevator's in-flight movement. The car decelerates to
     * the nearest reachable stop; subsequent dispatch / queue entries
     * resume from there.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator.
     * @param {bigint} elevator_ref
     */
    abortMovement(elevator_ref) {
        const ret = wasm.wasmsim_abortMovement(this.__wbg_ptr, elevator_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {bigint} line_ref
     * @param {number} starting_position
     * @param {number | null} [max_speed]
     * @param {number | null} [weight_capacity]
     * @returns {bigint}
     */
    addElevator(line_ref, starting_position, max_speed, weight_capacity) {
        const ret = wasm.wasmsim_addElevator(this.__wbg_ptr, line_ref, starting_position, !isLikeNone(max_speed), isLikeNone(max_speed) ? 0 : max_speed, !isLikeNone(weight_capacity), isLikeNone(weight_capacity) ? 0 : weight_capacity);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
    /**
     * Add a new dispatch group with the given name and strategy.
     * Returns the group ID as a `u32` (groups have flat numeric IDs).
     *
     * # Errors
     *
     * Returns a JS error if `dispatch_strategy` is not a recognised name
     * (`"scan" | "look" | "nearest" | "etd" | "destination" | "rsr"`).
     * @param {string} name
     * @param {string} dispatch_strategy
     * @returns {number}
     */
    addGroup(name, dispatch_strategy) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(dispatch_strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_addGroup(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * Add a new line to an existing group. Returns the line entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the group does not exist or the range is
     * non-finite or inverted.
     * @param {number} group_id
     * @param {string} name
     * @param {number} min_position
     * @param {number} max_position
     * @param {number | null} [max_cars]
     * @returns {bigint}
     */
    addLine(group_id, name, min_position, max_position, max_cars) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_addLine(this.__wbg_ptr, group_id, ptr0, len0, min_position, max_position, isLikeNone(max_cars) ? 0x100000001 : (max_cars) >>> 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
    /**
     * Add a stop to a line at the given position. Returns the stop
     * entity ref.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or the position is
     * non-finite.
     * @param {bigint} line_ref
     * @param {string} name
     * @param {number} position
     * @returns {bigint}
     */
    addStop(line_ref, name, position) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_addStop(this.__wbg_ptr, line_ref, ptr0, len0, position);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
    /**
     * Car currently assigned to serve the call at `(stop_ref, direction)`,
     * or `0` (slotmap-null) if none. At stops served by multiple lines
     * this returns the entry with the numerically smallest line-entity
     * key (stable across ticks).
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {bigint}
     */
    assignedCar(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_assignedCar(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
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
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {BigUint64Array}
     */
    assignedCarsByLine(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_assignedCarsByLine(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v2;
    }
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
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {BigUint64Array}
     */
    bestEta(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_bestEta(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v2 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v2;
    }
    /**
     * Distance `elevator_ref` would travel if it began decelerating
     * from its current velocity at its configured deceleration rate.
     * Returns `undefined` for missing entities or stationary cars.
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    brakingDistance(elevator_ref) {
        const ret = wasm.wasmsim_brakingDistance(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Cancel any pending hold extension on the doors.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     * @param {bigint} elevator_ref
     */
    cancelDoorHold(elevator_ref) {
        const ret = wasm.wasmsim_cancelDoorHold(this.__wbg_ptr, elevator_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Empty an elevator's destination queue. Any in-progress trip
     * continues to its current target (the queue is the *future*
     * schedule); to also abort the in-flight trip, call
     * `abortMovement` after.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator.
     * @param {bigint} elevator_ref
     */
    clearDestinations(elevator_ref) {
        const ret = wasm.wasmsim_clearDestinations(this.__wbg_ptr, elevator_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Request the doors to close now. Forces an early close unless a
     * rider is mid-boarding/exiting.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     * @param {bigint} elevator_ref
     */
    closeDoor(elevator_ref) {
        const ret = wasm.wasmsim_closeDoor(this.__wbg_ptr, elevator_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Current tick counter.
     * @returns {bigint}
     */
    currentTick() {
        const ret = wasm.wasmsim_currentTick(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Snapshot of `elevator_ref`'s destination queue as a `Vec<u64>` of
     * stop refs in service order. Empty if the elevator has no queue or
     * is missing.
     * @param {bigint} elevator_ref
     * @returns {BigUint64Array}
     */
    destinationQueue(elevator_ref) {
        const ret = wasm.wasmsim_destinationQueue(this.__wbg_ptr, elevator_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Drain all queued events since the last call.
     * @returns {EventDto[]}
     */
    drainEvents() {
        const ret = wasm.wasmsim_drainEvents(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Tick duration in seconds.
     * @returns {number}
     */
    dt() {
        const ret = wasm.wasmsim_dt(this.__wbg_ptr);
        return ret;
    }
    /**
     * Indicator-lamp direction of `elevator_ref`: `"up"`, `"down"`, or
     * `"either"` (idle / no committed direction). Returns `undefined`
     * for missing entities.
     * @param {bigint} elevator_ref
     * @returns {string | undefined}
     */
    elevatorDirection(elevator_ref) {
        const ret = wasm.wasmsim_elevatorDirection(this.__wbg_ptr, elevator_ref);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Whether `elevator_ref` is currently committed downward. Returns
     * `undefined` for missing entities.
     * @param {bigint} elevator_ref
     * @returns {boolean | undefined}
     */
    elevatorGoingDown(elevator_ref) {
        const ret = wasm.wasmsim_elevatorGoingDown(this.__wbg_ptr, elevator_ref);
        return ret === 0xFFFFFF ? undefined : ret !== 0;
    }
    /**
     * Whether `elevator_ref` is currently committed upward. Returns
     * `undefined` for missing entities. A car that's `Either`-direction
     * reports `false` here and `false` in `elevatorGoingDown`.
     * @param {bigint} elevator_ref
     * @returns {boolean | undefined}
     */
    elevatorGoingUp(elevator_ref) {
        const ret = wasm.wasmsim_elevatorGoingUp(this.__wbg_ptr, elevator_ref);
        return ret === 0xFFFFFF ? undefined : ret !== 0;
    }
    /**
     * Fraction of `elevator_ref`'s capacity currently occupied (by weight),
     * in `[0.0, 1.0]`. Returns `undefined` for missing entities.
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    elevatorLoad(elevator_ref) {
        const ret = wasm.wasmsim_elevatorLoad(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Total number of completed trips by `elevator_ref` since spawn.
     * Returns `undefined` for missing entities.
     * @param {bigint} elevator_ref
     * @returns {bigint | undefined}
     */
    elevatorMoveCount(elevator_ref) {
        const ret = wasm.wasmsim_elevatorMoveCount(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : BigInt.asUintN(64, ret[1]);
    }
    /**
     * Command an immediate stop on a Manual-mode elevator. Sets the
     * target velocity to zero and emits a distinct event so games can
     * distinguish an emergency stop from a deliberate hold.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is not in
     * Manual mode.
     * @param {bigint} elevator_ref
     */
    emergencyStop(elevator_ref) {
        const ret = wasm.wasmsim_emergencyStop(this.__wbg_ptr, elevator_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {bigint} car_ref
     * @param {bigint} stop_ref
     * @returns {bigint}
     */
    eta(car_ref, stop_ref) {
        const ret = wasm.wasmsim_eta(this.__wbg_ptr, car_ref, stop_ref);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
    /**
     * Estimated ticks remaining before the assigned car reaches the
     * call at `(stop_ref, direction)`.
     *
     * # Errors
     *
     * Returns a JS error if no hall call exists at `(stop, direction)`,
     * no car is assigned to it, the assigned car has no positional
     * data, or `direction` is not `"up"` / `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     * @returns {bigint}
     */
    etaForCall(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_etaForCall(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
    /**
     * Find the stop entity at `position` that's served by `line_ref`,
     * or `0` (slotmap-null) if none. Lets consumers disambiguate
     * co-located stops on different lines (sky-lobby served by
     * multiple banks, parallel shafts at the same physical floor)
     * without offset hacks.
     * @param {number} position
     * @param {bigint} line_ref
     * @returns {bigint}
     */
    findStopAtPositionOnLine(position, line_ref) {
        const ret = wasm.wasmsim_findStopAtPositionOnLine(this.__wbg_ptr, position, line_ref);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Position of the next stop in `elevator_ref`'s destination queue,
     * or current target if mid-trip. Returns `undefined` if the queue
     * is empty or the entity is not an elevator.
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    futureStopPosition(elevator_ref) {
        const ret = wasm.wasmsim_futureStopPosition(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Extend the doors' open dwell by `ticks`. Cumulative across calls.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist, is disabled,
     * or `ticks` is zero.
     * @param {bigint} elevator_ref
     * @param {number} ticks
     */
    holdDoor(elevator_ref, ticks) {
        const ret = wasm.wasmsim_holdDoor(this.__wbg_ptr, elevator_ref, ticks);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Total number of currently-idle elevators across the simulation.
     * "Idle" = phase is `Idle` (not parked at a stop with riders or
     * repositioning).
     * @returns {number}
     */
    idleElevatorCount() {
        const ret = wasm.wasmsim_idleElevatorCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Whether `entity_ref` is currently disabled (out of service / not
     * participating in dispatch). Returns `false` for nonexistent
     * entities — distinguish via `isElevator` / `isStop` first.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isDisabled(entity_ref) {
        const ret = wasm.wasmsim_isDisabled(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Whether `entity_ref` resolves to an elevator entity in the world.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isElevator(entity_ref) {
        const ret = wasm.wasmsim_isElevator(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Whether `entity_ref` resolves to a rider entity in the world.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isRider(entity_ref) {
        const ret = wasm.wasmsim_isRider(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Whether `entity_ref` resolves to a stop entity in the world.
     * @param {bigint} entity_ref
     * @returns {boolean}
     */
    isStop(entity_ref) {
        const ret = wasm.wasmsim_isStop(this.__wbg_ptr, entity_ref);
        return ret !== 0;
    }
    /**
     * Current aggregate metrics.
     * @returns {MetricsDto}
     */
    metrics() {
        const ret = wasm.wasmsim_metrics(this.__wbg_ptr);
        return ret;
    }
    /**
     * Construct a new simulation from a RON-encoded [`SimConfig`] and a
     * dispatch strategy name (`"scan" | "look" | "nearest" | "etd" | "destination"`).
     *
     * # Errors
     *
     * Returns a JS error if the RON fails to parse, the config fails
     * validation, or `strategy` is not a recognised built-in.
     * @param {string} config_ron
     * @param {string} strategy
     * @param {string | null} [reposition]
     */
    constructor(config_ron, strategy, reposition) {
        const ptr0 = passStringToWasm0(config_ron, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(reposition) ? 0 : passStringToWasm0(reposition, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_new(ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        WasmSimFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Number of riders currently aboard `elevator_ref`. Returns `0` for
     * missing entities (`Simulation::occupancy` returns 0 for both
     * "not an elevator" and "empty cab" — distinguish via `isElevator`).
     * @param {bigint} elevator_ref
     * @returns {number}
     */
    occupancy(elevator_ref) {
        const ret = wasm.wasmsim_occupancy(this.__wbg_ptr, elevator_ref);
        return ret >>> 0;
    }
    /**
     * Request the doors of an elevator to open. Applied immediately at a
     * stopped car with closed/closing doors; otherwise queued.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist or is disabled.
     * @param {bigint} elevator_ref
     */
    openDoor(elevator_ref) {
        const ret = wasm.wasmsim_openDoor(this.__wbg_ptr, elevator_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Pin the call at `(stop_ref, direction)` to `car_ref`, locking it
     * out of dispatch reassignment.
     *
     * # Errors
     *
     * Returns a JS error if the elevator/stop does not exist, the line
     * does not serve the stop, no hall call exists at that
     * `(stop, direction)`, or `direction` is not `"up"` / `"down"`.
     * @param {bigint} car_ref
     * @param {bigint} stop_ref
     * @param {string} direction
     */
    pinAssignment(car_ref, stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_pinAssignment(this.__wbg_ptr, car_ref, stop_ref, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Sub-tick interpolated position of `entity_ref` for smooth render
     * frames. `alpha` is in `[0.0, 1.0]` — `0.0` = current tick,
     * `1.0` = next tick. Returns `undefined` if the entity has no
     * position component.
     * @param {bigint} entity_ref
     * @param {number} alpha
     * @returns {number | undefined}
     */
    positionAt(entity_ref, alpha) {
        const ret = wasm.wasmsim_positionAt(this.__wbg_ptr, entity_ref, alpha);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Press a car-button (in-cab floor request) targeting `stop_ref`.
     *
     * # Errors
     *
     * Returns a JS error if the elevator or stop does not exist.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     */
    pressCarButton(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_pressCarButton(this.__wbg_ptr, elevator_ref, stop_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Press a hall call at a stop with direction `"up"` or `"down"`.
     *
     * # Errors
     *
     * Returns a JS error if the stop does not exist or `direction` is
     * not `"up"` or `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     */
    pressHallCall(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_pressHallCall(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Append `stop_ref` to the back of `elevator_ref`'s destination queue.
     * Adjacent duplicates are suppressed (no-op if the queue's last
     * entry already equals `stop_ref`).
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     */
    pushDestination(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_pushDestination(this.__wbg_ptr, elevator_ref, stop_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Insert `stop_ref` at the front of `elevator_ref`'s destination
     * queue ("go here next"). On the next `AdvanceQueue` phase the car
     * redirects to this new front if it differs from the current target.
     *
     * # Errors
     *
     * Returns a JS error if `elevator_ref` is not an elevator or
     * `stop_ref` is not a stop.
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     */
    pushDestinationFront(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_pushDestinationFront(this.__wbg_ptr, elevator_ref, stop_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {bigint} elevator_ref
     * @param {bigint} stop_ref
     */
    recallTo(elevator_ref, stop_ref) {
        const ret = wasm.wasmsim_recallTo(this.__wbg_ptr, elevator_ref, stop_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Remove an elevator (riders ejected to the nearest enabled stop).
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist.
     * @param {bigint} elevator_ref
     */
    removeElevator(elevator_ref) {
        const ret = wasm.wasmsim_removeElevator(this.__wbg_ptr, elevator_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Remove a line and all its elevators (riders ejected to nearest stop).
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist.
     * @param {bigint} line_ref
     */
    removeLine(line_ref) {
        const ret = wasm.wasmsim_removeLine(this.__wbg_ptr, line_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Remove a stop. In-flight riders to/from it are rerouted, ejected,
     * or abandoned per `Simulation::remove_stop` semantics.
     *
     * # Errors
     *
     * Returns a JS error if the stop does not exist.
     * @param {bigint} stop_ref
     */
    removeStop(stop_ref) {
        const ret = wasm.wasmsim_removeStop(this.__wbg_ptr, stop_ref);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Active reposition strategy name (one of `adaptive | predictive
     * | lobby | spread | none`). Used by the playground to label the
     * second chip in each pane header.
     * @returns {string}
     */
    repositionStrategyName() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_repositionStrategyName(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Number of resident riders at `stop_ref`. Faster than counting
     * `residentsAt` since it skips the array allocation.
     * @param {bigint} stop_ref
     * @returns {number}
     */
    residentCountAt(stop_ref) {
        const ret = wasm.wasmsim_residentCountAt(this.__wbg_ptr, stop_ref);
        return ret >>> 0;
    }
    /**
     * Riders settled / resident at `stop_ref` (e.g. tenants for a
     * residential building's "home floor" model). Returns an empty
     * array for missing stops.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    residentsAt(stop_ref) {
        const ret = wasm.wasmsim_residentsAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Riders currently aboard `elevator_ref`. Empty if the cab is
     * empty or `elevator_ref` is not an elevator.
     * @param {bigint} elevator_ref
     * @returns {BigUint64Array}
     */
    ridersOn(elevator_ref) {
        const ret = wasm.wasmsim_ridersOn(this.__wbg_ptr, elevator_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Get the current operational mode of an elevator as a label string.
     * Returns `"normal"` for missing/disabled elevators (matches core's
     * `service_mode` accessor, which returns the default rather than
     * erroring).
     * @param {bigint} elevator_ref
     * @returns {string}
     */
    serviceMode(elevator_ref) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_serviceMode(this.__wbg_ptr, elevator_ref);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Swap every group's dispatcher to a DCS instance with the given
     * deferred-commitment window. `window_ticks = 0` is equivalent to
     * no window (immediate sticky).
     * @param {bigint} window_ticks
     */
    setDcsWithCommitmentWindow(window_ticks) {
        wasm.wasmsim_setDcsWithCommitmentWindow(this.__wbg_ptr, window_ticks);
    }
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
     * @param {number} ticks
     */
    setDoorOpenTicksAll(ticks) {
        const ret = wasm.wasmsim_setDoorOpenTicksAll(this.__wbg_ptr, ticks);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {number} ticks
     */
    setDoorTransitionTicksAll(ticks) {
        const ret = wasm.wasmsim_setDoorTransitionTicksAll(this.__wbg_ptr, ticks);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Swap every group's dispatcher to a tuned ETD instance that
     * applies the group-time squared-wait fairness bonus. Higher
     * `weight` values bias dispatch more aggressively toward stops
     * with older waiters; `0.0` matches the default ETD.
     * @param {number} weight
     */
    setEtdWithWaitSquaredWeight(weight) {
        wasm.wasmsim_setEtdWithWaitSquaredWeight(this.__wbg_ptr, weight);
    }
    /**
     * Flip every group in the sim into the DCS hall-call mode. Required
     * before `DestinationDispatch` can see rider destinations. Scenarios
     * that want DCS (e.g. the hotel) call this once on load.
     */
    setHallCallModeDestination() {
        wasm.wasmsim_setHallCallModeDestination(this.__wbg_ptr);
    }
    /**
     * Resize a line's reachable position range. The new range may
     * grow or shrink the line; cars outside the new bounds are
     * clamped to the boundary.
     *
     * # Errors
     *
     * Returns a JS error if the line does not exist or the range is
     * non-finite or inverted.
     * @param {bigint} line_ref
     * @param {number} min_position
     * @param {number} max_position
     */
    setLineRange(line_ref, min_position, max_position) {
        const ret = wasm.wasmsim_setLineRange(this.__wbg_ptr, line_ref, min_position, max_position);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {number} speed
     */
    setMaxSpeedAll(speed) {
        const ret = wasm.wasmsim_setMaxSpeedAll(this.__wbg_ptr, speed);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {string} name
     * @returns {boolean}
     */
    setReposition(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setReposition(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Install `PredictiveParking` as the reposition strategy for every
     * group, with the given rolling window. Used by the residential
     * scenario to spotlight arrival-rate-driven pre-positioning.
     * @param {bigint} window_ticks
     */
    setRepositionPredictiveParking(window_ticks) {
        wasm.wasmsim_setRepositionPredictiveParking(this.__wbg_ptr, window_ticks);
    }
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
     * @param {bigint} elevator_ref
     * @param {string} mode
     */
    setServiceMode(elevator_ref, mode) {
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setServiceMode(this.__wbg_ptr, elevator_ref, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Swap the dispatch strategy by name. Returns `true` on success.
     *
     * State is preserved; only the assignment policy changes. Unknown names
     * return `false` so the UI can round-trip arbitrary dropdown values
     * without panicking.
     * @param {string} name
     * @returns {boolean}
     */
    setStrategy(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_setStrategy(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Set the target velocity for a Manual-mode elevator (distance/tick).
     * Positive = up, negative = down. The car ramps toward the target
     * using its configured acceleration / deceleration.
     *
     * # Errors
     *
     * Returns a JS error if the elevator does not exist, is not in
     * Manual mode, or `velocity` is non-finite.
     * @param {bigint} elevator_ref
     * @param {number} velocity
     */
    setTargetVelocity(elevator_ref, velocity) {
        const ret = wasm.wasmsim_setTargetVelocity(this.__wbg_ptr, elevator_ref, velocity);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Record a target traffic rate (riders per minute). The playground driver
     * interprets this value externally and calls [`spawn_rider`](Self::spawn_rider)
     * accordingly — the core sim is unaffected so determinism is preserved.
     *
     * [`spawn_rider`]: Self::spawn_rider
     * @param {number} riders_per_minute
     */
    setTrafficRate(riders_per_minute) {
        wasm.wasmsim_setTrafficRate(this.__wbg_ptr, riders_per_minute);
    }
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
     * @param {number} capacity
     */
    setWeightCapacityAll(capacity) {
        const ret = wasm.wasmsim_setWeightCapacityAll(this.__wbg_ptr, capacity);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Pull a cheap snapshot for rendering.
     * @returns {Snapshot}
     */
    snapshot() {
        const ret = wasm.wasmsim_snapshot(this.__wbg_ptr);
        return ret;
    }
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
     * @param {number} origin
     * @param {number} destination
     * @param {number} weight
     * @param {number | null} [patience_ticks]
     */
    spawnRider(origin, destination, weight, patience_ticks) {
        const ret = wasm.wasmsim_spawnRider(this.__wbg_ptr, origin, destination, weight, isLikeNone(patience_ticks) ? 0x100000001 : (patience_ticks) >>> 0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
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
     * @param {bigint} origin_ref
     * @param {bigint} destination_ref
     * @param {number} weight
     * @param {number | null} [patience_ticks]
     * @returns {bigint}
     */
    spawnRiderByRef(origin_ref, destination_ref, weight, patience_ticks) {
        const ret = wasm.wasmsim_spawnRiderByRef(this.__wbg_ptr, origin_ref, destination_ref, weight, isLikeNone(patience_ticks) ? 0x100000001 : (patience_ticks) >>> 0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
    /**
     * Step the simulation forward `n` ticks.
     * @param {number} n
     */
    stepMany(n) {
        wasm.wasmsim_stepMany(this.__wbg_ptr, n);
    }
    /**
     * Active strategy name.
     * @returns {string}
     */
    strategyName() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_strategyName(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Current traffic mode as classified by `TrafficDetector`.
     *
     * Returns one of `"Idle" | "UpPeak" | "InterFloor" | "DownPeak"`.
     * The UI renders this next to the strategy picker so users can see
     * `AdaptiveParking`'s mode-gated branching live as the simulation
     * swings between morning rush, midday drift, and evening rush.
     * @returns {string}
     */
    trafficMode() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.wasmsim_trafficMode(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Current traffic rate (riders/minute).
     * @returns {number}
     */
    trafficRate() {
        const ret = wasm.wasmsim_trafficRate(this.__wbg_ptr);
        return ret;
    }
    /**
     * Release a previous pin at `(stop_ref, direction)`. No-op if the
     * call does not exist or wasn't pinned.
     *
     * # Errors
     *
     * Returns a JS error if `direction` is not `"up"` / `"down"`.
     * @param {bigint} stop_ref
     * @param {string} direction
     */
    unpinAssignment(stop_ref, direction) {
        const ptr0 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_unpinAssignment(this.__wbg_ptr, stop_ref, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Current velocity (distance/tick) of `elevator_ref`. Positive = up,
     * negative = down. Returns `undefined` if the entity has no velocity
     * component (i.e. is not an elevator).
     * @param {bigint} elevator_ref
     * @returns {number | undefined}
     */
    velocity(elevator_ref) {
        const ret = wasm.wasmsim_velocity(this.__wbg_ptr, elevator_ref);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * Riders currently waiting at `stop_ref`. Returns an empty array
     * for missing stops.
     * @param {bigint} stop_ref
     * @returns {BigUint64Array}
     */
    waitingAt(stop_ref) {
        const ret = wasm.wasmsim_waitingAt(this.__wbg_ptr, stop_ref);
        var v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        return v1;
    }
    /**
     * Convenience: waiting rider count at a specific stop id.
     * @param {number} stop_id
     * @returns {number}
     */
    waitingCountAt(stop_id) {
        const ret = wasm.wasmsim_waitingCountAt(this.__wbg_ptr, stop_id);
        return ret >>> 0;
    }
    /**
     * Pull a richer game-facing view: door progress, direction lamps,
     * per-car ETAs, hall-call lamp state, and topology metadata
     * (groups + lines). Designed for game-side renderers that need
     * more than `snapshot()` exposes. All entity refs are `u64`
     * (`BigInt`) matching the live-mutation API.
     * @returns {WorldView}
     */
    worldView() {
        const ret = wasm.wasmsim_worldView(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) WasmSim.prototype[Symbol.dispose] = WasmSim.prototype.free;

/**
 * List of built-in reposition-strategy names in a stable order (for
 * populating the "Park:" popover in the playground).
 * @returns {any[]}
 */
export function builtinRepositionStrategies() {
    const ret = wasm.builtinRepositionStrategies();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * List of built-in strategy names in a stable order (for populating dropdowns).
 * @returns {any[]}
 */
export function builtinStrategies() {
    const ret = wasm.builtinStrategies();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_960c155d3d49e4c2: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_6b64449b9b9ed33c: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_new_682678e2f47e32bc: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_aa8d0fa9762c29bd: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_set_3bf1de9fab0cd644: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./elevator_wasm_bg.js": import0,
    };
}

const WasmSimFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wasmsim_free(ptr >>> 0, 1));

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getBigUint64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

let cachedBigUint64ArrayMemory0 = null;
function getBigUint64ArrayMemory0() {
    if (cachedBigUint64ArrayMemory0 === null || cachedBigUint64ArrayMemory0.byteLength === 0) {
        cachedBigUint64ArrayMemory0 = new BigUint64Array(wasm.memory.buffer);
    }
    return cachedBigUint64ArrayMemory0;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedBigUint64ArrayMemory0 = null;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('elevator_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
