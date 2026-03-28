---
phase: 07-place-explorer
plan: 03
subsystem: ui
tags: [maplibre, heatmap, place-explorer, verification]

requires:
  - phase: 07-02
    provides: PlaceExplorer class with search, facets, map, results, pagination
provides:
  - User-verified place explorer with iterative UI improvements
affects: []

tech-stack:
  added: [openfreemap]
  patterns: [search relevance ranking, inline result enrichment, map popup with scroll-to-list]

key-files:
  created: []
  modified:
    - src/explorar/lugares.njk
    - src/js/place-explorer.js

key-decisions:
  - "Switched basemap from dead Protomaps CDN to OpenFreeMap (free, no API key, no CORS)"
  - "Search results ranked by relevance: exact > prefix > contains"
  - "Map popup shows type, doc count, ver en la lista + ver ficha"
  - "Result rows enriched with name variants, authority pills, coords pin"
  - "Heatmap weighted by linked_description_count for future use"

patterns-established:
  - "Relevance ranking: when search query active, exact/prefix matches before substring"
  - "Scroll-to-list pattern: map popup click navigates to correct results page and highlights row"

requirements-completed: [PEXP-01, PEXP-02, PEXP-03, PEXP-04]

duration: 45min
completed: 2026-03-28
---

# Phase 07-03: Verification Summary

**User-verified place explorer with iterative fixes to basemap, search ranking, heatmap, result enrichment, and popup UX**

## Performance

- **Duration:** 45 min
- **Started:** 2026-03-28T18:00:00Z
- **Completed:** 2026-03-28T18:45:00Z
- **Tasks:** 1 (human verification with iterative fixes)
- **Files modified:** 2

## Accomplishments
- Replaced broken Protomaps basemap with working OpenFreeMap
- Search results now rank exact/prefix matches first
- Result rows show name variants, authority pills (WD/WHG/HGIS), coordinates pin, doc count
- Map popup enriched with type label, doc count, "ver en la lista" scroll, "ver ficha" link
- Heatmap improved: smoother 8-stop colour ramp, weighted by doc count, larger radius for density differentiation
- Intro text corrected: "vinculados a las descripciones de Zasqua"

## Task Commits

1. **Task 1: Visual and functional verification** - `ba5aefa` (fix: verification fixes)

## Files Created/Modified
- `src/explorar/lugares.njk` - Removed broken PMTiles import, fixed intro text
- `src/js/place-explorer.js` - Basemap, search ranking, heatmap, results, popup improvements

## Decisions Made
- OpenFreeMap as basemap (Protomaps CDN returns 404, needs API key migration later)
- Name variants shown as subtitle line below place name
- Authority indicators use existing `.authority-pill` CSS class
- Coordinates pin uses Material Symbols `location_on` at burgundy colour
- "Sin documentos asociados" shown when linked_description_count is 0
- Country data deferred to entity resolution pipeline

## Deviations from Plan
- Basemap switch from Protomaps to OpenFreeMap (Protomaps CDN dead)
- Extensive UI improvements beyond original verification scope (user-directed)

## Issues Encountered
- `place-index.json` not generated locally (missing entity_links.json) — generated from places.json with zero counts
- Protomaps CDN URL returns 404 — pre-existing issue affecting lugar.njk too
- Place coordinate data has quality issues (e.g. Tunja mapped to Lima) — upstream data issue

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Place explorer functional end-to-end
- Country data will enrich results once added to entity pipeline
- linked_description_count will activate heatmap weighting once precompute-links runs with full data
- Protomaps basemap migration (API key) needed for visual consistency with lugar.njk

---
*Phase: 07-place-explorer*
*Completed: 2026-03-28*
