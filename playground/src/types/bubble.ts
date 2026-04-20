/**
 * Decoded event DTOs surfaced by `Sim.drainEvents`. Kind-tagged to
 * mirror the Rust `EventDto` shape (`#[serde(tag = "kind", rename_all =
 * "kebab-case")]`). Only the cases the speech-bubble layer consumes are
 * enumerated; unknown variants fall through to the `string`-kind branch
 * so a future DTO addition doesn't crash the UI.
 */
export type BubbleEvent =
  | { kind: "rider-spawned"; tick: number; rider: number; origin: number; destination: number }
  | { kind: "rider-boarded"; tick: number; rider: number; elevator: number }
  | { kind: "rider-exited"; tick: number; rider: number; elevator: number; stop: number }
  | { kind: "rider-abandoned"; tick: number; rider: number; stop: number }
  | { kind: "elevator-arrived"; tick: number; elevator: number; stop: number }
  | { kind: "elevator-departed"; tick: number; elevator: number; stop: number }
  | { kind: "door-opened"; tick: number; elevator: number }
  | { kind: "door-closed"; tick: number; elevator: number }
  | { kind: "elevator-assigned"; tick: number; elevator: number; stop: number }
  | { kind: "elevator-repositioning"; tick: number; elevator: number; stop: number }
  | { kind: "other"; tick: number; label: string };

/**
 * Per-car speech-bubble state, keyed by car entity id. All three
 * timestamps use `performance.now()` wall-clock ms — not sim ticks — so
 * the bubble fades predictably even when the sim races ahead or the tab
 * backgrounds and `requestAnimationFrame` stalls. `bornAt` exists so
 * the renderer can fade the last ~30 % of lifetime for a soft exit.
 */
export interface CarBubble {
  text: string;
  bornAt: number;
  expiresAt: number;
}
