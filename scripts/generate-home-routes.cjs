#!/usr/bin/env node
/**
 * Copy index.html into {project-id}/index.html at the site root
 * so direct URLs like /portal-household/ work on static hosts (S3).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shellIndex = path.join(root, "index.html");
const projectsJs = fs.readFileSync(path.join(root, "javascripts/projects.js"), "utf8");
const ids = [...projectsJs.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);

if (!ids.length) {
  console.error("No project ids found in javascripts/projects.js");
  process.exit(1);
}

if (!fs.existsSync(shellIndex)) {
  console.error("Missing index.html");
  process.exit(1);
}

const template = fs.readFileSync(shellIndex, "utf8");
ids.forEach((id) => {
  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), template);
  console.log("wrote " + id + "/index.html");
});
