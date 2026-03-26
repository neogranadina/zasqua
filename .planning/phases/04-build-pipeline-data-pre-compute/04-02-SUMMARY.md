---
phase: 04-build-pipeline-data-pre-compute
plan: "02"
subsystem: build-pipeline
tags: [build-pipeline, eleventy, ci-cd, pre-compute, b2-download]
dependency_graph:
  requires:
    - scripts/precompute-links.js (Plan 01)
    - scripts/precompute-cooccurrence.js (Plan 01)
  provides:
    - eleventy.config.js (passthrough copies for entity/place data)
    - build.sh (entity/place download and pre-compute pipeline)
    - .github/workflows/deploy.yml (CI pipeline with pre-compute steps)
  affects:
    - Phase 05 (entity/place detail pages — built files now reach _site)
    - Phase 06 (place explorer — place-index.json passes through to _site)
    - Phase 07 (entity explorer — entity-index.json passes through to _site)
    - Phase 09 (network graph — entity-cooccurrence.json passes through to _site)
tech_stack:
  added: []
  patterns:
    - Eleventy addPassthroughCopy with source/destination object syntax
    - B2 file download + b2 sync pattern extended to entity/place files
    - Separate CI steps for each pre-compute script (link shards, co-occurrence)
    - Pre-compute steps run before npm ci (Node.js only, no npm deps needed)
key_files:
  created: []
  modified:
    - eleventy.config.js
    - build.sh
    - .github/workflows/deploy.yml
decisions:
  - "Pre-compute steps placed before npm install in CI — scripts use only Node.js stdlib, no npm dependencies required"
  - "Single Eleventy build retained (no parallel split) — profile first, split only if build exceeds ~25 min"
  - "mkdir -p updated in both build.sh and deploy.yml to pre-create entity-links and place-links directories"
metrics:
  duration_seconds: 61
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_changed: 3
---

# Phase 04 Plan 02: Build Pipeline Wiring Summary

Build pipeline integration for entity/place pre-compute scripts — passthrough copies in eleventy.config.js, B2 downloads and pre-compute steps in build.sh and deploy.yml, end-to-end pipeline complete for both local and CI builds.

## What Was Built

### Task 1: Passthrough copies in eleventy.config.js

Added five `addPassthroughCopy` calls immediately after the existing `data/children` passthrough, using the same `{ "source": "destination" }` object syntax:

- `data/entity-links` → `data/entity-links` (per-entity JSON shards, fetched on demand)
- `data/place-links` → `data/place-links` (per-place JSON shards, fetched on demand)
- `data/entity-index.json` → `data/entity-index.json` (explorer in-memory filtering, D-03)
- `data/place-index.json` → `data/place-index.json` (explorer in-memory filtering, D-03)
- `data/entity-cooccurrence.json` → `data/entity-cooccurrence.json` (network graph, Phase 9)

All other eleventy.config.js content left unchanged.

### Task 2: build.sh and deploy.yml pipeline steps

**build.sh:** Updated `mkdir -p` to create `data/entity-links` and `data/place-links` directories. Added entity/place B2 downloads (entities.json, places.json, entity_links.json, place_links.json) after the existing descriptions/repositories/children downloads. Added two pre-compute steps (`node scripts/precompute-links.js`, `node scripts/precompute-cooccurrence.js`) with diagnostic output (shard counts, file sizes) — placed before `npm ci` and `npx eleventy`.

**deploy.yml:** Updated `mkdir -p` in the "Download data from B2" step. Added entity/place B2 downloads at end of that step. Added two new steps — "Pre-compute link shards and index files" and "Pre-compute co-occurrence graph" — after "Download data from B2" and before "Install npm dependencies". `timeout-minutes: 60`, the Eleventy build step, Pagefind, R2 upload, and cache purge steps left unchanged.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 6955430 | Add passthrough copies for entity/place pre-computed data files |
| 2 | 5eec579 | Wire entity/place pre-compute steps into build.sh and deploy.yml |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three files are fully wired. The pipeline will fail fast (non-zero exit) if entity/place JSON files do not exist on B2, which is the correct behavior.

## Self-Check: PASSED
