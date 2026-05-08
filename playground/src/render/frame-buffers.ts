// Per-frame buffer types and helpers shared between the renderer and
// the building draw helpers. Kept in their own module so the renderer
// file can stay focused on draw orchestration.

/** Re-used `{start, end}` slot for car queue regions; pooled to avoid per-frame object churn. */
export interface QueueRegion {
  start: number;
  end: number;
}

export interface ShaftExtent {
  cx: number;
  top: number;
  bottom: number;
  fill: string;
  frame: string;
  width: number;
}

export interface ShaftLabel {
  cx: number;
  top: number;
  text: string;
  color: string;
}

// `loadingAtFloor` packs `(shaftIdx, stopId)` into a single Number so the
// hot-path lookup is a numeric Set membership check instead of per-frame
// string allocation. Both halves are well under 2²⁰ in practice — the
// playground caps shafts at single digits and stop entity ids stay below
// a few hundred (stops are allocated at scenario init, not continuously)
// — leaving plenty of room inside Number's 53 safe-integer bits.
const LOADING_KEY_STRIDE = 1_000_000;

export function loadingKey(shaftIdx: number, stopId: number): number {
  // Guard against a future scenario or sim variant pushing stopId past
  // the stride: collisions would silently flip door-active highlights
  // to the wrong floor. Dev-only; tree-shaken in production builds.
  if (import.meta.env.DEV && stopId >= LOADING_KEY_STRIDE) {
    console.warn(
      `loadingKey: stopId ${stopId} exceeds stride ${LOADING_KEY_STRIDE}; keys may collide`,
    );
  }
  return shaftIdx * LOADING_KEY_STRIDE + stopId;
}

/** Read-only mask passed to draw helpers; abstracts the key encoding. */
export interface LoadingMask {
  has(shaftIdx: number, stopId: number): boolean;
}

/** Wrap a numeric Set as a `LoadingMask`. */
export function loadingMaskFromSet(set: ReadonlySet<number>): LoadingMask {
  return {
    has: (shaftIdx, stopId) => set.has(loadingKey(shaftIdx, stopId)),
  };
}
