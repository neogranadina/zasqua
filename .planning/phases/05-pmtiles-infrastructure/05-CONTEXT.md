# Phase 5: PMTiles Infrastructure - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A dedicated Cloudflare Worker serves PMTiles from R2 with correct Range request handling and CORS headers, verified end-to-end on the production domain. This phase delivers tile generation, a new Worker, CI integration, and verification — no map UI, no explorer pages, no detail page templates.

</domain>

<decisions>
## Implementation Decisions

### Tile Worker Domain & Routing
- **D-01:** Tiles are served from a dedicated subdomain: `tiles.zasqua.org`
- **D-02:** The tiles Worker is completely separate from the site Worker (`zasqua-site`). No modifications to the existing site Worker
- **D-03:** MapLibre tile URLs in downstream phases will reference `https://tiles.zasqua.org/zasqua-places.pmtiles`

### Tippecanoe Tile Generation
- **D-04:** Tippecanoe runs in CI only (GitHub Actions), generating PMTiles from `places.json` during the deploy workflow
- **D-05:** Minimal tile properties — each point feature carries only `place_code` and `display_name`. The explorer page already loads `place-index.json` into memory for filtering and metadata; tiles are a rendering layer, not a data source

### Worker Deployment & Repo Location
- **D-06:** The tiles Worker code lives in `worker-tiles/` in this repo, alongside the existing `worker/` folder
- **D-07:** Deployed separately via `cd worker-tiles && npx wrangler deploy` — same pattern as the site Worker

### CI Pipeline Integration
- **D-08:** PMTiles generation and R2 upload are added to the existing `deploy.yml` workflow. Tiles regenerated on every deploy, always in sync with place data
- **D-09:** Dedicated R2 bucket (`zasqua-tiles`) for PMTiles, bound to the tiles Worker. Clean separation from site files — no risk of the upload script interfering with tile data

### Claude's Discretion
- Zoom level range for Tippecanoe (e.g. z0–z14) — whatever produces reasonable file size for 8,177 points
- Tippecanoe clustering/drop strategy at low zoom levels
- Worker caching strategy (Cache API, cache-control headers) — follow the site Worker pattern where applicable
- GeoJSON conversion script approach (places.json → GeoJSON for Tippecanoe input)
- R2 upload method for the .pmtiles file in CI (b2 CLI, wrangler r2, or boto3)
- Whether to install Tippecanoe from source or use a pre-built binary/Docker image in CI

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Infrastructure
- `worker/worker.js` — Existing site Worker pattern (fetch handler, content-type mapping, cache strategy)
- `worker/wrangler.toml` — Existing Worker config pattern (R2 binding, compatibility date)
- `.github/workflows/deploy.yml` — Current CI pipeline (add tile generation and upload steps)
- `build.sh` — Local build script (may need tile generation step for local testing)

### Data
- `.planning/PROJECT.md` §Context — Place data: 8,177 places, 5,574 with coordinates, fields include latitude/longitude
- `.planning/REQUIREMENTS.md` — BUILD-04 (Tippecanoe generation), BUILD-05 (dedicated Worker with Range + CORS)

### Prior Decisions
- `.planning/phases/04-build-pipeline-data-pre-compute/04-CONTEXT.md` — D-07 defines place-index.json fields (place_code, display_name, place_type, lat, lon, etc.)
- `.planning/STATE.md` §Blockers — "Protomaps Worker + custom domain CORS chain has known gap; allow extra debug time; test Firefox and Safari"

### Research
- `.planning/research/PITFALLS.md` — PMTiles CORS pitfalls and known issues
- `.planning/research/STACK.md` — Version compatibility for PMTiles/MapLibre/Protomaps
- `.planning/research/ARCHITECTURE.md` — Build pipeline architecture including tile generation step

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `worker/worker.js` — Site Worker pattern: fetch handler with R2 binding, content-type mapping, Cache API edge caching. Tiles Worker can follow the same structure but add Range request handling
- `worker/wrangler.toml` — Config pattern: Worker name, R2 binding, compatibility date. Tiles Worker needs its own wrangler.toml with a separate R2 binding
- `scripts/upload-to-r2.py` — Parallel R2 upload script using boto3. Could be referenced for tile upload, though a single file upload may be simpler

### Established Patterns
- Workers deployed via `cd worker && npx wrangler deploy` with `CLOUDFLARE_ACCOUNT_ID` from env
- R2 buckets bound to Workers via `[[r2_buckets]]` in wrangler.toml
- CI secrets: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` already configured
- Cache purge via Cloudflare API after deploy (tiles may need similar)

### Integration Points
- `deploy.yml` — New steps needed: install Tippecanoe, convert places.json to GeoJSON, run Tippecanoe, upload .pmtiles to R2
- `worker-tiles/` — New directory: worker.js, wrangler.toml
- Cloudflare DNS — CNAME record for `tiles.zasqua.org` pointing to the tiles Worker
- R2 — New bucket `zasqua-tiles` must be created in Cloudflare dashboard before first deploy

</code_context>

<specifics>
## Specific Ideas

- The tiles Worker must handle HTTP Range requests (return 206 Partial Content) — this is how PMTiles/MapLibre fetches tile data on demand from a single archive file
- CORS headers must allow requests from `zasqua.org` — the site makes cross-origin fetches to `tiles.zasqua.org`
- Test Range request handling and CORS in both Firefox and Safari — known pain points per STATE.md blocker
- Only places with coordinates (5,574 of 8,177) should be included in the tileset

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-pmtiles-infrastructure*
*Context gathered: 2026-03-26*
