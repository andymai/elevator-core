/**
 * Tether-mode rendering helpers — used only by scenarios that flag
 * themselves as a space elevator (one shared shaft, vast altitude
 * range, atmospheric backdrop). The CanvasRenderer falls back to the
 * standard per-line column layout when no tether config is set.
 *
 * The altitude scale is logarithmic so the entire 0 → 100,000 km range
 * remains legible in a single viewport: ground / Karman / LEO / GEO /
 * counterweight all sit at distinct fractions of the canvas height
 * even though they span seven orders of magnitude.
 */

/** Per-pane tether-mode config. Set on the renderer when the scenario opts in. */
export interface TetherConfig {
  /**
   * Altitude (m) of the visual cap above the topmost stop. The
   * counterweight icon is drawn at this height; the climber never
   * travels here. Real space elevators use a counterweight at
   * ~100,000 km to keep the tether under tension past geostationary.
   */
  counterweightAltitudeM: number;
  /** Whether to cycle the Earth-curve gradient between day/night. */
  showDayNight: boolean;
}

/**
 * Atmospheric layer for a given altitude (m). Used by the inline car
 * chip and the side info card so the abstract altitude number is
 * anchored to something concrete ("you're in the stratosphere").
 *
 * Boundaries follow standard atmosphere reference points; "deep
 * space" is anything beyond LEO altitudes where the climber is
 * effectively in vacuum and the named layers stop being meaningful.
 */
export function atmosphericLayer(altitudeM: number): string {
  if (altitudeM < 12_000) return "troposphere";
  if (altitudeM < 50_000) return "stratosphere";
  if (altitudeM < 80_000) return "mesosphere";
  if (altitudeM < 700_000) return "thermosphere";
  if (altitudeM < 10_000_000) return "exosphere";
  if (altitudeM < 35_786_000) return "cislunar space";
  return "geostationary belt";
}

/**
 * Compress 0 → counterweight altitude into 0..1. Logarithmic with a
 * 1 km offset so sea-level (0 m) maps to 0 cleanly and the lower
 * decades (1 km, 10 km, 100 km) still claim screen real estate.
 *
 * `axisMaxM` is normally `counterweightAltitudeM`. Caller multiplies
 * by available pixel range and inverts (higher altitudes draw higher
 * on the canvas).
 */
export function tetherFractionForAltitude(altitudeM: number, axisMaxM: number): number {
  if (axisMaxM <= 0) return 0;
  const lo = Math.log10(1 + 0 / 1000);
  const hi = Math.log10(1 + axisMaxM / 1000);
  const v = Math.log10(1 + Math.max(0, altitudeM) / 1000);
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
}

/**
 * Decade tick marks (1, 10, 100, 1000, 10 000, 100 000 km) for the
 * atmosphere strip — drawn as faint horizontal hairlines with a
 * label. Returns altitudes that fall inside the visible axis.
 */
export function tetherDecadeTicks(axisMaxM: number): Array<{ altitudeM: number; label: string }> {
  const ticks: Array<{ altitudeM: number; label: string }> = [];
  for (let p = 3; p <= 8; p++) {
    const altitudeM = 10 ** p;
    if (altitudeM > axisMaxM) break;
    ticks.push({ altitudeM, label: formatAltitudeShort(altitudeM) });
  }
  return ticks;
}

/** "12 km" / "400 km" / "35,786 km" depending on magnitude. */
export function formatAltitudeShort(altitudeM: number): string {
  if (altitudeM < 1000) return `${Math.round(altitudeM)} m`;
  const km = altitudeM / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 1000) return `${km.toFixed(0)} km`;
  return `${km.toLocaleString("en-US", { maximumFractionDigits: 0 })} km`;
}

/** Velocity formatted at km/h above 360 m/s, m/s otherwise — keeps the chip short. */
export function formatVelocity(vMs: number): string {
  const a = Math.abs(vMs);
  if (a < 1) return `${a.toFixed(2)} m/s`;
  if (a < 100) return `${a.toFixed(0)} m/s`;
  const kph = (a * 3.6).toFixed(0);
  return `${kph} km/h`;
}

/** Approximate trapezoidal-phase classification from current speed and accel/decel hints. */
export type KinematicPhase = "accel" | "cruise" | "decel" | "idle";

export function classifyKinematicPhase(
  currentSpeed: number,
  prevSpeed: number,
  maxSpeed: number,
): KinematicPhase {
  const a = Math.abs(currentSpeed);
  if (a < 0.5) return "idle";
  const dv = a - Math.abs(prevSpeed);
  // 5% deadband so floating-point cruise jitter doesn't flip-flop the chip.
  if (a >= maxSpeed * 0.95 && Math.abs(dv) < maxSpeed * 0.005) return "cruise";
  if (dv > 0) return "accel";
  if (dv < 0) return "decel";
  return "cruise";
}

/** Format seconds as a compact "1h 24m" / "42m" / "18s" depending on size. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Trapezoidal-motion ETA from `posM` to `targetM` given current
 * signed velocity, max speed, and decel. Returns seconds or
 * `Number.POSITIVE_INFINITY` if no target is set.
 *
 * Approximation: assume the climber will accel up to (or coast at)
 * max speed, then decelerate to a stop at the target. Good enough for
 * a HUD readout — exact ETA would require the engine's plan.
 */
export function tetherEta(
  posM: number,
  targetM: number,
  velocity: number,
  maxSpeed: number,
  acceleration: number,
  deceleration: number,
): number {
  const remaining = Math.abs(targetM - posM);
  if (remaining < 1e-3) return 0;
  const v = Math.abs(velocity);
  const decelDist = (v * v) / (2 * deceleration);
  if (decelDist >= remaining) return v > 0 ? remaining / Math.max(v, 1e-3) : 0;
  // Coast/cruise phase + decel from max to 0.
  const cruiseSpeed = maxSpeed;
  const accelTime = Math.max(0, (cruiseSpeed - v) / acceleration);
  const accelDist = v * accelTime + 0.5 * acceleration * accelTime * accelTime;
  const decelTime = cruiseSpeed / deceleration;
  const fullDecelDist = (cruiseSpeed * cruiseSpeed) / (2 * deceleration);
  const cruiseDist = Math.max(0, remaining - accelDist - fullDecelDist);
  const cruiseTime = cruiseDist / Math.max(cruiseSpeed, 1e-3);
  return accelTime + cruiseTime + decelTime;
}
