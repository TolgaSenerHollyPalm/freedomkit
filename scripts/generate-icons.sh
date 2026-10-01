#!/bin/sh
# Renders the PNG app icons from public/favicon.svg with macOS's built-in sips.
# npm run icons -- drawing.svg uses that file for the maskable icon: full bleed, content in the middle 80%.
set -eu
maskable="${1:-}"
case "$maskable" in '' | /*) ;; *) maskable="$PWD/$maskable" ;; esac
cd "$(dirname "$0")/../public"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# Android cuts its own shape out of a maskable icon; without a drawing for it, square off the favicon's corners.
if [ -n "$maskable" ]; then cp "$maskable" "$tmp/maskable.svg"; else sed 's/ rx="112"//' favicon.svg > "$tmp/maskable.svg"; fi

sips -s format png -z 192 192 favicon.svg --out pwa-192x192.png >/dev/null
sips -s format png -z 512 512 favicon.svg --out pwa-512x512.png >/dev/null
sips -s format png -z 512 512 "$tmp/maskable.svg" --out maskable-icon-512x512.png >/dev/null
sips -s format png -z 180 180 "$tmp/maskable.svg" --out apple-touch-icon-180x180.png >/dev/null
