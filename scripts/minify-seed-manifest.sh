#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$HOME/.agents/skills/minify-assets/scripts/minify-seed-manifest.sh" --root "$ROOT" "$@"
