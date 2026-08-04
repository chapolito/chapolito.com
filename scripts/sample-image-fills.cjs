#!/usr/bin/env node
/**
 * Sample average colors from case-study (and optionally About) still images.
 * Prints suggested fill values — does not write files.
 *
 * Usage: node scripts/sample-image-fills.cjs
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

const FILES = [
  "images/horizon/emotes-menu-vr.jpg",
  "images/portal/facebook-on-portal/FB-Live-TV.jpg",
  "images/portal/facebook-on-portal/FB-Live-woman-on-portal.jpg",
  "images/portal/facebook-on-portal/FB-Watch-browse.jpg",
  "images/portal/facebook-on-portal/FB-Watch-loading-screen.jpg",
  "images/portal/facebook-on-portal/FB-Watch-prototype.jpg",
  "images/portal/facebook-on-portal/FB-Watch-tv-icon.jpg",
  "images/portal/household-mode/Household-Mode-label.jpg",
  "images/portal/household-mode/Household-mode-discovery.jpg",
  "images/portal/household-mode/household-mode-specs.png",
  "images/portal/meta-accounts/Meta-accounts-across-devices.jpg",
  "images/portal/meta-accounts/Meta-accounts-login.jpg",
  "images/portal/meta-accounts/Meta-accounts-setup-confirmation.jpg",
  "images/about/jesse-ochapo-portrait.jpg",
  "images/about/photos/surfing.jpg",
  "images/about/photos/wood-handle.jpg",
  "images/about/photos/diving-with-manta-rays.jpg",
  "images/about/photos/jesse-and-caito.jpg",
  "images/about/photos/scalloped-wood.jpg",
  "images/about/photos/coffee-table-wave.jpg",
  "images/about/career/starcraft.jpg",
  "images/about/career/mtv.jpg",
  "images/about/career/meta.jpg",
  "images/about/career/oculus-vr.jpg",
  "images/about/career/whats-next.jpg"
];

function avgColor(absPath) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      absPath,
      "-vframes",
      "1",
      "-vf",
      "scale=8:8:flags=bicubic",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-"
    ],
    { encoding: "buffer", maxBuffer: 1024 * 1024 }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || `ffmpeg failed for ${absPath}`);
  }
  const data = result.stdout;
  let r = 0;
  let g = 0;
  let b = 0;
  const n = data.length / 3;
  for (let i = 0; i < data.length; i += 3) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

for (const file of FILES) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    console.log(`MISSING\t/${file}`);
    continue;
  }
  console.log(`${avgColor(abs)}\t/${file}`);
}
