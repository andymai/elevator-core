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

## Grouping modes

Each scenario picks how shafts share dispatchers via the
`groupingMode` field on the scenario definition (default
`"independent"`):

- **`independent`** — each shaft owns its own wasm dispatch group.
  A car on shaft A only ever serves shaft A's hall calls. This is
  the recommended default for normal play because dispatch behaves
  exactly as you'd expect.
- **`coordinated`** — every shaft shares one dispatch group. Cars
  are assigned across shafts based on proximity. The "Coordinated
  Tower" scenario uses this mode as a showcase. Caveat: dispatch
  in a multi-line group does not currently filter cars by line
  membership, so an occasional cross-shaft assignment can leave
  a rider waiting longer than necessary. The per-line bookkeeping
  under `assigned_cars_by_line` is correct; only the assignment
  heuristic is suboptimal here.

A URL override is available for testing without editing scenarios:
append `?mode=coordinated` (or `?mode=independent`) to the page URL.

## v1 limitations

- **Save/load**: in-flight wasm riders aren't serialized. On load
  the game rebuilds wasm topology from the grid; agents re-route
  through the bridge on their next tick.
- **Mode-switch mid-game**: switching scenarios tears down and
  rebuilds wasm topology, which respawns in-flight riders.
- **Mobile**: upstream desktop layout. Mobile restyling tracked
  as a follow-up.

## Fallback behaviour

If the wasm bundle fails to load (network error, missing `pkg/`),
`SkystackWasm.isReady()` returns `false` and the legacy SCAN
scheduler runs as before. A red banner surfaces the wasm error
to the player.
