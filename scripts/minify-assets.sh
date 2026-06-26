#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$HOME/.agents/skills/minify-assets/scripts/minify-all-assets.sh" --root "$ROOT" "$@"
