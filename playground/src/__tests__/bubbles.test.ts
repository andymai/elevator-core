import { describe, expect, it } from "vitest";
import { resolveStopName } from "../features/compare-pane/bubbles";
import type { Snapshot } from "../types";

function makeSnapshot(stops: { entity_id: number; name: string }[]): Snapshot {
  return {
    tick: 0,
    dt: 1 / 60,
    cars: [],
    stops: stops.map((s) => ({
      entity_id: s.entity_id,
      stop_id: s.entity_id,
      name: s.name,
      y: s.entity_id * 10,
      waiting: 0,
      waiting_up: 0,
      waiting_down: 0,
      waiting_by_line: [],
      residents: 0,
    })),
  };
}

describe("resolveStopName", () => {
  it("returns the stop name when the entity_id is present in the snapshot", () => {
    const snap = makeSnapshot([
      { entity_id: 0, name: "Lobby" },
      { entity_id: 5, name: "Penthouse" },
    ]);
    expect(resolveStopName(snap, 0)).toBe("Lobby");
    expect(resolveStopName(snap, 5)).toBe("Penthouse");
  });

  it("falls back to 'stop #N' when the entity_id is not in the snapshot", () => {
    const snap = makeSnapshot([{ entity_id: 1, name: "Floor 1" }]);
    expect(resolveStopName(snap, 99)).toBe("stop #99");
  });

  it("falls back gracefully on an empty stops array", () => {
    const snap = makeSnapshot([]);
    expect(resolveStopName(snap, 0)).toBe("stop #0");
  });

  it("matches by entity_id, not by position in the array", () => {
    const snap = makeSnapshot([
      { entity_id: 10, name: "First" },
      { entity_id: 20, name: "Second" },
    ]);
    expect(resolveStopName(snap, 20)).toBe("Second");
    expect(resolveStopName(snap, 10)).toBe("First");
  });

  it("stop with empty string name returns empty string (nullish coalescing preserves it)", () => {
    // stop?.name ?? fallback: empty string is not nullish, so it is returned as-is.
    const snap = makeSnapshot([{ entity_id: 3, name: "" }]);
    expect(resolveStopName(snap, 3)).toBe("");
  });
});
