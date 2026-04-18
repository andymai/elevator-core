import { describe, expect, it } from "vitest";
import { SCENARIOS, scenarioById } from "../scenarios";

describe("scenarios metadata", () => {
  it("ships exactly 6 scenarios", () => {
    expect(SCENARIOS).toHaveLength(6);
  });

  it("every id is unique", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every scenario declares a default strategy", () => {
    for (const s of SCENARIOS) {
      expect(s.defaultStrategy, `${s.id}`).toMatch(/^(scan|look|nearest|etd|destination)$/);
    }
  });

  it("every scenario has either phases or seedSpawns — never both empty", () => {
    for (const s of SCENARIOS) {
      const phased = s.phases.length > 0;
      const seeded = s.seedSpawns > 0;
      expect(
        phased || seeded,
        `${s.id} has neither phases nor seedSpawns`,
      ).toBe(true);
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

  it("feature hooks are consistent with defaultStrategy when the hook requires one", () => {
    for (const s of SCENARIOS) {
      if (s.hook.kind === "deferred_dcs") {
        expect(s.defaultStrategy, `${s.id}`).toBe("destination");
      }
      if (s.hook.kind === "etd_group_time") {
        expect(s.defaultStrategy, `${s.id}`).toBe("etd");
      }
    }
  });

  it("day-cycle scenarios sum to a plausible length (3–10 real-min range)", () => {
    // Target: ~5 min per sim-day. Phases are in sim-seconds with the
    // sim running at 4× default, so the real-time duration is
    // sum(durationSec) / 4. Accept 1 min (fast demo cadence) through
    // 10 min (deliberately slow "live" run).
    for (const s of SCENARIOS) {
      if (s.phases.length === 0) continue;
      const totalSimSec = s.phases.reduce((acc, p) => acc + p.durationSec, 0);
      const realMin = totalSimSec / 4 / 60;
      expect(realMin, `${s.id}`).toBeGreaterThanOrEqual(1);
      expect(realMin, `${s.id}`).toBeLessThanOrEqual(10);
    }
  });

  it("scenarioById falls back to the first scenario for unknown ids", () => {
    expect(scenarioById("does-not-exist").id).toBe(SCENARIOS[0].id);
  });

  it("labels are non-empty", () => {
    for (const s of SCENARIOS) {
      expect(s.label.length, `${s.id}`).toBeGreaterThan(0);
      expect(s.description.length, `${s.id}`).toBeGreaterThan(0);
    }
  });
});
