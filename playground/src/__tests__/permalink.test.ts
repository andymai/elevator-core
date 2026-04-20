import { describe, expect, it } from "vitest";
import { decodePermalink, encodePermalink, DEFAULT_STATE } from "../permalink";

describe("permalink: core knobs", () => {
  it("default state encodes to the expected canonical form", () => {
    const qs = encodePermalink(DEFAULT_STATE);
    expect(qs).toMatch(/s=skyscraper-sky-lobby/);
    expect(qs).toMatch(/a=etd/);
    // Compare defaults to off — the `c` key is only emitted when true.
    expect(qs).not.toMatch(/(^|&|\?)c=/);
    expect(qs).toMatch(/k=42/);
  });

  it("decode of empty string returns the default state shape", () => {
    const decoded = decodePermalink("");
    expect(decoded.scenario).toBe(DEFAULT_STATE.scenario);
    expect(decoded.strategyA).toBe(DEFAULT_STATE.strategyA);
    expect(decoded.overrides).toEqual({});
  });

  it("round-trips through encode/decode without drift", () => {
    const state = {
      ...DEFAULT_STATE,
      scenario: "convention-burst",
      strategyA: "look" as const,
      seed: 7,
      intensity: 1.4,
      speed: 8,
    };
    const decoded = decodePermalink(encodePermalink(state));
    expect(decoded.scenario).toBe(state.scenario);
    expect(decoded.strategyA).toBe(state.strategyA);
    expect(decoded.seed).toBe(state.seed);
    expect(decoded.intensity).toBe(state.intensity);
    expect(decoded.speed).toBe(state.speed);
  });
});

describe("permalink: overrides encoding", () => {
  it("does not emit override keys when overrides are empty", () => {
    const qs = encodePermalink(DEFAULT_STATE);
    expect(qs).not.toMatch(/(^|&)ec=/);
    expect(qs).not.toMatch(/(^|&)ms=/);
    expect(qs).not.toMatch(/(^|&)wc=/);
    expect(qs).not.toMatch(/(^|&)dc=/);
  });

  it("encodes only the keys present in overrides", () => {
    const qs = encodePermalink({
      ...DEFAULT_STATE,
      overrides: { cars: 4, maxSpeed: 6 },
    });
    expect(qs).toMatch(/ec=4/);
    expect(qs).toMatch(/ms=6/);
    expect(qs).not.toMatch(/wc=/);
    expect(qs).not.toMatch(/dc=/);
  });

  it("round-trips override values", () => {
    const original = {
      ...DEFAULT_STATE,
      overrides: { cars: 5, maxSpeed: 4.5, weightCapacity: 1500, doorCycleSec: 7.5 },
    };
    const decoded = decodePermalink(encodePermalink(original));
    expect(decoded.overrides).toEqual(original.overrides);
  });

  it("ignores non-numeric override values silently (defensive parse)", () => {
    const decoded = decodePermalink("?ms=garbage&ec=3");
    expect(decoded.overrides.cars).toBe(3);
    expect(decoded.overrides.maxSpeed).toBeUndefined();
  });

  it("formats integer overrides without a trailing decimal", () => {
    const qs = encodePermalink({
      ...DEFAULT_STATE,
      overrides: { weightCapacity: 1500 },
    });
    expect(qs).toMatch(/wc=1500(&|$)/);
    expect(qs).not.toMatch(/wc=1500\.0/);
  });
});
