#!/usr/bin/env node
/**
 * Push exports/paper/chunks/*.html into Paper via MCP write_html.
 * Run from Cursor agent with Paper Desktop open — prints MCP call payloads.
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../exports/paper/chunks");
const homeArtboard = "5-0";
const householdArtboard = "6-0";

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
const queue = files.map((file) => ({
  file,
  targetNodeId: file.startsWith("home-") ? homeArtboard : householdArtboard,
  html: fs.readFileSync(path.join(dir, file), "utf8"),
}));

console.log(JSON.stringify({ count: queue.length, queue: queue.map((q) => ({ file: q.file, targetNodeId: q.targetNodeId, bytes: q.html.length })) }, null, 2));
