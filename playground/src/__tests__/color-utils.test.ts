import { describe, expect, it } from "vitest";
import { arcPoint, easeOutNorm, hexWithAlpha, shade, withAlpha } from "../render/color-utils";

describe("shade", () => {
  it("positive amount lightens a color", () => {
    // #ff0000 (r=255, g=0, b=0) + 0.5: g and b move toward 255
    // f(255) = 255 + (255-255)*0.5 = 255; f(0) = 0 + 255*0.5 = 128 (rounded)
    expect(shade("#ff0000", 0.5)).toBe("rgb(255, 128, 128)");
  });

  it("negative amount darkens a color", () => {
    // #ff0000 + -0.5: r = round(255*(1-0.5)) = 128
    expect(shade("#ff0000", -0.5)).toBe("rgb(128, 0, 0)");
  });

  it("amount=0 is a no-op", () => {
    expect(shade("#336699", 0)).toBe("rgb(51, 102, 153)");
  });

  it("amount=1 → white", () => {
    expect(shade("#000000", 1)).toBe("rgb(255, 255, 255)");
  });

  it("amount=-1 → black", () => {
    expect(shade("#ffffff", -1)).toBe("rgb(0, 0, 0)");
  });

  it("returns the original string for non-hex input", () => {
    expect(shade("rgba(0,0,0,1)", 0.5)).toBe("rgba(0,0,0,1)");
  });

  it("accepts hex without leading #", () => {
    // The regex allows the # to be optional
    expect(shade("ff0000", 0.5)).toBe("rgb(255, 128, 128)");
  });
});

describe("hexWithAlpha", () => {
  it("produces rgba string from a 6-digit hex", () => {
    expect(hexWithAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("alpha=1 produces fully opaque rgba", () => {
    expect(hexWithAlpha("#336699", 1)).toBe("rgba(51, 102, 153, 1)");
  });

  it("alpha=0 produces fully transparent rgba", () => {
    expect(hexWithAlpha("#ffffff", 0)).toBe("rgba(255, 255, 255, 0)");
  });

  it("passes through non-hex colors unchanged", () => {
    const rgb = "rgb(10, 20, 30)";
    expect(hexWithAlpha(rgb, 0.5)).toBe(rgb);
  });
});

describe("withAlpha", () => {
  it("appends a 2-digit hex alpha byte to a 6-digit hex color", () => {
    // alpha 0.5 → round(0.5*255) = 128 → 0x80
    expect(withAlpha("#ff0000", 0.5)).toBe("#ff000080");
  });

  it("alpha=1 → ff suffix", () => {
    expect(withAlpha("#336699", 1)).toBe("#336699ff");
  });

  it("alpha=0 → 00 suffix", () => {
    expect(withAlpha("#336699", 0)).toBe("#33669900");
  });

  it("clamps alpha above 1 to ff", () => {
    expect(withAlpha("#ff0000", 2)).toBe("#ff0000ff");
  });

  it("clamps alpha below 0 to 00", () => {
    expect(withAlpha("#ff0000", -1)).toBe("#ff000000");
  });

  it("passes through unrecognised color forms unchanged", () => {
    // 3-char shorthand doesn't match the /^#[0-9a-f]{6}$/i guard;
    // hexWithAlpha also can't parse it, so the value is returned as-is.
    expect(withAlpha("#f00", 0.5)).toBe("#f00");
  });
});

describe("arcPoint", () => {
  it("at t=0 returns the start point", () => {
    const [x, y] = arcPoint(10, 20, 100, 80, 0);
    expect(x).toBeCloseTo(10, 5);
    expect(y).toBeCloseTo(20, 5);
  });

  it("at t=1 returns the end point", () => {
    const [x, y] = arcPoint(10, 20, 100, 80, 1);
    expect(x).toBeCloseTo(100, 5);
    expect(y).toBeCloseTo(80, 5);
  });

  it("at t=0.5 returns a point off the straight midpoint (has perpendicular arc)", () => {
    // Straight midpoint of (0,0)→(100,0) is (50,0).
    // The perpendicular offset on a horizontal segment is vertical,
    // so the arc midpoint should have y != 0.
    const [x, y] = arcPoint(0, 0, 100, 0, 0.5);
    expect(x).toBeCloseTo(50, 0);
    expect(y).not.toBeCloseTo(0, 1);
  });

  it("start === end still returns a valid point (zero-length segment guard)", () => {
    const [x, y] = arcPoint(50, 50, 50, 50, 0.5);
    // Should not throw or return NaN
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  });
});

describe("easeOutNorm", () => {
  it("easeOutNorm(0) → 0", () => {
    expect(easeOutNorm(0)).toBeCloseTo(0, 5);
  });

  it("easeOutNorm(1) → 1", () => {
    expect(easeOutNorm(1)).toBeCloseTo(1, 5);
  });

  it("output is between 0 and 1 for inputs in [0,1]", () => {
    for (const x of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const y = easeOutNorm(x);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonically increasing", () => {
    const xs = [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0];
    const ys = xs.map(easeOutNorm);
    for (let i = 1; i < ys.length; i++) {
      const prev = ys[i - 1];
      if (prev === undefined) continue;
      expect(ys[i]).toBeGreaterThanOrEqual(prev);
    }
  });

  it("output at 0.5 is greater than 0.5 (ease-out bias toward early completion)", () => {
    // Ease-out curves are concave — most progress happens early.
    expect(easeOutNorm(0.5)).toBeGreaterThan(0.5);
  });
});
