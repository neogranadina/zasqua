---
phase: 06-entity-place-detail-pages
plan: 03
subsystem: ui
tags: [eleventy, nunjucks, javascript, isaar-cpf, entity, timeline]

# Dependency graph
requires:
  - phase: 06-entity-place-detail-pages
    plan: 01
    provides: _linked_count on entity records, entity-links/{code}.json shards
  - phase: 06-entity-place-detail-pages
    plan: 02
    provides: ui.entity.* strings, .entity-timeline/.variant-tag/.timeline-* CSS classes

provides:
  - Entity detail page template at /entidad/{entity_code}/ (src/entidad.njk)
  - Client-side timeline script fetching entity-links shards (src/js/entity.js)

affects:
  - 06-04 (place template — parallel wave, same architectural pattern)
  - v0.5.0 milestone (entity pages now live at build time)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eleventy pagination over entities array with alias: ent — one page per entity_code"
    - "Client-side shard fetch on DOMContentLoaded: fetch /data/entity-links/{code}.json, render timeline, update CTA count"
    - "data-pagefind-ignore on all entity page content — entity/place pages excluded from Pagefind index (Phase 4 decision D-01)"
    - "escapeHtml helper for XSS prevention on user-controlled shard data rendered into innerHTML"

key-files:
  created:
    - src/entidad.njk
    - src/js/entity.js
  modified: []

key-decisions:
  - "Role labels hardcoded in entity.js (creator/contributor/publisher/subject/mentioned) — ui.js is build-time only, not available client-side"
  - "Breadcrumb 'Entidades' item is plain text (no link) — entity explorer page (/explorar/entidades/) ships in Phase 8; convert to <a> then"
  - "CTA link count updated from shard length after fetch, not from build-time _linked_count — shard is the authoritative source at runtime"

patterns-established:
  - "Entity/place JS scripts use var (not const/let) for consistency with existing description.js style"

requirements-completed: [ENT-01, ENT-02, ENT-03, ENT-04, ENT-05]

# Metrics
duration: 10min
completed: 2026-03-27
---

# Phase 6 Plan 03: Entity Detail Page Summary

**Nunjucks template and vanilla JS timeline script delivering ISAAR CPF entity authority pages at /entidad/{entity_code}/ with conditional metadata fields, name variant tags, and a client-side chronological timeline from JSON shards**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-27T14:23:48Z
- **Completed:** 2026-03-27T14:33:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- entidad.njk paginates over the entities dataset — every entity in the archive gets a public detail page at /entidad/{entity_code}/
- All ISAAR CPF identification fields rendered conditionally: name, normalized name (surname/given_name), type badge, dates of existence, primary function, name variants as pill tags
- History section shown when present; linked descriptions section always shown with a search link scoped to the entity code
- entity.js fetches the entity-links shard on DOMContentLoaded, sorts dated entries lexicographically, groups undated entries under a "Sin fecha" header, renders role labels (Productor, Colaborador, etc.), and updates the CTA count to match the actual shard
- XSS prevention via escapeHtml on all shard data rendered into innerHTML

## Task Commits

1. **Task 1: Create entity detail page template (entidad.njk)** - `a04d57b` (feat)
2. **Task 2: Create entity.js client-side timeline script** - `2db7dea` (feat)

## Files Created/Modified

- `src/entidad.njk` — Eleventy pagination template for entity authority pages; breadcrumb, identification section, history, linked descriptions, right-column timeline container
- `src/js/entity.js` — Client-side script: fetch shard, separate/sort dated vs undated, render timeline entries with role labels, handle errors and empty shards

## Decisions Made

- Role labels hardcoded in JS as Spanish strings — `ui.js` is a Node.js module loaded at build time by Eleventy; it is not shipped to the browser, so client-side scripts must duplicate the strings
- "Entidades" breadcrumb item is plain text, not a link — the entity explorer page does not exist yet (Phase 8). When Phase 8 ships, change to `<a href="/explorar/entidades/">`
- Used `var` throughout entity.js to match the style of existing description.js (consistency over modernism)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 04 (place detail pages) can follow the identical architectural pattern: pagination over places, client-side shard fetch for place-links, data-pagefind-ignore throughout
- Entity pages will be generated at next full build once entities.json is present in the data directory
- The timeline CSS (.entity-timeline max-height, scroll) was already added in Plan 02 — no CSS changes needed

---
*Phase: 06-entity-place-detail-pages*
*Completed: 2026-03-27*
