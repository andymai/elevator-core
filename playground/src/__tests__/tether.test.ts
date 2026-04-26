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
    // Exosphere covers the broad mid-band — the IAU's exosphere
    // extends to ~100,000 km, so everything from 700 km up to (and
    // past) the counterweight altitude lives here.
    expect(atmosphericLayer(5_000_000)).toBe("exosphere");
    expect(atmosphericLayer(20_000_000)).toBe("exosphere");
    expect(atmosphericLayer(80_000_000)).toBe("exosphere");
    // Narrow GEO band — the climber flips to "geostationary" only
    // while it's actually near the GEO platform altitude.
    expect(atmosphericLayer(35_786_000)).toBe("geostationary");
    expect(atmosphericLayer(35_500_000)).toBe("geostationary");
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

  it("when already past the brake point, returns the brake-to-rest time", () => {
    // Brake distance from 1000 m/s at 10 m/s²: 50,000 m. If only
    // 25,000 m left and currently at full speed, the climber will
    // overshoot — ETA falls back to v / decel = 100 s as a useful
    // upper bound on time-to-reach-target.
    const eta = tetherEta(0, 25_000, 1000, 1000, 10, 10);
    expect(eta).toBeCloseTo(100, 0);
  });

  it("triangle-profile trip never reaches max speed", () => {
    // Ground (0) to 50 km, starting at rest, max 1000 m/s, a = d = 10.
    // Trapezoidal would need 100 km (50 km accel + 50 km decel) — the
    // 50 km trip is sub-trapezoid. Symmetric a/d means peak velocity
    // vp = sqrt(remaining * a) = sqrt(500_000) ≈ 707 m/s, total
    // time = 2 * vp / a ≈ 141.4 s.
    const eta = tetherEta(0, 50_000, 0, 1000, 10, 10);
    expect(eta).toBeGreaterThan(135);
    expect(eta).toBeLessThan(150);
  });

  it("long trip uses the trapezoidal coast estimate", () => {
    // Ground (0) to Karman (100 km), starting at rest.
    // Accel: 100 s / 50 km. Decel: 100 s / 50 km. No cruise → 200 s
    // (this trip is right at the trapezoid/triangle boundary; the
    // function picks the triangle branch and returns the same answer).
    const eta = tetherEta(0, 100_000, 0, 1000, 10, 10);
    expect(eta).toBeGreaterThan(180);
    expect(eta).toBeLessThan(220);
  });

  it("very long trip uses the cruise term", () => {
    // Ground (0) to GEO (35,786 km), starting at rest.
    // Accel: 100 s / 50 km, decel: 100 s / 50 km, cruise: 35,686 km
    // at 1000 m/s ≈ 35,686 s. Total ~35,886 s.
    const eta = tetherEta(0, 35_786_000, 0, 1000, 10, 10);
    expect(eta).toBeGreaterThan(35_500);
    expect(eta).toBeLessThan(36_500);
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
