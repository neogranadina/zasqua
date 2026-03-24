# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Static site generator (Eleventy/11ty) consuming JSON data exported from a Django backend, deployed as pre-built HTML to Cloudflare R2, served via a Cloudflare Worker.

**Key Characteristics:**
- Fully static output -- no server-side runtime at request time
- Data pipeline: Django backend exports JSON to B2 object storage; build process downloads and renders into HTML
- Pagination-driven page generation -- one HTML page per archival description and per repository
- Client-side interactivity for search (Pagefind) and tree navigation (Miller columns fetching static JSON)
- Cloudflare Worker serves R2 objects with edge caching and content-type inference

## Layers

**Data Export Layer (external):**
- Purpose: Django backend `export_frontend_data` management command produces JSON files
- Location: Exported to Backblaze B2 bucket `zasqua-export`
- Contains: `descriptions.json` (~218 MB), `repositories.json` (~14 KB), `children/*.json` (~1,600 files)
- Depends on: Django backend (separate repo `zasqua-backend-dev`)
- Used by: Eleventy build process

**Data Loading Layer:**
- Purpose: Read exported JSON and precompute relationships for templates
- Location: `src/_data/descriptions.js`, `src/_data/repositories.js`
- Contains: Node.js scripts that load JSON from `data/` directory, build lookup maps, attach `_ancestors` arrays and `_repo` references to each description
- Depends on: JSON files in `data/` (downloaded from B2 at build time)
- Used by: Nunjucks templates via Eleventy's data cascade

**Global Data Layer:**
- Purpose: Site-wide configuration and UI string constants
- Location: `src/_data/site.js`, `src/_data/ui.js`
- Contains: Site metadata (title, URL, version, build timestamp), all Spanish UI labels, ISAD(G) field names, description level translations, facet labels
- Depends on: Nothing (static exports)
- Used by: Every template via `site.*` and `ui.*` variables

**Template Layer:**
- Purpose: Generate HTML pages from data
- Location: `src/description.njk`, `src/repository.njk`, `src/index.njk`, `src/buscar.njk`, `src/404.njk`
- Contains: Nunjucks templates using Eleventy pagination to produce one page per description/repository
- Depends on: Data loading layer, global data layer, layout and includes
- Used by: Eleventy build process to produce `_site/`

**Layout & Includes Layer:**
- Purpose: Shared page chrome (HTML skeleton, header, footer)
- Location: `src/_layouts/base.njk`, `src/_includes/header.njk`, `src/_includes/footer.njk`, `src/_includes/breadcrumb.njk`
- Contains: Base HTML document with `{% block %}` extension points for `head` and `scripts`
- Depends on: `site.*` and `ui.*` data, static assets
- Used by: All page templates via `layout: base.njk`

**Client-Side Layer:**
- Purpose: Interactive features after static HTML loads
- Location: `src/js/search.js`, `src/js/tree.js`, `src/js/description.js`, `src/js/header.js`
- Contains: Vanilla JS classes (no framework) -- Pagefind-powered search, Miller columns tree navigation, IIIF viewer (TIFY) integration, hamburger menu
- Depends on: Pagefind index (generated post-build), static JSON children files, TIFY vendor library
- Used by: Browser at runtime

**Static Assets Layer:**
- Purpose: CSS, images, vendor libraries
- Location: `src/css/main.css`, `src/img/`, `src/vendor/tify/`
- Contains: Single CSS file (44 KB), repository images, Neogranadina branding, TIFY IIIF viewer
- Depends on: Google Fonts (loaded externally), Google Material Symbols (loaded externally)
- Used by: All pages via base layout

**Build & Deploy Layer:**
- Purpose: Orchestrate the full pipeline from data download to live site
- Location: `build.sh`, `.github/workflows/deploy.yml`, `scripts/upload-to-r2.py`
- Contains: Local build script, GitHub Actions CI/CD, Python upload script with concurrent R2 uploads
- Depends on: B2 CLI, Eleventy, Pagefind, boto3
- Used by: Manual dispatch (GitHub Actions `workflow_dispatch`)

**Serving Layer:**
- Purpose: Serve the static site from R2 with edge caching
- Location: `worker/worker.js`, `worker/wrangler.toml`
- Contains: Cloudflare Worker that resolves paths to R2 keys, sets content-type/cache-control headers, uses Cloudflare edge cache
- Depends on: R2 bucket `zasqua-site`
- Used by: All requests to zasqua.org

## Data Flow

**Build Pipeline (data to live site):**

1. Django backend exports `descriptions.json`, `repositories.json`, and `children/*.json` to B2 bucket `zasqua-export`
2. GitHub Actions workflow (`deploy.yml`) downloads data from B2 using `b2` CLI
3. `src/_data/descriptions.js` loads `descriptions.json`, builds a `byRefCode` lookup map, precomputes `_ancestors` chain and `_repo` reference for each description
4. `src/_data/repositories.js` loads `repositories.json` as-is
5. Eleventy paginates `descriptions` (one page per item) and `repositories` (one page per repo), rendering Nunjucks templates to `_site/`
6. Pagefind indexes `_site/` to create client-side search index
7. `scripts/upload-to-r2.py` uploads `_site/` to R2 bucket `zasqua-site` with 100-thread concurrency
8. Cloudflare cache is purged via API

**Request Flow (user visits a page):**

1. Request hits Cloudflare edge
2. Worker checks Cloudflare edge cache; returns cached response if found
3. Worker resolves URL path to R2 key (appends `index.html` for directory paths)
4. Worker fetches object from R2, sets content-type and cache-control headers
5. Response is cached at edge and returned to user

**Search Flow (client-side):**

1. User navigates to `/buscar/` or submits search form
2. `search.js` dynamically imports Pagefind from `/pagefind/pagefind.js`
3. Search state is parsed from URL query parameters (`q`, `repository`, `level`, `ancestor`, etc.)
4. Pagefind executes search against its static index with filters
5. Results are rendered as HTML cards with faceted sidebar
6. URL is updated via `pushState` for bookmarkable/shareable searches

**Tree Navigation Flow (client-side):**

1. Repository page embeds root descriptions as inline JSON (`#root-descriptions-data` script tag)
2. Description page specifies `data-parent-id` on the tree container
3. `tree.js` `MillerColumnsTree` class loads root data or fetches `/data/children/{parentId}.json`
4. Clicking a container item fetches its children JSON, adds a new column to the right
5. Children JSON files are cached in a `Map` to avoid repeat fetches

**State Management:**
- No client-side state framework -- each page is self-contained HTML
- Search state lives in URL query parameters, parsed on load and updated via `pushState`
- Tree navigation state is ephemeral (column structure in DOM, children cache in JS `Map`)

## Key Abstractions

**Description (archival object):**
- Purpose: Core data unit -- represents an archival description at any level (fonds, series, file, item, etc.)
- Examples: Each object in `data/descriptions.json`; each page generated by `src/description.njk`
- Pattern: Flat array with parent references; hierarchy reconstructed at build time via `_ancestors` and at runtime via `children/*.json`

**Repository (archival institution):**
- Purpose: Groups descriptions by holding institution
- Examples: Each object in `data/repositories.json`; each page generated by `src/repository.njk`
- Pattern: Small set (~5 repositories); linked to descriptions via `repository_code`

**Miller Columns Tree:**
- Purpose: Hierarchical navigation through archival description tree
- Examples: `src/js/tree.js` `MillerColumnsTree` class
- Pattern: Lazy-loading columns from static JSON files; cache fetched children; each click loads next level

**Pagefind Search:**
- Purpose: Full-text search with faceted filtering, entirely client-side
- Examples: `src/js/search.js` `SearchPage` class
- Pattern: Pagefind generates a static index at build time; JS loads and queries it at runtime; filters encoded as `data-pagefind-filter` attributes in description template

## Entry Points

**Eleventy Build:**
- Location: `eleventy.config.js`
- Triggers: `npx eleventy` (via `npm run build` or CI workflow)
- Responsibilities: Configures input/output dirs, passthrough copies, custom filters, progress logging

**GitHub Actions Deploy:**
- Location: `.github/workflows/deploy.yml`
- Triggers: Manual `workflow_dispatch`
- Responsibilities: Downloads data from B2, builds site, indexes with Pagefind, uploads to R2, purges Cloudflare cache

**Local Build:**
- Location: `build.sh`
- Triggers: Manual shell execution
- Responsibilities: Same pipeline as CI but for local development

**Cloudflare Worker:**
- Location: `worker/worker.js`
- Triggers: Every HTTP request to zasqua.org
- Responsibilities: Path resolution, R2 fetch, content-type detection, cache-control headers, edge caching

## Error Handling

**Strategy:** Minimal -- static site with graceful degradation

**Patterns:**
- Data loading failures in `src/_data/*.js` will crash the Eleventy build (fail-fast)
- Client-side JS uses try/catch around Pagefind initialization and JSON parsing
- Tree navigation catches fetch errors and logs to console
- Worker serves `404.html` from R2 for missing paths
- DEV_MODE limits descriptions to 100 for fast iteration (`src/_data/descriptions.js` line 15)

## Cross-Cutting Concerns

**Logging:** Build-time progress logging via Eleventy transform (logs every 5,000 pages) in `eleventy.config.js`; client-side uses `console.error`/`console.warn`

**Validation:** None -- data is trusted from Django backend export

**Authentication:** None -- fully public site

**Caching:** Three-tier: Cloudflare edge cache (Worker), browser cache (cache-control headers), client-side JS cache (`Map` in tree.js). Cache-control varies by file type: HTML 1h, JSON 1d, CSS/JS 1w, images/fonts immutable.

**Internationalization:** All UI strings centralized in `src/_data/ui.js` (Spanish). Site language is `es`. No multi-language support -- content is bilingual by nature of the archival materials.

**Search Indexing:** Pagefind `data-pagefind-body` marks searchable content; `data-pagefind-filter` marks facets; `data-pagefind-meta` marks metadata; `data-pagefind-sort` enables sort fields; `data-pagefind-ignore` excludes navigation elements; `data-pagefind-weight="0.5"` down-weights OCR text.

---

*Architecture analysis: 2026-03-24*
