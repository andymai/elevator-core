// Audit-pass screenshot harness. Snaps the playground at two viewports
// (375 wide with the iPhone 14 device descriptor, 1440 wide desktop)
// across the states the UX audit cares about: cold-start, each
// scenario's happy-path single-pane, default compare-pane, tweak-drawer
// open (empty + with overrides), and scenario-config-details expanded.
//
// NOTE: WebKit binaries shipped with Playwright link against Ubuntu's
// libicu .so.74 which Fedora doesn't ship; mobile captures fall back to
// Chromium with the iPhone 14 device descriptor (touch + UA + viewport).
// Real iOS Safari verification still belongs on a physical device.
//
// Usage (from playground/, with `pnpm dev` running on :5173):
//   node scripts/audit-screenshots.mjs before
//   node scripts/audit-screenshots.mjs after
//
// Output: playground/.screenshots/audit/<before|after>/<viewport>__<scene>.png

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const MODE = process.argv[2] ?? "before";
if (!["before", "after"].includes(MODE)) {
  console.error(`mode must be "before" or "after", got: ${MODE}`);
  process.exit(1);
}

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:5173";
const OUT_DIR = new URL(`../.screenshots/audit/${MODE}/`, import.meta.url).pathname;

const SCENARIOS = [
  { id: "convention-burst", strategy: "etd" },
  { id: "skyscraper-sky-lobby", strategy: "look" },
  { id: "space-elevator", strategy: "scan" },
  { id: "airport-apm", strategy: "scan" },
];

const SCENES = [
  {
    name: "cold-start",
    url: `${BASE}/`,
    // No pause — capture the first paint, animations still settling.
    skipPause: true,
  },
  ...SCENARIOS.map((s) => ({
    name: `scenario__${s.id}`,
    url: `${BASE}/?s=${s.id}&c=0&a=${s.strategy}`,
  })),
  {
    name: "compare-default",
    url: `${BASE}/?s=skyscraper-sky-lobby&c=1`,
  },
  {
    name: "scenario-config-expanded",
    url: `${BASE}/?s=skyscraper-sky-lobby&c=0&a=look`,
    async setup(page) {
      await page
        .locator("#scenario-config-details > summary")
        .click()
        .catch(() => {});
      await page.waitForTimeout(200);
    },
  },
  {
    name: "tweak-drawer-empty",
    url: `${BASE}/?s=skyscraper-sky-lobby&c=0&a=look`,
    async setup(page) {
      await page
        .locator("#tweak")
        .click()
        .catch(() => {});
      await page.waitForTimeout(250);
    },
  },
  {
    name: "tweak-drawer-with-overrides",
    // Permalink with explicit overrides so the drawer has values to show.
    url: `${BASE}/?s=skyscraper-sky-lobby&c=0&a=look&o.speed=4&o.traffic=1.5`,
    async setup(page) {
      await page
        .locator("#tweak")
        .click()
        .catch(() => {});
      await page.waitForTimeout(250);
    },
  },
  {
    name: "scenario-picker-open",
    url: `${BASE}/?s=skyscraper-sky-lobby&c=0&a=look`,
    async setup(page) {
      // The scenario picker is the cards strip at the top; capture its
      // resting state plus a hover-ish look on the first non-active card.
      await page
        .locator("#scenario-cards .scenario-card")
        .nth(1)
        .hover()
        .catch(() => {});
      await page.waitForTimeout(150);
    },
  },
];

async function snap(context, scene, label) {
  const page = await context.newPage();
  try {
    await page.goto(scene.url, { waitUntil: "networkidle" });
    if (!scene.skipPause) {
      await page
        .getByRole("button", { name: /^(pause|play)$/i })
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(400);
    } else {
      await page.waitForTimeout(250);
    }
    if (scene.setup) await scene.setup(page);
    const path = join(OUT_DIR, `${label}__${scene.name}.png`);
    await page.screenshot({ path, fullPage: true });
    return path;
  } finally {
    await page.close();
  }
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
    viewport: { width: 375, height: 812 },
  });

  const captured = [];
  try {
    for (const scene of SCENES) {
      captured.push(await snap(desktop, scene, "desktop-1440"));
      captured.push(await snap(mobile, scene, "mobile-375"));
    }
  } finally {
    await browser.close();
  }
  console.log(`Captured ${captured.length} → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
