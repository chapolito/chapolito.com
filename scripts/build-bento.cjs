/**
 * Bundle the bento-bulge WebGL graph (incl. Three) into one ESM file so
 * deploy/start don't pay the multi-module discovery waterfall.
 * Named imports from "three" let esbuild tree-shake unused Three code.
 */
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const ROOT = path.join(__dirname, "..");
const entry = path.join(ROOT, "javascripts/bento-bulge/index.js");
const outfile = path.join(ROOT, "javascripts/bento-bulge.bundle.js");

esbuild
  .build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    outfile,
    minify: true,
    target: ["es2020"],
    logLevel: "info",
    legalComments: "none",
    treeShaking: true,
    // Prefer ESM entry so unused Three exports can be dropped.
    mainFields: ["module", "browser", "main"],
    conditions: ["import", "module", "browser", "default"]
  })
  .then(() => {
    const bytes = fs.statSync(outfile).size;
    const kb = (bytes / 1024).toFixed(1);
    console.log(`built ${path.relative(ROOT, outfile)} (${kb} KB)`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
