import type { CarDto } from "../types";

// Palette mirrors style.css primitives. Canvas rendering can't read CSS
// custom properties cheaply in a hot loop, so these are JS constants that
// track the CSS tokens. Keep in sync with `:root` in src/style.css.
//
export const PHASE_COLORS: Record<CarDto["phase"], string> = {
  idle: "#6b6b75", // --text-disabled
  moving: "#f59e0b", // --accent
  repositioning: "#a78bfa", // violet — no CSS token; phase-specific hue
  "door-opening": "#fbbf24", // --accent-up
  loading: "#7dd3fc", // --pane-a
  "door-closing": "#fbbf24", // --accent-up
  stopped: "#8b8c92", // --text-tertiary
  unknown: "#6b6b75", // --text-disabled
};

export const FLOOR_LINE = "#2a2a35"; // --border-subtle — floor-slab stroke
export const STOP_LABEL = "#a1a1aa"; // --text-secondary
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
export const SHAFT_FILL_BY_INDEX: readonly string[] = [
  "rgba(8, 10, 14, 0.55)", // main bank (grey, same as before)
  "rgba(8, 10, 14, 0.55)", // second main bank (same)
  "rgba(58, 34, 4, 0.55)", // executive — warm amber tint
  "rgba(6, 30, 42, 0.55)", // service — cool cyan tint
];
export const SHAFT_FRAME_BY_INDEX: readonly string[] = [
  "#3a3a45", // --border-default
  "#3a3a45",
  "#8a5a1a", // exec — warm amber rail
  "#2d5f70", // service — cool cyan rail
];
export const SHAFT_FILL_FALLBACK = "rgba(8, 10, 14, 0.55)";
export const SHAFT_FRAME_FALLBACK = "#3a3a45";
// Per-line width multiplier. Specialty banks (VIP, service) are
// small single-cab elevators holding <5 passengers — visually about
// half the main-bank width so the silhouette row only fits 2–3
// figures before overflowing to "+N". Cars, car trails, and target
// rings all scale down proportionally for lines with a <1 multiplier.
export const SHAFT_WIDTH_MUL_BY_INDEX: readonly number[] = [1, 1, 0.5, 0.42];
// Per-line short-name labels for the shaft top strip. Position-
// based — so scenarios that set up their lines in the standard
// order (main banks first, exec, service) get correct labels
// without extra metadata. A scenario with different line semantics
// could eventually supply its own labels through metadata.
export const SHAFT_NAME_BY_INDEX: readonly string[] = ["LOW", "HIGH", "VIP", "SERVICE"];
// Rider accent color used inside the VIP cabin. Warm gold to match
// the VIP shaft's amber identity, and distinct from the cyan/rose
// up/down pairing used for general passengers.
export const VIP_RIDER_COLOR = "#e6c56b";
// Rider accent color used inside the Service cabin. Slightly warmer
// teal than the service shaft label — reads as "utility / ops staff"
// and stays out of the up/down cyan-rose pairing.
export const SERVICE_RIDER_COLOR = "#9bd4c4";
// Label colour tracks the shaft fill's accent tint so the name
// picks up the same "this is specialty" cue as the shaft itself.
export const SHAFT_LABEL_BY_INDEX: readonly string[] = [
  "#a1a1aa", // main — secondary text grey
  "#a1a1aa",
  "#d8a24a", // exec — warm amber
  "#7cbdd8", // service — cool cyan
];
export const SHAFT_LABEL_FALLBACK = "#a1a1aa";
// Door marks — muted at rest, brighter when a car is actively loading
// at that floor. The active state reuses the amber brand accent.
export const DOOR_INACTIVE = "#4a4a55"; // --border-strong
export const DOOR_ACTIVE = "#f59e0b"; // --accent
// Up and down use distinct hue families so direction is legible at small
// figure sizes. Cool blue reads as "up" (sky / lift), rose as "down" (gravity).
export const UP_COLOR = "#7dd3fc"; // --pane-a
export const DOWN_COLOR = "#fda4af"; // --pane-b
export const CAR_DOT_COLOR = "#fafafa"; // --text-primary
export const OVERFLOW_COLOR = "#8b8c92"; // --text-tertiary
// Target marker — white, not amber. Amber reads as "doors / loading"
// elsewhere in the diagram (door marks, load-overlay accents), so
// using it for the target dot added false semantic overlap.
export const TARGET_FILL = "rgba(250, 250, 250, 0.95)"; // --text-primary at alpha

// Board/alight animation baseline. Effective duration is divided by the sim
// speed multiplier so fast-forwarded runs don't queue stale tweens.
export const TWEEN_BASE_MS = 260;

// Cars in `moving` phase leave a short fading ghost strip behind them so
// velocity is visible at a glance without a text indicator.
export const TRAIL_STEPS = 3;
export const TRAIL_DT = 0.05; // seconds of motion per ghost step
