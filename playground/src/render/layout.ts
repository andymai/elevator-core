import type { Snapshot } from "../types";

export interface Scale {
  padX: number;
  padTop: number;
  padBottom: number;
  labelW: number;
  /** Preferred gutter width per side for rider figures. Actual gutter
   *  grows if shafts hit their `maxShaftInnerW` cap and leave slack. */
  figureGutterW: number;
  /** Small gap between the figure gutter and the nearest shaft rail. */
  gutterGap: number;
  /** Width of a single shaft's inner channel (the car slides inside
   *  this). Computed per-frame in `draw()` from canvas width and shaft
   *  count; `minShaftInnerW`/`maxShaftInnerW` bound the result. */
  shaftInnerW: number;
  /** Lower bound for the computed shaft inner width on narrow canvases. */
  minShaftInnerW: number;
  /** Upper bound so single-shaft scenarios (space elevator) don't
   *  balloon into a tank-slot too wide to read as an elevator. */
  maxShaftInnerW: number;
  /** Horizontal gap between adjacent shafts in a multi-shaft bank. */
  shaftSpacing: number;
  carW: number;
  carH: number;
  fontMain: number;
  fontSmall: number;
  carDotR: number;
  /** Rider figure head radius. */
  figureHeadR: number;
  /** Horizontal stride between adjacent rider figures in a gutter. */
  figureStride: number;
}

// Smoothly interpolate render constants across canvas widths so the diagram
// stays legible from ~320px phones to wide desktops without abrupt breakpoints.
export function scaleFor(width: number): Scale {
  const t = Math.max(0, Math.min(1, (width - 320) / (900 - 320)));
  const lerp = (a: number, b: number): number => a + (b - a) * t;
  return {
    padX: lerp(6, 14),
    // Extra top padding reserves room for the "triangle UP" / "DOWN triangle"
    // direction headers above the first floor slab.
    padTop: lerp(22, 30),
    // Just enough bottom breathing room below the lowest floor slab.
    padBottom: lerp(10, 14),
    // Sized for the widest building-mode labels ("Penthouse" / "Sky
    // Lobby" on the skyscraper) on desktop, down to "Lobby" / "Floor N"
    // on the narrowest phones. Tether mode picks its own gutter width
    // inside `drawTetherScene`. `truncate()` clips anything that
    // spills over on ultra-long custom stop names.
    labelW: lerp(52, 120),
    // Preferred gutter for rider figures. The gutter grows further
    // only when shafts hit their max; otherwise shafts claim slack.
    figureGutterW: lerp(40, 70),
    gutterGap: lerp(3, 5),
    // Shaft sizing bounds — actual inner width derived per frame.
    // Min floors the value on tiny canvases; max keeps single-shaft
    // scenarios from widening to the point they look like a column
    // instead of an elevator shaft.
    shaftInnerW: lerp(28, 52), // initial hint; overwritten in draw()
    minShaftInnerW: lerp(22, 28),
    maxShaftInnerW: 88,
    shaftSpacing: lerp(3, 6),
    carW: lerp(22, 44), // initial hint; overwritten in draw()
    // Taller cars read as proper elevator cabins rather than tiles —
    // the car often visibly straddles the floor slab above and below
    // the current floor, which is fine because the slab is
    // door-gapped at the shaft and the car is drawn on top of the
    // shaft's dark channel fill.
    carH: lerp(32, 56),
    fontMain: lerp(10, 12),
    fontSmall: lerp(9, 10),
    carDotR: lerp(1.6, 2.2),
    // Head radius for the SimTower-style rider silhouette. Total
    // figure height ~= headR x 8.2 (see `drawRider`): small head
    // over a tapered body, matching the classic tiny-sim silhouette.
    figureHeadR: lerp(2, 2.8),
    figureStride: lerp(5.6, 8),
  };
}

/**
 * Find the stop nearest to world-y `y`. Returns the stop and the
 * distance, or `undefined` when the stops array is empty.
 */
export function findNearestStop(
  stops: Snapshot["stops"],
  y: number,
): { stop: Snapshot["stops"][number]; dist: number } | undefined {
  let best: Snapshot["stops"][number] | undefined;
  let bestDist = Infinity;
  for (const stp of stops) {
    const d = Math.abs(stp.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = stp;
    }
  }
  return best !== undefined ? { stop: best, dist: bestDist } : undefined;
}
