---
name: minify-videos
description: >-
  Audit and re-encode MP4/WebM videos for chapolito.com with quality-preserving
  FFmpeg settings (tile vs detail presets). Use when the user asks to minify,
  compress, optimize, or shrink videos, create .tile.mp4 variants, reduce home
  grid video payload, or re-encode case study media.
---

# Minify videos (chapolito.com)

Re-encode portfolio videos for web delivery without the mushy look from aggressive compression. Prefer **automatic execution** with these defaults — only spin up a side-by-side review page when the user asks to preview first.

## Prerequisites

- `ffmpeg` and `ffprobe` on PATH (Homebrew: `brew install ffmpeg`)
- Source files live under `images/`

## Two presets (do not mix)

| Preset | Use for | Max width | FPS | CRF | Preset |
|--------|---------|-----------|-----|-----|--------|
| **tile** | Home bento grid, small looping clips | 720px | 24 | 21 | slow |
| **detail** | Case study overlays, hero, full-width reader | 1280px (960px if clip is already ≤960px wide) | 30 | 20 | slow |

**Tile** when: filename ends in `.tile.mp4`, or `projects.js` / `index.html` `tileVideoSrc()` will serve it on the home grid.

**Detail** when: `projects.js` `detail` sections, legacy case study `<video>` tags, or any full-width in-page media.

If a file is already at the target resolution, fps ≤ target, and under ~1 Mbps — **skip re-encoding**.

## FFmpeg commands

Shared flags for all encodes: `-c:v libx264 -pix_fmt yuv420p -movflags +faststart -an` (UI screen recordings have no useful audio).

### Tile

```bash
ffmpeg -y -i "INPUT.mp4" \
  -vf "scale='min(720,iw)':-2:flags=lanczos,fps=24" \
  -c:v libx264 -preset slow -crf 21 \
  -pix_fmt yuv420p -movflags +faststart -an \
  "OUTPUT.tile.mp4"
```

If source is already ≤720px wide and only bitrate/fps is bloated:

```bash
ffmpeg -y -i "INPUT.mp4" \
  -vf "fps=24" \
  -c:v libx264 -preset slow -crf 21 \
  -pix_fmt yuv420p -movflags +faststart -an \
  "OUTPUT.tile.mp4"
```

### Detail

```bash
# width > 960px
ffmpeg -y -i "INPUT.mp4" \
  -vf "scale='min(1280,iw)':-2:flags=lanczos,fps=30" \
  -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -movflags +faststart -an \
  "OUTPUT.mp4"

# width ≤ 960px
ffmpeg -y -i "INPUT.mp4" \
  -vf "scale='min(960,iw)':-2:flags=lanczos,fps=30" \
  -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -movflags +faststart -an \
  "OUTPUT.mp4"
```

### Quality escape hatch

If output looks soft after spot-checking, re-run at **CRF 18** (same scale/fps). Do not go above CRF 22 for tiles or CRF 21 for detail.

## chapolito.com conventions

- Home grid rewrites `foo.mp4` → `foo.tile.mp4` in `index.html` (`tileVideoSrc`). Either point `projects.js` tile `src` at an existing `*.tile.mp4` or produce `basename.tile.mp4` next to the source.
- Tile display is roughly 480–720px wide — do not scale below 720px width for tile encodes.
- After replacing files, run `git diff --stat` on `images/` and confirm sizes dropped via `ls -lh`.
- Do **not** add a CSS build step or new frameworks. This is asset-only work.

## Default workflow (no review requested)

1. **Audit** — find referenced videos:
   ```bash
   rg '\.(mp4|webm)' javascripts/ index.html --glob '*.js' --glob '*.html'
   find images -iname '*.mp4' -exec ls -lh {} \; | sort -k5 -hr
   ```
2. **Classify** each referenced file as tile, detail, or skip.
3. **Encode in place** via temp file, then atomic replace:
   ```bash
   ffmpeg ... /tmp/out.mp4 && mv /tmp/out.mp4 images/path/file.mp4
   ```
4. When a tile shares the same clip as a full file (e.g. `people-tab.mp4` / `people-tab.tile.mp4`), encode once and copy to both paths if appropriate.
5. **Commit** only when the user asks.

## Optional review page (user requests preview)

Only when the user wants to compare before swapping:

1. Encode to `/tmp/chapolito-video-review/encoded/`
2. Symlink originals into `/tmp/chapolito-video-review/original/`
3. Serve with `python3 -m http.server 8765 --directory /tmp/chapolito-video-review`
4. Use native `controls` on `<video>` elements. Sync play/pause/seek only — **never** sync on `timeupdate` (causes frozen frames).
5. After approval: copy encodes into `images/`, delete `/tmp/chapolito-video-review`, kill the server.

## What causes bad results (avoid)

- CRF 28+, tiny resolution, or `preset veryfast`
- Leaving 60/120/240 fps screen captures untouched
- Re-encoding already-good `*.tile.mp4` files that are <1 MB and 24 fps

## Helper script

`scripts/minify-videos.sh` wraps the presets:

```bash
scripts/minify-videos.sh tile  images/quest-vr/people-tab.mp4 images/quest-vr/people-tab.tile.mp4
scripts/minify-videos.sh detail images/quest-vr/people-tab-loop.mp4
```

See script for `tile` | `detail` usage and in-place output when output path is omitted.
