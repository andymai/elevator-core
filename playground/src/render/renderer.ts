import type { Car, CarBubble, Snapshot } from "../types";
import { arcPoint, easeOutNorm, hexWithAlpha } from "./color-utils";
import {
  drawFloors,
  drawGutterHeaders,
  drawShaftChannels,
  drawShaftLabels,
  drawWaitingFigures,
} from "./draw-building";
import { drawBubbles, drawCar, drawCarTrail, drawTargetMarkers } from "./draw-cars";
import type { Scale } from "./layout";
import { findNearestStop, scaleFor } from "./layout";
import {
  CAR_DOT_COLOR,
  DOWN_COLOR,
  OVERFLOW_COLOR,
  SERVICE_RIDER_COLOR,
  SHAFT_FILL_BY_INDEX,
  SHAFT_FILL_FALLBACK,
  SHAFT_FRAME_BY_INDEX,
  SHAFT_FRAME_FALLBACK,
  SHAFT_LABEL_BY_INDEX,
  SHAFT_LABEL_FALLBACK,
  SHAFT_NAME_BY_INDEX,
  SHAFT_WIDTH_MUL_BY_INDEX,
  TWEEN_BASE_MS,
  UP_COLOR,
  VIP_RIDER_COLOR,
} from "./palette";

/** One-shot animation tween — board into a car, alight out, or abandon the queue. */
interface Tween {
  kind: "board" | "alight" | "abandon";
  bornAt: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

/** Per-car frame-to-frame memory used to detect board/alight transitions. */
interface CarState {
  riders: number;
}

/** Per-stop frame-to-frame memory used to detect abandonment. */
interface StopState {
  waiting: number;
}

export class CanvasRenderer {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;
  #dpr: number = window.devicePixelRatio || 1;
  readonly #onResize: () => void;
  #cachedScale: Scale | null = null;
  #cachedScaleWidth = -1;
  readonly #byLine: Map<number, Car[]> = new Map();

  readonly #accent: string;
  readonly #carStates: Map<number, CarState> = new Map();
  readonly #stopStates: Map<number, StopState> = new Map();
  readonly #tweens: Tween[] = [];

  constructor(canvas: HTMLCanvasElement, accent: string) {
    this.#canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.#ctx = ctx;
    this.#accent = accent;
    this.#resize();
    this.#onResize = (): void => {
      this.#resize();
    };
    window.addEventListener("resize", this.#onResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.#onResize);
  }

  get canvas(): HTMLCanvasElement {
    return this.#canvas;
  }

  #resize(): void {
    this.#dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.#canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    const targetW = clientWidth * this.#dpr;
    const targetH = clientHeight * this.#dpr;
    if (this.#canvas.width !== targetW || this.#canvas.height !== targetH) {
      this.#canvas.width = targetW;
      this.#canvas.height = targetH;
    }
    this.#ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
  }

  draw(snap: Snapshot, speedMultiplier: number, bubbles?: Map<number, CarBubble>): void {
    this.#resize();
    const { clientWidth: w, clientHeight: h } = this.#canvas;
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, w, h);
    if (snap.stops.length === 0 || w === 0 || h === 0) return;

    if (w !== this.#cachedScaleWidth) {
      this.#cachedScale = scaleFor(w);
      this.#cachedScaleWidth = w;
    }
    const s = this.#cachedScale;
    if (s === null) return;

    const isTether = snap.stops.length === 2;

    // Vertical axis.
    const firstStop = snap.stops[0];
    if (firstStop === undefined) return;
    let minY = firstStop.y;
    let maxY = firstStop.y;
    for (let i = 1; i < snap.stops.length; i++) {
      const st = snap.stops[i];
      if (st === undefined) continue;
      const y = st.y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const sortedYs = snap.stops.map((st) => st.y).sort((a, b) => a - b);
    const topGap = sortedYs.length >= 3 ? (sortedYs.at(-1) ?? 0) - (sortedYs.at(-2) ?? 0) : 1;
    const bottomPadding = 1;
    const axisMin = minY - bottomPadding;
    const axisMax = maxY + topGap;
    const yRange = Math.max(axisMax - axisMin, 0.0001);

    const endpointPad = isTether ? 18 : 0;
    let stopsTop: number;
    let stopsBottom: number;
    if (isTether) {
      stopsTop = s.padTop + endpointPad;
      stopsBottom = h - s.padBottom - endpointPad;
    } else {
      const gaps: number[] = [];
      for (let i = 1; i < sortedYs.length; i++) {
        const cur = sortedYs[i];
        const prev = sortedYs[i - 1];
        if (cur === undefined || prev === undefined) continue;
        const g = cur - prev;
        if (g > 0) gaps.push(g);
      }
      const refGap = gaps.length > 0 ? Math.min(...gaps) : 1;
      const maxStoryPx = 48;
      const maxPxPerM = maxStoryPx / refGap;
      const availableShaftPx = Math.max(0, h - s.padTop - s.padBottom);
      const naturalPxPerM = availableShaftPx / yRange;
      const effectivePxPerM = Math.min(naturalPxPerM, maxPxPerM);
      const shaftPx = yRange * effectivePxPerM;
      stopsBottom = h - s.padBottom;
      stopsTop = stopsBottom - shaftPx;
    }
    const toScreenY = (y: number): number =>
      stopsBottom - ((y - axisMin) / yRange) * (stopsBottom - stopsTop);

    // Group cars by line.
    const byLine = this.#byLine;
    byLine.forEach((arr) => (arr.length = 0));
    for (const car of snap.cars) {
      const arr = byLine.get(car.line);
      if (arr) arr.push(car);
      else byLine.set(car.line, [car]);
    }
    const lineIds = [...byLine.keys()].sort((a, b) => a - b);
    const totalShafts = lineIds.reduce((n, id) => n + (byLine.get(id)?.length ?? 1), 0);

    // Layout.
    const innerW = Math.max(0, w - 2 * s.padX - s.labelW);
    const shaftBankBudget = innerW - 2 * s.figureGutterW - 2 * s.gutterGap;
    const perShaftRoom =
      (shaftBankBudget - s.shaftSpacing * Math.max(totalShafts - 1, 0)) / Math.max(totalShafts, 1);
    const effectiveMaxShaftInnerW = isTether ? 34 : s.maxShaftInnerW;
    const shaftInnerW = Math.max(s.minShaftInnerW, Math.min(effectiveMaxShaftInnerW, perShaftRoom));
    const shaftBankW = shaftInnerW * totalShafts + s.shaftSpacing * Math.max(totalShafts - 1, 0);
    const remainingForGutters = Math.max(0, innerW - shaftBankW - 2 * s.gutterGap);
    const gutterEach = Math.max(s.figureGutterW, remainingForGutters / 2);
    const carW = Math.max(14, shaftInnerW - 6);

    let minStoryPx = Infinity;
    if (snap.stops.length >= 2) {
      for (let i = 1; i < sortedYs.length; i++) {
        const yA = sortedYs[i - 1];
        const yB = sortedYs[i];
        if (yA === undefined || yB === undefined) continue;
        const dy = toScreenY(yA) - toScreenY(yB);
        if (dy > 0 && dy < minStoryPx) minStoryPx = dy;
      }
    }
    const topSlabRoom = toScreenY(maxY) - 2;
    const storyFillCarH = Number.isFinite(minStoryPx) ? minStoryPx : s.carH;
    const targetCarH = isTether ? s.carH : storyFillCarH;
    const carH = Math.max(14, Math.min(targetCarH, topSlabRoom));

    if (!isTether && Number.isFinite(minStoryPx)) {
      const target = Math.max(1.5, Math.min(minStoryPx * 0.067, 4));
      const derivedStride = s.figureStride * (target / s.figureHeadR);
      s.figureHeadR = target;
      s.figureStride = derivedStride;
    }
    s.shaftInnerW = shaftInnerW;
    s.carW = carW;
    s.carH = carH;

    const labelRight = s.padX + s.labelW;
    const leftGutter = { start: labelRight, end: labelRight + gutterEach };
    const shaftsLeft = leftGutter.end + s.gutterGap;
    const shaftsRight = shaftsLeft + shaftBankW;
    const rightGutter = { start: shaftsRight + s.gutterGap, end: w - s.padX };

    // Resolve each shaft's center x.
    const shaftCenters: number[] = [];
    const carX = new Map<number, number>();
    let shaftIdx = 0;
    for (const lineId of lineIds) {
      const cars = byLine.get(lineId) ?? [];
      for (const car of cars) {
        const cx = shaftsLeft + s.shaftInnerW / 2 + shaftIdx * (s.shaftInnerW + s.shaftSpacing);
        shaftCenters.push(cx);
        carX.set(car.id, cx);
        shaftIdx++;
      }
    }

    const stopIdxById = new Map<number, number>();
    snap.stops.forEach((st, i) => stopIdxById.set(st.entity_id, i));

    // Pre-compute which floors have a car mid-load at each shaft.
    const loadingAtFloor = new Set<string>();
    {
      let idx = 0;
      for (const lineId of lineIds) {
        const cars = byLine.get(lineId) ?? [];
        for (const car of cars) {
          if (
            car.phase === "loading" ||
            car.phase === "door-opening" ||
            car.phase === "door-closing"
          ) {
            const nearest = findNearestStop(snap.stops, car.y);
            if (nearest !== undefined && nearest.dist < 0.5) {
              loadingAtFloor.add(`${idx}:${nearest.stop.entity_id}`);
            }
          }
          idx++;
        }
      }
    }

    // Build per-shaft extents.
    const shaftInnerPerCar = new Map<number, number>();
    const carWPerCar = new Map<number, number>();
    const carHPerCar = new Map<number, number>();
    const riderColorPerCar = new Map<number, string>();
    const shaftExtents: Array<{
      cx: number;
      top: number;
      bottom: number;
      fill: string;
      frame: string;
      width: number;
    }> = [];
    const shaftLabelList: Array<{ cx: number; top: number; text: string; color: string }> = [];
    let shaftExtIdx = 0;
    for (let lineIdx = 0; lineIdx < lineIds.length; lineIdx++) {
      const lineId = lineIds[lineIdx];
      if (lineId === undefined) continue;
      const cars = byLine.get(lineId) ?? [];
      const fill = SHAFT_FILL_BY_INDEX[lineIdx] ?? SHAFT_FILL_FALLBACK;
      const frame = SHAFT_FRAME_BY_INDEX[lineIdx] ?? SHAFT_FRAME_FALLBACK;
      const widthMul = SHAFT_WIDTH_MUL_BY_INDEX[lineIdx] ?? 1;
      const labelColor = SHAFT_LABEL_BY_INDEX[lineIdx] ?? SHAFT_LABEL_FALLBACK;
      const thisShaftInner = Math.max(14, shaftInnerW * widthMul);
      const thisCarW = Math.max(10, carW * widthMul);
      const thisCarH = Math.max(10, s.carH);
      const riderColor =
        lineIdx === 2 ? VIP_RIDER_COLOR : lineIdx === 3 ? SERVICE_RIDER_COLOR : CAR_DOT_COLOR;
      let firstCx = Infinity;
      let lastCx = -Infinity;
      let groupTop = Infinity;
      for (const car of cars) {
        shaftInnerPerCar.set(car.id, thisShaftInner);
        carWPerCar.set(car.id, thisCarW);
        carHPerCar.set(car.id, thisCarH);
        riderColorPerCar.set(car.id, riderColor);
        const cx = shaftCenters[shaftExtIdx];
        if (cx === undefined) continue;
        const hasRange = Number.isFinite(car.min_served_y) && Number.isFinite(car.max_served_y);
        const top = hasRange
          ? Math.max(stopsTop, toScreenY(car.max_served_y) - s.carH - 2)
          : stopsTop;
        const bottom = hasRange
          ? Math.min(stopsBottom, toScreenY(car.min_served_y) + 2)
          : stopsBottom;
        shaftExtents.push({ cx, top, bottom, fill, frame, width: thisShaftInner });
        if (cx < firstCx) firstCx = cx;
        if (cx > lastCx) lastCx = cx;
        if (top < groupTop) groupTop = top;
        shaftExtIdx++;
      }
      if (lineIds.length > 1 && Number.isFinite(firstCx) && Number.isFinite(groupTop)) {
        shaftLabelList.push({
          cx: (firstCx + lastCx) / 2,
          top: groupTop,
          text: SHAFT_NAME_BY_INDEX[lineIdx] ?? `Line ${lineIdx + 1}`,
          color: labelColor,
        });
      }
    }

    drawShaftChannels(ctx, shaftExtents);
    drawShaftLabels(ctx, shaftLabelList, s);
    drawFloors(ctx, snap, toScreenY, s, shaftCenters, w, loadingAtFloor, stopsTop, isTether);
    drawGutterHeaders(ctx, s, leftGutter, rightGutter);
    drawWaitingFigures(ctx, snap, toScreenY, s, leftGutter, rightGutter);
    drawTargetMarkers(ctx, snap, carX, shaftInnerPerCar, toScreenY, s, stopIdxById);

    for (const [carId, cx] of carX) {
      const car = snap.cars.find((c) => c.id === carId);
      if (!car) continue;
      const thisCarW = carWPerCar.get(carId) ?? s.carW;
      const thisCarH = carHPerCar.get(carId) ?? s.carH;
      const thisRiderColor = riderColorPerCar.get(carId) ?? CAR_DOT_COLOR;
      drawCarTrail(ctx, car, cx, thisCarW, thisCarH, toScreenY);
      drawCar(ctx, car, cx, thisCarW, thisCarH, thisRiderColor, toScreenY, s);
    }

    this.#computeTweens(snap, carX, shaftInnerPerCar, toScreenY, s, speedMultiplier);
    this.#drawTweens(s);

    if (bubbles && bubbles.size > 0) {
      drawBubbles(ctx, this.#accent, snap, carX, toScreenY, s, bubbles, w);
    }
  }

  // ── Flying-dot animations ─────────────────────────────────────────

  #computeTweens(
    snap: Snapshot,
    carX: Map<number, number>,
    shaftInnerPerCar: Map<number, number>,
    toScreenY: (y: number) => number,
    s: Scale,
    speedMultiplier: number,
  ): void {
    const now = performance.now();
    const scale = Math.max(1, speedMultiplier);
    const duration = TWEEN_BASE_MS / scale;
    const stagger = 30 / scale;

    const boardsAtStop = new Map<number, number>();
    const carTweens: Array<() => void> = [];
    for (const car of snap.cars) {
      const prev = this.#carStates.get(car.id);
      const riders = car.riders;
      const cx = carX.get(car.id);

      const nearest = findNearestStop(snap.stops, car.y);
      const loadStop =
        car.phase === "loading" && nearest !== undefined && nearest.dist < 0.5
          ? nearest.stop
          : undefined;

      if (prev && cx !== undefined && loadStop !== undefined) {
        const delta = riders - prev.riders;
        if (delta > 0) {
          boardsAtStop.set(loadStop.entity_id, (boardsAtStop.get(loadStop.entity_id) ?? 0) + delta);
        }
        if (delta !== 0) {
          const stopY = toScreenY(loadStop.y);
          const cabinCenterY = toScreenY(car.y) - s.carH / 2;
          const count = Math.min(Math.abs(delta), 6);
          if (delta > 0) {
            const useUp = loadStop.waiting_up >= loadStop.waiting_down;
            const shaftHalfForCar = (shaftInnerPerCar.get(car.id) ?? s.shaftInnerW) / 2;
            const gutterOffset = shaftHalfForCar + 6;
            const originX = useUp ? cx - gutterOffset : cx + gutterOffset;
            const color = useUp ? UP_COLOR : DOWN_COLOR;
            for (let k = 0; k < count; k++) {
              carTweens.push(() =>
                this.#tweens.push({
                  kind: "board",
                  bornAt: now + k * stagger,
                  duration,
                  startX: originX,
                  startY: stopY,
                  endX: cx,
                  endY: cabinCenterY,
                  color,
                }),
              );
            }
          } else {
            for (let k = 0; k < count; k++) {
              carTweens.push(() =>
                this.#tweens.push({
                  kind: "alight",
                  bornAt: now + k * stagger,
                  duration,
                  startX: cx,
                  startY: cabinCenterY,
                  endX: cx + 18,
                  endY: cabinCenterY + 10,
                  color: CAR_DOT_COLOR,
                }),
              );
            }
          }
        }
      }

      this.#carStates.set(car.id, { riders });
    }

    for (const stop of snap.stops) {
      const waiting = stop.waiting_up + stop.waiting_down;
      const prev = this.#stopStates.get(stop.entity_id);
      if (prev) {
        const dropped = prev.waiting - waiting;
        const boards = boardsAtStop.get(stop.entity_id) ?? 0;
        const abandons = Math.max(0, dropped - boards);
        if (abandons > 0) {
          const stopY = toScreenY(stop.y);
          const startX = s.padX + s.labelW + s.figureGutterW / 2;
          const count = Math.min(abandons, 4);
          for (let k = 0; k < count; k++) {
            this.#tweens.push({
              kind: "abandon",
              bornAt: now + k * stagger,
              duration: duration * 1.5,
              startX,
              startY: stopY,
              endX: startX - 26,
              endY: stopY - 6,
              color: OVERFLOW_COLOR,
            });
          }
        }
      }
      this.#stopStates.set(stop.entity_id, { waiting });
    }

    for (const enqueue of carTweens) {
      enqueue();
    }

    // Reap completed tweens.
    for (let i = this.#tweens.length - 1; i >= 0; i--) {
      const t = this.#tweens[i];
      if (t === undefined) continue;
      if (now - t.bornAt > t.duration) this.#tweens.splice(i, 1);
    }

    // Drop state for cars no longer in the snapshot.
    if (this.#carStates.size > snap.cars.length) {
      const liveIds = new Set(snap.cars.map((c) => c.id));
      for (const id of this.#carStates.keys()) {
        if (!liveIds.has(id)) this.#carStates.delete(id);
      }
    }
    if (this.#stopStates.size > snap.stops.length) {
      const liveIds = new Set(snap.stops.map((st) => st.entity_id));
      for (const id of this.#stopStates.keys()) {
        if (!liveIds.has(id)) this.#stopStates.delete(id);
      }
    }
  }

  #drawTweens(s: Scale): void {
    const now = performance.now();
    const ctx = this.#ctx;
    for (const t of this.#tweens) {
      const age = now - t.bornAt;
      if (age < 0) continue;
      const tx = Math.min(1, Math.max(0, age / t.duration));
      const eased = easeOutNorm(tx);
      const [x, y] =
        t.kind === "board"
          ? arcPoint(t.startX, t.startY, t.endX, t.endY, eased)
          : [t.startX + (t.endX - t.startX) * eased, t.startY + (t.endY - t.startY) * eased];
      const alpha =
        t.kind === "board" ? 0.9 : t.kind === "abandon" ? (1 - eased) ** 1.5 : 1 - eased;
      const radius = t.kind === "abandon" ? s.carDotR * 0.85 : s.carDotR;
      ctx.fillStyle = hexWithAlpha(t.color, alpha);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
