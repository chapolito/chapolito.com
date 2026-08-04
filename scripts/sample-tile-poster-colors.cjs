#!/usr/bin/env node
/**
 * Sample an average color from the first frame of each home tile video.
 * Prints suggested posterColor values for projects.js — does not write files.
 *
 * Usage: node scripts/sample-tile-poster-colors.cjs
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

const TILES = [
  { id: "quest-people", file: "images/quest-vr/people-tab.tile.mp4" },
  { id: "horizon-mobile", file: "images/home/Gaming-Profile.tile.mp4" },
  { id: "portal-voice", file: "images/home/FB-Watch.tile.mp4" },
  { id: "portal-household", file: "images/home/Householde-Mode.tile.mp4" },
  { id: "horizon-chat", file: "images/home/World-Comms.tile.mp4" }
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
      "scale=8:8",
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

for (const tile of TILES) {
  const abs = path.join(ROOT, tile.file);
  const color = avgColor(abs);
  console.log(`${tile.id}\t${color}\t${tile.file}`);
}
