import { describe, expect, it } from "vitest";
import { API_REFERENCE, STAGES, apiEntry, unlockedEntries, type ApiEntry } from "../features/quest";

describe("quest: api reference", () => {
  it("entries are unique by name", () => {
    const names = API_REFERENCE.map((e: ApiEntry) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("apiEntry round-trips by name", () => {
    for (const entry of API_REFERENCE) {
      expect(apiEntry(entry.name)?.signature).toBe(entry.signature);
    }
    expect(apiEntry("does-not-exist")).toBeUndefined();
  });

  it("every stage's unlockedApi has a reference entry", () => {
    // The api panel skips unknown names, so a stage that unlocks
    // a method without a reference entry would silently render an
    // incomplete panel. Pin the curriculum to the reference here.
    const known = new Set(API_REFERENCE.map((e: ApiEntry) => e.name));
    for (const stage of STAGES) {
      for (const method of stage.unlockedApi) {
        expect(
          known,
          `stage "${stage.id}" unlocks "${method}" — add it to API_REFERENCE`,
        ).toContain(method);
      }
    }
  });

  it("unlockedEntries preserves API_REFERENCE ordering", () => {
    const filtered = unlockedEntries(["pushDestination", "drainEvents", "hallCalls"]);
    const referenceOrder = API_REFERENCE.map((e: ApiEntry) => e.name);
    const filteredOrder = filtered.map((e: ApiEntry) => e.name);
    const reconstructed = referenceOrder.filter((n: string) => filteredOrder.includes(n));
    expect(filteredOrder).toEqual(reconstructed);
  });

  it("unlockedEntries silently drops unknown names", () => {
    const filtered = unlockedEntries(["pushDestination", "absolutely-not-a-method"]);
    expect(filtered.map((e: ApiEntry) => e.name)).toEqual(["pushDestination"]);
  });
});
