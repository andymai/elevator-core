export type StrategyName = "scan" | "look" | "nearest" | "etd" | "destination" | "rsr";

/**
 * Per-pane reposition (idle-parking) strategy. Mirrors the five
 * built-ins exposed by the wasm crate's `builtinRepositionStrategies`;
 * kept as a string literal union so typos surface at the compiler.
 *
 * - `adaptive` — mode-gated: ReturnToLobby in up-peak, PredictiveParking
 *   otherwise. The playground's default.
 * - `predictive` — always park near the hottest recent-arrival stop.
 * - `lobby` — always return to stop 0.
 * - `spread` — maximise inter-car spacing across the shaft.
 * - `none` — stay where the car stopped.
 */
export type RepositionStrategyName = "adaptive" | "predictive" | "lobby" | "spread" | "none";

/**
 * Traffic-mode readout from the core `TrafficDetector`, surfaced by
 * `Sim.trafficMode()`. Mirrors the Rust `TrafficMode` enum 1:1.
 * `AdaptiveParking` reads this each reposition pass to pick between
 * `ReturnToLobby` / `PredictiveParking` / no-op — exposing it in the UI
 * lets users see *why* idle-car movement changes over the course of a
 * scenario.
 */
export type TrafficMode = "Idle" | "UpPeak" | "InterFloor" | "DownPeak";
