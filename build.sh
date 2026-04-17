#!/bin/bash
# Zasqua Frontend Local Build Script
#
# Runs the end-to-end pipeline on a developer machine the way CI would: it
# pulls the current data exports from Backblaze B2 (a low-cost object store),
# runs the link-precomputation step, builds the Eleventy site, and then
# indexes it three times with Pagefind (one index per discovery surface:
# descriptions, entity explorer, place explorer). GitHub Actions runs the
# same pipeline in CI — see `.github/workflows/deploy.yml` — so this script
# is meant for local iteration, not production.
#
# Pipeline context: writes all downloaded and derived data under `exports/`
# (renamed from `data/` in Phase 13 so Hugo's default `data/` directory can
# host small UI strings without colliding with the 900 MB archive export).
# The Eleventy output lands in `_site/`; Plan 05 rewires this to Hugo.
#
# Required environment variables:
#   B2_APPLICATION_KEY_ID  — read-only key ID for zasqua-export bucket
#   B2_APPLICATION_KEY     — read-only application key
#
# Version: v1.0.0
set -e

# Increase Node heap for large Eleventy builds (free tier has 8 GB)
export NODE_OPTIONS="--max-old-space-size=7168"

echo "=== Installing B2 CLI ==="
pip install b2[full] --quiet

echo "=== Authenticating with B2 ==="
b2 account authorize "$B2_APPLICATION_KEY_ID" "$B2_APPLICATION_KEY"

echo "=== Downloading export data ==="
mkdir -p exports/children exports/entity-links exports/place-links

b2 file download b2://zasqua-export/descriptions.json exports/descriptions.json
b2 file download b2://zasqua-export/repositories.json exports/repositories.json
b2 sync b2://zasqua-export/children/ exports/children/

echo "=== Data downloaded ==="
ls -lh exports/descriptions.json exports/repositories.json
echo "Children files: $(ls exports/children/ | wc -l)"

echo "=== Downloading entity and place data ==="
b2 file download b2://zasqua-export/entities.json exports/entities.json
b2 file download b2://zasqua-export/places.json exports/places.json
b2 file download b2://zasqua-export/entity_links.json exports/entity_links.json
b2 file download b2://zasqua-export/place_links.json exports/place_links.json
ls -lh exports/entities.json exports/places.json exports/entity_links.json exports/place_links.json

echo "=== Pre-computing entity/place link shards and index files ==="
node scripts/precompute-links.js
echo "Entity shards: $(ls exports/entity-links/ | wc -l)"
echo "Place shards: $(ls exports/place-links/ | wc -l)"
ls -lh exports/entity-index.json exports/place-index.json

echo "=== Installing npm dependencies ==="
npm ci

echo "=== Building CSS with Tailwind ==="
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  TW_BINARY="tailwindcss-macos-arm64"
elif [ "$ARCH" = "x86_64" ] && [ "$(uname -s)" = "Darwin" ]; then
  TW_BINARY="tailwindcss-macos-x64"
else
  TW_BINARY="tailwindcss-linux-x64"
fi
if [ ! -f ./tailwindcss ]; then
  curl -sLO "https://github.com/tailwindlabs/tailwindcss/releases/latest/download/$TW_BINARY"
  chmod +x "$TW_BINARY"
  mv "$TW_BINARY" tailwindcss
fi
./tailwindcss -i src/css/input.css -o src/css/main.css --minify

echo "=== Building site ==="
npx eleventy

echo "=== Indexing with Pagefind (three indices) ==="
# Run 1: Description search index
npx pagefind --site _site --output-subdir pagefind \
  --exclude-selectors "[data-pagefind-entity-page],[data-pagefind-place-page]"

# Run 2: Entity explorer index
npx pagefind --site _site --output-subdir pagefind-entities \
  --glob "ne-*/**/*.html"

# Run 3: Place explorer index
npx pagefind --site _site --output-subdir pagefind-places \
  --glob "nl-*/**/*.html"

echo "=== Build complete ==="
echo "Pages: $(find _site -name 'index.html' | wc -l)"
echo "Site size: $(du -sh _site | cut -f1)"
