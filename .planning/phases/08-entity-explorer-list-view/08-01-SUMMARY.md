---
phase: 08-entity-explorer-list-view
plan: 01
subsystem: ui
tags: [pagefind, eleventy, nunjucks, github-actions]

# Dependency graph
requires:
  - phase: 04-build-pipeline-data-pre-compute
    provides: entity and place template files (entidad.njk, lugar.njk) with data-pagefind-ignore on all visible elements
provides:
  - Pagefind metadata blocks on entity and place detail page templates
  - yearRange custom Eleventy filter for date range expansion
  - Three-index CI pipeline: descriptions, entities, places — separate, non-contaminating
affects:
  - 08-02-entity-explorer-list-view
  - 08-03-place-explorer-list-view

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pagefind separate index pattern: three npx pagefind runs with --output-subdir, --glob, and --exclude-selectors in one CI step"
    - "Pagefind marker attributes (data-pagefind-entity-page, data-pagefind-place-page) used to exclude pages from the description index without relying on glob negation"
    - "yearRange filter: generates integer array for per-year Pagefind filter spans, capped at 500 years"

key-files:
  created: []
  modified:
    - eleventy.config.js
    - src/entidad.njk
    - src/lugar.njk
    - .github/workflows/deploy.yml

key-decisions:
  - "--exclude-selectors used on description Pagefind run instead of glob negation for portability (Research Open Question 1 resolved)"
  - "entity-index.json passthrough removed from eleventy.config.js — entity pages are now indexed via Pagefind (D-15)"

patterns-established:
  - "Hidden metadata div (display:none) before breadcrumb nav carries all Pagefind filter/sort/meta spans"
  - "Hidden data-pagefind-body div (display:none) carries only the entity/place display name and name variants for full-text search"
  - "All visible page elements retain data-pagefind-ignore — only the hidden metadata divs are Pagefind-visible"

requirements-completed: [EEXP-01, EEXP-02, EEXP-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 08 Plan 01: Entity & Place Pagefind Metadata Summary

**Pagefind filter/sort/meta blocks added to entity and place templates, yearRange filter added, CI split into three separate non-contaminating Pagefind index runs**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T23:03:22Z
- **Completed:** 2026-03-28T23:04:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Entity detail pages now carry Pagefind filter attributes (entity_type, primary_function, year), sort attributes (name, date, count), and meta attributes (entity_type, date_earliest, date_latest, primary_function, linked_count, name_variants)
- Place detail pages now carry Pagefind filter attributes (place_type, has_coordinates, has_authority), sort attribute (name), and meta attributes (place_type, has_coordinates, linked_count, name_variants)
- yearRange Eleventy filter generates one integer per year in a range (capped at 500) — enables Pagefind to index per-year filter spans for date faceting on entity pages
- CI builds three independent Pagefind indices: descriptions (entity/place pages excluded via `--exclude-selectors`), entities (`--glob entidad/**/*.html`), places (`--glob lugar/**/*.html`)
- entity-index.json passthrough copy removed from eleventy.config.js — entity pages are now the source of truth via Pagefind

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Pagefind metadata to entity and place templates, add yearRange filter** - `1978d03` (feat)
2. **Task 2: Update CI pipeline for three separate Pagefind index builds** - `818d7ed` (feat)

## Files Created/Modified

- `eleventy.config.js` - Added yearRange filter; removed entity-index.json passthrough copy
- `src/entidad.njk` - Added hidden Pagefind metadata div, hidden pagefind-body div, data-pagefind-entity-page marker on breadcrumb nav
- `src/lugar.njk` - Added hidden Pagefind metadata div, hidden pagefind-body div, data-pagefind-place-page marker on breadcrumb nav
- `.github/workflows/deploy.yml` - Replaced single Pagefind run with three runs using --output-subdir, --exclude-selectors, and --glob

## Decisions Made

- Used `--exclude-selectors "[data-pagefind-entity-page],[data-pagefind-place-page]"` on the description run rather than glob negation — more portable across shell environments (Research Open Question 1 resolved this way)
- Marker attributes on the `<nav>` breadcrumb element rather than a dedicated hidden element — keeps HTML semantics clear and gives Pagefind a reliable selector to match

## Deviations from Plan

None — plan executed exactly as written. One minor adjustment: the code comment for the removed entity-index.json passthrough initially included the filename string, which caused the automated verify check to fail; updated the comment wording to avoid the match.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Entity and place templates now carry all Pagefind metadata required by Plan 02 (entity explorer) and Plan 03 (place explorer)
- Three-index CI pipeline is in place; Plans 02 and 03 can load from `/pagefind-entities/` and `/pagefind-places/` respectively
- No blockers for Plan 02

---
*Phase: 08-entity-explorer-list-view*
*Completed: 2026-03-28*
