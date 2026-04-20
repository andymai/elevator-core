import { describe, expect, it } from "vitest";
import { decodePermalink, encodePermalink, DEFAULT_STATE, hashSeedWord } from "../domain/permalink";

describe("permalink: core knobs", () => {
  it("default state encodes to the expected canonical form", () => {
    const qs = encodePermalink(DEFAULT_STATE);
    expect(qs).toMatch(/s=skyscraper-sky-lobby/);
    expect(qs).toMatch(/a=scan/);
    expect(qs).toMatch(/b=rsr/);
    // Compare defaults to on — playground leads with the side-by-side view.
    expect(qs).toMatch(/(^|&|\?)c=1(&|$)/);
    expect(qs).toMatch(/k=otis/);
  });

  it("decode of empty string returns the default state shape", () => {
    const decoded = decodePermalink("");
    expect(decoded.scenario).toBe(DEFAULT_STATE.scenario);
    expect(decoded.strategyA).toBe(DEFAULT_STATE.strategyA);
    expect(decoded.compare).toBe(DEFAULT_STATE.compare);
    expect(decoded.overrides).toEqual({});
  });

  it("honors an explicit c=0 over the default", () => {
    // Guards against regressions where a recipient's bare URL inherits
    // the default even when the sender explicitly opted out.
    const decoded = decodePermalink("?c=0");
    expect(decoded.compare).toBe(false);
  });

  it("round-trips through encode/decode without drift", () => {
    const state = {
      ...DEFAULT_STATE,
      scenario: "convention-burst",
      strategyA: "look" as const,
      seed: "keynote",
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

  it("decodes seed as a string word and falls back when absent", () => {
    expect(decodePermalink("?k=lobby").seed).toBe("lobby");
    expect(decodePermalink("").seed).toBe(DEFAULT_STATE.seed);
    // Old numeric permalinks still work — a digit string is a valid seed word.
    expect(decodePermalink("?k=42").seed).toBe("42");
  });

  it("omits reposition keys when both match the scenario default", () => {
    // DEFAULT_STATE is the canonical shape; encoding it produces the
    // shortest possible URL. Both `pa` and `pb` match their own
    // defaults (self-equal), so neither key is emitted.
    const qs = encodePermalink(DEFAULT_STATE);
    expect(qs).not.toMatch(/(^|&)pa=/);
    expect(qs).not.toMatch(/(^|&)pb=/);
  });

  it("encodes and round-trips non-default reposition picks", () => {
    // Use values that differ from DEFAULT_STATE.reposition{A,B}
    // (currently `lobby`/`adaptive`) so the encoder actually emits
    // both keys rather than omitting them as matching-default.
    const state = {
      ...DEFAULT_STATE,
      repositionA: "predictive" as const,
      repositionB: "spread" as const,
    };
    const qs = encodePermalink(state);
    expect(qs).toMatch(/pa=predictive/);
    expect(qs).toMatch(/pb=spread/);
    const decoded = decodePermalink(qs);
    expect(decoded.repositionA).toBe("predictive");
    expect(decoded.repositionB).toBe("spread");
  });

  it("falls back to the default for unrecognised reposition names", () => {
    const decoded = decodePermalink("?pa=garbage&pb=also-garbage");
    expect(decoded.repositionA).toBe(DEFAULT_STATE.repositionA);
    expect(decoded.repositionB).toBe(DEFAULT_STATE.repositionB);
  });
});

describe("permalink: seed hashing", () => {
  it("is deterministic across calls", () => {
    expect(hashSeedWord("otis")).toBe(hashSeedWord("otis"));
    expect(hashSeedWord("lobby")).toBe(hashSeedWord("lobby"));
  });
  it("produces different hashes for different words (avalanche)", () => {
    // Adjacent letters should still produce wildly different numeric seeds.
    expect(hashSeedWord("a")).not.toBe(hashSeedWord("b"));
    expect(hashSeedWord("otis")).not.toBe(hashSeedWord("otiz"));
  });
  it("returns FNV-1a offset basis for empty input", () => {
    expect(hashSeedWord("")).toBe(0x811c9dc5 >>> 0);
  });
  it("trims whitespace so `otis` and ` otis ` seed identically", () => {
    expect(hashSeedWord(" otis ")).toBe(hashSeedWord("otis"));
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
