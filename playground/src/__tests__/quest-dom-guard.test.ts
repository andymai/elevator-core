import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

// Static guard: every `document.getElementById("quest-…")` call in the
// quest feature module must have a matching `id="…"` in index.html.
// Without this, a missing anchor causes Quest mode to throw on boot —
// invisible in unit tests because vitest doesn't run the page DOM.
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const featureFiles = [
  "src/features/quest/quest-pane.ts",
  "src/features/quest/api-panel.ts",
  "src/features/quest/hints-drawer.ts",
  "src/features/quest/results-modal.ts",
  "src/features/quest/snippet-picker.ts",
];
const html = readFileSync(join(root, "index.html"), "utf8");

const idRefRe = /document\.getElementById\("(quest-[^"]+)"\)/g;
const referencedIds = new Set<string>();
for (const file of featureFiles) {
  const src = readFileSync(join(root, file), "utf8");
  for (const m of src.matchAll(idRefRe)) {
    referencedIds.add(m[1]);
  }
}

describe("quest: DOM anchors", () => {
  it("scans more than one referenced id (sanity)", () => {
    expect(referencedIds.size).toBeGreaterThan(5);
  });

  for (const id of [...referencedIds].sort()) {
    it(`index.html has #${id}`, () => {
      expect(html).toContain(`id="${id}"`);
    });
  }
});
