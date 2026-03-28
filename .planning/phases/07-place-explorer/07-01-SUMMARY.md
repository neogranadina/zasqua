---
phase: 07-place-explorer
plan: 01
subsystem: ui
tags: [eleventy, nunjucks, maplibre, tailwind, place-explorer]

# Dependency graph
requires:
  - phase: 06-entity-place-detail-pages
    provides: places.js data loader with _linked_count, ui.js place section, precompute-links.js with place shards
provides:
  - Fixed place identifier (id) in place-index.json output from precompute-links.js
  - Fixed place-index.json lookup key in places.js data loader
  - Place type labels for river and other in ui.js
  - Place explorer template shell at /explorar/lugares/
  - CSS classes .explorer-map and .map-area-toggle for plan 02 JS
affects: [07-02-plan, 07-03-plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "data-place-types JSON attribute on container div — same pattern as buscar.njk data-level-labels for passing server-side labels to client JS"
    - "MapLibre CDN loaded unconditionally in block head — explorer always shows map unlike lugar.njk which conditionally loads based on coordinates"

key-files:
  created:
    - src/explorar/lugares.njk
  modified:
    - scripts/precompute-links.js
    - src/_data/places.js
    - src/_data/ui.js
    - src/css/main.css

key-decisions:
  - "place-index.json uses id field (not place_code) — places.json has no place_code field; id is the correct identifier"
  - "MapLibre CDN loaded unconditionally on explorer page — explorer always renders a map, unlike lugar.njk where it's conditional"

patterns-established:
  - "data-place-types='{{ ui.place.types | dump | safe }}' — JSON data attribute for server-side labels in client JS"

requirements-completed: [PEXP-01, PEXP-02, PEXP-04]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 7 Plan 01: Place Explorer Foundation Summary

**place-index.json now uses place id (not place_code), places.js lookup key corrected, river/other type labels added, and /explorar/lugares/ template shell created with MapLibre CDN and CSS classes**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-28T18:40:00Z
- **Completed:** 2026-03-28T18:48:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Fixed place_code/id mismatch in precompute-links.js — place-index.json will now emit `id` instead of `place_code`
- Fixed matching mismatch in places.js — `countByCode` now keyed by `entry.id` to match place-index.json output
- Added `river: "Cuerpo de agua"` and `other: "Accidente geográfico"` to `ui.place.types` (D-18)
- Created `src/explorar/lugares.njk` — template shell at `/explorar/lugares/` with breadcrumb, h1, intro, and empty `#place-explorer` container
- Added `.explorer-map` (50vh height) and `.map-area-toggle` (inactive/active states) CSS classes to main.css

## Task Commits

1. **Task 1: Fix place_code/id mismatch and add ui.js labels** — `514ae71` (fix)
2. **Task 2: Create explorer template and CSS classes** — `a1613a0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `scripts/precompute-links.js` — Fixed `place_code: p.place_code` → `id: p.id` and `byPlace.get(p.place_code)` → `byPlace.get(p.id)`
- `src/_data/places.js` — Fixed `countByCode.set(entry.place_code, ...)` → `countByCode.set(entry.id, ...)`
- `src/_data/ui.js` — Added `river: "Cuerpo de agua"` and `other: "Accidente geográfico"` to `place.types`
- `src/explorar/lugares.njk` — Place explorer template shell at `/explorar/lugares/`
- `src/css/main.css` — Added `.explorer-map` and `.map-area-toggle` / `.map-area-toggle.active` CSS classes

## Decisions Made

- MapLibre CDN loaded unconditionally on explorer page (unlike lugar.njk where it is conditional on coordinates) — the explorer always shows a map per D-01
- `data-place-types` JSON attribute follows the `data-level-labels` pattern from buscar.njk — same approach for passing build-time label maps to client JS

## Deviations from Plan

### Context acquisition: merged main into worktree

The worktree was initialised at Phase 5 HEAD (d63065c) and was 36 commits behind main (ec56a43). Phase 6 changes (places.js enrichment, ui.js place section) were required as a baseline. Merged main into the worktree branch before applying the plan's fixes. This is not a deviation from plan intent — it brought the worktree to the expected baseline state.

### Auto-fixed Issues

None — plan executed as specified once baseline was established.

---

**Total deviations:** 0 (baseline merge not a plan deviation)
**Impact on plan:** None — all fixes match plan intent exactly.

## Issues Encountered

- Worktree was at Phase 5 state — needed to merge main first to get Phase 6 baseline changes (places.js with `countByCode`, ui.js with `place` section). Build confirmed as working after merge and fixes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Template shell at /explorar/lugares/ is ready for Plan 02 JS wiring
- CSS classes `.explorer-map` and `.map-area-toggle` are available for Plan 02 to use
- `data-place-types` attribute on `#place-explorer` passes place type labels to client JS
- place-index.json will emit `id` field once precompute-links.js runs — Plan 02 JS should read `place.id`

---
*Phase: 07-place-explorer*
*Completed: 2026-03-28*
