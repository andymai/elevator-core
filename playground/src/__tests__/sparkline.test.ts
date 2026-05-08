import { describe, expect, it } from "vitest";
import { buildSparkline } from "../features/scoreboard/sparkline";

describe("buildSparkline", () => {
  it("empty array → flat baseline at y=13, last point pinned right", () => {
    const { d, lastX, lastY } = buildSparkline([]);
    expect(d).toBe("M 0 13 L 100 13");
    expect(lastX).toBe(100);
    expect(lastY).toBe(13);
  });

  it("single value → flat baseline at y=13, last point pinned right", () => {
    const { d, lastX, lastY } = buildSparkline([42]);
    expect(d).toBe("M 0 13 L 100 13");
    expect(lastX).toBe(100);
    expect(lastY).toBe(13);
  });

  it("two values produce an M...L path with correct endpoints", () => {
    const { d } = buildSparkline([0, 10]);
    expect(d).toMatch(/^M 0\.00/);
    expect(d).toMatch(/L 100\.00/);
  });

  it("multiple values produce a valid M/L SVG path", () => {
    const { d } = buildSparkline([1, 2, 3, 4, 5]);
    expect(d).toMatch(/^M /);
    expect(d).toMatch(/L /);
    expect(d).not.toBe("M 0 13 L 100 13");
  });

  it("all same values → flat line at y=7 (midpoint)", () => {
    const { d, lastY } = buildSparkline([5, 5, 5, 5]);
    expect(d).toMatch(/M 0\.00 7\.00/);
    expect(d).toMatch(/L 100\.00 7\.00/);
    expect(lastY).toBe(7);
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
    const { d, lastY } = buildSparkline([0, 10]);
    expect(d).toMatch(/M 0\.00 13\.00/);
    expect(d).toMatch(/L 100\.00 1\.00/);
    expect(lastY).toBe(1);
  });

  it("x positions spread from 0 to 100 inclusive", () => {
    const { d, lastX } = buildSparkline([1, 2, 3]);
    expect(d).toMatch(/M 0\.00/);
    expect(d).toMatch(/L 100\.00/);
    expect(d).toMatch(/L 50\.00/);
    expect(lastX).toBe(100);
  });

  it("path is trimmed (no trailing whitespace)", () => {
    const { d } = buildSparkline([1, 2, 3]);
    expect(d).toBe(d.trim());
  });

  it("returns last sample (x, y) tracking the final point", () => {
    // Three samples [10, 0, 5]: indices 0, 1, 2 → x=0, 50, 100.
    // min=0, max=10. y = 13 - ((v - 0) / 10) * 12.
    // v=10 → y=1, v=0 → y=13, v=5 → y=7.
    const { lastX, lastY } = buildSparkline([10, 0, 5]);
    expect(lastX).toBe(100);
    expect(lastY).toBe(7);
  });
});
