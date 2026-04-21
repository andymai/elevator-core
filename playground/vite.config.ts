import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

function wasmDevPlugin(): Plugin {
  const wasmCrateSrc = path.resolve(__dirname, "../crates/elevator-wasm/src");
  const coreCrateSrc = path.resolve(__dirname, "../crates/elevator-core/src");
  const wasmOutput = path.resolve(__dirname, "public/pkg/elevator_wasm_bg.wasm");
  const buildScript = path.resolve(__dirname, "../scripts/build-wasm.sh");
  let building = false;

  function rebuild(server: { ws: { send: (payload: unknown) => void } }) {
    if (building) return;
    building = true;
    console.warn("\n[wasm] Rust source changed, rebuilding...");
    const child = spawn("bash", [buildScript], { stdio: "inherit" });
    child.on("close", (code) => {
      building = false;
      if (code === 0) {
        console.warn("[wasm] Build complete, reloading.");
        server.ws.send({ type: "full-reload" });
      } else {
        console.error(`[wasm] Build failed (exit ${code}).`);
      }
    });
  }

  return {
    name: "wasm-dev",
    apply: "serve",
    configureServer(server) {
      if (!fs.existsSync(wasmOutput)) {
        console.warn("[wasm] pkg/ missing, running initial build...");
        execFileSync("bash", [buildScript], { stdio: "inherit" });
      }

      const watchers: fs.FSWatcher[] = [];
      for (const dir of [wasmCrateSrc, coreCrateSrc]) {
        if (!fs.existsSync(dir)) continue;
        const w = fs.watch(dir, { recursive: true }, (_event, filename) => {
          if (filename && filename.endsWith(".rs")) {
            rebuild(server);
          }
        });
        watchers.push(w);
      }
      server.httpServer?.on("close", () => {
        for (const w of watchers) w.close();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), wasmDevPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
