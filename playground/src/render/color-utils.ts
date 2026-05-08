// Per-frame draw paths feed the same handful of hex colours into shade()
// and hexWithAlpha() over and over. Memoise the regex match + parseInt
// (the dominant cost) so the hot path is just an object-property read
// plus the rgba/rgb string format.
//
// The cache keyed on the input hex returns the parsed (r, g, b) triple;
// callers that need a pure shade or alpha variant compose their own
// output string. `null` marks "unparseable" so we don't re-run the
// regex on a colour we already classified as non-hex.
const PARSED_HEX = new Map<string, readonly [number, number, number] | null>();

function parseHex(color: string): readonly [number, number, number] | null {
  const cached = PARSED_HEX.get(color);
  if (cached !== undefined) return cached;
  const m = color.match(/^#?([0-9a-f]{6})$/i);
  if (!m || m[1] === undefined) {
    PARSED_HEX.set(color, null);
    return null;
  }
  const n = parseInt(m[1], 16);
  const triple: readonly [number, number, number] = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  PARSED_HEX.set(color, triple);
  return triple;
}

/** Lighten (`amount > 0`) or darken (`amount < 0`) a hex color by a fraction [-1, 1]. */
export function shade(hex: string, amount: number): string {
  const triple = parseHex(hex);
  if (triple === null) return hex;
  const [r, g, b] = triple;
  const f = (c: number): number =>
    amount >= 0 ? Math.round(c + (255 - c) * amount) : Math.round(c * (1 + amount));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/** `#rrggbb` -> `rgba(r, g, b, a)`, no-op on other color forms. */
export function hexWithAlpha(color: string, alpha: number): string {
  const triple = parseHex(color);
  if (triple === null) return color;
  const [r, g, b] = triple;
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
  // parseHex memoises the regex check, so the per-frame call cost is a
  // Map lookup + the small alpha-byte formatting.
  if (parseHex(hex) !== null && hex.startsWith("#")) {
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
