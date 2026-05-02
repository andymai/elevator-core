import { describe, expect, it } from "vitest";
import { ControllerError, extractTopFrameLineCol } from "../features/quest/controller-error";

// `extractTopFrameLineCol` is the bridge between an Error's stack
// string and a Monaco marker. Browsers format frames differently
// (Chrome's `at <anonymous>:5:10`, Safari's `<anonymous>:5:10`,
// Firefox's `@<anonymous>:5:10`, plus eval-wrapper variants), so
// pin the extraction against representative samples from each.

describe("quest: extractTopFrameLineCol", () => {
  it("returns null on undefined / empty stacks", () => {
    expect(extractTopFrameLineCol(undefined)).toBeNull();
    expect(extractTopFrameLineCol("")).toBeNull();
    expect(extractTopFrameLineCol("\n\n\n")).toBeNull();
  });

  it("returns null when no frame carries a :line:column suffix", () => {
    expect(extractTopFrameLineCol("Error: something\n  at <anonymous>")).toBeNull();
  });

  it("parses a Chrome-style frame", () => {
    const stack = `TypeError: foo is not a function
    at <anonymous>:5:10
    at <anonymous>:1:1`;
    expect(extractTopFrameLineCol(stack)).toEqual({ line: 5, column: 10 });
  });

  it("parses a Chrome paren-wrapped frame", () => {
    const stack = `TypeError: foo is not a function
    at anonymous (eval at <anonymous>:1:1, <anonymous>:7:23)
    at <anonymous>:1:1`;
    expect(extractTopFrameLineCol(stack)).toEqual({ line: 7, column: 23 });
  });

  it("parses a Firefox-style frame", () => {
    const stack = `anonymous@<anonymous>:4:9
@<anonymous>:1:1`;
    expect(extractTopFrameLineCol(stack)).toEqual({ line: 4, column: 9 });
  });

  it("returns the topmost frame, not the deepest", () => {
    const stack = `TypeError: bad
    at <anonymous>:9:3
    at <anonymous>:5:10
    at <anonymous>:1:1`;
    expect(extractTopFrameLineCol(stack)).toEqual({ line: 9, column: 3 });
  });

  it("ignores frames whose line/column are not finite integers", () => {
    const stack = `Error: bad
    at <anonymous>:NaN:Infinity
    at <anonymous>:5:10`;
    expect(extractTopFrameLineCol(stack)).toEqual({ line: 5, column: 10 });
  });
});

describe("quest: ControllerError", () => {
  it("preserves the message and the location together", () => {
    const err = new ControllerError("sim.fooBar is not a function", { line: 5, column: 10 });
    expect(err.message).toBe("sim.fooBar is not a function");
    expect(err.location).toEqual({ line: 5, column: 10 });
    expect(err.name).toBe("ControllerError");
    expect(err).toBeInstanceOf(Error);
  });

  it("accepts a null location for protocol/timeout errors", () => {
    const err = new ControllerError("controller did not return within 1000ms", null);
    expect(err.location).toBeNull();
  });

  it("instanceof checks survive the catch path", () => {
    // The host catches an unknown `unknown` and uses `instanceof
    // ControllerError` to decide whether to pin a Monaco marker.
    // Pin that branch's behaviour so a future refactor can't subclass
    // the relationship away.
    const err: unknown = new ControllerError("nope", { line: 1, column: 1 });
    expect(err instanceof ControllerError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});
