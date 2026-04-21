/**
 * Side-profile rider silhouettes inspired by SimTower. Each variant
 * is a distinct person shape drawn in profile — an asymmetric polygon
 * with a head, torso, and legs. `facing` flips the profile so riders
 * can look left or right.
 *
 * Variants are picked deterministically per (container, slot-index)
 * via `pickRiderVariant` so each slot stays stable across frames but
 * the crowd reads as a mix of individuals.
 */

export type RiderVariant =
  | "standard"
  | "briefcase"
  | "ponytail"
  | "stocky"
  | "tall"
  | "child"
  | "backpack";

const RIDER_VARIANTS: readonly RiderVariant[] = [
  "standard",
  "briefcase",
  "ponytail",
  "stocky",
  "tall",
  "child",
  "backpack",
];

export type Facing = "left" | "right";

/**
 * Hash `(seedA, seedB)` to a silhouette variant deterministically.
 */
export function pickRiderVariant(seedA: number, seedB: number): RiderVariant {
  let h = (seedA ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ seedB, 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return RIDER_VARIANTS[h % RIDER_VARIANTS.length] ?? "standard";
}

interface ProfileProps {
  headR: number;
  /** Head center offset forward from body center (nose direction). */
  headFwd: number;
  bodyW: number;
  /** Body height from shoulders to ankles (not including feet). */
  bodyH: number;
  neckGap: number;
  /** Forward lean of the torso center relative to the feet. */
  lean: number;
  /** Chest protrusion forward from the body center line. */
  chestFwd: number;
  /** Back protrusion behind the body center line. */
  backFwd: number;
  /** Leg separation at the ankles (profile depth). */
  legSep: number;
  /** Height of the shoe/foot below the ankle. */
  footH: number;
  /** How far the shoe extends forward past the ankle. */
  footFwd: number;
  /** How far the shoe extends backward past the ankle. */
  footBack: number;
}

function variantProps(variant: RiderVariant, baseR: number): ProfileProps {
  switch (variant) {
    case "child":
      return {
        headR: baseR * 0.9,
        headFwd: baseR * 0.15,
        bodyW: baseR * 1.6,
        bodyH: baseR * 3.4,
        neckGap: baseR * 0.15,
        lean: baseR * 0.1,
        chestFwd: baseR * 0.9,
        backFwd: baseR * 0.7,
        legSep: baseR * 0.3,
        footH: Math.max(0.8, baseR * 0.35),
        footFwd: baseR * 0.55,
        footBack: baseR * 0.15,
      };
    case "tall":
      return {
        headR: baseR * 1.0,
        headFwd: baseR * 0.2,
        bodyW: baseR * 1.5,
        bodyH: baseR * 6.5,
        neckGap: baseR * 0.2,
        lean: baseR * 0.15,
        chestFwd: baseR * 0.8,
        backFwd: baseR * 0.65,
        legSep: baseR * 0.35,
        footH: Math.max(1, baseR * 0.45),
        footFwd: baseR * 0.7,
        footBack: baseR * 0.2,
      };
    case "stocky":
      return {
        headR: baseR * 1.05,
        headFwd: baseR * 0.15,
        bodyW: baseR * 2.2,
        bodyH: baseR * 4.7,
        neckGap: baseR * 0.15,
        lean: baseR * 0.05,
        chestFwd: baseR * 1.2,
        backFwd: baseR * 1.0,
        legSep: baseR * 0.4,
        footH: Math.max(1, baseR * 0.45),
        footFwd: baseR * 0.75,
        footBack: baseR * 0.25,
      };
    case "ponytail":
      return {
        headR: baseR * 0.95,
        headFwd: baseR * 0.2,
        bodyW: baseR * 1.7,
        bodyH: baseR * 5.1,
        neckGap: baseR * 0.2,
        lean: baseR * 0.15,
        chestFwd: baseR * 0.9,
        backFwd: baseR * 0.7,
        legSep: baseR * 0.3,
        footH: Math.max(1, baseR * 0.4),
        footFwd: baseR * 0.6,
        footBack: baseR * 0.15,
      };
    case "standard":
    case "briefcase":
    case "backpack":
    default:
      return {
        headR: baseR,
        headFwd: baseR * 0.2,
        bodyW: baseR * 1.8,
        bodyH: baseR * 5.1,
        neckGap: baseR * 0.2,
        lean: baseR * 0.1,
        chestFwd: baseR * 0.9,
        backFwd: baseR * 0.75,
        legSep: baseR * 0.35,
        footH: Math.max(1, baseR * 0.45),
        footFwd: baseR * 0.65,
        footBack: baseR * 0.2,
      };
  }
}

/**
 * Draw a side-profile rider silhouette. `facing` controls which
 * direction the figure looks: "right" means the nose points toward
 * +x. The figure's feet rest on `floorY`.
 *
 * The profile is built from signed x-offsets relative to the figure's
 * center `x`. A `facing === "left"` figure uses negative offsets for
 * the "forward" direction; "right" uses positive. This avoids
 * ctx.save/scale/restore overhead in hot draw loops.
 */
export function drawRider(
  ctx: CanvasRenderingContext2D,
  x: number,
  floorY: number,
  headR: number,
  color: string,
  variant: RiderVariant = "standard",
  facing: Facing = "right",
): void {
  const p = variantProps(variant, headR);
  const f = facing === "right" ? 1 : -1;
  const groundY = floorY - 0.5;
  const ankleY = groundY - p.footH;
  const bodyTop = ankleY - p.bodyH;
  const headCY = bodyTop - p.neckGap - p.headR;
  const headCX = x + f * p.headFwd;

  const midY = bodyTop + p.bodyH * 0.45;
  const torsoX = x + f * p.lean;

  // Front and back ankle x-positions (where legs meet feet).
  const frontAnkleX = torsoX + f * p.legSep + f * p.chestFwd * 0.2;
  const backAnkleX = torsoX - f * p.legSep - f * p.backFwd * 0.1;

  ctx.fillStyle = color;

  // --- Body silhouette (profile polygon, shoulders to ankles) ---
  ctx.beginPath();
  ctx.moveTo(torsoX + f * p.chestFwd * 0.6, bodyTop);
  ctx.lineTo(torsoX + f * p.chestFwd, midY - p.bodyH * 0.05);
  ctx.lineTo(torsoX + f * p.chestFwd * 0.5, ankleY - p.bodyH * 0.25);
  ctx.lineTo(frontAnkleX, ankleY);
  ctx.lineTo(backAnkleX, ankleY);
  ctx.lineTo(torsoX - f * p.backFwd * 0.45, ankleY - p.bodyH * 0.25);
  ctx.lineTo(torsoX - f * p.backFwd, midY + p.bodyH * 0.05);
  ctx.lineTo(torsoX - f * p.backFwd * 0.5, bodyTop);
  ctx.closePath();
  ctx.fill();

  // --- Feet (two small shoes extending forward from each ankle) ---
  // Front foot — shoe extends forward in the facing direction.
  ctx.beginPath();
  ctx.rect(
    facing === "right" ? frontAnkleX - p.footBack : frontAnkleX - p.footFwd,
    ankleY,
    p.footFwd + p.footBack,
    p.footH,
  );
  ctx.fill();
  // Back foot — slightly behind, same shoe shape.
  ctx.beginPath();
  ctx.rect(
    facing === "right" ? backAnkleX - p.footBack : backAnkleX - p.footFwd,
    ankleY,
    p.footFwd + p.footBack,
    p.footH,
  );
  ctx.fill();

  // --- Head ---
  ctx.beginPath();
  ctx.arc(headCX, headCY, p.headR, 0, Math.PI * 2);
  ctx.fill();

  // --- Variant-specific accessories ---
  if (variant === "briefcase") {
    // Rectangular case hanging from the forward hand at thigh height.
    const caseW = Math.max(1.4, p.headR * 0.85);
    const caseH = Math.max(1.2, p.headR * 0.7);
    const caseX = torsoX + f * (p.chestFwd * 0.5 + caseW * 0.3);
    const caseY = ankleY - p.bodyH * 0.22 - caseH;
    ctx.fillRect(facing === "right" ? caseX : caseX - caseW, caseY, caseW, caseH);
    // Handle
    const handleW = caseW * 0.5;
    const handleX =
      facing === "right" ? caseX + (caseW - handleW) / 2 : caseX - caseW + (caseW - handleW) / 2;
    ctx.fillRect(handleX, caseY - 1, handleW, 1);
  } else if (variant === "ponytail") {
    // Ponytail trailing behind the head.
    const ptLen = p.headR * 1.4;
    const ptW = Math.max(0.8, p.headR * 0.5);
    const ptStartX = headCX - f * p.headR * 0.7;
    const ptStartY = headCY - p.headR * 0.3;
    const ptEndX = ptStartX - f * ptLen;
    const ptEndY = headCY + p.headR * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = ptW;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ptStartX, ptStartY);
    ctx.quadraticCurveTo(
      ptStartX - f * ptLen * 0.5,
      ptStartY + (ptEndY - ptStartY) * 0.2,
      ptEndX,
      ptEndY,
    );
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineWidth = 1;
  } else if (variant === "tall") {
    // Flat cap / hat brim extending forward from the head.
    const brimLen = p.headR * 1.6;
    const brimH = Math.max(0.8, p.headR * 0.35);
    const brimY = headCY - p.headR - brimH + 0.3;
    const brimBackX = headCX - f * p.headR * 0.4;
    const brimFrontX = headCX + f * brimLen * 0.6;
    ctx.fillRect(Math.min(brimBackX, brimFrontX), brimY, Math.abs(brimFrontX - brimBackX), brimH);
  } else if (variant === "stocky") {
    // Slight belly bump — no extra draw needed, the wider proportions
    // handle it. But add a subtle collar/neck mark for character.
    const collarW = p.bodyW * 0.35;
    ctx.fillRect(torsoX - collarW / 2, bodyTop - 0.5, collarW, Math.max(0.8, p.headR * 0.25));
  } else if (variant === "backpack") {
    // Rounded backpack behind the torso.
    const bpR = Math.max(1.2, p.headR * 0.95);
    const bpX = torsoX - f * (p.backFwd + bpR * 0.4);
    const bpY = bodyTop + p.bodyH * 0.3;
    ctx.beginPath();
    ctx.arc(bpX, bpY, bpR, 0, Math.PI * 2);
    ctx.fill();
    // Strap line from top of backpack to the forward shoulder.
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(bpX + f * bpR * 0.3, bpY - bpR * 0.8);
    ctx.lineTo(torsoX + f * p.chestFwd * 0.4, bodyTop + 1);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // `child` and `standard` have no extra marks — their proportions
  // are enough to read as distinct variants.
}
