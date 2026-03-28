# Phase 7: Place Explorer - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A searchable, filterable discovery page at `/explorar/lugares/` where users can browse all 8,177 places, filter by facets (place type, has coordinates, has authority links), and see matching results rendered as a heatmap on an interactive MapLibre map alongside a paginated results list. All data comes from pre-built `place-index.json` (~300 KB), loaded once and filtered in-memory with vanilla JS — no Pagefind, no server.

</domain>

<decisions>
## Implementation Decisions

### Page Layout
- **D-01:** **Stacked layout** — search/filters sidebar alongside map (50vh height), then results list below the map
- **D-02:** Sidebar on the left for facet filters (matching `/buscar/` pattern), with map and results to the right of the sidebar
- **D-03:** Map height is **50vh** (half viewport) — adapts to screen size
- **D-04:** Page has a **brief intro paragraph** — title ("Explorar lugares") + 1-2 sentences explaining what users can do here, above the search + map area
- **D-05:** On mobile, sidebar collapses into a **toggleable filter panel** above the map/results

### Heatmap & Map Interaction
- **D-06:** Heatmap rendered **client-side from place-index.json** — filter in JS, build GeoJSON FeatureCollection, update MapLibre heatmap layer. No PMTiles data layer needed (PMTiles used for basemap tiles only)
- **D-07:** **Heatmap at low zoom, individual points at high zoom** — smooth transition around z8-z10 where heatmap layer fades out and circle markers fade in
- **D-08:** Clicking a point shows a **popup with place name + link** to `/lugar/{name}/`. At heatmap zoom levels, clicking zooms in to reveal individual points

### Search & Filtering
- **D-09:** **Simple substring match** on display_name (case-insensitive) — no fuzzy search library needed for 8K place names
- **D-10:** Facet filters in sidebar: **place type**, **has coordinates** (boolean), **has authority links** (boolean) — matching the requirements PEXP-01/PEXP-02
- **D-11:** **Active filter pills** shown between search bar and results (removable), matching `/buscar/` pattern
- **D-12:** Filter state **synced to URL query params** — enables sharing filtered views and browser back/forward
- **D-13:** Map and results list are **independent by default** — both show the same filter-based dataset. An explicit **"Filter by map area" toggle** constrains results to places within the current map viewport when activated

### Results List
- **D-14:** Each result row shows: **place name** (link to `/lugar/{name}/`), **place type badge**, and **linked description count**
- **D-15:** **Paginated** — 50 results per page with page navigation at the bottom, URL tracks page number
- **D-16:** Default sort **alphabetical by name**, with a **toggle to sort by linked description count** (descending)

### Empty States
- **D-17:** Zero results: message ("No se encontraron lugares con estos criterios") + **"Clear all filters" link**. Map shows basemap with no heatmap overlay

### Place Type Labels
- **D-18:** Add missing ui.js labels: `river: "Cuerpo de agua"` and `other: "Accidente geográfico"`
- **D-19:** Facet shows **only types with records** in the data (currently: city/7860, river/253, region/47, other/17). Zero-record types stay defined in ui.js for future use

### Claude's Discretion
- Exact MapLibre heatmap layer configuration (colour ramp, radius, intensity, opacity transition)
- Zoom transition thresholds for heatmap-to-points switch
- Search input debounce timing
- Sidebar facet group expand/collapse defaults
- Exact pagination component styling (reuse from /buscar/ or new)
- How the "Filter by map area" toggle integrates visually
- Protomaps basemap style (en.json vs other variants)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Templates & Patterns
- `src/buscar.njk` — Search page template: sidebar facets, results list, pagination, filter pills — primary pattern to follow
- `src/js/search.js` — SearchPage class: URL param parsing, facet rendering, pagination, filter state — reference for the explorer's JS architecture
- `src/lugar.njk` — Place detail page template: target for result links
- `src/_layouts/base.njk` — Base layout with `{% block head %}`, `{% block content %}`, `{% block scripts %}`

### Data
- `src/_data/ui.js` — Spanish UI strings; `place.types` already has city/admin_division/region/country/geographical_feature; needs `river` and `other` added
- Phase 4 context (`.planning/phases/04-build-pipeline-data-pre-compute/04-CONTEXT.md`) — D-01 through D-08: place-index.json fields, Pagefind exclusion strategy, explorer search approach

### Map Infrastructure
- `src/js/place.js` — Existing MapLibre init pattern: Protomaps basemap, burgundy pin marker, pmtiles protocol registration
- Phase 5 context (`.planning/phases/05-pmtiles-infrastructure/05-CONTEXT.md`) — D-01/D-03: tiles served from `tiles.zasqua.org`, MapLibre tile URL pattern

### Design & Visual Identity
- `../docs/frontend/guidelines/design-tokens.md` — Colour, typography, and spacing tokens
- `../docs/frontend/guidelines/frontend-design.md` — Frontend design guidelines
- `src/css/main.css` — Stylesheet with Tailwind + `@layer components`

### Data Schema
- `.planning/PROJECT.md` §Context — Place data fields and counts (8,177 places, 5,574 with coordinates)
- Phase 4 context D-05/D-07 — place-index.json is ~300 KB with fields: place_code, display_name, place_type, lat, lon, has_wikidata, has_whg, has_hgis, linked_description_count

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/js/search.js` — SearchPage class with URL state management, facet rendering, pagination — can serve as architectural reference for the explorer's PlaceExplorer class
- `src/js/place.js` — MapLibre + Protomaps init pattern with burgundy markers — reuse for the explorer map with heatmap layer additions
- `src/css/main.css` — Existing `.search-*` and `.filter-*` classes for sidebar facets, pills, pagination
- `src/_data/ui.js` — Place type labels (partial — needs river/other additions)

### Established Patterns
- Sidebar facets with collapsible groups and active filter pills (`/buscar/`)
- URL-driven state with `pushState`/`popstate` handling
- CommonJS data loaders in `src/_data/`
- `data-pagefind-ignore` on non-searchable content
- MapLibre CDN loaded conditionally in template head

### Integration Points
- New template: `src/explorar/lugares.njk` (or `src/explorar-lugares.njk`) — needs permalink `/explorar/lugares/`
- New JS: `src/js/place-explorer.js` — loaded only on the explorer page
- `eleventy.config.js` — passthrough copy for any new assets
- `data/place-index.json` — fetched client-side by the explorer JS (not a build-time data file)
- Navigation: `ui.nav.browse` ("Explorar") already exists — may need subnav or direct link

</code_context>

<specifics>
## Specific Ideas

- The sidebar pattern from `/buscar/` is the primary UX reference — users who've used the search page should find the explorer immediately familiar
- Place type distribution is heavily skewed: city (96%), river (3%), region (<1%), other (<0.2%) — the facet will be dominated by "Lugar poblado" but the filter is still useful for finding rivers/regions specifically
- The "Filter by map area" toggle is an explicit user-activated feature, not a default — keeps the default experience simple while giving spatial power to users who want it
- 5,574 of 8,177 places have coordinates — the remaining 2,603 appear in the results list but not on the map. The "has coordinates" facet lets users filter to map-visible places

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-place-explorer*
*Context gathered: 2026-03-28*
