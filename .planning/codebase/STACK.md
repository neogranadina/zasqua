# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- JavaScript (ES6+) - Build-time data processing (`src/_data/*.js`), client-side interactivity (`src/js/*.js`), Cloudflare Worker (`worker/worker.js`)
- Nunjucks - Templating language for all page templates (`src/*.njk`, `src/_layouts/*.njk`, `src/_includes/*.njk`)

**Secondary:**
- Python 3 - Upload script (`scripts/upload-to-r2.py`), B2 CLI usage in build pipeline
- CSS - Single stylesheet (`src/css/main.css`), no preprocessor
- HTML/Markdown - Supported template formats (configured in `eleventy.config.js`)

## Runtime

**Environment:**
- Node.js 22 (pinned via `.nvmrc`)
- `NODE_OPTIONS="--max-old-space-size=7168"` required for local builds; CI uses `--max-old-space-size=6144`

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (lockfileVersion 3)

## Frameworks

**Core:**
- Eleventy 3.1.2 (`@11ty/eleventy`) - Static site generator; the only npm dependency
- Nunjucks - Template engine (configured as default in `eleventy.config.js`: `htmlTemplateEngine: "njk"`)

**Search:**
- Pagefind - Client-side static search; invoked via `npx pagefind --site _site` after Eleventy build (not an npm dependency; downloaded on demand by npx)

**IIIF Viewer:**
- TIFY v0.31.0 - Self-hosted in `src/vendor/tify/` (tify.js + tify.css); loaded conditionally on description pages with IIIF manifests

**Build/Dev:**
- Eleventy dev server (`eleventy --serve`) - Local development with hot reload
- Wrangler - Cloudflare Worker deployment tool (`worker/wrangler.toml`); not in package.json, used via npx

## Key Dependencies

**Critical (npm):**
- `@11ty/eleventy` ^3.1.2 - The only listed dependency (devDependency); generates the entire static site

**Critical (vendored):**
- TIFY v0.31.0 - IIIF deep-zoom viewer, files at `src/vendor/tify/tify.js` and `src/vendor/tify/tify.css`

**Critical (Python, CI only):**
- `boto3` - S3-compatible client for uploading built site to Cloudflare R2 (`scripts/upload-to-r2.py`)
- `b2[full]` - Backblaze B2 CLI for downloading export data at build time

**Client-side (loaded via CDN or vendored):**
- Google Material Symbols Outlined - Icon font (referenced in templates)
- Pagefind JS - Auto-generated search index loaded at runtime from `/pagefind/pagefind.js`

## Configuration

**Environment Variables:**
- `DEV_MODE` - Set to `"true"` to limit data to 100 descriptions for fast local builds
- `SITE_URL` - Base URL for the site; defaults to `http://localhost:8080`, set to `https://zasqua.org` in CI
- `DATA_DIR` - Override path to data directory (defaults to `data/` relative to project root)
- `B2_APPLICATION_KEY_ID` - Backblaze B2 read-only key ID (build-time data download)
- `B2_APPLICATION_KEY` - Backblaze B2 application key (build-time data download)
- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key (deployment upload)
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key (deployment upload)
- `R2_ENDPOINT` - Cloudflare R2 endpoint URL (deployment upload)
- `CF_API_TOKEN` - Cloudflare API token (cache purge)
- `CF_ZONE_ID` - Cloudflare zone ID (cache purge)
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID (Worker deployment via wrangler)

**Build Configuration:**
- `eleventy.config.js` - Eleventy config: input `src/`, output `_site/`, passthrough copies for CSS/JS/images/vendor/data
- `worker/wrangler.toml` - Cloudflare Worker config: worker name `zasqua-site`, R2 bucket binding `SITE`
- `.nvmrc` - Node.js version pin (22)

**Site Metadata:**
- `src/_data/site.js` - Site title, description, URL, language (`es`), version (`0.3.1`), build timestamp

## Build Pipeline

**Local development:**
```bash
npm run dev              # DEV_MODE=true eleventy --serve (100-description limit)
npm run build            # Full build: eleventy + pagefind indexing
npm run build:dev        # Dev build with pagefind: DEV_MODE=true eleventy + pagefind
```

**Full local build (with data download):**
```bash
bash build.sh            # Downloads data from B2, installs deps, builds, indexes
```

**CI build (GitHub Actions):**
1. Checkout + setup Node 22 + Python 3
2. Download JSON data from Backblaze B2 (`zasqua-export` bucket)
3. `npm ci` + `npx eleventy` + `npx pagefind --site _site`
4. Upload `_site/` to Cloudflare R2 via `scripts/upload-to-r2.py` (100 concurrent threads)
5. Purge Cloudflare edge cache

## Platform Requirements

**Development:**
- Node.js 22
- Data files in `data/` directory (descriptions.json, repositories.json, children/*.json)
- For full builds: 7+ GB RAM available for Node heap

**Production:**
- Cloudflare Workers (serving layer)
- Cloudflare R2 (static file storage)
- No server-side runtime; entirely static HTML/CSS/JS

## Data Pipeline

**Source:** Django backend exports JSON via `export_frontend_data` management command
**Storage:** Exported JSON uploaded to Backblaze B2 bucket `zasqua-export`
**Build-time download:** B2 CLI syncs three datasets into `data/`:
- `data/descriptions.json` - All archival descriptions (main dataset)
- `data/repositories.json` - Repository/institution records
- `data/children/*.json` - Per-parent child lists (fetched client-side for tree navigation)

**Eleventy data files** (`src/_data/`) load and preprocess this data:
- `src/_data/descriptions.js` - Loads descriptions, builds ancestor chains, attaches repository objects
- `src/_data/repositories.js` - Loads repository records
- `src/_data/entities.js` - Stub (returns empty array; entities are denormalized into descriptions)
- `src/_data/places.js` - Stub (returns empty array; places are denormalized into descriptions)
- `src/_data/ui.js` - UI strings (Spanish) and ISAD(G) field labels
- `src/_data/site.js` - Site metadata and build timestamp

---

*Stack analysis: 2026-03-24*
