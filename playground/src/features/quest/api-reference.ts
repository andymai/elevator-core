/**
 * Curated one-line descriptions for the elevator-core wasm methods
 * the curriculum exposes through `Stage.unlockedApi`.
 *
 * These descriptions are hand-authored rather than extracted from the
 * wasm `.d.ts` JSDoc because (a) the JSDoc strings are written for
 * library consumers rather than learners, (b) extracting at build
 * time adds a tooling step we don't otherwise need, and (c) the
 * curriculum already hand-tunes how each method is introduced. The
 * tradeoff is that this file falls behind the wasm surface unless
 * authors update it; the test below pins the curriculum's
 * `unlockedApi` lists to entries here, so adding a new unlock
 * without an entry breaks the build.
 */

export interface ApiEntry {
  /** Wasm method name (matches `Stage.unlockedApi` strings). */
  readonly name: string;
  /** Function signature shown alongside the name. */
  readonly signature: string;
  /** One-line description in plain language. */
  readonly description: string;
}

export const API_REFERENCE: readonly ApiEntry[] = [
  {
    name: "pushDestination",
    signature: "pushDestination(carRef, stopRef): void",
    description: "Append a stop to the back of the car's destination queue.",
  },
  {
    name: "hallCalls",
    signature: "hallCalls(): { stop, direction }[]",
    description: "Pending hall calls — riders waiting at floors.",
  },
  {
    name: "carCalls",
    signature: "carCalls(carRef): number[]",
    description: "Stop ids the riders inside the car have pressed.",
  },
  {
    name: "drainEvents",
    signature: "drainEvents(): EventDto[]",
    description: "Take the events fired since the last drain (rider, elevator, door, …).",
  },
  {
    name: "setStrategy",
    signature: "setStrategy(name): boolean",
    description:
      "Swap to a built-in dispatch strategy by name (scan / look / nearest / etd / rsr).",
  },
  {
    name: "setStrategyJs",
    signature: "setStrategyJs(name, rank): boolean",
    description:
      "Register your own ranking function as the dispatcher. Return a number per (car, stop) pair; null excludes.",
  },
  {
    name: "setServiceMode",
    signature: "setServiceMode(carRef, mode): void",
    description: "Switch a car between normal / manual / out-of-service modes.",
  },
  {
    name: "setTargetVelocity",
    signature: "setTargetVelocity(carRef, vMps): void",
    description: "Drive a manual-mode car directly. Positive is up, negative is down.",
  },
  {
    name: "holdDoor",
    signature: "holdDoor(carRef, ticks): void",
    description:
      "Hold the car's doors open for the given number of extra ticks. Calling again before the timer elapses extends the hold; cancelDoorHold clears it.",
  },
  {
    name: "cancelDoorHold",
    signature: "cancelDoorHold(carRef): void",
    description: "Release a holdDoor; doors close on the next loading-complete tick.",
  },
  {
    name: "emergencyStop",
    signature: "emergencyStop(carRef): void",
    description: "Halt a car immediately — no door cycle, no queue drain.",
  },
  {
    name: "shortestRoute",
    signature: "shortestRoute(originStop, destStop): number[]",
    description: "Canonical route between two stops. First entry is origin, last is destination.",
  },
  {
    name: "reroute",
    signature: "reroute(riderRef, newDestStop): void",
    description:
      "Send a rider to a new destination stop from wherever they currently are. Useful when their original destination is no longer reachable.",
  },
  {
    name: "transferPoints",
    signature: "transferPoints(): number[]",
    description:
      "Stops that bridge two lines — useful when ranking trips that may need a transfer.",
  },
  {
    name: "reachableStopsFrom",
    signature: "reachableStopsFrom(stop): number[]",
    description: "Every stop reachable without changing lines.",
  },
  {
    name: "addStop",
    signature: "addStop(lineRef, name, position): bigint",
    description:
      "Create a new stop on a line. Returns the new stop's ref. Dispatch starts routing to it on the next tick.",
  },
  {
    name: "addStopToLine",
    signature: "addStopToLine(stopRef, lineRef): void",
    description: "Register a stop on a line so dispatch routes to it.",
  },
  {
    name: "assignLineToGroup",
    signature: "assignLineToGroup(lineRef, groupId): number",
    description:
      "Put a line under a group's dispatcher (groupId is a plain number). Two groups means two independent dispatch passes; the call returns the new dispatcher's id.",
  },
  {
    name: "reassignElevatorToLine",
    signature: "reassignElevatorToLine(carRef, lineRef): void",
    description: "Move a car to a different line. Useful for duty-banding when one zone is busier.",
  },
];

const API_BY_NAME = new Map<string, ApiEntry>(API_REFERENCE.map((e) => [e.name, e]));

/** Look up an API entry by method name. */
export function apiEntry(name: string): ApiEntry | undefined {
  return API_BY_NAME.get(name);
}

/**
 * Return the entries that match the supplied unlocked-API list,
 * preserving the registry's original ordering. Unknown names are
 * skipped — they're flagged by the curriculum-completeness test
 * rather than rendered as broken rows.
 */
export function unlockedEntries(unlockedApi: readonly string[]): readonly ApiEntry[] {
  const allowed = new Set(unlockedApi);
  return API_REFERENCE.filter((e) => allowed.has(e.name));
}
