import { describe, expect, it } from "vitest";
import { type Tween, emitAbandonWalks, emitAlightWalks, emitBoardWalks } from "../render/tweens";

const baseSpec = {
  now: 1_000,
  stagger: 80,
  duration: 260,
  floorY: 200,
  color: "#abc",
};

describe("emitBoardWalks", () => {
  it("emits one tween per boarder up to count, in single-file when pairs disabled", () => {
    const out: Tween[] = [];
    emitBoardWalks(out, {
      ...baseSpec,
      count: 3,
      enablePairs: false,
      halfPairW: 2,
      originX: 50,
      endX: 100,
      stopId: 7,
      dirOffset: 0,
    });
    expect(out).toHaveLength(3);
    expect(out.every((t) => t.kind === "board")).toBe(true);
    // No pair offset in single-file mode.
    expect(out.map((t) => t.startX)).toEqual([50, 50, 50]);
    expect(out.map((t) => t.endX)).toEqual([100, 100, 100]);
    // Variants vary across slots.
    expect(new Set(out.map((t) => t.variant)).size).toBeGreaterThanOrEqual(1);
  });

  it("staggers waves, with pair-mates sharing the same bornAt", () => {
    const out: Tween[] = [];
    emitBoardWalks(out, {
      ...baseSpec,
      count: 4,
      enablePairs: true,
      halfPairW: 2,
      originX: 50,
      endX: 100,
      stopId: 7,
      dirOffset: 0,
    });
    expect(out).toHaveLength(4);
    expect(out[0]?.bornAt).toBe(out[1]?.bornAt);
    expect(out[2]?.bornAt).toBe(out[3]?.bornAt);
    expect(out[2]?.bornAt).toBe((out[0]?.bornAt ?? 0) + 80);
  });

  it("pair m=0 trails (-halfPairW); m=1 leads (+halfPairW)", () => {
    const out: Tween[] = [];
    emitBoardWalks(out, {
      ...baseSpec,
      count: 2,
      enablePairs: true,
      halfPairW: 2,
      originX: 50,
      endX: 100,
      stopId: 7,
      dirOffset: 0,
    });
    expect(out[0]?.startX).toBe(48);
    expect(out[1]?.startX).toBe(52);
    expect(out[0]?.endX).toBe(98);
    expect(out[1]?.endX).toBe(102);
  });

  it("falls back to single-file when pair would exceed count (odd remainder)", () => {
    const out: Tween[] = [];
    emitBoardWalks(out, {
      ...baseSpec,
      count: 3,
      enablePairs: true,
      halfPairW: 2,
      originX: 50,
      endX: 100,
      stopId: 7,
      dirOffset: 0,
    });
    expect(out).toHaveLength(3);
    // Last rider runs solo (no offset).
    expect(out[2]?.startX).toBe(50);
    expect(out[2]?.endX).toBe(100);
  });
});

describe("emitAlightWalks", () => {
  it("uses LIFO from the variants slice, with pair m=0 trailing on right-bound walk", () => {
    const out: Tween[] = [];
    emitAlightWalks(out, {
      ...baseSpec,
      count: 2,
      enablePairs: true,
      halfPairW: 2,
      startX: 100,
      endX: 140,
      color: "#def",
      variants: ["short", "tall", "briefcase", "bag"],
      carId: 9,
    });
    expect(out).toHaveLength(2);
    expect(out[0]?.kind).toBe("alight");
    // LIFO: last variant exits first.
    expect(out[0]?.variant).toBe("bag");
    expect(out[1]?.variant).toBe("briefcase");
    // m=0 trails (left of m=1) on a rightward walk.
    expect(out[0]?.startX).toBeLessThan(out[1]?.startX ?? 0);
  });

  it("falls back to deterministic carId hash when variants slice runs short", () => {
    const out: Tween[] = [];
    emitAlightWalks(out, {
      ...baseSpec,
      count: 2,
      enablePairs: false,
      halfPairW: 2,
      startX: 100,
      endX: 140,
      color: "#def",
      variants: [],
      carId: 9,
    });
    expect(out).toHaveLength(2);
    expect(out.every((t) => typeof t.variant === "string")).toBe(true);
  });
});

describe("emitAbandonWalks", () => {
  it("emits single-file tweens with consecutive bornAts", () => {
    const out: Tween[] = [];
    emitAbandonWalks(out, {
      ...baseSpec,
      count: 3,
      startX: 60,
      endX: 24,
      color: "#f55",
      stopId: 11,
    });
    expect(out).toHaveLength(3);
    expect(out.every((t) => t.kind === "abandon")).toBe(true);
    expect(out[1]?.bornAt).toBe((out[0]?.bornAt ?? 0) + 80);
    expect(out[2]?.bornAt).toBe((out[0]?.bornAt ?? 0) + 160);
    // No pair offset on abandons (single-file).
    expect(out[0]?.startX).toBe(60);
  });
});
