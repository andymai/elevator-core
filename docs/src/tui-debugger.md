# TUI Debugger

`elevator-tui` is a terminal UI debugger for the simulation. It runs in
two modes from one binary:

- **Interactive** -- a live viewer with shaft column, scrolling event
  log, dispatch summary, and metrics panel. Pause and step
  tick-by-tick while you inspect what changed.
- **Headless** -- step the sim for N ticks, print a metrics summary,
  optionally emit the full event stream as JSON. Suitable for CI smoke
  tests against every config in `assets/config/` and for capturing a
  reproducible event trace to attach to a bug report.

The TUI complements the existing surfaces: the Bevy demo cannot pause
the sim cleanly, and the playground summarises events at a high level.
For "why did this car make that decision on tick 4218" debugging, the
TUI is the cheapest tool.

## Quick start

```bash
# Interactive mode against the default scenario.
cargo run -p elevator-tui -- assets/config/default.ron

# Headless smoke run -- step 5000 ticks, print summary, exit.
cargo run -p elevator-tui -- assets/config/default.ron --headless --until 5000

# Headless run with full event capture for bug repro.
cargo run -p elevator-tui --release -- \
    assets/config/default.ron --headless --until 10000 --emit trace.json
```

The binary takes one positional argument (the RON config path) plus
flags:

| Flag                   | Default | Purpose                                                    |
| ---                    | ---     | ---                                                        |
| `--headless`           | off     | Run non-interactively and print a summary instead of a TUI |
| `--until <N>`          | 1000    | (headless) absolute tick to stop at                        |
| `--emit <PATH>`        | --      | (headless) write drained events as JSON                    |
| `--no-traffic`         | off     | (headless) disable Poisson rider spawning                  |
| `--tick-rate <FACTOR>` | 1.0     | (interactive) initial multiplier on config tick rate       |

## Layout

The interactive view is one shaft column on the left and a stacked
right column with three panels: events (top), dispatch summary
(middle), metrics (bottom).

```text
 elevator-tui   tick 842   RUNNING   rate 2.00x   shaft Index
+--shaft-(3-cars)--+--overview-----------------------------------------+
|  Top   10.0 | . . . |  events . filter [all]                          |
|  ...                |  t=842  ElevArrived   e=2v1 at=12v1             |
|  F02    4.0 | . . . |  t=842  DoorOpened    e=2v1                     |
|  Lobby  0.0 | A . . |  t=841  RiderBoarded  r=17v1 e=1v1              |
|                     |  ...                                            |
|                     |--------------------------------------------------|
|                     |  dispatch                                        |
|                     |  Default      strategy=Scan  cars=3  waiting=4  |
|                     |    EntityId(2v1)  phase=Loading  queue=1        |
|                     |--------------------------------------------------|
|                     |  metrics                                         |
|                     |  spawned 19  delivered 12  abandoned 0 (0.0%)   |
|                     |  wait avg 32.1t   p95 84t   max 142t            |
+---------------------+--------------------------------------------------+
 space pause  . step  , step*10  +/- rate  m shaft  []car  f follow ...
```

The shaft has two modes you can toggle at runtime with `m`:

- **Index** (default): one row per stop, regardless of distance. The
  car glyph appears at the stop closest to its current position, with
  an arrow indicating direction (`▲` up, `▼` down). Compact for tall
  buildings; doesn't honour non-uniform stop spacing.
- **Distance**: rows are scaled to actual stop positions, so a car
  drifting between two stops 80 km apart sits visibly mid-cable.
  Honours `space_elevator.ron`-class scenarios at the cost of vertical
  space when stops are clumped.

## Hotkeys

### Tick control

| Key       | Action                                         |
| ---       | ---                                            |
| `space`   | Pause / resume auto-stepping                   |
| `.`       | Single-step one tick (works while paused)      |
| `,`       | Step 10 ticks                                  |
| `+`, `=`  | Double the tick rate (cap 64x)                 |
| `-`, `_`  | Halve the tick rate (floor 0.0625x)            |

### Layout

| Key       | Action                                                              |
| ---       | ---                                                                 |
| `m`       | Cycle shaft mode (Index <-> Distance)                               |
| `]`, `[`  | Focus next / previous car                                           |
| `f`       | Toggle follow mode -- filters the events panel to the focused car  |

### Event filtering

| Key | Toggle category   |
| --- | ---               |
| `1` | Elevator          |
| `2` | Rider             |
| `3` | Dispatch          |
| `4` | Topology          |
| `5` | Reposition        |
| `6` | Direction         |
| `7` | Observability     |

### Quit

| Key            | Action |
| ---            | ---    |
| `q`            | Quit   |
| `Ctrl-C`       | Quit   |

## Debugging recipes

### "Why did this car bypass that floor?"

1. Press `space` to pause as soon as you see the car about to skip.
2. Press `[` / `]` until the car is focused (its glyph reverses).
3. Press `f` to filter events to the car -- you can scroll back
   through `Assigned`, `PassingFloor`, and door events to see the
   bypass decision in context.

### Reproducing a bug from a headless trace

```bash
cargo run -p elevator-tui --release -- \
    assets/config/your_scenario.ron --headless --until 8000 --emit trace.json
```

Attach `trace.json` to the bug report. Each entry is `{ tick, event }`
in drain order, so a future replay tool (or a one-off `jq` query) can
reconstruct what happened tick-by-tick.

### CI smoke test

A non-zero exit means construction failed -- the simulation refused
the config -- so the pattern below catches schema regressions across
every shipped scenario:

```bash
for cfg in assets/config/*.ron; do
    cargo run -q -p elevator-tui --release -- "$cfg" --headless --until 5000
done
```

## Architecture notes

The TUI is a pure consumer of the public `Simulation` API. Every
method it calls is enumerated in `bindings.toml` under the `tui`
column -- look there to see exactly what the read-only viewer touches
and what is intentionally skipped (the v1 viewer is read-only and
does not expose mutators). Adding new TUI panels generally means
flipping a `tui = "skip:..."` to a `tui = "<panel_name>"`.

The interactive renderer is `ratatui` + `crossterm`. The frame budget
is ~33 ms (about 30 fps); inside one frame the loop polls input, then
auto-advances the sim by however many ticks fit in `tick_rate ×
ticks_per_second × elapsed_wall_time`. A soft cap prevents a high
rate from spinning the loop for whole seconds at a stretch on slow
terminals.

State is split between `state.rs` (pure data, unit-testable without a
real `Simulation`) and `app.rs` (terminal I/O + sim driving). The
render layer (`ui/`) only reads from the state and a borrowed
`&Simulation` -- it never mutates either.

## Next steps

- The v1 viewer is intentionally read-only. If you want to spawn
  riders, change strategies, or pin assignments interactively, those
  would land in a controller mode.
- A polish wave (tracked in `bindings.toml` as `tui-pr2`) adds
  snapshot save/load on a hotkey, sparkline trends in the metrics
  panel, and a per-car drill-down panel.
- See [Snapshots and Determinism](snapshots-determinism.md) for the
  semantics of the underlying `Simulation::snapshot()` API.
