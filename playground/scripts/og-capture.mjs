// OG image + apple-touch-icon capture. Uses Playwright (already in
// devDependencies for snap.mjs / Playwright tests) to spin up Chromium
// against a running `vite preview` and snap two assets:
//
//   public/og.png             1200×630, social-card preview
//   public/apple-touch-icon.png 180×180, iOS home-screen icon
//
// Usage: from playground/, with `vite preview --port 4173` running, run
//   `pnpm og:capture`
// Or run end-to-end with: `pnpm og:capture:full`
//
// The OG image is captured against a deterministic permalink — same
// scenario, same strategies, same seed — so the asset doesn't drift
// between runs unless the *renderer* itself changed. Re-run after any
// material UI redesign and commit the new PNGs.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const BASE = process.env.OG_BASE_URL ?? "http://localhost:4173";

// Compare-mode permalink: skyscraper, LOOK vs ETD, fixed seed. Picked
// for visual richness — three cars across multiple banks make the
// preview look "alive" rather than empty.
const OG_URL = `${BASE}/?s=skyscraper-sky-lobby&a=look&b=etd&k=otis`;

async function captureOg(browser) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(OG_URL, { waitUntil: "networkidle" });
  // Cars are mid-flight by t=2.5s — the sim auto-runs from boot, so
  // we just let it spin, then click pause once to freeze the frame
  // before snapping. The trailing 150 ms gives the renderer one more
  // RAF tick to settle the now-static canvas. `.catch` swallows the
  // case where the toggle is mid-transition.
  await page.waitForTimeout(2500);
  await page
    .getByRole("button", { name: /^(pause|play)$/i })
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(150);
  const path = join(PUBLIC_DIR, "og.png");
  await page.screenshot({ path, fullPage: false, type: "png" });
  await context.close();
  console.log(`Captured ${path} (1200×630)`);
}

async function captureAppleTouchIcon(browser) {
  // Self-contained 180×180 page: the playground's brand mark on the
  // app's surface color. No app boot, no wasm — pure SVG snap. Mirrors
  // the inline favicon used in <head> so desktop and iOS bookmarks look
  // like the same brand.
  const context = await browser.newContext({
    viewport: { width: 180, height: 180 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  html, body { margin:0; padding:0; background:#0f0f12; width:180px; height:180px; }
  body { display:flex; align-items:center; justify-content:center; }
  svg { width:128px; height:128px; }
</style></head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect x="4" y="2" width="16" height="20" rx="3" fill="#f59e0b"/>
    <rect x="8" y="6" width="8" height="4" rx="0.5" fill="#0f0f12"/>
    <rect x="8" y="14" width="8" height="4" rx="0.5" fill="#0f0f12"/>
  </svg>
</body></html>`;
  await page.setContent(html, { waitUntil: "load" });
  const path = join(PUBLIC_DIR, "apple-touch-icon.png");
  await page.screenshot({ path, fullPage: false, type: "png" });
  await context.close();
  console.log(`Captured ${path} (180×180)`);
}

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    await captureOg(browser);
    await captureAppleTouchIcon(browser);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
