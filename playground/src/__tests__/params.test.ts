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
    expect(defaultFor(sky, "cars")).toBe(3);
    expect(defaultFor(sky, "maxSpeed")).toBe(4.0);
    expect(defaultFor(sky, "weightCapacity")).toBe(1200);
    // 300 ticks dwell + 2 × 72 ticks transition = 444 / 60 = 7.4 s
    expect(defaultFor(sky, "doorCycleSec")).toBeCloseTo(7.4, 5);
  });
});

describe("params: resolution & overrides", () => {
  const sky = scenarioById("skyscraper-sky-lobby");

  it("resolveParam falls back to default for missing/non-finite overrides", () => {
    expect(resolveParam(sky, "maxSpeed", {})).toBe(4.0);
    expect(resolveParam(sky, "maxSpeed", { maxSpeed: NaN })).toBe(4.0);
    expect(resolveParam(sky, "maxSpeed", { maxSpeed: 4.5 })).toBe(4.5);
  });

  it("resolveParam clamps out-of-range overrides to the slider bounds", () => {
    expect(resolveParam(sky, "maxSpeed", { maxSpeed: -10 })).toBe(0.5);
    expect(resolveParam(sky, "maxSpeed", { maxSpeed: 999 })).toBe(12);
    expect(resolveParam(sky, "cars", { cars: 99 })).toBe(6);
    expect(resolveParam(sky, "cars", { cars: 0 })).toBe(1);
  });

  it("isOverridden tolerates within-half-step noise", () => {
    // Step is 0.5 m/s; 4.0 ± 0.24 still counts as default.
    expect(isOverridden(sky, "maxSpeed", 4.0)).toBe(false);
    expect(isOverridden(sky, "maxSpeed", 4.2)).toBe(false);
    expect(isOverridden(sky, "maxSpeed", 4.3)).toBe(true);
  });

  it("compactOverrides drops keys that round back to the default", () => {
    const overrides: Overrides = { maxSpeed: 4.0, weightCapacity: 2000 };
    const compact = compactOverrides(sky, overrides);
    expect(compact).toEqual({ weightCapacity: 2000 });
  });
});

describe("params: door cycle splitting", () => {
  const sky = scenarioById("skyscraper-sky-lobby");

  it("doorCycleSecFromTicks computes total seconds from tick fields", () => {
    expect(doorCycleSecFromTicks(300, 72)).toBeCloseTo(7.4, 5);
    expect(doorCycleSecFromTicks(180, 60)).toBeCloseTo(5.0, 5);
  });

  it("preserves the scenario's dwell-share when the user changes the cycle", () => {
    // Skyscraper defaults to 7.4 s with dwell-share 300/444 ≈ 0.676.
    // Doubling the cycle to 14.8 s should keep that share.
    const split = doorCycleSecToTicks(sky, 14.8);
    const total = split.openTicks + 2 * split.transitionTicks;
    expect(total).toBeGreaterThanOrEqual(888 - 2);
    expect(total).toBeLessThanOrEqual(888 + 2);
    expect(split.openTicks / total).toBeCloseTo(0.676, 1);
  });

  it("clamps both halves to ≥1 tick so engine validation passes", () => {
    const split = doorCycleSecToTicks(sky, 2);
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
  const sky = scenarioById("skyscraper-sky-lobby");
  const convention = scenarioById("convention-burst");

  it("default overrides round-trip to the same physics as the canonical RON", () => {
    const ron = buildScenarioRon(sky, {});
    expect(ron).toMatch(/name: "Skyscraper \(Sky Lobby\)"/);
    expect((ron.match(/ElevatorConfig\s*\(/g) ?? []).length).toBe(sky.defaultCars);
    expect(ron).toMatch(/max_speed: 4\.0/);
    expect(ron).toMatch(/weight_capacity: 1200\.0/);
    expect(ron).toMatch(/door_open_ticks: 300/);
    expect(ron).toMatch(/door_transition_ticks: 72/);
  });

  it("regenerates with a new car count using uniform physics across all cars", () => {
    const ron = buildScenarioRon(sky, { cars: 4 });
    expect((ron.match(/ElevatorConfig\s*\(/g) ?? []).length).toBe(4);
    expect((ron.match(/max_speed: 4\.0/g) ?? []).length).toBe(4);
  });

  it("bakes hot-swappable overrides into the RON so the initial sim already reflects them", () => {
    const ron = buildScenarioRon(sky, {
      maxSpeed: 4.5,
      weightCapacity: 1500,
      doorCycleSec: 8,
    });
    expect(ron).toMatch(/max_speed: 4\.5/);
    expect(ron).toMatch(/weight_capacity: 1500\.0/);
    const open = Number(/door_open_ticks:\s*(\d+)/.exec(ron)?.[1] ?? "NaN");
    const trans = Number(/door_transition_ticks:\s*(\d+)/.exec(ron)?.[1] ?? "NaN");
    expect(open + 2 * trans).toBeGreaterThanOrEqual(478);
    expect(open + 2 * trans).toBeLessThanOrEqual(482);
  });

  it("preserves the bypass percentages on scenarios that ship them", () => {
    const ron = buildScenarioRon(sky, {});
    expect((ron.match(/bypass_load_up_pct: Some\(0\.8\)/g) ?? []).length).toBe(sky.defaultCars);
    expect((ron.match(/bypass_load_down_pct: Some\(0\.5\)/g) ?? []).length).toBe(sky.defaultCars);
  });

  it("omits bypass fields on scenarios that don't ship them", () => {
    const ron = buildScenarioRon(convention, {});
    expect(ron).not.toMatch(/bypass_load_up_pct/);
    expect(ron).not.toMatch(/bypass_load_down_pct/);
  });
});

describe("params: applyPhysicsOverrides", () => {
  const sky = scenarioById("skyscraper-sky-lobby");

  it("returns scenario defaults when no overrides are present", () => {
    const out = applyPhysicsOverrides(sky, {});
    expect(out.maxSpeed).toBe(4.0);
    expect(out.weightCapacity).toBe(1200);
    expect(out.doorOpenTicks).toBe(300);
    expect(out.doorTransitionTicks).toBe(72);
    expect(out.acceleration).toBe(sky.elevatorDefaults.acceleration);
  });

  it("respects user overrides for all four hot-swappable knobs", () => {
    const out = applyPhysicsOverrides(sky, {
      maxSpeed: 5,
      weightCapacity: 1500,
      doorCycleSec: 7,
    });
    expect(out.maxSpeed).toBe(5);
    expect(out.weightCapacity).toBe(1500);
    expect(out.doorOpenTicks + 2 * out.doorTransitionTicks).toBeGreaterThanOrEqual(418);
    expect(out.doorOpenTicks + 2 * out.doorTransitionTicks).toBeLessThanOrEqual(422);
  });
});
