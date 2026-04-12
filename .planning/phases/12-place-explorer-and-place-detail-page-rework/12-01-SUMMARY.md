---
phase: 12-place-explorer-and-place-detail-page-rework
plan: 01
subsystem: ui
tags: [maplibre, clustering, pagefind, vanilla-js, geojson]

requires:
  - phase: 10.2-explorer-parity
    provides: Protomaps terrain-only basemap, explorer-grid layout, selected card pattern
provides:
  - Clustered marker map replacing heatmap on place explorer
  - Map-filter sync (map markers match search/filter state)
  - Search generation counter preventing checkbox race condition
  - Index click selects place instead of navigating
  - Simplified selected place card (no authority IDs)
  - Example place buttons in header intro text
affects: [12-02, place-explorer, place-detail]

tech-stack:
  added: []
  patterns:
    - MapLibre GL native clustering (cluster: true on GeoJSON source)
    - Search generation counter for async race prevention

key-files:
  created: []
  modified:
    - src/explorar/lugares.njk
    - src/js/place-explorer.js

key-decisions:
  - "Detect Protomaps font from basemap layers for cluster count labels instead of hardcoding"
  - "Extract place IDs from Pagefind result stub URLs for filter sync without calling .data()"

patterns-established:
  - "Search generation counter: increment _searchGen at search start, check after each await"
  - "MapLibre clustered source with three layers: clusters, cluster-count, unclustered-point"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-15, D-16, D-17, D-18, D-19, D-23]

duration: 4min
completed: 2026-04-12
---

# Phase 12 Plan 01: Place Explorer Rework Summary

**Clustered MapLibre marker map replacing heatmap, with filter-synced markers, checkbox race fix, and index-click selection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T20:45:44Z
- **Completed:** 2026-04-12T20:49:49Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced heatmap + splash overlay with clustered marker map that loads immediately with all geocoded places visible
- Fixed checkbox race condition using search generation counter pattern
- Map markers now sync with search/filter state -- filtered results show only matching markers
- Index clicks select places in sidebar card instead of navigating away
- Simplified selected place card (removed authority links per D-17)
- Example place buttons moved from splash overlay to header intro text

## Task Commits

Each task was committed atomically:

1. **Task 1: Clustered map, template cleanup, and intro text** - `57bdcfe` (feat)
2. **Task 2: Filter sync, checkbox bug fix, index click behaviour, card simplification** - `f642a66` (fix)

## Files Created/Modified
- `src/explorar/lugares.njk` - Removed map-empty-state div, added example place buttons to intro text
- `src/js/place-explorer.js` - Replaced initMap with clustered layers, added search generation counter, filter-synced updateMap, preventDefault on index clicks, removed authority links from card

## Decisions Made
- Detect available Protomaps font by inspecting basemap layers array at runtime rather than hardcoding a font name -- ensures cluster count labels render correctly regardless of Protomaps asset server changes
- Extract place IDs from Pagefind result stub `.url` property (pattern `/nl-{id}/`) for map filter sync -- avoids expensive `.data()` resolution on all results

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None -- no external service configuration required.

## Known Stubs
None -- all data sources wired, no placeholder text.

## Next Phase Readiness
- Place explorer clustered map and interaction fixes complete
- Ready for Plan 02 (place detail page layout rework)
- D-23 precondition: data has 7,068 records instead of expected 6,918 -- intro text renders dynamically so count is correct regardless

---
*Phase: 12-place-explorer-and-place-detail-page-rework*
*Completed: 2026-04-12*
