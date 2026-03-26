# Architecture Research

**Domain:** Static archival discovery site — entity/place discovery features on Eleventy + Pagefind + Cloudflare R2
**Researched:** 2026-03-26
**Confidence:** HIGH (core integration patterns verified against official docs and existing codebase)

---

## Current Architecture (Baseline)

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD PIPELINE                           │
│  B2 (zasqua-export) → data/ → Eleventy → _site/ → Pagefind     │
│  descriptions.json (106K pages)                                 │
│  repositories.json                                              │
│  children/ (tree JSON)                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ upload-to-r2.py (100 threads)
┌───────────────────────────────▼─────────────────────────────────┐
│                   Cloudflare R2 (zasqua-site)                   │
│  HTML pages  │  Pagefind index  │  static assets  │  tree JSON  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│              Cloudflare Worker (routing + edge cache)           │
│  path → R2 key resolution, Cache-Control headers                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                          zasqua.org
```

**Key facts from codebase:**
- `description.njk` paginates over `descriptions` array from `src/_data/descriptions.js`
- `entities.js` and `places.js` currently return `[]` — deliberately unused
- `data-pagefind-meta`, `data-pagefind-filter`, `data-pagefind-sort` already in use on description pages (hidden `<div>`)
- Worker routes all paths to R2 keys, adding `index.html` suffix for directory paths
- Upload script handles `.pmtiles` extension already (maps to `application/octet-stream`)

---

## Target Architecture (v0.5.0)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           BUILD PIPELINE                                   │
│                                                                            │
│  B2 (zasqua-export)                                                        │
│    descriptions.json  →  descriptions build  (106K pages, ~14 min)        │
│    repositories.json  →  (shared)                                          │
│    entities.json      →  entity/place build  (~100K pages)                 │
│    places.json        →                                                    │
│    entity_links.json  →  pre-compute aggregates (Node script)              │
│    place_links.json   →                                                    │
│                                                                            │
│  Option A: Single Eleventy build (simplest, longest)                       │
│  Option B: Two parallel Eleventy instances → merge _site/ before Pagefind  │
│                                                                            │
│  Pagefind indexes merged _site/                                            │
│  Tippecanoe converts places GeoJSON → zasqua-places.pmtiles                │
└─────────────────────────────────────────────────────────────────────────────┘
                          │                       │
          upload-to-r2.py (HTML+Pagefind)   upload PMTiles separately
                          │                       │
┌─────────────────────────▼───────────────────────▼───────────────────────────┐
│                      Cloudflare R2 (zasqua-site)                            │
│                                                                             │
│  HTML pages                     Pagefind index                             │
│    /descripcion/{ref}/          /_site/pagefind/                            │
│    /lugar/{name}/               Aggregates (pre-built JSON)                 │
│    /entidad/{code}/             /data/entity-links/{code}.json              │
│    /explorar/lugares/           /data/place-links/{name}.json               │
│    /explorar/entidades/                                                     │
│                                                                             │
│  PMTiles (separate R2 object, NOT in _site/)                               │
│    zasqua-places.pmtiles                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                          │                       │
              Cloudflare Worker              PMTiles Worker
              (existing routing)             (range request proxy)
                          │                       │
                          └──────────┬────────────┘
                                zasqua.org
```

---

## Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|----------------|-----------------|
| `src/_data/entities.js` | Load `entities.json` from `data/` | Modified — activate |
| `src/_data/places.js` | Load `places.json` from `data/` | Modified — activate |
| `src/_data/entity_links.js` | Load pre-computed entity→description map | New |
| `src/_data/place_links.js` | Load pre-computed place→description map | New |
| `src/entidad.njk` | Paginate over entities, one page per entity | New template |
| `src/lugar.njk` | Paginate over places, one page per place | New template |
| `src/explorar/entidades.njk` | Entity explorer page (search + graph) | New template |
| `src/explorar/lugares.njk` | Place explorer page (search + heatmap) | New template |
| `scripts/precompute-links.js` | Compute entity/place→description aggregates at build time | New script |
| `scripts/generate-pmtiles.sh` | Convert places GeoJSON to PMTiles via Tippecanoe | New script |
| `worker/worker.js` | Add PMTiles routing with range request support | Modified |
| `scripts/upload-to-r2.py` | Add `.pmtiles` MIME type (already `application/octet-stream`) | No change |
| `build.sh` / `deploy.yml` | Download entity/place JSON, run precompute, run Tippecanoe | Modified |
| `eleventy.config.js` | Passthrough `data/entity-links/` and `data/place-links/` | Modified |

---

## Pattern 1: Pre-Computing Aggregates at Build Time

**What:** Before Eleventy runs, a Node script reads `entities.json`, `places.json`, and two relationship files (`entity_links.json`, `place_links.json` exported from Django) and writes per-entity and per-place JSON files into `data/entity-links/` and `data/place-links/`. Each file is `{code}.json` containing the list of linked description reference codes, titles, and dates.

**When to use:** The relationship data (308K entity→description links, 85K place→description links) is too large to load into every Eleventy template as a global data file. Per-entity/place shards are the right shape.

**Trade-offs:** Adds a pre-build step (~30–60s for 400K links). Results are passthrough-copied to `_site/data/entity-links/` and served as static JSON — fetched client-side on entity/place detail pages. Keeps Eleventy templates simple and avoids loading 308K links into Node memory as a single global data object.

**Implementation note:** The `descriptions.js` data file already does a similar in-memory aggregation pass (ancestors, repo lookup) over 106K records. The entity-links precompute is better handled as a separate script so it doesn't bloat the data layer further.

**Example flow:**
```
scripts/precompute-links.js
  reads: data/entity_links.json   [{entity_code, reference_code, title, date_start}]
  reads: data/place_links.json    [{place_code, reference_code, title, date_start}]
  writes: data/entity-links/{code}.json  (one per entity, array of desc stubs)
  writes: data/place-links/{name}.json   (one per place, array of desc stubs)

eleventy.config.js:
  addPassthroughCopy({ "data/entity-links": "data/entity-links" })
  addPassthroughCopy({ "data/place-links": "data/place-links" })
```

The entity/place detail pages fetch their own shard via `fetch('/data/entity-links/{code}.json')` on page load — no build-time inclusion needed.

---

## Pattern 2: Pagefind Metadata for Driving Visualizations

**What:** Pagefind's `data-pagefind-meta` attribute captures arbitrary string values per page and returns them in the JS API result object as `result.meta`. These can be lat/lon strings, entity types, place types — any value that needs to accompany a search result without being part of the visible body text.

**Verified capabilities (HIGH confidence):**
- `pagefind.search(null, { filters: { entity_type: "persona" } })` — filter without text query
- `await result.data()` returns `{ url, excerpt, meta: { lat: "4.6097", lon: "-74.0817", ... } }`
- Meta values are strings; parse to float client-side for mapping
- `data-pagefind-meta` elements can be hidden (in a `display:none` div, as already done for description pages)

**Entity/place page Pagefind metadata to add:**
```html
{# lugar.njk — hidden metadata for Pagefind #}
<div style="display:none">
  <span data-pagefind-filter="place_type">{{ place.place_type }}</span>
  <span data-pagefind-filter="fclass">{{ place.fclass }}</span>
  <span data-pagefind-meta="lat">{{ place.lat }}</span>
  <span data-pagefind-meta="lon">{{ place.lon }}</span>
  <span data-pagefind-meta="place_code">{{ place.place_code }}</span>
  <span data-pagefind-meta="display_name">{{ place.display_name }}</span>
  <span data-pagefind-meta="description_count">{{ place._description_count }}</span>
</div>

{# entidad.njk #}
<div style="display:none">
  <span data-pagefind-filter="entity_type">{{ entity.entity_type }}</span>
  <span data-pagefind-meta="entity_code">{{ entity.entity_code }}</span>
  <span data-pagefind-meta="display_name">{{ entity.display_name }}</span>
  <span data-pagefind-meta="date_earliest">{{ entity.date_earliest }}</span>
  <span data-pagefind-meta="description_count">{{ entity._description_count }}</span>
</div>
```

**How heatmap data flows from Pagefind to MapLibre:**
```
User applies filter (e.g. place_type = "ciudad")
  → pagefind.search(null, { filters: { place_type: "ciudad" } })
  → iterate results, call result.data() for each
  → collect { lat, lon, description_count } from meta
  → build GeoJSON FeatureCollection from collected points
  → map.getSource('places-heat').setData(geojson)
  → MapLibre re-renders heatmap layer
```

**Performance consideration:** With ~8K place pages, `pagefind.search(null)` returning all places and loading each `result.data()` will make ~8K async calls. Pagefind lazy-loads result data, so this is batched internally. For the explorer page, load all place metadata once on init and cache client-side — do not re-query Pagefind on every filter change. Pre-fetch and store as a JS array, then filter in-memory.

---

## Pattern 3: Build Architecture — Two Parallel Eleventy Instances

**What:** Run the existing descriptions build and the new entity/place build as two separate `eleventy` processes with different `--input` and `--output` flags, merge their outputs into a single `_site/`, then run Pagefind once over the merged output.

**Why not a single monolithic build:** Adding 100K pages to an already 14-minute build risks doubling build time. Node's single-threaded template rendering is the bottleneck. Two parallel processes use both CPU cores available in GitHub Actions (ubuntu-latest has 2 vCPUs).

**Eleventy multi-instance approach:**
```bash
# Run both builds in parallel using separate configs
NODE_OPTIONS="--max-old-space-size=4096" npx eleventy \
  --config=eleventy.descriptions.config.js \
  --output=_site-desc &
PID1=$!

NODE_OPTIONS="--max-old-space-size=3072" npx eleventy \
  --config=eleventy.entities.config.js \
  --output=_site-entities &
PID2=$!

wait $PID1 $PID2

# Merge outputs (entities/places go into _site/)
cp -r _site-entities/* _site-desc/

# Run Pagefind over merged output
npx pagefind --site _site-desc
```

**Trade-offs of parallel vs single build:**
- Parallel: more complex CI config, two config files, ~50% time saving, higher peak memory
- Single: simpler, but may push build past 30 min (GitHub Actions default timeout)
- The `eleventy.config.js` `--input` / `--output` flags allow fully separate configs without code duplication — shared filters can be imported from a common module

**Recommendation:** Start with a single build (Option A) to validate correctness. Profile build time. Switch to parallel (Option B) only if the single build exceeds ~25 minutes.

---

## Pattern 4: PMTiles on R2 — Worker Required for Range Requests

**What:** PMTiles is a single binary file containing all zoom levels of vector tiles. MapLibre GL JS fetches specific tile data via HTTP range requests (`Range: bytes=X-Y`). Cloudflare R2 does support HTTP 206 partial content responses natively (confirmed in release notes, November 2022). However, R2 public buckets do not expose CORS headers by default, and the existing Worker does not forward range requests or set the required headers.

**Recommendation: Add PMTiles routing to the existing Worker** rather than deploying a separate Worker.

```javascript
// worker/worker.js — add PMTiles handling

// PMTiles range request handler
if (key.endsWith('.pmtiles')) {
  const rangeHeader = request.headers.get('Range');
  const object = await env.SITE.get(key, {
    range: rangeHeader ? parseRange(rangeHeader) : undefined,
  });
  if (!object) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  headers.set('content-type', 'application/octet-stream');
  headers.set('accept-ranges', 'bytes');
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-headers', 'range, if-match');
  headers.set('access-control-expose-headers', 'content-range, etag');
  headers.set('cache-control', 'public, max-age=604800');

  if (rangeHeader && object.range) {
    headers.set('content-range',
      `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
}
```

**CORS requirements for PMTiles from R2:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: range, if-match`
- `Access-Control-Expose-Headers: content-range, etag`
- `Accept-Ranges: bytes`

These must be set on the response — not configurable via R2 bucket CORS UI when using a Worker (the Worker controls response headers directly).

**PMTiles file generation:**
```bash
# Install Tippecanoe (v2.17+ supports PMTiles output directly)
# Input: GeoJSON from Django backend export or generated from places.json

# Convert places.json to GeoJSON first (Node script)
node scripts/places-to-geojson.js data/places.json data/places.geojson

# Generate PMTiles
tippecanoe \
  -z14 -Z0 \
  --projection=EPSG:4326 \
  -o data/zasqua-places.pmtiles \
  -l places \
  --coalesce-densest-as-needed \
  data/places.geojson

# Upload separately (not via upload-to-r2.py which uploads _site/)
aws s3 cp data/zasqua-places.pmtiles s3://zasqua-site/zasqua-places.pmtiles \
  --endpoint-url "$R2_ENDPOINT"
```

**Zoom level recommendation:** `z0–z14` covers world overview to city block. For 5,574 coordinate points spread across Latin America, `z0–z12` is sufficient and produces a smaller file (~5–15 MB estimated).

---

## Pattern 5: Network Graph — Pre-Computed Adjacency Data

**What:** For the entity explorer network graph, pre-compute a co-occurrence adjacency list: pairs of entities that appear together in the same description, weighted by co-occurrence count. Output as a static JSON file served from `_site/data/entity-cooccurrence.json`.

**Build-time computation:**
```
scripts/precompute-cooccurrence.js
  reads: data/entity_links.json
  groups links by reference_code → {reference_code: [entity_code, ...]}
  for each description with ≥2 entities:
    emit edge (A, B, weight++) for all pairs
  writes: data/entity-cooccurrence.json
    { nodes: [{id, label, type, count}], edges: [{source, target, weight}] }
```

**Scale consideration:** 92K entities × 308K links. A fully dense graph would be enormous. Cap edges: only emit edges where co-occurrence weight ≥ 3, and limit to top-N entities by description count for the initial view. The explorer graph shows a neighbourhood view (entities related to the current filter/search), not the full graph. Full graph data can be streamed on demand.

**Graph rendering library — recommendation: Sigma.js v3**
- WebGL rendering handles thousands of nodes without freezing
- No React dependency — vanilla JS compatible
- Official graphology library for graph data structures, separate from rendering
- D3-force is an alternative but SVG-based and slower at >500 nodes

**Data flow for entity explorer:**
```
Page load:
  fetch /data/entity-cooccurrence.json → build graphology Graph instance
  pagefind.search(null) → load all entity metadata → cache as entityIndex Map

User searches "Bogotá merchants":
  pagefind.search("Bogotá merchants", { filters: { entity_type: "persona" } })
  → result entity codes → extract subgraph from full graph
  → sigma.setGraph(subgraph) → re-render

User clicks entity node:
  navigate to /entidad/{code}/ → entity detail page
```

---

## Recommended Project Structure Changes

```
src/
├── _data/
│   ├── descriptions.js      # unchanged
│   ├── entities.js          # activate: load entities.json
│   ├── places.js            # activate: load places.json
│   ├── entity_links.js      # new: load precomputed counts for template rendering
│   └── place_links.js       # new: load precomputed counts for template rendering
├── entidad.njk              # new: entity detail page template
├── lugar.njk                # new: place detail page template
├── explorar/
│   ├── entidades.njk        # new: entity explorer (search + network graph)
│   └── lugares.njk          # new: place explorer (search + heatmap)
├── js/
│   ├── entity-explorer.js   # new: Pagefind API + Sigma.js graph rendering
│   └── place-explorer.js    # new: Pagefind API + MapLibre heatmap
└── vendor/
    ├── maplibre-gl.js        # new: MapLibre GL JS (self-hosted)
    ├── maplibre-gl.css       # new
    └── sigma.min.js          # new: Sigma.js v3 (self-hosted)

scripts/
├── precompute-links.js       # new: entity/place → description aggregates
├── precompute-cooccurrence.js # new: entity co-occurrence adjacency
├── places-to-geojson.js      # new: places.json → GeoJSON for Tippecanoe
├── generate-pmtiles.sh       # new: Tippecanoe invocation
├── upload-to-r2.py           # unchanged
└── check-css-tokens.sh       # unchanged

worker/
└── worker.js                 # modified: PMTiles range request routing
```

---

## Data Flow

### Build-Time Data Flow

```
B2 zasqua-export
  ├── descriptions.json ──────────────────┐
  ├── repositories.json ──────────────────┤
  ├── entities.json ──────────────────────┤
  ├── places.json ────────────────────────┤
  ├── entity_links.json ─── precompute ───┤
  └── place_links.json ──── precompute ───┤
                                          │
                            Eleventy      │
                            (all data) ───┴──► _site/
                                                ├── 106K description pages
                                                ├── ~8K place pages
                                                ├── ~92K entity pages
                                                ├── /explorar/lugares/
                                                ├── /explorar/entidades/
                                                ├── /data/entity-links/
                                                ├── /data/place-links/
                                                └── /data/entity-cooccurrence.json

Pagefind ────────────────────────────────────► _site/pagefind/

Tippecanoe ──────────────────────────────────► zasqua-places.pmtiles (uploaded separately)
```

### Runtime Data Flow — Place Explorer

```
User visits /explorar/lugares/
  ↓
place-explorer.js loads:
  1. await pagefind.options({ baseUrl: '/', bundlePath: '/pagefind/' })
  2. await pagefind.preload()  ← pre-warm index
  3. pagefind.search(null)     ← all place pages
     → iterate results → collect meta { lat, lon, place_code, display_name }
     → build in-memory placeIndex [{lat, lon, code, name, count}]
     → build initial GeoJSON → MapLibre heatmap layer

User applies filter (place_type = "ciudad"):
  4. pagefind.search(null, { filters: { place_type: "ciudad" } })
     → filtered result set → rebuild GeoJSON → update heatmap source

User clicks map point:
  5. navigate to /lugar/{name}/
```

### Runtime Data Flow — Entity Detail Page

```
User visits /entidad/{code}/
  ↓
Page renders: static entity metadata (name, dates, type, function, variants)
  ↓
entity-detail.js loads:
  1. fetch('/data/entity-links/{code}.json')
     → array of { reference_code, title, date_start, repository_code }
  2. render linked descriptions list (paginated client-side if >20)
```

---

## Integration Points

### New vs Modified Components

| Component | Status | Notes |
|-----------|--------|-------|
| `src/_data/entities.js` | Modified | Change `return []` to load `entities.json` |
| `src/_data/places.js` | Modified | Change `return []` to load `places.json` |
| `eleventy.config.js` | Modified | Add passthrough for `data/entity-links/`, `data/place-links/`, `data/entity-cooccurrence.json` |
| `worker/worker.js` | Modified | Add PMTiles range request handler, CORS headers |
| `build.sh` | Modified | Download entity/place JSON + links, run precompute scripts, run Tippecanoe |
| `.github/workflows/deploy.yml` | Modified | Same changes as build.sh, add Tippecanoe install step |
| `scripts/precompute-links.js` | New | ~300 lines Node.js |
| `scripts/precompute-cooccurrence.js` | New | ~150 lines Node.js |
| `scripts/places-to-geojson.js` | New | ~50 lines Node.js |
| `scripts/generate-pmtiles.sh` | New | Tippecanoe wrapper |
| `src/entidad.njk` | New | Pagination template, 92K pages |
| `src/lugar.njk` | New | Pagination template, 8K pages |
| `src/explorar/entidades.njk` | New | Single explorer page |
| `src/explorar/lugares.njk` | New | Single explorer page |
| `src/js/entity-explorer.js` | New | Pagefind API + Sigma.js |
| `src/js/place-explorer.js` | New | Pagefind API + MapLibre GL JS |
| `src/vendor/maplibre-gl.*` | New | Self-hosted, no CDN dependency |
| `src/vendor/sigma.min.js` | New | Self-hosted |

### External Service Integration

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Cloudflare R2 | PMTiles stored as object, Worker serves with range requests | CORS headers set in Worker, not bucket policy |
| MapLibre GL JS | Client-side, loads PMTiles via `pmtiles://` protocol | Requires `maplibre-gl-pmtiles` or PMTiles JS library |
| PMTiles JS library | Browser, handles range requests to Worker endpoint | `npm install pmtiles` or self-hosted bundle |
| Tippecanoe | CI/CD only — generates PMTiles at build time | Install in GitHub Actions runner (`apt-get install tippecanoe` on ubuntu) |
| Sigma.js + Graphology | Client-side only, loads pre-built adjacency JSON | Self-hosted, vanilla JS compatible |

### MapLibre + PMTiles Integration Note (MEDIUM confidence)

MapLibre GL JS does not natively speak the PMTiles binary format. The PMTiles JavaScript library (`pmtiles` package) provides a protocol handler that intercepts `pmtiles://` URLs and issues range requests. This must be registered before MapLibre initializes:

```javascript
import { Protocol } from 'pmtiles';
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile.bind(protocol));

const map = new maplibregl.Map({
  style: {
    sources: {
      places: {
        type: 'vector',
        url: 'pmtiles:///zasqua-places.pmtiles',
      }
    }
  }
});
```

If bundling is not available (no npm toolchain), the PMTiles library must be self-hosted as a pre-built bundle alongside the MapLibre vendor files.

---

## Suggested Build Order

Build each component in dependency order — foundational data layer first, then templates, then visualisation.

| Step | What | Dependency |
|------|------|------------|
| 1 | Activate `entities.js` and `places.js` data files | None |
| 2 | Write `precompute-links.js`, run it against real data | entities.json + place/entity links JSON from backend |
| 3 | Add entity/place JSON downloads to `build.sh` / `deploy.yml` | Backend export updated |
| 4 | Create `entidad.njk` and `lugar.njk` templates with Pagefind metadata | Steps 1–3 |
| 5 | Verify entity + place pages build correctly (single build, DEV_LIMIT) | Step 4 |
| 6 | Add entity/place passthrough for aggregate JSON files | Step 2 |
| 7 | Validate full build time — decide single vs parallel | Step 5 |
| 8 | Build `explorar/lugares.njk` static shell + `place-explorer.js` | Steps 4–6 |
| 9 | Integrate MapLibre GL JS + PMTiles library (vendor, no npm build) | Step 8 |
| 10 | Modify Worker for PMTiles range request routing | Step 9 |
| 11 | Write `places-to-geojson.js` + `generate-pmtiles.sh`, test Tippecanoe locally | Step 9 |
| 12 | Add PMTiles upload step to CI, verify range requests work end-to-end | Steps 10–11 |
| 13 | Write `precompute-cooccurrence.js`, verify scale (capped graph) | entities.json + entity_links.json |
| 14 | Build `explorar/entidades.njk` shell + `entity-explorer.js` with Sigma.js | Step 13 |
| 15 | Full integration test: search filters → graph/map updates | Steps 12–14 |

---

## Scaling Considerations

| Concern | Now (106K) | After v0.5.0 (~206K) | Mitigation |
|---------|------------|----------------------|------------|
| Eleventy build time | ~14 min | ~25–30 min (single build) | Parallel build option if needed |
| Node heap | 6 GB allocated | May exceed if all data loaded at once | Keep entity/place data files lean; precompute aggregates separately |
| Pagefind index size | ~30 MB (estimate) | ~60 MB | Pagefind handles this well; index is chunked for lazy loading |
| PMTiles file | Not present | ~5–15 MB for 5,574 points | One-time upload; cached at CDN edge |
| R2 file count | ~106K files | ~306K files | Still well within R2 limits (no cap); upload script unchanged |
| Entity co-occurrence JSON | Not present | Could be large if uncapped | Cap edges by weight ≥ 3; estimated ~5–20 MB at this threshold |
| Client-side Pagefind query | ~106K indexed | ~206K indexed | Pre-load place metadata once on explorer init; filter in-memory |

---

## Anti-Patterns

### Anti-Pattern 1: Loading All Relationship Data as a Global Eleventy Data File

**What people do:** Put `entity_links.json` (308K records) in `src/_data/` so templates can do `{{ entity_links | filterByEntity(entity.entity_code) }}`

**Why it's wrong:** Eleventy loads all global data files into memory before building. 308K records × ~100 bytes each ≈ 30 MB kept in Node heap per template evaluation pass. Combined with `entities.json` (29.9 MB) and `descriptions.json`, this will OOM the build or dramatically slow it.

**Do this instead:** Run `precompute-links.js` before Eleventy. Serve per-entity/place JSON shards as static files. Fetch client-side on detail pages.

### Anti-Pattern 2: Querying Pagefind on Every Filter Change for Explorer Pages

**What people do:** Call `pagefind.search(null, { filters: currentFilters })` on every checkbox toggle to get updated lat/lon for the map.

**Why it's wrong:** Each `search()` call triggers network requests to the Pagefind index chunks. At 8K places, calling `result.data()` on all results on every filter change makes the map feel sluggish.

**Do this instead:** Load all place metadata into a JS Map on page init (one-time Pagefind scan). Filter the in-memory Map client-side. Only call Pagefind for text search queries.

### Anti-Pattern 3: Serving PMTiles Through the Existing Worker Without Range Request Support

**What people do:** Upload the `.pmtiles` file to R2 and assume the existing Worker will serve it like any other file.

**Why it's wrong:** The existing Worker calls `env.SITE.get(key)` and returns the full body. For a 15 MB PMTiles file, this returns the entire file on every tile request — defeating the purpose of the format. MapLibre issues Range requests expecting HTTP 206 responses with byte slices.

**Do this instead:** Add an explicit PMTiles branch in the Worker that reads the `Range` header and passes it to `env.SITE.get(key, { range: { offset, length } })`. Return HTTP 206 with proper `Content-Range` and `Accept-Ranges` headers.

### Anti-Pattern 4: Running Pagefind Before Merging Build Outputs

**What people do (with parallel builds):** Index each Eleventy output separately with Pagefind and use multisite merge in the browser.

**Why it's wrong:** Browser-side multisite merge requires CORS config, doubles network requests for index chunks, and doesn't support cross-index filtering. The combined index (single Pagefind run over merged `_site/`) gives better performance and unified filter counts.

**Do this instead:** Merge `_site-desc/` and `_site-entities/` into a single directory, then run `npx pagefind --site _site` once over the merged result.

---

## Sources

- Pagefind JS API — metadata: https://pagefind.app/docs/js-api-metadata/
- Pagefind JS API — filtering (null query): https://pagefind.app/docs/js-api-filtering/
- Pagefind multisite search (browser-only merge): https://pagefind.app/docs/multisite/
- Pagefind custom metadata attributes: https://pagefind.app/docs/metadata/
- PMTiles cloud storage (R2 recommended, range requests): https://docs.protomaps.com/pmtiles/cloud-storage
- Protomaps Cloudflare deploy guide (Worker required): https://docs.protomaps.com/deploy/cloudflare
- Cloudflare R2 HTTP 206 support (November 2022): https://developers.cloudflare.com/r2/platform/release-notes/
- Tippecanoe PMTiles output (v2.17+): https://docs.protomaps.com/pmtiles/create
- MapLibre GL JS heatmap from GeoJSON: https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer/
- Sigma.js WebGL graph rendering: https://www.sigmajs.org/
- Eleventy parallel build issue (no native support): https://github.com/11ty/eleventy/issues/1001

---
*Architecture research for: Zasqua Frontend v0.5.0 — entity/place discovery integration*
*Researched: 2026-03-26*
