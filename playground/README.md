# elevator-core playground

In-browser demo of the `elevator-core` Rust simulation library. Swap dispatch
strategies, stream live metrics, share your seed.

## Local development

The playground consumes the `elevator-wasm` crate's `wasm-pack` output from
`public/pkg/`. Build it once, then start Vite:

```sh
wasm-pack build ../crates/elevator-wasm --target web --out-dir ../../playground/public/pkg
pnpm install
pnpm dev
```

`pnpm dev` starts Vite on `http://localhost:5173/`. Type changes re-typecheck
and hot-reload; Rust changes require a fresh `wasm-pack build`.

## Scripts

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Vite dev server with HMR                       |
| `pnpm build`        | `tsc -b && vite build` — output in `dist/`     |
| `pnpm preview`      | Preview the production build locally           |
| `pnpm typecheck`    | `tsc -b --noEmit`                              |
| `pnpm lint`         | ESLint (strictTypeChecked + module boundaries) |
| `pnpm lint:fix`     | ESLint with auto-fix                           |
| `pnpm format`       | Prettier write                                 |
| `pnpm format:check` | Prettier check (CI-safe)                       |
| `pnpm knip`         | Dead-code detection                            |
| `pnpm test`         | Vitest run                                     |
| `pnpm quality`      | All of the above in one shot                   |

## Deploy

`pnpm build` emits a fully static `dist/` that drops into any static host.
In CI, the mdBook docs workflow runs `wasm-pack build` + `pnpm build` and
copies `dist/` into the GitHub Pages site under `/playground/`.

## Architecture

```
src/
  main.ts              Entry point (3 lines — just boots the shell)
  types/               DTO mirrors of the wasm-bindgen surface
  sim/                 WasmSim wrapper + deterministic traffic driver
  domain/
    permalink/         URL state codec + seed hashing
    params/            Tweak drawer logic + RON builder
    scenarios/         Embedded RON scenarios + registry
  render/              Canvas renderer (SimTower-style building cross-section)
    renderer.ts        CanvasRenderer class (orchestrator)
    layout.ts          Scale, geometry math
    palette.ts         Color constants
    draw-building.ts   Shafts, floors, gutters, waiting figures
    draw-cars.ts       Cars, trails, target markers, bubbles
    figures/           Stick-figure rider drawing
  platform/            Framework-agnostic DOM helpers (el, toast, hold-to-repeat)
  app/                 Typed event bus (AppEvents)
  features/
    compare-pane/      Pane lifecycle, rendering, speech bubbles, mode badge
    scoreboard/        Metric rows, sparklines
    tweak-drawer/      Parameter steppers, hot-swap, drawer rendering
    strategy-picker/   Dispatch + reposition popover system
    scenario-picker/   Scenario cards, switch logic, mobile sheet readout
    phase-strip/       Phase label + progress bar
    keyboard-shortcuts/ Shortcut sheet toggle
  shell/               App orchestration
    boot.ts            Async init, wasm load, permalink decode
    wire-ui.ts         DOM handle collection (UiHandles)
    loop.ts            requestAnimationFrame render loop
    reset.ts           Sim reset, traffic config, progressive pre-seed
    listeners.ts       Top-level event wiring + keyboard shortcuts
```

### Module boundaries

Import rules are enforced by `eslint-plugin-boundaries`:

- **types** → nothing (pure leaf)
- **sim** → types
- **domain** → types, domain
- **render** → types, domain
- **platform** → types
- **features** → types, domain, sim, render, platform (not other features)
- **shell** → everything
- **main.ts** → shell only
