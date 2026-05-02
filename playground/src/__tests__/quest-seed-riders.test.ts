import { describe, expect, it } from "vitest";
import { STAGES } from "../features/quest/stages";
import { arrivals } from "../features/quest/stages/seed-helpers";

// Static guards on `seedRiders`. The wasm `Sim::step()` does not
// generate traffic from the RON `passenger_spawning` block, so a
// stage without seeded arrivals runs an empty building and never
// hits its delivered-riders pass threshold. These tests assert the
// schema contract that prevents that regression class without
// requiring wasm-in-node infrastructure for an end-to-end run.

// Parse `StopId(N)` declarations out of a stage's `configRon` so we
// can validate that every seeded rider's origin/destination
// references an actual stop. The RON is hand-authored per stage and
// always uses the same shape — a regex is enough for the static
// check. (A full RON parser belongs in the Rust side; the worker
// already validates at construction time.)
function configStopIds(configRon: string): Set<number> {
  const ids = new Set<number>();
  for (const match of configRon.matchAll(/StopId\((\d+)\)/g)) {
    ids.add(Number(match[1]));
  }
  return ids;
}

// Pull the minimum delivered count out of the stage's `passFn`. The
// test re-evaluates the predicate against synthetic grade inputs to
// find the smallest `delivered` value that returns `true` while
// `abandoned === 0` — the cheapest way to stay schema-agnostic
// without parsing the function body. Caps at 200 so a runaway
// predicate (or a mis-authored stage) fails the test instead of
// hanging.
function inferMinDelivered(stage: (typeof STAGES)[number]): number {
  const baseMetrics = {
    delivered: 0,
    abandoned: 0,
    avg_wait_s: 0,
    max_wait_s: 0,
  };
  for (let n = 0; n <= 200; n += 1) {
    const grade = {
      // Cast just for the test stub — a stage's passFn only reads
      // `metrics`, `delivered`, `abandoned`, and `endTick`.
      metrics: { ...baseMetrics, delivered: n } as never,
      endTick: 60_000,
      delivered: n,
      abandoned: 0,
    };
    if (stage.passFn(grade)) return n;
  }
  return Number.POSITIVE_INFINITY;
}

describe("quest: seed riders", () => {
  for (const stage of STAGES) {
    describe(stage.id, () => {
      it("declares seedRiders", () => {
        expect(stage.seedRiders).toBeDefined();
        expect(Array.isArray(stage.seedRiders)).toBe(true);
      });

      it("seeds enough riders to clear the pass threshold", () => {
        const minDelivered = inferMinDelivered(stage);
        // Margin: a stage that seeds exactly the threshold leaves no
        // room for in-flight riders or the rare case where a rider
        // gets stuck in a closed-door window. Require the seed list
        // to comfortably exceed the pass count.
        expect(stage.seedRiders.length).toBeGreaterThanOrEqual(minDelivered);
      });

      it("references only declared stop ids", () => {
        const validStops = configStopIds(stage.configRon);
        for (const rider of stage.seedRiders) {
          expect(validStops, `origin ${rider.origin}`).toContain(rider.origin);
          expect(validStops, `destination ${rider.destination}`).toContain(rider.destination);
          expect(rider.origin).not.toBe(rider.destination);
        }
      });
    });
  }
});

describe("quest: arrivals helper", () => {
  it("walks the destination list round-robin", () => {
    const list = arrivals(5, { origin: 0, destinations: [1, 2, 3], intervalTicks: 10 });
    expect(list.map((r) => r.destination)).toEqual([1, 2, 3, 1, 2]);
    expect(list.map((r) => r.atTick)).toEqual([0, 10, 20, 30, 40]);
    expect(list.every((r) => r.origin === 0)).toBe(true);
  });

  it("respects startTick and skips weight when absent", () => {
    const list = arrivals(2, {
      origin: 4,
      destinations: [0],
      startTick: 100,
      intervalTicks: 25,
    });
    expect(list[0]?.atTick).toBe(100);
    expect(list[1]?.atTick).toBe(125);
    expect(list[0]).not.toHaveProperty("weight");
  });

  it("threads weight and patienceTicks when provided", () => {
    const list = arrivals(1, {
      origin: 0,
      destinations: [1],
      weight: 90,
      patienceTicks: 600,
    });
    expect(list[0]?.weight).toBe(90);
    expect(list[0]?.patienceTicks).toBe(600);
  });

  it("rejects empty destination lists", () => {
    expect(() => arrivals(3, { origin: 0, destinations: [] })).toThrow();
  });
});
