#!/usr/bin/env node
/**
 * Apply S3 static website config (index, 404, legacy routing rules).
 *
 * Usage:
 *   S3_BUCKET=www.chapolito.com node scripts/apply-s3-website-config.cjs
 *
 * Note: Routing rules apply when the bucket is accessed via the S3 *website*
 * endpoint. If CloudFront uses the S3 REST API origin, use the CloudFront
 * function script instead (or point the origin at the website endpoint).
 */

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const bucket = process.env.S3_BUCKET;
if (!bucket) {
  console.error("Set S3_BUCKET (e.g. export S3_BUCKET=www.chapolito.com)");
  process.exit(1);
}

const configPath = path.join(__dirname, "s3-website-config.json");

console.log(`Applying website configuration to s3://${bucket} ...`);
execFileSync(
  "aws",
  ["s3api", "put-bucket-website", "--bucket", bucket, "--website-configuration", `file://${configPath}`],
  { stdio: "inherit" }
);

console.log("Done. Verify with:");
console.log(`  aws s3api get-bucket-website --bucket ${bucket}`);
