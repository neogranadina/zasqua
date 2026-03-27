---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: Ready to execute
stopped_at: "Completed 06-04-PLAN.md Tasks 1 and 2; awaiting checkpoint:human-verify at Task 3"
last_updated: "2026-03-27T14:41:01.711Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 8
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 06 — entity-place-detail-pages

## Current Position

Phase: 06 (entity-place-detail-pages) — EXECUTING
Plan: 3 of 4

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
- [Phase 06-entity-place-detail-pages]: Reverse lookups written as plain JSON objects (reference_code -> array of codes) for O(1) lookup in data loaders
- [Phase 06]: ui.js entity/place sections follow existing roles/description pattern; CSS classes use @apply for stone-scale tokens and var(--color-*) for brand colors
- [Phase 06-entity-place-detail-pages]: entidad/lugar search filters are URL-only (not rendered as sidebar facets) — applied when arriving from detail page links
- [Phase 06]: Used place.place_code (not place.id) for shard fetch path and search URL — matches precompute-links.js output and Pagefind filter values
- [Phase 06]: MapLibre CDN conditional on coordinates in lugar.njk — saves ~700KB JS for coordinate-less place pages; pmtiles protocol registered in template head module script only

### Pending Todos

- FIX-01 (ui.js nav keys) already pushed to public repo — mark complete

### Blockers/Concerns

- **Phase 4**: Entity/place links export format needs confirmation against actual backend export before writing `precompute-links.js`
- **Phase 4**: Pagefind strategy for entity/place pages unresolved — affects entity explorer search UX
- **Phase 5**: Protomaps Worker + custom domain CORS chain has known gap; allow extra debug time; test Firefox and Safari
- **Phase 9**: Co-occurrence threshold parameters cannot be set until script runs against real data

## Session Continuity

Last session: 2026-03-27T14:40:54.555Z
Stopped at: Completed 06-04-PLAN.md Tasks 1 and 2; awaiting checkpoint:human-verify at Task 3
Resume file: None
