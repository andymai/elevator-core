import { defineConfig } from "vite";

// The playground loads the wasm-pack bundle from `public/pkg/` at runtime.
// That directory is populated by CI (`wasm-pack build --target web --out-dir
// playground/public/pkg`) before `vite build`, or by the local dev script in
// the playground README. Vite serves anything under `public/` unchanged, and
// wasm-pack's emitted JS uses `import.meta.url` to resolve its sibling .wasm
// file relative to its own location — no bundler plumbing required.

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
