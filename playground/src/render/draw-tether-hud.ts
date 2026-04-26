/**
 * Tether-mode HUD: the inline chip beside each climber, the side
 * info card listing every cabin's stats, and the helpers that build
 * a per-car summary from the snapshot. Split from `draw-tether.ts`
 * so the landscape/atmosphere code stays under the file-length cap.
 */

import { shade } from "./color-utils";
import type { Scale } from "./layout";
import { PHASE_COLORS } from "./palette";
import { roundedRect } from "./primitives";
import {
  atmosphericLayer,
  classifyKinematicPhase,
  formatAltitudeShort,
  formatDuration,
  formatVelocity,
  tetherEta,
  type KinematicPhase,
} from "./tether";
import type { CarDto, Snapshot } from "../types";

export interface AltitudeAxis {
  axisMaxM: number;
  toScreenAlt: (altitudeM: number) => number;
  shaftTop: number;
  shaftBottom: number;
}

export interface ClimberHud {
  carId: number;
  cx: number;
  cy: number;
  altitudeM: number;
  velocity: number;
  phase: KinematicPhase;
  layer: string;
  carName: string;
  load: number;
  capacity: number;
  riders: number;
  targetAltitudeM: number | undefined;
  etaSeconds: number | undefined;
}

const PHASE_LABEL: Record<KinematicPhase, string> = {
  accel: "accel",
  cruise: "cruise",
  decel: "decel",
  idle: "idle",
};

// Phase hues stay aligned with playground tokens: `pane-a` (cool blue
// for "going up / accelerating"), accent (amber for "doors / loading
// energy" — used here for cruise/decel transition), and the muted
// disabled grey for idle. Keeps the chip palette inside the existing
// design language rather than introducing a fresh green/yellow set.
const PHASE_HUE: Record<KinematicPhase, string> = {
  accel: "#7dd3fc", // --pane-a — moving up
  cruise: "#fbbf24", // --accent-up — sustained motion
  decel: "#fda4af", // --pane-b — slowing
  idle: "#6b6b75", // --text-disabled
};

export function drawClimberCabin(
  ctx: CanvasRenderingContext2D,
  car: CarDto,
  cx: number,
  cy: number,
  carW: number,
  carH: number,
): void {
  const halfW = carW / 2;
  const top = cy - carH / 2;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- wasm boundary: phase may hold a variant the TS union hasn't caught up with
  const base = PHASE_COLORS[car.phase] ?? "#6b6b75";
  // Subtle gradient — same treatment as the building cabins.
  const grad = ctx.createLinearGradient(cx, top, cx, top + carH);
  grad.addColorStop(0, shade(base, 0.14));
  grad.addColorStop(1, shade(base, -0.18));
  ctx.fillStyle = grad;
  roundedRect(ctx, cx - halfW, top, carW, carH, Math.min(3, carH * 0.16));
  ctx.fill();
  ctx.strokeStyle = "rgba(10, 12, 16, 0.9)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Thin amber accent line — reads as a lit cabin without the heavy
  // halo we used to draw, which clashed with the muted backdrop.
  ctx.fillStyle = "rgba(245, 158, 11, 0.55)";
  ctx.fillRect(cx - halfW + 2, top + carH * 0.36, carW - 4, Math.max(1.5, carH * 0.1));
}

/**
 * Draw inline HUD chips for every climber in a single pass so we can
 * resolve overlap before any chip lands on the canvas. When two
 * cabins share an altitude (idle climbers parked at the same stop),
 * a per-chip render would stack labels on top of each other; the
 * collision pass nudges colliders to the opposite side or vertically
 * apart until none overlap.
 */
export function drawClimberHuds(
  ctx: CanvasRenderingContext2D,
  hudList: readonly ClimberHud[],
  carW: number,
  canvasWidth: number,
  s: Scale,
): void {
  if (hudList.length === 0) return;
  const padX = 7;
  const padY = 4;
  const lh = s.fontSmall + 2;
  const gap = carW / 2 + 8;
  ctx.font = `600 ${(s.fontSmall + 0.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  interface Placement {
    hud: ClimberHud;
    lines: string[];
    bx: number;
    by: number;
    bubbleW: number;
    bubbleH: number;
    side: "left" | "right";
  }

  const place = (hud: ClimberHud, side: "left" | "right"): Placement => {
    const lines = [
      formatAltitudeShort(hud.altitudeM),
      formatVelocity(hud.velocity),
      `${PHASE_LABEL[hud.phase]} · ${hud.layer}`,
    ];
    let textW = 0;
    for (const l of lines) textW = Math.max(textW, ctx.measureText(l).width);
    const bubbleW = textW + padX * 2;
    const bubbleH = lines.length * lh + padY * 2;
    let bx = side === "right" ? hud.cx + gap : hud.cx - gap - bubbleW;
    if (bx + bubbleW + 2 > canvasWidth) bx = hud.cx - gap - bubbleW;
    if (bx < 2) bx = hud.cx + gap;
    const by = hud.cy - bubbleH / 2;
    return { hud, lines, bx, by, bubbleW, bubbleH, side };
  };

  const overlap = (a: Placement, b: Placement): boolean =>
    !(
      a.bx + a.bubbleW <= b.bx ||
      b.bx + b.bubbleW <= a.bx ||
      a.by + a.bubbleH <= b.by ||
      b.by + b.bubbleH <= a.by
    );

  const placements: Placement[] = [];
  hudList.forEach((hud, i) => {
    let p = place(hud, i % 2 === 0 ? "right" : "left");
    // Try the other side if this one collides with anything already placed.
    if (placements.some((q) => overlap(p, q))) {
      const flipped = place(hud, p.side === "right" ? "left" : "right");
      if (!placements.some((q) => overlap(flipped, q))) {
        p = flipped;
      } else {
        // Both sides taken — stack vertically below the lowest collider.
        const colliders = placements.filter((q) => overlap(p, q));
        const lowestBottom = Math.max(...colliders.map((q) => q.by + q.bubbleH));
        p = { ...p, by: lowestBottom + 4 };
      }
    }
    placements.push(p);
  });

  for (const p of placements) {
    ctx.save();
    ctx.fillStyle = "rgba(37, 37, 48, 0.92)"; // bg-elevated at high alpha
    roundedRect(ctx, p.bx, p.by, p.bubbleW, p.bubbleH, 4);
    ctx.fill();
    ctx.fillStyle = PHASE_HUE[p.hud.phase];
    ctx.fillRect(p.bx, p.by, 2, p.bubbleH);
    ctx.strokeStyle = "#2a2a35"; // border-subtle
    ctx.lineWidth = 1;
    roundedRect(ctx, p.bx, p.by, p.bubbleW, p.bubbleH, 4);
    ctx.stroke();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let i = 0; i < p.lines.length; i++) {
      const ly = p.by + padY + lh * i + lh / 2;
      const line = p.lines[i] ?? "";
      ctx.fillStyle = i === 2 ? PHASE_HUE[p.hud.phase] : "rgba(240, 244, 252, 0.95)";
      ctx.fillText(line, p.bx + padX, ly);
    }
    ctx.restore();
  }
}

export function drawTetherSideCard(
  ctx: CanvasRenderingContext2D,
  hudList: ClimberHud[],
  cardX: number,
  cardW: number,
  cardYStart: number,
  s: Scale,
): void {
  if (hudList.length === 0) return;
  const titleH = 18;
  const padX = 10;
  const padY = 6;
  const rowGap = 5;
  const lineH = s.fontSmall + 2.5;
  // Header line + altitude + velocity + ETA. Atmospheric layer is
  // already shown on the inline chip beside each cabin, so the side
  // card stays compact.
  const rowsPerCar = 4;
  const rowH = padY * 2 + rowsPerCar * lineH;
  const cardH = titleH + padY + (rowH + rowGap) * hudList.length;
  ctx.save();
  // Card surface — mirrors the pane chrome (`from-surface-elevated to-surface-secondary`).
  const grad = ctx.createLinearGradient(cardX, cardYStart, cardX, cardYStart + cardH);
  grad.addColorStop(0, "#252530"); // bg-elevated
  grad.addColorStop(1, "#1a1a1f"); // bg-secondary
  ctx.fillStyle = grad;
  roundedRect(ctx, cardX, cardYStart, cardW, cardH, 8);
  ctx.fill();
  ctx.strokeStyle = "#2a2a35"; // border-subtle
  ctx.lineWidth = 1;
  roundedRect(ctx, cardX, cardYStart, cardW, cardH, 8);
  ctx.stroke();
  // Inset highlight matching `--shadow-md`'s top sliver.
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.beginPath();
  ctx.moveTo(cardX + 8, cardYStart + 1);
  ctx.lineTo(cardX + cardW - 8, cardYStart + 1);
  ctx.stroke();

  // Title ("Climbers" eyebrow — same uppercase tracking as the pane labels).
  ctx.fillStyle = "#a1a1aa"; // text-secondary
  ctx.font = `600 ${(s.fontSmall - 0.5).toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("CLIMBERS", cardX + padX, cardYStart + titleH / 2 + 2);

  let cursorY = cardYStart + titleH + padY;
  for (const hud of hudList) {
    // Row card on a slightly darker surface so it lifts off the panel.
    ctx.fillStyle = "rgba(15, 15, 18, 0.55)";
    roundedRect(ctx, cardX + 6, cursorY, cardW - 12, rowH, 5);
    ctx.fill();
    ctx.fillStyle = PHASE_HUE[hud.phase];
    ctx.fillRect(cardX + 6, cursorY, 2, rowH);

    const labelX = cardX + padX + 4;
    const valueX = cardX + cardW - padX;
    let y = cursorY + padY + lineH / 2;
    ctx.font = `600 ${(s.fontSmall + 0.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = "#fafafa"; // text-primary
    ctx.textAlign = "left";
    ctx.fillText(hud.carName, labelX, y);
    ctx.textAlign = "right";
    ctx.fillStyle = PHASE_HUE[hud.phase];
    ctx.font = `600 ${(s.fontSmall - 1).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillText(PHASE_LABEL[hud.phase].toUpperCase(), valueX, y);

    const stats: Array<[string, string]> = [
      ["Altitude", formatAltitudeShort(hud.altitudeM)],
      ["Velocity", formatVelocity(hud.velocity)],
      [
        "ETA",
        hud.etaSeconds === undefined || !Number.isFinite(hud.etaSeconds)
          ? "—"
          : formatDuration(hud.etaSeconds),
      ],
    ];
    ctx.font = `500 ${(s.fontSmall - 0.5).toFixed(1)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    for (const [label, value] of stats) {
      y += lineH;
      ctx.textAlign = "left";
      ctx.fillStyle = "#8b8c92"; // text-tertiary
      ctx.fillText(label, labelX, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fafafa";
      ctx.fillText(value, valueX, y);
    }
    cursorY += rowH + rowGap;
  }
  ctx.restore();
}

export function buildHudList(
  snap: Snapshot,
  axis: AltitudeAxis,
  cx: number,
  carNames: Map<number, string>,
  prevVelocity: Map<number, number>,
  maxSpeed: number,
  acceleration: number,
  deceleration: number,
): ClimberHud[] {
  const out: ClimberHud[] = [];
  // Snapshot order is stable across frames, so deriving "Climber A/B/…"
  // from the car's index in the snapshot keeps the label tied to the
  // same cabin even though the entity id is opaque.
  const cars = [...snap.cars].sort((a, b) => a.id - b.id);
  cars.forEach((car, idx) => {
    const altitudeM = car.y;
    const layer = atmosphericLayer(altitudeM);
    const phase = classifyKinematicPhase(car.v, prevVelocity.get(car.id) ?? 0, maxSpeed);
    let etaSeconds: number | undefined;
    let targetAltitudeM: number | undefined;
    if (car.target !== undefined) {
      const targetStop = snap.stops.find((s) => s.entity_id === car.target);
      if (targetStop) {
        targetAltitudeM = targetStop.y;
        etaSeconds = tetherEta(
          altitudeM,
          targetStop.y,
          car.v,
          maxSpeed,
          acceleration,
          deceleration,
        );
      }
    }
    const fallbackName = `Climber ${String.fromCharCode(65 + idx)}`;
    out.push({
      carId: car.id,
      cx,
      cy: axis.toScreenAlt(altitudeM),
      altitudeM,
      velocity: car.v,
      phase,
      layer,
      carName: carNames.get(car.id) ?? fallbackName,
      load: car.load,
      capacity: car.capacity,
      riders: car.riders,
      targetAltitudeM,
      etaSeconds,
    });
  });
  return out;
}
