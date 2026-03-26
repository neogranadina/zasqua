# Feature Research

**Domain:** Spatial discovery and entity network exploration for static archival sites
**Researched:** 2026-03-26
**Confidence:** MEDIUM — core patterns drawn from verified DH projects (Peripleo, WHG, DIMES/RAC, HGIS de las Indias, Nodegoat, Sigma.js docs); static-site-specific patterns extrapolated from verified technology capabilities

---

## Context

This research covers four distinct but interrelated feature areas being added to an existing 106K-page static archival discovery site (Zasqua Frontend v0.5.0):

1. **Place detail pages** — `/lugar/{name}/` — authority links, coordinates, embedded map, linked descriptions
2. **Entity detail pages** — `/entidad/{code}/` — structured name, dates, function, linked descriptions
3. **Place explorer** — `/explorar/lugares/` — searchable/filterable index with heatmap map
4. **Entity explorer** — `/explorar/entidades/` — searchable/filterable index with network graph

Data available: 8,177 places (5,574 with coordinates), 3,704 Wikidata links, 4,932 WHG links, 2,801 HGIS links, 92,042 entities, 308K entity-description links, 85K place-description links.

Constraint: fully static site — no runtime server, everything pre-built at build time.

---

## Feature Landscape

### 1. Place Detail Pages

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Place name and type prominently displayed | First thing users want to know | LOW | Display `display_name`, `place_type`, `fclass` |
| Embedded map showing the place's location | Any geocoded item in a modern site shows a map | MEDIUM | MapLibre + PMTiles on R2; only needed for 5,574 places with coordinates — show static message for the rest |
| Name variants / alternate forms | Places change names; researchers look by multiple names | LOW | Already in `name_variants` field |
| Authority links to external gazetteers | Users expect to link out to Wikidata, WHG, etc. | LOW | Wikidata, WHG, HGIS IDs already in places.json; construct URLs at build time |
| Count of linked archival descriptions | Users want to know how many records mention this place | LOW | Pre-compute at build time from place-description links |
| Linked descriptions list | Core discovery value: find documents about this place | MEDIUM | 85K place-description links; paginate or limit to top N on the static page |
| Administrative context | Users need to orient the place geographically | LOW | `admin levels`, `colonial divisions` already in data |
| Breadcrumb / back navigation | Users arrive via search or explorer; need to return | LOW | Standard nav pattern |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Colonial administrative context displayed alongside modern context | Zasqua's materials are colonial-era; showing both colonial divisions and modern admin levels adds interpretive value found in few archival interfaces | LOW | Data already in places.json; just surface it clearly |
| HGIS de las Indias link | Specific to Spanish American colonial history — a differentiator vs generic gazetteers | LOW | IDs already in data; link to `hgis.es` authority pages |
| Geographic feature classification (fclass) displayed in plain language | Bridges technical gazetteer vocabulary and researcher expectations | LOW | Map `fclass` codes to human-readable labels at build time |
| Link count broken down by repository | Helps researchers identify which archive holds the most material for this place | MEDIUM | Requires aggregation across place-description links and description metadata |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live Wikidata panel fetching biographical/place data at page load | Rich contextual enrichment looks appealing | Breaks the static constraint; adds runtime dependency; Wikidata API can be slow or unavailable; creates CORS and caching headaches | Include Wikidata link so users can navigate there; if enrichment is desired, fetch and bake it into the JSON at build time |
| Full-text search scoped to a single place page | Power-user request for "search within documents about this place" | Pagefind cannot be scoped to a dynamic subset at page load without a separate index build | Link to the existing Pagefind search with the place name pre-filled as a filter or query |
| Inline IIIF viewer for documents about this place | Showcases archival richness | Each item's viewer is already on its own description page; duplicating it here adds significant complexity and page weight | Show thumbnails or a preview strip linking to the description pages |

---

### 2. Entity Detail Pages

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Display name and entity type (person / corporate body) | Immediate disambiguation | LOW | `display_name`, `entity_type` from entities.json |
| Structured name breakdown (given name, surname, honorific) | Persons are frequently found under multiple name forms; archival norm | LOW | Fields already in entities.json |
| Dates of existence | Expected for any person or institution record | LOW | `date_earliest`, `date_latest`, `dates_of_existence` |
| Historical/biographical note | Users expect context; DIMES/RAC user research found even minimal text dramatically increases engagement | LOW | `history` field already in entities.json |
| Function / occupation | Corporate bodies need their purpose; persons need their role | LOW | `primary_function` already in entities.json |
| Name variants / alternative forms | Critical for colonial-era names with multiple spellings, Latin forms, religious names | LOW | `name_variants` already in entities.json |
| Count and list of linked archival descriptions | The primary discovery value — what did they create or appear in? | MEDIUM | 308K entity-description links; pre-aggregate at build time; show top N with link to full list if paginated |
| Breadcrumb / back navigation | Users arrive via entity explorer or linked descriptions | LOW | Standard nav pattern |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sort name displayed and explained | Colonial naming conventions are opaque; showing `sort_name` and explaining the inversion convention helps researchers | LOW | `sort_name` already in data |
| Cross-references to co-occurring entities | Shows which persons and bodies frequently appear in the same documents — a soft network signal even without a full graph | MEDIUM | Requires pre-computing top co-occurring entities per entity at build time; limited to top 5–10 |
| Repository breakdown for linked descriptions | Tells researchers which archives hold the most material for this entity | MEDIUM | Pre-aggregate entity-description links by repository at build time |
| Authority link to SNAC or VIAF if available | Connects to the wider archival authority ecosystem; modelled on DIMES/RAC's expanded agent pages | MEDIUM | Data not currently in entities.json — would require a data enrichment step to add VIAF/SNAC identifiers |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live Wikipedia/Wikidata panel at page load | Enriches sparse biographical records | Runtime dependency; breaks static constraint; Wikidata QID not currently stored for entities | Bake enrichment at build time if QIDs are added to the data model; link out to Wikidata search |
| Full network graph on the entity detail page itself | Looks impressive in demos | Rendering a graph for a single entity requires loading the full edge dataset or a large per-entity slice; 92K entities × N edges is not manageable per-page without heavy pre-processing | Reserve graphs for the dedicated explorer page; show only top co-occurrences as a list on the detail page |
| Timeline of appearances by date | Appealing for historians | Requires date data on individual descriptions, which is often sparse or imprecise in colonial archives; visualising gaps as data is misleading | Show date range of earliest/latest linked description as text |

---

### 3. Place Explorer

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Searchable place index | Any index page in a modern interface has search | MEDIUM | Pagefind can index place pages; alternatively a pre-built JSON index with client-side filter; Pagefind preferred for consistency |
| Faceted filtering by place type | Users expect to narrow by settlement, region, administrative unit, etc. | MEDIUM | `place_type` / `fclass` fields; pre-build filter lists at build time |
| Faceted filtering by presence/absence of coordinates | Researchers want geocoded places; they need to know coverage | LOW | Boolean filter; pre-aggregate at build time |
| Faceted filtering by authority link availability | Researchers using Wikidata or WHG want to find linkable places | LOW | Pre-aggregate counts per authority at build time |
| Map showing place distribution | Expected from any geocoded collection; establishes geographic scope immediately | HIGH | MapLibre + PMTiles on R2; 5,574 geocoded places as GeoJSON or vector tiles |
| Count display ("8,177 places, 5,574 geocoded") | Sets expectations; standard in digital collections | LOW | Pre-computed at build time |
| Link to individual place pages | The explorer is an entry point, not an endpoint | LOW | Standard list item → detail page pattern |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Heatmap visualisation on the explorer map | Shows document density geographically, not just place presence — tells researchers where the archive's coverage is concentrated | MEDIUM | MapLibre heatmap layer weighted by description count per place; GeoJSON with pre-computed weights; 5,574 points is well within MapLibre's performance envelope without tiling |
| Dot/cluster toggle alongside heatmap | Heatmap is good for overview; individual dots are better for locating specific places | MEDIUM | MapLibre layer toggle; dots default to cluster mode at low zoom; expand at high zoom |
| Filter by colonial administrative division | Specific to the Latin American colonial archive domain; no generic DH tool offers this | MEDIUM | `colonial divisions` field in places.json; pre-build facet list |
| Link count displayed on each place card/row | Researchers want to know which places are well-documented before clicking through | LOW | Pre-computed at build time from place-description aggregates |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full-text search of place descriptions from the explorer | Sounds like a power feature | Would require Pagefind to index and expose description text per place, creating a redundant search interface alongside the existing main search | Pre-fill the main site search with the place name as a query; link to it from the explorer |
| Drawing/bounding-box search on the map | Peripleo and other tools offer this; it looks sophisticated | High implementation complexity for limited benefit given the modest 8,177 place count; bounding-box filtering of a static JSON dataset is possible but adds significant JS complexity | Provide faceted filtering by colonial region/admin level as a proxy for geographic scoping |
| Time slider on the place explorer map | HGIS de las Indias and WHG v3 both offer this | Document dates in Zasqua are often sparse or decade-level; animating a timeline would misrepresent data precision; very high implementation cost | Show date range metadata in the place card; link to filtered main search by date range |

---

### 4. Entity Explorer

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Searchable entity index | Any index of 92K items requires search | MEDIUM | Pagefind for consistency with rest of site; may need separate Pagefind index for entity sub-site if build architecture splits |
| Filter by entity type (person / corporate body) | Fundamental disambiguation | LOW | Binary filter; pre-aggregate at build time |
| Filter by primary function | Researchers look for notaries, scribes, religious orders, etc. | MEDIUM | `primary_function` field; pre-build facet list; may require normalisation |
| Filter by date range | Historians need temporal scoping | MEDIUM | `date_earliest`/`date_latest`; range slider or decade facets; many entities will have no dates — must handle gracefully |
| Alphabetical browsing / sort | Standard for authority file-type indexes | LOW | Pre-sort by `sort_name` at build time |
| Count display ("92,042 entities") | Sets expectations | LOW | Pre-computed at build time |
| Link to individual entity pages | Explorer as entry point | LOW | Standard pattern |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Network graph showing entity co-occurrence through shared documents | Core differentiator — turns a list into a discovery tool; reveals networks of colonial actors invisible in hierarchical description | HIGH | Sigma.js 3.0 (WebGL, production-ready for thousands of nodes); pre-build graph JSON (nodes + edges with co-occurrence weight) at build time; limit to entities with ≥ N descriptions to keep graph manageable; ego-network view on node click |
| Filter entities by minimum description count | Lets researchers focus on well-documented actors | LOW | Pre-compute description counts at build time |
| Repository filter on entity index | Tells researchers which archive their entity appears in | MEDIUM | Pre-aggregate by repository at build time |
| Graph interactivity: hover shows name, click loads detail page | Standard for DH network graphs; modelled on Nodegoat and Sigma.js examples | MEDIUM | Sigma.js built-in hover; click handler loads entity detail page |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full 92K-entity graph rendered at once | "Show me all the connections" | Graphs above ~150 nodes become unmanageable for users; 92K nodes with 308K edges would render as an unusable hairball; WebGL can technically handle it but the UX value collapses entirely | Pre-filter to entities with ≥ 5 descriptions; cluster remaining nodes; provide progressive expansion via ego-network on click |
| Automatic community detection displayed as fixed clusters | Looks analytically sophisticated | Community detection algorithms (Louvain, etc.) produce different results with different parameters and are sensitive to edge weighting choices; presenting algorithmic output as factual groupings misleads researchers about what the archive actually contains | If communities are desired, document the algorithm and parameters prominently; flag as exploratory, not authoritative |
| Force-layout calculated in the browser at load time | D3 force simulation on large graphs | D3 force simulation on 5K+ nodes blocks the main thread; using a Web Worker helps but adds complexity; 92K nodes is out of the question | Pre-compute layout coordinates at build time (e.g. with ForceAtlas2 via graphology-layout-forceatlas2 in a build script); bake positions into the graph JSON; Sigma.js renders from pre-computed positions instantly |
| Network search as a replacement for text search | Some DH tools conflate graph exploration with search | Graph exploration is non-linear and not suitable for known-item searching | Keep text search (Pagefind) separate; graph is for serendipitous discovery only |

---

## Feature Dependencies

```
Place detail page
    └──requires──> Pre-built description aggregates (place → descriptions)
    └──requires──> PMTiles on R2 (for embedded map)
    └──enhanced by──> MapLibre GL JS (map rendering)

Entity detail page
    └──requires──> Pre-built description aggregates (entity → descriptions)

Place explorer
    └──requires──> Place detail pages (link targets)
    └──requires──> Pre-built place index JSON (for faceted filter)
    └──requires──> PMTiles on R2 (for heatmap map)
    └──requires──> MapLibre GL JS
    └──enhanced by──> Pre-computed description counts per place (for heatmap weight)

Entity explorer
    └──requires──> Entity detail pages (link targets)
    └──requires──> Pre-built entity index JSON (for faceted filter)
    └──requires──> Pre-computed graph JSON (nodes + edges + layout positions)
    └──requires──> Sigma.js 3.x (WebGL graph rendering)
    └──enhanced by──> Pre-computed co-occurrence counts per entity

Pre-built description aggregates
    └──required by──> All four features

Pre-computed graph JSON
    └──requires──> Build-time ForceAtlas2 layout (graphology-layout-forceatlas2 or similar)
    └──filtered by──> Minimum description count threshold (quality gate on graph size)

Pagefind search index
    └──enhanced by──> Entity/place pages in the index (existing Pagefind works; large page
                      count increase may require build architecture changes)
```

### Dependency Notes

- **Pre-built aggregates are the foundation**: Every feature depends on build-time aggregation of entity-description and place-description links. This is the first thing to implement — it unblocks all four features.
- **PMTiles unblocks both map features**: Place detail pages and the place explorer both need PMTiles on R2. Setting up the PMTiles file and R2 hosting is a shared prerequisite.
- **Graph layout must be pre-computed**: Rendering from pre-computed positions is non-negotiable at 5K+ nodes. ForceAtlas2 via graphology at build time is the recommended path. This adds a build step before the entity explorer can function.
- **Build architecture decision precedes everything**: The existing build is ~14 minutes for 106K pages. Adding ~100K entity/place pages could push this past 30+ minutes. The build architecture decision (separate builds merged before upload vs. incremental) must be resolved before any entity/place page generation begins.
- **Sigma.js is isolated to the entity explorer**: It does not need to be loaded on any other page. Dynamic import or a separate JS bundle keeps it off the critical path for all other pages.

---

## MVP Definition

### Launch With (v0.5.0)

- [ ] Pre-built description aggregates — unblocks all other features
- [ ] Place detail pages with name, type, variants, authority links, admin context, linked description list — core discovery value
- [ ] Entity detail pages with structured name, dates, function, note, linked description list — core discovery value
- [ ] Place explorer with searchable index and heatmap map — spatial entry point
- [ ] Entity explorer with searchable/filterable index — list-based entry point (graph is v0.5.x)
- [ ] PMTiles on R2 — shared infrastructure for all map features

### Add After Validation (v0.5.x)

- [ ] Entity network graph on entity explorer — add once entity pages are live and the graph build pipeline is proven; graph data may reveal unexpected density/sparsity requiring threshold tuning
- [ ] Repository breakdown on entity and place pages — adds analytical depth; depends on aggregates being correct first
- [ ] Colonial division facet on place explorer — depends on data quality audit of `colonial_divisions` field
- [ ] Top co-occurring entities on entity detail page — lightweight once graph edges are pre-computed

### Future Consideration (v0.6+)

- [ ] Build-time Wikidata enrichment baked into entity/place pages — requires data model changes to add QIDs to entities; good candidate for a dedicated enrichment sprint
- [ ] SNAC/VIAF authority links on entity pages — requires identifier matching pipeline
- [ ] Dot/cluster toggle on place explorer map — quality-of-life improvement after map basics are solid

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Pre-built description aggregates | HIGH | MEDIUM | P1 |
| Build architecture decision + spike | HIGH (unblocks everything) | MEDIUM | P1 |
| Place detail pages | HIGH | MEDIUM | P1 |
| Entity detail pages | HIGH | MEDIUM | P1 |
| PMTiles on R2 | HIGH (unblocks maps) | MEDIUM | P1 |
| Place explorer (list + map) | HIGH | HIGH | P1 |
| Entity explorer (list only) | HIGH | MEDIUM | P1 |
| Heatmap on place explorer | MEDIUM | MEDIUM | P2 |
| Entity network graph | HIGH | HIGH | P2 |
| Pre-computed graph layout | HIGH (unblocks graph) | MEDIUM | P2 |
| Repository breakdown on detail pages | MEDIUM | LOW | P2 |
| Colonial division facet on place explorer | MEDIUM | LOW | P2 |
| Top co-occurring entities on entity detail | MEDIUM | MEDIUM | P2 |
| Wikidata enrichment at build time | MEDIUM | HIGH | P3 |
| SNAC/VIAF authority links | MEDIUM | HIGH | P3 |
| Time slider on place explorer | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## DH Project Feature Analysis

| Feature | Peripleo / Pelagios | Nodegoat | DIMES (RAC) | HGIS de las Indias | WHG v3 | Zasqua Approach |
|---------|---------------------|----------|-------------|-------------------|--------|-----------------|
| Map-first discovery | Yes — map is primary interface | Yes — map + graph combined | No — list-first | Yes — interactive WebGIS with timeline | Yes — with time slider | Map as secondary to list; heatmap on explorer, small map on detail page |
| Network graph | No | Yes — core feature | No | No | No | Yes — on entity explorer; ego-network on click |
| Authority links on place pages | Yes — Pelagios URIs are the backbone | Via linked data | No | HGIS is itself an authority | Yes — WHG indexes other authorities | Yes — Wikidata, WHG, HGIS links from existing data |
| Time slider | Yes (Peripleo) | Yes | No | Yes | Yes (v3) | Deferred — data precision insufficient |
| Faceted filtering | Yes — time, dataset, type | Yes | Yes | Limited | Limited | Yes — type, admin level, authority presence |
| Linked descriptions on place/entity pages | Yes (items per place) | Yes | Yes | No | Via linked datasets | Yes — core feature |
| Pre-computed / static delivery | No — runtime API | No — dynamic database | No — ArchivesSpace backend | No — ArcGIS platform | No — Django backend | Yes — fully static; differentiator vs all above |
| Colonial/Latin American context | HGIS de las Indias as partner | No | No | Core focus | Partial | Yes — colonial divisions, HGIS links |

### What DH Projects Do Well

- **Peripleo**: Geographic browsing as the primary entry point is powerful for heterogeneous collections. The combination of keyword + spatial + temporal filtering is the gold standard for spatio-temporal discovery.
- **Nodegoat**: Combining map, timeline, and network graph in a single interface demonstrates that researchers use all three simultaneously. Its ego-network expansion pattern (click a node, see its immediate neighbourhood) is the correct UX for large graphs.
- **DIMES/RAC**: Agent pages with Wikidata enrichment significantly improve researcher engagement even with minimal text. The bidirectional linking (agent ↔ collection) is a table-stakes pattern confirmed by user testing.
- **WHG**: The principle that no place record is singular — concatenating all linked attestations — models how place data should be presented when multiple authority sources exist.

### Where DH Projects Fail

- **Performance on large datasets**: Almost all DH tools require a runtime server. Static delivery at scale is a genuine gap and a Zasqua differentiator.
- **Uncertainty representation**: Network graphs rarely communicate that relationships are inferred from co-occurrence, not documented facts. Zasqua should be explicit: "these entities appear in the same documents" not "these entities are connected."
- **Graph overload**: Most tools that add a network graph render too many nodes by default and offer no path in for new users. Threshold filtering and ego-network expansion on click are the correct mitigations.
- **Time sliders over sparse data**: HGIS de las Indias and WHG v3 both offer timeline animation. For colonial archives with decade-level date precision, this creates false precision. Better to show date coverage as text.
- **Mobile maps**: Most DH map interfaces are desktop-only. PMTiles + MapLibre works on mobile; the map UI should be designed for thumb use from the start.

---

## Sources

- Peripleo features: [Peripleo README](https://github.com/pelagios/peripleo/blob/main/README.md); [Code4Lib article on Peripleo](https://journal.code4lib.org/articles/11144); [Springer DH article on Peripleo principles](https://link.springer.com/article/10.1007/s42803-025-00112-w)
- DIMES/RAC agent pages: [Rockarch blog: Agent pages enhanced](https://blog.rockarch.org/dimes-agent-pages-enhanced)
- Network graph pitfalls: [Frontiers: Uncertainty in humanities network visualization](https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2023.1305137/full); [Inria: Pitfalls in historical network modeling](https://inria.hal.science/hal-03784532v1); [DHQ: Ethical visualization of knowledge networks](https://www.digitalhumanities.org/dhq/vol/16/3/000629/000629.html)
- Graph size usability: [ITAL: Knowledge graph visualization for digital heritage](https://ital.corejournals.org/index.php/ital/article/view/16719)
- Sigma.js 3.0: [Ouestware: Sigma.js 3.0 announcement](https://www.ouestware.com/2024/03/21/sigma-js-3-0-en/); [Sigma.js GitHub](https://github.com/jacomyal/sigma.js/)
- Nodegoat features: [Nodegoat](https://nodegoat.net/); [Digital Orientalist: Introduction to Nodegoat](https://digitalorientalist.com/2024/04/12/exploring-the-depths-of-data-an-introduction-to-nodegoat/)
- WHG: [WHG v3 announcement](https://www.worldhistory.pitt.edu/news/version-3-world-historical-gazetteer-live); [WHG place records](https://whgazetteer.org/)
- HGIS de las Indias: [Oxford Research Encyclopedia entry](https://oxfordre.com/latinamericanhistory/display/10.1093/acrefore/9780199366439.001.0001/acrefore-9780199366439-e-822); [HGIS Interactive](https://experience.arcgis.com/experience/e95574f1ad5048c5991ed150dfcc7593)
- Layered archival description / linked data UX: [SAA Description blog](https://saadescription.wordpress.com/2026/03/24/six-degrees-of-separation-using-linked-data-to-create-layered-archival-description/)
- MapLibre heatmap: [MapLibre heatmap example](https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer/)
- PMTiles: [Protomaps PMTiles for MapLibre](https://docs.protomaps.com/pmtiles/maplibre); [Simon Willison on PMTiles](https://til.simonwillison.net/gis/pmtiles)
- Pagination vs infinite scroll: [LogRocket: Pagination vs infinite scroll](https://blog.logrocket.com/ux-design/pagination-vs-infinite-scroll-ux/)
- Large graph rendering: [Medium: Best libraries for large force-directed graphs](https://weber-stephen.medium.com/the-best-libraries-and-methods-to-render-large-force-directed-graphs-on-the-web-d122ece2f4dc)
- Wikidata authority integration: [Wikidata in Collections](https://medium.com/freely-sharing-the-sum-of-all-knowledge/wikidata-in-collections-building-a-universal-language-for-connecting-glam-catalogs-59b14aa3214c)

---

*Feature research for: spatial discovery and entity network exploration, static archival site*
*Researched: 2026-03-26*
