#!/usr/bin/env node
/**
 * Copy concepts/v1/index.html into concepts/v1/{project-id}/index.html
 * so direct URLs like /concepts/v1/portal-household/ work on static hosts (S3).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const v1Index = path.join(root, "concepts/v1/index.html");
const projectsJs = fs.readFileSync(path.join(root, "concepts/shared/projects.js"), "utf8");
const ids = [...projectsJs.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map(function (m) {
  return m[1];
});

if (!ids.length) {
  console.error("No project ids found in concepts/shared/projects.js");
  process.exit(1);
}

const template = fs.readFileSync(v1Index, "utf8");
ids.forEach(function (id) {
  const dir = path.join(root, "concepts/v1", id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), template);
  console.log("wrote concepts/v1/" + id + "/index.html");
});
