---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: Phase complete — ready for verification
stopped_at: Completed 08-entity-explorer-list-view-02-PLAN.md
last_updated: "2026-03-28T23:12:14.568Z"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 14
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 08 — entity-explorer-list-view

## Current Position

Phase: 08 (entity-explorer-list-view) — EXECUTING
Plan: 3 of 3

## Performance Metrics

**Velocity (from v0.4.0):**

| Phase 01 P01 | 172s | 2 tasks | 6 files |
| Phase 01 P02 | 1020s (~17 min) | 2 tasks | 9 files |
| Phase 01 P03 | 600 | 2 tasks | 4 files |
| Phase 02 P01 | 900 | 2 tasks | 1 files |
| Phase 02 P02 | 900 | 2 tasks | 1 files |
| Phase 02 P03 | 1800 | 2 tasks | 1 files |
| Phase 03-ahrb-import P01 | 300 | 2 tasks | 1 files |
| Phase 03-ahrb-import P02 | 2700 | 3 tasks | 15 files |

**v0.5.0 Velocity:**

- Total plans completed: 0
- Average duration: —

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Carried from v0.4.0:

- Visual identity: Figma Make file (bOunUsW8BHk1eqZrJu7Nxt) is the spec source
- Tailwind v4 standalone CLI — no npm dependency
- Porting done in thematic commits — version bump last

v0.5.0 decisions (pending confirmation in Phase 4 planning):

- Separate Eleventy build for entity/place pages is mandatory — existing build already uses ~6 GB heap; adding 100K pages to same process will OOM on GitHub Actions
- PMTiles requires a dedicated Cloudflare Worker — Range request pass-through and CORS must be set at Worker level; do not modify site Worker
- Entity co-occurrence graph deferred to Phase 9 (post list-view validation) — threshold parameters require real data inspection
- Pagefind strategy for entity/place pages unresolved: separate JSON filtering vs. metadata attributes — resolve in Phase 4 planning
- [Phase 04]: precompute-links.js renames latitude/longitude to lat/lon when writing place-index.json (D-07)
- [Phase 04]: COOCCURRENCE_MIN_WEIGHT defaults to 3; configurable for Phase 9 threshold tuning
- [Phase 04]: Pre-compute steps placed before npm install in CI — scripts use only Node.js stdlib
- [Phase 04]: Single Eleventy build retained — profile first, split only if build exceeds ~25 min
- [Phase 05-pmtiles-infrastructure]: Inlined protomaps/PMTiles shared helpers (pmtiles_path, tile_path) into worker-tiles/src/index.ts — monorepo-relative import path cannot resolve from standalone directory
- [Phase 05-pmtiles-infrastructure]: Tippecanoe pinned to 2.72.0 in CI for reproducible builds; boto3 single PUT used for R2 upload to zasqua-tiles
- [Phase 07-place-explorer]: filterByViewport applied after applyFilters — map receives pre-viewport result set, list constrained to viewport
- [Phase 07-place-explorer]: moveend listener updates results list only, not URL — avoids polluting browser history on every pan/zoom
- [Phase 07-place-explorer]: Facet counts from allPlaces (not filtered) per D-19 — show total dataset counts
- [Phase 08-entity-explorer-list-view]: entity-index.json passthrough removed — entity pages now indexed via Pagefind (D-15)
- [Phase 08]: exclude-selectors used on description Pagefind run instead of glob negation for portability
- [Phase 08-entity-explorer-list-view]: EntityExplorer modelled after SearchPage (Pagefind-based) — entity dataset requires index-based search
- [Phase 08-entity-explorer-list-view]: Browse prompt shown pre-search — Explorar todas triggers full entity search on demand
- [Phase 08-entity-explorer-list-view]: URL params in Spanish: tipo, funcion, fecha_nivel, fecha_valor, orden, pagina
- [Phase 08-entity-explorer-list-view]: entity-index.json generation kept in precompute-links.js — entities.js reads it for _linked_count at build time
- [Phase 08-entity-explorer-list-view]: PlaceExplorer viewport filtering uses URL-based matching against allPlaces coordinates — avoids loading all Pagefind result metadata upfront

### Pending Todos

- FIX-01 (ui.js nav keys) already pushed to public repo — mark complete

### Blockers/Concerns

- **Phase 4**: Entity/place links export format needs confirmation against actual backend export before writing `precompute-links.js`
- **Phase 4**: Pagefind strategy for entity/place pages unresolved — affects entity explorer search UX
- **Phase 5**: Protomaps Worker + custom domain CORS chain has known gap; allow extra debug time; test Firefox and Safari
- **Phase 9**: Co-occurrence threshold parameters cannot be set until script runs against real data

## Session Continuity

Last session: 2026-03-28T23:12:06.707Z
Stopped at: Completed 08-entity-explorer-list-view-02-PLAN.md
Resume file: None
