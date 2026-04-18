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
     * Current tick counter.
     * @returns {bigint}
     */
    currentTick() {
        const ret = wasm.wasmsim_currentTick(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Drain all queued events since the last call. Returns an array of tagged
     * objects (matching the internal `dto::EventDto` shape).
     *
     * # Errors
     *
     * Returns a JS error only if serialization fails.
     * @returns {any}
     */
    drainEvents() {
        const ret = wasm.wasmsim_drainEvents(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
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
     * Current aggregate metrics. Returns a plain JS object.
     *
     * # Errors
     *
     * Returns a JS error only if serialization fails.
     * @returns {any}
     */
    metrics() {
        const ret = wasm.wasmsim_metrics(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
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
     */
    constructor(config_ron, strategy) {
        const ptr0 = passStringToWasm0(config_ron, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(strategy, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.wasmsim_new(ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        WasmSimFinalization.register(this, this.__wbg_ptr, this);
        return this;
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
     * Install `PredictiveParking` as the reposition strategy for every
     * group, with the given rolling window. Used by the residential
     * scenario to spotlight arrival-rate-driven pre-positioning.
     * @param {bigint} window_ticks
     */
    setRepositionPredictiveParking(window_ticks) {
        wasm.wasmsim_setRepositionPredictiveParking(this.__wbg_ptr, window_ticks);
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
     * Pull a cheap snapshot for rendering. Returns a plain JS object matching
     * the internal `dto::Snapshot` shape.
     *
     * # Errors
     *
     * Returns a JS error only if serialization to `JsValue` fails, which
     * indicates a bug in the DTO layer rather than a runtime condition.
     * @returns {any}
     */
    snapshot() {
        const ret = wasm.wasmsim_snapshot(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Spawn a single rider between two stop ids at the given weight.
     *
     * # Errors
     *
     * Returns a JS error if either stop id is unknown or the rider is
     * rejected by the sim.
     * @param {number} origin
     * @param {number} destination
     * @param {number} weight
     */
    spawnRider(origin, destination, weight) {
        const ret = wasm.wasmsim_spawnRider(this.__wbg_ptr, origin, destination, weight);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
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
     * Current traffic rate (riders/minute).
     * @returns {number}
     */
    trafficRate() {
        const ret = wasm.wasmsim_trafficRate(this.__wbg_ptr);
        return ret;
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
}
if (Symbol.dispose) WasmSim.prototype[Symbol.dispose] = WasmSim.prototype.free;

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
