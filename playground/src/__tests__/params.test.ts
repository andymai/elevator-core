import { describe, expect, it } from "vitest";
import {
  applyPhysicsOverrides,
  buildScenarioRon,
  compactOverrides,
  defaultFor,
  doorCycleSecFromTicks,
  doorCycleSecToTicks,
  isOverridden,
  pickStartingStops,
  resolveParam,
  type Overrides,
} from "../params";
import { SCENARIOS, scenarioById } from "../scenarios";

describe("params: defaults extraction", () => {
  it("structured defaults match the RON-literal physics", () => {
    // Drift guard: every scenario duplicates its physics in two places —
    // the embedded RON literal and the structured `elevatorDefaults` /
    // `defaultCars` fields. A typo in one would silently drift from the
    // other; this test catches it before greptile or production.
    for (const s of SCENARIOS) {
      const stopMatches = s.ron.match(/StopConfig\s*\(/g) ?? [];
      expect(stopMatches.length, `${s.id} stops length`).toBe(s.stops.length);

      const carMatches = s.ron.match(/ElevatorConfig\s*\(/g) ?? [];
      expect(carMatches.length, `${s.id} default cars`).toBe(s.defaultCars);

      // Spot-check physics fields against the first occurrence in the
      // RON. These field names only appear inside ElevatorConfigs (not
      // StopConfigs / SimulationParams), so a global match against the
      // first hit is correct without parsing nested RON parens.
      const speed = Number(/max_speed:\s*([\d.]+)/.exec(s.ron)?.[1] ?? "NaN");
      expect(speed, `${s.id} max_speed`).toBeCloseTo(s.elevatorDefaults.maxSpeed, 5);
      const cap = Number(/weight_capacity:\s*([\d.]+)/.exec(s.ron)?.[1] ?? "NaN");
      expect(cap, `${s.id} weight_capacity`).toBeCloseTo(s.elevatorDefaults.weightCapacity, 5);
      const dop = Number(/door_open_ticks:\s*(\d+)/.exec(s.ron)?.[1] ?? "NaN");
      expect(dop, `${s.id} door_open_ticks`).toBe(s.elevatorDefaults.doorOpenTicks);
      const dtr = Number(/door_transition_ticks:\s*(\d+)/.exec(s.ron)?.[1] ?? "NaN");
      expect(dtr, `${s.id} door_transition_ticks`).toBe(s.elevatorDefaults.doorTransitionTicks);

      // passenger_spawning fields feed buildScenarioRon too — a typo in
      // the struct would silently desync from the RON literal on a
      // car-count change (which regenerates RON) even though the default
      // load still uses the literal directly.
      const meanTicks = Number(/mean_interval_ticks:\s*(\d+)/.exec(s.ron)?.[1] ?? "NaN");
      expect(meanTicks, `${s.id} mean_interval_ticks`).toBe(s.passengerMeanIntervalTicks);
      const weightRangeMatch = /weight_range:\s*\(([\d.]+),\s*([\d.]+)\)/.exec(s.ron);
      expect(Number(weightRangeMatch?.[1] ?? "NaN"), `${s.id} weight_range[0]`).toBeCloseTo(
        s.passengerWeightRange[0],
        5,
      );
      expect(Number(weightRangeMatch?.[2] ?? "NaN"), `${s.id} weight_range[1]`).toBeCloseTo(
        s.passengerWeightRange[1],
        5,
      );
    }
  });

  it("defaultFor returns scenario default for each key", () => {
    const sky = scenarioById("skyscraper-sky-lobby");
    // Skyscraper is multi-line with 6 fixed cars (2 low + 2 high +
    // 1 VIP + 1 service). `buildScenarioRon` short-circuits when
    // cars min == max and returns the hand-written RON verbatim.
    expect(defaultFor(sky, "cars")).toBe(6);
    expect(defaultFor(sky, "maxSpeed")).toBe(4.5);
    expect(defaultFor(sky, "weightCapacity")).toBe(1800);
    // 240 dwell + 2 × 60 transition = 360 / 60 = 6.0 s
    expect(defaultFor(sky, "doorCycleSec")).toBeCloseTo(6.0, 5);
  });
});

describe("params: resolution & overrides", () => {
  // Use convention-burst for resolution/override tests — skyscraper's
  // multi-line config now locks cars to min==max so the clamping /
  // regeneration behaviour has to be exercised on a flat scenario.
  const conv = scenarioById("convention-burst");

  it("resolveParam falls back to default for missing/non-finite overrides", () => {
    expect(resolveParam(conv, "maxSpeed", {})).toBe(3.5);
    expect(resolveParam(conv, "maxSpeed", { maxSpeed: NaN })).toBe(3.5);
    expect(resolveParam(conv, "maxSpeed", { maxSpeed: 4.5 })).toBe(4.5);
  });

  it("resolveParam clamps out-of-range overrides to the slider bounds", () => {
    expect(resolveParam(conv, "maxSpeed", { maxSpeed: -10 })).toBe(0.5);
    expect(resolveParam(conv, "maxSpeed", { maxSpeed: 999 })).toBe(12);
    expect(resolveParam(conv, "cars", { cars: 99 })).toBe(6);
    expect(resolveParam(conv, "cars", { cars: 0 })).toBe(1);
  });

  it("isOverridden tolerates within-half-step noise", () => {
    // Step is 0.5 m/s; 3.5 ± 0.24 still counts as default.
    expect(isOverridden(conv, "maxSpeed", 3.5)).toBe(false);
    expect(isOverridden(conv, "maxSpeed", 3.7)).toBe(false);
    expect(isOverridden(conv, "maxSpeed", 3.8)).toBe(true);
  });

  it("compactOverrides drops keys that round back to the default", () => {
    const overrides: Overrides = { maxSpeed: 3.5, weightCapacity: 2000 };
    const compact = compactOverrides(conv, overrides);
    expect(compact).toEqual({ weightCapacity: 2000 });
  });
});

describe("params: door cycle splitting", () => {
  const conv = scenarioById("convention-burst");

  it("doorCycleSecFromTicks computes total seconds from tick fields", () => {
    // Convention cycle: 300 dwell + 2 × 60 transition = 420 ticks = 7.0 s
    expect(doorCycleSecFromTicks(300, 60)).toBeCloseTo(7.0, 5);
    expect(doorCycleSecFromTicks(180, 60)).toBeCloseTo(5.0, 5);
  });

  it("preserves the scenario's dwell-share when the user changes the cycle", () => {
    // Convention defaults: dwell-share 300/420 ≈ 0.714.
    // Doubling the cycle to 14.0 s should keep that share.
    const split = doorCycleSecToTicks(conv, 14.0);
    const total = split.openTicks + 2 * split.transitionTicks;
    expect(total).toBeGreaterThanOrEqual(840 - 2);
    expect(total).toBeLessThanOrEqual(840 + 2);
    expect(split.openTicks / total).toBeCloseTo(0.714, 1);
  });

  it("clamps both halves to ≥1 tick so engine validation passes", () => {
    const split = doorCycleSecToTicks(conv, 2);
    expect(split.openTicks).toBeGreaterThanOrEqual(1);
    expect(split.transitionTicks).toBeGreaterThanOrEqual(1);
  });
});

describe("params: starting-stop spread", () => {
  it("spreads cars evenly across stops", () => {
    expect(pickStartingStops(12, 3)).toEqual([0, 4, 8]);
    expect(pickStartingStops(6, 2)).toEqual([0, 3]);
    expect(pickStartingStops(8, 1)).toEqual([0]);
  });

  it("clamps to the last stop when cars exceed stops", () => {
    expect(pickStartingStops(2, 6)).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it("returns an empty array for nonsense inputs", () => {
    expect(pickStartingStops(0, 3)).toEqual([]);
    expect(pickStartingStops(5, 0)).toEqual([]);
  });
});

describe("params: RON regeneration", () => {
  const convention = scenarioById("convention-burst");
  const sky = scenarioById("skyscraper-sky-lobby");

  it("default overrides round-trip to the same physics as the canonical RON", () => {
    const ron = buildScenarioRon(convention, {});
    expect(ron).toMatch(/name: "Convention Center"/);
    expect((ron.match(/ElevatorConfig\s*\(/g) ?? []).length).toBe(convention.defaultCars);
    expect(ron).toMatch(/max_speed: 3\.5/);
    expect(ron).toMatch(/weight_capacity: 1500\.0/);
    expect(ron).toMatch(/door_open_ticks: 300/);
    expect(ron).toMatch(/door_transition_ticks: 60/);
  });

  it("regenerates with a new car count using uniform physics across all cars", () => {
    const ron = buildScenarioRon(convention, { cars: 3 });
    expect((ron.match(/ElevatorConfig\s*\(/g) ?? []).length).toBe(3);
    expect((ron.match(/max_speed: 3\.5/g) ?? []).length).toBe(3);
  });

  it("bakes hot-swappable overrides into the RON so the initial sim already reflects them", () => {
    const ron = buildScenarioRon(convention, {
      maxSpeed: 4.5,
      weightCapacity: 1800,
      doorCycleSec: 8,
    });
    expect(ron).toMatch(/max_speed: 4\.5/);
    expect(ron).toMatch(/weight_capacity: 1800\.0/);
    const open = Number(/door_open_ticks:\s*(\d+)/.exec(ron)?.[1] ?? "NaN");
    const trans = Number(/door_transition_ticks:\s*(\d+)/.exec(ron)?.[1] ?? "NaN");
    expect(open + 2 * trans).toBeGreaterThanOrEqual(478);
    expect(open + 2 * trans).toBeLessThanOrEqual(482);
  });

  it("omits bypass fields on scenarios that don't ship them", () => {
    const ron = buildScenarioRon(convention, {});
    expect(ron).not.toMatch(/bypass_load_up_pct/);
    expect(ron).not.toMatch(/bypass_load_down_pct/);
  });

  it("short-circuits for multi-line scenarios and returns the prebuilt RON", () => {
    const ron = buildScenarioRon(sky, { maxSpeed: 5, weightCapacity: 2000 });
    expect(ron).toBe(sky.ron);
    expect(ron).toMatch(/lines: Some\(/);
    expect(ron).toMatch(/groups: Some\(/);
  });
});

describe("params: applyPhysicsOverrides", () => {
  const conv = scenarioById("convention-burst");

  it("returns scenario defaults when no overrides are present", () => {
    const out = applyPhysicsOverrides(conv, {});
    expect(out.maxSpeed).toBe(3.5);
    expect(out.weightCapacity).toBe(1500);
    expect(out.doorOpenTicks).toBe(300);
    expect(out.doorTransitionTicks).toBe(60);
    expect(out.acceleration).toBe(conv.elevatorDefaults.acceleration);
  });

  it("respects user overrides for all four hot-swappable knobs", () => {
    const out = applyPhysicsOverrides(conv, {
      maxSpeed: 5,
      weightCapacity: 1800,
      doorCycleSec: 7,
    });
    expect(out.maxSpeed).toBe(5);
    expect(out.weightCapacity).toBe(1800);
    expect(out.doorOpenTicks + 2 * out.doorTransitionTicks).toBeGreaterThanOrEqual(418);
    expect(out.doorOpenTicks + 2 * out.doorTransitionTicks).toBeLessThanOrEqual(422);
  });
});
