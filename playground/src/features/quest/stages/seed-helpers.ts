/**
 * Compact builders for stage `seedRiders` lists. Stages declare their
 * arrival pattern as a few `arrivals({...})` calls instead of
 * hand-writing every entry — keeping the per-stage authoring focused
 * on traffic shape, not on the index/weight/patience boilerplate.
 *
 * Helpers stay deliberately small: each one expresses one common
 * pattern (round-robin destinations from a single origin, etc.).
 * Stages with idiosyncratic traffic still write inline arrays.
 */

import type { SeededRider } from "./types";

interface ArrivalsSpec {
  /** Stop id where every rider in this batch appears. */
  readonly origin: number;
  /**
   * Stop ids the riders head to, walked round-robin in order. The
   * first rider goes to `destinations[0]`, the second to `[1]`, and
   * so on, wrapping when the count exceeds the list length. Choose
   * the order you want the dispatcher to see.
   */
  readonly destinations: readonly number[];
  /** First arrival's tick. Defaults to 0. */
  readonly startTick?: number;
  /**
   * Ticks between arrivals. Defaults to 30 (~0.5 sim-seconds at 60
   * tps). Lower = denser traffic, higher = relaxed pacing.
   */
  readonly intervalTicks?: number;
  /** Rider weight in kg. Defaults to the runner's default. */
  readonly weight?: number;
  /** Tick budget before abandon. Omit to use the sim's default. */
  readonly patienceTicks?: number;
}

/**
 * Generate `count` arrivals from a single origin to a round-robin
 * destination list, evenly spaced in time.
 */
export function arrivals(count: number, spec: ArrivalsSpec): SeededRider[] {
  const start = spec.startTick ?? 0;
  const interval = spec.intervalTicks ?? 30;
  const dests = spec.destinations;
  if (dests.length === 0) {
    throw new Error("arrivals: destinations must be non-empty");
  }
  return Array.from({ length: count }, (_, i): SeededRider => {
    const dest = dests[i % dests.length] as number;
    return {
      origin: spec.origin,
      destination: dest,
      atTick: start + i * interval,
      ...(spec.weight !== undefined ? { weight: spec.weight } : {}),
      ...(spec.patienceTicks !== undefined ? { patienceTicks: spec.patienceTicks } : {}),
    };
  });
}
