---
phase: 07-place-explorer
plan: 02
subsystem: ui
tags: [maplibre, vanilla-js, place-explorer, heatmap, facets, url-state]

# Dependency graph
requires:
  - phase: 07-01
    provides: "Place explorer template shell at /explorar/lugares/, CSS classes .explorer-map and .map-area-toggle, data-place-types attribute on #place-explorer"
provides:
  - PlaceExplorer class in src/js/place-explorer.js — complete interactive place explorer with search, facets, map, results, pagination, URL state
  - PEXP-01: in-memory substring search on display_name with 250ms debounce
  - PEXP-02: three sidebar facet groups (place type, coordinates, authority) with filter pills and clear-all
  - PEXP-03: MapLibre heatmap (places-heat) and circle (places-circle) layers with zoom-based transition
  - PEXP-04: paginated results list (50/page) with place name links, type badges, document counts
affects: [07-03-plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-memory filter+sort+paginate over a pre-fetched JSON index — render() calls applyFilters, filterByViewport, sortResults, slice; only source.setData() for map updates"
    - "URL state via URLSearchParams + pushState; popstate listener restores full state"
    - "Filter by map area: moveend listener re-runs filtering without calling updateUrl (per Pitfall 7)"
    - "Heatmap opacity interpolation: fade out at z7-z10 while circles fade in at z7-z9 for smooth transition"

key-files:
  created:
    - src/js/place-explorer.js
  modified: []

key-decisions:
  - "filterByViewport applied after applyFilters but before sortResults — map shows pre-viewport filtered results (full filter result set) while list shows viewport-constrained results"
  - "moveend listener updates results list only, not URL — avoids polluting browser history with every map pan"
  - "Facet counts computed from allPlaces (not filtered) to show total dataset counts per D-19"

patterns-established:
  - "PlaceExplorer follows SearchPage pattern: constructor parses state, init fetches data, buildDOM constructs, render orchestrates all sub-renders"

requirements-completed: [PEXP-01, PEXP-02, PEXP-03, PEXP-04]

# Metrics
duration: 15min
completed: 2026-03-28
---

# Phase 7 Plan 02: Place Explorer JavaScript Summary

**PlaceExplorer class — 814-line vanilla JS module with in-memory search, MapLibre heatmap/circle map, three sidebar facets, filter pills, URL state sync, and "Filter by map area" viewport toggle**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-28T18:45:00Z
- **Completed:** 2026-03-28T19:00:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/js/place-explorer.js` with the complete `PlaceExplorer` class
- Implemented all four PEXP requirements: search (PEXP-01), facets (PEXP-02), heatmap map (PEXP-03), results list (PEXP-04)
- MapLibre init with heatmap layer (`places-heat`), circle layer (`places-circle`), popup click handlers, and zoom-based heatmap-to-circles transition
- URL state synced to all filter parameters via `parseUrlParams`/`updateUrl`/`popstate`
- "Filter by map area" toggle with `moveend` listener that re-filters without updating URL

## Task Commits

1. **Task 1: Implement PlaceExplorer class** — `fe72800` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/js/place-explorer.js` — PlaceExplorer class with all interactive functionality for /explorar/lugares/

## Decisions Made

- `filterByViewport` is applied after `applyFilters` but before `sortResults`. The map's `updateMap()` call receives the pre-viewport-filter result set so the heatmap reflects all matching places regardless of map position — only the results list is constrained to the viewport.
- `moveend` listener re-runs filtering and re-renders the results list and pagination only, without calling `updateUrl()` — avoids flooding browser history with every pan/zoom.
- Facet counts are computed from `allPlaces` (the full unfiltered dataset) per D-19 — they represent total counts in the dataset, not counts relative to current filters.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `src/js/place-explorer.js` is complete and self-contained
- The file is wired to `#place-explorer` container via `DOMContentLoaded` listener
- Plan 03 needs to verify the template (`lugares.njk`) loads this script and that the build pipeline picks it up; it may also need to wire `npm run build:dev` and smoke-test the interactive page

## Self-Check: PASSED

- `src/js/place-explorer.js` — FOUND
- `07-02-SUMMARY.md` — FOUND
- Commit `fe72800` — FOUND

---
*Phase: 07-place-explorer*
*Completed: 2026-03-28*
