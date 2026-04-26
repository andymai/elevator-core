import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SKYSTACK_DIR = resolve(__dirname, "../../public/skystack");

describe("skystack vendored bundle", () => {
  it("ships Tower.html with attribution comment", () => {
    const html = readFileSync(resolve(SKYSTACK_DIR, "Tower.html"), "utf-8");
    expect(html).toContain("vendored from https://github.com/mf4633/board-gaming");
    expect(html).toContain("Michael Flynn");
    expect(html).toContain("LICENSE-SKYSTACK");
    // Sanity check that the actual game payload is intact.
    expect(html).toContain("<title>SKYSTACK</title>");
  });

  it("ships LICENSE-SKYSTACK with the upstream MIT text", () => {
    const license = readFileSync(resolve(SKYSTACK_DIR, "LICENSE-SKYSTACK"), "utf-8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Michael Flynn");
  });

  it("ships a README explaining the vendor", () => {
    const readme = readFileSync(resolve(SKYSTACK_DIR, "README.md"), "utf-8");
    expect(readme).toContain("c05dc685b59ca25e3ca63916ad0b2a7555758bbc");
  });

  it("wires the elevator-core wasm bridge", () => {
    const html = readFileSync(resolve(SKYSTACK_DIR, "Tower.html"), "utf-8");
    // Wasm bootstrap module imports the shared bundle.
    expect(html).toMatch(
      /<script\s+type="module">[\s\S]*import\s+init,\s*\{\s*WasmSim\s*\}\s*from\s*"\.\.\/pkg\/elevator_wasm\.js"/,
    );
    expect(html).toContain("window.wasmReady");
    // SkystackWasm namespace is the JS-side bridge.
    expect(html).toContain("SkystackWasm");
    expect(html).toContain("reconcileTopology");
    expect(html).toContain("requestRide");
    // rebuildElevators triggers the bridge.
    expect(html).toMatch(/SkystackWasm\.reconcileTopology\(\)/);
    // simMinute drives the wasm sim and drains events when ready.
    expect(html).toMatch(/SkystackWasm\.tickAll\(/);
    expect(html).toMatch(/SkystackWasm\.drainEvents\(\)/);
  });
});
