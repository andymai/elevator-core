// Screenshot harness for the playground. Spins up Chromium at two
// viewports (desktop 1440×900, iPhone 14 390×844), loads the preview
// server, and captures a handful of scenes per viewport so a visual
// polish pass has something concrete to diff against.
//
// Usage: from playground/ run `pnpm snap` (which starts `vite preview`
// and invokes this script). Output: playground/.screenshots/<scene>.png
//
// Adding scenes: push into SCENES with {name, url, setup?}. The setup
// callback gets (page) and can click, type, etc. after navigation.

import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = new URL("../.screenshots/", import.meta.url).pathname;
const BASE = process.env.SNAP_BASE_URL ?? "http://localhost:4173";

// Scenes build on each other via query-string permalinks — the
// playground's own share mechanism. Keeps scenes deterministic across
// runs and independent of any mutation we might have done in a prior
// scene.
const SCENES = [
  {
    name: "default-compare",
    url: `${BASE}/`,
  },
  {
    name: "skyscraper-single",
    // `c=0` forces single-pane mode; everything else inherits defaults.
    url: `${BASE}/?s=skyscraper-sky-lobby&c=0&a=look`,
  },
  {
    name: "convention-single",
    url: `${BASE}/?s=convention-burst&c=0&a=etd`,
  },
  {
    name: "space-elevator",
    url: `${BASE}/?s=space-elevator&c=0&a=scan`,
  },
  {
    name: "strategy-popover-open",
    url: `${BASE}/?s=skyscraper-sky-lobby&c=0&a=scan`,
    // Open the strategy popover on pane A to capture its styling.
    // The chip is the first `.strategy-chip` that isn't the "sub"
    // (park-strategy) variant.
    async setup(page) {
      await page.locator(".strategy-chip:not(.strategy-chip-sub)").first().click();
      // Let the scale-in animation settle.
      await page.waitForTimeout(300);
    },
  },
];

async function snapOne(context, scene, label) {
  const page = await context.newPage();
  await page.goto(scene.url, { waitUntil: "networkidle" });
  // Pause the sim before snapping so the canvas state is deterministic
  // frame-to-frame — shaves a visual-diff source of noise.
  await page
    .getByRole("button", { name: /^(pause|play)$/i })
    .first()
    .click()
    .catch(() => {});
  // Let the first frame land + any entry animations complete.
  await page.waitForTimeout(400);
  if (scene.setup) await scene.setup(page);
  const path = join(OUT_DIR, `${label}__${scene.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await page.close();
  return path;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const mobile = await browser.newContext({
    ...devices["iPhone 14"],
  });

  const outputs = [];
  for (const scene of SCENES) {
    outputs.push(await snapOne(desktop, scene, "desktop"));
    outputs.push(await snapOne(mobile, scene, "mobile"));
  }

  await browser.close();

  await writeFile(
    join(OUT_DIR, "index.json"),
    JSON.stringify({ capturedAt: new Date().toISOString(), files: outputs }, null, 2),
  );
  console.log(`Captured ${outputs.length} screenshots → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
