/** Lighten (`amount > 0`) or darken (`amount < 0`) a hex color by a fraction [-1, 1]. */
export function shade(hex: string, amount: number): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m || m[1] === undefined) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const f = (c: number): number =>
    amount >= 0 ? Math.round(c + (255 - c) * amount) : Math.round(c * (1 + amount));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/** `#rrggbb` -> `rgba(r, g, b, a)`, no-op on other color forms. */
export function hexWithAlpha(color: string, alpha: number): string {
  const m = color.match(/^#?([0-9a-f]{6})$/i);
  if (!m || m[1] === undefined) return color;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Apply `alpha` (0..1) to a `#RRGGBB` hex color. Used for pane-tinted
 *  canvas strokes where we have a base hex and want a translucent
 *  variant without adding a CSS variable lookup on every frame.
 *
 *  Falls back to `hexWithAlpha` (rgba() form) for anything that isn't
 *  strictly `#RRGGBB` -- cheap safety net so a future caller passing
 *  shorthand or a CSS variable doesn't silently drop alpha. */
export function withAlpha(hex: string, alpha: number): string {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    return `${hex}${a.toString(16).padStart(2, "0")}`;
  }
  return hexWithAlpha(hex, alpha);
}

/**
 * Compute a curved-arc position along a tween at progress `t` (0..1).
 * The control point is offset perpendicular to the (start->end) segment so
 * dots arc above or below the straight path -- "above" for left-to-right
 * motion, which reads as a small airlock lift.
 */
export function arcPoint(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  t: number,
): [number, number] {
  const mx = (startX + endX) / 2;
  const my = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.max(Math.hypot(dx, dy), 1);
  // Perpendicular offset (-dy, dx) normalized, scaled by a fraction of length.
  const perpX = -dy / len;
  const perpY = dx / len;
  const arc = Math.min(len * 0.25, 22);
  const cx = mx + perpX * arc;
  const cy = my + perpY * arc;
  // Quadratic bezier at `t`.
  const u = 1 - t;
  return [
    u * u * startX + 2 * u * t * cx + t * t * endX,
    u * u * startY + 2 * u * t * cy + t * t * endY,
  ];
}

/** Cubic-bezier(0.2, 0.6, 0.2, 1) evaluated at x -> y, good-enough via Newton. */
export function easeOutNorm(tx: number): number {
  // Approximation: two-iteration Newton solver on the x curve, then evaluate y.
  // Accurate to ~1% for our purposes; much cheaper than a full lookup.
  const cx1 = 0.2;
  const cx2 = 0.2;
  const cy1 = 0.6;
  const cy2 = 1.0;
  let t = tx;
  for (let i = 0; i < 3; i++) {
    const u = 1 - t;
    const x = 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t;
    const dx = 3 * u * u * cx1 + 6 * u * t * (cx2 - cx1) + 3 * t * t * (1 - cx2);
    if (dx === 0) break;
    t -= (x - tx) / dx;
    t = Math.max(0, Math.min(1, t));
  }
  const u = 1 - t;
  return 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t;
}
