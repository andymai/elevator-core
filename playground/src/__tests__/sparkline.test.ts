import { describe, expect, it } from "vitest";
import { buildSparklinePath } from "../features/scoreboard/sparkline";

describe("buildSparklinePath", () => {
  it("empty array → flat baseline at y=13", () => {
    expect(buildSparklinePath([])).toBe("M 0 13 L 100 13");
  });

  it("single value → flat baseline at y=13", () => {
    expect(buildSparklinePath([42])).toBe("M 0 13 L 100 13");
  });

  it("two values produce an M...L path with correct endpoints", () => {
    const d = buildSparklinePath([0, 10]);
    // First point at x=0, last at x=100
    expect(d).toMatch(/^M 0\.00/);
    expect(d).toMatch(/L 100\.00/);
  });

  it("multiple values produce a valid M/L SVG path", () => {
    const d = buildSparklinePath([1, 2, 3, 4, 5]);
    // Must start with M and contain L segments
    expect(d).toMatch(/^M /);
    expect(d).toMatch(/L /);
    // Should not be the flat baseline
    expect(d).not.toBe("M 0 13 L 100 13");
  });

  it("all same values → flat line at y=7 (midpoint)", () => {
    const d = buildSparklinePath([5, 5, 5, 5]);
    // span === 0 branch → y = 7 for all points
    expect(d).toMatch(/M 0\.00 7\.00/);
    expect(d).toMatch(/L 100\.00 7\.00/);
    // Every coordinate pair has the form "N.NN 7.00" — split on L/M and verify
    const coords = d
      .split(/[ML]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const coord of coords) {
      expect(coord).toMatch(/ 7\.00$/);
    }
  });

  it("higher values map to lower y (inverted axis — higher is up)", () => {
    // With [0, 10]: min=0, max=10.
    // First point (0): y = 13 - (0/10)*12 = 13 (bottom)
    // Last point (10): y = 13 - (10/10)*12 = 1 (top)
    const d = buildSparklinePath([0, 10]);
    expect(d).toMatch(/M 0\.00 13\.00/);
    expect(d).toMatch(/L 100\.00 1\.00/);
  });

  it("x positions spread from 0 to 100 inclusive", () => {
    const d = buildSparklinePath([1, 2, 3]);
    expect(d).toMatch(/M 0\.00/);
    expect(d).toMatch(/L 100\.00/);
    // Middle point at x=50
    expect(d).toMatch(/L 50\.00/);
  });

  it("result is trimmed (no trailing whitespace)", () => {
    const d = buildSparklinePath([1, 2, 3]);
    expect(d).toBe(d.trim());
  });
});
