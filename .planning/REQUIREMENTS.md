# Requirements: Zasqua Frontend

**Defined:** 2026-03-24
**Core Value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.

## v0.5.0 Requirements

Requirements for the Entity & Place Discovery milestone. Each maps to roadmap phases.

### Build Infrastructure

- [x] **BUILD-01**: Build system generates ~100K entity/place pages without exceeding GitHub Actions memory limits
- [x] **BUILD-02**: Pre-build script aggregates entity-description and place-description links into per-entity and per-place JSON shards
- [x] **BUILD-03**: Pre-build script computes entity co-occurrence graph with configurable minimum edge weight threshold
- [x] **BUILD-04**: PMTiles file generated from place coordinate data using Tippecanoe at build time
- [x] **BUILD-05**: Dedicated Cloudflare Worker serves PMTiles with correct Range request handling and CORS headers
- [x] **BUILD-06**: CI pipeline builds, merges, indexes, and deploys ~200K pages within GitHub Actions timeout

### Place Detail Pages

- [ ] **PLACE-01**: User can view a place detail page at `/lugar/{display_name}/` showing display name and place type label in Spanish
- [ ] **PLACE-02**: Place detail page shows name variants when available
- [ ] **PLACE-03**: Place detail page shows an embedded interactive map (MapLibre + PMTiles) for places with coordinates
- [ ] **PLACE-04**: Place detail page shows clickable authority links (Wikidata, WHG) and HGIS identifier, only for those that exist
- [ ] **PLACE-05**: Place detail page shows linked archival descriptions loaded from pre-built JSON shards

### Entity Detail Pages

- [ ] **ENT-01**: User can view an entity detail page at `/entidad/{entity_code}/` showing display name and entity type in Spanish
- [ ] **ENT-02**: Entity detail page shows structured name (given name, surname, honorific), date range, and primary function
- [ ] **ENT-03**: Entity detail page shows name variants when available
- [ ] **ENT-04**: Entity detail page shows dates of existence and history when available
- [ ] **ENT-05**: Entity detail page shows linked archival descriptions loaded from pre-built JSON shards

### Place Explorer

- [x] **PEXP-01**: User can search places by name on `/explorar/lugares/`
- [x] **PEXP-02**: User can filter places by facets (place type, has coordinates, has authority links)
- [x] **PEXP-03**: Place explorer renders filtered results as a heatmap on an interactive map (MapLibre + PMTiles)
- [x] **PEXP-04**: Place explorer shows a results list alongside the map

### Entity Explorer

- [x] **EEXP-01**: User can search entities by name on `/explorar/entidades/`
- [x] **EEXP-02**: User can filter entities by facets (entity type, primary function, date range)
- [x] **EEXP-03**: Entity explorer shows a paginated/virtual results list (never renders all 92K to DOM)

### Explorer UX Redesign (Phase 10)

- [ ] **EXP-01**: Entity explorer loads without crashing the browser at 83K+ entities — curated starter graph replaces full bipartite graph
- [ ] **EXP-02**: Curated starter graph of top 100 most-connected entities loads instantly from a single pre-computed JSON file with baked-in ForceAtlas2 positions
- [ ] **EXP-03**: Ego-network expansion on click — clicking a graph node reveals its 1-hop neighbours from entity-link shards
- [ ] **EXP-04**: Deep-linking from entity detail pages — `/explorar/entidades/?nodo=entity_code` opens graph centred on that entity
- [ ] **EXP-05**: Explorer intro text counts are dynamic from build-time data (entities.json length, places.json length) — no hardcoded numbers
- [ ] **EXP-06**: Place explorer reflects updated 7,068 places (from 8,177) with correct data and dynamic count
- [ ] **EXP-07**: Protomaps CDN basemap fixed on place detail pages — OpenFreeMap liberty style replaces stale cdn.protomaps.com URL
- [ ] **EXP-08**: Phase 9 graph dead code cleaned up — precompute-bipartite-graph.js, entity-doc-graph.json, co-occurrence artefacts removed
- [ ] **EXP-09**: Figma designs exist for both explorer pages and are approved before implementation begins
- [ ] **EXP-10**: Both explorers have visual coherence with Phase 9 detail page designs (typography, spacing, colour tokens)

### Entity Network Graph — SUPERSEDED

GRAPH-01 through GRAPH-04 deferred (2026-03-30), then superseded by EXP-01 through EXP-04 in Phase 10. The co-occurrence blob approach was tested with real data and shelved — entities connect through documents, not directly. Redesigned as a curated starter graph with ego-network expansion for the explorer page.

- [x] **GRAPH-01**: ~~Entity explorer includes a network graph~~ → Superseded by EXP-01, EXP-02
- [x] **GRAPH-02**: ~~Pre-computed ForceAtlas2 layout~~ → Superseded by EXP-02
- [x] **GRAPH-03**: ~~Ego-network expansion~~ → Superseded by EXP-03
- [x] **GRAPH-04**: ~~Filter sync~~ → Deferred (two-way graph-list binding out of scope for Phase 10)

### Fixes

- [x] **FIX-01**: Public repo ui.js includes Acerca and Catalogacion nav link labels

## v0.4.0 Requirements (Complete)

### Visual Identity — Typography

- [x] **VIS-01**: Google Fonts import updated to load DM Sans, Crimson Text, and Cormorant Garamond (replacing Lato and IM Fell DW Pica)
- [x] **VIS-02**: `--font-body` and `--font-heading` set to DM Sans; `--font-logo` set to Crimson Text; `--font-serif` remains Cormorant Garamond

### Visual Identity — Colour Palette

- [x] **COL-01**: CSS custom properties updated with new palette — burgundy primary (`#8B2942`), periwinkle secondary (`#C9D5FF`), warm gray neutrals, dark burgundy footer (`#4A1522`)
- [x] **COL-02**: All hardcoded colour values in `main.css` replaced with CSS variables or updated to match the new palette
- [x] **COL-03**: Accent/selection colour changed from blue to periwinkle across search, Miller columns, filter pills, and pagination
- [x] **COL-04**: Hover accent changed from orange to periwinkle/burgundy across links, buttons, and interactive elements

### Visual Identity — Components

- [x] **COMP-01**: Header redesigned — pomegranate logo + "Neogranadina: Zasqua" lockup in Crimson Text, DM Sans navigation, periwinkle hover underlines
- [x] **COMP-02**: Footer redesigned — dark burgundy background (`#4A1522`) replacing navy, updated text styling
- [x] **COMP-03**: Homepage hero updated — burgundy search button with periwinkle hover, Crimson Text title
- [x] **COMP-04**: Homepage masonry grid preserved — only colour/typography changes (hover overlay becomes burgundy instead of blue)
- [x] **COMP-05**: Search page updated — burgundy active filter pills, periwinkle active pagination, updated sort/facet styling
- [x] **COMP-06**: Description page updated — periwinkle level badges, burgundy links, updated metadata section headers
- [x] **COMP-07**: Repository page updated — periwinkle Miller column selection, burgundy links
- [x] **COMP-08**: Background colour changed to warm white (`#FAFAF9`) from pure white

### AHRB Import

- [x] **AHRB-01**: Backend data exported with `export_frontend_data` including all AHRB description records, uploaded to B2
- [x] **AHRB-02**: Frontend rebuilt with AHRB data — ~106K pages generated and deployed to R2
- [x] **AHRB-03**: AHRB repository landing page displays correctly with volume listings and IIIF viewer links

## Future Requirements

### Deferred from v0.5.0

- **PEXP-05**: Colonial administrative division facet on place explorer
- **ENT-06**: Top co-occurring entities list on entity detail pages
- **ENT-07**: Repository breakdown on entity/place detail pages

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dark mode | Not in Figma spec; minimal computing — keep it simple |
| Catalogacion visual identity | Separate project (zasqua-catalogacion-dev) |
| TIFY viewer theming | Self-contained vendor CSS; would require upstream work |
| Build-time Wikidata enrichment | Requires adding QIDs to data model — v0.6+ |
| SNAC/VIAF authority links on entity pages | Requires identifier matching pipeline — v0.6+ |
| Time slider on place explorer | Colonial archive dates too imprecise (decade-level) — anti-feature |
| Full 92K-node graph rendered at once | Unusable hairball — always scope to threshold/ego-network |
| Force-directed layout in browser | Blocks main thread above ~500 nodes — pre-compute at build time |
| Runtime API dependency | All data pre-built at build time |
| Two-way graph-list binding | Deferred from Phase 9 and Phase 10 — not needed for discovery |
| Graph search (type-to-find-node) | Deferred from Phase 9 |
| Community detection / cluster colouring | Deferred from Phase 9 |
| Mobile-responsive redesign | Separate future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 4 | Complete |
| BUILD-02 | Phase 4 | Complete |
| BUILD-03 | Phase 4 | Complete |
| BUILD-04 | Phase 5 | Complete |
| BUILD-05 | Phase 5 | Complete |
| BUILD-06 | Phase 4 | Complete |
| PLACE-01 | Phase 6 | Pending |
| PLACE-02 | Phase 6 | Pending |
| PLACE-03 | Phase 6 | Pending |
| PLACE-04 | Phase 6 | Pending |
| PLACE-05 | Phase 6 | Pending |
| ENT-01 | Phase 6 | Pending |
| ENT-02 | Phase 6 | Pending |
| ENT-03 | Phase 6 | Pending |
| ENT-04 | Phase 6 | Pending |
| ENT-05 | Phase 6 | Pending |
| PEXP-01 | Phase 7 | Complete |
| PEXP-02 | Phase 7 | Complete |
| PEXP-03 | Phase 7 | Complete |
| PEXP-04 | Phase 7 | Complete |
| EEXP-01 | Phase 8 | Complete |
| EEXP-02 | Phase 8 | Complete |
| EEXP-03 | Phase 8 | Complete |
| EXP-01 | Phase 10 | Pending |
| EXP-02 | Phase 10 | Pending |
| EXP-03 | Phase 10 | Pending |
| EXP-04 | Phase 10 | Pending |
| EXP-05 | Phase 10 | Pending |
| EXP-06 | Phase 10 | Pending |
| EXP-07 | Phase 10 | Pending |
| EXP-08 | Phase 10 | Pending |
| EXP-09 | Phase 10 | Pending |
| EXP-10 | Phase 10 | Pending |
| GRAPH-01 | Phase 10 | Superseded by EXP-01/02 |
| GRAPH-02 | Phase 10 | Superseded by EXP-02 |
| GRAPH-03 | Phase 10 | Superseded by EXP-03 |
| GRAPH-04 | — | Deferred |
| FIX-01 | — | Complete |
| VIS-01 | Phase 1 | Complete |
| VIS-02 | Phase 1 | Complete |
| COL-01 | Phase 1 | Complete |
| COL-02 | Phase 1 | Complete |
| COL-03 | Phase 1 | Complete |
| COL-04 | Phase 1 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| COMP-05 | Phase 2 | Complete |
| COMP-06 | Phase 2 | Complete |
| COMP-07 | Phase 2 | Complete |
| COMP-08 | Phase 2 | Complete |
| AHRB-01 | Phase 3 | Complete |
| AHRB-02 | Phase 3 | Complete |
| AHRB-03 | Phase 3 | Complete |

**Coverage:**
- v0.5.0 requirements: 38 total (18 complete, 10 pending Phase 10, 10 pending other)
- Mapped to phases: all mapped
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-04-04 — Phase 10 requirements added (EXP-01 through EXP-10)*
