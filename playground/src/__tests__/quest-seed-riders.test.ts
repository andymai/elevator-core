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

// Cap probing at 200; far above any current threshold, low enough
// that a runaway predicate (or a mis-authored stage) fails fast
// instead of hanging the test.
const MAX_DELIVERED_PROBE = 200;
const MAX_ABANDONED_PROBE = 50;

const baseMetrics = {
  delivered: 0,
  abandoned: 0,
  avg_wait_s: 0,
  max_wait_s: 0,
};

function evalPass(stage: (typeof STAGES)[number], delivered: number, abandoned: number): boolean {
  return stage.passFn({
    // Cast just for the stub — a stage's passFn only reads `metrics`,
    // `delivered`, `abandoned`, and `endTick`.
    metrics: { ...baseMetrics, delivered, abandoned } as never,
    endTick: 60_000,
    delivered,
    abandoned,
  });
}

/**
 * Smallest `delivered` count for which the stage's `passFn` returns
 * `true` at the given `abandoned` value, or `Infinity` if no count up
 * to {@link MAX_DELIVERED_PROBE} satisfies it.
 */
function minDeliveredAt(stage: (typeof STAGES)[number], abandoned: number): number {
  for (let n = 0; n <= MAX_DELIVERED_PROBE; n += 1) {
    if (evalPass(stage, n, abandoned)) return n;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Compute the seed-count requirement for a stage. The seed list must
 * cover both delivered riders and any abandoned riders the pass
 * condition explicitly tolerates: Stage 11
 * (`delivered >= 12 && abandoned <= 2`) needs 14 seeds, not 12 —
 * losing 2 to abandons still has to leave 12 delivered.
 *
 * "Explicitly tolerates" matters: a stage that doesn't mention
 * `abandoned` (e.g., Stage 4 grades on delivered only) has no
 * stated tolerance budget, so we don't pad. Otherwise a stage
 * passes the test only by overshooting the seed count by the
 * full probe range.
 */
function inferMinSeeds(stage: (typeof STAGES)[number]): number {
  const minDelivered = minDeliveredAt(stage, 0);
  if (!Number.isFinite(minDelivered)) return Number.POSITIVE_INFINITY;

  // Walk `abandoned` upward at the smallest passing `delivered`. The
  // first value that *fails* marks the stage's stated tolerance — so
  // tolerated abandons run [0, a_break - 1]. If we never see a
  // failing value, the stage is indifferent to abandons (no budget
  // to design around) and `maxAbandoned` stays at 0.
  let maxAbandoned = 0;
  for (let abandoned = 1; abandoned <= MAX_ABANDONED_PROBE; abandoned += 1) {
    if (evalPass(stage, minDelivered, abandoned)) {
      maxAbandoned = abandoned;
    } else {
      return minDelivered + maxAbandoned;
    }
  }
  // Unbounded passes across the probe range — treat as no stated
  // tolerance, so the seed list only needs to clear `minDelivered`.
  return minDelivered;
}

describe("quest: seed riders", () => {
  for (const stage of STAGES) {
    describe(stage.id, () => {
      it("declares seedRiders", () => {
        expect(stage.seedRiders).toBeDefined();
        expect(Array.isArray(stage.seedRiders)).toBe(true);
      });

      it("seeds enough riders to clear the pass threshold", () => {
        // The seed list must cover both the delivered count the
        // stage requires and any abandons it tolerates. Stage 1
        // (`delivered >= 5 && abandoned === 0`) needs exactly 5;
        // Stage 11 (`delivered >= 12 && abandoned <= 2`) needs 14
        // because losing 2 to abandon still has to leave 12
        // delivered. `inferMinSeeds` accounts for both.
        expect(stage.seedRiders.length).toBeGreaterThanOrEqual(inferMinSeeds(stage));
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
