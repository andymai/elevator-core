import { describe, expect, it } from "vitest";
import {
  WorkerSim,
  createWorkerSim,
  type HostToWorker,
  type InitPayload,
  type TickResultPayload,
  type WorkerToHost,
} from "../features/quest";

// These tests verify the protocol's shape and discriminated-union
// exhaustiveness without spinning up a real Worker. jsdom has no
// `Worker`, and instantiating the wasm sim requires the pkg/ bundle
// — the live host↔worker round-trip is exercised in browser only.

describe("quest: protocol shape", () => {
  it("HostToWorker covers all six command kinds", () => {
    const initPayload: InitPayload = {
      configRon: "",
      strategy: "scan",
      wasmJsUrl: "https://example.test/pkg/elevator_wasm.js",
      wasmBgUrl: "https://example.test/pkg/elevator_wasm_bg.wasm",
    };
    const messages: HostToWorker[] = [
      { kind: "init", id: 1, payload: initPayload },
      { kind: "tick", id: 2, ticks: 5 },
      { kind: "spawn-rider", id: 3, origin: 0, destination: 2, weight: 75 },
      { kind: "set-strategy", id: 4, strategy: "etd" },
      { kind: "reset", id: 5, payload: initPayload },
      { kind: "load-controller", id: 6, source: "sim.setStrategy('scan');", unlockedApi: null },
    ];
    expect(messages.map((m) => m.kind)).toEqual([
      "init",
      "tick",
      "spawn-rider",
      "set-strategy",
      "reset",
      "load-controller",
    ]);
  });

  it("WorkerToHost covers the four response kinds", () => {
    const tickResult: TickResultPayload = {
      snapshot: { tick: 0n, cars: [], stops: [], assignments: [] } as never,
      tick: 0,
      events: [],
      metrics: {} as never,
    };
    const messages: WorkerToHost[] = [
      { kind: "ok", id: 1 },
      { kind: "tick-result", id: 2, result: tickResult },
      { kind: "spawn-result", id: 3, riderId: 42n, error: null },
      { kind: "spawn-result", id: 4, riderId: null, error: "nope" },
      { kind: "error", id: 5, message: "boom" },
    ];
    expect(messages.map((m) => m.kind)).toEqual([
      "ok",
      "tick-result",
      "spawn-result",
      "spawn-result",
      "error",
    ]);
  });

  it("init payload optional reposition is omitted, not undefined", () => {
    // exactOptionalPropertyTypes compatibility: omitting the field
    // is the supported shape; setting it to undefined would fail to
    // type-check at the call site.
    const a: InitPayload = {
      configRon: "",
      strategy: "scan",
      wasmJsUrl: "",
      wasmBgUrl: "",
    };
    expect(Object.hasOwn(a, "reposition")).toBe(false);

    const b: InitPayload = {
      configRon: "",
      strategy: "scan",
      reposition: "predictive",
      wasmJsUrl: "",
      wasmBgUrl: "",
    };
    expect(b.reposition).toBe("predictive");
  });

  it("WorkerSim.loadController posts a load-controller request", () => {
    // Verify the host-side wrapper produces the right protocol shape.
    // The mock Worker captures the posted message without spinning up
    // a real worker.
    const posted: HostToWorker[] = [];
    const mock = {
      addEventListener(_t: string, _f: EventListener) {},
      removeEventListener(_t: string, _f: EventListener) {},
      postMessage(msg: HostToWorker) {
        posted.push(msg);
      },
      terminate() {},
    } as unknown as Worker;

    const sim = new WorkerSim(mock);
    void sim.loadController("sim.addDestination(0, 2);");

    expect(posted).toHaveLength(1);
    const msg = posted[0];
    expect(msg).toBeDefined();
    expect(msg.kind).toBe("load-controller");
    if (msg.kind === "load-controller") {
      expect(msg.source).toContain("addDestination");
    }
  });

  it("public surface re-exports WorkerSim and createWorkerSim", () => {
    // Smoke check: keeps the runtime entry points reachable from a
    // test entry while the Quest mode shell is still being wired up.
    // Constructing a real WorkerSim requires Web Workers + the wasm
    // pkg/ bundle, neither of which is available in jsdom; that path
    // gets exercised once the shell integration lands.
    expect(typeof WorkerSim).toBe("function");
    expect(typeof createWorkerSim).toBe("function");
  });

  it("WorkerSim rejects pending requests when the worker errors", async () => {
    // Mock Worker that captures listeners so we can fire `error`
    // ourselves. Without `onerror` wiring, an unhandled worker
    // exception would leave every pending promise hanging forever.
    const listeners = new Map<string, EventListener>();
    const mock = {
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn);
      },
      removeEventListener(type: string, _fn: EventListener) {
        listeners.delete(type);
      },
      postMessage(_msg: unknown) {},
      terminate() {},
    } as unknown as Worker;

    const sim = new WorkerSim(mock);
    const pending = sim.tick(1);

    // Synthesize a worker error. The listener duck-types `.message`
    // rather than checking `instanceof ErrorEvent`, so a plain object
    // shaped like an `ErrorEvent` is enough to drive the path.
    const errorListener = listeners.get("error");
    expect(errorListener).toBeDefined();
    errorListener!({ message: "wasm panic" } as unknown as Event);

    await expect(pending).rejects.toThrow(/wasm panic/);

    // After an error, future requests reject immediately because the
    // handle marks itself disposed.
    await expect(sim.tick(1)).rejects.toThrow(/disposed/);
  });

  it("spawn-result encodes success with riderId and failure with error", () => {
    const success: WorkerToHost = {
      kind: "spawn-result",
      id: 1,
      riderId: 1n,
      error: null,
    };
    const failure: WorkerToHost = {
      kind: "spawn-result",
      id: 2,
      riderId: null,
      error: "no such stop",
    };
    expect(success.kind === "spawn-result" && success.riderId).toBe(1n);
    expect(failure.kind === "spawn-result" && failure.error).toBe("no such stop");
  });
});
