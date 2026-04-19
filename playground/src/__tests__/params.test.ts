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
    }
  });

  it("defaultFor returns scenario default for each key", () => {
    const office = scenarioById("office-mid-rise");
    expect(defaultFor(office, "cars")).toBe(2);
    expect(defaultFor(office, "maxSpeed")).toBe(2.2);
    expect(defaultFor(office, "weightCapacity")).toBe(800);
    // 210 ticks dwell + 2 × 60 ticks transition = 330 / 60 = 5.5 s
    expect(defaultFor(office, "doorCycleSec")).toBeCloseTo(5.5, 5);
  });
});

describe("params: resolution & overrides", () => {
  const office = scenarioById("office-mid-rise");

  it("resolveParam falls back to default for missing/non-finite overrides", () => {
    expect(resolveParam(office, "maxSpeed", {})).toBe(2.2);
    expect(resolveParam(office, "maxSpeed", { maxSpeed: NaN })).toBe(2.2);
    expect(resolveParam(office, "maxSpeed", { maxSpeed: 4.5 })).toBe(4.5);
  });

  it("resolveParam clamps out-of-range overrides to the slider bounds", () => {
    expect(resolveParam(office, "maxSpeed", { maxSpeed: -10 })).toBe(0.5);
    expect(resolveParam(office, "maxSpeed", { maxSpeed: 999 })).toBe(12);
    expect(resolveParam(office, "cars", { cars: 99 })).toBe(6);
    expect(resolveParam(office, "cars", { cars: 0 })).toBe(1);
  });

  it("isOverridden tolerates within-half-step noise", () => {
    // Step is 0.5 m/s; 2.2 ± 0.24 still counts as default.
    expect(isOverridden(office, "maxSpeed", 2.2)).toBe(false);
    expect(isOverridden(office, "maxSpeed", 2.4)).toBe(false);
    expect(isOverridden(office, "maxSpeed", 2.5)).toBe(true);
  });

  it("compactOverrides drops keys that round back to the default", () => {
    const overrides: Overrides = { maxSpeed: 2.2, weightCapacity: 1200 };
    const compact = compactOverrides(office, overrides);
    expect(compact).toEqual({ weightCapacity: 1200 });
  });
});

describe("params: door cycle splitting", () => {
  const office = scenarioById("office-mid-rise");

  it("doorCycleSecFromTicks computes total seconds from tick fields", () => {
    expect(doorCycleSecFromTicks(210, 60)).toBeCloseTo(5.5, 5);
    expect(doorCycleSecFromTicks(180, 60)).toBeCloseTo(5.0, 5);
  });

  it("preserves the scenario's dwell-share when the user changes the cycle", () => {
    // Office defaults to 5.5 s with dwell-share 3.5/5.5 ≈ 0.636.
    // Doubling the cycle to 11 s should keep that share.
    const split = doorCycleSecToTicks(office, 11);
    const total = split.openTicks + 2 * split.transitionTicks;
    expect(total).toBeGreaterThanOrEqual(660 - 2);
    expect(total).toBeLessThanOrEqual(660 + 2);
    expect(split.openTicks / total).toBeCloseTo(0.636, 1);
  });

  it("clamps both halves to ≥1 tick so engine validation passes", () => {
    const split = doorCycleSecToTicks(office, 2);
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
  const office = scenarioById("office-mid-rise");

  it("default overrides round-trip to the same physics as the canonical RON", () => {
    const ron = buildScenarioRon(office, {});
    expect(ron).toMatch(/name: "Mid-Rise Office"/);
    expect((ron.match(/ElevatorConfig\s*\(/g) ?? []).length).toBe(office.defaultCars);
    expect(ron).toMatch(/max_speed: 2\.2/);
    expect(ron).toMatch(/weight_capacity: 800\.0/);
    expect(ron).toMatch(/door_open_ticks: 210/);
    expect(ron).toMatch(/door_transition_ticks: 60/);
  });

  it("regenerates with a new car count using uniform physics across all cars", () => {
    const ron = buildScenarioRon(office, { cars: 4 });
    expect((ron.match(/ElevatorConfig\s*\(/g) ?? []).length).toBe(4);
    expect((ron.match(/max_speed: 2\.2/g) ?? []).length).toBe(4);
  });

  it("bakes hot-swappable overrides into the RON so the initial sim already reflects them", () => {
    const ron = buildScenarioRon(office, {
      maxSpeed: 4.5,
      weightCapacity: 1200,
      doorCycleSec: 8,
    });
    expect(ron).toMatch(/max_speed: 4\.5/);
    expect(ron).toMatch(/weight_capacity: 1200\.0/);
    const open = Number(/door_open_ticks:\s*(\d+)/.exec(ron)?.[1] ?? "NaN");
    const trans = Number(/door_transition_ticks:\s*(\d+)/.exec(ron)?.[1] ?? "NaN");
    expect(open + 2 * trans).toBeGreaterThanOrEqual(478);
    expect(open + 2 * trans).toBeLessThanOrEqual(482);
  });

  it("preserves the bypass percentages on scenarios that ship them", () => {
    const sky = scenarioById("skyscraper-sky-lobby");
    const ron = buildScenarioRon(sky, {});
    expect((ron.match(/bypass_load_up_pct: Some\(0\.8\)/g) ?? []).length).toBe(sky.defaultCars);
    expect((ron.match(/bypass_load_down_pct: Some\(0\.5\)/g) ?? []).length).toBe(sky.defaultCars);
  });

  it("omits bypass fields on scenarios that don't ship them", () => {
    const ron = buildScenarioRon(office, {});
    expect(ron).not.toMatch(/bypass_load_up_pct/);
    expect(ron).not.toMatch(/bypass_load_down_pct/);
  });
});

describe("params: applyPhysicsOverrides", () => {
  const office = scenarioById("office-mid-rise");

  it("returns scenario defaults when no overrides are present", () => {
    const out = applyPhysicsOverrides(office, {});
    expect(out.maxSpeed).toBe(2.2);
    expect(out.weightCapacity).toBe(800);
    expect(out.doorOpenTicks).toBe(210);
    expect(out.doorTransitionTicks).toBe(60);
    expect(out.acceleration).toBe(office.elevatorDefaults.acceleration);
  });

  it("respects user overrides for all four hot-swappable knobs", () => {
    const out = applyPhysicsOverrides(office, {
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
