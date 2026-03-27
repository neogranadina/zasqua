---
phase: 06-entity-place-detail-pages
plan: 04
subsystem: ui
tags: [eleventy, nunjucks, maplibre, pmtiles, javascript, spanish]

# Dependency graph
requires:
  - phase: 06-entity-place-detail-pages/06-01
    provides: places data loader with _linked_count enrichment and place_code identifier
  - phase: 06-entity-place-detail-pages/06-02
    provides: ui.place.* UI strings, CSS classes (.place-map, .authority-pill, .variant-tag, .entity-timeline, .desc-notice)

provides:
  - src/lugar.njk — Eleventy pagination template generating /lugar/{display_name}/ pages for all places
  - src/js/place.js — Client-side MapLibre map init and place-links shard fetch + timeline render

affects:
  - 06-03 (entity detail pages — same architectural pattern, place.js mirrors entity.js structure)
  - build pipeline (lugar.njk generates ~8,177 place pages; place.js passthrough needed in eleventy.config.js)
  - Phase 7 place explorer (detail pages are the target for place explorer links)

# Tech tracking
tech-stack:
  added:
    - MapLibre GL JS v5 (CDN, loaded only on pages with coordinates)
    - PMTiles protocol handler via pmtiles@4 (inline module script in lugar.njk head)
  patterns:
    - "MapLibre map loaded via CDN in {% block head %} conditional on coordinates — avoids loading 700KB JS for coordinate-less pages"
    - "pmtiles addProtocol registered in inline <script type='module'> in template head; place.js assumes protocol already registered (Pitfall 3 avoidance)"
    - "place.js structure mirrors entity.js: DOMContentLoaded -> initMap() + fetchTimeline(); plain functions, no classes"
    - "Nunjucks conditional {% if place.latitude and place.longitude %} controls both CDN loading and map/notice branching"

key-files:
  created:
    - src/lugar.njk
    - src/js/place.js
  modified: []

key-decisions:
  - "Used place.place_code (not place.id) for shard path and search URL — matches precompute-links.js output and Pagefind filter values"
  - "MapLibre CDN conditional on coordinates — saves ~700KB JS download for ~30% of places without coordinates"
  - "pmtiles protocol registered once in template head module script; place.js does not call addProtocol"
  - "Protomaps default light basemap for detail page embed — provides geographic context without custom tile source"
  - "Place timelines do not show role labels (entity-specific per D-13)"

patterns-established:
  - "Pattern: lugar.njk uses same two-column desc-layout/desc-metadata/desc-aside structure as description.njk and entidad.njk"
  - "Pattern: authority ID conditionals use empty-string falsy check ({% if place.wikidata_id %}) — Nunjucks treats '' as falsy"
  - "Pattern: CTA link uses place.place_code to match Pagefind filter values emitted by description.njk"

requirements-completed: [PLACE-01, PLACE-02, PLACE-03, PLACE-04, PLACE-05]

# Metrics
duration: 7min
completed: 2026-03-27
---

# Phase 06 Plan 04: Place Detail Pages Summary

**Nunjucks place detail template with conditional MapLibre map embed, authority link pills, name variant tags, and client-side shard fetch for chronological timeline — paused at visual verification checkpoint**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-27T14:33:22Z
- **Completed:** 2026-03-27T14:40:18Z
- **Tasks:** 2 of 3 (paused at checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments
- `src/lugar.njk` generates `/lugar/{display_name}/` pages for all 8,177 places via Eleventy pagination
- Conditional MapLibre CDN: JS/CSS only loaded on pages with coordinates (~70% of places), saving ~700KB for coordinate-less pages
- `src/js/place.js` initialises MapLibre map with burgundy pin, fetches place-links shard, renders chronological timeline
- Authority links section renders Wikidata and WHG as external-link pills; HGIS as plain text — all conditional on field presence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create place detail page template (lugar.njk)** - `f28cc38` (feat)
2. **Task 2: Create place.js client-side script** - `d23a816` (feat)
3. **Task 3: Visual verification** — awaiting checkpoint

## Files Created/Modified
- `src/lugar.njk` — Eleventy pagination template for place detail pages at /lugar/{display_name}/
- `src/js/place.js` — MapLibre map init + place-links shard fetch and timeline rendering

## Decisions Made
- Used `place.place_code` (not `place.id`) as the identifier in shard fetch path and search link — confirmed by places.js data loader which uses `place.place_code` for the index lookup
- MapLibre + PMTiles CDN loaded only when `place.latitude and place.longitude` — saves bandwidth for coordinate-less pages
- Protomaps default light basemap (`cdn.protomaps.com/basemaps/v4/en.json`) for the detail page embed — geographic context at zoom 7
- `pmtiles` protocol registered in inline `<script type="module">` in `{% block head %}`; `place.js` does not call `addProtocol`

## Deviations from Plan

**1. [Rule 3 - Blocking] Merged main branch into worktree before execution**
- **Found during:** Setup (before Task 1)
- **Issue:** Worktree branch was at phase 05 HEAD, missing all phase 06 foundation work: entities.js, places.js, ui.js entity/place sections, input.css entity/place classes, entidad.njk, description.njk Pagefind filters
- **Fix:** `git merge main --no-edit` — fast-forward merge added 27 files with 3,822 insertions
- **Files modified:** All phase 06 foundation files
- **Verification:** `src/entidad.njk`, `src/_data/places.js`, `src/_data/ui.js` all present and correct post-merge

---

**Total deviations:** 1 auto-fixed (blocking — missing foundation context)
**Impact on plan:** Required before any task work could begin. No scope creep.

## Issues Encountered
- entity.js (plan 03) not yet on main branch — place.js implemented independently using plan documentation and RESEARCH.md patterns (Pattern 7, Pattern 8, Pitfall 3)

## Known Stubs
None — all data flows from real places.json source via places.js data loader.

## Next Phase Readiness
- `src/lugar.njk` and `src/js/place.js` ready for visual verification build
- Awaiting checkpoint:human-verify (Task 3) before plan is marked complete
- After approval: plan 04 complete; phase 06 proceeds to plan 05 (place explorer) or wave 2 verification

## Self-Check: PASSED

- `src/lugar.njk` — FOUND
- `src/js/place.js` — FOUND
- `.planning/phases/06-entity-place-detail-pages/06-04-SUMMARY.md` — FOUND
- Commit `f28cc38` — FOUND
- Commit `d23a816` — FOUND

---
*Phase: 06-entity-place-detail-pages*
*Completed: 2026-03-27*
