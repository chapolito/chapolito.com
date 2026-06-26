#!/usr/bin/env node
/**
 * Copy index.html into {project-id}/index.html and about/index.html
 * so direct URLs like /portal-household/ and /about/ work on static hosts (S3).
 * Each copy gets route-specific title and meta tags for crawlers and link previews.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const shellIndex = path.join(root, "index.html");
const projectsJs = fs.readFileSync(path.join(root, "javascripts/projects.js"), "utf8");

const sandbox = { window: {} };
vm.runInNewContext(`${projectsJs}\n;globalThis.window = window;`, sandbox);
const projects = sandbox.window.PROJECTS || [];

if (!projects.length) {
  console.error("No projects found in javascripts/projects.js");
  process.exit(1);
}

if (!fs.existsSync(shellIndex)) {
  console.error("Missing index.html");
  process.exit(1);
}

const SITE_ORIGIN = "https://www.chapolito.com";
const HOME = {
  title: "Portfolio of Jesse O'Chapo",
  description: "Chapolito.com is the portfolio of Product Designer Jesse O'Chapo.",
  url: `${SITE_ORIGIN}/`,
};
const ABOUT = {
  title: "About · Jesse O'Chapo",
  description:
    "Jesse O'Chapo is a Principal Product Designer at Meta, based in Santa Cruz, CA. Previously Life360, Fanpics, and MTV.",
  url: `${SITE_ORIGIN}/about/`,
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function projectRouteMeta(project) {
  const lede = project.detail && project.detail.lede;
  return {
    title: `${project.title} · Jesse O'Chapo`,
    description: lede || `${project.title} — a case study by Product Designer Jesse O'Chapo.`,
    url: `${SITE_ORIGIN}/${encodeURIComponent(project.id)}/`,
  };
}

function applyRouteMeta(html, meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${description}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${title}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${description}" />`
    )
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
}

const template = fs.readFileSync(shellIndex, "utf8");

projects.forEach((project) => {
  const dir = path.join(root, project.id);
  fs.mkdirSync(dir, { recursive: true });
  const html = applyRouteMeta(template, projectRouteMeta(project));
  fs.writeFileSync(path.join(dir, "index.html"), html);
  console.log("wrote " + project.id + "/index.html");
});

const aboutDir = path.join(root, "about");
fs.mkdirSync(aboutDir, { recursive: true });
fs.writeFileSync(path.join(aboutDir, "index.html"), applyRouteMeta(template, ABOUT));
console.log("wrote about/index.html");

console.log("home shell remains at index.html (" + HOME.title + ")");
