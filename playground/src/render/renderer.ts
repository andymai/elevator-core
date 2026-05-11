import type { AirportMeta, CarDto, CarBubble, Snapshot, StopDto, TetherMeta } from "../types";
import { drawAirportScene } from "./draw-airport";
import {
  drawFloors,
  drawShaftChannels,
  drawShaftLabels,
  drawWaitingFigures,
} from "./draw-building";
import { drawBubbles, drawCar, drawCarTrail, drawTargetMarkers } from "./draw-cars";
import { drawTetherScene, type TetherRenderState } from "./draw-tether";
import type { ClimberHud } from "./draw-tether-hud";
import type { RiderVariant } from "./figures/rider";
import { pickRiderVariant } from "./figures/rider";
import {
  type LoadingMask,
  type QueueRegion,
  type ShaftExtent,
  type ShaftLabel,
  loadingKey,
  loadingMaskFromSet,
} from "./frame-buffers";
import type { Scale } from "./layout";
import { findNearestStop, scaleFor } from "./layout";
import {
  type CarState,
  type StopState,
  type Tween,
  drawTweens,
  emitAbandonWalks,
  emitAlightWalks,
  emitBoardWalks,
} from "./tweens";
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

export class CanvasRenderer {
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;
  #dpr: number = window.devicePixelRatio || 1;
  readonly #onResize: () => void;
  #cachedScale: Scale | null = null;
  #cachedScaleWidth = -1;
  readonly #byLine: Map<number, CarDto[]> = new Map();

  readonly #accent: string;
  readonly #carStates: Map<number, CarState> = new Map();
  readonly #stopStates: Map<number, StopState> = new Map();
  readonly #tweens: Tween[] = [];
  /** Set when the active scenario is a space-elevator-style tether. */
  #tether: TetherMeta | null = null;
  /** Set when the active scenario is a dual-counter-rotating-loop airport. */
  #airport: AirportMeta | null = null;
  /** Per-car previous-frame velocity, used to classify trapezoidal phase. */
  readonly #prevVelocity: Map<number, number> = new Map();
  // Tether-mode scratch reused across frames so the per-frame draw
  // reaches steady state with zero Map / Array / ClimberHud allocations.
  readonly #tetherCarCenters: Map<number, number> = new Map();
  readonly #tetherStopIdxById: Map<number, number> = new Map();
  readonly #tetherHudBuf: ClimberHud[] = [];
  readonly #tetherIdSortBuf: number[] = [];
  readonly #tetherIdRankBuf: Map<number, number> = new Map();
  /** Active `max_speed` for HUD/ETA math; updated from the snapshot's max served range. */
  #activeMaxSpeed = 1;
  #activeAcceleration = 1;
  #activeDeceleration = 1;
  #firstDrawAt = 0;
  // Per-stop per-line assignment: `stopId -> (lineId -> carId)`. The
  // previous `stopId -> carId` map was last-writer-wins: any car
  // dispatched to a multi-line stop — even a specialty bank moving
  // for its own sliver of demand — claimed the entire waiting gutter.
  // Keying by line lets every bank record its car independently, and
  // the renderer pairs each line's slice of `waiting_by_line` (from
  // core) with that line's active car.
  readonly #stopAssignments: Map<number, Map<number, number>> = new Map();

  // ── Per-frame transient buffers (cleared, never re-allocated) ─────
  readonly #carById: Map<number, CarDto> = new Map();
  readonly #carX: Map<number, number> = new Map();
  readonly #carQueueRegion: Map<number, QueueRegion> = new Map();
  readonly #queueRegionPool: QueueRegion[] = [];
  readonly #stopIdxById: Map<number, number> = new Map();
  readonly #loadingAtFloor: Set<number> = new Set();
  readonly #loadingMask: LoadingMask = loadingMaskFromSet(this.#loadingAtFloor);
  readonly #shaftCenters: number[] = [];
  readonly #shaftExtents: ShaftExtent[] = [];
  readonly #shaftLabelList: ShaftLabel[] = [];
  readonly #shaftInnerPerCar: Map<number, number> = new Map();
  readonly #carWPerCar: Map<number, number> = new Map();
  readonly #carHPerCar: Map<number, number> = new Map();
  readonly #riderColorPerCar: Map<number, string> = new Map();
  readonly #sortedYs: number[] = [];
  readonly #lineIds: number[] = [];
  readonly #stopsSorted: StopDto[] = [];
  // Per-frame "boards landed at this stop" accumulator used by the
  // abandonment classifier downstream in `#computeTweens`. Reused
  // across frames so the tween hot path doesn't allocate a fresh
  // Map every draw call.
  readonly #boardsAtStop: Map<number, number> = new Map();

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

  /**
   * Set or clear tether-mode metadata. Pane wiring calls this with the
   * scenario's `tether` field on every (re)build so a scenario swap
   * cleanly transitions between tether and building rendering.
   */
  setTetherConfig(tether: TetherMeta | null): void {
    this.#tether = tether;
    this.#resetModeState();
  }

  /** Set or clear airport-mode metadata. */
  setAirportConfig(airport: AirportMeta | null): void {
    this.#airport = airport;
    this.#resetModeState();
  }

  // Clear per-car kinematic state on every scenario swap. Prevents a
  // fresh scenario from inheriting stale velocities; also drops
  // `#stopAssignments` whose tween-path pruning is skipped in
  // tether/airport mode, so leftover entries from a prior building
  // scenario don't persist.
  #resetModeState(): void {
    this.#prevVelocity.clear();
    this.#firstDrawAt = 0;
    this.#stopAssignments.clear();
  }

  /**
   * Report current physics knobs so the HUD's ETA / phase classifier
   * stay in sync with hot-swapped values from the tweak drawer.
   */
  setTetherPhysics(maxSpeed: number, acceleration: number, deceleration: number): void {
    if (Number.isFinite(maxSpeed) && maxSpeed > 0) this.#activeMaxSpeed = maxSpeed;
    if (Number.isFinite(acceleration) && acceleration > 0) this.#activeAcceleration = acceleration;
    if (Number.isFinite(deceleration) && deceleration > 0) this.#activeDeceleration = deceleration;
  }

  pushAssignment(stopId: number, elevatorId: number, lineId: number): void {
    let byLine = this.#stopAssignments.get(stopId);
    if (byLine === undefined) {
      byLine = new Map();
      this.#stopAssignments.set(stopId, byLine);
    }
    byLine.set(lineId, elevatorId);
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

  /** Return a queue-region slot from the pool, expanding lazily. */
  #takeQueueRegion(start: number, end: number): QueueRegion {
    const slot = this.#queueRegionPool.pop();
    if (slot !== undefined) {
      slot.start = start;
      slot.end = end;
      return slot;
    }
    return { start, end };
  }

  /** Recycle queue-region slots from the previous frame back into the pool. */
  #recycleQueueRegions(): void {
    for (const region of this.#carQueueRegion.values()) {
      this.#queueRegionPool.push(region);
    }
    this.#carQueueRegion.clear();
  }

  draw(
    snap: Snapshot,
    speedMultiplier: number,
    bubbles?: Map<number, CarBubble>,
    phaseRatio = 0,
  ): void {
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

    if (this.#airport !== null) {
      drawAirportScene(ctx, snap, w, h, this.#airport, phaseRatio, bubbles, this.#accent);
      return;
    }

    if (this.#tether !== null) {
      this.#drawTetherMode(snap, w, h, s, speedMultiplier, bubbles, this.#tether);
      return;
    }

    // Building mode keeps the legacy 2-stop tether heuristic — used by
    // any scenario that didn't opt into explicit tether config but
    // happens to have a long single-shaft layout.
    const isTether = snap.stops.length === 2;

    // Index cars by id once so every later lookup is O(1).
    const carById = this.#carById;
    carById.clear();
    for (const car of snap.cars) carById.set(car.id, car);

    // Sort stops once and reuse the sorted view for axis math, draw helpers,
    // and minimum-story-height detection. Cheaper than `[...stops].sort()` per
    // helper and keeps scratch allocations off the per-frame path.
    const stopsSorted = this.#stopsSorted;
    stopsSorted.length = snap.stops.length;
    for (let i = 0; i < snap.stops.length; i++) stopsSorted[i] = snap.stops[i] as StopDto;
    stopsSorted.sort((a, b) => a.y - b.y);

    const sortedYs = this.#sortedYs;
    sortedYs.length = stopsSorted.length;
    for (let i = 0; i < stopsSorted.length; i++) {
      const st = stopsSorted[i];
      sortedYs[i] = st === undefined ? 0 : st.y;
    }

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
      let refGap = Infinity;
      for (let i = 1; i < sortedYs.length; i++) {
        const cur = sortedYs[i];
        const prev = sortedYs[i - 1];
        if (cur === undefined || prev === undefined) continue;
        const g = cur - prev;
        if (g > 0 && g < refGap) refGap = g;
      }
      if (!Number.isFinite(refGap)) refGap = 1;
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
    const lineIds = this.#lineIds;
    lineIds.length = 0;
    for (const id of byLine.keys()) lineIds.push(id);
    lineIds.sort((a, b) => a - b);
    let totalShafts = 0;
    for (const id of lineIds) totalShafts += byLine.get(id)?.length ?? 0;

    // Layout — spread each car into its own column with a queue slot.
    const innerW = Math.max(0, w - 2 * s.padX - s.labelW);
    const minQueueW = s.figureStride * 2;
    const colGaps = s.shaftSpacing * Math.max(totalShafts - 1, 0);
    const budgetForCols = innerW - colGaps;
    const perColBudget = budgetForCols / Math.max(totalShafts, 1);
    const effectiveMaxShaftInnerW = isTether ? 34 : s.maxShaftInnerW;
    const rawShaftW = Math.max(
      s.minShaftInnerW,
      Math.min(effectiveMaxShaftInnerW, perColBudget * 0.55),
    );
    const shaftInnerW = rawShaftW;
    const queueW = Math.max(
      0,
      Math.min(perColBudget - shaftInnerW, minQueueW + s.figureStride * 4),
    );
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
    const columnsLeft = labelRight;
    const colW = shaftInnerW + queueW;

    // Resolve each shaft's center x and queue region.
    const shaftCenters = this.#shaftCenters;
    shaftCenters.length = 0;
    const carX = this.#carX;
    carX.clear();
    this.#recycleQueueRegions();
    const carQueueRegion = this.#carQueueRegion;
    let shaftIdx = 0;
    for (const lineId of lineIds) {
      const cars = byLine.get(lineId) ?? [];
      for (const car of cars) {
        const colLeft = columnsLeft + shaftIdx * (colW + s.shaftSpacing);
        const qStart = colLeft;
        const qEnd = colLeft + queueW;
        const cx = qEnd + shaftInnerW / 2;
        shaftCenters.push(cx);
        carX.set(car.id, cx);
        carQueueRegion.set(car.id, this.#takeQueueRegion(qStart, qEnd));
        shaftIdx++;
      }
    }

    const stopIdxById = this.#stopIdxById;
    stopIdxById.clear();
    for (let i = 0; i < snap.stops.length; i++) {
      const st = snap.stops[i];
      if (st !== undefined) stopIdxById.set(st.entity_id, i);
    }

    // Pre-compute which floors have a car mid-load at each shaft.
    const loadingAtFloor = this.#loadingAtFloor;
    loadingAtFloor.clear();
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
              loadingAtFloor.add(loadingKey(idx, nearest.stop.entity_id));
            }
          }
          idx++;
        }
      }
    }

    // Build per-shaft extents.
    const shaftInnerPerCar = this.#shaftInnerPerCar;
    const carWPerCar = this.#carWPerCar;
    const carHPerCar = this.#carHPerCar;
    const riderColorPerCar = this.#riderColorPerCar;
    shaftInnerPerCar.clear();
    carWPerCar.clear();
    carHPerCar.clear();
    riderColorPerCar.clear();
    const shaftExtents = this.#shaftExtents;
    shaftExtents.length = 0;
    const shaftLabelList = this.#shaftLabelList;
    shaftLabelList.length = 0;
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
    drawFloors(
      ctx,
      stopsSorted,
      toScreenY,
      s,
      shaftCenters,
      w,
      this.#loadingMask,
      stopsTop,
      isTether,
    );
    drawWaitingFigures(ctx, snap, toScreenY, s, carQueueRegion, this.#stopAssignments);
    drawTargetMarkers(ctx, snap, carX, shaftInnerPerCar, toScreenY, s, stopIdxById);

    // Iterate snap.cars directly: order matches how carX was populated
    // and skips both the previous O(n²) `.find()` scan and the implicit
    // re-iteration of carX entries.
    for (const car of snap.cars) {
      const cx = carX.get(car.id);
      if (cx === undefined) continue;
      const thisCarW = carWPerCar.get(car.id) ?? s.carW;
      const thisCarH = carHPerCar.get(car.id) ?? s.carH;
      const thisRiderColor = riderColorPerCar.get(car.id) ?? CAR_DOT_COLOR;
      const state = this.#carStates.get(car.id);
      drawCarTrail(ctx, car, cx, thisCarW, thisCarH, toScreenY);
      drawCar(ctx, car, cx, thisCarW, thisCarH, thisRiderColor, toScreenY, s, state?.roster);
    }

    this.#computeTweens(snap, carX, carQueueRegion, toScreenY, s, speedMultiplier);
    drawTweens(ctx, this.#tweens, s);

    if (bubbles && bubbles.size > 0) {
      drawBubbles(ctx, this.#accent, carById, bubbles, carX, toScreenY, s, w);
    }
  }

  // The space-elevator scenario walks a single 35,786 km cable —
  // visual model fundamentally different from the multi-shaft
  // building: shared cable, stacked climbers, atmospheric backdrop.
  // The full pipeline lives in `drawTetherScene`; the renderer only
  // owns the per-frame state (velocity history, names, day-phase
  // baseline) the helper threads through.
  #drawTetherMode(
    snap: Snapshot,
    w: number,
    h: number,
    s: Scale,
    speedMultiplier: number,
    bubbles: Map<number, CarBubble> | undefined,
    tether: TetherMeta,
  ): void {
    void speedMultiplier;
    void bubbles;
    const state: TetherRenderState = {
      prevVelocity: this.#prevVelocity,
      maxSpeed: this.#activeMaxSpeed,
      acceleration: this.#activeAcceleration,
      deceleration: this.#activeDeceleration,
      firstDrawAt: this.#firstDrawAt,
      carCenters: this.#tetherCarCenters,
      stopIdxById: this.#tetherStopIdxById,
      hudBuf: this.#tetherHudBuf,
      idSortBuf: this.#tetherIdSortBuf,
      idRankBuf: this.#tetherIdRankBuf,
    };
    drawTetherScene(this.#ctx, snap, w, h, s, tether, state);
    this.#firstDrawAt = state.firstDrawAt;
  }

  // ── Rider walk animations ─────────────────────────────────────────

  #computeTweens(
    snap: Snapshot,
    carX: Map<number, number>,
    carQueueRegion: Map<number, QueueRegion>,
    toScreenY: (y: number) => number,
    s: Scale,
    speedMultiplier: number,
  ): void {
    const now = performance.now();
    const scale = Math.max(1, speedMultiplier);
    const duration = TWEEN_BASE_MS / scale;
    const stagger = 80 / scale;
    const halfPairW = Math.max(1.5, Math.min(2.5, s.figureStride * 0.45));

    const boardsAtStop = this.#boardsAtStop;
    boardsAtStop.clear();
    for (const car of snap.cars) {
      const prev = this.#carStates.get(car.id);
      const cx = carX.get(car.id);
      const nearest = findNearestStop(snap.stops, car.y);
      const loadStop =
        car.phase === "loading" && nearest !== undefined && nearest.dist < 0.5
          ? nearest.stop
          : undefined;

      const useUp = loadStop !== undefined && loadStop.waiting_up >= loadStop.waiting_down;
      const dirOffset = useUp ? 0 : 10_000;

      if (prev && cx !== undefined && loadStop !== undefined) {
        const delta = car.riders - prev.riders;
        if (delta > 0) {
          boardsAtStop.set(loadStop.entity_id, (boardsAtStop.get(loadStop.entity_id) ?? 0) + delta);
        }
        if (delta !== 0) {
          const stopY = toScreenY(loadStop.y);
          const carWHere = this.#carWPerCar.get(car.id) ?? s.carW;
          const enablePairs = carWHere >= s.figureStride * 3;
          const count = Math.min(Math.abs(delta), 6);
          if (delta > 0) {
            const qr = carQueueRegion.get(car.id);
            // qr.end - 2 matches the gutter row's leading-figure anchor.
            const originX = qr !== undefined ? qr.end - 2 : cx - 20;
            const color = useUp ? UP_COLOR : DOWN_COLOR;
            // Clear just this car's line entry; other lines at the same
            // stop (e.g. a VIP still en route for an exec-only rider)
            // keep their waiters visible at their own shafts.
            const byLine = this.#stopAssignments.get(loadStop.entity_id);
            if (byLine !== undefined) {
              byLine.delete(car.line);
              if (byLine.size === 0) this.#stopAssignments.delete(loadStop.entity_id);
            }
            emitBoardWalks(this.#tweens, {
              count,
              enablePairs,
              halfPairW,
              now,
              stagger,
              duration,
              originX,
              endX: cx,
              floorY: stopY,
              color,
              stopId: loadStop.entity_id,
              dirOffset,
            });
          } else {
            const carColor = this.#riderColorPerCar.get(car.id) ?? CAR_DOT_COLOR;
            // Exit right since boards enter from the left gutter.
            const exitEndX = cx + carWHere / 2 + 14;
            const variants = prev.roster.slice(Math.max(0, prev.roster.length - count));
            emitAlightWalks(this.#tweens, {
              count,
              enablePairs,
              halfPairW,
              now,
              stagger,
              duration,
              startX: cx,
              endX: exitEndX,
              floorY: stopY,
              color: carColor,
              variants,
              carId: car.id,
            });
          }
        }
      }

      // --- Roster + facing management ---
      let roster: RiderVariant[];
      if (!prev) {
        // First frame for this car — seed the roster from the car's own id.
        roster = [];
        for (let i = 0; i < car.riders; i++) {
          roster.push(pickRiderVariant(car.id, i));
        }
      } else {
        const delta = car.riders - prev.riders;
        if (delta === 0) {
          roster = prev.roster;
        } else {
          roster = prev.roster.slice();
          if (delta > 0 && loadStop !== undefined) {
            // Match the gutter's variant picks so boarding silhouettes
            // visually correspond to who was waiting.
            for (let k = 0; k < delta; k++) {
              roster.push(pickRiderVariant(loadStop.entity_id, k + dirOffset));
            }
          } else if (delta > 0) {
            for (let k = 0; k < delta; k++) {
              roster.push(pickRiderVariant(car.id, roster.length + k));
            }
          } else {
            // LIFO: alighters are popped from the end.
            roster.splice(roster.length + delta, -delta);
          }
        }
      }
      // Correct any length drift from accumulated rounding.
      while (roster.length > car.riders) roster.pop();
      while (roster.length < car.riders) roster.push(pickRiderVariant(car.id, roster.length));

      this.#carStates.set(car.id, { riders: car.riders, roster });
    }

    for (const stop of snap.stops) {
      const waiting = stop.waiting_up + stop.waiting_down;
      const prev = this.#stopStates.get(stop.entity_id);
      if (prev) {
        const dropped = prev.waiting - waiting;
        const boards = boardsAtStop.get(stop.entity_id) ?? 0;
        const abandons = Math.max(0, dropped - boards);
        if (abandons > 0) {
          emitAbandonWalks(this.#tweens, {
            count: Math.min(abandons, 4),
            now,
            stagger,
            duration: duration * 2.2,
            startX: s.padX + s.labelW + 20,
            endX: s.padX + s.labelW - 16,
            floorY: toScreenY(stop.y),
            color: OVERFLOW_COLOR,
            stopId: stop.entity_id,
          });
        }
      }
      this.#stopStates.set(stop.entity_id, { waiting });
    }

    // Reap completed tweens via in-place compaction.
    {
      let writeIdx = 0;
      for (let i = 0; i < this.#tweens.length; i++) {
        const t = this.#tweens[i];
        if (t === undefined) continue;
        if (now - t.bornAt <= t.duration) {
          this.#tweens[writeIdx++] = t;
        }
      }
      this.#tweens.length = writeIdx;
    }

    if (this.#carStates.size > snap.cars.length) {
      for (const id of this.#carStates.keys()) {
        if (!this.#carById.has(id)) this.#carStates.delete(id);
      }
    }
    if (this.#stopStates.size > snap.stops.length) {
      for (const id of this.#stopStates.keys()) {
        if (!this.#stopIdxById.has(id)) this.#stopStates.delete(id);
      }
    }
  }
}
