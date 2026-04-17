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

| Script | What it does |
|---|---|
| `pnpm dev` | Vite dev server with HMR |
| `pnpm build` | `tsc --noEmit && vite build` — output in `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm typecheck` | `tsc --noEmit` only |

## Deploy

`pnpm build` emits a fully static `dist/` that drops into any static host.
In CI, the mdBook docs workflow runs `wasm-pack build` + `pnpm build` and
copies `dist/` into the GitHub Pages site under `/playground/`.

## Architecture

| File | Purpose |
|---|---|
| `src/main.ts` | Entry point, requestAnimationFrame loop |
| `src/sim.ts` | Typed TS wrapper around `WasmSim` |
| `src/traffic.ts` | Seeded LCG rider spawning (determinism guarantee) |
| `src/canvas.ts` | Shaft + cars + stops renderer |
| `src/charts.ts` | Sparkline / bar chart / heatmap primitives |
| `src/eventLog.ts` | Scrolling event view |
| `src/export.ts` | CSV + GIF export (gif.js dynamic import) |
| `src/permalink.ts` | URL query-string state encoding |
| `src/scenarios.ts` | Embedded RON scenarios |
| `src/types.ts` | DTO mirrors of the wasm-bindgen surface |
