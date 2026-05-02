import { describe, expect, it } from "vitest";
import { loadMonaco, mountQuestEditor } from "../features/quest";

// These tests verify the public surface of the lazy Monaco loader.
// Actually mounting Monaco requires a real DOM with a layout engine
// and Web Workers; vitest's node env has neither, so the mount path
// is exercised in browser only.

describe("quest: editor", () => {
  it("exposes loadMonaco and mountQuestEditor", () => {
    expect(typeof loadMonaco).toBe("function");
    expect(typeof mountQuestEditor).toBe("function");
  });

  it("loadMonaco returns a Promise (lazy import)", () => {
    // Calling loadMonaco synchronously returns a promise — even
    // before Monaco resolves, the dynamic-import shape is testable.
    const p = loadMonaco();
    expect(p).toBeInstanceOf(Promise);
    // Discard the promise without awaiting; loading the actual module
    // would require a browser-like environment with workers.
    p.catch(() => {
      /* expected to fail in node; we only care about the call shape */
    });
  });
});
