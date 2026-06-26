#!/usr/bin/env node
/**
 * Deploy chapolito.com to staging or production S3.
 *
 * Usage:
 *   aws login
 *   npm run deploy:staging
 *   npm run deploy:prod
 *
 * Optional env:
 *   AWS_PROFILE                 CLI profile (or set awsProfile in deploy.config.local.json)
 *   DEPLOY_DRY_RUN=1            preview sync without uploading
 *   SKIP_INVALIDATION=1         skip CloudFront cache purge (prod only)
 *   SKIP_REDIRECTS=1            skip CloudFront legacy redirect update (prod only)
 */

const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const targetName = process.argv[2];

const SYNC_EXCLUDES = [
  ".git/*",
  "scripts/*",
  "README.md",
  "node_modules/*",
  ".cursor/*",
  "package-lock.json",
  "package.json",
  "AGENTS.md",
  "**/.DS_Store",
];

function loadConfig() {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, "deploy.config.json"), "utf8"));
  const localPath = path.join(__dirname, "deploy.config.local.json");
  if (fs.existsSync(localPath)) {
    Object.assign(base, JSON.parse(fs.readFileSync(localPath, "utf8")));
  }
  return base;
}

function run(cmd, args, opts = {}) {
  console.log(`\n→ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function awsBaseArgs(config) {
  const args = [];
  const profile = process.env.AWS_PROFILE || config.awsProfile;
  if (profile) {
    args.push("--profile", profile);
  }
  if (config.region) {
    args.push("--region", config.region);
  }
  return args;
}

function awsJson(config, commandArgs) {
  const out = execFileSync("aws", [...awsBaseArgs(config), ...commandArgs], { encoding: "utf8" });
  return JSON.parse(out || "{}");
}

function excludeArgs(extra = []) {
  return [...SYNC_EXCLUDES, ...extra].flatMap((pattern) => ["--exclude", pattern]);
}

const HTML_SKIP_DIRS = new Set([".git", "node_modules", "scripts", ".cursor"]);

function collectHtmlFiles(dir, files = [], rel = "") {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      if (HTML_SKIP_DIRS.has(name)) {
        continue;
      }
      collectHtmlFiles(abs, files, relPath);
    } else if (name.endsWith(".html")) {
      if (relPath.startsWith(".well-known/")) {
        continue;
      }
      files.push(relPath);
    }
  }
  return files;
}

function uploadHtmlFiles(config, target, { dryRun, cacheControl }) {
  const files = collectHtmlFiles(ROOT);
  for (const rel of files) {
    const args = [
      "s3",
      "cp",
      path.join(ROOT, rel),
      `s3://${target.bucket}/${rel}`,
      "--cache-control",
      cacheControl,
      "--content-type",
      "text/html",
    ];
    if (dryRun) {
      args.push("--dryrun");
    }
    run("aws", [...awsBaseArgs(config), ...args]);
  }
}

function syncToS3(config, target, { dryRun, cacheControl }) {
  const args = [
    "s3",
    "sync",
    ROOT,
    `s3://${target.bucket}/`,
    ...excludeArgs(target.preserveWellKnown ? [".well-known/*"] : []),
    "--cache-control",
    cacheControl,
    "--exclude",
    "*.html",
    "--delete",
  ];

  if (dryRun) {
    args.push("--dryrun");
  }

  run("aws", [...awsBaseArgs(config), ...args]);
}

function smokeCheck(url, { expectRedirect } = {}) {
  const out = execFileSync("curl", ["-sI", url], { encoding: "utf8" });
  const status = out.match(/^HTTP\/\S+ (\d+)/m)?.[1];
  if (!status) {
    throw new Error(`No HTTP status from ${url}`);
  }
  if (expectRedirect) {
    if (status !== "301" && status !== "302") {
      throw new Error(`${url} expected redirect, got ${status}`);
    }
  } else if (status[0] !== "2") {
    throw new Error(`${url} expected 2xx, got ${status}`);
  }
  const cacheControl = out.match(/^cache-control:\s*(.+)$/im)?.[1]?.trim();
  console.log(`  ${url} → ${status}${cacheControl ? ` (cache-control: ${cacheControl})` : ""}`);
}

function main() {
  if (!targetName || !["staging", "prod"].includes(targetName)) {
    console.error("Usage: node scripts/deploy.cjs <staging|prod>");
    process.exit(1);
  }

  const config = loadConfig();
  const target = config.targets[targetName];
  if (!target?.bucket) {
    console.error(`Unknown or misconfigured deploy target: ${targetName}`);
    process.exit(1);
  }

  const dryRun = process.env.DEPLOY_DRY_RUN === "1";
  const skipInvalidation = process.env.SKIP_INVALIDATION === "1";
  const skipRedirects = process.env.SKIP_REDIRECTS === "1";

  console.log(`Deploying to ${targetName}: s3://${target.bucket}/`);
  if (dryRun) {
    console.log("(dry run — no uploads)");
  }

  try {
    awsJson(config, ["sts", "get-caller-identity"]);
  } catch {
    console.error("AWS CLI not authenticated. Run: aws login");
    process.exit(1);
  }

  if (!dryRun) {
    run("node", ["scripts/generate-home-routes.cjs"]);
    run("npm", ["run", "vendor:three"]);
  } else {
    console.log("\n→ (skipping generate:home-routes and vendor:three in dry run)");
  }

  console.log(`\nSyncing assets (cache-control: ${config.cacheControl.assets}) ...`);
  syncToS3(config, target, {
    dryRun,
    cacheControl: config.cacheControl.assets,
  });

  console.log(`\nUploading HTML (cache-control: ${config.cacheControl.html}) ...`);
  uploadHtmlFiles(config, target, {
    dryRun,
    cacheControl: config.cacheControl.html,
  });

  if (targetName === "prod" && !dryRun) {
    if (!skipRedirects && target.cloudFrontDistributionId) {
      console.log("\nUpdating CloudFront legacy redirects ...");
      run("node", ["scripts/apply-cloudfront-redirects.cjs"], {
        env: {
          ...process.env,
          CLOUDFRONT_DISTRIBUTION_ID: target.cloudFrontDistributionId,
        },
      });
    }

    if (!skipInvalidation && target.cloudFrontDistributionId) {
      console.log("\nInvalidating CloudFront cache ...");
      const invalidation = awsJson(config, [
        "cloudfront",
        "create-invalidation",
        "--distribution-id",
        target.cloudFrontDistributionId,
        "--paths",
        "/*",
      ]);
      console.log(`  invalidation ${invalidation.Invalidation?.Id} (${invalidation.Invalidation?.Status})`);
    }
  }

  if (!dryRun && target.url) {
    console.log("\nSmoke checks ...");
    smokeCheck(`${target.url}/`);
    smokeCheck(`${target.url}/about/`);
    if (targetName === "prod") {
      smokeCheck(`${target.url}/free-design-resources/`, { expectRedirect: true });
    }
  }

  console.log(`\nDeploy to ${targetName} complete.`);
  if (target.url) {
    console.log(target.url);
  }
}

main();
