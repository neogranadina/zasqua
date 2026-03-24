# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**Backblaze B2 (build-time data source):**
- Purpose: Stores exported JSON data from the Django backend
- Bucket: `zasqua-export`
- Files downloaded: `descriptions.json`, `repositories.json`, `children/*.json`
- CLI: `b2` (Python package `b2[full]`)
- Auth: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` (read-only)
- Used in: `build.sh`, `.github/workflows/deploy.yml`

**Cloudflare R2 (site hosting storage):**
- Purpose: Stores the built static site files
- Bucket: `zasqua-site` (production), `zasqua-tests` (testing)
- Client: `boto3` S3-compatible client (`scripts/upload-to-r2.py`)
- Auth: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`
- Upload concurrency: 100 threads via `ThreadPoolExecutor`
- Used in: `scripts/upload-to-r2.py`, `.github/workflows/deploy.yml`, `.github/workflows/test-upload.yml`

**Cloudflare Workers (serving layer):**
- Purpose: Serves static site from R2 with edge caching and correct content types
- Worker: `zasqua-site` (`worker/worker.js`)
- Config: `worker/wrangler.toml`
- R2 binding: `SITE` (bound to `zasqua-site` bucket)
- Features: directory index resolution, content-type mapping, cache-control headers, edge cache (Cloudflare Cache API), custom 404 page
- Deploy: `cd worker && npx wrangler deploy`
- Auth: `CLOUDFLARE_ACCOUNT_ID` (env var, not stored in config)

**Cloudflare Cache API (cache purge):**
- Purpose: Purges edge cache after deployment
- Endpoint: `https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache`
- Auth: `CF_API_TOKEN`, `CF_ZONE_ID`
- Used in: `.github/workflows/deploy.yml` (final step)

## Data Storage

**Databases:**
- None. This is a static site. All data is pre-rendered from JSON at build time.

**File Storage:**
- Backblaze B2: Source data (JSON exports from Django backend)
- Cloudflare R2: Built site files (HTML, CSS, JS, JSON, images)
- Local `data/` directory: Build-time working copy of B2 data (gitignored except for dev convenience)
- Local `_site/` directory: Build output (gitignored)

**Caching:**
- Cloudflare edge cache (Cache API in `worker/worker.js`)
- Cache-Control headers by file type:
  - HTML/XML: 1 hour (`max-age=3600`)
  - JSON: 1 day (`max-age=86400`)
  - CSS/JS: 1 week (`max-age=604800`)
  - Images/fonts: 1 year, immutable (`max-age=31536000, immutable`)

## IIIF Integration

**IIIF Presentation API v3:**
- IIIF manifests are referenced via `desc.iiif_manifest_url` field in description data
- Manifests are served from the Django backend API (external to this repo)
- The TIFY viewer (`src/vendor/tify/`) renders manifests on description pages
- Viewer initialization: `src/js/description.js` creates a `Tify` instance with `colorMode: "dark"`
- Custom viewer controls (expand/collapse/fullscreen/thumbnails) are injected into TIFY's header DOM

**IIIF manifest URL:**
- Displayed in the "Reutilizacion" section with a copy-to-clipboard button
- Used as `data-manifest` attribute on `.desc-viewer` element

**METS:**
- METS URLs (`desc.mets_url`) are displayed alongside IIIF manifest URLs in the reuse section
- No METS processing happens in the frontend; it is a reference link only

## Authentication & Identity

**Auth Provider:**
- None. This is a public, read-only static site with no user authentication.

## Monitoring & Observability

**Error Tracking:**
- None (no error tracking service)

**Logs:**
- Build-time: Console logging with progress counters (`eleventy.config.js` progress transform)
- Upload script: Timestamped progress logging (`scripts/upload-to-r2.py`)
- Runtime: `console.error` / `console.warn` in client-side JS only

## CI/CD & Deployment

**Hosting:**
- Cloudflare Workers + R2 (production domain: zasqua.org)

**CI Pipeline:**
- GitHub Actions (workflow_dispatch trigger only -- manual)
- `.github/workflows/deploy.yml` - Full build and deploy pipeline
- `.github/workflows/test-upload.yml` - Test build with upload to `zasqua-tests` bucket
- Runner: `ubuntu-latest`, timeout: 60 minutes
- Steps: checkout -> Node 22 setup -> Python 3 setup -> B2 data download -> npm ci -> eleventy build -> pagefind index -> R2 upload -> cache purge

**Deployment Model:**
- Full site rebuild and re-upload on every deploy (no incremental)
- Parallel upload via `scripts/upload-to-r2.py` with 100 concurrent threads
- Cache purge (`purge_everything: true`) after upload

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## External Data Dependencies

**Django Backend (zasqua-backend):**
- The Django `export_frontend_data` management command produces JSON files
- These are uploaded to B2 (`zasqua-export` bucket) and downloaded at build time
- Data flow: Django DB -> JSON export -> B2 upload -> B2 download at build -> Eleventy templates -> static HTML
- Children JSON files (`data/children/{id}.json`) are also served as static files at runtime for client-side tree navigation

**Google Fonts / Material Symbols:**
- Material Symbols Outlined icon font (referenced in templates like `description.njk`)
- Loaded from Google CDN (assumed; referenced via class `material-symbols-outlined`)

## Environment Configuration

**Required env vars (CI deploy):**
- `B2_APPLICATION_KEY_ID` - B2 read access for data download
- `B2_APPLICATION_KEY` - B2 read access for data download
- `R2_ACCESS_KEY_ID` - R2 write access for site upload
- `R2_SECRET_ACCESS_KEY` - R2 write access for site upload
- `CLOUDFLARE_ACCOUNT_ID` - Used to construct R2 endpoint URL
- `CF_API_TOKEN` - Cloudflare API for cache purge
- `CF_ZONE_ID` - Cloudflare zone for cache purge

**Optional env vars (local development):**
- `DEV_MODE=true` - Limits descriptions to 100 for fast builds
- `DATA_DIR` - Override data directory path
- `SITE_URL` - Override base URL (defaults to `http://localhost:8080`)

**Secrets location:**
- GitHub Actions repository secrets (for CI)
- Local shell profile or `.env` (for local builds; `.env` files are not committed)

---

*Integration audit: 2026-03-24*
