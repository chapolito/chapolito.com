#!/usr/bin/env node
/**
 * Publish (and optionally attach) the legacy-path CloudFront Function.
 *
 * Usage:
 *   aws login   # if your session is expired
 *   node scripts/apply-cloudfront-redirects.cjs
 *
 * Optional env:
 *   CLOUDFRONT_FUNCTION_NAME  default: chapolito-legacy-redirects
 *   CLOUDFRONT_DISTRIBUTION_ID  if set, attaches viewer-request on default behavior
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const functionName = process.env.CLOUDFRONT_FUNCTION_NAME || "chapolito-legacy-redirects";
const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || "";
const codePath = path.join(__dirname, "cloudfront-legacy-redirects.js");
const code = fs.readFileSync(codePath, "utf8");

function awsJson(args) {
  const out = execFileSync("aws", args, { encoding: "utf8" });
  return JSON.parse(out || "{}");
}

function aws(args, inherit) {
  execFileSync("aws", args, inherit ? { stdio: "inherit" } : { encoding: "utf8" });
}

let etag;

try {
  const existing = awsJson(["cloudfront", "describe-function", "--name", functionName]);
  console.log(`Updating CloudFront function ${functionName} ...`);
  const updated = awsJson([
    "cloudfront",
    "update-function",
    "--name",
    functionName,
    "--if-match",
    existing.ETag,
    "--function-config",
    "Comment=301 legacy portfolio paths to home,Runtime=cloudfront-js-2.0",
    "--function-code",
    code,
  ]);
  etag = updated.ETag;
} catch (err) {
  if (!String(err.stderr || err.message).includes("NoSuchFunctionExists")) throw err;
  console.log(`Creating CloudFront function ${functionName} ...`);
  const created = awsJson([
    "cloudfront",
    "create-function",
    "--name",
    functionName,
    "--function-config",
    "Comment=301 legacy portfolio paths to home,Runtime=cloudfront-js-2.0",
    "--function-code",
    code,
  ]);
  etag = created.ETag;
}

console.log("Publishing function ...");
const published = awsJson(["cloudfront", "publish-function", "--name", functionName, "--if-match", etag]);
const functionArn = published.FunctionSummary.FunctionMetadata.FunctionARN;
console.log(`Published: ${functionArn}`);

if (!distributionId) {
  console.log(`
No CLOUDFRONT_DISTRIBUTION_ID set — function is published but not attached.

In the AWS console: CloudFront → your distribution → Behaviors → Default (*)
→ Edit → Viewer request → CloudFront Functions → ${functionName}

Or re-run with:
  CLOUDFRONT_DISTRIBUTION_ID=E123EXAMPLE node scripts/apply-cloudfront-redirects.cjs
`);
  process.exit(0);
}

console.log(`Attaching to distribution ${distributionId} (default cache behavior) ...`);
const dist = awsJson(["cloudfront", "get-distribution-config", "--id", distributionId]);
const config = dist.DistributionConfig;
const etagDist = dist.ETag;
const defaultBehavior = config.DefaultCacheBehavior;

defaultBehavior.FunctionAssociations = {
  Quantity: 1,
  Items: [
    {
      FunctionARN: functionArn,
      EventType: "viewer-request",
    },
  ],
};

const configFile = path.join(__dirname, ".cloudfront-distribution-config.json");
fs.writeFileSync(configFile, JSON.stringify(config));
aws(
  [
    "cloudfront",
    "update-distribution",
    "--id",
    distributionId,
    "--if-match",
    etagDist,
    "--distribution-config",
    `file://${configFile}`,
  ],
  true
);
fs.unlinkSync(configFile);

console.log("Distribution update submitted (propagation takes a few minutes).");
