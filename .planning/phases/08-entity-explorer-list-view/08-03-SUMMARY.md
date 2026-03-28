---
phase: 08-entity-explorer-list-view
plan: 03
subsystem: ui
tags: [pagefind, maplibre, javascript, place-explorer]

# Dependency graph
requires:
  - phase: 08-entity-explorer-list-view/08-01
    provides: Pagefind metadata blocks on lugar.njk (place_type, has_coordinates, has_authority filters, name sort, linked_count/name_variants meta)
provides:
  - Refactored PlaceExplorer using /pagefind-places/ for search, facets, and results
  - place-index.json retained for MapLibre heatmap/circle map coordinates only
  - Viewport filtering (filterByViewport toggle) preserved, implemented via renderFromCache()
affects:
  - 09-entity-network-graph (place explorer architecture stable)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PlaceExplorer Pagefind pattern: load /pagefind-places/ and /data/place-index.json in parallel via Promise.all; use Pagefind for search/facets/results, place-index.json for map only"
    - "Viewport re-filter pattern: cache last Pagefind search result in this.lastSearch; renderFromCache() re-filters by viewport URLs derived from allPlaces coordinates"
    - "Pagefind filter mapping: state key 'type' maps to Pagefind filter key 'place_type'; boolean states map to string 'true'/'false'"

key-files:
  created: []
  modified:
    - src/js/place-explorer.js

key-decisions:
  - "Viewport filtering uses URL-based matching against allPlaces to identify places in bounds — avoids loading all Pagefind result metadata upfront"
  - "Map always shows full allPlaces coordinate set regardless of Pagefind search state — heatmap represents the whole dataset"
  - "linked sort handled post-load on current page only — Pagefind does not support sorting by custom count field; cross-page sort order is approximate"
  - "entity-index.json generation kept in precompute-links.js — entities.js reads it for _linked_count at build time"
  - "lugares.njk template unchanged — data-place-types attribute already present and compatible with refactored PlaceExplorer"

patterns-established:
  - "Separate data sources for search vs. map: Pagefind handles text/facets/pagination; JSON file handles coordinates for MapLibre"
  - "renderFromCache() for viewport-only re-renders — avoids redundant Pagefind API calls on map moveend"

requirements-completed: [EEXP-01, EEXP-02, EEXP-03]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 08 Plan 03: Place Explorer Pagefind Migration Summary

**PlaceExplorer refactored from 2 MB JSON in-memory filtering to /pagefind-places/ index, with place-index.json retained solely for MapLibre heatmap coordinates**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-28T23:03:30Z
- **Completed:** 2026-03-28T23:11:16Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- PlaceExplorer now loads Pagefind (`/pagefind-places/`) and `place-index.json` in parallel — Pagefind for search/facets/results, JSON for map coordinates only
- Removed `applyFilters()`, `sortResults()`, and all in-memory filtering/sorting logic (~120 lines removed)
- `renderFacets()` now uses Pagefind scoped filter counts (`search.filters`) instead of manual array counting over `allPlaces`
- `renderResults()` now renders from Pagefind hit objects (`hit.url`, `hit.meta.*`) instead of JSON array items
- Viewport filtering preserved: `renderFromCache()` re-filters cached Pagefind results by matching place URLs against map bounds, triggered by `moveend` without URL update (per Phase 7 decision)
- Map heatmap/circle layers unchanged — still fed from `allPlaces` (place-index.json) coordinates
- `perPage` changed from 50 to 20 to align with entity explorer and description search
- Task 2 verified: `lugares.njk` template unchanged (already compatible), `entity-index.json` generation kept in `precompute-links.js` because `entities.js` reads it for `_linked_count`

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor PlaceExplorer to use Pagefind for search, facets, and results** - `5dca90d` (feat)
2. **Task 2: Verify lugares.njk and entity-index.json dependency** - no code changes required

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/js/place-explorer.js` - Refactored to use Pagefind; map still reads place-index.json

## Decisions Made

- Viewport filtering matches Pagefind result URLs against place display_name-derived URLs from `allPlaces` — consistent with how place pages are generated (URL is `/lugar/{display_name}/`)
- Map heatmap always shows the full coordinate dataset regardless of active search state — this preserves the geographic overview even when search is narrowed
- `linked` sort applied only to the current loaded page — Pagefind doesn't support sorting by a custom count field; noted as approximate for cross-page ordering
- `entity-index.json` generation kept in `precompute-links.js` because `src/_data/entities.js` reads it at build time for `_linked_count` on entity detail pages

## Deviations from Plan

None — plan executed exactly as written. Task 2 required no code changes (template and precompute script already in correct state).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Place explorer now uses the same Pagefind-powered architecture as the entity explorer
- Three independent Pagefind indices are all in use: descriptions (`/pagefind/`), entities (`/pagefind-entities/`), places (`/pagefind-places/`)
- Phase 08 Wave 2 complete — entity and place explorers both Pagefind-powered
- No blockers for Phase 09

---
*Phase: 08-entity-explorer-list-view*
*Completed: 2026-03-28*
