---
phase: 05-pmtiles-infrastructure
plan: 01
subsystem: infra
tags: [pmtiles, geojson, cloudflare-worker, r2, tippecanoe, maplibre]

requires: []
provides:
  - scripts/places-to-geojson.js — converts places.json to GeoJSON FeatureCollection for Tippecanoe
  - worker-tiles/src/index.ts — Protomaps Cloudflare Worker serving PMTiles from R2 with Range + CORS
  - worker-tiles/wrangler.toml — Worker config binding BUCKET to zasqua-tiles R2 bucket
  - worker-tiles/package.json + tsconfig.json — Worker npm/TypeScript setup
affects: [05-02, place-detail-pages, place-explorer]

tech-stack:
  added: [pmtiles@^4.3.0, wrangler@^4.0.0 (worker-tiles devDep)]
  patterns:
    - Protomaps Worker template inlined (shared helpers copied into standalone worker-tiles/src/index.ts)
    - GeoJSON conversion: stdlib-only Node.js script, no new root dependencies
    - Separate worker-tiles/ directory alongside worker/ — no cross-contamination (D-02, D-06)

key-files:
  created:
    - scripts/places-to-geojson.js
    - worker-tiles/src/index.ts
    - worker-tiles/wrangler.toml
    - worker-tiles/package.json
    - worker-tiles/tsconfig.json
    - worker-tiles/package-lock.json
  modified:
    - .gitignore (added worker-tiles/node_modules/ and worker-tiles/.wrangler/ exclusions)

key-decisions:
  - "Inlined pmtiles_path and tile_path from protomaps/PMTiles shared/index.ts — the upstream index.ts imports via ../../shared/index (monorepo-relative path) which cannot resolve from standalone worker-tiles/; inlining keeps the Worker self-contained with no extra npm package"
  - "worker-tiles/node_modules/ added to .gitignore — root .gitignore only excluded node_modules/ at root level"

patterns-established:
  - "Worker code lives in its own directory (worker-tiles/) with its own package.json — never modify worker/ (D-02)"
  - "GeoJSON conversion scripts use stdlib only (no npm deps) and follow precompute-links.js conventions: 'use strict', DATA_DIR env var, bracketed log prefix, descriptive output"

requirements-completed: [BUILD-04, BUILD-05]

duration: 3min
completed: 2026-03-26
---

# Phase 05 Plan 01: PMTiles Infrastructure Core Artifacts Summary

**GeoJSON conversion script (places.json → FeatureCollection, lon-first coordinates) and Protomaps Cloudflare Worker (R2 Range requests + CORS for zasqua.org) — the two core artifacts for PMTiles infrastructure**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-26T23:33:27Z
- **Completed:** 2026-03-26T23:36:03Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `scripts/places-to-geojson.js` reads places.json, filters to coordinate-bearing places, writes GeoJSON FeatureCollection with `[lon, lat]` coordinates (per GeoJSON spec) and minimal properties (place_code, display_name per D-05)
- `worker-tiles/` directory created with complete Protomaps Worker setup: src/index.ts (canonical implementation with shared helpers inlined), wrangler.toml (zasqua-tiles R2 binding, ALLOWED_ORIGINS=https://zasqua.org), package.json (pmtiles@^4.3.0), tsconfig.json (ES2022/strict), and package-lock.json from npm install
- Existing `worker/` directory untouched per D-02

## Task Commits

1. **Task 1: Create GeoJSON conversion script** - `f8f145d` (feat)
2. **Task 2: Create Protomaps tiles Worker** - `543c3b0` (feat)

## Files Created/Modified

- `scripts/places-to-geojson.js` — Reads data/places.json, filters null-coordinate places, writes data/places.geojson as GeoJSON FeatureCollection
- `worker-tiles/src/index.ts` — Protomaps Cloudflare Worker with R2 Range reads, CORS (Vary: Origin), Cache API, ETag; shared helpers inlined
- `worker-tiles/wrangler.toml` — Worker config: name=zasqua-tiles, bucket_name=zasqua-tiles, ALLOWED_ORIGINS=https://zasqua.org, CACHE_CONTROL=public,max-age=86400
- `worker-tiles/package.json` — npm manifest with pmtiles dep and wrangler devDep
- `worker-tiles/tsconfig.json` — TypeScript config: ES2022 target, bundler resolution, @cloudflare/workers-types
- `worker-tiles/package-lock.json` — lock file from npm install (37 packages)
- `.gitignore` — added worker-tiles/node_modules/ and worker-tiles/.wrangler/

## Decisions Made

- **Inlined protomaps/PMTiles shared helpers:** The upstream `src/index.ts` uses `import { pmtiles_path, tile_path } from "../../shared/index"` — a monorepo-relative path. Inlining the two small functions (20 lines total) makes `worker-tiles/` fully self-contained without adding an npm package. The inlined code is verbatim from the upstream shared module.
- **Added .gitignore entries for worker-tiles subdirectory:** The root `.gitignore` only matched `node_modules/` at the repo root; `worker-tiles/node_modules/` required an explicit entry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inlined protomaps/PMTiles shared helper functions**
- **Found during:** Task 2 (Create Protomaps tiles Worker)
- **Issue:** The fetched `src/index.ts` imports `{ pmtiles_path, tile_path }` from `../../shared/index` — a path relative to the Protomaps monorepo structure. This path cannot resolve from `worker-tiles/src/index.ts` in a standalone directory; wrangler would fail to bundle.
- **Fix:** Fetched the shared module source from GitHub, inlined `pmtiles_path` and `tile_path` (and their supporting regex constants) directly into `worker-tiles/src/index.ts` with a comment explaining the origin. All other Worker logic is verbatim from the upstream template.
- **Files modified:** `worker-tiles/src/index.ts`
- **Verification:** File contains pmtiles import, tile_path, and pmtiles_path — wrangler can bundle without unresolvable monorepo path
- **Committed in:** `543c3b0` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added worker-tiles/node_modules/ to .gitignore**
- **Found during:** Task 2, post-npm install check
- **Issue:** Root `.gitignore` only excluded `node_modules/` at root level; `worker-tiles/node_modules/` (37 packages) would have been committed
- **Fix:** Added `worker-tiles/node_modules/` and `worker-tiles/.wrangler/` to `.gitignore`
- **Files modified:** `.gitignore`
- **Committed in:** `543c3b0` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. The monorepo import fix prevents a build failure on first `wrangler deploy`; the gitignore fix prevents accidental commit of node_modules. No scope creep.

## Issues Encountered

None beyond the two deviations documented above.

## User Setup Required

Before the tiles Worker can be deployed and tested, two manual steps are required:

1. **Create the `zasqua-tiles` R2 bucket** — in the Cloudflare dashboard (or `wrangler r2 bucket create zasqua-tiles`). The bucket does not exist yet (per research Environment Availability table). Without this, the first CI run will fail with NoSuchBucket.
2. **Assign `tiles.zasqua.org` as custom domain** — in the Cloudflare dashboard: Worker Settings → Domains & Routes → Add Custom Domain. This is required for Cloudflare's Cache API to function; caching is disabled on `*.workers.dev` (Pitfall 2).

See `.planning/phases/05-pmtiles-infrastructure/05-RESEARCH.md` (Pitfall 1, Pitfall 2, Pitfall 5) for details.

## Next Phase Readiness

- `scripts/places-to-geojson.js` is ready for Plan 02 CI pipeline wiring
- `worker-tiles/` is ready for `cd worker-tiles && npx wrangler deploy` once R2 bucket and custom domain are created
- Plan 02 (CI pipeline integration) can proceed without the manual setup steps above — those steps gate the live smoke tests, not the code work

## Self-Check: PASSED

- scripts/places-to-geojson.js — FOUND
- worker-tiles/src/index.ts — FOUND
- worker-tiles/wrangler.toml — FOUND
- worker-tiles/package.json — FOUND
- worker-tiles/tsconfig.json — FOUND
- worker-tiles/package-lock.json — FOUND
- Commit f8f145d — FOUND
- Commit 543c3b0 — FOUND

---
*Phase: 05-pmtiles-infrastructure*
*Completed: 2026-03-26*
