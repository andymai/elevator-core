/**
 * Shared geometry primitives for the airport scene. Lives in its own
 * module so both `draw-airport.ts` (track + stations + trains) and
 * `draw-airport-hud.ts` (per-train chips) can use them without code
 * duplication or a circular import.
 */

export interface RectGeometry {
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
}

export interface PerimeterPoint {
  x: number;
  y: number;
  /** Tangent direction in radians; 0 = +x (rightward), π/2 = +y. */
  tangent: number;
}

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Outward unit normal at a perimeter point (perpendicular to tangent,
 * pointing away from the rect center). The rect's perimeter is walked
 * clockwise, so the outward normal is the tangent rotated 90° CW.
 */
export function outwardNormal(p: PerimeterPoint): { nx: number; ny: number } {
  return { nx: Math.sin(p.tangent), ny: -Math.cos(p.tangent) };
}

/**
 * Project a perimeter point inward by `gap`. Used to render inner-loop
 * stations and trains at canvas positions geometrically aligned with
 * the corresponding outer-loop point, instead of via independent
 * perimeter-fraction lookup (which misaligns at corners because the
 * loops have different perimeters).
 */
export function projectInward(p: PerimeterPoint, gap: number): PerimeterPoint {
  const { nx, ny } = outwardNormal(p);
  return { x: p.x - nx * gap, y: p.y - ny * gap, tangent: p.tangent };
}

export function tracedRoundedRect(ctx: CanvasRenderingContext2D, rect: RectGeometry): void {
  const { cx, cy, w, h, r } = rect;
  const left = cx - w / 2;
  const top = cy - h / 2;
  const right = cx + w / 2;
  const bottom = cy + h / 2;
  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(right - r, top);
  ctx.arcTo(right, top, right, top + r, r);
  ctx.lineTo(right, bottom - r);
  ctx.arcTo(right, bottom, right - r, bottom, r);
  ctx.lineTo(left + r, bottom);
  ctx.arcTo(left, bottom, left, bottom - r, r);
  ctx.lineTo(left, top + r);
  ctx.arcTo(left, top, left + r, top, r);
  ctx.closePath();
}

export function rectIntersects(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
}
