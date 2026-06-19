#!/usr/bin/env node
const { chromium } = require("playwright");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "exports/paper");
const base = process.env.BASE_URL || "http://localhost:8080";
const width = Number(process.env.VIEWPORT_WIDTH) || 1440;

async function capture(page, url, outName, waitMs) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(waitMs);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(height, 12000) });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, outName),
    fullPage: true,
  });
  const meta = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  return meta;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 900 } });

  const homeMeta = await capture(
    page,
    `${base}/concepts/v1/`,
    "home-v1.png",
    1200
  );
  const householdMeta = await capture(
    page,
    `${base}/concepts/v1/portal-household/`,
    "portal-household-v1.png",
    800
  );

  await browser.close();
  console.log(JSON.stringify({ homeMeta, householdMeta, outDir }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
