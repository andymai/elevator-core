import { describe, expect, it } from "vitest";
import { TrafficDriver } from "../sim/traffic-driver";
import type { Phase, Snapshot } from "../types";

// Minimal stub with just the shape `TrafficDriver` consumes. Stops need
// ascending `stop_id`s so origin/dest collisions resolve to a valid
// neighbor rather than a duplicate.
function snapshotWithStops(n: number): Snapshot {
  return {
    tick: 0,
    dt: 1 / 60,
    cars: [],
    stops: Array.from({ length: n }, (_, i) => ({
      entity_id: i,
      stop_id: i,
      name: `Stop ${i}`,
      y: i * 10,
      waiting: 0,
      waiting_up: 0,
      waiting_down: 0,
      residents: 0,
    })),
  };
}

const FLAT = (n: number, rate: number): Phase => ({
  name: `phase-${n}`,
  durationSec: n,
  ridersPerMin: rate,
});

describe("TrafficDriver — phase schedule", () => {
  it("emits no spawns when no phases are installed", () => {
    const d = new TrafficDriver(1);
    const snap = snapshotWithStops(3);
    // Step one full minute; should stay silent.
    expect(d.drainSpawns(snap, 60)).toHaveLength(0);
  });

  it("spawn rate matches the current phase's ridersPerMin", () => {
    const d = new TrafficDriver(42);
    d.setPhases([FLAT(300, 60)]); // one phase, 5 min, 60 riders/min = 1/s
    const snap = snapshotWithStops(3);
    // Advance 10 sim-seconds in small per-frame slices.
    let spawns = 0;
    for (let i = 0; i < 10 * 60; i += 1) spawns += d.drainSpawns(snap, 1 / 60).length;
    // At 1 rider/sec for 10 sec we expect ~10 spawns ± accumulator remainder.
    expect(spawns).toBeGreaterThanOrEqual(9);
    expect(spawns).toBeLessThanOrEqual(11);
  });

  it("intensity multiplier scales the effective rate", () => {
    const d = new TrafficDriver(1);
    d.setPhases([FLAT(300, 60)]);
    d.setIntensity(2);
    const snap = snapshotWithStops(3);
    let spawns = 0;
    for (let i = 0; i < 10 * 60; i += 1) spawns += d.drainSpawns(snap, 1 / 60).length;
    // 2× intensity × 1 rider/sec × 10 sec ≈ 20.
    expect(spawns).toBeGreaterThanOrEqual(19);
    expect(spawns).toBeLessThanOrEqual(21);
  });

  it("advances through phases in order and wraps back to zero", () => {
    const d = new TrafficDriver(1);
    d.setPhases([FLAT(1, 0), FLAT(1, 0), FLAT(1, 0)]);
    const snap = snapshotWithStops(2);

    expect(d.currentPhaseIndex()).toBe(0);
    // Advance 1.2s → into phase 1.
    for (let i = 0; i < 72; i += 1) d.drainSpawns(snap, 1 / 60);
    expect(d.currentPhaseIndex()).toBe(1);
    // Advance another 1s → into phase 2.
    for (let i = 0; i < 60; i += 1) d.drainSpawns(snap, 1 / 60);
    expect(d.currentPhaseIndex()).toBe(2);
    // Advance another 1s → wraps back to phase 0.
    for (let i = 0; i < 60; i += 1) d.drainSpawns(snap, 1 / 60);
    expect(d.currentPhaseIndex()).toBe(0);
  });

  it("honours originWeights — zero weights are excluded", () => {
    const d = new TrafficDriver(7);
    d.setPhases([
      {
        name: "lobby-heavy",
        durationSec: 60,
        ridersPerMin: 600,
        // Only stop 0 can be the origin. stop 1 / stop 2 must never appear.
        originWeights: [1, 0, 0],
      },
    ]);
    const snap = snapshotWithStops(3);
    const spawns: number[] = [];
    for (let i = 0; i < 60; i += 1) {
      for (const spec of d.drainSpawns(snap, 1 / 60)) spawns.push(spec.originStopId);
    }
    expect(spawns.length).toBeGreaterThan(0);
    expect(spawns.every((s) => s === 0)).toBe(true);
  });

  it("honours destWeights — zero weights are excluded", () => {
    const d = new TrafficDriver(11);
    d.setPhases([
      {
        name: "down-peak",
        // Riders originate from any *upper* stop and head to the lobby.
        // Keeping origins off the lobby avoids the collision-rotation
        // guard muddying the destination distribution.
        durationSec: 60,
        ridersPerMin: 600,
        originWeights: [0, 1, 1],
        destWeights: [1, 0, 0],
      },
    ]);
    const snap = snapshotWithStops(3);
    const dests: number[] = [];
    for (let i = 0; i < 60; i += 1) {
      for (const spec of d.drainSpawns(snap, 1 / 60)) dests.push(spec.destStopId);
    }
    expect(dests.length).toBeGreaterThan(0);
    expect(dests.every((d) => d === 0)).toBe(true);
  });

  it("re-installing phases resets the cycle clock to 0", () => {
    const d = new TrafficDriver(1);
    d.setPhases([FLAT(10, 0)]);
    for (let i = 0; i < 600; i += 1) d.drainSpawns(snapshotWithStops(2), 1 / 60);
    expect(d.phaseProgress()).toBeGreaterThan(0);
    d.setPhases([FLAT(10, 0)]);
    expect(d.phaseProgress()).toBe(0);
  });

  it("never emits a spec whose origin equals its destination", () => {
    const d = new TrafficDriver(99);
    d.setPhases([
      // Same-side weights — if the implementation blindly drew twice
      // from `destWeights`, collisions would be common. The collision
      // guard must rotate destination to the next stop.
      {
        name: "collider",
        durationSec: 60,
        ridersPerMin: 600,
        originWeights: [1, 0, 0, 0],
        destWeights: [1, 0, 0, 0],
      },
    ]);
    const snap = snapshotWithStops(4);
    let checked = 0;
    for (let i = 0; i < 60; i += 1) {
      for (const spec of d.drainSpawns(snap, 1 / 60)) {
        expect(spec.originStopId).not.toBe(spec.destStopId);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("stamps patienceTicks on every spec when set, omits when unset", () => {
    const d = new TrafficDriver(3);
    d.setPhases([FLAT(60, 600)]);
    const snap = snapshotWithStops(3);

    // Unset (default 0): specs must carry no patienceTicks field.
    let hadAny = false;
    for (let i = 0; i < 30; i += 1) {
      for (const s of d.drainSpawns(snap, 1 / 60)) {
        hadAny = true;
        expect(s.patienceTicks).toBeUndefined();
      }
    }
    expect(hadAny).toBe(true);

    // Set: every emitted spec carries the configured budget.
    d.setPatienceTicks(5400); // 90 s at 60 Hz
    let stamped = 0;
    for (let i = 0; i < 30; i += 1) {
      for (const s of d.drainSpawns(snap, 1 / 60)) {
        expect(s.patienceTicks).toBe(5400);
        stamped += 1;
      }
    }
    expect(stamped).toBeGreaterThan(0);

    // Zero disables again — a scenario that changes its mind on reset.
    d.setPatienceTicks(0);
    let afterZero = 0;
    for (let i = 0; i < 30; i += 1) {
      for (const s of d.drainSpawns(snap, 1 / 60)) {
        expect(s.patienceTicks).toBeUndefined();
        afterZero += 1;
      }
    }
    expect(afterZero).toBeGreaterThan(0);
  });

  it("is deterministic for a given seed", () => {
    const phases = [FLAT(120, 120)];
    const snap = snapshotWithStops(3);
    const a = new TrafficDriver(12345);
    a.setPhases(phases);
    const b = new TrafficDriver(12345);
    b.setPhases(phases);
    const seqA: string[] = [];
    const seqB: string[] = [];
    for (let i = 0; i < 60 * 10; i += 1) {
      for (const s of a.drainSpawns(snap, 1 / 60))
        seqA.push(`${s.originStopId}-${s.destStopId}-${s.weight.toFixed(3)}`);
      for (const s of b.drainSpawns(snap, 1 / 60))
        seqB.push(`${s.originStopId}-${s.destStopId}-${s.weight.toFixed(3)}`);
    }
    expect(seqA.length).toBeGreaterThan(0);
    expect(seqA).toEqual(seqB);
  });
});
