---
name: deploy
description: >-
  Deploy chapolito.com to staging or production on AWS S3 (and CloudFront for
  prod). Use when the user asks to deploy, ship, publish, go live, sync to S3,
  update staging, or push to production. Always deploy staging first unless the
  user explicitly requests production only.
disable-model-invocation: true
---

# Deploy (chapolito.com)

Manual, intentional deploys to existing AWS infrastructure. Do not use the AWS Deployments plugin for routine file sync — use the repo scripts instead.

## Prerequisites

- AWS CLI authenticated (`aws login` or configured profile)
- Config in `scripts/deploy.config.json` (committed)
- Optional machine override: `scripts/deploy.config.local.json` (gitignored) for `awsProfile`

## Targets

| Command | Bucket | URL | CloudFront |
|---------|--------|-----|------------|
| `npm run deploy:staging` | `staging.chapolito.com` | http://staging.chapolito.com | None |
| `npm run deploy:prod` | `www.chapolito.com` | https://www.chapolito.com | `E2ZNQK8QHKTTQ9` |

Region: `us-east-1`

## Workflow

1. **Staging first** — `npm run deploy:staging`, then smoke-test in the browser (home grid, About overlay, a project deep link).
2. **Production** — only after user confirms staging looks good: `npm run deploy:prod`.

The deploy script automatically:

1. Regenerates `/{project-id}/` and `/about/` deep-link copies (`generate:home-routes`)
2. Vendors Three.js min builds (`vendor:three`)
3. Syncs **assets** with `Cache-Control: public, max-age=86400` (stable filenames — do not use immutable/long TTL)
4. Syncs **HTML** with `Cache-Control: no-cache` (fixes stale shell after LinkedIn/external link clicks)
5. **Prod only:** updates CloudFront legacy redirect function and invalidates `/*`
6. Runs `curl` smoke checks

Prod sync preserves `.well-known/pki-validation/` (SSL domain validation).

## Commands

```bash
aws login
npm run deploy:staging
# review http://staging.chapolito.com
npm run deploy:prod
```

Preview without uploading:

```bash
DEPLOY_DRY_RUN=1 npm run deploy:staging
```

Skip CloudFront steps on prod (emergency content-only push):

```bash
SKIP_REDIRECTS=1 SKIP_INVALIDATION=1 npm run deploy:prod
```

Custom AWS profile (prefer `deploy.config.local.json`):

```bash
AWS_PROFILE=chapolito npm run deploy:prod
```

## What not to upload

The sync excludes dev-only paths: `.git/`, `scripts/`, `node_modules/`, `.cursor/`, `package.json`, `README.md`, `AGENTS.md`, etc. See `scripts/deploy.cjs`.

## Legacy redirects

Prod legacy paths (`/free-design-resources/`, old `/portal/`, etc.) 301 to home via CloudFront Function `chapolito-legacy-redirects`. The deploy script republishes it automatically. Config: `scripts/cloudfront-legacy-redirects.js`.

Staging has no CloudFront — do not expect legacy redirects there.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Old site on external link click, new on refresh | Missing `Cache-Control` on HTML | Redeploy with `deploy:prod` (sets `no-cache` on `*.html`) |
| CloudFront still serving old HTML after deploy | Edge cache | Prod deploy invalidates `/*`; wait ~1 min |
| `aws: command not found` / auth errors | Expired session | `aws login` |
| Stale CSS/JS after deploy | Asset TTL + stable filenames | Prod invalidation handles this; or bump asset cache in config |

## Credentials

Never commit AWS access keys. Profile name only in `deploy.config.local.json` if needed. Keys live in `~/.aws/credentials`.
