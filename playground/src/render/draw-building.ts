import { drawFigureRow } from "./figures/figure-row";
import type { Scale } from "./layout";
import {
  DOOR_ACTIVE,
  DOOR_INACTIVE,
  DOWN_COLOR,
  FLOOR_LINE,
  STOP_LABEL,
  UP_COLOR,
} from "./palette";
import { truncate } from "./primitives";
import type { CarDto, Snapshot } from "../types";

export function drawShaftChannels(
  ctx: CanvasRenderingContext2D,
  extents: Array<{
    cx: number;
    top: number;
    bottom: number;
    fill: string;
    frame: string;
    width: number;
  }>,
): void {
  for (const ex of extents) {
    const half = ex.width / 2;
    ctx.fillStyle = ex.fill;
    ctx.fillRect(ex.cx - half, ex.top, ex.width, ex.bottom - ex.top);
  }
  ctx.lineWidth = 1;
  for (const ex of extents) {
    const half = ex.width / 2;
    ctx.strokeStyle = ex.frame;
    const l = ex.cx - half + 0.5;
    const r = ex.cx + half - 0.5;
    ctx.beginPath();
    ctx.moveTo(l, ex.top);
    ctx.lineTo(l, ex.bottom);
    ctx.moveTo(r, ex.top);
    ctx.lineTo(r, ex.bottom);
    ctx.stroke();
  }
}

export function drawShaftLabels(
  ctx: CanvasRenderingContext2D,
  labels: Array<{ cx: number; top: number; text: string; color: string }>,
  s: Scale,
): void {
  if (labels.length === 0) return;
  ctx.font = `600 ${s.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  for (const l of labels) {
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, l.cx, l.top - 3);
  }
}

export function drawFloors(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  toScreenY: (y: number) => number,
  s: Scale,
  shaftCenters: number[],
  w: number,
  loadingAtFloor: Set<string>,
  stopsTop: number,
  isTether: boolean,
): void {
  ctx.font = `${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  const labelX = s.padX;
  const slabLeft = s.padX + s.labelW;
  const slabRight = w - s.padX;
  const half = s.shaftInnerW / 2;
  const platformHalfW = Math.min(s.shaftInnerW * 1.8, (slabRight - slabLeft) / 2);

  const sorted = [...snap.stops].sort((a, b) => a.y - b.y);

  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i];
    if (stop === undefined) continue;
    const slabY = toScreenY(stop.y);
    const nextStop = sorted[i + 1];
    const ceilingY = nextStop !== undefined ? toScreenY(nextStop.y) : stopsTop;

    ctx.strokeStyle = FLOOR_LINE;
    ctx.lineWidth = isTether ? 2 : 1;
    ctx.beginPath();
    if (isTether) {
      for (const cx of shaftCenters) {
        ctx.moveTo(cx - platformHalfW, slabY + 0.5);
        ctx.lineTo(cx + platformHalfW, slabY + 0.5);
      }
    } else {
      let cursor = slabLeft;
      for (const cx of shaftCenters) {
        const gapL = cx - half;
        const gapR = cx + half;
        if (gapL > cursor) {
          ctx.moveTo(cursor, slabY + 0.5);
          ctx.lineTo(gapL, slabY + 0.5);
        }
        cursor = gapR;
      }
      if (cursor < slabRight) {
        ctx.moveTo(cursor, slabY + 0.5);
        ctx.lineTo(slabRight, slabY + 0.5);
      }
    }
    ctx.stroke();

    for (let j = 0; j < shaftCenters.length; j++) {
      const cx = shaftCenters[j];
      if (cx === undefined) continue;
      const active = loadingAtFloor.has(`${j}:${stop.entity_id}`);
      ctx.strokeStyle = active ? DOOR_ACTIVE : DOOR_INACTIVE;
      ctx.lineWidth = active ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(cx - half - 2, slabY + 0.5);
      ctx.lineTo(cx - half, slabY + 0.5);
      ctx.moveTo(cx + half, slabY + 0.5);
      ctx.lineTo(cx + half + 2, slabY + 0.5);
      ctx.stroke();
    }

    const labelY = isTether ? slabY : (slabY + ceilingY) / 2;
    ctx.fillStyle = STOP_LABEL;
    ctx.textAlign = "right";
    ctx.fillText(truncate(ctx, stop.name, s.labelW - 4), labelX + s.labelW - 4, labelY);
  }
}

/**
 * Label the waiting gutter and each car column in the top padding.
 */
export function drawCarHeaders(
  ctx: CanvasRenderingContext2D,
  s: Scale,
  cars: readonly CarDto[],
  carX: Map<number, number>,
  waitingGutter: { start: number; end: number },
): void {
  const y = s.padTop / 2 + 1;
  ctx.font = `600 ${s.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = "middle";

  ctx.textAlign = "center";
  ctx.fillStyle = "#8b8c92";
  ctx.fillText("Waiting", (waitingGutter.start + waitingGutter.end) / 2, y);

  let carNum = 1;
  for (const car of cars) {
    const cx = carX.get(car.id);
    if (cx === undefined) continue;
    ctx.fillStyle = "#a1a1aa";
    ctx.textAlign = "center";
    ctx.fillText(`Car ${carNum}`, cx, y);
    carNum++;
  }
}

/**
 * Draw waiting riders — unassigned in the shared gutter, assigned
 * in the queue area next to the elevator they've been assigned to.
 */
export function drawWaitingFigures(
  ctx: CanvasRenderingContext2D,
  snap: Snapshot,
  toScreenY: (y: number) => number,
  s: Scale,
  waitingGutter: { start: number; end: number },
  carQueueRegion: Map<number, { start: number; end: number }>,
  stopAssignments: Map<number, number>,
): void {
  const gutterW = waitingGutter.end - waitingGutter.start;

  for (const stop of snap.stops) {
    const y = toScreenY(stop.y);
    const totalWaiting = stop.waiting_up + stop.waiting_down;
    if (totalWaiting === 0) continue;

    const assignedCarId = stopAssignments.get(stop.entity_id);
    const qr = assignedCarId !== undefined ? carQueueRegion.get(assignedCarId) : undefined;

    if (qr && assignedCarId !== undefined) {
      const queueAvailW = qr.end - qr.start;
      if (queueAvailW > s.figureStride) {
        const upColor = stop.waiting_up > 0 ? UP_COLOR : DOWN_COLOR;
        drawFigureRow(
          ctx,
          qr.end - 2,
          y,
          -1,
          queueAvailW,
          totalWaiting,
          upColor,
          s,
          stop.entity_id,
        );
      } else {
        drawUnassigned(ctx, waitingGutter, y, stop, s, gutterW);
      }
    } else {
      drawUnassigned(ctx, waitingGutter, y, stop, s, gutterW);
    }
  }
}

function drawUnassigned(
  ctx: CanvasRenderingContext2D,
  waitingGutter: { start: number; end: number },
  y: number,
  stop: Snapshot["stops"][number],
  s: Scale,
  gutterW: number,
): void {
  const total = stop.waiting_up + stop.waiting_down;
  const color = stop.waiting_up >= stop.waiting_down ? UP_COLOR : DOWN_COLOR;
  drawFigureRow(ctx, waitingGutter.end - 2, y, -1, gutterW, total, color, s, stop.entity_id);
}
