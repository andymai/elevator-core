# SKYSTACK (vendored)

Single-file tower-management sim, vendored from
[mf4633/board-gaming](https://github.com/mf4633/board-gaming) at
commit `c05dc685b59ca25e3ca63916ad0b2a7555758bbc`.

- **Upstream**: <https://github.com/mf4633/board-gaming/blob/main/Tower.html>
- **License**: MIT — see `LICENSE-SKYSTACK`.
- **Author**: Michael Flynn (2026).

## What's modified

This commit drops the upstream file in unchanged except for an
attribution header. The game still uses its own SCAN elevator scheduler.

A follow-up PR surgically replaces the elevator subsystem
(`tickElevator`, `tickCar`, `rebuildElevators`, hall-call queues, agent
boarding) with calls into `elevator-core`'s wasm bundle at `../pkg/`.
Renderer, mail, market, scenarios, weather, save/load, prestige, and
the daily challenge are untouched in both this PR and the follow-up.

## Best on desktop

The upstream layout targets desktop. Mobile responsiveness is tracked
as a follow-up.
