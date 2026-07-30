#!/usr/bin/env node
/**
 * Bundle the bento-bulge WebGL graph (incl. Three) into one ESM file so
 * deploy/start don't pay the multi-module discovery waterfall.
 */
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
    legalComments: "none"
  })
  .then(() => {
    console.log(`built ${path.relative(ROOT, outfile)}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
