import type { Phase, Snapshot } from "./types";

// Deterministic traffic driver. The wasm sim itself stays pure — we generate
// spawns out here so:
//   1. The user can replay a run from a seed by re-running the same stream.
//   2. Strategy swaps don't change which riders exist, only how they're moved.
//   3. Compare mode can fan-out the same rider sequence to multiple sims for
//      a fair side-by-side comparison.
//
// The driver is phase-aware: scenarios supply a list of `Phase` entries that
// describe how the day evolves (rate + origin/destination weights). The driver
// linearly cycles through them, wrapping at the end so scenarios loop
// indefinitely. The UI reads `currentPhaseLabel()` + `phaseProgress()` to
// render the phase indicator.
//
// A simple splitmix64-seeded LCG is more than sufficient for a UI demo.

/** A rider spec produced by the traffic driver. Caller injects into one or more sims. */
export interface RiderSpec {
  originStopId: number;
  destStopId: number;
  weight: number;
  /**
   * Optional wait budget (in sim ticks) before this rider abandons
   * the queue. Set per-scenario by the caller via {@link TrafficDriver.setPatienceTicks}
   * so every rider in a scenario inherits the same patience — per-rider
   * variability is nice but this is a UI demo, not a human-model study.
   */
  patienceTicks?: number;
}

export class TrafficDriver {
  #state: bigint;
  #accumulator = 0; // fractional riders accumulated from rate * elapsed
  #phases: Phase[] = [];
  #totalDurationSec = 0;
  #elapsedInCycleSec = 0;
  /** User-facing intensity multiplier, 0.5×–2×. Applied on top of phase rate. */
  #intensity = 1.0;
  /** Patience budget stamped onto each emitted spec. 0 = abandonment off. */
  #patienceTicks = 0;

  constructor(seed: number) {
    this.#state = mixSeed(BigInt(seed >>> 0));
  }

  /**
   * Install a new phase schedule. Called on scenario load. Empty array
   * clears the schedule — the driver then reports rate 0 and emits no
   * spawns (used by the convention burst scenario, which pre-seeds
   * riders via `seedSpawns` instead).
   */
  setPhases(phases: Phase[]): void {
    this.#phases = phases;
    this.#totalDurationSec = phases.reduce((acc, p) => acc + p.durationSec, 0);
    this.#elapsedInCycleSec = 0;
    this.#accumulator = 0;
  }

  setIntensity(multiplier: number): void {
    // Clamp defensively even though the UI already bounds the slider —
    // a bad permalink could push it negative and the driver would never spawn.
    this.#intensity = Math.max(0, multiplier);
  }

  /**
   * Stamp every emitted {@link RiderSpec} with this patience budget
   * (in sim ticks). Zero or negative values disable abandonment —
   * riders wait forever. Set once when a scenario loads.
   */
  setPatienceTicks(ticks: number): void {
    this.#patienceTicks = Math.max(0, Math.floor(ticks));
  }

  /**
   * Advance the spawn schedule by `elapsedSeconds` and return any rider
   * specs whose accumulated time has come due. Caller is responsible for
   * dispatching the specs to one or more sims.
   */
  drainSpawns(snapshot: Snapshot, elapsedSeconds: number): RiderSpec[] {
    if (this.#phases.length === 0) return [];
    // `stop_id === 0xFFFFFFFF` is the wasm DTO sentinel for stops added
    // at runtime (absent from the initial config lookup). Feeding it to
    // `spawn_rider` throws a JsError the scenario caller usually swallows,
    // so spawns would silently drop. Gate addressable stops here so a
    // snapshot with &lt;2 addressable stops produces no specs at all.
    const addressable = snapshot.stops.filter((s) => s.stop_id !== 0xffffffff);
    if (addressable.length < 2) return [];
    // Clamp to ~4 frames at 60 Hz. When the browser tab is hidden
    // requestAnimationFrame pauses entirely, so on restore the first
    // `elapsedSeconds` is the full hidden duration — which at 120 riders/min
    // would dump ~20 spawns in a single frame and visibly jolt the sim.
    const dt = Math.min(elapsedSeconds, 4 / 60);
    const phase = this.#phases[this.currentPhaseIndex()];
    this.#accumulator += ((phase.ridersPerMin * this.#intensity) / 60) * dt;
    this.#elapsedInCycleSec = (this.#elapsedInCycleSec + dt) % (this.#totalDurationSec || 1);
    const out: RiderSpec[] = [];
    while (this.#accumulator >= 1.0) {
      this.#accumulator -= 1.0;
      out.push(this.#nextSpec(addressable, phase));
    }
    return out;
  }

  /**
   * Which phase is currently active. Index into the phase schedule;
   * wraps at the end so scenarios loop. Always 0 when no schedule is
   * installed.
   */
  currentPhaseIndex(): number {
    if (this.#phases.length === 0) return 0;
    let t = this.#elapsedInCycleSec;
    for (let i = 0; i < this.#phases.length; i += 1) {
      t -= this.#phases[i].durationSec;
      if (t < 0) return i;
    }
    return this.#phases.length - 1;
  }

  currentPhaseLabel(): string {
    return this.#phases[this.currentPhaseIndex()]?.name ?? "";
  }

  /** 0..1 progress through the full day cycle. Used to render the phase strip. */
  phaseProgress(): number {
    if (this.#totalDurationSec <= 0) return 0;
    return Math.min(1, this.#elapsedInCycleSec / this.#totalDurationSec);
  }

  /**
   * 0..1 progress *within* the current phase. Drives the slim progress
   * bar under the phase label so users can feel the next phase coming.
   * Returns 0 when the driver has no schedule installed.
   */
  progressInPhase(): number {
    if (this.#phases.length === 0) return 0;
    let t = this.#elapsedInCycleSec;
    for (let i = 0; i < this.#phases.length; i += 1) {
      const d = this.#phases[i].durationSec;
      if (t < d) return d > 0 ? Math.min(1, t / d) : 0;
      t -= d;
    }
    return 1;
  }

  /** Read-only view of the installed phase schedule — the UI draws the strip from this. */
  phases(): readonly Phase[] {
    return this.#phases;
  }

  #nextSpec(stops: Snapshot["stops"], phase: Phase): RiderSpec {
    const originIdx = this.#pickWeighted(stops.length, phase.originWeights);
    let destIdx = this.#pickWeighted(stops.length, phase.destWeights);
    // Same-stop collisions are a natural result of zero-weight entries
    // in the destination vector. Rotate forward to the next index so
    // we never emit a degenerate same-origin-and-destination spec.
    if (destIdx === originIdx) destIdx = (destIdx + 1) % stops.length;
    const weight = 50 + this.#nextFloat() * 50;
    return {
      originStopId: stops[originIdx].stop_id,
      destStopId: stops[destIdx].stop_id,
      weight,
      patienceTicks: this.#patienceTicks > 0 ? this.#patienceTicks : undefined,
    };
  }

  /**
   * Draw an index into a vector of `n` slots. If `weights` is supplied
   * and has the expected length, each slot's selection probability is
   * proportional to its weight (zero weights are effectively excluded).
   * Otherwise the draw is uniform.
   */
  #pickWeighted(n: number, weights: number[] | undefined): number {
    if (!weights || weights.length !== n) {
      return this.#nextInt(n);
    }
    let total = 0;
    for (let i = 0; i < n; i += 1) total += Math.max(0, weights[i]);
    if (total <= 0) return this.#nextInt(n);
    let r = this.#nextFloat() * total;
    for (let i = 0; i < n; i += 1) {
      r -= Math.max(0, weights[i]);
      if (r < 0) return i;
    }
    return n - 1;
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
