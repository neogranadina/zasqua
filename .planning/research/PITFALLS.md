# Pitfalls Research

**Domain:** Static archival discovery site — adding spatial and network graph features to an existing Eleventy build
**Researched:** 2026-03-26
**Confidence:** HIGH (critical pitfalls), MEDIUM (performance thresholds), HIGH (PMTiles/R2 specifics)

---

## Critical Pitfalls

### Pitfall 1: Node.js heap exhaustion from loading entities.json into Eleventy pagination

**What goes wrong:**
The current build loads descriptions.json (large, ~106K items) as a global data file and paginates over it. entities.json is 29.9 MB with 92,042 records. Loading this as a global data file and paginating over it to generate ~92K entity pages, while simultaneously holding the existing descriptions data in memory, will push Node.js heap usage beyond the default 4 GB limit. Eleventy has a documented failure mode between 30K and 50K paginated pages where the runtime creates massive in-memory arrays during pagination — `v8::internal::JSArray::SetLength` — causing a hard crash. Adding 92K entity pages on top of 106K description pages in the same build process almost certainly crosses this threshold.

**Why it happens:**
Eleventy holds all pagination data in memory simultaneously while rendering. It does not stream or chunk global data files. The current build already uses `NODE_OPTIONS: --max-old-space-size=6144` (6 GB), which means the existing 106K-page build is already consuming substantial heap. Adding another 29.9 MB data file plus the generated page objects for 92K entries is likely to exceed available memory on a standard GitHub Actions runner (7 GB RAM for `ubuntu-latest`).

**How to avoid:**
Run entity/place pages as a **separate Eleventy build** rather than folding them into the existing build. Each build gets its own Node.js process with a fresh heap. The outputs are then merged in the upload step — the existing `upload-to-r2.py` script already handles arbitrary `_site` directories, so uploading two built directories sequentially (or to separate staging paths then merging) is straightforward. Alternatively, stream entity records through a custom Eleventy pagination approach that limits in-memory footprint, or use the Eleventy Node.js API to paginate lazily.

**Warning signs:**
- Build exits with `FATAL ERROR: Ineffective mark-compacts near heap limit`
- Build stalls at a specific page count milestone without progress
- GitHub Actions runner reports OOM kill in step logs

**Phase to address:**
Build architecture phase — must be the first phase of the milestone, before any entity page templates are written.

---

### Pitfall 2: Eleventy incremental builds do not handle global data file changes

**What goes wrong:**
Adding `--incremental` to the entity build to speed up re-runs will appear to work but silently produce stale output. Eleventy's incremental build system does not track which templates depend on which global data files. According to the official documentation, "Global/directory/template Data file usage mapped to templates" is listed as a **to-do item** — it is not implemented. If `entities.json` or `places.json` is updated between builds, `--incremental` will not rebuild entity/place pages.

**Why it happens:**
This is a known architectural limitation of Eleventy's dependency tracker, not a configuration error. The system tracks template file changes but not data file changes.

**How to avoid:**
Do not use `--incremental` for the entity/place build. The entire entity/place build is driven by a data file — there are no "changed templates" to detect, only a changed data file. Run full rebuilds. Optimise build time through separate builds and parallelism (running description build and entity build simultaneously in GitHub Actions), not through incremental mode.

**Warning signs:**
- Entity pages that should reflect updated data still show old content after a data-only update
- Build log shows many files "skipped" even after a full data refresh

**Phase to address:**
Build architecture phase — document explicitly in the deploy workflow that `--incremental` must not be used for data-driven pagination builds.

---

### Pitfall 3: PMTiles CORS failure when served from the same R2 bucket through the existing Worker

**What goes wrong:**
The existing Worker serves the static site from R2 with a `zasqua.org` custom domain. PMTiles served from the same bucket needs HTTP Range request support and must expose specific response headers (`etag`, `content-range`). The current Worker does not forward Range request headers or expose these headers — it serves full objects. MapLibre GL JS will request tile ranges using `Range: bytes=X-Y` headers; the Worker will either ignore them (returning the full file every time, making the map unusably slow) or return a 416 error.

There is a second, more subtle problem: R2 CORS bucket policies apply to **direct R2 access**, not to custom-domain requests routed through a Worker. Once a custom domain is attached to R2 with Worker routing, CORS headers must be injected by the Worker itself, not through the R2 bucket CORS settings panel. Setting bucket CORS and then seeing it work in a direct R2 URL does not mean it will work through the Worker.

**Why it happens:**
The existing Worker was built for serving static HTML/CSS/JS — it has no Range request pass-through. PMTiles is fundamentally different: it requires HTTP Range requests to fetch only the specific tile bytes needed, which is how it avoids transferring the entire tileset. The gap between "works in bucket CORS test" and "works through Worker" trips many teams.

**How to avoid:**
Serve PMTiles through a **separate Worker** bound to a subdomain (e.g., `tiles.zasqua.org`), not through the existing site Worker. Use the official Protomaps Cloudflare Worker template (from `protomaps/PMTiles/serverless/cloudflare`), which already handles Range request pass-through, CORS, caching, and the `etag` header correctly. Upload PMTiles to the same R2 bucket under a `tiles/` prefix, or a separate bucket. The dedicated Worker approach is documented by Protomaps as the canonical deployment path. Assign the subdomain to get proper cache behaviour — the Protomaps docs explicitly warn that cache does not work on `*.workers.dev` domains.

**Warning signs:**
- MapLibre console errors: "Failed to fetch resource", network tab shows 206 responses with wrong byte ranges, or 200 responses to range requests (full file returned)
- Map tiles load on first zoom level but slow to a crawl on zoom
- Browser network panel shows PMTiles requests returning 200 with full file size instead of small tile chunks

**Phase to address:**
PMTiles/map infrastructure phase — set up the separate Worker and verify Range requests before writing any MapLibre template code.

---

### Pitfall 4: Build time doubles or triples from Pagefind indexing 200K+ pages

**What goes wrong:**
Pagefind runs after Eleventy and indexes every HTML page in `_site`. Currently it indexes ~106K description pages. Adding ~92K entity pages and ~8K place pages brings the total to ~206K. Pagefind build time scales roughly linearly with page count. If Pagefind currently takes 3–4 minutes, doubling the page count will take 6–8 minutes — pushing total CI time past 30 minutes. The larger concern is **index size**: a 206K-page index will be multiple times larger, and the first-search latency for users increases as more index chunks must be loaded.

**Why it happens:**
Pagefind indexes all pages it can find in `_site` unless explicitly excluded. Entity detail pages and place detail pages each contain text content that will be indexed. With 92K entities having `dates_of_existence` and `history` fields, the index could balloon substantially. There is no mechanism for Pagefind to index only the description pages from one build and entity pages from another unless the multisite merge feature is used — which introduces its own limitations (see Integration Gotchas below).

**How to avoid:**
Use `data-pagefind-ignore` on entity and place pages, or use separate Pagefind bundles via multisite merge. The recommended approach for this project is: **keep one Pagefind index for descriptions only** (the existing behaviour), and build entity/place discovery as **separate client-side filtering** against pre-built JSON data rather than Pagefind. Entity and place explorers are better served by lightweight in-memory filtering of a pre-built JSON list than by Pagefind — Pagefind is optimised for full-text search, not for faceted browsing of structured records. If entity full-text search is needed, run a separate Pagefind index on entity pages and merge with `mergeIndex`, but understand that filter facets do not aggregate correctly across merged indexes.

**Warning signs:**
- Pagefind step takes more than 10 minutes in CI
- `_site/pagefind/` directory grows beyond 100 MB
- First search query takes more than 500 ms on first load due to chunk loading

**Phase to address:**
Build architecture phase and entity explorer phase — decide which pages are pagefind-indexed before writing templates, not after.

---

### Pitfall 5: Rendering all 8K+ place markers as GeoJSON on the client side

**What goes wrong:**
Loading all 5,574 places with coordinates as a single GeoJSON source in MapLibre causes a visible render stall on the initial page load. The GeoJSON must be parsed, projected, and rendered before the map becomes interactive. For the heatmap explorer, which will show all places simultaneously, passing a pre-built GeoJSON file containing all coordinates through MapLibre's source pipeline at initial render freezes the main thread for 1–3 seconds on mid-range hardware. This is before any user interaction. If the GeoJSON file is embedded inline in a `<script>` tag rather than fetched from a URL, it also blocks HTML parsing.

**Why it happens:**
MapLibre renders GeoJSON sources on the main thread during tile generation. Overlap detection (default on for symbol layers) runs across all features simultaneously. With 5,574+ point features, this is manageable but only if the data is structured correctly (coordinates-only, minimal properties, loaded from a URL). The real failure mode is trying to include all description metadata per point — the full places.json is 3.1 MB; even after stripping to coordinates and display names it will be 200–400 KB, which is acceptable but only if loaded asynchronously.

**How to avoid:**
Build a dedicated `places-map.json` at build time containing only the fields MapLibre needs: `place_code`, `display_name`, `lat`, `lon`. Strip all other fields (wikidata_id, admin levels, colonial divisions). Load it as an external URL, not inline. Cap coordinate precision at 4 decimal places (about 11 metres — more than adequate for archival place data). Use MapLibre's clustering at lower zoom levels to prevent rendering all 5,574 features simultaneously at zoom 3. For the heatmap layer specifically, pre-build as a GeoJSON `FeatureCollection` with geometry-only features (no properties), which dramatically reduces parse time.

**Warning signs:**
- DevTools performance trace shows MapLibre tile worker taking more than 500 ms on first load
- Map appears frozen for 2+ seconds before tiles render
- Network tab shows places-map.json being fetched after DOMContentLoaded (acceptable) vs. embedded in HTML (blocks parsing)

**Phase to address:**
Place explorer phase — establish the data pipeline (build-time JSON generation) before implementing the map component.

---

### Pitfall 6: Network graph layout computation blocking the browser main thread

**What goes wrong:**
Rendering a force-directed graph of entity co-occurrences on the client side with thousands of nodes/edges will freeze the browser tab. The force simulation (ForceAtlas2 or similar) runs iteratively — each iteration recalculates all node positions. At 1,000+ nodes, this computation runs for tens of seconds. If it runs on the main thread, the page is unresponsive during layout. Chrome's V8 thread scheduler will eventually trigger a "page unresponsive" prompt.

**Why it happens:**
Force-directed layout algorithms are O(n²) in the naive case and O(n log n) with Barnes-Hut approximation. Even with Barnes-Hut, 5,000 nodes × 300 iterations equals substantial computation. Many graph library demos look fast because they use pre-laid-out data — the layout was computed ahead of time, not in the browser.

**How to avoid:**
Two viable approaches: (1) **Pre-compute graph layout at build time** — run ForceAtlas2 or a similar algorithm in Node.js during the build, write out node positions to JSON, and render a static positioned graph in the browser (no simulation needed). This is the correct approach for archival data where the relationship graph does not change between builds. (2) **Use a Web Worker** — Sigma.js v2 supports layout computation in a Web Worker, keeping the main thread free. Use `graphology` + `graphology-layout-forceatlas2` with `{ worker: true }`. Do not attempt to run force layout on the main thread with more than ~500 nodes.

For the entity explorer specifically, the graph should show **scoped co-occurrence** — entities linked through shared documents — not the full 92K-node graph. Pre-compute a reduced graph (top N entities by document count, edges with weight above threshold) and make the full graph browsable only per-entity on the detail page, where the local neighbourhood (2 hops) is manageable.

**Warning signs:**
- Sigma.js or graphology instantiation takes more than 2 seconds
- "Page unresponsive" prompt in Chrome
- `graphology-layout-forceatlas2` supervisor does not converge on large graphs in reasonable time

**Phase to address:**
Entity explorer phase and entity detail page phase — establish graph scope and data model before choosing a rendering approach.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add entity/place pages to existing Eleventy build | One build step | Node OOM at 150K+ pages; 25+ min builds | Never — separate builds are cleaner and parallelisable |
| Load full entities.json into Eleventy global data | Simple setup | 29.9 MB parsed into V8 heap for every build, even description-only rebuilds | Never — split entity/place data loading to the entity/place build only |
| Embed places GeoJSON inline in template | No extra HTTP request | Blocks HTML parsing; large HTML files for place pages | Never for more than ~10 features |
| Use Pagefind for entity/place search | Consistent UX with description search | Doubles index size; filter facets do not aggregate across `mergeIndex` | Acceptable only if entity pages are explicitly excluded from description index |
| Serve PMTiles through existing Worker | One less worker to manage | Worker has no Range request support; map will not load correctly | Never — PMTiles requires a dedicated Worker |
| Pre-compute the full 92K-entity co-occurrence graph | Complete graph available | Graph JSON could be hundreds of MB; browser cannot render it | Never — always scope the graph to a neighbourhood or threshold |
| Use Pagefind `mergeIndex` for entity + description search | Unified search UI | Filter facets (repository, level) only reflect the primary index in merged results | Acceptable only if entity/description search are clearly separate UI concerns |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PMTiles + existing R2 Worker | Adding PMTiles handling to the existing site Worker | Deploy a separate Protomaps Cloudflare Worker on `tiles.zasqua.org` with R2 bucket binding; do not modify the site Worker |
| PMTiles + R2 CORS | Setting bucket CORS in the R2 dashboard and assuming it applies to custom-domain requests | CORS must be set on the Worker response, not the bucket, when using a custom domain with Worker routing |
| MapLibre GL JS + vanilla JS project | Importing from npm (requires bundler) | Load MapLibre from CDN (`<script>` + `<link>`) — the project has no bundler, and adding one for one library is the wrong trade-off |
| Pagefind `mergeIndex` + facets | Expecting facet counts to aggregate across merged indexes | Filter facet counts in a merged index only reflect the primary index; merged indexes contribute results but not facet aggregation |
| Sigma.js v2 + vanilla JS (no bundler) | Using the npm ESM bundle which requires a module bundler | Use the CDN IIFE build from jsDelivr, or self-host the UMD build; verify the graphology dependency is also loaded before sigma |
| Pagefind + entity detail pages | Pagefind indexes all pages in `_site` — entity pages are indexed automatically | Use `data-pagefind-ignore` on entity/place pages, or build them to a separate `_site-entities/` directory and run Pagefind only on the description `_site/` |
| R2 upload script + PMTiles file | upload-to-r2.py has no MIME type entry for `.pmtiles` | Add `.pmtiles: application/octet-stream` to `CONTENT_TYPES` and configure the PMTiles Worker to set the correct `Content-Type` itself |
| GitHub Actions + doubled build time | Single `deploy.yml` job running all steps sequentially | Split into parallel jobs: one for description build, one for entity/place build; merge outputs before upload |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading `entities.json` (29.9 MB) as Eleventy global data in the description build | Every description build parses and holds 92K entity records even if no entity pages are built | Load entities.json only in the entity/place build; description build should not touch it | Immediately — adds 2–3 min and 500+ MB heap to a build that does not need the data |
| All 5,574 place coordinates in one MapLibre GeoJSON source with full metadata | Map render stall 1–3 s on load; large initial payload | Build a stripped coordinates-only GeoJSON at build time; load as external URL | At ~2,000+ features with full metadata properties |
| Rendering 92K entity names in the entity explorer DOM | Browser freezes on list render; scroll is janky | Implement virtual scrolling or paginate the client-side list; never render all 92K items to the DOM | At ~5,000 DOM nodes — browser layout thrashing begins |
| Uploading 400K+ files with `--concurrency 100` on a GitHub Actions runner | R2 returns sporadic HTTP 429 Too Many Requests; upload fails mid-way | Reduce concurrency to 50–75 for larger file counts; implement exponential backoff (already present in upload script via boto3 `adaptive` retry) | Empirically observed at sustained rates above ~350 files/s against R2's S3-compatible endpoint |
| Force-directed graph layout running in browser on full co-occurrence dataset | Tab freezes; "page unresponsive" prompt | Pre-compute layout at build time in Node.js; serve pre-positioned nodes | Above ~1,000 nodes without Web Worker; above ~5,000 nodes even with Web Worker |
| Pagefind indexing entity/place pages with full `history` and `dates_of_existence` text | Pagefind index grows to 500 MB+; first search loads 10+ chunks | Exclude entity/place pages from Pagefind, or mark non-searchable content with `data-pagefind-ignore` | Immediately if entity pages include long-form text fields |
| MapLibre GL JS (~750 KB minified) loaded on every page | First-contentful paint degrades on description pages that do not need a map | Lazy-load MapLibre only on pages that render a map (place detail, place explorer) | First load — MapLibre is not small; loading it unconditionally penalises all pages |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Map and list search results updating simultaneously on every keystroke | Jerky map re-renders on every character typed; poor on mobile | Debounce filter changes by 250 ms before triggering map re-render; update the list immediately but queue map updates |
| Force-directed graph without stable layout between visits | Nodes jump to new positions on each page load; disorienting | Pre-compute and store layout positions in the JSON; graph positions should be deterministic |
| Entity explorer showing all 92,042 entities in initial state | Overwhelming; meaningless without context | Default view shows top N entities by document count; require a query or filter to expand beyond that |
| Place heatmap with no zoom-level differentiation | At country scale, all of Colombia appears as one dense blob | Use MapLibre's heatmap intensity/radius expressions that scale with zoom level; switch to clustered points above zoom 10 |
| PMTiles base map tiles loading slowly on first visit (R2 latency ~500 ms) | Map appears blank for 1–2 seconds before tiles render | Show a loading spinner or placeholder background colour matching the basemap; do not show an empty white canvas |
| Entity detail page listing hundreds of linked descriptions with no pagination | Huge page, slow render, no way to navigate | Limit linked descriptions to 20 on the detail page with a "see all" link to a scoped search (using the existing ancestor chain search filter) |

---

## "Looks Done But Isn't" Checklist

- [ ] **PMTiles map:** Tiles load on localhost — verify on production domain where Worker routing applies, not the `*.workers.dev` test URL
- [ ] **PMTiles CORS:** Works in Chrome — verify in Firefox (stricter CORS enforcement on Range requests) and Safari
- [ ] **Entity pages indexed:** Entity detail page appears in site nav and Pagefind — verify that `data-pagefind-ignore` is on entity pages if description-only search is intended
- [ ] **Upload script coverage:** upload-to-r2.py uploads `_site/` — verify it also uploads the PMTiles file to the correct path and that the file is not silently skipped due to missing MIME type
- [ ] **Graph layout:** Graph renders in dev with 50 entities — test with the full production dataset (92K entities, scoped to top N); layout that looks good at small scale often becomes unreadable at full scale
- [ ] **Node.js memory:** Build succeeds on developer machine (16 GB RAM) — verify it succeeds on GitHub Actions runner (7 GB RAM) with the actual file sizes
- [ ] **MapLibre bundle load:** Map appears on place detail page — verify MapLibre is not also being loaded on description pages that have no map (check network tab on a `/descripcion/` page)
- [ ] **Pagefind index size:** Index size acceptable after adding entity pages — run `du -sh _site/pagefind/` and compare before/after adding entity pages to confirm exclusions are working
- [ ] **Build time with both builds:** Combined build + index + upload time fits within the GitHub Actions 60-minute timeout (currently set in deploy.yml)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Node OOM in integrated build | MEDIUM | Split into separate builds; update deploy.yml to run entity build in parallel; update upload script to merge outputs |
| PMTiles not loading through Worker | LOW | Deploy dedicated Protomaps Worker on `tiles.zasqua.org`; update MapLibre source URL in templates |
| Pagefind index bloated with entity pages | LOW | Add `data-pagefind-ignore` to entity/place layout templates; rebuild and re-upload Pagefind index only |
| Graph freezing browser | MEDIUM | Pre-compute layout in Node.js build script; update graph template to load pre-positioned nodes; remove client-side force simulation |
| R2 upload failures at 400K files | LOW | Reduce `--concurrency` flag from 100 to 50; boto3 adaptive retry already handles transient 429s; re-run upload script (it is idempotent — PUT is safe to repeat) |
| MapLibre loaded on all pages | LOW | Move MapLibre `<script>` and `<link>` tags from base layout to the specific place layout templates that need it |
| Build timeout in GitHub Actions (>60 min) | LOW | Increase `timeout-minutes` in deploy.yml; or split description and entity builds into separate parallel jobs that each finish under 30 min |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Node OOM from integrated build | Phase 1: Build architecture | Run entity build independently; confirm GitHub Actions completes within memory budget |
| Incremental builds silently skipping data-driven pages | Phase 1: Build architecture | Document in deploy.yml comments; do not add `--incremental` flag |
| PMTiles CORS/Range request failure through existing Worker | Phase 2: PMTiles infrastructure | MapLibre console shows no CORS or range errors on production domain; network tab shows 206 responses |
| Pagefind index bloat from entity pages | Phase 1: Build architecture, revisited in entity template phase | `du -sh _site/pagefind/` before and after; first search query loads in under 300 ms |
| GeoJSON render stall from unstripped place data | Phase 3: Place explorer | Build-time script produces coordinates-only GeoJSON; verify file is under 500 KB |
| Graph layout freezing browser | Phase 4: Entity explorer | Force layout computation runs in Node.js build step, not in browser; graph renders within 500 ms of page load |
| R2 upload failure at doubled file count | Phase 1: Build architecture (deploy script update) | Test upload with dry-run at estimated 400K file count; confirm rate does not trigger sustained 429s |
| MapLibre loaded on non-map pages | Entity/place template phase | Network tab on a description page shows no maplibre-gl.js request |

---

## Sources

- Eleventy pagination OOM issue: [github.com/11ty/eleventy/issues/2368](https://github.com/11ty/eleventy/issues/2368)
- Eleventy incremental build limitations (data files not tracked): [11ty.dev/docs/usage/incremental/](https://www.11ty.dev/docs/usage/incremental/)
- PMTiles Cloudflare deployment (dedicated Worker required, CORS via Worker not bucket): [docs.protomaps.com/deploy/cloudflare](https://docs.protomaps.com/deploy/cloudflare)
- PMTiles cloud storage CORS requirements: [docs.protomaps.com/pmtiles/cloud-storage](https://docs.protomaps.com/pmtiles/cloud-storage)
- R2 CORS with custom domains (Worker vs. bucket policy distinction): [community.cloudflare.com — CORS policy not working correctly for R2 bucket with custom domain](https://community.cloudflare.com/t/cors-policy-not-working-correctly-for-r2-bucket-with-custom-domain/907302)
- MapLibre large GeoJSON optimisation: [maplibre.org/maplibre-gl-js/docs/guides/large-data/](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/)
- Sigma.js rendering large graphs (5K nodes, 100K edges): [github.com/jacomyal/sigma.js/issues/239](https://github.com/jacomyal/sigma.js/issues/239)
- Pagefind multisite merge limitations: [pagefind.app/docs/multisite/](https://pagefind.app/docs/multisite/)
- Cloudflare R2 upload performance at scale (HTTP 429 at high concurrency): [community.cloudflare.com — rate limit for uploading objects](https://community.cloudflare.com/t/cloudflare-r2-wrangler-what-is-the-rate-limit-for-uploading-objects-to-buckets/772242)
- Eleventy build performance diagnostics: [11ty.dev/docs/debug-performance/](https://www.11ty.dev/docs/debug-performance/)
- R2 range request behaviour: [community.cloudflare.com — recent changes to R2 HTTP Range GETs](https://community.cloudflare.com/t/recent-changes-to-r2-http-range-gets/781611)

---
*Pitfalls research for: Zasqua Frontend v0.5.0 — entity/place discovery with spatial maps and network graphs*
*Researched: 2026-03-26*
