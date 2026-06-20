# chapolito.com

Static design portfolio for Jesse O'Chapo, deployed to Amazon S3.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Home — bento bulge portfolio grid with overlay project reader |
| `/{project-id}/` | Deep links to home + open project overlay (generated copies of `index.html`) |
| `about/` | Redirects to `/#about` on the home page |
| `contact/` | Site pages |
| `horizon/`, `quest-vr/`, etc. | Legacy case studies |
| `stylesheets/` | Site CSS — `all.css` for legacy pages; `tokens.css`, `home.css`, `bento-bulge.css`, etc. for home |
| `javascripts/` | Site JS — `all.js` for legacy; `bento-bulge/` + `projects.js` for home |
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

Before syncing, regenerate home project routes (copies `index.html` into each `/{project-id}/index.html` so direct URLs work on refresh):

```bash
node scripts/generate-home-routes.cjs
```

Sync the site root to your bucket (adjust bucket name and profile):

```bash
aws s3 sync . s3://your-bucket-name/ --exclude ".git/*" --exclude "scripts/*" --exclude "README.md"
```

## Maintenance notes

This tree was exported from a [Middleman](https://middlemanapp.com/) build. Fingerprints like `all-26efebbe.css` were stripped so filenames are stable for editing in Cursor. The cleanup script lives at `scripts/cleanup-middleman-hashes.pl` if you need to re-run similar logic on a future S3 pull.
