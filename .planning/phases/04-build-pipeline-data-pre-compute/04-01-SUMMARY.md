---
phase: 04-build-pipeline-data-pre-compute
plan: "01"
subsystem: data-pipeline
tags: [pre-compute, data-loaders, entity-links, place-links, co-occurrence]
dependency_graph:
  requires: []
  provides:
    - scripts/precompute-links.js
    - scripts/precompute-cooccurrence.js
    - src/_data/entities.js
    - src/_data/places.js
  affects:
    - Phase 05 (entity/place detail pages consume entity-links/ and place-links/ shards)
    - Phase 06 (place explorer consumes place-index.json)
    - Phase 07 (entity explorer consumes entity-index.json)
    - Phase 09 (network graph consumes entity-cooccurrence.json)
tech_stack:
  added: []
  patterns:
    - CommonJS pre-compute scripts with DATA_DIR / DEV_MODE / DEV_LIMIT env vars
    - Per-entity and per-place JSON shards written to data/entity-links/ and data/place-links/
    - Single-file index JSON for explorer in-memory filtering (D-03, D-04, D-05)
key_files:
  created:
    - scripts/precompute-links.js
    - scripts/precompute-cooccurrence.js
  modified:
    - src/_data/entities.js
    - src/_data/places.js
decisions:
  - "precompute-links.js generates both the link shards and the index files in a single pass — avoids reading entity_links.json twice"
  - "latitude/longitude renamed to lat/lon when writing place-index.json (D-07 spec); backend exports full field names"
  - "DEV_LIMIT defaults to 500 shards for precompute scripts, 100 records for data loaders — matches descriptions.js convention"
  - "COOCCURRENCE_MIN_WEIGHT defaults to 3; configurable via env for real-data tuning in Phase 9"
metrics:
  duration_seconds: 114
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_changed: 4
---

# Phase 04 Plan 01: Pre-compute Scripts and Data Loaders Summary

Pre-compute scripts and Eleventy data loaders for entity/place link shards, metadata index files, and entity co-occurrence graph — all four files created and verified.

## What Was Built

### Task 1: precompute-links.js and precompute-cooccurrence.js

`scripts/precompute-links.js` (CommonJS, `'use strict'`) reads `entity_links.json` and `place_links.json` from DATA_DIR, groups records by entity/place code, and writes per-entity and per-place JSON shards to `data/entity-links/` and `data/place-links/`. It then reads `entities.json` and `places.json` to build `entity-index.json` (D-06 fields) and `place-index.json` (D-07 fields). The `latitude`/`longitude` backend field names are renamed to `lat`/`lon` when writing the place index. Both index files include `linked_description_count` derived from the shard maps. DEV_MODE limits shard output for fast local iteration.

`scripts/precompute-cooccurrence.js` reads `entity_links.json`, groups by `reference_code`, emits sorted entity-code pairs for each description with two or more entities, accumulates edge weights, filters by `COOCCURRENCE_MIN_WEIGHT` (default 3), and writes `data/entity-cooccurrence.json` with `{ min_weight, generated_at, node_count, edge_count, nodes, edges }`.

### Task 2: entities.js and places.js data loaders

Replaced stubs (`return []`) with real file readers following the `descriptions.js` pattern exactly — same `DATA_DIR`, `DEV_MODE`, `DEV_LIMIT` environment variable handling, same `console.log` progress format, same `module.exports = async function()` structure.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | d17940a | Add precompute-links.js and precompute-cooccurrence.js |
| 2 | f27d541 | Activate entities.js and places.js data loaders |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all four files are fully implemented. The data loaders will fail at Eleventy build time if the JSON source files do not exist in DATA_DIR, which is the correct behaviour (fail fast, not silently return empty data).

## Self-Check: PASSED
