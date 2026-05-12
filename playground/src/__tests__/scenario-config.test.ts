import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../domain";
import { tokenizeRonLine, RON_TOKEN_CLASSES, type RonToken } from "../features/scenario-config";

describe("scenario-config: filename", () => {
  it("every scenario carries a configFilename", () => {
    for (const s of SCENARIOS) {
      expect(s.configFilename, `${s.id}.configFilename`).toMatch(/\.ron$/);
      expect(s.configFilename.length).toBeGreaterThan(4);
    }
  });

  it("configFilenames are unique across scenarios", () => {
    const names = SCENARIOS.map((s) => s.configFilename);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("scenario-config: scenarios still parse as RON", () => {
  // Smoke: every scenario's RON should look structurally sound after
  // the user-friendly comment rewrite. Catches edits that leave the
  // template literal unterminated or drop required keys.
  it("each scenario starts with SimConfig and balances parens", () => {
    for (const s of SCENARIOS) {
      expect(s.ron, `${s.id}.ron`).toMatch(/SimConfig\(/);
      const opens = (s.ron.match(/\(/g) ?? []).length;
      const closes = (s.ron.match(/\)/g) ?? []).length;
      expect(opens, `${s.id} parens`).toBe(closes);
      const obrack = (s.ron.match(/\[/g) ?? []).length;
      const cbrack = (s.ron.match(/]/g) ?? []).length;
      expect(obrack, `${s.id} brackets`).toBe(cbrack);
    }
  });
});

describe("scenario-config: highlighter", () => {
  const ofClass = (tokens: RonToken[], cls: string): string[] =>
    tokens.filter((t) => t.cls === cls).map((t) => t.text);

  it("tokenizes comments, strings, numbers, types, and keys", () => {
    const tokens = tokenizeRonLine('SimConfig(name: "Building", speed: 3.5) // tail comment');
    expect(ofClass(tokens, RON_TOKEN_CLASSES.comment)).toEqual(["// tail comment"]);
    expect(ofClass(tokens, RON_TOKEN_CLASSES.string)).toEqual(['"Building"']);
    expect(ofClass(tokens, RON_TOKEN_CLASSES.number)).toEqual(["3.5"]);
    expect(ofClass(tokens, RON_TOKEN_CLASSES.type)).toEqual(["SimConfig"]);
    expect(ofClass(tokens, RON_TOKEN_CLASSES.key)).toEqual(["name", "speed"]);
  });

  it("treats a leading // line as a comment in full", () => {
    const tokens = tokenizeRonLine("// hello world");
    expect(tokens).toEqual([{ cls: RON_TOKEN_CLASSES.comment, text: "// hello world" }]);
  });

  it("handles negative and decimal numbers", () => {
    const tokens = tokenizeRonLine("x: -4.0, y: -12, z: 0");
    expect(ofClass(tokens, RON_TOKEN_CLASSES.number)).toEqual(["-4.0", "-12", "0"]);
  });

  it("identifier without trailing colon is not a key", () => {
    // Disambiguates `StopId(0)` (type) from `stops: [...]` (key) so
    // PascalCase constructors aren't miscolored as values.
    const tokens = tokenizeRonLine('StopId(0), name: "Lobby"');
    expect(ofClass(tokens, RON_TOKEN_CLASSES.type)).toContain("StopId");
    expect(ofClass(tokens, RON_TOKEN_CLASSES.key)).toEqual(["name"]);
  });

  it("preserves total text length across tokenization", () => {
    const line = '    StopConfig(id: StopId(0), name: "Lobby", position: 0.0),';
    const tokens = tokenizeRonLine(line);
    const joined = tokens.map((t) => t.text).join("");
    expect(joined).toBe(line);
  });
});
