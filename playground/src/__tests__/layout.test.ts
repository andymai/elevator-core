import { describe, expect, it } from "vitest";
import { findNearestStop, scaleFor } from "../render/layout";
import type { Snapshot } from "../types";

type Stop = Snapshot["stops"][number];

function makeStop(entity_id: number, y: number, name = `Stop ${entity_id}`): Stop {
  return {
    entity_id,
    stop_id: entity_id,
    name,
    y,
    waiting: 0,
    waiting_up: 0,
    waiting_down: 0,
    residents: 0,
  };
}

describe("scaleFor", () => {
  it("width=320 → minimum interpolated values (t=0)", () => {
    const s = scaleFor(320);
    // t=0: lerp(a, b) = a
    expect(s.padX).toBeCloseTo(6, 5);
    expect(s.padTop).toBeCloseTo(22, 5);
    expect(s.labelW).toBeCloseTo(52, 5);
    expect(s.figureGutterW).toBeCloseTo(40, 5);
    expect(s.carH).toBeCloseTo(32, 5);
  });

  it("width=900 → maximum interpolated values (t=1)", () => {
    const s = scaleFor(900);
    expect(s.padX).toBeCloseTo(14, 5);
    expect(s.padTop).toBeCloseTo(30, 5);
    expect(s.labelW).toBeCloseTo(120, 5);
    expect(s.figureGutterW).toBeCloseTo(70, 5);
    expect(s.carH).toBeCloseTo(56, 5);
  });

  it("width=610 → mid-range interpolated values (t=0.5)", () => {
    const s = scaleFor(610);
    // t = (610 - 320) / (900 - 320) = 290/580 = 0.5
    expect(s.padX).toBeCloseTo(10, 5); // lerp(6,14,0.5)
    expect(s.labelW).toBeCloseTo(86, 5); // lerp(52,120,0.5)
    expect(s.carH).toBeCloseTo(44, 5); // lerp(32,56,0.5)
  });

  it("width below 320 clamps to minimum values (t=0)", () => {
    const s = scaleFor(100);
    expect(s.padX).toBeCloseTo(6, 5);
    expect(s.labelW).toBeCloseTo(52, 5);
  });

  it("width above 900 clamps to maximum values (t=1)", () => {
    const s = scaleFor(1600);
    expect(s.padX).toBeCloseTo(14, 5);
    expect(s.labelW).toBeCloseTo(120, 5);
  });

  it("maxShaftInnerW is always 88 (constant, not interpolated)", () => {
    expect(scaleFor(320).maxShaftInnerW).toBe(88);
    expect(scaleFor(900).maxShaftInnerW).toBe(88);
    expect(scaleFor(610).maxShaftInnerW).toBe(88);
  });
});

describe("findNearestStop", () => {
  it("returns undefined for an empty stops array", () => {
    expect(findNearestStop([], 50)).toBeUndefined();
  });

  it("returns the single stop when only one exists", () => {
    const stops = [makeStop(0, 100)];
    const result = findNearestStop(stops, 200);
    expect(result?.stop.entity_id).toBe(0);
    expect(result?.dist).toBe(100);
  });

  it("returns the nearest stop and exact distance", () => {
    const stops = [makeStop(0, 0), makeStop(1, 50), makeStop(2, 100)];
    const result = findNearestStop(stops, 60);
    expect(result?.stop.entity_id).toBe(1); // y=50, dist=10
    expect(result?.dist).toBe(10);
  });

  it("exact match returns dist=0", () => {
    const stops = [makeStop(0, 0), makeStop(1, 75), makeStop(2, 150)];
    const result = findNearestStop(stops, 75);
    expect(result?.stop.entity_id).toBe(1);
    expect(result?.dist).toBe(0);
  });

  it("when equidistant, returns the first stop (strict < comparison)", () => {
    // y=50 is equidistant from y=0 and y=100 (dist=50 each).
    // The strict `<` guard means the first match is kept, not replaced.
    const stops = [makeStop(0, 0), makeStop(1, 100)];
    const result = findNearestStop(stops, 50);
    expect(result?.stop.entity_id).toBe(0);
  });

  it("works with negative y values", () => {
    const stops = [makeStop(0, -100), makeStop(1, 0), makeStop(2, 100)];
    const result = findNearestStop(stops, -80);
    expect(result?.stop.entity_id).toBe(0); // y=-100, dist=20
    expect(result?.dist).toBe(20);
  });
});
