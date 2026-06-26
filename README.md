# chapolito.com

Static design portfolio for Jesse O'Chapo, deployed to Amazon S3.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Home — bento bulge portfolio grid with overlay project reader |
| `/{project-id}/` | Deep links to home + open project overlay (generated copies of `index.html`) |
| `about/` | Deep link to home + open About overlay (generated copy of `index.html`) |
| `404.html` | Not-found page (links back to home and About) |
| `stylesheets/` | Modular CSS — `tokens.css`, `home.css`, `bento-bulge.css`, `detail-view.css`, `about.css`, etc. |
| `javascripts/` | `bento-bulge/` (ES modules + Three.js) and `projects.js` (case study content) |
| `images/` | Static assets (raster, vector, video) |
| `.well-known/` | SSL domain validation (keep when syncing to S3) |

## Local preview

Use the included static server (serves `/about/` and project deep links like `/portal-household/`):

```bash
cd "/path/to/chapolito/chapolito.com"
npm start
# open http://localhost:8080
```

## Git setup

If `git` is not available yet, install Apple’s command line tools:

```bash
xcode-select --install
```

Then initialize the repo:

```bash
cd "/path/to/chapolito/chapolito.com"
git init
git add .
git commit -m "Initial import of chapolito.com static site from S3."
```

After cleanup changes:

```bash
git add -A
git commit -m "Remove Middleman fingerprint hashes and duplicate build artifacts."
```

## Deploying to S3

Deploy is manual and intentional. Staging first, production after review.

```bash
aws login
npm run deploy:staging
# review http://staging.chapolito.com
npm run deploy:prod
```

The deploy script (`scripts/deploy.cjs`) regenerates deep-link routes, vendors Three.js, syncs with correct `Cache-Control` headers (HTML: `no-cache`, assets: 1-day TTL), and on production updates CloudFront legacy redirects and invalidates the CDN cache.

Config: `scripts/deploy.config.json`. Optional machine-specific AWS profile: `scripts/deploy.config.local.json` (gitignored), e.g. `{ "awsProfile": "chapolito" }`.

Preview without uploading: `DEPLOY_DRY_RUN=1 npm run deploy:staging`

### Legacy URL redirects

Removed sections (`/free-design-resources/`, old `/portal/`, `/horizon/`, etc.) should 301 to home so bookmarks and search results do not 404.

**If the site is behind CloudFront** (typical for `https://chapolito.com`), use a CloudFront Function — S3 routing rules are ignored when the origin is the S3 REST API endpoint:

```bash
aws login   # refresh credentials if needed
node scripts/apply-cloudfront-redirects.cjs
# optional: attach to your distribution in one step
CLOUDFRONT_DISTRIBUTION_ID=E123EXAMPLE node scripts/apply-cloudfront-redirects.cjs
```

**If you serve directly from the S3 static website endpoint**, apply bucket routing rules instead:

```bash
aws login
S3_BUCKET=www.chapolito.com npm run apply:s3-redirects
```

Config lives in `scripts/s3-website-config.json` and `scripts/cloudfront-legacy-redirects.js`. Live routes (`/portal-voice/`, `/horizon-chat/`, `/quest-people/`, etc.) are excluded from redirects.

## Maintenance notes

This tree was exported from a [Middleman](https://middlemanapp.com/) build. Fingerprints like `all-26efebbe.css` were stripped so filenames are stable for editing in Cursor. The cleanup script lives at `scripts/cleanup-middleman-hashes.pl` if you need to re-run similar logic on a future S3 pull.
