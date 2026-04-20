import { describe, expect, it } from "vitest";
import { verdictToWinner } from "../features/scoreboard/verdict-ribbon";

describe("verdictToWinner", () => {
  it("win → winner A with text 'A'", () => {
    const result = verdictToWinner("win");
    expect(result.winner).toBe("A");
    expect(result.text).toBe("A");
  });

  it("lose → winner B with text 'B'", () => {
    const result = verdictToWinner("lose");
    expect(result.winner).toBe("B");
    expect(result.text).toBe("B");
  });

  it("tie → winner 'tie' with text 'Tie'", () => {
    const result = verdictToWinner("tie");
    expect(result.winner).toBe("tie");
    expect(result.text).toBe("Tie");
  });

  it("returns distinct shapes for all three verdicts", () => {
    const win = verdictToWinner("win");
    const lose = verdictToWinner("lose");
    const tie = verdictToWinner("tie");
    expect(win.winner).not.toBe(lose.winner);
    expect(win.winner).not.toBe(tie.winner);
    expect(lose.winner).not.toBe(tie.winner);
  });
});
