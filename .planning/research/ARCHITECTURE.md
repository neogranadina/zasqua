# Architecture Research

**Domain:** Static archival discovery site — Hugo migration from Eleventy (v0.6.0)
**Researched:** 2026-04-16
**Confidence:** HIGH for Hugo core patterns (official docs verified); MEDIUM for large-scale content adapter performance at 192K pages (benchmark data only verified to 100K); HIGH for Pagefind integration (unchanged); HIGH for R2/Worker deployment (unchanged)

---

## Current Architecture (Eleventy — What Exists Now)

```
B2 (zasqua-export)
  ├── descriptions.json (106K descriptions)
  ├── repositories.json
  ├── children/ (tree JSON shards)
  ├── entities.json (31 MB, 92K records)
  ├── places.json (7K records)
  ├── entity_links.json (292K links)
  └── place_links.json (194K links)
        │
        ▼ b2 sync (GitHub Actions)
data/
        │
        ▼ node scripts/precompute-links.js
data/entity-links/{code}.json   (per-entity shards)
data/place-links/{code}.json    (per-place shards)
data/entity-index.json
data/place-index.json
data/desc-entity-lookup.json
data/desc-place-lookup.json
        │
        ├─── Tailwind standalone CLI → src/css/main.css
        │
        ▼ npx eleventy (Node, single process, 7 GB heap)
_site/ (192K HTML pages)
  ├── 106K description pages   (description.njk paginates descriptions array)
  ├── 78K entity pages         (entidad.njk paginates entities array)
  ├── 7K place pages           (lugar.njk paginates places array)
  ├── explorers, search, static pages
  ├── data/children/           (passthrough)
  ├── data/entity-links/       (passthrough)
  ├── data/place-links/        (passthrough)
  ├── data/entity-index.json   (passthrough)
  └── data/place-index.json    (passthrough)
        │
        ├─── npx pagefind (3 index runs)
        │
        ▼ python3 scripts/upload-to-r2.py (100 threads)
Cloudflare R2 (zasqua-site)
        │
        ▼ Cloudflare Worker
zasqua.org
```

**Why this breaks:** Eleventy OOMs (exit code 134) at 192K pages even with 7 GB heap on GitHub Actions. The Node.js single-process model keeps all pagination data — descriptions array (106K records), entities array (92K records), places array (7K records) — plus all computed ancestor chains and entity/place lookups in memory simultaneously during template rendering. The heap limit is architectural, not tunable.

---

## Target Architecture (Hugo — What We Are Building)

```
B2 (zasqua-export)  [unchanged data source]
  ├── descriptions.json
  ├── repositories.json
  ├── children/
  ├── entities.json
  ├── places.json
  ├── entity_links.json
  └── place_links.json
        │
        ▼ b2 sync (GitHub Actions)  [unchanged step]
data/
        │
        ▼ node scripts/precompute-links.js    [unchanged script]
        ▼ node scripts/generate-content.js    [NEW — replaces Eleventy data layer]
data/entity-links/, data/place-links/        [unchanged shards]
data/entity-index.json, data/place-index.json  [unchanged]
content/                                     [NEW — Hugo content tree]
  ├── descripcion/
  │   └── _content.gotmpl                    (content adapter — 106K description pages)
  ├── ne/
  │   └── _content.gotmpl                    (content adapter — 78K entity pages)
  └── nl/
      └── _content.gotmpl                    (content adapter — 7K place pages)
        │
        ├─── Tailwind standalone CLI → static/css/main.css  [moved, logic unchanged]
        │
        ▼ hugo (Go binary, ~1 GB RAM)
public/ (192K HTML pages)
  ├── description pages, entity pages, place pages
  ├── static assets (CSS, JS, vendor, img)
  ├── data/ (entity-links/, place-links/, index files — copied via staticDir)
  └── pagefind indices (written after Hugo build)
        │
        ├─── npx pagefind (3 index runs)  [unchanged step]
        │
        ▼ python3 scripts/upload-to-r2.py  [unchanged script]
Cloudflare R2 (zasqua-site)  [unchanged]
        │
        ▼ Cloudflare Worker  [unchanged]
zasqua.org
```

---

## Core Concept: How Hugo Generates Pages from Data

Hugo cannot paginate over a JS data array the way Eleventy does. The equivalent mechanism is **content adapters** (`_content.gotmpl`), introduced in Hugo v0.126.0 (May 2024) and stable in all current releases.

A content adapter is a Go template file placed in the `content/` directory. It runs at build time and calls `$.AddPage` for each record in a data source. Hugo then renders each added page through the normal layout system — the same Go templates (`layouts/`) that render Markdown content files.

**How the data gets into content adapters:**

Data files accessed by content adapters must live in the `assets/` directory and be read with `resources.Get | transform.Unmarshal`. This is distinct from Hugo's `data/` directory, which is loaded into memory for the entire build and is better suited to small reference data accessed repeatedly across many templates.

For large arrays (descriptions.json at ~370 MB total across all files), use `resources.Get` from `assets/`. Hugo reads and unmarshals the file once per content adapter that references it, then garbage-collects it after the adapter runs — this is the source of Hugo's lower memory ceiling compared to Eleventy.

**Verified performance (MEDIUM confidence — extrapolated from 100K benchmarks):**
- 20K pages from a 49 MB JSON: ~5–20 seconds depending on hardware
- 100K pages (4× dataset): linear scaling confirmed in Hugo forum benchmarks
- Estimated 192K pages: 10–40 seconds on GitHub Actions ubuntu-latest (2 vCPUs)
- Hugo uses all available CPU cores for rendering — Eleventy uses one

Source: [Hugo forum content adapters performance thread](https://discourse.gohugo.io/t/content-adapters-examples-and-performance/49830), [Hugo 0.126.x launch post](https://www.brycewray.com/posts/2024/05/hugo-0-126-x-speedy-pages-data/)

---

## Component Responsibilities

### New Components

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `scripts/generate-content.js` | Reads JSON exports, writes enriched JSON shards into `assets/hugo-data/`. Replaces the enrichment currently done in Eleventy's `_data/*.js` files. | Node.js script; runs before Hugo |
| `content/descripcion/_content.gotmpl` | Hugo content adapter — reads `assets/hugo-data/descriptions.json`, calls `$.AddPage` for each record (106K pages) | Replaces `description.njk` pagination |
| `content/ne/_content.gotmpl` | Hugo content adapter — reads `assets/hugo-data/entities.json`, calls `$.AddPage` for each record (78K pages) | Replaces `entidad.njk` pagination |
| `content/nl/_content.gotmpl` | Hugo content adapter — reads `assets/hugo-data/places.json`, calls `$.AddPage` for each record (7K pages) | Replaces `lugar.njk` pagination |
| `layouts/descripcion/single.html` | Go template — renders one description page | Port of `description.njk` |
| `layouts/ne/single.html` | Go template — renders one entity page | Port of `entidad.njk` |
| `layouts/nl/single.html` | Go template — renders one place page | Port of `lugar.njk` |
| `layouts/_default/baseof.html` | Base layout (HTML shell, head, body) | Port of `base.njk` |
| `layouts/partials/header.html` | Site header partial | Port of `header.njk` |
| `layouts/partials/footer.html` | Site footer partial | Port of `footer.njk` |
| `layouts/partials/breadcrumb.html` | Breadcrumb partial | Port of `breadcrumb.njk` |
| `hugo.toml` | Hugo configuration (publishDir, staticDir, output formats) | Replaces `eleventy.config.js` |

### Modified Components

| Component | What Changes | What Stays the Same |
|-----------|--------------|---------------------|
| `scripts/precompute-links.js` | No change to logic; output paths stay the same | Already produces `data/entity-links/`, `data/place-links/`, `data/entity-index.json`, `data/place-index.json` |
| `scripts/generate-content.js` | **New script** absorbs the enrichment logic currently spread across `src/_data/descriptions.js`, `entities.js`, `places.js` | The enrichment steps themselves (ancestor chains, repo lookup, entity/place code attachment) are the same — just moved from Eleventy's data pipeline to a pre-build Node.js step |
| `build.sh` / `.github/workflows/deploy.yml` | Add `hugo` install step; replace `npx eleventy` call with `hugo`; remove `NODE_OPTIONS` heap override; add `generate-content.js` call | B2 download, precompute-links, Pagefind indexing, R2 upload all unchanged |
| `static/` | Contains `css/`, `js/`, `img/`, `vendor/`, `data/children/` | Files that were Eleventy passthrough copies become Hugo static files — same result, different mechanism |
| `src/css/`, `src/js/`, `src/img/`, `src/vendor/` | **Moved** to `static/` (or kept in place via `staticDir` config if preferred) | No content changes |

### Unchanged Components

| Component | Why Unchanged |
|-----------|---------------|
| `scripts/precompute-links.js` | Pure Node.js, framework-agnostic — produces JSON shards consumed at runtime by client-side JS |
| `scripts/upload-to-r2.py` | Uploads `_site/` (or `public/`) to R2 — only the output directory name changes |
| `worker/worker.js` | Cloudflare Worker routing logic is independent of build tool |
| All `src/js/*.js` (8K lines vanilla JS) | Framework-agnostic — copy as-is to `static/js/` |
| `src/vendor/` | Self-hosted libraries (MapLibre, pmtiles, Sigma.js) — copy as-is to `static/vendor/` |
| Pagefind indexing (3 runs) | Pagefind is post-build: it scans the output directory after Hugo generates HTML. The `data-pagefind-*` attributes are emitted by Go templates exactly as they were by Nunjucks |
| Backblaze B2 data source | JSON export format unchanged |
| Cloudflare R2 + Worker hosting | Deployment target unchanged |

---

## Integration Points

### Integration Point 1: Pre-Build Data Enrichment (New Script)

**What changes:** In Eleventy, enrichment happened inside `src/_data/descriptions.js` — it loaded JSON, computed ancestor chains, attached repo objects, and attached entity/place lookup codes. All of this ran inside Eleventy's data cascade at build time.

In Hugo, the data cascade does not exist. Content adapters read raw JSON and pass fields as `params` to `$.AddPage`. Therefore, enrichment must happen **before** Hugo runs, in a new `scripts/generate-content.js` Node.js script.

**What generate-content.js must produce:**

```
assets/
└── hugo-data/
    ├── descriptions.json   enriched: ancestors[], _repo{}, _entity_codes[], _place_codes[] attached per record
    ├── entities.json       enriched: _linked_count, roles[] attached per record
    └── places.json         enriched: _linked_count attached per record
```

These files are read by the content adapters via `resources.Get "hugo-data/descriptions.json" | transform.Unmarshal`.

**Why assets/ not data/:** Hugo's `data/` directory loads all files into memory for the whole build and keeps them there. For a 370 MB combined JSON payload, this would be counterproductive. `assets/` with `resources.Get` reads the file once per content adapter, then releases it. Source: [Hugo data sources docs](https://gohugo.io/content-management/data-sources/), Hugo forum discussion on memory-efficient access.

**Build order dependency:**
1. `b2 sync` — downloads raw JSON from B2
2. `node scripts/precompute-links.js` — produces entity-links/, place-links/, entity-index.json, place-index.json, desc-entity-lookup.json, desc-place-lookup.json
3. `node scripts/generate-content.js` — reads all of the above plus raw JSON exports; produces enriched `assets/hugo-data/` files
4. `./tailwindcss -i ... -o static/css/main.css` — CSS compilation (order-independent of Hugo)
5. `hugo` — reads `assets/hugo-data/`, generates `public/`
6. `npx pagefind` (3 runs) — indexes `public/`
7. `python3 scripts/upload-to-r2.py public/ zasqua-site`

### Integration Point 2: Content Adapters (Replaces Eleventy Pagination)

**What changes:** Eleventy's `pagination:` front matter block iterated over a global data array and generated one page per record. In Hugo, this is replaced by a `_content.gotmpl` content adapter per content section.

**Eleventy pattern (being replaced):**
```yaml
# description.njk front matter
pagination:
  data: descriptions
  size: 1
  alias: desc
permalink: "/{{ desc.reference_code | safeSlug }}/"
```

**Hugo equivalent:**
```gotmpl
{{/* content/descripcion/_content.gotmpl */}}
{{ $data := resources.Get "hugo-data/descriptions.json" | transform.Unmarshal }}
{{ range $data }}
  {{ $params := dict
    "reference_code" .reference_code
    "title"          .title
    "repository_code" .repository_code
    "description_level" .description_level
    "date_expression" .date_expression
    "date_start"     .date_start
    "ancestors"      ._ancestors
    "repo"           ._repo
    "entity_codes"   ._entity_codes
    "place_codes"    ._place_codes
    "has_digital"    .has_digital
  }}
  {{ $.AddPage (dict
    "kind"   "page"
    "path"   .reference_code
    "title"  .title
    "params" $params
  ) }}
{{ end }}
```

The layout at `layouts/descripcion/single.html` then accesses all fields via `.Params.ancestors`, `.Params.repo`, etc.

**Path structure:** The content adapter's `path` is relative to the adapter's location in `content/`. An adapter at `content/descripcion/_content.gotmpl` with `"path" .reference_code` produces URLs like `/descripcion/CO-ANH-01-001/`. If existing URLs use the reference code directly at root (e.g. `/CO-ANH-01-001/`), the adapter must be placed at `content/_content.gotmpl` and use `"path" .reference_code` — or a redirect layer must be added. **This is a critical URL compatibility decision** (see build order note below).

### Integration Point 3: Go Templates (Replaces Nunjucks)

**What changes:** All 13 Nunjucks templates rewritten as Hugo Go templates. The data shape passed to templates is identical — only the template syntax changes.

**Filter equivalences:**

| Eleventy filter | Hugo equivalent | Confidence |
|-----------------|-----------------|------------|
| `\| limit(n)` | `\| first n` (via `slice 0 n`) | HIGH |
| `\| splitPipe` | `split "\|"` | HIGH |
| `\| safeSlug` | custom partial returning `replaceRE "[?#]" "" .` | HIGH |
| `\| formatDate` (Spanish months) | custom partial — no native Spanish month support in `time.Format`; must use a lookup map partial | MEDIUM — verified `time.Format` uses Go locale; Spanish requires manual implementation |
| `\| numberFormat` | `printf "%'.f" .` or custom partial | MEDIUM — Go's `printf` does not use period as thousands separator by default; need `strings.Replace` |
| `\| sortByOrder` | custom partial with `index` and slice operations | HIGH |
| `\| filterByRepo` | `where .Params.repository_code "==" $code` | HIGH |
| `\| extractYear` | `printf "%.4s" .` or `time.AsTime` | HIGH |
| `\| yearRange` | custom partial with `seq` and `range` | HIGH |
| `\| centuryRange` | custom partial | HIGH |
| `\| decadeRange` | custom partial | HIGH |
| `\| countryName` | no built-in — requires a static data lookup map | MEDIUM |
| `\| escapeTemplate` | `htmlEscape` + `replace` | HIGH |
| `\| truncate` | `truncate n "..."` | HIGH |

Hugo does not support custom filter functions in the Nunjucks sense. The equivalent is a **returning partial** — a partial template that accepts arguments via `dict` and uses `return` to pass back a value. This is valid Hugo since v0.91 (the `return` statement in partials). All the custom filters above translate to returning partials in `layouts/partials/filters/`.

### Integration Point 4: Static Assets and Passthrough Copies

**What changes:** Eleventy's `addPassthroughCopy` calls become Hugo's `static/` directory. Hugo copies everything in `static/` to `public/` verbatim, preserving paths.

| Eleventy passthrough | Hugo equivalent |
|----------------------|-----------------|
| `addPassthroughCopy("src/css")` | Place compiled CSS in `static/css/` |
| `addPassthroughCopy("src/js")` | Place JS files in `static/js/` |
| `addPassthroughCopy("src/img")` | Place images in `static/img/` |
| `addPassthroughCopy("src/vendor")` | Place vendor files in `static/vendor/` |
| `addPassthroughCopy({ "data/children": "data/children" })` | Place children JSON in `static/data/children/` |
| `addPassthroughCopy({ "data/entity-links": "data/entity-links" })` | Place link shards in `static/data/entity-links/` |
| `addPassthroughCopy({ "data/place-links": "data/place-links" })` | Place link shards in `static/data/place-links/` |
| `addPassthroughCopy({ "data/place-index.json": "data/place-index.json" })` | Place in `static/data/place-index.json` |

For the entity-links and place-links shards (tens of thousands of small JSON files), the simplest approach is to symlink or copy them into `static/data/` as part of the pre-build pipeline. The `generate-content.js` script or a separate shell step can handle this.

**Alternative:** Configure `staticDir` in `hugo.toml` to include the `data/` directory at the project root, pointing Hugo's static file copy directly at the generated shards without moving files. This requires careful configuration to avoid copying source JSON exports into the site.

### Integration Point 5: Pagefind (Unchanged Mechanism, Different Output Directory)

**What stays identical:**
- All `data-pagefind-filter`, `data-pagefind-meta`, `data-pagefind-sort` attributes are emitted by Go templates exactly as they were by Nunjucks — Pagefind does not care which tool generated the HTML
- Three Pagefind index runs (descriptions, entities, places) with the same glob patterns and output subdirectories
- The `--glob "ne-*/**/*.html"` and `--glob "nl-*/**/*.html"` patterns work as-is if Hugo places entity pages at `/ne-*/` and place pages at `/nl-*/`

**What changes:**
- Pagefind runs over `public/` instead of `_site/`
- If content adapter paths are scoped under a section directory (e.g. `content/descripcion/`), description pages land at `/descripcion/{ref}/` — update Pagefind glob patterns accordingly, or use the `data-pagefind-entity-page` / `data-pagefind-place-page` attribute exclusion approach already in use

**Critical Pagefind detail:** The existing description index run uses `--exclude-selectors "[data-pagefind-entity-page],[data-pagefind-place-page]"` to exclude entity and place pages from the description index. This relies on entity/place templates emitting those `data-*` attributes. This logic is unchanged — it moves from Nunjucks attributes to Go template attributes.

### Integration Point 6: GitHub Actions Workflow

**What changes in deploy.yml:**

Remove:
```yaml
- name: Setup Node (for Eleventy)
  # still needed for precompute scripts and Pagefind
- name: Build site with Eleventy
  env:
    NODE_OPTIONS: --max-old-space-size=7168  # REMOVED — Hugo has no heap limit concern
  run: npx eleventy
```

Add:
```yaml
- name: Setup Hugo
  uses: peaceiris/actions-hugo@v3
  with:
    hugo-version: '0.147.0'   # pin to a current stable version

- name: Generate enriched content files
  run: node scripts/generate-content.js

- name: Build site with Hugo
  env:
    SITE_URL: https://zasqua.org
  run: |
    hugo --minify
    echo "Pages: $(find public -name 'index.html' | wc -l)"
    echo "Site size: $(du -sh public | cut -f1)"
```

Node.js must remain in the workflow for `precompute-links.js`, `generate-content.js`, and `npx pagefind`. The `NODE_OPTIONS` heap override is removed — it was only needed for Eleventy.

**Upload step change:** `upload-to-r2.py` receives `public` as the source directory instead of `_site`.

---

## Recommended Project Structure

```
zasqua-frontend-dev/
├── hugo.toml                    # Hugo configuration
├── assets/
│   └── hugo-data/               # Written by generate-content.js at build time
│       ├── descriptions.json    # Enriched descriptions (106K records)
│       ├── entities.json        # Enriched entities (78K records)
│       └── places.json          # Enriched places (7K records)
├── content/
│   ├── _content.gotmpl          # Optional: non-section root pages (index, search, etc.)
│   ├── descripcion/
│   │   └── _content.gotmpl      # Content adapter: 106K description pages
│   ├── ne/                      # Entity pages — matches existing ne-* URL prefix
│   │   └── _content.gotmpl      # Content adapter: 78K entity pages
│   ├── nl/                      # Place pages — matches existing nl-* URL prefix
│   │   └── _content.gotmpl      # Content adapter: 7K place pages
│   ├── buscar.md                # Search page (standalone content file)
│   ├── explorar/
│   │   ├── entidades.md         # Entity explorer page
│   │   └── lugares.md           # Place explorer page
│   └── index.md                 # Homepage
├── layouts/
│   ├── _default/
│   │   └── baseof.html          # Base layout (port of base.njk)
│   ├── descripcion/
│   │   └── single.html          # Description page layout (port of description.njk)
│   ├── ne/
│   │   └── single.html          # Entity page layout (port of entidad.njk)
│   ├── nl/
│   │   └── single.html          # Place page layout (port of lugar.njk)
│   └── partials/
│       ├── header.html          # Port of header.njk
│       ├── footer.html          # Port of footer.njk
│       ├── breadcrumb.html      # Port of breadcrumb.njk
│       └── filters/             # Returning partials replacing Nunjucks custom filters
│           ├── format-date.html # Spanish date formatting
│           ├── number-format.html
│           └── year-range.html  # (and centuryRange, decadeRange)
├── static/
│   ├── css/                     # main.css (compiled by Tailwind before Hugo runs)
│   ├── js/                      # All 8K lines of vanilla JS — copy as-is
│   ├── img/
│   ├── vendor/                  # MapLibre, pmtiles, Sigma.js
│   └── data/
│       ├── children/            # Tree JSON shards (moved from data/ at build time)
│       ├── entity-links/        # Per-entity link shards (moved from data/ at build time)
│       ├── place-links/         # Per-place link shards (moved from data/ at build time)
│       ├── entity-index.json
│       └── place-index.json
├── data/                        # Raw data downloaded from B2 (gitignored)
│   ├── descriptions.json
│   ├── entities.json
│   ├── places.json
│   ├── entity_links.json
│   └── place_links.json
├── scripts/
│   ├── precompute-links.js      # Unchanged
│   ├── generate-content.js      # NEW: produces assets/hugo-data/
│   ├── upload-to-r2.py          # Unchanged (receives "public" as source arg)
│   └── places-to-geojson.js     # Unchanged
└── .github/workflows/
    └── deploy.yml               # Modified: add Hugo setup, remove NODE_OPTIONS
```

**Structure rationale:**
- `assets/hugo-data/` is gitignored and generated at build time. Hugo's `resources.Get` reads from `assets/` — this is the correct location for data consumed by content adapters.
- `content/ne/` and `content/nl/` match the existing URL prefixes for entity (`ne-*`) and place (`nl-*`) pages, preserving existing URLs without redirects.
- `static/data/` receives the passthrough files that were previously handled by Eleventy's `addPassthroughCopy`. These are either symlinked or copied from `data/` at build time.
- `layouts/partials/filters/` separates reusable computation partials from structural partials.

---

## Data Flow

### Build-Time Data Flow

```
B2 zasqua-export
    ↓ b2 sync
data/ (raw JSON exports)
    ↓ node scripts/precompute-links.js
data/entity-links/{code}.json   (shards)
data/place-links/{code}.json
data/entity-index.json
data/place-index.json
data/desc-entity-lookup.json
data/desc-place-lookup.json
    ↓ node scripts/generate-content.js
assets/hugo-data/descriptions.json   (enriched: ancestors, repo, entity_codes, place_codes)
assets/hugo-data/entities.json        (enriched: _linked_count, roles)
assets/hugo-data/places.json          (enriched: _linked_count)
    ↓ [copy step: data/ shards → static/data/]
static/data/entity-links/
static/data/place-links/
static/data/entity-index.json
static/data/place-index.json
    ↓ ./tailwindcss -i ... -o static/css/main.css
    ↓ hugo --minify
public/ (192K HTML pages + static assets)
    ↓ npx pagefind (3 runs)
public/pagefind/          (description search index)
public/pagefind-entities/ (entity search index)
public/pagefind-places/   (place search index)
    ↓ python3 scripts/upload-to-r2.py public/ zasqua-site
Cloudflare R2
    ↓ Cloudflare Worker
zasqua.org
```

### Key Data Flow: generate-content.js

This script is the critical new component. It absorbs all enrichment logic that was previously inside Eleventy's `_data/*.js` files:

```
Inputs:
  data/descriptions.json        (raw, 106K records)
  data/repositories.json        (raw, ~5 records)
  data/entities.json            (raw, 78K records)
  data/places.json              (raw, 7K records)
  data/entity-index.json        (from precompute-links)
  data/desc-entity-lookup.json  (from precompute-links)
  data/desc-place-lookup.json   (from precompute-links)

Processing:
  - Build repo lookup map (code → repo object)
  - Build description ref lookup map (reference_code → description)
  - For each description: compute ancestor chain, attach _repo, attach _entity_codes, attach _place_codes
  - For each entity: attach _linked_count from entity-index.json, attach roles[]
  - For each place: attach _linked_count from entity-index equivalent

Outputs:
  assets/hugo-data/descriptions.json   (~370 MB; write with streaming if memory is a concern)
  assets/hugo-data/entities.json       (~35 MB)
  assets/hugo-data/places.json         (~5 MB)
```

**Memory note:** The enrichment step loads all descriptions into memory simultaneously to build the ref→description lookup map for ancestor chains. This is the same constraint that exists in the current `descriptions.js`. If memory becomes a concern at larger scales, ancestor chains can be precomputed in a separate pass and stored as a lookup file, avoiding the need to hold all descriptions in memory during the main enrichment loop.

---

## Suggested Build Order

The migration has two parallel work streams: (A) the pre-build pipeline and (B) the Hugo templates. Stream A must be working before Stream B can be fully validated against real data.

### Stream A — Pre-Build Pipeline

| Step | What | Dependency |
|------|------|------------|
| A1 | Create `scripts/generate-content.js` — skeleton that reads raw JSON and writes `assets/hugo-data/` with minimal enrichment (no ancestor chains yet) | None |
| A2 | Verify `assets/hugo-data/` files are produced correctly with DEV_LIMIT mode | A1 |
| A3 | Port ancestor chain computation from `descriptions.js` into `generate-content.js` | A1 |
| A4 | Port entity `_linked_count` and `roles` attachment from `entities.js` into `generate-content.js` | A1, precompute-links already done |
| A5 | Port place `_linked_count` attachment from `places.js` | A1 |
| A6 | Add copy step: `data/entity-links/` and `data/place-links/` → `static/data/` | precompute-links already done |
| A7 | Validate full output with production data — check counts, ancestor chains, entity codes | A3–A6 |

### Stream B — Hugo Templates

| Step | What | Dependency |
|------|------|------------|
| B1 | Create `hugo.toml` with minimal config — publishDir, staticDir, language settings | None |
| B2 | Port `base.njk` → `layouts/_default/baseof.html` | B1 |
| B3 | Port `header.njk`, `footer.njk`, `breadcrumb.njk` → `layouts/partials/` | B2 |
| B4 | Create content adapter `content/descripcion/_content.gotmpl` with a subset of fields (title, reference_code, params) | B1, A2 |
| B5 | Create `layouts/descripcion/single.html` — port `description.njk` without Pagefind metadata first | B3, B4 |
| B6 | Validate description pages render correctly against DEV_LIMIT data | B5, A2 |
| B7 | Add all Pagefind metadata (`data-pagefind-filter`, `data-pagefind-meta`, `data-pagefind-sort`) to description layout | B6 |
| B8 | Create returning partials for custom filters (formatDate Spanish months, numberFormat, yearRange, centuryRange, decadeRange) | B3 |
| B9 | Port entity content adapter and layout (`ne/_content.gotmpl`, `layouts/ne/single.html`) | B8, A4 |
| B10 | Port place content adapter and layout (`nl/_content.gotmpl`, `layouts/nl/single.html`) | B8, A5 |
| B11 | Port standalone pages: index, buscar, explorar/entidades, explorar/lugares, 404 | B3 |
| B12 | Full build with production data — verify all 192K pages, check build time and memory | A7, B10 |
| B13 | Validate Pagefind: run all 3 index passes, verify search and facets work | B12 |

### Stream C — CI/CD Update

| Step | What | Dependency |
|------|------|------------|
| C1 | Update `deploy.yml`: add Hugo setup, add `generate-content.js` call, replace `npx eleventy` with `hugo`, change upload source to `public/` | B12 |
| C2 | Remove `NODE_OPTIONS` heap override from CI | C1 |
| C3 | Validate full CI run end-to-end | C1, C2 |

---

## Anti-Patterns

### Anti-Pattern 1: Using Hugo's data/ Directory for Large JSON Arrays

**What people do:** Place `descriptions.json` in Hugo's `data/` directory and access it via `site.Data.descriptions` in content adapters.

**Why it's wrong:** Hugo loads all files in `data/` into memory at build start and keeps them there for the entire build. A 370 MB combined payload (descriptions + entities + places + links) held in memory for 192K template renders will not OOM Hugo the way it OOMs Eleventy, but it is wasteful and may cause unexpected memory pressure on the GitHub Actions runner.

**Do this instead:** Place JSON files in `assets/hugo-data/` and read them in content adapters with `resources.Get "hugo-data/descriptions.json" | transform.Unmarshal`. Hugo reads and parses the file once for the content adapter, then the data is scoped to that template execution.

### Anti-Pattern 2: Putting Enrichment Logic in Content Adapters

**What people do:** In the content adapter template, iterate over descriptions and compute ancestor chains using Go template `{{ range }}` — e.g. repeatedly scanning the full descriptions slice to find parents for each record.

**Why it's wrong:** Go templates are not optimised for O(n²) operations. Computing ancestor chains (which requires a lookup by reference_code for up to 6 hops per description) across 106K records inside a Go template loop will be extremely slow — potentially worse than Eleventy.

**Do this instead:** Pre-compute all enrichment in `generate-content.js` before Hugo runs. Content adapters should read already-enriched data and pass fields to `$.AddPage` without any computation. Templates read and render; scripts compute.

### Anti-Pattern 3: Losing Existing URLs

**What people do:** Place all content adapters at `content/_content.gotmpl` and use `"path" (printf "descripcion/%s" .reference_code)` to scope description pages under `/descripcion/`.

**Why it's wrong:** The existing site has ~106K indexed description pages at `/{reference_code}/` (e.g. `/CO-ANH-01-001/`). Changing the URL structure breaks every existing link, Pagefind index entry, and search engine result.

**Do this instead:** Mirror the existing URL structure. An adapter at `content/descripcion/_content.gotmpl` produces paths under `/descripcion/` — if descriptions currently live at the root, the adapter must be `content/_content.gotmpl` with `"path" .reference_code`. Verify existing URL patterns before placing adapters.

### Anti-Pattern 4: Running Pagefind on Hugo's Public Directory with Wrong Glob Patterns

**What people do:** Copy the existing Pagefind commands unchanged, pointing `--glob "ne-*/**/*.html"` at `public/`.

**Why it may break:** If content adapters are placed at `content/ne/_content.gotmpl`, entity pages land at `public/ne/{code}/index.html`, not `public/ne-abc123/index.html`. The glob `ne-*/**/*.html` may or may not match depending on whether entity codes begin with `ne-`.

**Do this instead:** Verify the actual output URL structure from Hugo before writing Pagefind glob patterns. Hugo entity pages at `content/ne/` with `path: ent.entity_code` will land at `/ne/{entity_code}/`. If entity codes are `ne-abc123`, the glob works. If they are just `abc123`, update the glob to `ne/**/*.html`.

### Anti-Pattern 5: Conflating assets/ with static/

**What people do:** Place the generated `hugo-data/*.json` files in `static/` or `data/` and try to read them in content adapters with `resources.Get`.

**Why it's wrong:** `resources.Get` reads from `assets/` only. Files in `static/` are copied verbatim to `public/` but are not accessible as Hugo resources. Files in `data/` are accessible via `site.Data` but not via `resources.Get`.

**Do this instead:** Generated content files → `assets/hugo-data/`. Client-side JSON files served to the browser (link shards, index files) → `static/data/`.

---

## Scaling Considerations

| Concern | Eleventy (current) | Hugo (target) | Notes |
|---------|-------------------|---------------|-------|
| Peak memory | 7 GB heap, OOMs at 192K pages | ~1 GB estimated | Hugo compiles Go; content adapters scope data per section |
| Build time (CI) | OOM before completion | ~30–90 seconds estimated | Linear scaling benchmarked to 100K; 192K extrapolated |
| generate-content.js memory | N/A | ~2–4 GB (same constraints as Eleventy's _data/) | Node still holds all descriptions in memory for ancestor chains |
| Pagefind index time | ~3 × full site scan | Unchanged | 3 separate Pagefind runs; post-Hugo, same as before |
| R2 upload time | ~10 min (345 files/s) | Unchanged | Output file count and structure largely unchanged |
| Future growth to 500K pages | Would require major pipeline changes | Hugo designed for this scale | Hugo's own benchmark site runs 600K pages |

---

## Sources

- [Hugo content adapters — official docs](https://gohugo.io/content-management/content-adapters/) — `$.AddPage` syntax, local file reading, `path` semantics — HIGH confidence
- [Hugo data sources — official docs](https://gohugo.io/content-management/data-sources/) — `data/` vs `assets/` vs `resources.Get` memory semantics — HIGH confidence
- [Hugo 0.126.x content adapters launch post](https://www.brycewray.com/posts/2024/05/hugo-0-126-x-speedy-pages-data/) — performance benchmarks, 20K pages / 49 MB JSON — MEDIUM confidence (third-party)
- [Hugo forum: content adapters examples and performance](https://discourse.gohugo.io/t/content-adapters-examples-and-performance/49830) — 100K page linear scaling benchmark — MEDIUM confidence (community-verified, not official)
- [Hugo forum: content adapters with local data](https://discourse.gohugo.io/t/content-adapters-using-local-data/50317) — `assets/` vs `data/` recommendation — MEDIUM confidence
- [Hugo directory structure](https://gohugo.io/getting-started/directory-structure/) — `static/`, `assets/`, `content/`, `layouts/` roles — HIGH confidence
- [Hugo time.Format](https://gohugo.io/functions/time/format/) — Spanish month names require manual partial; not natively locale-switchable within `time.Format` for custom month strings — HIGH confidence
- [peaceiris/actions-hugo GitHub Action](https://github.com/peaceiris/actions-hugo) — Hugo setup in GitHub Actions — HIGH confidence
- Pagefind post-build integration — unchanged from existing architecture; Pagefind is framework-agnostic
- Cloudflare R2 + Worker deployment — unchanged from existing architecture

---

*Architecture research for: Zasqua Frontend v0.6.0 — Hugo migration and build pipeline sustainability*
*Researched: 2026-04-16*
