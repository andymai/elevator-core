import type { Snapshot } from "./types";

// Deterministic traffic driver. The wasm sim itself stays pure — we generate
// spawns out here so:
//   1. The user can replay a run from a seed by re-running the same stream.
//   2. Strategy swaps don't change which riders exist, only how they're moved.
//   3. Compare mode can fan-out the same rider sequence to multiple sims for
//      a fair side-by-side comparison.
// A simple splitmix64-seeded LCG is more than sufficient for a UI demo.

/** A rider spec produced by the traffic driver. Caller injects into one or more sims. */
export interface RiderSpec {
  originStopId: number;
  destStopId: number;
  weight: number;
}

export class TrafficDriver {
  #state: bigint;
  #accumulator = 0; // fractional riders accumulated from rate * elapsed

  constructor(seed: number) {
    this.#state = mixSeed(BigInt(seed >>> 0));
  }

  /**
   * Advance the spawn schedule by `elapsedSeconds` and return any rider
   * specs whose accumulated time has come due. Caller is responsible for
   * dispatching the specs to one or more sims.
   */
  drainSpawns(snapshot: Snapshot, ridersPerMinute: number, elapsedSeconds: number): RiderSpec[] {
    if (ridersPerMinute <= 0 || snapshot.stops.length < 2) return [];
    // Clamp to ~4 frames at 60 Hz. When the browser tab is hidden
    // requestAnimationFrame pauses entirely, so on restore the first
    // `elapsedSeconds` is the full hidden duration — which at 120 riders/min
    // would dump ~20 spawns in a single frame and visibly jolt the sim.
    const dt = Math.min(elapsedSeconds, 4 / 60);
    this.#accumulator += (ridersPerMinute / 60) * dt;
    const out: RiderSpec[] = [];
    while (this.#accumulator >= 1.0) {
      this.#accumulator -= 1.0;
      out.push(this.#nextSpec(snapshot));
    }
    return out;
  }

  #nextSpec(snap: Snapshot): RiderSpec {
    const stops = snap.stops;
    const originIdx = this.#nextInt(stops.length);
    let destIdx = this.#nextInt(stops.length);
    if (destIdx === originIdx) destIdx = (destIdx + 1) % stops.length;
    const weight = 50 + this.#nextFloat() * 50;
    return {
      originStopId: stops[originIdx].stop_id,
      destStopId: stops[destIdx].stop_id,
      weight,
    };
  }

  #nextU64(): bigint {
    let z = (this.#state = (this.#state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn);
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return z ^ (z >> 31n);
  }

  #nextInt(n: number): number {
    return Number(this.#nextU64() % BigInt(n));
  }

  #nextFloat(): number {
    return Number(this.#nextU64() >> 11n) / 2 ** 53;
  }
}

function mixSeed(seed: bigint): bigint {
  let z = (seed + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  return z ^ (z >> 31n);
}
