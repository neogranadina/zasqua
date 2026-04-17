# Requirements: Zasqua Frontend

**Defined:** 2026-04-16
**Core Value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.

## v1.0.0 Requirements

Requirements for the Build Pipeline Sustainability milestone. Each maps to roadmap phases.

### Hugo Migration

- [ ] **HUGO-01**: Hugo Extended builds all 192K pages (106K descriptions, 78K entities, 7K places) without exceeding GitHub Actions memory limits
- [ ] **HUGO-02**: Content adapters generate description, entity, and place pages from pre-enriched JSON — no stub markdown files on disk
- [ ] **HUGO-03**: All existing URLs are preserved — no redirects needed for published pages
- [ ] **HUGO-04**: Hugo project scaffold uses `resources.Get` + `transform.Unmarshal` for large JSON data, never `.Site.Data`

### Pre-Build Enrichment

- [ ] **ENRICH-01**: `generate-content.js` computes ancestor breadcrumb chains for all descriptions
- [ ] **ENRICH-02**: `generate-content.js` pre-computes formatted Spanish dates (narrative format with ranges) for all date fields
- [ ] **ENRICH-03**: `generate-content.js` enriches entity and place links with display names, role labels, and cross-reference data
- [ ] **ENRICH-04**: `generate-content.js` writes enriched JSON to `assets/hugo-data/` for consumption by content adapters
- [ ] **ENRICH-05**: Dev subset mode — `DEV_LIMIT` environment variable truncates data for fast local builds (seconds, not minutes)

### Template Porting

- [ ] **TMPL-01**: Base layout (`baseof.html`) with header, footer, and breadcrumb partials renders identically to the current Nunjucks output
- [ ] **TMPL-02**: Description detail page template renders all ISAD(G) sections, Pagefind attributes, IIIF viewer, and Miller columns correctly
- [ ] **TMPL-03**: Entity detail page template renders timeline/graph views, role filters, and bipartite graph initialisation
- [ ] **TMPL-04**: Place detail page template renders map/timeline views, authority links, and conditional Protomaps loading
- [ ] **TMPL-05**: Explorer page templates (entity, place) render with correct inline JS initialisation for graph and map components
- [ ] **TMPL-06**: Shell pages (index, search, repository, 404) render correctly
- [ ] **TMPL-07**: All 15 custom Nunjucks filters reimplemented as Go returning partials or pre-computed in enrichment script

### CI/CD Pipeline

- [ ] **CI-01**: GitHub Actions workflow builds with Hugo Extended, Tailwind CSS v4 via npm, and Pagefind v1.5.2
- [ ] **CI-02**: Three Pagefind indices (descriptions, entities, places) built in parallel in CI
- [ ] **CI-03**: Full build (download + enrich + Hugo + Pagefind + upload) completes within GitHub Actions timeout
- [ ] **CI-04**: R2 diff-based upload — only changed files are uploaded, using ETag/MD5 comparison against existing bucket contents

## v0.5.0 Requirements (Complete)

### Build Infrastructure

- [x] **BUILD-01**: Build system generates ~100K entity/place pages without exceeding GitHub Actions memory limits
- [x] **BUILD-02**: Pre-build script aggregates entity-description and place-description links into per-entity and per-place JSON shards
- [x] **BUILD-03**: Pre-build script computes entity co-occurrence graph with configurable minimum edge weight threshold
- [x] **BUILD-04**: PMTiles file generated from place coordinate data using Tippecanoe at build time
- [x] **BUILD-05**: Dedicated Cloudflare Worker serves PMTiles with correct Range request handling and CORS headers
- [x] **BUILD-06**: CI pipeline builds, merges, indexes, and deploys ~200K pages within GitHub Actions timeout

### Place Detail Pages

- [x] **PLACE-01**: User can view a place detail page at `/lugar/{display_name}/` showing display name and place type label in Spanish
- [x] **PLACE-02**: Place detail page shows name variants when available
- [x] **PLACE-03**: Place detail page shows an embedded interactive map (MapLibre + PMTiles) for places with coordinates
- [x] **PLACE-04**: Place detail page shows clickable authority links (Wikidata, WHG) and HGIS identifier, only for those that exist
- [x] **PLACE-05**: Place detail page shows linked archival descriptions loaded from pre-built JSON shards

### Entity Detail Pages

- [x] **ENT-01**: User can view an entity detail page at `/entidad/{entity_code}/` showing display name and entity type in Spanish
- [x] **ENT-02**: Entity detail page shows structured name (given name, surname, honorific), date range, and primary function
- [x] **ENT-03**: Entity detail page shows name variants when available
- [x] **ENT-04**: Entity detail page shows dates of existence and history when available
- [x] **ENT-05**: Entity detail page shows linked archival descriptions loaded from pre-built JSON shards

### Place Explorer

- [x] **PEXP-01**: User can search places by name on `/explorar/lugares/`
- [x] **PEXP-02**: User can filter places by facets (place type, has coordinates, has authority links)
- [x] **PEXP-03**: Place explorer renders filtered results as a heatmap on an interactive map (MapLibre + PMTiles)
- [x] **PEXP-04**: Place explorer shows a results list alongside the map

### Entity Explorer

- [x] **EEXP-01**: User can search entities by name on `/explorar/entidades/`
- [x] **EEXP-02**: User can filter entities by facets (entity type, primary function, date range)
- [x] **EEXP-03**: Entity explorer shows a paginated/virtual results list (never renders all 92K to DOM)

### Explorer UX Redesign

- [x] **EXP-01**: Entity explorer loads without crashing the browser at 83K+ entities
- [x] **EXP-02**: Curated starter graph replaced by infinite bipartite graph explorer
- [x] **EXP-03**: Ego-network expansion on click — entity→document→entity chain navigation
- [x] **EXP-04**: Deep-linking from entity detail pages
- [x] **EXP-05**: Explorer intro text counts are dynamic from build-time data
- [x] **EXP-06**: Place explorer reflects updated 7,068 places with correct data and dynamic count
- [x] **EXP-07**: Protomaps CDN basemap fixed on place detail pages
- [x] **EXP-08**: Phase 9 graph dead code cleaned up
- [x] **EXP-09**: Figma designs exist for both explorer pages
- [x] **EXP-10**: Both explorers have visual coherence with detail page designs

### Fixes

- [x] **FIX-01**: Public repo ui.js includes Acerca and Catalogacion nav link labels

## v0.4.0 Requirements (Complete)

### Visual Identity — Typography

- [x] **VIS-01**: Google Fonts import updated to load DM Sans, Crimson Text, and Cormorant Garamond
- [x] **VIS-02**: Font variables set — DM Sans body/heading, Crimson Text logotype, Cormorant Garamond serif

### Visual Identity — Colour Palette

- [x] **COL-01**: CSS custom properties updated with new palette — burgundy primary, periwinkle secondary, warm gray neutrals
- [x] **COL-02**: All hardcoded colour values replaced with CSS variables
- [x] **COL-03**: Accent/selection colour changed from blue to periwinkle
- [x] **COL-04**: Hover accent changed from orange to periwinkle/burgundy

### Visual Identity — Components

- [x] **COMP-01**: Header redesigned — pomegranate logo + lockup
- [x] **COMP-02**: Footer redesigned — dark burgundy background
- [x] **COMP-03**: Homepage hero updated
- [x] **COMP-04**: Homepage masonry grid preserved
- [x] **COMP-05**: Search page updated
- [x] **COMP-06**: Description page updated
- [x] **COMP-07**: Repository page updated
- [x] **COMP-08**: Background colour changed to warm white

### AHRB Import

- [x] **AHRB-01**: Backend data exported including all AHRB description records
- [x] **AHRB-02**: Frontend rebuilt with AHRB data — ~106K pages generated and deployed
- [x] **AHRB-03**: AHRB repository landing page displays correctly

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
| Build-time Wikidata enrichment | Requires adding QIDs to data model — future |
| SNAC/VIAF authority links on entity pages | Requires identifier matching pipeline — future |
| Time slider on place explorer | Colonial archive dates too imprecise — anti-feature |
| Full 92K-node graph rendered at once | Unusable hairball — always scope to ego-network |
| Force-directed layout in browser | Blocks main thread above ~500 nodes — pre-compute |
| Runtime API dependency | All data pre-built at build time |
| Two-way graph-list binding | Not needed for discovery |
| Graph search (type-to-find-node) | Deferred from Phase 9 |
| Community detection / cluster colouring | Deferred from Phase 9 |
| Mobile-responsive redesign | Separate future milestone |
| Streaming Nunjucks renderer | Hugo migration chosen instead — streaming is a bridge, not a destination |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HUGO-01 | — | Pending |
| HUGO-02 | — | Pending |
| HUGO-03 | — | Pending |
| HUGO-04 | — | Pending |
| ENRICH-01 | — | Pending |
| ENRICH-02 | — | Pending |
| ENRICH-03 | — | Pending |
| ENRICH-04 | — | Pending |
| ENRICH-05 | — | Pending |
| TMPL-01 | — | Pending |
| TMPL-02 | — | Pending |
| TMPL-03 | — | Pending |
| TMPL-04 | — | Pending |
| TMPL-05 | — | Pending |
| TMPL-06 | — | Pending |
| TMPL-07 | — | Pending |
| CI-01 | — | Pending |
| CI-02 | — | Pending |
| CI-03 | — | Pending |
| CI-04 | — | Pending |

**Coverage:**
- v1.0.0 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 after initial definition*
