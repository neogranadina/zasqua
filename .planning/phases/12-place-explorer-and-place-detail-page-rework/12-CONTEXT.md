# Phase 12: Place Explorer and Place Detail Page Rework - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix place explorer and place detail page issues surfaced during Phase 11 visual review. Redesign the place explorer map (clustered markers with document counts), fix broken interactions (filters, timeline toggle, index click behaviour), restyle place index cards to match entity explorer, and redesign the place detail page layout (map + description list instead of map/timeline toggle).

</domain>

<decisions>
## Implementation Decisions

### Explorer Map Redesign
- **D-01:** Remove the splash screen / empty state overlay. Load the map immediately with clustered markers showing all geocoded places on first load
- **D-02:** Move the introductory text and example place buttons above the map, combined with the existing header intro. Combined text: "Explora los **N** lugares vinculados a las descripciones de Zasqua. Busca por nombre, filtra por tipo o selecciona un lugar en el mapa. Prueba con Santafé de Bogotá, Cartagena, Quito o Popayán."
- **D-03:** Use MapLibre GL native clustering — cluster circles show the count of places in that cluster, circle size scales with count
- **D-04:** Burgundy colour for all markers and clusters — consistent with site visual identity
- **D-05:** Initial map view centred on northern South America (Colombia/Ecuador/Venezuela region) at a zoom level that shows the main clusters
- **D-06:** Clicking a cluster zooms in to reveal its children (standard MapLibre cluster behaviour, no spiderfy)
- **D-07:** Clicking an individual (unclustered) marker selects that place in the sidebar — populates the selected-place card and highlights in the index. No map popup
- **D-08:** Map markers sync with filters — when the index list is filtered (by search, facets, or viewport), the map markers update to show only matching places
- **D-09:** Keep the viewport filter toggle ("Filtrar por vista del mapa") — still useful when zoomed in
- **D-10:** Places without coordinates appear in the index list (searchable, filterable) but have no map marker. The existing "has coordinates" facet filter lets users distinguish them

### Place Detail Layout
- **D-11:** Remove the segmented map/timeline toggle entirely. Map (when available) is always visible at the top of the aside. Below it, show linked descriptions as a scrollable list
- **D-12:** Each linked description shows: title (linked to description page), date (if available), and role label (e.g. Lugar mencionado, Lugar de producción)
- **D-13:** Default sort chronological (oldest first). Sort toggle to switch between chronological and alphabetical by title. Entries without dates go at the bottom in a "Sin fecha" group
- **D-14:** For places without coordinates: show the existing "Ubicación no disponible" placeholder notice at the top of the aside, then the description list below it

### Index and Interaction Fixes
- **D-15:** Index click selects the place — centres map on it, populates sidebar card. The card has a "Ver ficha" link to navigate to the detail page (matches entity explorer pattern)
- **D-16:** Place index cards match entity explorer pattern: place name, place type badge, linked description count, coordinates indicator (pin icon if has coords)
- **D-17:** Selected place card simplified from Phase 10.2 D-04: name, place type, document count, and "Ver ficha" link. Remove authority IDs from the card
- **D-18:** Sort options match entity explorer: sort by name (default) and sort by linked description count
- **D-19:** Filter checkbox bug (checkboxes uncheck immediately when clicked) — research phase should investigate root cause, likely a re-render resetting state after Pagefind search triggers

### Data Quality
- **D-20:** 148 places with zero linked descriptions — already deleted from database (done during this session)
- **D-21:** 15 "accidentes geográficos" (place_type "other") — already reclassified to city/region in database. 2 deleted (Hacienda de Halla, Chatham). Zero "other" type places remain
- **D-22:** Geocoding quality issues (442 places with coordinates outside Americas, plus wrong-location cases like Acapulco) — audit report generated at `docs/enrichment/geocoding-audit-2026-04-12.md`, to be addressed in `zasqua-entities` repo. Frontend should work with corrected data after re-export
- **D-23:** Total places after cleanup: 6,918 (down from 7,068). Frontend data files (places.json, place-index.json) need re-export before Phase 12 implementation

### Claude's Discretion
- Exact MapLibre cluster configuration (cluster radius, max zoom, transition thresholds)
- Cluster circle sizing formula and colour opacity
- Map initial zoom level for northern South America view
- Search input debounce timing
- Sort toggle visual treatment
- How the coordinates indicator (pin icon) integrates visually in index cards
- Root cause fix approach for the filter checkbox bug (after investigation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current place explorer implementation
- `src/explorar/lugares.njk` — Place explorer template with explorer-grid layout, map panel, selected card, filters, results
- `src/js/place-explorer.js` — PlaceExplorer class: Pagefind search, facets, map, pagination, URL state, viewport filter
- `src/css/main.css` — Explorer CSS classes: `.explorer-grid`, `.explorer-graph-panel`, `.graph-empty-state`, `.selected-entity-card`, `.viewport-filter-btn`

### Current place detail page
- `src/lugar.njk` — Place detail page template: two-column layout, segmented toggle, map frame, timeline frame
- `src/js/place.js` — Place detail JS: shard loading, role filters, timeline rendering, toggle buttons, map init

### Entity explorer (parity reference)
- `src/explorar/entidades.njk` — Entity explorer template (layout to mirror)
- `src/js/entity-explorer.js` — EntityExplorer class: Pagefind search, sidebar, card pattern, sort options
- `src/js/infinite-bipartite-explorer.js` — Graph explorer: node interaction patterns, selected card behaviour

### Design and visual language
- `../docs/frontend/guidelines/design-tokens.md` — Colour, typography, spacing tokens
- `../docs/frontend/guidelines/frontend-design.md` — Frontend design guidelines

### Data
- `src/_data/places.js` — Place data loader (attaches _linked_count from place-index.json)
- `src/_data/ui.js` — Spanish UI strings, place types, role labels
- `src/_data/site.js` — Site config including protomaps_key

### Prior phase context
- `.planning/phases/07-place-explorer/07-CONTEXT.md` — Original place explorer decisions (layout, heatmap, facets, URL state)
- `.planning/phases/10.2-explorer-parity/10.2-CONTEXT.md` — Explorer parity decisions (Protomaps basemap, selected card, layout mirroring)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlaceExplorer` class — Pagefind integration, facet rendering, URL state sync, pagination, viewport filter. Core search+browse stays; map rendering needs rework from single-marker to clusters
- `EntityExplorer` class — Reference for card pattern, sort options, selected card behaviour (parity target)
- CSS classes: `.explorer-grid`, `.explorer-graph-panel`, `.explorer-filters-col`, `.explorer-results-col`, `.selected-entity-card` — all reusable with the new clustered map
- Protomaps terrain-only basemap config — already implemented in Phase 10.2, reuse for clusters

### Established Patterns
- Pagefind place index at `/pagefind-places/` — architecture stays
- Sidebar facets with collapsible groups and active filter pills
- URL-driven state with `pushState`/`popstate`
- MapLibre loaded via CDN conditionally in template head
- Place data from `/data/place-index.json` fetched client-side (coordinates for map markers)

### Integration Points
- `place-explorer.js` map init section needs replacement: remove single-marker/empty-state logic, add GeoJSON source with clustering
- `lugar.njk` aside section needs restructure: remove segmented toggle, make map always visible, add description list below
- `place.js` toggle wiring needs removal, timeline rendering repurposed as description list

</code_context>

<specifics>
## Specific Ideas

- The combined intro text with example place buttons should be above the map, not overlaid on it as a splash screen
- Map and index should always show the same filtered dataset — two-way sync
- The entity explorer is the explicit parity target for card styling, sort options, and interaction patterns
- Data re-export needed before implementation — 6,918 places after cleanup, geocoding fixes pending in zasqua-entities

</specifics>

<deferred>
## Deferred Ideas

- **Geocoding corrections** — 442 suspect places flagged in audit report, to be fixed in zasqua-entities before re-export
- **Distance-based sort** — sort by distance from map centre when viewport filter is active (mentioned as option, not selected)
- **Spiderfy clusters** — fan out overlapping markers at max zoom (decided against, using zoom-in instead)

</deferred>

---

*Phase: 12-place-explorer-and-place-detail-page-rework*
*Context gathered: 2026-04-12*
