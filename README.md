# chapolito.com

Static design portfolio for Jesse O'Chapo, deployed to Amazon S3.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Home / portfolio grid |
| `about/`, `contact/` | Site pages |
| `horizon/`, `quest-vr/`, `quest-for-business/`, `portal/`, `messenger-kids/`, `life360/`, `the-wiki-game/`, `fanpics/`, `spritzr/` | Case studies |
| `free-design-resources/` | Legacy blog-style resource posts |
| `stylesheets/all.css` | Compiled site styles (formerly Middleman `all.css`) |
| `javascripts/all.js` | Site JS (smooth page transitions, scroll animations) |
| `images/`, `fonts/` | Static assets |
| `.well-known/` | SSL domain validation (keep when syncing to S3) |

Pages load jQuery, SmoothState, and FastClick from CDNs with local fallbacks under `javascripts/vendor/`.

## Local preview

Use the included static server (handles `/about` → `about/index.html`, which SmoothState needs):

```bash
cd "/path/to/s3 sync"
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
cd "/path/to/s3 sync"
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

Before syncing, regenerate concept v1 project routes (copies `concepts/v1/index.html` into each `concepts/v1/{project-id}/index.html` so direct URLs work on refresh):

```bash
node scripts/generate-v1-routes.cjs
```

Sync the site root to your bucket (adjust bucket name and profile):

```bash
aws s3 sync . s3://your-bucket-name/ --exclude ".git/*" --exclude "scripts/*" --exclude "README.md"
```

## Maintenance notes

This tree was exported from a [Middleman](https://middlemanapp.com/) build. Fingerprints like `all-26efebbe.css` were stripped so filenames are stable for editing in Cursor. The cleanup script lives at `scripts/cleanup-middleman-hashes.pl` if you need to re-run similar logic on a future S3 pull.
