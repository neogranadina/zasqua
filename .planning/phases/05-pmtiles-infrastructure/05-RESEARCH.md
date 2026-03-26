# Phase 5: PMTiles Infrastructure — Research

**Researched:** 2026-03-26
**Domain:** PMTiles tile generation (Tippecanoe), Cloudflare Worker (Range requests + CORS), R2 bucket, CI pipeline
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Tiles served from `tiles.zasqua.org` (dedicated subdomain)
- **D-02:** Tiles Worker completely separate from `zasqua-site` Worker — no modifications to the existing site Worker
- **D-03:** MapLibre tile URLs reference `https://tiles.zasqua.org/zasqua-places.pmtiles`
- **D-04:** Tippecanoe runs in CI only (GitHub Actions), generating PMTiles from `places.json` during deploy workflow
- **D-05:** Minimal tile properties — `place_code` and `display_name` only. Tiles are a rendering layer, not a data source
- **D-06:** Tiles Worker code lives in `worker-tiles/` alongside `worker/`
- **D-07:** Deployed via `cd worker-tiles && npx wrangler deploy`
- **D-08:** PMTiles generation and R2 upload added to existing `deploy.yml`; tiles regenerated on every deploy
- **D-09:** Dedicated R2 bucket `zasqua-tiles` for PMTiles, bound to the tiles Worker

### Claude's Discretion

- Zoom level range for Tippecanoe (e.g. z0–z14) — whatever produces reasonable file size for 8,177 points
- Tippecanoe clustering/drop strategy at low zoom levels
- Worker caching strategy (Cache API, cache-control headers) — follow the site Worker pattern where applicable
- GeoJSON conversion script approach (places.json → GeoJSON for Tippecanoe input)
- R2 upload method for the .pmtiles file in CI (b2 CLI, wrangler r2, or boto3)
- Whether to install Tippecanoe from source or use a pre-built binary/Docker image in CI

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-04 | PMTiles file generated from place coordinate data using Tippecanoe at build time | Tippecanoe install via pip/pipx on GitHub Actions ubuntu-latest; GeoJSON conversion script; `-zg --drop-densest-as-needed` flags for 5,574 points |
| BUILD-05 | Dedicated Cloudflare Worker serves PMTiles with correct Range request handling and CORS headers | Protomaps Worker template (TypeScript, npm, wrangler); R2 binding `BUCKET`; `ALLOWED_ORIGINS` env var; custom domain assignment via Cloudflare dashboard |
</phase_requirements>

---

## Summary

Phase 5 delivers two concrete deliverables: (1) a CI step that converts `places.json` to a PMTiles archive using Tippecanoe and uploads it to a dedicated R2 bucket, and (2) a new Cloudflare Worker at `tiles.zasqua.org` that serves that archive with correct HTTP 206 Range responses and CORS headers.

The Protomaps project maintains a production-ready Cloudflare Worker implementation (`protomaps/PMTiles/serverless/cloudflare`) that handles all of the complexity: R2 range reads, CORS whitelisting, Cache API integration, and ETag-based conditional requests. This is the canonical implementation — the planner should adopt it rather than write range-request handling from scratch. The Worker uses TypeScript and requires a small npm setup, which is different from the existing site Worker (plain JS, no build step), but this is acceptable because `worker-tiles/` is a fully separate directory and deploy pipeline.

For Tippecanoe on GitHub Actions, the recommended approach (March 2026) is `pip install tippecanoe` or `pipx run tippecanoe`, which installs a pre-compiled binary from PyPI. Building from source adds 2–3 minutes to CI. The pip route is fast and reliable on ubuntu-latest (Ubuntu 24.04). For local macOS development, `brew install tippecanoe` remains the standard path.

The most significant risk in this phase is the CORS + Range request chain on a custom domain, which is flagged as a known gap in STATE.md. Firefox and Safari apply stricter CORS enforcement than Chrome on Range requests. The Protomaps Worker template handles this correctly when `ALLOWED_ORIGINS` is set; the main failure mode is deploying on the default `*.workers.dev` hostname instead of assigning the custom domain, which disables Cloudflare's cache layer entirely.

**Primary recommendation:** Adopt the Protomaps Cloudflare Worker template verbatim, configure `ALLOWED_ORIGINS = "https://zasqua.org"`, and assign `tiles.zasqua.org` as a custom domain in the Worker settings before any cross-browser testing.

---

## Standard Stack

### Core

| Tool/Library | Version | Purpose | Why Standard |
|---|---|---|---|
| tippecanoe (via PyPI) | 2.72.0+ (PyPI) | GeoJSON → PMTiles conversion at build time | Official Protomaps-recommended tool; v2.17+ produces `.pmtiles` directly; PyPI binary wheels avoid a source build on CI |
| `pmtiles/PMTiles` Cloudflare Worker | current `main` | Serves PMTiles from R2 with Range requests + CORS | Canonical Protomaps implementation; handles all edge cases (206, ETag, Cache API, CORS) correctly |
| wrangler | 4.x (latest) | Deploy `worker-tiles/` to Cloudflare | Already in use for `zasqua-site`; `worker-tiles/` follows identical deploy pattern |
| boto3 (already in CI) | existing | Upload `.pmtiles` to `zasqua-tiles` R2 bucket | Already installed in CI; single-file PUT reuses existing R2 credentials |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Node.js (stdlib only) | project's `.nvmrc` | `places-to-geojson.js` conversion script | Pre-compute step, no new npm dep needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Protomaps Worker template | Hand-rolled range request Worker | Template already handles 206 edge cases, ETag, Cache API, CORS vary; hand-rolling risks subtle bugs under Firefox/Safari |
| `pip install tippecanoe` | Build from source in CI | Source build adds ~2–3 min to CI; pip binary wheels are faster and equally current |
| `pip install tippecanoe` | `apt-get install tippecanoe` | Ubuntu 24.04 `apt` does not have tippecanoe; `apt` route would require a PPA or source build |
| boto3 single PUT | `wrangler r2 object put` | wrangler r2 CLI is less scriptable than boto3 which is already installed |

**Installation:**

```bash
# CI — Tippecanoe (add to deploy.yml before Eleventy build step)
pip install tippecanoe

# Local macOS dev
brew install tippecanoe

# worker-tiles/ npm setup (one-time, committed to repo)
cd worker-tiles && npm install
```

**Version verification (as of 2026-03-26):**
- tippecanoe on PyPI: 2.72.0 (uploaded December 10, 2024) — HIGH confidence
- Protomaps Worker depends on `pmtiles ^4.3.0` — same major as the `pmtiles@4.4.0` already in the stack

---

## Architecture Patterns

### Recommended Directory Structure

```
worker-tiles/
├── src/
│   └── index.ts          # Protomaps Worker — copied from protomaps/PMTiles/serverless/cloudflare
├── package.json          # pmtiles dep + wrangler devDep
├── package-lock.json
├── tsconfig.json
└── wrangler.toml         # worker name, R2 binding BUCKET = zasqua-tiles, ALLOWED_ORIGINS

scripts/
└── places-to-geojson.js  # new: convert places.json → GeoJSON for Tippecanoe input
```

### Pattern 1: Protomaps Cloudflare Worker

**What:** Copy `src/index.ts` from `protomaps/PMTiles/serverless/cloudflare` verbatim. Configure via `wrangler.toml` environment variables — no code modifications needed.

**Key configuration knobs:**
- `ALLOWED_ORIGINS = "https://zasqua.org"` — restricts CORS to the site domain (not `*`)
- `PMTILES_PATH = "{name}.pmtiles"` — maps URL path segment to R2 object key; a request to `tiles.zasqua.org/zasqua-places` serves `zasqua-places.pmtiles` from R2
- `CACHE_CONTROL = "public, max-age=86400"` — 24-hour browser cache (tiles rarely change)
- R2 binding: `BUCKET` → `zasqua-tiles`

**wrangler.toml template:**

```toml
# Source: adapted from protomaps/PMTiles/serverless/cloudflare/wrangler.toml.example
name = "zasqua-tiles"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "zasqua-tiles"

[vars]
ALLOWED_ORIGINS = "https://zasqua.org"
CACHE_CONTROL = "public, max-age=86400"
```

**Deploy command (same pattern as `zasqua-site`):**

```bash
cd worker-tiles && npx wrangler deploy
```

**Custom domain assignment (one-time manual step in Cloudflare dashboard):**

Navigate to the Worker → Settings → Domains & Routes → Add Custom Domain → `tiles.zasqua.org`. Cloudflare creates the CNAME automatically. This is required — caching only works on a custom domain, not on `*.workers.dev`.

### Pattern 2: GeoJSON Conversion

**What:** A small Node.js script reads `data/places.json`, filters to records with `lat` and `lon`, emits a GeoJSON `FeatureCollection` with minimal properties. Only 5,574 of 8,177 places have coordinates — the script must skip records where lat/lon are null.

**Properties to include per feature:** `place_code`, `display_name` (locked by D-05). Strip all other fields.

**Example structure:**

```javascript
// scripts/places-to-geojson.js
// Source: project convention; Node.js stdlib only
const places = JSON.parse(fs.readFileSync('data/places.json', 'utf8'));
const features = places
  .filter(p => p.lat != null && p.lon != null)
  .map(p => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    properties: { place_code: p.place_code, display_name: p.display_name }
  }));
fs.writeFileSync('data/places.geojson', JSON.stringify({ type: 'FeatureCollection', features }));
```

**Important:** Tippecanoe takes longitude first (`[lon, lat]`) in GeoJSON coordinates, per the GeoJSON spec. Swapping lat/lon is a common mistake that places all points at wrong coordinates.

### Pattern 3: Tippecanoe Invocation

**What:** Tippecanoe converts `data/places.geojson` to `data/zasqua-places.pmtiles`. The zoom range and drop strategy affect file size and rendering quality at low zoom.

**Recommended command for 5,574 points:**

```bash
tippecanoe \
  -Z0 -z14 \
  --drop-densest-as-needed \
  -l places \
  -o data/zasqua-places.pmtiles \
  data/places.geojson
```

**Flag rationale (Claude's Discretion — recommendations):**
- `-Z0 -z14`: z0–z14 covers world overview to street level; for 5,574 points this produces a small file (estimated 1–5 MB). `-zg` (auto-select) is also safe and may choose z12 or z13 for this density
- `--drop-densest-as-needed`: at low zoom, drops the densest features to keep tile size under 500 KB; cleaner than `--coalesce-densest-as-needed` for points
- `-l places`: layer name, must match the source layer name used in downstream MapLibre style configuration
- Output is `.pmtiles` format (Tippecanoe v2.17+ supports this natively via the filename extension)

**Alternative drop strategy:** `--cluster-distance=10` groups nearby points at low zoom into a single cluster feature with a `cluster_size` property — useful for the Phase 7 heatmap but not required for Phase 5 infrastructure. Keep it simple for now.

### Pattern 4: PMTiles R2 Upload

**What:** After Tippecanoe runs in CI, upload `data/zasqua-places.pmtiles` to the `zasqua-tiles` R2 bucket. The existing CI already has `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_ENDPOINT` secrets. Use boto3 (already installed) for a single-file PUT.

**CI step:**

```bash
python3 - << 'EOF'
import boto3, os
s3 = boto3.client(
    's3',
    endpoint_url=os.environ['R2_ENDPOINT'],
    aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
)
s3.upload_file(
    'data/zasqua-places.pmtiles',
    'zasqua-tiles',
    'zasqua-places.pmtiles',
    ExtraArgs={'ContentType': 'application/octet-stream'}
)
print("PMTiles uploaded to zasqua-tiles/zasqua-places.pmtiles")
EOF
```

**Alternative:** `npx wrangler r2 object put zasqua-tiles/zasqua-places.pmtiles --file data/zasqua-places.pmtiles` — simpler one-liner but requires wrangler to be installed in CI and uses `CLOUDFLARE_ACCOUNT_ID` instead of S3-compatible credentials. Either works; boto3 is preferable since it is already available.

### Pattern 5: Worker Deploy in CI

**What:** The tiles Worker should be deployed in CI alongside the site Worker. Use the same `CLOUDFLARE_ACCOUNT_ID` secret already in use.

**CI step (add after existing Worker deploy, if any, or alongside R2 upload):**

```bash
cd worker-tiles && npx wrangler deploy
```

Note: The existing `deploy.yml` does not currently deploy the site Worker on every run — cache purge is done instead. The tiles Worker should be deployed once (manually or in a dedicated step) and then only redeployed when `worker-tiles/` changes. For Phase 5, a one-time manual deploy via CLI is acceptable; CI automation can be added later if needed.

### Anti-Patterns to Avoid

- **Using `*.workers.dev` for end-to-end testing:** Cache is disabled on `*.workers.dev` domains. Always test on `tiles.zasqua.org` with the custom domain assigned
- **Setting CORS on the R2 bucket policy instead of the Worker:** R2 bucket CORS settings do not apply to requests routed through a Worker on a custom domain. The Worker controls response headers. Bucket CORS only applies to direct R2 public URL access, which is not how this setup works
- **Modifying the existing `zasqua-site` Worker:** D-02 locks this. The site Worker has no Range request support and must not be modified
- **Uploading `.pmtiles` to the `zasqua-site` bucket:** D-09 specifies a separate `zasqua-tiles` bucket. Mixing tiles into the site bucket complicates permissions and risks the site upload script touching tile files

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Range request Worker | Custom range byte parsing + 206 construction | Protomaps `serverless/cloudflare` Worker | ETag handling, cache invalidation, and partial-response edge cases are tricky; template is production-tested |
| GeoJSON → tiles conversion | Custom tile slicing | Tippecanoe | Handles projection, zoom simplification, feature dropping, and PMTiles binary format correctly |
| CORS preflight handling | Manual OPTIONS handler | Already in Protomaps Worker template | Template handles `OPTIONS` preflights, `Vary: Origin`, and null origin correctly |

**Key insight:** The Protomaps Worker template exists precisely because serving PMTiles correctly from R2 has non-obvious edge cases (null origin, `Vary` header, `Accept-Ranges`, conditional requests). Using it verbatim costs one npm package in `worker-tiles/` and eliminates the risk of a broken Range implementation.

---

## Common Pitfalls

### Pitfall 1: CORS Failure Through Custom Domain (Known Blocker)

**What goes wrong:** MapLibre requests to `tiles.zasqua.org/zasqua-places` return CORS errors in Firefox or Safari. Chrome is more permissive and may succeed where others fail.

**Why it happens:** Firefox enforces strict CORS on Range requests — it sends an `Origin` header on range requests even for same-scheme cross-origin requests. If the Worker returns `Access-Control-Allow-Origin: *` but does not also set `Vary: Origin`, caches may serve a cached response without CORS headers to a browser that needs them.

**How to avoid:** Use the Protomaps Worker template which sets `Vary: Origin` correctly. Set `ALLOWED_ORIGINS = "https://zasqua.org"` rather than `*` — specific origins work better with `Vary` caching. Test in Firefox and Safari on the production domain before declaring Phase 5 complete.

**Warning signs:** Network tab shows 200 or 206 response in Chrome; CORS error in Firefox console on the same request.

### Pitfall 2: Caching Broken on `*.workers.dev`

**What goes wrong:** Testing on `pmtiles-cloudflare.example.workers.dev` shows tiles loading slowly; `Cf-Cache-Status` header always shows `MISS`. Deploying to production fixes performance but the issue is blamed on something else.

**Why it happens:** Cloudflare disables the Cache API on `*.workers.dev` subdomain workers. The Protomaps Worker calls `caches.default` — on `*.workers.dev`, this call succeeds but the cache is never populated.

**How to avoid:** Always assign the custom domain (`tiles.zasqua.org`) before running any performance or caching verification. Custom domain assignment is a one-time manual step in the Cloudflare dashboard.

**Warning signs:** `Cf-Cache-Status: MISS` on repeated requests to the same tile range.

### Pitfall 3: Tippecanoe Not Available on Ubuntu 24.04 via `apt`

**What goes wrong:** CI step `sudo apt-get install tippecanoe` fails or installs a very old version. Ubuntu noble's apt repository may have a stale package (v1.x era).

**Why it happens:** Ubuntu's package repository tracks tippecanoe slowly. GitHub Actions ubuntu-latest moved to Ubuntu 24.04 in early 2025.

**How to avoid:** Use `pip install tippecanoe` to get the current PyPI binary wheel (v2.72.0+). This runs on the Python environment already set up in CI (`setup-python` step runs before this). No additional CI setup needed — Python is already installed.

**Warning signs:** `tippecanoe: command not found` after `apt-get install`, or version shows `1.x`.

### Pitfall 4: lon/lat Coordinate Swap in GeoJSON

**What goes wrong:** PMTiles file generates without error, but all map markers appear at clearly wrong positions (ocean, wrong continent).

**Why it happens:** GeoJSON coordinates are `[longitude, latitude]` per spec — the opposite of the common `[lat, lon]` convention in many data systems. `places.json` stores fields as `lat` and `lon`. The conversion script must emit `[p.lon, p.lat]` not `[p.lat, p.lon]`.

**How to avoid:** Verify the first feature in the generated GeoJSON: for Colombian places, longitude should be approximately −74 to −67 (negative) and latitude approximately 1–12 (positive). A swapped point would show longitude 4–12 and latitude −74 to −67.

**Warning signs:** Generated GeoJSON has coordinates with positive first values around 4–12 — that is latitude, not longitude.

### Pitfall 5: `zasqua-tiles` R2 Bucket Not Created Before First CI Run

**What goes wrong:** CI upload step fails with "NoSuchBucket" because the R2 bucket must exist before wrangler or boto3 can write to it.

**Why it happens:** R2 buckets are not created automatically on first write (unlike some S3-compatible services).

**How to avoid:** Create the `zasqua-tiles` bucket manually in the Cloudflare dashboard (or via `wrangler r2 bucket create zasqua-tiles`) before the first CI run. This is a one-time manual setup step. Document it as a prerequisite.

---

## Code Examples

### Worker wrangler.toml

```toml
# Source: adapted from protomaps/PMTiles/serverless/cloudflare/wrangler.toml.example
# account_id from CLOUDFLARE_ACCOUNT_ID env var — not stored here (repo is public)
# Deploy: cd worker-tiles && npx wrangler deploy

name = "zasqua-tiles"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "zasqua-tiles"

[vars]
ALLOWED_ORIGINS = "https://zasqua.org"
CACHE_CONTROL = "public, max-age=86400"
```

### CI Steps to Add to `deploy.yml`

```yaml
- name: Install Tippecanoe
  run: pip install tippecanoe

- name: Generate PMTiles
  run: |
    node scripts/places-to-geojson.js
    tippecanoe -Z0 -z14 --drop-densest-as-needed -l places \
      -o data/zasqua-places.pmtiles data/places.geojson
    ls -lh data/zasqua-places.pmtiles

- name: Upload PMTiles to R2
  env:
    R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
    R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
    R2_ENDPOINT: https://${{ secrets.CLOUDFLARE_ACCOUNT_ID }}.r2.cloudflarestorage.com
  run: |
    python3 - << 'EOF'
    import boto3, os
    s3 = boto3.client('s3',
        endpoint_url=os.environ['R2_ENDPOINT'],
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
    )
    s3.upload_file('data/zasqua-places.pmtiles', 'zasqua-tiles', 'zasqua-places.pmtiles',
        ExtraArgs={'ContentType': 'application/octet-stream'})
    print("PMTiles uploaded")
    EOF
```

### Verifying HTTP 206 Range Responses

```bash
# Test that the Worker returns 206 for a range request
# Replace with the actual Worker URL once deployed with custom domain
curl -v -H "Range: bytes=0-512" \
  -H "Origin: https://zasqua.org" \
  https://tiles.zasqua.org/zasqua-places \
  2>&1 | grep -E "HTTP|content-range|access-control|cf-cache"

# Expected response headers:
# HTTP/2 206
# content-range: bytes 0-512/TOTAL
# access-control-allow-origin: https://zasqua.org
# cf-cache-status: HIT (on second request)
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| tippecanoe | BUILD-04 tile generation | ✗ (local) | — | `pip install tippecanoe` in CI; `brew install tippecanoe` locally |
| Python 3 / pip | Tippecanoe install | ✓ (CI) | 3.x | — |
| boto3 | PMTiles R2 upload | ✓ (CI) | existing | `wrangler r2 object put` (fallback) |
| wrangler | Worker deploy | ✓ (CI, via npx) | 4.x | — |
| R2 bucket `zasqua-tiles` | Worker + upload | ✗ (not created yet) | — | Must be created manually — no fallback |
| Custom domain `tiles.zasqua.org` | Cache + CORS verification | ✗ (not configured yet) | — | Must be set in Cloudflare dashboard — no programmatic fallback |
| node.js | `places-to-geojson.js` | ✓ | project's .nvmrc | — |

**Missing dependencies with no fallback:**
- `zasqua-tiles` R2 bucket — must be created in Cloudflare dashboard before first CI deploy
- `tiles.zasqua.org` custom domain — must be assigned to the Worker in Cloudflare dashboard; cache is broken without it

**Missing dependencies with fallback:**
- `tippecanoe` locally — not needed for CI; `brew install tippecanoe` for local testing only

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual + curl verification (no automated test runner for Worker/CI infra) |
| Config file | none |
| Quick run command | `curl -v -H "Range: bytes=0-512" -H "Origin: https://zasqua.org" https://tiles.zasqua.org/zasqua-places` |
| Full suite command | Multi-browser manual verification (Firefox + Safari + Chrome) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| BUILD-04 | PMTiles file generated from place coordinates | smoke | `ls -lh data/zasqua-places.pmtiles && tippecanoe-decode data/zasqua-places.pmtiles \| head -5` (local) | CI step logs file size as verification |
| BUILD-04 | Only places with coordinates included | unit | `node -e "const f=require('./data/places.geojson');console.log(f.features.filter(x=>!x.geometry).length)"` → must be 0 | Run after `places-to-geojson.js` |
| BUILD-05 | Worker returns HTTP 206 for Range requests | smoke | `curl -s -o /dev/null -w "%{http_code}" -H "Range: bytes=0-512" https://tiles.zasqua.org/zasqua-places` → `206` | Run after Worker deploy |
| BUILD-05 | CORS headers present for zasqua.org origin | smoke | `curl -v -H "Origin: https://zasqua.org" -H "Range: bytes=0-512" https://tiles.zasqua.org/zasqua-places 2>&1 \| grep access-control` | Must show `access-control-allow-origin: https://zasqua.org` |
| BUILD-05 | Firefox + Safari serve tiles without error | manual | Open `tiles.zasqua.org/zasqua-places` in Firefox dev tools Network tab, issue a Range request, verify 206 | Required per STATE.md known gap |

### Sampling Rate

- **Per task commit:** curl smoke test for 206 + CORS headers
- **Per wave merge:** Multi-browser manual verification
- **Phase gate:** Firefox and Safari both return 206 with correct CORS headers on `tiles.zasqua.org` before marking BUILD-05 complete

### Wave 0 Gaps

- [ ] `scripts/places-to-geojson.js` — covers BUILD-04 GeoJSON conversion
- [ ] `worker-tiles/src/index.ts` — copied from Protomaps template, covers BUILD-05
- [ ] `worker-tiles/wrangler.toml` — covers BUILD-05 Worker configuration
- [ ] `zasqua-tiles` R2 bucket creation (manual, pre-Wave-0 prerequisite)
- [ ] `tiles.zasqua.org` custom domain assignment (manual, pre-verification prerequisite)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| R2 bucket CORS for range request support | Worker-level CORS headers (not bucket policy) | Cloudflare R2, 2022–2023 | Bucket CORS settings are ignored for custom-domain Worker-routed requests; headers must be set in Worker code |
| `apt-get install tippecanoe` on Ubuntu | `pip install tippecanoe` (PyPI binary wheel) | Ubuntu 24.04 migration (2025) | Ubuntu noble's apt package is stale; pip wheels track current releases |
| Building PMTiles with `gdal2tiles` | Tippecanoe v2.17+ with `-o output.pmtiles` | Tippecanoe 2.17, 2022 | Direct PMTiles output; no intermediate `.mbtiles` conversion needed |

**Deprecated/outdated:**
- `mapbox/tippecanoe` repo: Felt took over maintenance; repo is now `felt/tippecanoe`. Any documentation pointing to the Mapbox repo is outdated
- `*.workers.dev` for production PMTiles serving: Cloudflare disabled caching on `*.workers.dev` — custom domain required for production cache behaviour

---

## Open Questions

1. **Worker deploy automation vs. manual**
   - What we know: The current `deploy.yml` does not automatically redeploy the site Worker; it purges Cloudflare cache via API instead
   - What's unclear: Should the tiles Worker be deployed on every CI run (adds ~10–20s), or only when `worker-tiles/` files change?
   - Recommendation: For Phase 5, deploy manually once. Add automated CI deploy in a later phase if needed. The Worker code changes rarely; tile data changes on every deploy but requires no Worker redeploy

2. **ALLOWED_ORIGINS — `*` vs. specific origin**
   - What we know: Protomaps template supports both; `ALLOWED_ORIGINS = "https://zasqua.org"` or `ALLOWED_ORIGINS = "*"`
   - What's unclear: Whether local development against `localhost:8080` needs CORS access (would require `*` or a comma-separated list)
   - Recommendation: Use `"https://zasqua.org"` for production. Local dev can test via curl or use a tunnelling proxy

3. **Tippecanoe version pinning**
   - What we know: PyPI package `tippecanoe 2.72.0` as of December 2024; pip install without version pin gets latest
   - What's unclear: Whether a future PyPI release could break the PMTiles output format
   - Recommendation: Pin to a specific version in CI (`pip install tippecanoe==2.72.0`) for reproducible builds; document the version in CI comments

---

## Sources

### Primary (HIGH confidence)

- [Protomaps Cloudflare deploy docs](https://docs.protomaps.com/deploy/cloudflare) — Worker setup, custom domain requirement, caching behaviour
- [protomaps/PMTiles serverless/cloudflare wrangler.toml.example](https://raw.githubusercontent.com/protomaps/PMTiles/main/serverless/cloudflare/wrangler.toml.example) — exact wrangler config structure, env var names
- [protomaps/PMTiles serverless/cloudflare package.json](https://raw.githubusercontent.com/protomaps/PMTiles/main/serverless/cloudflare/package.json) — `pmtiles ^4.3.0` dep, `wrangler ^4.59.1` devDep
- [Protomaps PMTiles create docs](https://docs.protomaps.com/pmtiles/create) — Tippecanoe workflow, `-zg` flag
- `.planning/research/PITFALLS.md` — PMTiles CORS/Range pitfalls (pre-researched for this milestone)
- `.planning/research/STACK.md` — version compatibility table, CDN loading patterns
- `.planning/research/ARCHITECTURE.md` — Worker pattern, boto3 upload, build pipeline integration

### Secondary (MEDIUM confidence)

- [tippecanoe PyPI page](https://pypi.org/project/tippecanoe/) — v2.72.0, binary wheels for Linux x86_64 / aarch64, December 2024
- [tippecanoe PyPI nightlark source](https://github.com/nightlark/tippecanoe-pypi) — confirms `pipx run tippecanoe` works without install step on GitHub Actions
- [Cloudflare Workers bundling docs](https://developers.cloudflare.com/workers/wrangler/bundling/) — wrangler uses esbuild to bundle TypeScript Worker; `--no-bundle` flag for pre-built output

### Tertiary (LOW confidence)

- WebSearch results for Ubuntu 24.04 apt tippecanoe — confirms apt package is stale/unavailable; pip route preferred

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Protomaps Worker template confirmed from repo; Tippecanoe PyPI confirmed from package page; version numbers verified
- Architecture: HIGH — CORS/Range Worker pattern verified against Protomaps docs and existing codebase Worker structure
- Pitfalls: HIGH — CORS pitfall pre-researched in PITFALLS.md; lon/lat swap is a well-known GeoJSON mistake

**Research date:** 2026-03-26
**Valid until:** 2026-09-26 (stable infrastructure; Protomaps and Cloudflare APIs rarely break)
