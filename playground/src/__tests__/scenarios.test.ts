import { describe, expect, it } from "vitest";
import { SCENARIOS, scenarioById } from "../domain/scenarios";

describe("scenarios metadata", () => {
  it("ships exactly 4 scenarios", () => {
    expect(SCENARIOS).toHaveLength(4);
  });

  it("every id is unique", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every scenario declares a default strategy", () => {
    for (const s of SCENARIOS) {
      expect(s.defaultStrategy, s.id).toMatch(/^(scan|look|nearest|etd|destination|rsr)$/);
    }
  });

  it("every scenario has phases, seedSpawns, or opts into manual-control", () => {
    // Manual-control scenarios run with `phases: []` because riders are
    // spawned by hand from the controls panel — there's no day cycle to
    // schedule. Allow that case so the assertion catches truly empty
    // scenarios while letting `manualControl` opt out.
    for (const s of SCENARIOS) {
      const phased = s.phases.length > 0;
      const seeded = s.seedSpawns > 0;
      const manual = s.manualControl !== undefined;
      expect(phased || seeded || manual, `${s.id} has no phases / seedSpawns / manualControl`).toBe(
        true,
      );
    }
  });

  it("every phase references a valid rate and duration", () => {
    for (const s of SCENARIOS) {
      for (const p of s.phases) {
        expect(p.durationSec, `${s.id}:${p.name}`).toBeGreaterThan(0);
        expect(p.ridersPerMin, `${s.id}:${p.name}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("phase weight vectors (when set) have one entry per stop", () => {
    for (const s of SCENARIOS) {
      // Count StopConfig(id: entries in the RON blob — cheap substring count.
      const stopCount = (s.ron.match(/StopConfig\s*\(/g) ?? []).length;
      for (const p of s.phases) {
        if (p.originWeights) {
          expect(p.originWeights.length, `${s.id}:${p.name}.originWeights`).toBe(stopCount);
        }
        if (p.destWeights) {
          expect(p.destWeights.length, `${s.id}:${p.name}.destWeights`).toBe(stopCount);
        }
      }
    }
  });

  it("day-cycle scenarios sum to a plausible length (1–10 real-min range)", () => {
    // Target: ~5 min per sim-day. Phases are in sim-seconds with the
    // sim running at the 2× default playback, so real-time duration
    // is sum(durationSec) / 2. Accept 1 min (fast demo cadence)
    // through 10 min (deliberately slow "live" run).
    for (const s of SCENARIOS) {
      if (s.phases.length === 0) continue;
      const totalSimSec = s.phases.reduce((acc, p) => acc + p.durationSec, 0);
      const realMin = totalSimSec / 2 / 60;
      expect(realMin, s.id).toBeGreaterThanOrEqual(1);
      expect(realMin, s.id).toBeLessThanOrEqual(10);
    }
  });

  it("scenarioById falls back to the first scenario for unknown ids", () => {
    expect(scenarioById("does-not-exist").id).toBe(SCENARIOS[0].id);
  });

  it("labels are non-empty", () => {
    for (const s of SCENARIOS) {
      expect(s.label.length, s.id).toBeGreaterThan(0);
      expect(s.description.length, s.id).toBeGreaterThan(0);
    }
  });

  // Operator-cockpit shape — guards against accidental regression
  // back toward the previous "expose every WASM API as a control"
  // demo. The id stays "manual-office" for permalink stability.
  it("operator cockpit scenario keeps its single-car / Manual shape", () => {
    const cockpit = scenarioById("manual-office");
    expect(cockpit.label).toBe("Operator cockpit");
    expect(cockpit.defaultCars).toBe(1);
    expect(cockpit.tweakRanges.cars.min).toBe(1);
    expect(cockpit.tweakRanges.cars.max).toBe(1);
    expect(cockpit.manualControl).toBeDefined();
    expect(cockpit.manualControl?.defaultServiceMode).toBe("manual");
    expect(cockpit.manualControl?.allowAddRemoveCar).toBe(false);
    // Single calm phase ("Drift") with a low spawn rate; the RON
    // mean_interval_ticks should match the per-min rate at 60 Hz.
    expect(cockpit.phases).toHaveLength(1);
    expect(cockpit.phases[0]?.ridersPerMin).toBe(4);
    expect(cockpit.passengerMeanIntervalTicks).toBe(900);
    expect(cockpit.ron).toMatch(/mean_interval_ticks:\s*900/);
  });
});
