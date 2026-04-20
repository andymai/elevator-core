import type { Car, CarBubble, Snapshot } from "./types";

// 2-D renderer — SimTower-inspired building cross-section. Each floor is
// a thin horizontal slab spanning the pane, cut by a door opening where
// each shaft intersects. Shafts are vertical channels drawn as framed
// columns; every car has its own shaft drawn side by side. Waiting
// riders stand on the floor as tiny stick figures in the left gutter
// (up-bound) and right gutter (down-bound). Cars carry a target marker
// on their destination floor and a brief motion trail while moving.
// Board/alight flying-dot animations tween between the figure gutter
// and the car at loading time.

interface Scale {
  padX: number;
  padTop: number;
  padBottom: number;
  labelW: number;
  /** Preferred gutter width per side for stick figures. Actual gutter
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
  /** Stick figure head radius. */
  figureHeadR: number;
  /** Horizontal stride between adjacent stick figures in a gutter. */
  figureStride: number;
}

// Smoothly interpolate render constants across canvas widths so the diagram
// stays legible from ~320px phones to wide desktops without abrupt breakpoints.
function scaleFor(width: number): Scale {
  const t = Math.max(0, Math.min(1, (width - 320) / (900 - 320)));
  const lerp = (a: number, b: number): number => a + (b - a) * t;
  return {
    padX: lerp(6, 14),
    // Extra top padding reserves room for the "▲ UP" / "DOWN ▼"
    // direction headers above the first floor slab.
    padTop: lerp(22, 30),
    // Just enough bottom breathing room below the lowest floor slab.
    padBottom: lerp(10, 14),
    // Sized for the widest scenario labels ("Orbital Platform" at 16
    // chars, space-elevator) on desktop, down to "Lobby" / "Floor N"
    // on the narrowest phones. `truncate()` still clips anything that
    // spills over on ultra-long custom stop names.
    labelW: lerp(52, 120),
    // Preferred gutter for stick figures. The gutter grows further
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
    // figure height ≈ headR × 8.2 (see `drawStickFigure`): small head
    // over a tapered body, matching the classic tiny-sim silhouette.
    figureHeadR: lerp(2, 2.8),
    figureStride: lerp(5.6, 8),
  };
}

// Palette mirrors style.css primitives. Canvas rendering can't read CSS
// custom properties cheaply in a hot loop, so these are JS constants that
// track the CSS tokens. Keep in sync with `:root` in src/style.css.
//
const PHASE_COLORS: Record<Car["phase"], string> = {
  idle: "#6b6b75", // --text-disabled
  moving: "#f59e0b", // --accent
  repositioning: "#a78bfa", // violet — no CSS token; phase-specific hue
  "door-opening": "#fbbf24", // --accent-up
  loading: "#7dd3fc", // --pane-a
  "door-closing": "#fbbf24", // --accent-up
  stopped: "#8b8c92", // --text-tertiary
  unknown: "#6b6b75", // --text-disabled
};

const FLOOR_LINE = "#2a2a35"; // --border-subtle — floor-slab stroke
const STOP_LABEL = "#a1a1aa"; // --text-secondary
// Shaft channel fill + rail colours. Indexed by the line's position in
// the scenario's sorted line list so banks get distinct colour
// identities: the main banks share a quiet neutral grey, while
// specialty banks (Executive and Service, positions 2 and 3 in the
// skyscraper scenario) pick up brand-accent and water-utility hues
// so a viewer reads at a glance "this shaft is different."
//
// Index 0 and 1 fall back to the same quiet grey pair — most
// scenarios only have one or two banks and the extra colours only
// kick in when the scenario author added specialty lines.
const SHAFT_FILL_BY_INDEX: readonly string[] = [
  "rgba(8, 10, 14, 0.55)", // main bank (grey, same as before)
  "rgba(8, 10, 14, 0.55)", // second main bank (same)
  "rgba(58, 34, 4, 0.55)", // executive — warm amber tint
  "rgba(6, 30, 42, 0.55)", // service — cool cyan tint
];
const SHAFT_FRAME_BY_INDEX: readonly string[] = [
  "#3a3a45", // --border-default
  "#3a3a45",
  "#8a5a1a", // exec — warm amber rail
  "#2d5f70", // service — cool cyan rail
];
const SHAFT_FILL_FALLBACK = "rgba(8, 10, 14, 0.55)";
const SHAFT_FRAME_FALLBACK = "#3a3a45";
// Per-line width multiplier. Specialty banks (VIP, service) are
// small single-cab elevators holding <5 passengers — visually about
// half the main-bank width so the silhouette row only fits 2–3
// figures before overflowing to "+N". Cars, car trails, and target
// rings all scale down proportionally for lines with a <1 multiplier.
const SHAFT_WIDTH_MUL_BY_INDEX: readonly number[] = [1, 1, 0.5, 0.42];
// Per-line short-name labels for the shaft top strip. Position-
// based — so scenarios that set up their lines in the standard
// order (main banks first, exec, service) get correct labels
// without extra metadata. A scenario with different line semantics
// could eventually supply its own labels through metadata.
const SHAFT_NAME_BY_INDEX: readonly string[] = ["LOW", "HIGH", "VIP", "SERVICE"];
// Rider accent color used inside the VIP cabin. Warm gold to match
// the VIP shaft's amber identity, and distinct from the cyan/rose
// up/down pairing used for general passengers.
const VIP_RIDER_COLOR = "#e6c56b";
// Rider accent color used inside the Service cabin. Slightly warmer
// teal than the service shaft label — reads as "utility / ops staff"
// and stays out of the up/down cyan-rose pairing.
const SERVICE_RIDER_COLOR = "#9bd4c4";
// Label colour tracks the shaft fill's accent tint so the name
// picks up the same "this is specialty" cue as the shaft itself.
const SHAFT_LABEL_BY_INDEX: readonly string[] = [
  "#a1a1aa", // main — secondary text grey
  "#a1a1aa",
  "#d8a24a", // exec — warm amber
  "#7cbdd8", // service — cool cyan
];
const SHAFT_LABEL_FALLBACK = "#a1a1aa";
// Door marks — muted at rest, brighter when a car is actively loading
// at that floor. The active state reuses the amber brand accent.
const DOOR_INACTIVE = "#4a4a55"; // --border-strong
const DOOR_ACTIVE = "#f59e0b"; // --accent
// Up and down use distinct hue families so direction is legible at small
// figure sizes. Cool blue reads as "up" (sky / lift), rose as "down" (gravity).
const UP_COLOR = "#7dd3fc"; // --pane-a
const DOWN_COLOR = "#fda4af"; // --pane-b
const CAR_DOT_COLOR = "#fafafa"; // --text-primary
const OVERFLOW_COLOR = "#8b8c92"; // --text-tertiary
// Target marker — white, not amber. Amber reads as "doors / loading"
// elsewhere in the diagram (door marks, load-overlay accents), so
// using it for the target dot added false semantic overlap.
const TARGET_FILL = "rgba(250, 250, 250, 0.95)"; // --text-primary at α

// Board/alight animation baseline. Effective duration is divided by the sim
// speed multiplier so fast-forwarded runs don't queue stale tweens.
const TWEEN_BASE_MS = 260;

// Cars in `moving` phase leave a short fading ghost strip behind them so
// velocity is visible at a glance without a text indicator.
const TRAIL_STEPS = 3;
const TRAIL_DT = 0.05; // seconds of motion per ghost step

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

/** Per-stop frame-to-frame memory used to detect abandonment — a drop in
 *  the stop's waiting count *not* explained by a board at that stop. */
interface StopState {
  waiting: number;
}

/**
 * Find the stop nearest to world-y `y`. Returns the stop and the
 * distance, or `undefined` when the stops array is empty.
 */
function findNearestStop(
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

/**
 * Compute a curved-arc position along a tween at progress `t` (0..1).
 * The control point is offset perpendicular to the (start→end) segment so
 * dots arc above or below the straight path — "above" for left-to-right
 * motion, which reads as a small airlock lift.
 */
function arcPoint(
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

/** Cubic-bezier(0.2, 0.6, 0.2, 1) evaluated at x → y, good-enough via Newton. */
function easeOutNorm(tx: number): number {
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

  #resize(): void {
    // Re-read DPR each resize so browser zoom / moving to a different-density
    // display updates the backing-store scale. `resize` fires on both.
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
    this.#ctx.clearRect(0, 0, w, h);
    if (snap.stops.length === 0 || w === 0 || h === 0) return;

    if (w !== this.#cachedScaleWidth) {
      this.#cachedScale = scaleFor(w);
      this.#cachedScaleWidth = w;
    }
    const s = this.#cachedScale;
    if (s === null) return;

    // Tether scenarios (2 stops, e.g. the space elevator) want point-
    // labeled platforms at each end of a long cable, not the
    // building-cross-section framing that assumes a "story above each
    // slab." Detect up front so axis, shaft width, slab style, and
    // label placement can all specialise.
    const isTether = snap.stops.length === 2;

    // Vertical axis. For buildings the top margin matches the gap
    // between the top two floors so the penthouse story has the same
    // visual height as every other story. For tethers the top and
    // bottom padding grow in pixel-space (via `endpointPad`) so the
    // platform labels sit next to their slabs with air above and
    // below, while the axis margin itself stays minimal so the cable
    // fills as much of the pane as possible.
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
    // Vertical sizing. For buildings we pin a *maximum* pixels-per-
    // meter so stories stay a consistent visual height regardless of
    // browser height — tall canvases gain empty sky above the
    // penthouse rather than stretching floors. Short canvases fall
    // back to filling the available height. Tethers keep filling the
    // canvas because their "story" is the whole cable.
    const endpointPad = isTether ? 18 : 0;
    let stopsTop: number;
    let stopsBottom: number;
    if (isTether) {
      stopsTop = s.padTop + endpointPad;
      stopsBottom = h - s.padBottom - endpointPad;
    } else {
      // Reference inter-floor spacing = smallest gap in the scenario
      // (matches `minStoryPx` further down). A 4 m gap reading as a
      // 48 px story is the target — roomy enough for a cabin to
      // clearly fill one story without visually dominating adjacent
      // floors on tall browsers.
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
      // Bottom-anchor so the lobby stays near the canvas floor; any
      // surplus room piles up above the top floor as headroom/sky.
      stopsBottom = h - s.padBottom;
      stopsTop = stopsBottom - shaftPx;
    }
    const toScreenY = (y: number): number =>
      stopsBottom - ((y - axisMin) / yRange) * (stopsBottom - stopsTop);

    // Group cars by line (shared shaft rows). Within a line, multiple cars
    // each get their own adjacent shaft — just like a bank of elevators.
    const byLine = this.#byLine;
    byLine.forEach((arr) => (arr.length = 0));
    for (const car of snap.cars) {
      const arr = byLine.get(car.line);
      if (arr) arr.push(car);
      else byLine.set(car.line, [car]);
    }
    const lineIds = [...byLine.keys()].sort((a, b) => a - b);
    const totalShafts = lineIds.reduce((n, id) => n + (byLine.get(id)?.length ?? 1), 0);

    // Layout: [padX | label | leftGutter | shaft-bank | rightGutter | padX].
    // Shafts claim as much horizontal room as they can — preferred
    // gutters are a floor, not a budget. When shafts hit their
    // `maxShaftInnerW` cap (single-shaft scenarios on wide canvases),
    // surplus spills back into the gutters so the bank stays centered.
    const innerW = Math.max(0, w - 2 * s.padX - s.labelW);
    const shaftBankBudget = innerW - 2 * s.figureGutterW - 2 * s.gutterGap;
    const perShaftRoom =
      (shaftBankBudget - s.shaftSpacing * Math.max(totalShafts - 1, 0)) / Math.max(totalShafts, 1);
    // Tethers cap shaft width much tighter than a building shaft so
    // the cable reads as a narrow structural line spanning a huge
    // distance, not a squat column. Everything else (car width,
    // frame) scales off the capped shaft width automatically.
    const effectiveMaxShaftInnerW = isTether ? 34 : s.maxShaftInnerW;
    const shaftInnerW = Math.max(s.minShaftInnerW, Math.min(effectiveMaxShaftInnerW, perShaftRoom));
    const shaftBankW = shaftInnerW * totalShafts + s.shaftSpacing * Math.max(totalShafts - 1, 0);
    // Gutters split the remaining width equally. `figureGutterW` is
    // the floor; any surplus expands both gutters in lockstep.
    const remainingForGutters = Math.max(0, innerW - shaftBankW - 2 * s.gutterGap);
    const gutterEach = Math.max(s.figureGutterW, remainingForGutters / 2);
    // Car fills its shaft with ~3 px air on each side so the gradient
    // still reads as a car inside a channel, not flush with the rails.
    const carW = Math.max(14, shaftInnerW - 6);
    // Cabin height — SimTower-style, the cabin exactly fills the
    // story when at rest so the floor-to-ceiling shape reads as a
    // real elevator cabin. For buildings we take the smallest
    // inter-floor distance (so no story gets a too-big cabin); for
    // tethers we fall back to the scale hint since "story height"
    // doesn't apply the same way.
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
    // Top-slab room — final safety clamp so the topmost cabin can't
    // clip the canvas top when it lands at the highest floor.
    const topSlabRoom = toScreenY(maxY) - 2;
    const storyFillCarH = Number.isFinite(minStoryPx) ? minStoryPx : s.carH;
    const targetCarH = isTether ? s.carH : storyFillCarH;
    const carH = Math.max(14, Math.min(targetCarH, topSlabRoom));
    // Figure height tracks story height (not canvas width). Without
    // this the waiting-rider silhouettes stay ~20 px no matter how
    // tall the browser is, so on a 1200 px browser with 65 px
    // stories the figures look lost in empty vertical space, and on
    // a 500 px browser with 20 px stories they overflow into the
    // floor above. Target ~70 % of the smallest story, floored so
    // they stay recognisable and capped so they don't balloon on
    // very spread-out scenarios. The `0.067` coefficient budgets
    // for the *tallest* rider variant (tall + hat ≈ headR × 10.5)
    // so even that extreme silhouette fits inside a story; smaller
    // variants just have more headroom. Tethers opt out — their
    // "story" is the whole cable, and we want platform-scale
    // figures there.
    if (!isTether && Number.isFinite(minStoryPx)) {
      const target = Math.max(1.5, Math.min(minStoryPx * 0.067, 4));
      // Derive the new stride *before* mutating `figureHeadR`, or
      // the ratio on subsequent frames would be computed against
      // the already-updated head radius and quietly drift if
      // `minStoryPx` ever changed between frames (a future hot-
      // swap of stops inside the same renderer lifetime).
      const derivedStride = s.figureStride * (target / s.figureHeadR);
      s.figureHeadR = target;
      s.figureStride = derivedStride;
    }
    // Overwrite the cached hints with per-frame geometry; downstream
    // draw passes read these. Safe because the scale cache is
    // per-renderer and a car-count change rebuilds the renderer.
    s.shaftInnerW = shaftInnerW;
    s.carW = carW;
    s.carH = carH;
    const labelRight = s.padX + s.labelW;
    const leftGutter = { start: labelRight, end: labelRight + gutterEach };
    const shaftsLeft = leftGutter.end + s.gutterGap;
    const shaftsRight = shaftsLeft + shaftBankW;
    const rightGutter = { start: shaftsRight + s.gutterGap, end: w - s.padX };

    // Resolve each shaft's center x once so every pass (frame/car/target/trail)
    // reads from the same column assignment.
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

    // Stop-entity → index lookup used by target-marker and animation code.
    const stopIdxById = new Map<number, number>();
    snap.stops.forEach((st, i) => stopIdxById.set(st.entity_id, i));

    // Pre-compute which floors have a car mid-load at each shaft, so
    // the corresponding door marks read as "open" instead of muted.
    // Keys use the stop's `entity_id` so sort order in `drawFloors`
    // doesn't break the lookup.
    const loadingAtFloor = new Set<string>(); // "shaftIdx:stopEntityId"
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

    // Build per-shaft extents so each elevator bank's channel spans
    // only the floors it actually reaches — express / exec / service
    // banks that skip most floors get visibly shorter shafts. Cars
    // whose `min_served_y` / `max_served_y` are NaN (stale wasm build
    // or a pre-range scenario) fall back to the full canvas height.
    //
    // Colour picks use the line's position in the sorted `lineIds`
    // list, not the entity id — that way colour assignment is stable
    // for a scenario regardless of which entity ids the sim happened
    // to allocate at construction time.
    // Per-car geometry + rider-color overrides, keyed by car id.
    // Specialty banks (VIP, Service) get narrower shafts, narrower
    // and shorter cabins (so they read as more square), and — for
    // VIP — a gold rider silhouette that visibly distinguishes
    // executive passengers from general traffic. Falls back to the
    // global `s.carW` / `s.carH` / `CAR_DOT_COLOR` for the main banks.
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
    // One label per line (not per car) — all cars on the same line
    // share a label drawn once, centered over the line's shaft group.
    const shaftLabels: Array<{ cx: number; top: number; text: string; color: string }> = [];
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
      // Per-line rider palette: VIP riders are gold, Service (ops /
      // maintenance) riders are teal, everything else uses off-white.
      // Passed to `drawRidersInCar` so the silhouette palette switches
      // per cabin. The corresponding waiting-rider palette still uses
      // UP/DOWN direction colours — service/VIP identity only shows
      // inside the cabin.
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
      // Shaft labels only make sense when the building has multiple
      // banks to distinguish. A single-line scenario (convention,
      // space elevator) has exactly one shaft group — slapping
      // "LOW" on it is misleading because the label's semantics
      // ("main passenger bank, low-zone") only hold against a
      // skyscraper-style multi-line layout.
      if (lineIds.length > 1 && Number.isFinite(firstCx) && Number.isFinite(groupTop)) {
        shaftLabels.push({
          cx: (firstCx + lastCx) / 2,
          top: groupTop,
          text: SHAFT_NAME_BY_INDEX[lineIdx] ?? `Line ${lineIdx + 1}`,
          color: labelColor,
        });
      }
    }

    this.#drawShaftChannels(shaftExtents);
    this.#drawShaftLabels(shaftLabels, s);
    this.#drawFloors(snap, toScreenY, s, shaftCenters, w, loadingAtFloor, stopsTop, isTether);
    this.#drawGutterHeaders(s, leftGutter, rightGutter);
    this.#drawWaitingFigures(snap, toScreenY, s, leftGutter, rightGutter);
    this.#drawTargetMarkers(snap, carX, shaftInnerPerCar, toScreenY, s, stopIdxById);

    for (const [carId, cx] of carX) {
      const car = snap.cars.find((c) => c.id === carId);
      if (!car) continue;
      const thisCarW = carWPerCar.get(carId) ?? s.carW;
      const thisCarH = carHPerCar.get(carId) ?? s.carH;
      const thisRiderColor = riderColorPerCar.get(carId) ?? CAR_DOT_COLOR;
      this.#drawCarTrail(car, cx, thisCarW, thisCarH, toScreenY);
      this.#drawCar(car, cx, thisCarW, thisCarH, thisRiderColor, toScreenY, s);
    }

    // Detect board/alight transitions and queue tweens before drawing them so
    // the first frame of motion is visible instead of a one-frame lag.
    this.#computeTweens(snap, carX, shaftInnerPerCar, toScreenY, s, speedMultiplier);
    this.#drawTweens(s);

    if (bubbles && bubbles.size > 0) {
      this.#drawBubbles(snap, carX, toScreenY, s, bubbles, w);
    }
  }

  /**
   * Draw a small rounded speech-bubble with a tail pointing down (or
   * up) to each car with a fresh action. Bubbles render on top of
   * cars and tweens so narration stays legible.
   *
   * Placement rules (tuned for the SimTower-style multi-shaft bank
   * where horizontal room between shafts is only a few pixels):
   * - Default position: *above* the car, tail pointing down. Avoids
   *   horizontal collisions with adjacent shafts entirely.
   * - Flip to *below* the car when the above-car position would clip
   *   the canvas top (cars near the penthouse).
   * - Horizontally centered on the car's shaft, then clamped to the
   *   canvas edges so the bubble never gets cut off.
   */
  #drawBubbles(
    snap: Snapshot,
    carX: Map<number, number>,
    toScreenY: (y: number) => number,
    s: Scale,
    bubbles: Map<number, CarBubble>,
    canvasWidth: number,
  ): void {
    const ctx = this.#ctx;
    const padX = 7;
    const padY = 4;
    const tailW = 5; // tail base width
    const tailH = 4; // tail depth (distance from bubble edge to tip)
    const radius = 6;
    const gap = 2; // gap between car edge and bubble edge
    const font = `600 ${s.fontSmall + 0.5}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.font = font;
    ctx.textBaseline = "middle";
    // Fade the last FADE_FRAC of the bubble's lifetime so dismissal
    // feels soft rather than binary. Kept at 30 % so the message still
    // reads crisply for most of its dwell.
    const FADE_FRAC = 0.3;
    const now = performance.now();
    const strokeBase = this.#accent;

    // Two-pass draw so we can resolve bubble overlaps before committing
    // ink. A narrow compare pane with adjacent shafts routinely has two
    // cars arrive in the same frame; default placement is "above the
    // cabin, centred on the shaft", which collides when the horizontal
    // spacing between adjacent shafts is tighter than a bubble width.
    interface Placement {
      bubble: CarBubble;
      alpha: number;
      cx: number;
      carTop: number;
      carBottom: number;
      bubbleW: number;
      bubbleH: number;
      side: "above" | "below";
      bx: number;
      by: number;
    }
    const placements: Placement[] = [];
    for (const car of snap.cars) {
      const bubble = bubbles.get(car.id);
      if (!bubble) continue;
      const cx = carX.get(car.id);
      if (cx === undefined) continue;
      const carBottom = toScreenY(car.y);
      const carTop = carBottom - s.carH;

      const ttl = Math.max(1, bubble.expiresAt - bubble.bornAt);
      const remaining = bubble.expiresAt - now;
      const alpha = remaining > ttl * FADE_FRAC ? 1 : Math.max(0, remaining / (ttl * FADE_FRAC));
      if (alpha <= 0) continue;

      const textW = ctx.measureText(bubble.text).width;
      const bubbleW = textW + padX * 2;
      const bubbleH = s.fontSmall + padY * 2 + 2;

      // Default vertical placement: above car when the canvas has room,
      // below otherwise. Horizontal: centred on the shaft, clamped to
      // the canvas edges.
      const aboveTop = carTop - gap - tailH - bubbleH;
      const belowOverflow = carBottom + gap + tailH + bubbleH > canvasWidth; // safety fallback
      const initialSide: "above" | "below" = aboveTop < 2 && !belowOverflow ? "below" : "above";
      const by = initialSide === "above" ? carTop - gap - tailH - bubbleH : carBottom + gap + tailH;
      let bx = cx - bubbleW / 2;
      const minX = 2;
      const maxX = canvasWidth - bubbleW - 2;
      if (bx < minX) bx = minX;
      if (bx > maxX) bx = maxX;
      placements.push({
        bubble,
        alpha,
        cx,
        carTop,
        carBottom,
        bubbleW,
        bubbleH,
        side: initialSide,
        bx,
        by,
      });
    }

    // Collision pass: if a bubble's rect intersects a previously placed
    // one, flip it to the other side of its cabin. We only try the
    // flip once — in the rare third-collision case we let the newer
    // bubble sit on top; it's still legible because it's drawn last.
    const rectsIntersect = (a: Placement, b: Placement): boolean =>
      !(
        a.bx + a.bubbleW <= b.bx ||
        b.bx + b.bubbleW <= a.bx ||
        a.by + a.bubbleH <= b.by ||
        b.by + b.bubbleH <= a.by
      );
    for (let i = 1; i < placements.length; i++) {
      const p = placements[i];
      if (p === undefined) continue;
      let collides = false;
      for (let j = 0; j < i; j++) {
        const pj = placements[j];
        if (pj === undefined) continue;
        if (rectsIntersect(p, pj)) {
          collides = true;
          break;
        }
      }
      if (!collides) continue;
      const flipSide: "above" | "below" = p.side === "above" ? "below" : "above";
      const flipBy =
        flipSide === "above" ? p.carTop - gap - tailH - p.bubbleH : p.carBottom + gap + tailH;
      // Only accept the flip if it actually clears; otherwise keep the
      // original placement so we don't make things worse.
      const flipped: Placement = { ...p, side: flipSide, by: flipBy };
      let flipClears = true;
      for (let j = 0; j < i; j++) {
        const pj = placements[j];
        if (pj === undefined) continue;
        if (rectsIntersect(flipped, pj)) {
          flipClears = false;
          break;
        }
      }
      if (flipClears) {
        placements[i] = flipped;
      }
    }

    for (const p of placements) {
      const { bubble, alpha, cx, carTop, carBottom, bubbleW, bubbleH, side, bx, by } = p;
      const tipY = side === "above" ? carTop - gap : carBottom + gap;
      const baseY = side === "above" ? by + bubbleH : by;
      const tailCenter = Math.min(
        Math.max(cx, bx + radius + tailW / 2),
        bx + bubbleW - radius - tailW / 2,
      );

      ctx.save();
      ctx.globalAlpha = alpha;

      // Soft pane-accent glow beneath the bubble, so the bubble reads
      // as belonging to its pane even at a glance.
      ctx.shadowColor = strokeBase;
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(16, 19, 26, 0.94)";
      roundedRect(ctx, bx, by, bubbleW, bubbleH, radius);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pane-accent border.
      ctx.strokeStyle = withAlpha(strokeBase, 0.65);
      ctx.lineWidth = 1;
      roundedRect(ctx, bx, by, bubbleW, bubbleH, radius);
      ctx.stroke();

      // Tail triangle. Points down when bubble is above, up when below.
      ctx.beginPath();
      ctx.moveTo(tailCenter - tailW / 2, baseY);
      ctx.lineTo(tailCenter + tailW / 2, baseY);
      ctx.lineTo(tailCenter, tipY);
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 19, 26, 0.94)";
      ctx.fill();
      ctx.stroke();

      // Text — centered horizontally in the bubble.
      ctx.fillStyle = "#f0f3fb";
      ctx.textAlign = "center";
      ctx.fillText(bubble.text, bx + bubbleW / 2, by + bubbleH / 2);

      ctx.restore();
    }
  }

  // ── Shaft channels, floors, waiting figures ───────────────────────

  /**
   * Paint each shaft column as a recessed channel with two vertical
   * rails. Drawn before floors so the horizontal slab's door-gaps
   * visibly "cut" through this channel rather than sitting on top.
   */
  /**
   * Short name strip above each shaft group (e.g., `LOW`, `HIGH`,
   * `EXEC`, `SVC`). Lets users tell the banks apart at a glance —
   * the shaft colour tells them "something's different," the label
   * tells them *which* bank it is. Positioned just above the shaft
   * top so it doesn't interfere with the topmost floor slab or the
   * direction-header gutter.
   */
  #drawShaftLabels(
    labels: Array<{ cx: number; top: number; text: string; color: string }>,
    s: Scale,
  ): void {
    if (labels.length === 0) return;
    const ctx = this.#ctx;
    ctx.font = `600 ${s.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    for (const l of labels) {
      // Place the text just above the shaft channel's top edge.
      // 3 px padding keeps it off the rail corner pixel.
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, l.cx, l.top - 3);
    }
  }

  #drawShaftChannels(
    extents: Array<{
      cx: number;
      top: number;
      bottom: number;
      fill: string;
      frame: string;
      width: number;
    }>,
  ): void {
    const ctx = this.#ctx;
    // Per-shaft fill — line index determines the palette slot AND
    // the shaft's inner width (specialty banks render narrower).
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

  /**
   * Draw each floor as a thin slab (the story divider) with door-gap
   * breaks where shafts intersect. Labels live *inside* the story —
   * between this slab and the next slab above — mirroring SimTower's
   * per-story naming. The topmost floor uses the canvas top as its
   * ceiling so its label still has a vertical band to sit in.
   *
   * Tether mode (2-stop scenarios like the space elevator) overrides
   * the slab into a short platform bar centered on each shaft and
   * pins labels to the slab itself — the "story between" framing
   * doesn't apply when the shaft is a cable, not a building.
   *
   * Door marks at each shaft intersection brighten when the matching
   * car is loading or cycling doors there (`loadingAtFloor` uses the
   * stop's `entity_id` so this lookup survives the world-y sort).
   */
  #drawFloors(
    snap: Snapshot,
    toScreenY: (y: number) => number,
    s: Scale,
    shaftCenters: number[],
    w: number,
    loadingAtFloor: Set<string>,
    stopsTop: number,
    isTether: boolean,
  ): void {
    const ctx = this.#ctx;
    ctx.font = `${s.fontMain.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    const labelX = s.padX;
    const slabLeft = s.padX + s.labelW;
    const slabRight = w - s.padX;
    const half = s.shaftInnerW / 2;
    // Tether-mode platform bar: a short, thicker horizontal line
    // straddling the shaft rather than the full-width building slab.
    const platformHalfW = Math.min(s.shaftInnerW * 1.8, (slabRight - slabLeft) / 2);

    // Sort stops by world y ascending so `sorted[i+1]` is always the
    // floor directly above `sorted[i]`. Without this, a RON with stops
    // declared out of world-y order would pair labels with the wrong
    // ceiling.
    const sorted = [...snap.stops].sort((a, b) => a.y - b.y);

    for (let i = 0; i < sorted.length; i++) {
      const stop = sorted[i];
      if (stop === undefined) continue;
      const slabY = toScreenY(stop.y);
      // Story ceiling: the slab directly above, or the canvas top for
      // the highest floor (which has no story above it).
      const nextStop = sorted[i + 1];
      const ceilingY = nextStop !== undefined ? toScreenY(nextStop.y) : stopsTop;

      // Slab rendering — full-width segmented line for buildings,
      // short platform bars for tether endpoints.
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

      // Door marks — tiny horizontal ticks on the outside of each shaft
      // rail at this floor. When a car is loading here, brighten the
      // marks on that specific shaft.
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

      // Label placement. Buildings: mid-story (between this slab and
      // the ceiling). Tethers: on the platform itself, since there's
      // no story-above framing — "Orbital Platform" labels a point,
      // not a band of vertical space.
      const labelY = isTether ? slabY : (slabY + ceilingY) / 2;
      ctx.fillStyle = STOP_LABEL;
      ctx.textAlign = "right";
      ctx.fillText(truncate(ctx, stop.name, s.labelW - 4), labelX + s.labelW - 4, labelY);
    }
  }

  /**
   * Label each gutter with its direction (`▲ UP` / `DOWN ▼`) in the
   * top padding region above the first floor. Reinforces the color
   * coding of the stick figures below — up-bound riders live on the
   * left in cool blue, down-bound on the right in rose.
   */
  #drawGutterHeaders(
    s: Scale,
    leftGutter: { start: number; end: number },
    rightGutter: { start: number; end: number },
  ): void {
    const ctx = this.#ctx;
    // Vertically center in the top padding strip. `padTop` sized to
    // leave clear room for this strip above the first floor slab.
    const y = s.padTop / 2 + 1;
    ctx.font = `600 ${s.fontSmall.toFixed(0)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textBaseline = "middle";

    // Left gutter — anchored toward the shaft (its right edge) so the
    // label reads as heading the column of figures below it.
    ctx.textAlign = "right";
    ctx.fillStyle = UP_COLOR;
    ctx.fillText("\u25b2 UP", leftGutter.end - 2, y);

    // Right gutter — anchored toward the shaft (its left edge).
    ctx.textAlign = "left";
    ctx.fillStyle = DOWN_COLOR;
    ctx.fillText("DOWN \u25bc", rightGutter.start + 2, y);
  }

  /**
   * Draw waiting riders as tiny stick figures standing on each floor.
   * Up-bound riders fill the left gutter (closest shaft rail first);
   * down-bound riders fill the right gutter. Figures overflow into a
   * "+N" text label when the row runs out of space.
   */
  #drawWaitingFigures(
    snap: Snapshot,
    toScreenY: (y: number) => number,
    s: Scale,
    leftGutter: { start: number; end: number },
    rightGutter: { start: number; end: number },
  ): void {
    const ctx = this.#ctx;
    for (const stop of snap.stops) {
      const y = toScreenY(stop.y);
      if (stop.waiting_up > 0) {
        drawFigureRow(
          ctx,
          leftGutter.end,
          y,
          -1,
          leftGutter.end - leftGutter.start,
          stop.waiting_up,
          UP_COLOR,
          s,
          stop.entity_id,
        );
      }
      if (stop.waiting_down > 0) {
        drawFigureRow(
          ctx,
          rightGutter.start,
          y,
          1,
          rightGutter.end - rightGutter.start,
          stop.waiting_down,
          DOWN_COLOR,
          s,
          stop.entity_id,
        );
      }
    }
  }

  #drawTargetMarkers(
    snap: Snapshot,
    carX: Map<number, number>,
    shaftInnerPerCar: Map<number, number>,
    toScreenY: (y: number) => number,
    s: Scale,
    stopIdxById: Map<number, number>,
  ): void {
    const ctx = this.#ctx;
    // Minimal marker: a thin amber line from the cabin to a solid
    // dot at the target landing position. Line shrinks as the cabin
    // approaches; on arrival the marker collapses and is hidden.
    void shaftInnerPerCar; // reserved for future per-car dot sizing
    const dotR = Math.max(2, s.figureHeadR * 0.9);
    for (const car of snap.cars) {
      if (car.target === null) continue;
      const idx = stopIdxById.get(car.target);
      if (idx === undefined) continue;
      const stop = snap.stops[idx];
      if (stop === undefined) continue;
      const cx = carX.get(car.id);
      if (cx === undefined) continue;
      // Target y = cabin's landing *center* (half a cab above the
      // destination slab). Connecting line starts at the cabin's
      // current center and ends at that landing point.
      const targetY = toScreenY(stop.y) - s.carH / 2;
      const cabinCenterY = toScreenY(car.y) - s.carH / 2;
      // Skip when the cabin is already at its target — zero-length
      // line + the dot would just sit behind the arrived cab.
      if (Math.abs(cabinCenterY - targetY) < 0.5) continue;
      // Thin connector line. Semi-transparent white reads as "going
      // here" without competing with the cabin or dot visually; also
      // keeps amber reserved for door/loading accents elsewhere in
      // the diagram.
      ctx.strokeStyle = "rgba(250, 250, 250, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cabinCenterY);
      ctx.lineTo(cx, targetY);
      ctx.stroke();
      // Target dot — solid amber, the "going here" marker.
      ctx.fillStyle = TARGET_FILL;
      ctx.beginPath();
      ctx.arc(cx, targetY, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #drawCarTrail(
    car: Car,
    cx: number,
    carW: number,
    carH: number,
    toScreenY: (y: number) => number,
  ): void {
    if (car.phase !== "moving" || Math.abs(car.v) < 0.1) return;
    const ctx = this.#ctx;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- wasm boundary: phase may hold a variant the TS union hasn't caught up with
    const base = PHASE_COLORS[car.phase] ?? "#6b6b75";
    const halfW = carW / 2;
    for (let i = 1; i <= TRAIL_STEPS; i++) {
      const behindBottom = toScreenY(car.y - car.v * TRAIL_DT * i);
      const alpha = 0.18 * (1 - (i - 1) / TRAIL_STEPS);
      ctx.fillStyle = hexWithAlpha(base, alpha);
      ctx.fillRect(cx - halfW, behindBottom - carH, carW, carH);
    }
  }

  #drawCar(
    car: Car,
    cx: number,
    carW: number,
    carH: number,
    riderColor: string,
    toScreenY: (y: number) => number,
    s: Scale,
  ): void {
    const ctx = this.#ctx;
    const bottom = toScreenY(car.y);
    const top = bottom - carH;
    const halfW = carW / 2;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- wasm boundary: phase may hold a variant the TS union hasn't caught up with
    const base = PHASE_COLORS[car.phase] ?? "#6b6b75";

    const grad = ctx.createLinearGradient(cx, top, cx, bottom);
    grad.addColorStop(0, shade(base, 0.14));
    grad.addColorStop(1, shade(base, -0.18));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - halfW, top, carW, carH);
    ctx.strokeStyle = "rgba(10, 12, 16, 0.9)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - halfW + 0.5, top + 0.5, carW - 1, carH - 1);

    if (car.riders > 0) {
      drawRidersInCar(ctx, cx, bottom, carW, carH, car.riders, riderColor, car.id, s);
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
    // Stagger spacing shrinks with speed so 16× runs don't pile up decades-long
    // tween tails that outlive the phase they came from.
    const stagger = 30 / scale;
    // Board tweens originate just outside the shaft rail (where the
    // nearest stick figure in the gutter stands). Each car's rail
    // offset uses its own `shaftInnerW` lookup so specialty banks
    // (narrow shafts) get tighter tween origins.

    // First pass: compute per-car rider deltas and accumulate per-stop
    // board totals. Boards must be known *before* the stop pass so a
    // stop whose waiting count dropped can distinguish between "a car
    // picked them up" and "they gave up." Without this separation the
    // abandon tween fires whenever anyone boards, which reads as
    // "everyone gives up during rush hour" — the opposite of truth.
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
          // Cabin's vertical center — since the cabin anchors at its
          // bottom and extends up by `carH`, its center sits one half
          // above the slab. Riders fly in/out at the middle so the
          // tween lands visibly inside the cabin rectangle.
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

    // Second pass: stop-level diffs. A drop in waiting count that
    // exceeds the boards attributed to this stop this frame is an
    // abandonment — rider hit their patience budget and walked off.
    // Cap the visual count per stop per frame so a hundred simultaneous
    // abandonments during a stress test don't carpet the canvas.
    for (const stop of snap.stops) {
      const waiting = stop.waiting_up + stop.waiting_down;
      const prev = this.#stopStates.get(stop.entity_id);
      if (prev) {
        const dropped = prev.waiting - waiting;
        const boards = boardsAtStop.get(stop.entity_id) ?? 0;
        const abandons = Math.max(0, dropped - boards);
        if (abandons > 0) {
          const stopY = toScreenY(stop.y);
          // Drift leftward past the floor label — reads as "walked off
          // to find the stairs / another car." The outward direction
          // visually disambiguates abandons from alights (which drift
          // right, toward the shaft, i.e. "got delivered"). Anchor the
          // origin midway through the left gutter so the rider reads as
          // stepping out of the queue rather than leaving the shaft.
          const startX = s.padX + s.labelW + s.figureGutterW / 2;
          const count = Math.min(abandons, 4);
          for (let k = 0; k < count; k++) {
            this.#tweens.push({
              kind: "abandon",
              bornAt: now + k * stagger,
              // Abandon tweens run longer than board/alight so they
              // remain visible as a distinct event rather than blending
              // into the boarding flurry at a busy stop.
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

    // Reap completed tweens. Walk in reverse so splice indices stay valid.
    for (let i = this.#tweens.length - 1; i >= 0; i--) {
      const t = this.#tweens[i];
      if (t === undefined) continue;
      if (now - t.bornAt > t.duration) this.#tweens.splice(i, 1);
    }

    // Drop state for cars no longer in the snapshot. `entity_to_u32` on the
    // wasm side strips slotmap version bits, so a freed-then-refilled slot
    // reuses the same JS-visible id. Without this cleanup, a resurrected
    // car's first frame would see the dead car's final rider count as
    // `prev.riders` and fire spurious board/alight tweens.
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
      if (age < 0) continue; // staggered tweens start a few ms apart
      const tx = Math.min(1, Math.max(0, age / t.duration));
      const eased = easeOutNorm(tx);
      const [x, y] =
        t.kind === "board"
          ? arcPoint(t.startX, t.startY, t.endX, t.endY, eased)
          : [t.startX + (t.endX - t.startX) * eased, t.startY + (t.endY - t.startY) * eased];
      // Board is persistent (delivered into car), alight and abandon
      // fade out as the rider leaves the picture. Abandon gets a
      // slight extra fade curve so it reads as "fading away in
      // frustration" rather than the cleaner alight "delivered" fade.
      const alpha =
        t.kind === "board" ? 0.9 : t.kind === "abandon" ? (1 - eased) ** 1.5 : 1 - eased;
      // Abandon dots are slightly smaller — deemphasizes them visually
      // relative to boards/alights so they read as "ambient loss"
      // rather than flashing warnings.
      const radius = t.kind === "abandon" ? s.carDotR * 0.85 : s.carDotR;
      ctx.fillStyle = hexWithAlpha(t.color, alpha);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  get canvas(): HTMLCanvasElement {
    return this.#canvas;
  }
}

/**
 * Draw a row of tiny stick figures standing on a floor. Figures are
 * placed starting at `anchorX` and stepping horizontally by
 * `dir * s.figureStride` — so passing `dir = -1` fills leftward (for
 * up-bound riders in the left gutter, nearest figure closest to the
 * shaft) and `dir = +1` fills rightward. Overflow is rendered as a
 * "+N" label at the far end so the viewer always sees the exact count.
 */
function drawFigureRow(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  floorY: number,
  dir: -1 | 1,
  maxW: number,
  count: number,
  color: string,
  s: Scale,
  variantSeed: number,
): void {
  // Reserve room at the far end for the "+N" label so it never overlaps
  // a figure — ~14 px fits 3-digit overflow at the small font.
  const labelRoom = 14;
  const capN = Math.max(1, Math.floor((maxW - labelRoom) / s.figureStride));
  const visible = Math.min(count, capN);
  // First figure's near edge sits ~2 px from the shaft rail so the
  // bodies don't merge with the rail line.
  const firstOffset = dir === -1 ? -2 : 2;
  for (let i = 0; i < visible; i++) {
    const x = anchorX + firstOffset + dir * i * s.figureStride;
    // Encode direction into the variant seed's high bits so the
    // up-gutter and down-gutter figure at slot i pick different
    // variants — otherwise both sides would mirror each other's
    // pattern and feel artificially uniform across the floor.
    const slotSeed = i + (dir === -1 ? 0 : 10_000);
    const variant = pickRiderVariant(variantSeed, slotSeed);
    drawStickFigure(ctx, x, floorY, s.figureHeadR, color, variant);
  }
  if (count > visible) {
    ctx.fillStyle = OVERFLOW_COLOR;
    ctx.font = `${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = dir === -1 ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    const labelX = anchorX + firstOffset + dir * visible * s.figureStride;
    ctx.fillText(`+${count - visible}`, labelX, floorY - 1);
  }
}

/**
 * Silhouette archetypes for rider variation. Picked deterministically
 * per (stop, slot-index) or (car, slot-index) via `pickRiderVariant`
 * so each slot stays stable across frames but the crowd as a whole
 * reads as a mix of individuals rather than a row of clones.
 *
 * - `standard` — the default humanoid (baseline sims).
 * - `briefcase` — standard + small rectangular case at right hip.
 * - `bag` — standard + rounded shoulder-bag blob at left shoulder.
 * - `short` — smaller all around (reads as a child or shorter adult).
 * - `tall` — taller and slimmer (reads as a longer-built adult).
 */
type RiderVariant = "standard" | "briefcase" | "bag" | "short" | "tall";
const RIDER_VARIANTS: readonly RiderVariant[] = ["standard", "briefcase", "bag", "short", "tall"];

/**
 * Hash `(seedA, seedB)` to a silhouette variant deterministically.
 * Uses the same `Math.imul` FNV-style mix the seed word hasher uses
 * so the result is stable across browsers and machines. Caller
 * supplies `seedA` as the parent entity id (stop or car) and `seedB`
 * as the slot index within that container — same combination → same
 * variant on every frame.
 */
function pickRiderVariant(seedA: number, seedB: number): RiderVariant {
  let h = (seedA ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ seedB, 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return RIDER_VARIANTS[h % RIDER_VARIANTS.length] ?? "standard";
}

/**
 * Draw a SimTower-style rider silhouette: small filled head over a
 * tapered humanoid body (wider shoulders narrowing toward the feet,
 * with a softly rounded top and slightly flared base). Five variants
 * pick different proportions and optional accessory marks so a queue
 * of riders reads as a mix of people rather than a row of clones.
 *
 * Feet rest on `floorY`. Total height ≈ headR × 8.2 for `standard`,
 * a bit less for `short` and a bit more for `tall`.
 */
function drawStickFigure(
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
      // height ≈ 11 × baseHeadR so a `tall` figure stands a bit above
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
 * Render the riders inside a cabin as a row of SimTower-style
 * silhouettes standing on the cabin floor. Head radius scales down
 * from the gutter figure so the row fits inside the cabin's
 * interior; if more riders load than fit horizontally, the tail of
 * the row is replaced with a "+N" overflow label so the exact count
 * is never obscured.
 *
 * Uses `CAR_DOT_COLOR` (the same off-white that the old rider-dots
 * used) so silhouettes read clearly against the cabin's phase-
 * coloured gradient regardless of phase.
 */
function drawRidersInCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  carBottom: number,
  carW: number,
  carH: number,
  count: number,
  riderColor: string,
  variantSeed: number,
  s: Scale,
): void {
  // Default to the gutter figure size so waiting riders and riding
  // riders read at the same scale — a key SimTower cue. Only shrink
  // when the cabin is narrower than the figure's shoulders (w) or
  // shorter than the figure's body (h), so the silhouette still fits.
  // Height divisor is `10.5` (not 8.2) because that's the approximate
  // total-height factor for the *tallest* variant (`tall` with hat);
  // sizing to the tallest guarantees no rider ever pokes above the
  // cabin ceiling, no matter which variant the hash picks for a slot.
  const fitByW = carW * 0.22;
  const fitByH = (carH - 4) / 10.5;
  const headR = Math.max(1.2, Math.min(s.figureHeadR, fitByW, fitByH));
  // Stride scales with head size — if the cabin forced us to shrink
  // `headR`, shrink the stride in the same ratio so figures still
  // read as a row of people rather than a single pile.
  const stride = s.figureStride * (headR / s.figureHeadR);
  const padX = 3;
  const padY = 2;
  const innerW = carW - padX * 2;
  // Reserve "+N" label room at the right of the row so overflow
  // never overlaps a silhouette.
  const labelRoom = 14;
  const maxVisible = Math.max(1, Math.floor((innerW - labelRoom) / stride));
  const visible = Math.min(count, maxVisible);

  // Centre the row of silhouettes inside the cabin.
  const totalRowW = visible * stride;
  const startX = cx - totalRowW / 2 + stride / 2;
  // Feet rest just above the cabin interior bottom.
  const floorY = carBottom - padY;

  for (let i = 0; i < visible; i++) {
    const variant = pickRiderVariant(variantSeed, i);
    drawStickFigure(ctx, startX + i * stride, floorY, headR, riderColor, variant);
  }

  if (count > visible) {
    ctx.fillStyle = OVERFLOW_COLOR;
    ctx.font = `${s.fontSmall.toFixed(0)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    // Overflow label sits past the last silhouette, vertically
    // centred around the figure's head height so it reads as part of
    // the row rather than floating above or below.
    const labelX = cx + totalRowW / 2 + 2;
    const labelY = floorY - headR * 4;
    ctx.fillText(`+${count - visible}`, labelX, labelY);
  }
}

/** Lighten (`amount > 0`) or darken (`amount < 0`) a hex color by a fraction [-1, 1]. */
function shade(hex: string, amount: number): string {
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

/** `#rrggbb` → `rgba(r, g, b, a)`, no-op on other color forms. */
function hexWithAlpha(color: string, alpha: number): string {
  const m = color.match(/^#?([0-9a-f]{6})$/i);
  if (!m || m[1] === undefined) return color;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Truncate `text` to fit `maxWidth` px, appending "…" if needed. */
function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "\u2026";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? ellipsis : text.slice(0, lo) + ellipsis;
}

/** Apply `alpha` (0..1) to a `#RRGGBB` hex color. Used for pane-tinted
 *  canvas strokes where we have a base hex and want a translucent
 *  variant without adding a CSS variable lookup on every frame.
 *
 *  Falls back to `hexWithAlpha` (rgba() form) for anything that isn't
 *  strictly `#RRGGBB` — cheap safety net so a future caller passing
 *  shorthand or a CSS variable doesn't silently drop alpha. */
function withAlpha(hex: string, alpha: number): string {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    return `${hex}${a.toString(16).padStart(2, "0")}`;
  }
  return hexWithAlpha(hex, alpha);
}

/**
 * Build a rounded-rectangle path on `ctx`. Caller fills/strokes.
 * Uses `CanvasRenderingContext2D.roundRect` when available
 * (Chrome/Edge 99+, Safari 16+, Firefox 113+) and falls back to a
 * manual path for older engines. The playground's Vite + esbuild
 * target is modern browsers; the fallback keeps a local dev build on
 * an older headless Chromium (e.g. CI screenshotters) working.
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
