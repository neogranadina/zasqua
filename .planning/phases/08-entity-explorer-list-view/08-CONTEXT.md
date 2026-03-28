# Phase 8: Entity Explorer — List View - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A searchable, filterable discovery page at `/explorar/entidades/` for browsing 92,042 entities, powered by a **dedicated Pagefind index** (not the description index). Same sidebar + results layout as `/buscar/` and `/explorar/lugares/`. This phase also **migrates the place explorer** from in-memory JSON filtering to its own Pagefind index, establishing three separate Pagefind indices across the site.

**Scope includes:**
- Entity explorer page at `/explorar/entidades/`
- Separate Pagefind index for entity pages
- Separate Pagefind index for place pages
- Migration of place explorer from entity-index.json/place-index.json to Pagefind
- Place explorer map continues to use place-index.json for coordinate data

**Scope excludes:**
- Entity network graph (Phase 9)
- Changes to the description search at `/buscar/`

</domain>

<decisions>
## Implementation Decisions

### Architecture — Pagefind Indices
- **D-01:** Three **separate Pagefind indices** power the three explorers: `/buscar/` (descriptions), `/explorar/entidades/` (entities), `/explorar/lugares/` (places). Each index is built from its own set of pages.
- **D-02:** This **replaces the Phase 4 decision** (D-01/D-02/D-03) to use pre-built JSON index files with in-memory JS filtering. Pagefind handles search, facets, and pagination natively — far less custom code.
- **D-03:** Entity and place pages gain `data-pagefind-body` and `data-pagefind-filter` attributes for their respective indices. They remain excluded from the description Pagefind index.
- **D-04:** `place-index.json` is **kept for the map only** — it provides lat/lon coordinates for the heatmap. Pagefind handles search, facets, and results for the place explorer.

### Entity Page Pagefind Attributes
- **D-05:** Entity pages (`src/entidad.njk`) need: `data-pagefind-filter` for `entity_type`, `primary_function`, and `year` (one filter per year in the entity's date range). `data-pagefind-sort` for `name` (sort_name) and `date` (date_earliest).
- **D-06:** Date filtering reuses the **same nested drill-down** from `/buscar/`: century → decade → year. Entity date ranges emit one `data-pagefind-filter="year"` per year spanned (e.g. an entity from 1750–1823 emits year filters for 1750, 1751, ..., 1823).

### Place Page Pagefind Attributes
- **D-07:** Place pages (`src/lugar.njk`) need: `data-pagefind-filter` for `place_type`, `has_coordinates` (boolean), `has_authority` (boolean). `data-pagefind-sort` for `name` (display_name).

### Page Layout
- **D-08:** Entity explorer uses the **same sidebar + results layout** as `/buscar/` and `/explorar/lugares/` — facet sidebar on the left, results on the right. Consistent UX across all three explorers.
- **D-09:** On mobile, sidebar collapses into a toggleable filter panel (same pattern as place explorer).

### Entity Result Rows
- **D-10:** Each entity result row shows (all inline): **entity name** (link to detail page), **type badge** (Persona/Entidad corporativa/Familia), **date range** (e.g. "1750–1823") when available, **primary function** as secondary text, **document count** ("Asociado a N documentos"), and **name variants** as subtle subtitle when present.

### Sorting
- **D-11:** Default sort **alphabetical by name** (using sort_name). Toggle options for sort by date and sort by document count — same pattern as place explorer.

### Loading
- **D-12:** Pagefind's chunked index loading replaces the 5-8 MB JSON download. No special loading strategy needed — Pagefind loads incrementally.

### Search Behaviour
- **D-13:** Pagefind's built-in **ranked full-text search** replaces custom substring matching. Better relevance ranking out of the box.

### Place Explorer Migration
- **D-14:** The existing PlaceExplorer class (`src/js/place-explorer.js`) is **refactored** to use Pagefind for search/facets/results while keeping the MapLibre map fed by `place-index.json` for coordinates.
- **D-15:** `entity-index.json` generation in `precompute-links.js` can be **removed** after migration. `place-index.json` stays (map needs it).

### Claude's Discretion
- How to configure separate Pagefind index builds (CLI flags, config files, or build script steps)
- Exact Pagefind filter attribute placement within entity and place templates
- How to handle entities/places with no dates (exclude from date facet or show as "Sin fecha")
- Result row styling details (spacing, typography, badge colours)
- How to structure the EntityExplorer JS class (follow PlaceExplorer pattern or refactor further)
- Build script modifications for three parallel Pagefind runs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pagefind
- `src/buscar.njk` — Search page template: the reference for how Pagefind-powered search works in this project
- `src/js/search.js` — SearchPage class: Pagefind init, facet rendering, date drill-down (century→decade→year), pagination, URL state, filter pills
- `src/description.njk` lines 13-39 — How `data-pagefind-filter`, `data-pagefind-sort`, and `data-pagefind-body` are used on description pages

### Entity & Place Templates
- `src/entidad.njk` — Entity detail page: currently has `data-pagefind-ignore` — needs Pagefind attributes added
- `src/lugar.njk` — Place detail page: currently has `data-pagefind-ignore` — needs Pagefind attributes added
- `src/_data/ui.js` — Spanish UI strings: `entity.types`, `entity.fields`, `place.types`

### Current Explorers
- `src/explorar/lugares.njk` — Place explorer template (to be migrated)
- `src/js/place-explorer.js` — PlaceExplorer class (to be refactored to use Pagefind)

### Data Pipeline
- `scripts/precompute-links.js` — Generates entity-index.json (to be removed) and place-index.json (kept for map)
- `src/_data/entities.js` — Entity data loader (reads entity-index.json for linked counts)
- `src/_data/places.js` — Place data loader (reads place-index.json for linked counts)

### Build & Deploy
- `eleventy.config.js` — Build config, passthrough copies
- `.github/workflows/deploy.yml` — CI/CD pipeline (needs additional Pagefind build steps)

### Design
- `../docs/frontend/guidelines/design-tokens.md` — Colour, typography, spacing tokens
- `../docs/frontend/guidelines/frontend-design.md` — Frontend design guidelines
- `src/css/main.css` — Stylesheet with existing search/explorer CSS classes

### Prior Phase Context
- `.planning/phases/04-build-pipeline-data-pre-compute/04-CONTEXT.md` — D-01 through D-08: original JSON index decisions (D-01/D-02/D-03 now superseded by Pagefind approach)
- `.planning/phases/07-place-explorer/07-CONTEXT.md` — Place explorer design decisions (layout, facets, map, results)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/js/search.js` SearchPage class — Primary reference for Pagefind integration: init, search, facet rendering, date drill-down, pagination, URL state, filter pills, sort, mobile toggle. The entity and place explorers should follow this pattern closely.
- `.search-layout`, `.search-sidebar`, `.facet-group`, `.filter-pill`, `.search-pagination`, `.result-item` CSS classes — All reusable from the search page.
- `.explorer-map`, `.map-area-toggle` CSS classes — Place explorer specific, stay for the map.
- `.authority-pill` CSS class — Used in place explorer result rows for WD/WHG/HGIS badges.

### Established Patterns
- Pagefind init: `import('/pagefind/pagefind.js')` → `pagefind.init()` → `pagefind.filters()` for facet counts → `pagefind.search()` for results
- Date drill-down: century → decade → year using `data-pagefind-filter="year"` with individual year values
- URL state: `URLSearchParams` for all filter state, `pushState` for history
- Mobile: `.mobile-filter-toggle` button toggles `.sidebar-open` on sidebar

### Integration Points
- Build script needs three Pagefind runs (descriptions, entities, places) with separate output directories
- `eleventy.config.js` passthrough copies for each Pagefind index
- Entity/place templates need metadata sections with Pagefind attributes
- Place explorer JS refactored: Pagefind for search/facets, place-index.json for map coordinates

</code_context>

<specifics>
## Specific Ideas

- Date filtering reuses the exact same nested drill-down (century → decade → year) already built in search.js — no new date UI needed
- Entity result rows should be as rich as the improved place explorer rows: name, type badge, dates, function, doc count, name variants inline
- Three separate Pagefind indices keep each explorer independent — no cross-contamination between description search and entity/place exploration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-entity-explorer-list-view*
*Context gathered: 2026-03-28*
