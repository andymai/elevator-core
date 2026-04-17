import type { Sim } from "./sim";
import type { Snapshot } from "./types";

// Deterministic traffic driver. The wasm sim itself stays pure — we generate
// spawns out here so:
//   1. The user can replay a run from a seed by re-running the same stream.
//   2. Strategy swaps don't change which riders exist, only how they're moved.
// A simple LCG (splitmix-style seeded) is more than sufficient for a UI demo.

export class TrafficDriver {
  #state: bigint;
  #accumulator = 0; // fractional riders accumulated from rate * elapsed

  constructor(seed: number) {
    // splitmix64 seeding so sequential seeds (1, 2, 3) produce uncorrelated streams.
    this.#state = mixSeed(BigInt(seed >>> 0));
  }

  /** Consume pending spawns and emit them. Call once per UI frame. */
  tickSpawns(sim: Sim, snapshot: Snapshot, ridersPerMinute: number, elapsedSeconds: number): void {
    if (ridersPerMinute <= 0 || snapshot.stops.length < 2) return;
    this.#accumulator += (ridersPerMinute / 60) * elapsedSeconds;
    while (this.#accumulator >= 1.0) {
      this.#accumulator -= 1.0;
      this.#spawnOne(sim, snapshot);
    }
  }

  #spawnOne(sim: Sim, snap: Snapshot): void {
    const stops = snap.stops;
    const originIdx = this.#nextInt(stops.length);
    let destIdx = this.#nextInt(stops.length);
    if (destIdx === originIdx) destIdx = (destIdx + 1) % stops.length;
    const weight = 50 + this.#nextFloat() * 50;
    try {
      sim.spawnRider(stops[originIdx].stop_id, stops[destIdx].stop_id, weight);
    } catch {
      // spawn_rider can reject if no group serves both stops; ignore.
    }
  }

  #nextU64(): bigint {
    // splitmix64 step
    let z = (this.#state = (this.#state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn);
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return z ^ (z >> 31n);
  }

  #nextInt(n: number): number {
    return Number(this.#nextU64() % BigInt(n));
  }

  #nextFloat(): number {
    // Upper 53 bits → [0, 1).
    return Number(this.#nextU64() >> 11n) / 2 ** 53;
  }
}

function mixSeed(seed: bigint): bigint {
  let z = (seed + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
  return z ^ (z >> 31n);
}
