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
});
