# SKYSTACK (vendored)

Single-file tower-management sim, vendored from
[mf4633/board-gaming](https://github.com/mf4633/board-gaming) at
commit `c05dc685b59ca25e3ca63916ad0b2a7555758bbc`.

- **Upstream**: <https://github.com/mf4633/board-gaming/blob/main/Tower.html>
- **License**: MIT — see `LICENSE-SKYSTACK`.
- **Author**: Michael Flynn (2026).

## What's modified

This page is a thin wasm bridge over the upstream `Tower.html`:

- **Wasm bootstrap** (`<script type="module">`) loads
  `../pkg/elevator_wasm.js` and exposes `WasmSim` on `window`.
- **`SkystackWasm` JS namespace** reconciles wasm topology against
  `state.elevators` whenever `rebuildElevators()` runs, steps the
  wasm sim per game minute, drains rider events, and mirrors car
  positions back into `state.elevators[].cars[].floatY` so the
  existing renderer just works.
- **`stepToward`'s elevator branch** routes new boarding requests
  through `wasmSim.spawnRiderByRef()` + `pressHallCall()` instead
  of pushing into the legacy `e.queueUp`/`queueDown` queues.

Renderer, mail, market, scenarios, weather, save/load, prestige,
agent state machine, and the daily challenge are untouched.

## v1 limitations

- **Save/load**: in-flight wasm riders aren't serialized. On load
  the game rebuilds wasm topology from the grid; agents re-route
  through the bridge on their next tick.
- **Mode**: each shaft becomes its own wasm dispatch group
  ("independent mode"). PR 6 adds a "coordinated mode" toggle for
  scenarios where neighbouring shafts should share a dispatcher.
- **Mobile**: upstream desktop layout. Mobile restyling tracked
  as a follow-up.

## Fallback behaviour

If the wasm bundle fails to load (network error, missing `pkg/`),
`SkystackWasm.isReady()` returns `false` and the legacy SCAN
scheduler runs as before. A red banner surfaces the wasm error
to the player.
