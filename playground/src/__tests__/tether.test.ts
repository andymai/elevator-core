import { describe, expect, it } from "vitest";
import {
  atmosphericLayer,
  classifyKinematicPhase,
  formatAltitudeShort,
  formatDuration,
  formatVelocity,
  tetherDecadeTicks,
  tetherEta,
  tetherFractionForAltitude,
} from "../render/tether";

describe("tether: altitude axis", () => {
  it("ground maps to 0, counterweight to 1", () => {
    expect(tetherFractionForAltitude(0, 100_000_000)).toBeCloseTo(0, 5);
    expect(tetherFractionForAltitude(100_000_000, 100_000_000)).toBeCloseTo(1, 5);
  });

  it("log-scale spreads decades across the visible range", () => {
    // Decades occupy roughly equal screen fractions on a log axis.
    const a = tetherFractionForAltitude(1_000, 100_000_000); // 1 km
    const b = tetherFractionForAltitude(10_000, 100_000_000); // 10 km
    const c = tetherFractionForAltitude(100_000, 100_000_000); // 100 km (Karman)
    expect(b - a).toBeGreaterThan(0.05);
    expect(c - b).toBeGreaterThan(0.05);
  });

  it("clamps negative altitudes to 0", () => {
    expect(tetherFractionForAltitude(-50, 100_000_000)).toBe(0);
  });

  it("decade ticks span 1 km up to the axis cap", () => {
    const ticks = tetherDecadeTicks(100_000_000);
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    expect(ticks[0]?.altitudeM).toBe(1000);
    expect(ticks.at(-1)?.altitudeM).toBeLessThanOrEqual(100_000_000);
  });
});

describe("tether: atmospheric layer mapping", () => {
  it("matches standard atmosphere boundaries", () => {
    expect(atmosphericLayer(5_000)).toBe("troposphere");
    expect(atmosphericLayer(30_000)).toBe("stratosphere");
    expect(atmosphericLayer(70_000)).toBe("mesosphere");
    expect(atmosphericLayer(400_000)).toBe("thermosphere"); // ISS altitude
    expect(atmosphericLayer(5_000_000)).toBe("exosphere");
    expect(atmosphericLayer(20_000_000)).toBe("cislunar space");
    expect(atmosphericLayer(35_786_000)).toBe("geostationary belt");
  });
});

describe("tether: kinematic phase classifier", () => {
  it("idle when nearly stopped", () => {
    expect(classifyKinematicPhase(0.1, 0, 1000)).toBe("idle");
  });

  it("cruise when at near-max speed and steady", () => {
    expect(classifyKinematicPhase(990, 990, 1000)).toBe("cruise");
  });

  it("accel when speeding up", () => {
    expect(classifyKinematicPhase(500, 200, 1000)).toBe("accel");
  });

  it("decel when slowing down", () => {
    expect(classifyKinematicPhase(200, 500, 1000)).toBe("decel");
  });
});

describe("tether: ETA approximation", () => {
  it("zero remaining distance returns 0", () => {
    expect(tetherEta(1000, 1000, 0, 1000, 10, 10)).toBeCloseTo(0, 5);
  });

  it("when already cruising and within decel distance, returns the brake time", () => {
    // Decel distance from 1000 m/s at 10 m/s²: 50,000 m. If only 25,000 m left
    // and currently at full speed, the ETA falls back to remaining/v ≈ 25 s.
    const eta = tetherEta(0, 25_000, 1000, 1000, 10, 10);
    expect(eta).toBeGreaterThan(0);
    expect(eta).toBeLessThan(50);
  });

  it("long trip uses the trapezoidal coast estimate", () => {
    // Ground (0) to Karman (100 km), starting at rest.
    const eta = tetherEta(0, 100_000, 0, 1000, 10, 10);
    // Accel phase: 100 s reaching 1000 m/s, traveling 50 km.
    // Decel phase: 100 s, 50 km.
    // Total ≈ 200 s for an exact 100 km trip.
    expect(eta).toBeGreaterThan(180);
    expect(eta).toBeLessThan(220);
  });
});

describe("tether: formatting", () => {
  it("altitude formats by magnitude", () => {
    expect(formatAltitudeShort(0)).toMatch(/^0 m$/);
    expect(formatAltitudeShort(500)).toMatch(/^500 m$/);
    expect(formatAltitudeShort(2_500)).toMatch(/^2\.5 km$/);
    expect(formatAltitudeShort(100_000)).toMatch(/^100 km$/);
    expect(formatAltitudeShort(35_786_000)).toMatch(/^35,786 km$/);
  });

  it("velocity switches to km/h above 100 m/s", () => {
    expect(formatVelocity(0.5)).toMatch(/m\/s/);
    expect(formatVelocity(50)).toMatch(/m\/s/);
    expect(formatVelocity(500)).toMatch(/km\/h/);
  });

  it("duration formats by magnitude", () => {
    expect(formatDuration(0)).toBe("—");
    expect(formatDuration(45)).toMatch(/^45 s$/);
    expect(formatDuration(120)).toMatch(/^2m$/);
    expect(formatDuration(125)).toMatch(/^2m 5s$/);
    expect(formatDuration(7200)).toMatch(/^2h$/);
  });
});
