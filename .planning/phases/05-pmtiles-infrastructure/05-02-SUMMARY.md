---
phase: 05-pmtiles-infrastructure
plan: 02
subsystem: infra
tags: [pmtiles, tippecanoe, r2, cloudflare-worker, ci, github-actions]

requires:
  - phase: 05-01
    provides: scripts/places-to-geojson.js for GeoJSON conversion, worker-tiles/ Protomaps Worker for R2 serving
provides:
  - .github/workflows/deploy.yml — CI steps for Tippecanoe install, GeoJSON conversion, PMTiles generation, and zasqua-tiles R2 upload
  - build.sh — optional local tile generation step with command -v guard
affects: [place-detail-pages, place-explorer, tiles.zasqua.org-verification]

tech-stack:
  added: [tippecanoe==2.72.0 (CI, via pip)]
  patterns:
    - Tippecanoe installed via pip (not apt) on ubuntu-latest — avoids stale Ubuntu package
    - PMTiles R2 upload via boto3 single PUT (reuses existing CI credentials and client setup)
    - Local build guards with `command -v tippecanoe` — GeoJSON always generated, tile generation optional

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml
    - build.sh

key-decisions:
  - "Tippecanoe pinned to 2.72.0 in CI for reproducible builds (per research Open Question 3)"
  - "Three new steps placed after Pre-compute co-occurrence graph and before Install npm dependencies — consistent with Phase 04 decision that pre-compute steps go before npm install"
  - "boto3 single PUT used for R2 upload (already installed, reuses existing R2 credentials)"

patterns-established:
  - "Tile generation in CI uses pip-installed Tippecanoe, not apt (Ubuntu 24.04 apt package is stale)"
  - "Local build script always generates GeoJSON but skips tile generation if Tippecanoe not installed"

requirements-completed: [BUILD-04, BUILD-05]

duration: 2min
completed: 2026-03-26
---

# Phase 05 Plan 02: PMTiles CI Pipeline Integration Summary

**Tippecanoe install, GeoJSON conversion, and zasqua-places.pmtiles R2 upload wired into deploy.yml; optional local tile generation added to build.sh**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T23:38:45Z
- **Completed:** 2026-03-26T23:39:50Z
- **Tasks:** 1 completed (Task 2 is checkpoint:human-verify, awaiting manual verification)
- **Files modified:** 2

## Accomplishments

- `deploy.yml` updated with three new steps in correct order: Install Tippecanoe (pip==2.72.0), Generate PMTiles (places-to-geojson.js + tippecanoe), Upload PMTiles to R2 (boto3 PUT to zasqua-tiles bucket)
- `build.sh` updated with optional local tile generation — GeoJSON always written, Tippecanoe run only if installed
- No existing CI steps touched — site Worker deploy, Eleventy build, Pagefind, R2 site upload, and cache purge all unchanged

## Task Commits

1. **Task 1: Add PMTiles generation and upload to CI pipeline** - `9a2e7b9` (feat)

## Files Created/Modified

- `.github/workflows/deploy.yml` — Three new steps after "Pre-compute co-occurrence graph": Install Tippecanoe, Generate PMTiles, Upload PMTiles to R2
- `build.sh` — Added PMTiles generation block after co-occurrence step, with `command -v tippecanoe` guard for optional local execution

## Decisions Made

- **Tippecanoe version pinned to 2.72.0**: Per research Open Question 3 recommendation — reproducible CI builds, avoids potential breakage from future PyPI release changes to PMTiles output format.
- **Steps ordered before `npm ci`**: Consistent with Phase 04 decision that pre-compute scripts using Node.js stdlib go before npm install. Tippecanoe is a system binary (pip-installed), not an npm package, so this ordering is correct.
- **boto3 single PUT for R2 upload**: boto3 already installed in CI, S3-compatible credentials already available. Reuses existing `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_ENDPOINT` secrets without adding new tooling.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before Task 2 verification can succeed, three manual steps are required (unchanged from Plan 01 documentation):

1. **Create the `zasqua-tiles` R2 bucket** in Cloudflare Dashboard: R2 Object Storage → Create Bucket → name: `zasqua-tiles`
2. **Deploy the Worker once**: `cd worker-tiles && npx wrangler deploy`
3. **Assign `tiles.zasqua.org` custom domain** to the `zasqua-tiles` Worker: Workers & Pages → zasqua-tiles → Settings → Domains & Routes → Add Custom Domain → `tiles.zasqua.org`

After setup, trigger a CI run to generate and upload the PMTiles file, then verify HTTP 206 + CORS responses per Task 2 verification steps.

## Next Phase Readiness

- CI pipeline is complete — tiles will be generated and uploaded on every deploy once the R2 bucket exists
- Verification at `tiles.zasqua.org` (Task 2 checkpoint) gates readiness for place detail page development (Phase 6)
- Known CORS/Range gap in STATE.md: test Firefox and Safari explicitly during Task 2 verification, per Pitfall 1 in RESEARCH.md

## Self-Check: PASSED

- .github/workflows/deploy.yml contains 'Install Tippecanoe' — FOUND
- .github/workflows/deploy.yml contains 'Generate PMTiles' — FOUND
- .github/workflows/deploy.yml contains 'Upload PMTiles to R2' — FOUND
- .github/workflows/deploy.yml contains 'zasqua-tiles' — FOUND
- build.sh contains 'places-to-geojson' — FOUND
- build.sh contains 'command -v tippecanoe' — FOUND
- Commit 9a2e7b9 — FOUND

---
*Phase: 05-pmtiles-infrastructure*
*Completed: 2026-03-26*
