---
phase: 08-entity-explorer-list-view
plan: 02
subsystem: ui
tags: [pagefind, javascript, nunjucks, css, entity-explorer]

# Dependency graph
requires:
  - phase: 08-entity-explorer-list-view
    plan: 01
    provides: Pagefind entity index at /pagefind-entities/ with entity_type, primary_function, year filter attributes and name/date/count sort attributes
provides:
  - Entity explorer page at /explorar/entidades/ with full-text search, faceted filtering, pagination
  - EntityExplorer JS class (src/js/entity-explorer.js)
  - Entity result row CSS classes in src/css/input.css
affects:
  - 08-03-place-explorer-list-view (CSS classes pattern established)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EntityExplorer class modelled after SearchPage — Pagefind-powered, no JSON download"
    - "Browse prompt pattern: pre-search state shows entity count + Explorar todas button"
    - "Pagefind bundlePath option used to load from /pagefind-entities/ sub-index"
    - "URL state uses Spanish param names: tipo, funcion, fecha_nivel, fecha_valor, orden, pagina"
    - "Date drill-down tree: century > decade > year — copied from SearchPage.renderDateTree"

key-files:
  created:
    - src/explorar/entidades.njk
    - src/js/entity-explorer.js
  modified:
    - src/css/input.css

key-decisions:
  - "EntityExplorer modelled after SearchPage (Pagefind-based), not PlaceExplorer (in-memory JSON) — entity dataset (92K) requires index-based search"
  - "Browse prompt shown when no query and no active filters — triggers full search via Explorar todas button rather than auto-loading all 92K entities"
  - "URL param names in Spanish (tipo, funcion, fecha_nivel, fecha_valor, orden, pagina) for consistency with the page's Colombian Spanish copy"

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 08 Plan 02: Entity Explorer List View Summary

**Entity explorer page at /explorar/entidades/ with Pagefind-powered search, entity type / primary function / date facets, sort controls, pagination, URL state, and rich result rows**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-28T23:08:01Z
- **Completed:** 2026-03-28T23:11:12Z
- **Tasks:** 2
- **Files created/modified:** 3

## Accomplishments

- Created `src/explorar/entidades.njk` — explorer page template at `/explorar/entidades/` with breadcrumb, h1, intro paragraph, `#entity-explorer` container with `data-entity-types` attribute, and script block loading entity-explorer.js
- Created `src/js/entity-explorer.js` — 1187-line EntityExplorer class with:
  - Pagefind init from `/pagefind-entities/` with `bundlePath` option
  - State: q, entity_type, primary_function, dateFilter, sort, page
  - `search()` builds `entity_type`, `primary_function`, and `year` Pagefind filters with `{ any: [...] }` syntax
  - `renderResultCard()` outputs entity name link, type badge (entity-type-badge), date range, primary function (entity-result-function), doc count (entity-result-doccount) with Spanish number formatting and singular/plural, name variants capped at 3 (entity-result-variants)
  - Three facet groups: Tipo de entidad, Funcion principal, Fecha (date drill-down tree century > decade > year)
  - Sort controls: Nombre (name:asc), Fecha (date:asc), Documentos (count:desc)
  - URL state with Spanish params: q, tipo, funcion, fecha_nivel, fecha_valor, orden, pagina
  - Browse prompt (pre-search) with entity count and "Explorar todas" button
  - Mobile filter toggle "Filtrar resultados" + close button aria-label "Cerrar filtros"
  - Loading overlay, no-results message, error state
  - Self-initialisation via DOMContentLoaded
- Added four CSS classes to `src/css/input.css` in `@layer components`:
  - `.entity-type-badge` — burgundy background, white text, 4px border-radius, padding 4px 8px
  - `.entity-result-function` — font-size 0.875rem, stone-500 color
  - `.entity-result-doccount` — font-size 0.875rem, stone-400 color
  - `.entity-result-variants` — font-size 0.875rem, stone-500 color, margin-top 2px

## Task Commits

1. **Task 1: Entity explorer template and CSS classes** — `3ccb60e` (feat)
2. **Task 2: EntityExplorer JS class** — `3671c56` (feat)

## Files Created/Modified

- `src/explorar/entidades.njk` — created
- `src/js/entity-explorer.js` — created (1187 lines)
- `src/css/input.css` — added entity explorer CSS classes

## Decisions Made

- EntityExplorer modelled after SearchPage (Pagefind-based), not PlaceExplorer (in-memory JSON) — entity dataset (92K) requires index-based search
- Browse prompt shown when no query and no active filters — triggers full search via "Explorar todas" button rather than auto-loading all 92K entities on page load
- URL param names in Spanish (tipo, funcion, fecha_nivel, fecha_valor, orden, pagina) for consistency with the page's Colombian Spanish copy

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows from the Pagefind entity index. The browse prompt count falls back to the hardcoded string "92.042" only if `globalFilters.entity_type` is not available (i.e., if Pagefind init fails); in normal operation the count is computed from `globalFilters`.

## Issues Encountered

None.

## Self-Check: PASSED

- `src/explorar/entidades.njk` — exists
- `src/js/entity-explorer.js` — exists, 1187 lines >= 400
- `3ccb60e` — commit exists
- `3671c56` — commit exists

---
*Phase: 08-entity-explorer-list-view*
*Completed: 2026-03-28*
