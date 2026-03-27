---
phase: 05-pmtiles-infrastructure
plan: 02
subsystem: infra
tags: [ci, tippecanoe, pmtiles, r2, cloudflare-worker, github-actions]

requires:
  - phase: 05-01
    provides: scripts/places-to-geojson.js for GeoJSON conversion
provides:
  - .github/workflows/deploy.yml — CI steps for Tippecanoe install, PMTiles generation, and zasqua-map-tiles R2 upload
  - build.sh — optional local tile generation step with command -v guard
  - worker/worker.js — /tiles/ route with Range request handling (same-origin, no CORS)
  - worker/wrangler.toml — TILES R2 binding to zasqua-map-tiles bucket
affects: [place-detail-pages, place-explorer]

tech-stack:
  added: [tippecanoe==2.72.0 (CI, via pip)]
  patterns:
    - Same-origin tile serving via /tiles/ path on site Worker — no CORS needed
    - R2 Range request handling in Worker for PMTiles byte-range reads
    - Tippecanoe installed via pip (not apt) on ubuntu-latest

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml
    - build.sh
    - worker/worker.js
    - worker/wrangler.toml
    - scripts/places-to-geojson.js
    - README.md
  deleted:
    - worker-tiles/ (replaced by /tiles/ route in site Worker)

key-decisions:
  - "Serve tiles from site Worker /tiles/ path instead of separate Worker — eliminates CORS entirely (same-origin), no tiles.zasqua.org custom domain needed, one Worker with two R2 bindings"
  - "R2 bucket named zasqua-map-tiles per user preference"
  - "GeoJSON script accepts both latitude/longitude (raw export) and lat/lon (pre-computed) field names"
  - "Tippecanoe pinned to 2.72.0 in CI for reproducible builds"

patterns-established:
  - "Site Worker handles /tiles/ prefix with R2 Range reads — future tile sets added to zasqua-map-tiles bucket appear at /tiles/{name}"
  - "Local build always generates GeoJSON; tile generation optional (command -v tippecanoe guard)"

requirements-completed: [BUILD-04, BUILD-05]

duration: ~30min
completed: 2026-03-26
---

# Phase 05 Plan 02: CI Pipeline + Same-Origin Tile Serving Summary

**CI pipeline generates PMTiles and uploads to R2; site Worker serves tiles at /tiles/ with HTTP 206 Range support — verified on production**

## Performance

- **Duration:** ~30 min (including architectural pivot and manual verification)
- **Completed:** 2026-03-26
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 6 (+1 deleted directory)

## Accomplishments

- `deploy.yml` updated with three new steps: Install Tippecanoe (pip==2.72.0), Generate PMTiles, Upload to zasqua-map-tiles R2 bucket via boto3
- `build.sh` updated with optional local tile generation (GeoJSON always written, Tippecanoe only if installed)
- Site Worker (`worker/worker.js`) extended with `/tiles/` route handling Range requests from zasqua-map-tiles R2 bucket
- `worker-tiles/` directory removed — no longer needed
- `scripts/places-to-geojson.js` updated to accept both `latitude`/`longitude` and `lat`/`lon` field names
- `README.md` updated with current data files, hosting section, and local tile generation docs

## Architectural Pivot

**Original plan:** Separate `worker-tiles/` Worker at `tiles.zasqua.org` with CORS headers.

**What shipped:** `/tiles/` route on the existing site Worker. User-driven decision that simplified the architecture:
- No separate Worker to deploy/manage
- No custom domain or DNS record needed
- No CORS needed (same-origin)
- Eliminates the Firefox/Safari CORS gap blocker from STATE.md

## Task Commits

1. **Task 1: CI pipeline + build.sh** — `9a2e7b9`
2. **Site Worker /tiles/ route + worker-tiles removal** — `d63065c`
3. **GeoJSON field name fix** — `e1fbf5b`
4. **README update** — `3420f50`

## Verification (Human Checkpoint — Passed)

- PMTiles generated locally from real data: 5,574 features, 1.9 MB
- Uploaded to zasqua-map-tiles R2 via `wrangler r2 object put --remote`
- Worker deployed with SITE + TILES bindings
- `curl -H "Range: bytes=0-512" https://zasqua.org/tiles/zasqua-places` → **HTTP 206**, content-range: bytes 0-512/1954896, accept-ranges: bytes
- Same-origin: no CORS testing needed (Firefox/Safari blocker resolved by architecture)

## Issues Encountered

- `workers.dev` domain returns error 1042 on /tiles/ (R2 binding restriction) — not an issue, production uses custom domain
- GeoJSON script field name mismatch between raw export and pre-computed data — fixed

## Self-Check: PASSED

- .github/workflows/deploy.yml contains Tippecanoe + PMTiles + R2 upload steps — FOUND
- build.sh contains places-to-geojson + tippecanoe guard — FOUND
- worker/worker.js contains handleTiles + Range handling — FOUND
- worker/wrangler.toml contains TILES binding to zasqua-map-tiles — FOUND
- HTTP 206 from zasqua.org/tiles/zasqua-places — VERIFIED

---
*Phase: 05-pmtiles-infrastructure*
*Completed: 2026-03-26*
