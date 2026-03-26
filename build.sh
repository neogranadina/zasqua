#!/bin/bash
set -e

# Zasqua frontend local build script.
# CI builds run in GitHub Actions — see .github/workflows/deploy.yml.
# This script is a convenience for running the full pipeline locally.
#
# Downloads exported data from B2, builds the site with Eleventy,
# then indexes with Pagefind.
#
# Required environment variables:
#   B2_APPLICATION_KEY_ID  — read-only key ID for zasqua-export bucket
#   B2_APPLICATION_KEY     — read-only application key

# Increase Node heap for large Eleventy builds (free tier has 8 GB)
export NODE_OPTIONS="--max-old-space-size=7168"

echo "=== Installing B2 CLI ==="
pip install b2[full] --quiet

echo "=== Authenticating with B2 ==="
b2 account authorize "$B2_APPLICATION_KEY_ID" "$B2_APPLICATION_KEY"

echo "=== Downloading export data ==="
mkdir -p data/children data/entity-links data/place-links

b2 file download b2://zasqua-export/descriptions.json data/descriptions.json
b2 file download b2://zasqua-export/repositories.json data/repositories.json
b2 sync b2://zasqua-export/children/ data/children/

echo "=== Data downloaded ==="
ls -lh data/descriptions.json data/repositories.json
echo "Children files: $(ls data/children/ | wc -l)"

echo "=== Downloading entity and place data ==="
b2 file download b2://zasqua-export/entities.json data/entities.json
b2 file download b2://zasqua-export/places.json data/places.json
b2 file download b2://zasqua-export/entity_links.json data/entity_links.json
b2 file download b2://zasqua-export/place_links.json data/place_links.json
ls -lh data/entities.json data/places.json data/entity_links.json data/place_links.json

echo "=== Pre-computing entity/place link shards and index files ==="
node scripts/precompute-links.js
echo "Entity shards: $(ls data/entity-links/ | wc -l)"
echo "Place shards: $(ls data/place-links/ | wc -l)"
ls -lh data/entity-index.json data/place-index.json

echo "=== Pre-computing entity co-occurrence graph ==="
node scripts/precompute-cooccurrence.js
ls -lh data/entity-cooccurrence.json

echo "=== Installing npm dependencies ==="
npm ci

echo "=== Building site ==="
npx eleventy

echo "=== Indexing with Pagefind ==="
npx pagefind --site _site

echo "=== Build complete ==="
echo "Pages: $(find _site -name 'index.html' | wc -l)"
echo "Site size: $(du -sh _site | cut -f1)"
