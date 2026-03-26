# Stack Research

**Domain:** Static archival discovery site — entity/place detail pages, spatial heatmap, network graph
**Researched:** 2026-03-26
**Confidence:** HIGH (all critical claims verified against official sources or npm)

---

## Context: What Already Exists (Do Not Re-research)

This milestone adds to an existing validated stack. The following are confirmed and must not change:

- Eleventy 3 + Nunjucks templates
- Tailwind CSS v4 (standalone CLI, no npm)
- Pagefind (client-side search + JS API)
- TIFY v0.31.0 (IIIF viewer)
- Vanilla JS throughout — no framework
- Cloudflare R2 + Worker hosting
- GitHub Actions CI/CD

All new additions must integrate cleanly with vanilla JS and avoid introducing a build chain (no webpack, no Vite, no npm-dependent CSS).

---

## New Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| MapLibre GL JS | 5.x (currently 5.21.1) | Interactive maps — place detail embedded maps, place explorer heatmap | Open-source WebGL map renderer, standard replacement for Mapbox GL JS; native heatmap layer support built in; actively maintained with frequent releases. License: BSD. |
| pmtiles (JS) | 4.4.0 | PMTiles protocol handler for MapLibre | Official Protomaps JS client; registers a custom `pmtiles://` protocol via `maplibregl.addProtocol` so MapLibre can read tiles from R2 over HTTP range requests. No tile server needed. |
| Sigma.js | 3.0.2 | Network graph rendering — entity co-occurrence via shared documents | WebGL-based, renders tens of thousands of nodes smoothly. Works with vanilla JS via `new Sigma(graph, containerElement)`. v3 released March 2024, stable. Requires graphology as a peer dependency. |
| graphology | 0.25.4 | Graph data structure for Sigma.js | Mandatory peer of Sigma.js. Handles graph construction, traversal, and layout algorithms. Framework-agnostic; plain JS API. |

### Supporting Libraries and Tools

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| tippecanoe | 2.17+ | Convert GeoJSON → PMTiles at build time | Required build step to generate the `.pmtiles` file from `places.json` coordinate data. Install on CI runner. Produces much more efficient overview tiles than GDAL. |
| Pagefind JS API | 1.4.0 (already in use) | Drive map and graph views from search/filter state | Already installed. Use `pagefind.search()` and `pagefind.filters()` programmatically to feed results into map bounds or graph highlights without a separate data request. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tippecanoe | Build-time GeoJSON → PMTiles conversion | Install via Homebrew (`brew install tippecanoe`) for local dev; install via apt/brew on GitHub Actions runner. Not a JS package — it's a native binary. |
| wrangler | Set R2 CORS policy for PMTiles range requests | Already in use for R2 deploys. Run once: `wrangler r2 bucket cors set zasqua-site --file cors.json` |

---

## Integration Points

### MapLibre GL JS — CDN/ESM, No Build Chain

MapLibre ships a self-contained UMD bundle and an ESM build, both available via CDN. Because this project uses no npm build step for JS, load via CDN in Nunjucks templates:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.css" />
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.js"></script>
```

Then load the pmtiles protocol handler as a module script (it ships as ESM):

```html
<script type="module">
  import { Protocol } from 'https://cdn.jsdelivr.net/npm/pmtiles@4/dist/pmtiles.js';
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  // addProtocol must be called only once per page load
</script>
```

Map sources then use `pmtiles://https://r2-public-url/places.pmtiles` as the tile URL.

### Sigma.js — CDN, No Build Chain

Both sigma and graphology ship UMD bundles compatible with vanilla JS via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/graphology@0.25.4/dist/graphology.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sigma@3.0.2/build/sigma.min.js"></script>
```

Instantiate with `new Sigma(graph, document.getElementById('container'))`. The container element needs an explicit height set in CSS.

### Pagefind JS API — Driving External Visualizations

Pagefind 1.4.0's JS API supports programmatic search and filtering without using the default UI. Use it to synchronize search state with map viewport or graph highlights:

```js
const pagefind = await import('/pagefind/pagefind.js');
await pagefind.init();

// Get current filter counts to populate facet UI
const filters = await pagefind.filters();

// Search with filters, results drive map/graph
const search = await pagefind.search('query', {
  filters: { entity_type: 'Persona' }
});
const results = await Promise.all(search.results.map(r => r.data()));
```

Results include the page URL, title, and metadata — sufficient to cross-reference entity codes for graph highlighting.

### PMTiles — R2 Hosting Requirements

PMTiles uses HTTP Range Requests, so the R2 bucket serving the `.pmtiles` file must have a CORS policy that allows the `range` header. Add this once to the `zasqua-site` bucket:

```json
[{
  "AllowedOrigins": ["https://zasqua.neogranadina.org"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["range", "if-match"],
  "ExposeHeaders": ["etag"],
  "MaxAgeSeconds": 3000
}]
```

The existing Cloudflare Worker may also need `Access-Control-Allow-Headers: range` forwarded. R2 is the recommended platform for PMTiles by Protomaps because it charges per-request rather than per-byte transferred.

### PMTiles — Build-Time Generation

The `.pmtiles` file is generated from `places.json` at build time and uploaded to R2 alongside the static site. The workflow:

1. Export `places.json` from backend (already in use — 3.1 MB, 8,177 places, 5,574 with coordinates)
2. Convert to GeoJSON FeatureCollection with lat/lon as geometry
3. Run tippecanoe: `tippecanoe -zg -o places.pmtiles -l places places.geojson`
4. Upload `places.pmtiles` to the `zasqua-site` R2 bucket alongside HTML

The `-zg` flag auto-selects zoom levels. For 5,574 points at typical density, this produces a small file (estimated <2 MB). The `.pmtiles` file does not need to be regenerated with every content build — only when place data changes.

---

## Build Architecture for ~200K Pages

### The Problem

Current build: ~106K pages in ~14 minutes. Adding ~100K entity/place pages risks ~28-minute builds — too slow for CI. Eleventy processes all templates in a single Node.js process with no native parallelism across content types.

### Recommended Approach: Two Independent Builds, Merged Before Upload

Run two separate Eleventy builds in parallel on the CI runner, each targeting a different output directory. Merge the outputs into a single directory, then run Pagefind and the R2 upload over the merged output.

```
Build A (existing):  src/ → _site/          ~106K pages, ~14 min
Build B (entities):  src-entities/ → _site-entities/  ~100K pages, ~14 min
                     ↓ (parallel in GitHub Actions)
                  merge: cp -r _site-entities/* _site/
                  pagefind --site _site/
                  upload _site/ → R2
```

This keeps total CI time at ~14-16 minutes (parallel) rather than ~28+ minutes (sequential). Eleventy's own benchmarks show sub-1ms per page at scale — the 14-minute baseline for 106K pages suggests the bottleneck is data loading and Pagefind indexing, not template rendering.

### Key Constraint

Pagefind must index the merged output, not each build separately. Run Pagefind once over the full merged `_site/` to ensure cross-content search works (entity pages appear in search alongside description pages).

### Alternative Considered

Incremental builds (`eleventy --incremental`) are suitable for development but not for CI, where the full output must be reproducible from a clean state. Do not use incremental builds in CI.

### Eleventy Configuration Notes

- Each build uses its own `eleventy.config.js` pointing at separate `input` and `output` directories
- Both share the same `src/_data/` if they need common site data (e.g. `site.js`, `ui.js`)
- The entity/place build may need access to `entities.json` (29.9 MB) and `places.json` (3.1 MB) — both already downloaded at build time from B2

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| MapLibre GL JS | Leaflet | Leaflet has no native WebGL heatmap or vector tile layer; requires plugins that add complexity. MapLibre GL renders heatmaps and PMTiles natively in a single library. |
| MapLibre GL JS | Google Maps / Mapbox | Google Maps requires API key and billing; Mapbox GL JS changed licence in 2020 and is no longer open source. MapLibre is the maintained community fork. |
| PMTiles on R2 | Tile server (Martin, TileServer GL) | Tile servers require runtime infrastructure; this project is fully static. PMTiles + R2 has no ongoing server cost, no deployment to maintain. |
| PMTiles on R2 | Protomaps hosted service | Adds external dependency and cost; R2 is already in use and has no bandwidth charges. |
| Sigma.js | D3 force-directed graph | D3 requires building graph primitives from scratch; Sigma provides complete graph rendering with layout algorithms out of the box. |
| Sigma.js | Cytoscape.js | Cytoscape is DOM-based and struggles above ~5K nodes. Zasqua's entity network (92K entities, 308K links) requires WebGL rendering. Sigma's WebGL renderer handles this comfortably. |
| Sigma.js | vis-network | vis-network is order-of-magnitude slower than Sigma.js in benchmarks; canvas-based with no WebGL path. |
| Two independent builds | Single integrated build | A single build at ~200K pages risks ~28-minute CI times. Two parallel builds keep CI under 16 minutes. |
| Two independent builds | Eleventy --incremental in CI | Incremental builds are not reproducible from a clean state; not appropriate for CI. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React, Vue, Svelte | This is a vanilla JS project. Any framework introduces a build step, increases bundle size, and violates the existing architectural pattern. | Vanilla JS with CDN-loaded libraries |
| Mapbox GL JS | Changed licence in 2020; proprietary for production use above certain thresholds | MapLibre GL JS (open-source fork) |
| D3 force graph | Requires building all graph interaction primitives from scratch; poor performance above 1K nodes without WebGL | Sigma.js + graphology |
| Leaflet | No native vector tile or WebGL heatmap support; requires fragile plugin ecosystem | MapLibre GL JS |
| tile-server infrastructure | Eliminates the static/serverless architecture entirely | PMTiles on R2 |
| npm for JS builds | Project uses Tailwind standalone CLI precisely to avoid npm. Do not introduce package.json JS builds. | CDN or self-hosted library files |
| Eleventy --incremental in CI | Not reproducible; hides missing pages between runs | Full clean builds (split into two parallel runs) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| maplibre-gl@5.x | pmtiles@4.x | pmtiles@4 uses the `addProtocol` API stable in MapLibre 4+; confirmed working with v5 |
| sigma@3.0.2 | graphology@0.25.4 | sigma v3 requires graphology as peer dep; these versions are the current stable pairing per CDN |
| pmtiles@4.4.0 | MapLibre 5.x | `addProtocol` must be called once per page; compatible with ESM and UMD loading |
| Pagefind 1.4.0 | Eleventy 3 | Already in use; JS API `import('/pagefind/pagefind.js')` works from any vanilla JS context |

---

## Installation

The project avoids npm for JS. All new JS libraries load via CDN on pages that need them. Tippecanoe is a native binary installed on the build runner.

```bash
# Tippecanoe — build tool for PMTiles generation
# macOS (dev)
brew install tippecanoe

# Ubuntu/Debian (GitHub Actions runner)
sudo apt-get install -y tippecanoe
# or build from source if package is not current:
# https://github.com/felt/tippecanoe

# One-time: configure R2 CORS for PMTiles range requests
wrangler r2 bucket cors set zasqua-site --file cors-pmtiles.json
```

No npm packages to add. MapLibre, pmtiles, sigma, and graphology all load via jsDelivr CDN on their respective pages only — not globally.

---

## Sources

- [PMTiles + MapLibre integration docs](https://docs.protomaps.com/pmtiles/maplibre) — protocol handler setup, `addProtocol` usage — MEDIUM confidence (version not pinned in docs)
- [PMTiles cloud storage / R2 docs](https://docs.protomaps.com/pmtiles/cloud-storage) — CORS headers required for range requests — HIGH confidence (official Protomaps docs)
- [PMTiles create / tippecanoe](https://docs.protomaps.com/pmtiles/create) — tippecanoe workflow for GeoJSON → PMTiles — HIGH confidence (official docs)
- [MapLibre GL JS npm](https://www.npmjs.com/package/maplibre-gl) — v5.21.1 current version confirmed — HIGH confidence
- [MapLibre heatmap layer docs](https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer/) — native heatmap layer — HIGH confidence (official docs)
- [pmtiles npm package](https://www.npmjs.com/package/pmtiles) — v4.4.0 current version confirmed — HIGH confidence
- [sigma npm](https://www.npmjs.com/package/sigma) — v3.0.2 current stable version — HIGH confidence
- [Sigma.js v3 release announcement](https://www.ouestware.com/2024/03/21/sigma-js-3-0-en/) — v3 released March 2024, WebGL rendering details — MEDIUM confidence
- [Pagefind JS API docs](https://pagefind.app/docs/api/) — v1.4.0, programmatic search and filter API — HIGH confidence (official docs)
- [Pagefind JS API filtering docs](https://pagefind.app/docs/js-api-filtering/) — filter syntax — HIGH confidence (official docs)
- [Eleventy performance docs](https://www.11ty.dev/docs/performance/) — build benchmark data — HIGH confidence (official docs)
- [Cloudflare R2 CORS docs](https://developers.cloudflare.com/r2/buckets/cors/) — CORS policy configuration via wrangler — HIGH confidence (official Cloudflare docs)
- [Sigma.js vs Cytoscape.js performance comparison](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/) — WebGL performance benchmarks — MEDIUM confidence (third-party analysis)

---

*Stack research for: Zasqua Frontend v0.5.0 — entity/place discovery*
*Researched: 2026-03-26*
