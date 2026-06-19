#!/usr/bin/env node
/**
 * Copy concepts/bento-bulge/index.html into concepts/bento-bulge/{project-id}/index.html
 * so direct URLs like /concepts/bento-bulge/portal-household/ work on static hosts (S3).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shellIndex = path.join(root, "concepts/bento-bulge/index.html");
const projectsJs = fs.readFileSync(path.join(root, "concepts/shared/projects.js"), "utf8");
const ids = [...projectsJs.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);

if (!ids.length) {
  console.error("No project ids found in concepts/shared/projects.js");
  process.exit(1);
}

if (!fs.existsSync(shellIndex)) {
  console.error("Missing concepts/bento-bulge/index.html");
  process.exit(1);
}

const template = fs.readFileSync(shellIndex, "utf8");
ids.forEach((id) => {
  const dir = path.join(root, "concepts/bento-bulge", id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), template);
  console.log("wrote concepts/bento-bulge/" + id + "/index.html");
});

const aboutDir = path.join(root, "concepts/bento-bulge/about");
fs.mkdirSync(aboutDir, { recursive: true });
fs.writeFileSync(path.join(aboutDir, "index.html"), template);
console.log("wrote concepts/bento-bulge/about/index.html");
