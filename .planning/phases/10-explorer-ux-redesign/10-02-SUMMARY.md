---
phase: 10-explorer-ux-redesign
plan: 02
subsystem: frontend
tags: [precompute, graph, maps, templates, ci]
dependency_graph:
  requires: []
  provides: [curated-entity-graph.json, fixed-place-map, dynamic-explorer-counts]
  affects: [entity-explorer, place-detail, explorer-templates, ci-pipeline]
tech_stack:
  added: []
  patterns: [graphology + forceAtlas2 layout, degree-selection from entity_links, fx/fy pinned positions]
key_files:
  created:
    - scripts/precompute-curated-graph.js
  modified:
    - src/js/place.js
    - src/explorar/entidades.njk
    - src/explorar/lugares.njk
    - src/js/entity-explorer.js
    - eleventy.config.js
    - .github/workflows/deploy.yml
decisions:
  - "curated-entity-graph.json uses 'links' (not 'edges') as the array key — force-graph expects { nodes, links }"
  - "Nodes with no edges after min_weight filtering are excluded from output (all 100 top entities had edges)"
  - "Entity-explorer.js fallback changed to empty string — intro paragraph in template now carries the accurate count"
metrics:
  duration: 115s
  completed_date: "2026-04-05"
  tasks_completed: 3
  files_changed: 6
---

# Phase 10 Plan 02: Pipeline Updates and Data Fixes Summary

**One-liner:** Curated top-100 entity graph with ForceAtlas2-pinned positions, OpenFreeMap map fix for place detail pages, and dynamic build-time counts replacing hardcoded figures in explorer templates.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create curated graph precompute script | af2c732 | scripts/precompute-curated-graph.js |
| 2 | Fix Protomaps CDN map and make explorer counts dynamic | b7bd83d | src/js/place.js, src/explorar/entidades.njk, src/explorar/lugares.njk, src/js/entity-explorer.js |
| 3 | Wire curated graph into build pipeline and passthrough | 10dc5f1 | eleventy.config.js, .github/workflows/deploy.yml |

## What Was Built

### Task 1 — precompute-curated-graph.js

New build-time script that selects the top 100 entities by co-occurrence degree from `entity_links.json`, computes co-occurrence edges between them, filters by minimum weight (default: 2), runs ForceAtlas2 layout (500 iterations, barnesHutOptimize), and writes `data/curated-entity-graph.json`. Node positions are stored as both `x`/`y` and `fx`/`fy` so force-graph treats them as pinned on load.

Output on real data: 100 nodes, 1,428 edges, ~91 KB.

### Task 2 — Bug fixes

- **place.js map style:** Replaced stale `https://cdn.protomaps.com/basemaps/v4/en.json` with `https://tiles.openfreemap.org/styles/liberty` — matching the URL that already works in place-explorer.js.
- **entidades.njk:** Replaced hardcoded `92.042` with `{{ entities | length | numberFormat }}` — count is now accurate at build time.
- **lugares.njk:** Replaced hardcoded `8.177` with `{{ places | length | numberFormat }}` — count is now accurate at build time.
- **entity-explorer.js:** Removed hardcoded `'92.042'` fallback (now empty string with conditional render) — the template intro paragraph carries the accurate count so the JS fallback is never needed.

### Task 3 — Pipeline wiring

- `eleventy.config.js`: Added passthrough copy for `data/curated-entity-graph.json` → `data/curated-entity-graph.json` (same pattern as entity-doc-graph.json).
- `.github/workflows/deploy.yml`: Added "Pre-compute curated entity graph" step after the co-occurrence step, with `ls -lh` size check.

## Verification

All four plan verification checks passed:
1. `node scripts/precompute-curated-graph.js` exits 0, produces 100 nodes, 1,428 links
2. No hardcoded `92.042` or `8.177` in explorer templates or entity-explorer.js
3. No `cdn.protomaps.com` in place.js
4. `curated-entity-graph` referenced in both eleventy.config.js and deploy.yml

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. `data/curated-entity-graph.json` is produced by the script at build time and not committed (data/ is gitignored). The file will be generated in CI before Eleventy runs.

## Self-Check: PASSED

- scripts/precompute-curated-graph.js — FOUND (committed af2c732)
- src/js/place.js — FOUND (committed b7bd83d)
- src/explorar/entidades.njk — FOUND (committed b7bd83d)
- src/explorar/lugares.njk — FOUND (committed b7bd83d)
- src/js/entity-explorer.js — FOUND (committed b7bd83d)
- eleventy.config.js — FOUND (committed 10dc5f1)
- .github/workflows/deploy.yml — FOUND (committed 10dc5f1)
