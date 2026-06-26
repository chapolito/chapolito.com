#!/usr/bin/env bash
# chapolito.com — quality-preserving video minify (see .cursor/skills/minify-videos/SKILL.md)
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  minify-videos.sh tile  INPUT.mp4 [OUTPUT.tile.mp4]
  minify-videos.sh detail INPUT.mp4 [OUTPUT.mp4]

If OUTPUT is omitted, replaces INPUT in place.
Requires ffmpeg on PATH.
EOF
  exit 1
}

[[ $# -ge 2 ]] || usage

preset="$1"
input="$2"
output="${3:-$input}"

[[ -f "$input" ]] || { echo "Input not found: $input" >&2; exit 1; }

width="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$input")"

work="$(mktemp "${TMPDIR:-/tmp}/chapolito-minify.XXXXXX.mp4")"
cleanup() { rm -f "$work"; }
trap cleanup EXIT

case "$preset" in
  tile)
    if [[ "$width" -le 720 ]]; then
      vf="fps=24"
    else
      vf="scale='min(720,iw)':-2:flags=lanczos,fps=24"
    fi
    crf=21
    ;;
  detail)
    if [[ "$width" -le 960 ]]; then
      vf="scale='min(960,iw)':-2:flags=lanczos,fps=30"
    else
      vf="scale='min(1280,iw)':-2:flags=lanczos,fps=30"
    fi
    crf=20
    ;;
  *)
    usage
    ;;
esac

echo "Minifying ($preset, CRF $crf): $input -> $output"
ffmpeg -y -hide_banner -loglevel error -i "$input" \
  -vf "$vf" \
  -c:v libx264 -preset slow -crf "$crf" \
  -pix_fmt yuv420p -movflags +faststart -an \
  "$work"

before="$(stat -f%z "$input" 2>/dev/null || stat -c%s "$input")"
mv "$work" "$output"
trap - EXIT
after="$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output")"

python3 - "$before" "$after" <<'PY'
import sys
def fmt(n):
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {u}" if u == "B" else f"{n:.1f} {u}"
        n /= 1024
b, a = int(sys.argv[1]), int(sys.argv[2])
pct = 100 - (a / b * 100) if b else 0
print(f"Done: {fmt(b)} -> {fmt(a)} ({pct:.0f}% smaller)")
PY
