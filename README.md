# Zasqua Frontend

Static site frontend for [Zasqua](https://zasqua.org), an open-source archival platform for hosting and discovering large collections of digitized historical documents. Built with [Eleventy](https://www.11ty.dev/) (11ty) and [Pagefind](https://pagefind.app/).

## Overview

Zasqua Frontend generates the public site at [zasqua.org](https://zasqua.org), providing access to over 104,000 archival descriptions from five repositories in Colombia and Peru. The entire site is static — no server required at runtime. Search runs client-side via Pagefind's WASM engine, hierarchical navigation loads pre-built JSON trees on demand, and all images are served as IIIF Level 0 static tiles.

This architecture is a deliberate application of minimal computing principles: the platform serves over 100,000 descriptions with faceted search, Miller column hierarchy browsing, and high-resolution image viewing — all without a single server-side process. The result is a site that is fast, cacheable, cheap to host, and resilient. Because the public site is just files — HTML, JSON, static image tiles — it can be archived, mirrored, or rebuilt from exports with no dependencies on running services.

**Key features:**

- Static HTML pages for every archival description
- Client-side search with faceting, accent tolerance, and hierarchical date filtering
- Miller column tree navigation for browsing archival hierarchies
- IIIF deep-zoom viewer for 121,000+ digitized images
- Full-text search across OCR content from digitized materials
- Bilingual metadata (English and Spanish)
- Responsive design with mobile-optimized viewer

## Requirements

- Node.js 18+
- npm

## Data

The frontend reads pre-exported JSON data at build time. This data is produced by the Django backend's `export_frontend_data` management command and placed in a `data/` directory (gitignored):

```
data/
  descriptions.json          # All descriptions with metadata + OCR text (~218 MB)
  repositories.json          # Repository records (~14 KB)
  children/                  # Tree children per parent (~1,600 files, ~40 MB)
  entities.json              # Entity records (~31 MB)
  places.json                # Place records (~3.3 MB)
  entity_links.json          # Entity-to-description links
  place_links.json           # Place-to-description links
  entity-links/              # Pre-computed entity link shards (generated at build)
  place-links/               # Pre-computed place link shards (generated at build)
  entity-index.json          # Pre-computed entity index (generated at build)
  place-index.json           # Pre-computed place index (generated at build)
  entity-cooccurrence.json   # Pre-computed co-occurrence graph (generated at build)
  places.geojson             # GeoJSON for Tippecanoe (generated at build)
  zasqua-places.pmtiles      # Map tiles (generated at build, uploaded to R2)
```

The `DATA_DIR` environment variable overrides the default `./data/` path.

## Build

```bash
# Install dependencies
npm install

# Full build (Eleventy + Pagefind index)
npm run build

# Development build (limited to 100 descriptions for speed)
npm run build:dev

# Development server with live reload
npm run dev
```

The built site is output to `_site/`.

### Build stages

`npm run build` runs two stages:

1. **Eleventy** generates static HTML from the JSON data and Nunjucks templates
2. **Pagefind** indexes the built pages for client-side search

Tree children JSON files are copied to `_site/data/children/` via Eleventy's passthrough copy — no separate build step required.

### Build performance

| Stage | Full build | Dev build (100 pages) |
|-------|-----------|----------------------|
| Eleventy | ~15 min | ~1 sec |
| Pagefind | ~3 min | ~1 sec |
| **Total** | **~18 min** | **~2 sec** |

## Project Structure

```
src/
  _data/            Data layer (reads local JSON files)
    descriptions.js   104K descriptions (with OCR text)
    repositories.js   5 repositories (with root descriptions)
    entities.js       Stub (templates use denormalized fields)
    places.js         Stub (templates use denormalized fields)
    site.js           Site metadata (title, URL, language)
    ui.js             UI strings (Spanish)
  _includes/        Nunjucks partials
    header.njk        Site header with responsive hamburger menu
    footer.njk        Site footer
    breadcrumb.njk    Breadcrumb navigation
    children-tree.njk Collapsible children tree for description pages
  _layouts/         Page layouts
    base.njk          Base HTML layout
  css/
    main.css          All styles (Neogranadina visual identity)
  img/              Static images
  js/               Client-side JavaScript
    search.js         Pagefind search with facets, filters, pagination
    tree.js           Miller columns tree navigation (lazy-loads children JSON)
    description.js    Description page interactions
    header.js         Responsive header toggle
  index.njk         Home page (repository grid)
  repository.njk    Repository landing pages
  description.njk   Description detail pages (104K+)
  buscar.njk        Search page (/buscar/)
eleventy.config.js  Eleventy configuration and custom filters
```

## Pages

| Page | URL | Template |
|------|-----|----------|
| Home | `/` | `index.njk` |
| Repository | `/{repo-code}/` | `repository.njk` |
| Description | `/{reference-code}/` | `description.njk` |
| Search | `/buscar/` | `buscar.njk` |

## Search

Search uses [Pagefind](https://pagefind.app/) — a static search library that runs entirely in the browser via WebAssembly. No search server is required.

**Indexed content per page:**
- Title and metadata (default weight)
- OCR full text for PE-BN digitized materials (weight 0.5 — metadata matches rank higher)

**Search features:**
- Multi-word AND queries
- Quoted phrase search
- Accent-insensitive matching (García finds Garcia)
- Spanish stemming
- Faceted filtering: repository, description level, digital status, date (century/decade/year)
- Sorting by date, title, reference code, or relevance

## Data Pipeline

The full publish workflow:

1. **Catalog** in Django admin (backend running locally)
2. **Export** data with `manage.py export_frontend_data`
3. **Upload** JSON to Backblaze B2 private bucket
4. **Build** triggered manually via GitHub Actions — downloads data from B2, pre-computes link shards and co-occurrence graph, generates PMTiles for map data, runs Eleventy + Pagefind
5. **Deploy** built site to Cloudflare R2, PMTiles to `zasqua-map-tiles` R2 bucket

The Django backend is only needed during cataloging and export — not at runtime.

## Hosting

The site is served by a Cloudflare Worker (`worker/`) that reads from two R2 buckets:

- **`zasqua-site`** — the built static site (HTML, CSS, JS, JSON)
- **`zasqua-map-tiles`** — PMTiles map data, served at `/tiles/`

The `/tiles/` route handles HTTP Range requests (required by the PMTiles format). Because tiles are served from the same origin, no CORS configuration is needed.

### Local tile generation

To generate and test map tiles locally without a full CI build:

```bash
# Export place data from the Django backend
cd ../zasqua-backend-dev
python manage.py export_frontend_data
cp /tmp/zasqua-export/places.json ../zasqua-frontend-dev/data/

# Generate GeoJSON and PMTiles
cd ../zasqua-frontend-dev
node scripts/places-to-geojson.js
tippecanoe -Z0 -z14 --drop-densest-as-needed -l places \
  -o data/zasqua-places.pmtiles data/places.geojson

# Upload to R2 and deploy Worker
cd worker
npx wrangler r2 object put zasqua-map-tiles/zasqua-places.pmtiles \
  --file ../data/zasqua-places.pmtiles
npx wrangler deploy

# Verify
curl -v -H "Range: bytes=0-512" https://zasqua.org/tiles/zasqua-places
```

Tippecanoe is required for PMTiles generation: `brew install tippecanoe` (macOS) or `pip install tippecanoe` (Linux).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_DIR` | `./data/` | Path to exported JSON data |
| `DEV_MODE` | `false` | Limit descriptions to 100 for faster builds |
| `SITE_URL` | `http://localhost:8080` | Base URL for the site |

## Related

- [Zasqua Backend](https://github.com/neogranadina/zasqua-backend) — Django application for cataloguing and data export

## License

GPL-3.0. See [LICENSE](LICENSE) for details.

---

Zasqua is developed by [Neogranadina](https://neogranadina.org) and the [Archives, Memory, and Preservation Lab](https://ampl.clair.ucsb.edu) of the University of California, Santa Barbara.
