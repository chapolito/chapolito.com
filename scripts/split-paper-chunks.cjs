#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const chunks = require("../exports/paper/chunks.json");
const out = path.join(__dirname, "../exports/paper/chunks");
fs.mkdirSync(out, { recursive: true });
["home", "household"].forEach(function (key) {
  chunks[key].chunks.forEach(function (chunk, i) {
    const slug = chunk.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    fs.writeFileSync(path.join(out, `${key}-${i}-${slug}.html`), chunk.html);
  });
});
console.log("split", chunks.home.chunks.length + chunks.household.chunks.length, "files to", out);
