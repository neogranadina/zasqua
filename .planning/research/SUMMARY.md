# Project Research Summary

**Project:** Zasqua Frontend v0.5.0 — entity/place discovery
**Domain:** Static archival discovery site — spatial heatmap, network graph, entity/place detail pages
**Researched:** 2026-03-26
**Confidence:** HIGH (stack, architecture, pitfalls); MEDIUM (features)

## Executive Summary

Zasqua Frontend v0.5.0 adds four interrelated features to an existing 106K-page static site: individual detail pages for 92,042 entities and 8,177 places, a place explorer with spatial heatmap, and an entity explorer with network graph. The recommended approach is fully static — no runtime server, no API calls at discovery time — using MapLibre GL JS for maps, PMTiles on R2 for tile delivery, and Sigma.js for graph rendering, all loaded via CDN or self-hosted bundles consistent with the existing vanilla-JS-no-bundler architecture. The single most important architectural decision is to run entity/place page generation as a separate Eleventy build in parallel with the existing description build, then merge outputs before Pagefind indexing. This prevents Node.js heap exhaustion (the current build already consumes ~6 GB heap for 106K pages; adding 100K more to the same process will OOM on GitHub Actions runners) and keeps CI time at roughly 16 minutes instead of 28–30.

The build-time data pipeline is the foundation everything else depends on. A pre-compute script must aggregate the 308K entity-description links and 85K place-description links into per-entity and per-place JSON shards before Eleventy runs. The entity co-occurrence graph for the entity explorer must also be pre-computed and pre-laid out (ForceAtlas2 in Node.js) before the browser sees any data — force layout in the browser at 1,000+ nodes is unacceptable. PMTiles requires a dedicated Cloudflare Worker, not the existing site Worker, because Range request pass-through and CORS headers must be set at the Worker level rather than the R2 bucket when a custom domain is in use.

The recommended MVP for v0.5.0 is: pre-built aggregates, place detail pages, entity detail pages, place explorer with heatmap map, entity explorer with list view (graph deferred to v0.5.x after validating data quality). The full network graph is a P2 feature — valuable but risky to commit to before the co-occurrence data has been inspected at scale. Wikidata/SNAC enrichment and time sliders are explicitly out of scope (P3) due to static-site constraints and sparse date data.

---

## Key Findings

### Recommended Stack

The existing stack (Eleventy 3, Nunjucks, Tailwind CSS v4 standalone CLI, Pagefind 1.4.0, vanilla JS, Cloudflare R2 + Worker, GitHub Actions) is confirmed and unchanged. Three new libraries are added for this milestone only on pages that need them — no global load, no build chain.

**Core new technologies:**
- **MapLibre GL JS 5.x** — interactive maps (place detail embedded map, place explorer heatmap) — open-source WebGL renderer, native heatmap layer, PMTiles protocol support via plugin; open-source Mapbox fork with BSD licence
- **pmtiles 4.4.0** — PMTiles protocol handler for MapLibre — registers `pmtiles://` custom protocol via `maplibregl.addProtocol`; no tile server needed; HTTP range requests against R2
- **Sigma.js 3.0.2 + graphology 0.25.4** — WebGL network graph rendering — handles tens of thousands of nodes; vanilla JS via UMD bundle; pre-computed layout from graphology at build time
- **Tippecanoe 2.17+** — build-time GeoJSON-to-PMTiles conversion — native binary, installed on CI runner; not a JS package

All JS libraries load via jsDelivr CDN (or self-hosted vendor copies) on their respective pages only. No npm packages are added. See `.planning/research/STACK.md` for version compatibility matrix and CDN snippet patterns.

### Expected Features

**Must have — table stakes (v0.5.0):**
- Pre-built description aggregates (entity→description, place→description) — foundational; unblocks all four features
- Build architecture decision and separate Eleventy builds — must precede any entity/place template work
- Place detail pages: name, type, variants, authority links (Wikidata, WHG, HGIS), admin context, linked descriptions
- Entity detail pages: structured name, dates, function, biographical note, name variants, linked descriptions
- Place explorer: searchable/filterable index + heatmap map (MapLibre + PMTiles)
- Entity explorer: searchable/filterable index with list view
- PMTiles on R2 with dedicated Cloudflare Worker

**Should have — differentiators (v0.5.x, add after v0.5.0 validation):**
- Entity network graph on entity explorer — Sigma.js, pre-computed ForceAtlas2 layout, ego-network on click
- Repository breakdown on entity/place detail pages
- Colonial administrative division facet on place explorer
- Top co-occurring entities list on entity detail pages

**Defer to v0.6+:**
- Build-time Wikidata enrichment baked into pages (requires adding QIDs to data model)
- SNAC/VIAF authority links on entity pages (requires identifier matching pipeline)
- Time slider on place explorer (data precision insufficient — colonial archives use decade-level dates)
- Dot/cluster toggle on place explorer map

**Anti-features to avoid entirely:**
- Live Wikidata/Wikipedia panels at page load (breaks static constraint)
- Full network graph for a single entity on its detail page (load the full edge dataset per page is unmanageable)
- Full 92K-node graph rendered at once (unusable hairball; always scope to threshold)
- Force-directed layout computed in the browser (blocks main thread above ~500 nodes)
- Drawing/bounding-box search on map (high complexity, low benefit at 8K places)

See `.planning/research/FEATURES.md` for full prioritisation matrix and DH project comparison table.

### Architecture Approach

The target architecture adds two parallel Eleventy builds (descriptions and entities/places), merges their `_site` outputs, then runs Pagefind once over the merged output and uploads to R2 via the existing upload script. PMTiles is served via a separate dedicated Cloudflare Worker bound to `tiles.zasqua.org`. Entity and place detail pages serve their linked-description data by fetching pre-computed per-entity/place JSON shards client-side rather than embedding 400K link records into Eleventy templates.

**Major components:**
1. **`scripts/precompute-links.js`** — reads entity/place link JSONs from backend, writes per-entity and per-place JSON shards to `data/entity-links/` and `data/place-links/`; runs before Eleventy
2. **`scripts/precompute-cooccurrence.js`** — builds co-occurrence adjacency list (capped at weight ≥ 3); runs before entity explorer build
3. **`src/entidad.njk` / `src/lugar.njk`** — Eleventy pagination templates generating ~92K entity and ~8K place pages; include Pagefind metadata attributes for lat/lon, type, and count
4. **`src/explorar/entidades.njk` / `src/explorar/lugares.njk`** — single-page explorers driven by Pagefind JS API (place metadata cached in-memory on init) and by MapLibre/Sigma visualizations
5. **`src/js/place-explorer.js`** — Pagefind JS API + MapLibre heatmap; loads place metadata once on init, filters in-memory, feeds GeoJSON to MapLibre source
6. **`src/js/entity-explorer.js`** — Pagefind JS API + Sigma.js; loads pre-computed co-occurrence JSON, builds graphology graph, renders subgraph on search/filter
7. **`worker/worker.js`** — existing Worker unchanged for HTML/CSS/JS; PMTiles served via a separate Protomaps Cloudflare Worker template with Range request pass-through

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, build-step-by-step ordering (15 steps), and complete file structure changes.

### Critical Pitfalls

1. **Node.js heap exhaustion from integrated build** — entities.json is 29.9 MB; adding 92K entity pages to the same Eleventy process as 106K description pages will exceed the 7 GB RAM of GitHub Actions runners. Avoid by running entity/place pages as a separate Eleventy build with its own Node process.

2. **PMTiles CORS/Range request failure through the existing Worker** — the existing site Worker has no Range request pass-through. R2 bucket CORS settings do not apply to custom-domain requests routed through a Worker. Deploy a dedicated Protomaps Worker on `tiles.zasqua.org` using the official template; do not modify the site Worker.

3. **Pagefind index bloat from entity/place pages** — indexing 206K pages (including entity `history` text fields) will produce a 500 MB+ index and degrade first-search latency. Use `data-pagefind-ignore` on entity/place pages, or build entity/place search as separate in-memory filtering against pre-built JSON rather than relying on Pagefind.

4. **Force-directed graph layout computed in the browser** — ForceAtlas2 on 1,000+ nodes blocks the main thread and triggers "page unresponsive" prompts. Pre-compute layout positions at build time using graphology-layout-forceatlas2 in Node.js and bake positions into the co-occurrence JSON. Sigma.js renders from pre-computed positions instantly.

5. **Rendering all places as a full-metadata GeoJSON source** — loading the full 3.1 MB places.json as a MapLibre source causes a 1–3 second render stall. Build a coordinates-only `places-map.json` at build time (strip to `place_code`, `display_name`, `lat`, `lon`); load as an external URL, not inline; cap coordinate precision at 4 decimal places.

See `.planning/research/PITFALLS.md` for complete pitfall profiles, warning signs, recovery steps, and a "looks done but isn't" verification checklist.

---

## Implications for Roadmap

Dependencies cascade clearly from data pipeline through templates through visualisations. The order below is non-negotiable — no phase can begin until its dependencies are confirmed working.

### Phase 1: Build architecture and data pipeline

**Rationale:** Every other feature depends on build-time aggregates and on knowing whether a separate Eleventy build is needed. Getting this wrong late in the milestone means rebuilding templates and CI configuration. Address Node OOM risk first.

**Delivers:** Separate Eleventy build for entity/place pages confirmed working in CI; `precompute-links.js` producing correct per-entity/place JSON shards; entity/place JSON downloads in `build.sh` and `deploy.yml`; confirmed build time within GitHub Actions 60-minute timeout.

**Addresses:** Pre-built description aggregates (P1), build architecture decision (P1)

**Avoids:** Node OOM (Pitfall 1), Pagefind index bloat (Pitfall 4), incremental build data staleness (Pitfall 2)

**Research flag:** Standard patterns — Eleventy parallel build, Node.js scripts. No phase-level research needed.

---

### Phase 2: PMTiles infrastructure

**Rationale:** Both the place detail embedded map and the place explorer heatmap depend on PMTiles on R2. This is shared infrastructure — set it up once before writing any map template code. The Worker must be deployed and range requests verified on the production domain before MapLibre templates are written.

**Delivers:** `zasqua-places.pmtiles` generated by Tippecanoe from `places.json`; dedicated Protomaps Cloudflare Worker on `tiles.zasqua.org`; end-to-end range request verification (HTTP 206, correct CORS headers in Firefox and Safari); PMTiles upload added to CI.

**Uses:** Tippecanoe 2.17+, pmtiles 4.4.0, MapLibre GL JS 5.x (smoke test only in this phase)

**Avoids:** PMTiles CORS/Range failure (Pitfall 3), GeoJSON render stall (Pitfall 5)

**Research flag:** MEDIUM concern — the Pitfalls research explicitly flags the gap between "bucket CORS works" and "Worker CORS works". Plan for troubleshooting time on first Worker deploy. Official Protomaps Cloudflare template is the verified path.

---

### Phase 3: Entity and place detail pages

**Rationale:** Detail pages are the link targets for both explorers. They must exist before explorer list views can link anywhere. They also validate that the pre-computed aggregate shards (Phase 1) are correct and complete.

**Delivers:** ~92K entity pages at `/entidad/{code}/` and ~8K place pages at `/lugar/{name}/` with correct Pagefind metadata, authority links, linked-description list (fetched client-side from JSON shards), breadcrumb navigation. Embedded map on place detail pages using MapLibre + PMTiles infrastructure from Phase 2.

**Addresses:** Place detail pages (P1), entity detail pages (P1)

**Avoids:** Loading all 308K links into Eleventy template memory (Architecture anti-pattern 1); MapLibre loaded on non-map pages (Performance trap)

**Research flag:** Standard patterns — Eleventy pagination, Nunjucks templates, Pagefind metadata attributes. No phase-level research needed.

---

### Phase 4: Place explorer

**Rationale:** Place explorer is simpler than entity explorer (list + map vs. list + network graph). Build it first to validate the MapLibre + Pagefind integration pattern before the more complex entity explorer.

**Delivers:** `/explorar/lugares/` — searchable place index with facet filters (place type, has coordinates, has authority links, colonial division); heatmap map using MapLibre + PMTiles; place metadata loaded once on init from Pagefind, filtered in-memory; cluster view at low zoom, heatmap at overview zoom.

**Addresses:** Place explorer (P1), heatmap visualization (P2)

**Avoids:** Pagefind queried on every filter change (Architecture anti-pattern 2); GeoJSON render stall (Pitfall 5 — coordinates-only GeoJSON built separately in Phase 1)

**Research flag:** Standard patterns for map/filter integration. No phase-level research needed.

---

### Phase 5: Entity explorer — list view

**Rationale:** Build the entity explorer list and filter UI before adding the network graph. This lets the feature ship with v0.5.0 while the graph pipeline is validated separately. List view with Pagefind-backed search is well-understood; graph is high risk.

**Delivers:** `/explorar/entidades/` — searchable entity index with facet filters (entity type, primary function, date range, minimum description count, repository); alphabetical sort; virtual/paginated list view (never render all 92K items to DOM).

**Addresses:** Entity explorer list view (P1)

**Avoids:** Rendering 92K entity names in DOM (Performance trap); Pagefind index bloat confirmed by this point

**Research flag:** Standard patterns. No phase-level research needed.

---

### Phase 6: Entity network graph (v0.5.x — post-launch)

**Rationale:** Deferred from launch to allow inspection of co-occurrence data at scale. Graph threshold parameters (minimum description count, minimum edge weight) cannot be set in advance without seeing the actual distribution. Build this after v0.5.0 entity/place pages are live and co-occurrence data can be audited.

**Delivers:** Network graph on entity explorer using Sigma.js 3.x; pre-computed ForceAtlas2 layout positions in `entity-cooccurrence.json`; ego-network expansion on node click; graph filtered by current search/facet state; hover shows entity name; click navigates to entity detail page.

**Uses:** Sigma.js 3.0.2, graphology 0.25.4, graphology-layout-forceatlas2 (Node.js build step only)

**Addresses:** Entity network graph (P2), pre-computed graph layout (P2)

**Avoids:** Force layout in browser (Pitfall 6); full 92K-node graph (anti-feature); community detection presented as factual groupings

**Research flag:** MEDIUM concern — graph threshold tuning is empirical. Run `precompute-cooccurrence.js` against real data and inspect node/edge count distributions before committing to a threshold. Plan for iteration.

---

### Phase Ordering Rationale

- **Data pipeline before templates:** Pre-computed aggregates (Phase 1) are required by every downstream phase. Starting here also forces early resolution of the build time risk.
- **Infrastructure before consumers:** PMTiles Worker (Phase 2) must be deployed and verified before any MapLibre code is written. Discovering Worker issues after templates are built is expensive.
- **Detail pages before explorers:** Explorers link to detail pages; building them first also validates that the aggregate JSON shards are correct.
- **Simple visualization before complex:** Place heatmap (Phase 4) before entity graph (Phase 6) — both use Pagefind JS API; map is simpler than graph; lessons carry over.
- **List view before graph:** Entity explorer ships at v0.5.0 without graph; graph ships at v0.5.x after co-occurrence data is audited.

### Research Flags

Phases needing deeper research or troubleshooting time during planning:
- **Phase 2 (PMTiles infrastructure):** The Protomaps Worker + custom domain CORS chain has a known gap between what bucket CORS settings suggest and what actually works. Allow time for debugging. Test on Firefox and Safari, not just Chrome.
- **Phase 6 (Entity network graph):** Co-occurrence threshold parameters must be calibrated against real data. Inspect graph density before choosing node/edge caps. Also, graphology-layout-forceatlas2 convergence time at the final threshold needs profiling.

Phases with well-documented patterns (no phase-level research needed):
- **Phase 1** — Node.js scripts + Eleventy parallel builds are standard
- **Phase 3** — Eleventy pagination + Nunjucks + Pagefind metadata attributes already in use
- **Phase 4** — MapLibre heatmap from GeoJSON: official example exists; pattern is established
- **Phase 5** — Pagefind JS API already in use on the site; list/filter UI is standard

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All critical versions verified against official npm and docs; CDN snippet patterns confirmed working |
| Features | MEDIUM | Core patterns drawn from verified DH projects; static-site-specific patterns extrapolated from confirmed technology capabilities; some feature decisions require real data inspection (graph thresholds) |
| Architecture | HIGH | Core patterns verified against official docs and existing codebase; Pagefind metadata API and MapLibre range request behaviour confirmed |
| Pitfalls | HIGH (critical), MEDIUM (performance thresholds) | OOM, PMTiles Worker, and Pagefind bloat pitfalls verified against official docs and community reports; performance thresholds (e.g. exact node count at which graph freezes) are estimates |

**Overall confidence:** HIGH for implementation direction; MEDIUM for exact performance thresholds and graph threshold calibration.

### Gaps to Address

- **Co-occurrence graph density:** Until `precompute-cooccurrence.js` runs against the real `entity_links.json` export, the actual node/edge count at different weight thresholds is unknown. Build the script early (Phase 1 or Phase 2) and profile before committing to graph scope.
- **Entity/place build time:** The 14-minute baseline for 106K pages suggests ~14 minutes for 100K entity/place pages, giving ~16 minutes parallel. This estimate depends on Eleventy's per-page cost being consistent across template types. Profile a DEV_LIMIT build before committing to the parallel build architecture.
- **Pagefind index size with entity pages included:** The Pitfalls research recommends excluding entity pages from Pagefind; the Architecture research suggests using Pagefind metadata on entity/place pages for map/graph driving. These goals are in tension. Resolve in Phase 1: decide whether entity/place pages are pagefind-indexed (with `data-pagefind-ignore` on long-form text fields) or excluded entirely in favour of separate JSON filtering. Both are viable; the choice affects the entity explorer search UX.
- **`entity_links.json` and `place_links.json` export format:** The Architecture research assumes a `[{entity_code, reference_code, title, date_start}]` structure. Confirm this against the actual backend export before writing `precompute-links.js`.

---

## Sources

### Primary (HIGH confidence)
- MapLibre GL JS npm — v5.21.1 current version
- pmtiles npm — v4.4.0 current version
- sigma npm — v3.0.2 current version
- Protomaps PMTiles docs (cloud storage, MapLibre integration, Cloudflare deployment)
- Cloudflare R2 CORS docs and HTTP 206 release notes
- Pagefind JS API docs (metadata, filtering, null query)
- Eleventy incremental build docs (data file tracking limitation confirmed)
- MapLibre heatmap layer official example

### Secondary (MEDIUM confidence)
- Sigma.js v3 release announcement (Ouestware, March 2024)
- Peripleo, Nodegoat, DIMES/RAC, WHG, HGIS de las Indias — DH project feature analysis
- Sigma.js vs Cytoscape.js performance comparison (third-party benchmark)
- Frontiers / DHQ — network graph uncertainty and ethical visualization

### Tertiary (informational)
- Community Cloudflare forum — R2 CORS with custom domain and Worker routing
- GitHub issues — Eleventy pagination OOM, parallel build discussions

---

*Research completed: 2026-03-26*
*Ready for roadmap: yes*
