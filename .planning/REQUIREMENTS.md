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

- [x] **PLACE-01**: User can view a place detail page at `/lugar/{display_name}/` showing display name and place type label in Spanish
- [x] **PLACE-02**: Place detail page shows name variants when available
- [ ] **PLACE-03**: Place detail page shows an embedded interactive map (MapLibre + PMTiles) for places with coordinates
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
- [ ] **PEXP-03**: Place explorer renders filtered results as a heatmap on an interactive map (MapLibre + PMTiles)
- [x] **PEXP-04**: Place explorer shows a results list alongside the map

### Entity Explorer

- [ ] **EEXP-01**: User can search entities by name on `/explorar/entidades/`
- [ ] **EEXP-02**: User can filter entities by facets (entity type, primary function, date range)
- [ ] **EEXP-03**: Entity explorer shows a paginated/virtual results list (never renders all 92K to DOM)

### Entity Network Graph

- [ ] **GRAPH-01**: Entity explorer includes a network graph showing entity co-occurrence through shared documents
- [ ] **GRAPH-02**: Graph uses pre-computed ForceAtlas2 layout positions (no browser-side force simulation)
- [ ] **GRAPH-03**: User can click a graph node to expand its ego-network (immediate neighbours)
- [ ] **GRAPH-04**: Graph filters in sync with the entity explorer search/facet state

### Fixes

- [x] **FIX-01**: Public repo ui.js includes Acerca and Catalogación nav link labels

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
| PLACE-01 | Phase 6 | Complete |
| PLACE-02 | Phase 6 | Complete |
| PLACE-03 | Phase 6 | Pending |
| PLACE-04 | Phase 6 | Complete |
| PLACE-05 | Phase 6 | Complete |
| ENT-01 | Phase 6 | Complete |
| ENT-02 | Phase 6 | Complete |
| ENT-03 | Phase 6 | Complete |
| ENT-04 | Phase 6 | Complete |
| ENT-05 | Phase 6 | Complete |
| PEXP-01 | Phase 7 | Complete |
| PEXP-02 | Phase 7 | Complete |
| PEXP-03 | Phase 7 | Pending |
| PEXP-04 | Phase 7 | Complete |
| EEXP-01 | Phase 8 | Pending |
| EEXP-02 | Phase 8 | Pending |
| EEXP-03 | Phase 8 | Pending |
| GRAPH-01 | Phase 9 | Pending |
| GRAPH-02 | Phase 9 | Pending |
| GRAPH-03 | Phase 9 | Pending |
| GRAPH-04 | Phase 9 | Pending |
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
- v0.5.0 requirements: 28 total (1 complete, 27 pending)
- Mapped to phases: 27/27 pending ✓
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-26 — traceability filled in after roadmap creation*
