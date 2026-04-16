# Headless and Non-Bevy Usage

`elevator-core` is engine-agnostic. The `elevator-bevy` crate is one reference integration; it's the visual debugger that ships in this repository. But nothing in `elevator-core` itself depends on Bevy -- you can drop the library into [macroquad](https://macroquad.rs/), [eframe/egui](https://github.com/emilk/egui), a web backend, a CLI analysis tool, or a pure headless driver.

This chapter walks through the integration surface and shows three concrete patterns.

## The integration contract

Integrating `elevator-core` into any host comes down to three things:

1. **Build the `Simulation` once**, up front. `SimulationBuilder::new()` or `SimulationBuilder::from_config(config)` then `.build()`. Keep the `Simulation` as state in your engine's scene / app struct / actor.

2. **Drive the tick loop.** Call `sim.step()` each frame (or on a fixed-timestep accumulator, if you want to decouple sim rate from render rate). `Simulation::step()` only reads and writes the internal world state -- no I/O, no wall-clock dependency, no engine-specific globals.

3. **Read state out, inject input in.**
   - **Read state:** `sim.world()` returns a `World` you can query via `query::<(EntityId, &Rider, &Position)>()` for rendering, or via typed accessors (`world.elevator(id)`, `world.stop_position(id)`).
   - **Inject input:** `sim.spawn_rider(origin, dest, weight)`, `sim.push_destination(elev, stop)`, `sim.reroute(rider, new_dest)`, `sim.set_service_mode(elev, mode)`.
   - **Change-event hook:** `sim.drain_events()` returns every event emitted during the last tick. Route them into toasts, particles, SFX, analytics.

That's it. The entire public surface of the library is the `prelude` module (see [docs.rs](https://docs.rs/elevator-core)) plus a handful of typed submodules; no engine extension points, no traits your app must implement.

## Pattern 1 -- Headless / CLI / web backend

The simplest integration. No rendering -- you step the sim and consume events. Suitable for analysis tools, web backends streaming simulation state over Server-Sent Events, CI scenarios, or offline replay.

The repository ships [`examples/headless_trace.rs`](https://github.com/andymai/elevator-core/blob/main/crates/elevator-core/examples/headless_trace.rs) which is exactly this pattern:

```bash
cargo run --example headless_trace -- \
    --config assets/config/default.ron \
    --ticks 2000 \
    --output /tmp/trace.ndjson
```

The body of the main loop is small enough to inline here:

```rust,ignore
for _ in 0..args.ticks {
    sim.step();
    for event in sim.drain_events() {
        let line = serde_json::to_string(&event)?;
        writeln!(out, "{line}")?;
    }
}
```

`Event` implements `Serialize` / `Deserialize`, so consumers in any language can read the NDJSON stream. This is the integration shape a web backend would use: stream events over SSE / WebSocket, have a JS frontend render them.

## Pattern 2 -- macroquad (game loop)

[macroquad](https://macroquad.rs/) is a lightweight cross-platform game framework with a simple `async fn main` game loop. The integration pattern is about 200 lines -- most of the code is rendering, not elevator-core glue.

> **Advisory note.** At the time of writing, macroquad 0.4.x carries
> [RUSTSEC-2025-0035](https://rustsec.org/advisories/RUSTSEC-2025-0035)
> (unsound mutable-static use; no fixed version available). We don't
> ship a runnable example to keep this repository's `cargo-deny`
> supply-chain check green. The code sketch below is correct and will
> run if you add `macroquad = "0.4"` as a dependency in your own crate.

The relevant integration pattern:

```rust,ignore
use elevator_core::components::{Elevator, RiderPhase, Stop};
use elevator_core::prelude::*;
use macroquad::prelude::*;

#[macroquad::main(window_conf)]
async fn main() {
    let mut sim = build_sim();       // 1. Build once

    loop {
        if is_key_pressed(KeyCode::Space) {
            spawn_random_rider(&mut sim);  // 3b. Inject input
        }

        sim.step();                  // 2. Drive the tick
        let _events = sim.drain_events();  // 3c. Consume events

        clear_background(BLACK);
        draw_shaft(&sim);            // 3a. Read state
        draw_elevators(&sim);
        draw_hud(&sim);
        next_frame().await;
    }
}

fn draw_elevators(sim: &Simulation) {
    for (_, pos, car) in sim.world()
        .query::<(EntityId, &Position, &Elevator)>()
        .iter()
    {
        let y = position_to_screen_y(pos.value());
        let color = if car.current_load() > 0.0 {
            Color::from_rgba(100, 200, 255, 255)
        } else {
            Color::from_rgba(180, 180, 180, 255)
        };
        draw_rectangle(SHAFT_X + 4.0, y - 22.0, SHAFT_W - 8.0, 44.0, color);
    }
}
```

The rendering functions pull component state via `sim.world().query::<...>()` -- exactly the same API a Bevy system uses, just without Bevy's dispatcher.

### Decoupling sim rate from render rate

The example above steps the sim once per rendered frame. If you want the sim to run at a fixed 60 tick/sec regardless of display refresh rate:

```rust,ignore
let mut tick_accumulator = 0.0_f64;
let tick_interval = 1.0 / sim.time_adapter().ticks_per_second();

loop {
    tick_accumulator += get_frame_time() as f64;
    while tick_accumulator >= tick_interval {
        sim.step();
        tick_accumulator -= tick_interval;
    }
    // render once per frame regardless of tick count
    render(&sim);
    next_frame().await;
}
```

## Pattern 3 -- eframe / egui (immediate-mode UI)

[eframe](https://github.com/emilk/egui) is the immediate-mode UI framework behind egui. It's suited for inspector-style tools -- a dashboard on the sim rather than a game. We don't ship a runnable eframe example (eframe transitively pulls in wgpu, which is a heavy dep for an example), but the pattern is:

```rust,ignore
// Your app holds the sim as state.
struct ElevatorApp {
    sim: Simulation,
    tick_per_frame: bool,
}

impl eframe::App for ElevatorApp {
    fn update(&mut self, ctx: &egui::Context, _: &mut eframe::Frame) {
        // 2. Drive the tick. Requesting continuous repaint keeps the
        // UI live; otherwise the sim only advances on user interaction.
        if self.tick_per_frame {
            self.sim.step();
            let _events = self.sim.drain_events();
            ctx.request_repaint();
        }

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("elevator-core inspector");

            // 3a. Read state -- same queries as macroquad, just rendering
            // with egui widgets instead of rectangles.
            for (_, pos, car) in self.sim.world()
                .query::<(EntityId, &Position, &Elevator)>()
                .iter()
            {
                ui.label(format!(
                    "elev {:?}: pos={:.1} load={} phase={:?}",
                    car.line(), pos.value(), car.current_load(), car.phase()
                ));
            }

            // 3b. Input via egui buttons.
            if ui.button("spawn rider 0→3").clicked() {
                let _ = self.sim.spawn_rider(StopId(0), StopId(3), 72.0);
            }
        });
    }
}

fn main() -> eframe::Result<()> {
    eframe::run_native(
        "elevator-core",
        eframe::NativeOptions::default(),
        Box::new(|_| Ok(Box::new(ElevatorApp {
            sim: build_sim(),
            tick_per_frame: true,
        }))),
    )
}
```

Everything above except the `eframe::App` trait impl is standard `elevator-core` usage. The only engine-specific concept is `ctx.request_repaint()` to keep the UI ticking when the sim is running.

## Picking a pattern

| Host | When it's the right fit |
|---|---|
| **headless / CLI** | Analysis, batch runs, CI, web backends (stream `Event`s over SSE / WebSocket to a JS frontend). |
| **macroquad** | 2D games, rapid iteration, WASM browser builds. Minimal dep footprint. |
| **eframe / egui** | Dashboards, inspectors, debuggers. Good when you want live-editable sim state with sliders + buttons. |
| **Bevy** | Full 3D games, ECS-native integration, complex scene systems. See [Bevy Integration](bevy-integration.md). |
| **Wasm-in-browser** | Any of the above, as long as the `traffic` feature (which uses `rand::rngs::ThreadRng` by default) is either disabled or paired with a seeded `StdRng` via `PoissonSource::with_rng`. |

## Determinism across hosts

`elevator-core` is deterministic: same config + same sequence of inputs produce identical event streams across hosts. If your renderer needs to replay a saved scenario, combine `WorldSnapshot::restore()` (from [Snapshots and Determinism](snapshots-determinism.md)) with a seeded `StdRng` on any `PoissonSource` -- the tick loop itself has no internal randomness.

## Next steps

- [Snapshots and Determinism](snapshots-determinism.md) -- round-trip save/load so integrations can persist simulation state.
- [Events and Metrics](events-metrics.md) -- the `Event` enum and metric accumulators that drive UI updates.
- [Performance](performance.md) -- throughput baselines and scaling guidance for choosing a tick rate.
