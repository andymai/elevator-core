/**
 * Silhouette archetypes for rider variation. Picked deterministically
 * per (stop, slot-index) or (car, slot-index) via `pickRiderVariant`
 * so each slot stays stable across frames but the crowd as a whole
 * reads as a mix of individuals rather than a row of clones.
 *
 * - `standard` -- the default humanoid (baseline sims).
 * - `briefcase` -- standard + small rectangular case at right hip.
 * - `bag` -- standard + rounded shoulder-bag blob at left shoulder.
 * - `short` -- smaller all around (reads as a child or shorter adult).
 * - `tall` -- taller and slimmer (reads as a longer-built adult).
 */
export type RiderVariant = "standard" | "briefcase" | "bag" | "short" | "tall";
const RIDER_VARIANTS: readonly RiderVariant[] = ["standard", "briefcase", "bag", "short", "tall"];

/**
 * Hash `(seedA, seedB)` to a silhouette variant deterministically.
 * Uses the same `Math.imul` FNV-style mix the seed word hasher uses
 * so the result is stable across browsers and machines. Caller
 * supplies `seedA` as the parent entity id (stop or car) and `seedB`
 * as the slot index within that container -- same combination -> same
 * variant on every frame.
 */
export function pickRiderVariant(seedA: number, seedB: number): RiderVariant {
  let h = (seedA ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ seedB, 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return RIDER_VARIANTS[h % RIDER_VARIANTS.length] ?? "standard";
}

/**
 * Per-variant body proportions. Factored out of `drawStickFigure`
 * so the polygon-drawing code reads the same for all five variants;
 * only the inputs differ.
 */
function variantProps(
  variant: RiderVariant,
  baseHeadR: number,
): {
  headR: number;
  shoulderW: number;
  waistW: number;
  footW: number;
  bodyH: number;
  neckGap: number;
} {
  switch (variant) {
    case "short": {
      // ~78 % of standard across the board — reads as a child or
      // shorter adult without needing a different silhouette shape.
      const r = baseHeadR * 0.82;
      return {
        headR: r,
        shoulderW: r * 2.3,
        waistW: r * 1.6,
        footW: r * 1.9,
        bodyH: r * 5.2,
        neckGap: r * 0.2,
      };
    }
    case "tall": {
      // Slightly larger head + slimmer body + taller torso. Total
      // height ~= 11 x baseHeadR so a `tall` figure stands a bit above
      // the other variants at the same head radius.
      return {
        headR: baseHeadR * 1.05,
        shoulderW: baseHeadR * 2.2,
        waistW: baseHeadR * 1.5,
        footW: baseHeadR * 1.9,
        bodyH: baseHeadR * 7.5,
        neckGap: baseHeadR * 0.2,
      };
    }
    case "standard":
    case "briefcase":
    case "bag":
    default:
      return {
        headR: baseHeadR,
        shoulderW: baseHeadR * 2.5,
        waistW: baseHeadR * 1.7,
        footW: baseHeadR * 2,
        bodyH: baseHeadR * 6,
        neckGap: baseHeadR * 0.2,
      };
  }
}

/**
 * Draw a SimTower-style rider silhouette: small filled head over a
 * tapered humanoid body (wider shoulders narrowing toward the feet,
 * with a softly rounded top and slightly flared base). Five variants
 * pick different proportions and optional accessory marks so a queue
 * of riders reads as a mix of people rather than a row of clones.
 *
 * Feet rest on `floorY`. Total height ~= headR x 8.2 for `standard`,
 * a bit less for `short` and a bit more for `tall`.
 */
export function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  headR: number,
  color: string,
  variant: RiderVariant = "standard",
): void {
  // Per-variant proportions. Kept as a single tuple of multipliers
  // so a designer tweaking the look can scan one source of truth
  // without hunting across five code paths.
  const p = variantProps(variant, headR);
  const feetY = floorY - 0.5;
  const bodyBottom = feetY;
  const bodyTop = bodyBottom - p.bodyH;
  const headCenterY = bodyTop - p.neckGap - p.headR;
  const shoulderRound = p.bodyH * 0.08;
  const waistBendY = bodyBottom - p.headR * 0.8;

  ctx.fillStyle = color;
  // Body silhouette — six-point polygon with a gently sloped taper
  // from shoulders to waist and a slight flare at the feet.
  ctx.beginPath();
  ctx.moveTo(x - p.shoulderW / 2, bodyTop + shoulderRound);
  ctx.lineTo(x - p.shoulderW / 2 + shoulderRound, bodyTop);
  ctx.lineTo(x + p.shoulderW / 2 - shoulderRound, bodyTop);
  ctx.lineTo(x + p.shoulderW / 2, bodyTop + shoulderRound);
  ctx.lineTo(x + p.waistW / 2, waistBendY);
  ctx.lineTo(x + p.footW / 2, bodyBottom);
  ctx.lineTo(x - p.footW / 2, bodyBottom);
  ctx.lineTo(x - p.waistW / 2, waistBendY);
  ctx.closePath();
  ctx.fill();
  // Head — filled circle. Anti-aliasing handles the merge into the
  // neck gap cleanly at these sizes.
  ctx.beginPath();
  ctx.arc(x, headCenterY, p.headR, 0, Math.PI * 2);
  ctx.fill();

  // Variant-specific flourishes. All drawn in the same fill color
  // so accessories read as part of the silhouette (the sim holds
  // the briefcase / wears the bag) rather than a separate object.
  if (variant === "briefcase") {
    // Square case carried low at the right hand — knee / thigh
    // height on a standing adult. A tiny 1-px handle strip on top
    // reads as "carried" rather than "glued on." Bottom sits just
    // above the feet so the case doesn't clip through the shoes.
    const caseSize = Math.max(1.6, p.headR * 0.9);
    const caseX = x + p.waistW / 2 + caseSize * 0.1;
    const caseY = bodyBottom - caseSize - 0.5;
    ctx.fillRect(caseX, caseY, caseSize, caseSize);
    const handleW = caseSize * 0.55;
    ctx.fillRect(caseX + (caseSize - handleW) / 2, caseY - 1, handleW, 1);
  } else if (variant === "bag") {
    // Shoulder bag — rounded blob hanging from the left shoulder
    // with a visible strap line arcing up to the opposite shoulder.
    // The strap sells the "slung over shoulder" geometry.
    const bagR = Math.max(1.3, p.headR * 0.9);
    const bagX = x - p.shoulderW / 2 - bagR * 0.35;
    const bagY = bodyTop + p.bodyH * 0.35;
    ctx.beginPath();
    ctx.arc(bagX, bagY, bagR, 0, Math.PI * 2);
    ctx.fill();
    // Strap: thin line from top of bag up to the right shoulder.
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bagX + bagR * 0.2, bagY - bagR * 0.8);
    ctx.lineTo(x + p.shoulderW / 2 - shoulderRound, bodyTop + 0.5);
    ctx.stroke();
  } else if (variant === "tall") {
    // Tall figures get a subtle cap/hat — a short horizontal bar
    // just above the head, wider than the head itself. Reads as
    // "tall + distinctive silhouette" at a glance. Kept to a
    // single short strip so it doesn't enlarge the footprint
    // visually; only adds character.
    const hatW = p.headR * 2.1;
    const hatH = Math.max(1, p.headR * 0.45);
    ctx.fillRect(x - hatW / 2, headCenterY - p.headR - hatH + 0.4, hatW, hatH);
  }
  // `short` has no extra mark — its ~82 % scale vs the other
  // variants is enough to read as a distinct silhouette without a
  // confusing nub (an earlier "ponytail / backpack" circle to the
  // rear of the head was mis-read as "a person with a circle on
  // their back" and removed).
}
