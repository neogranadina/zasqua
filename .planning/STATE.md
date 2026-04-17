---
gsd_state_version: 1.0
milestone: v1.0.0
milestone_name: Build Pipeline Sustainability
status: Defining requirements
last_updated: "2026-04-16"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Defining requirements for v1.0.0 Build Pipeline Sustainability

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-16 — Milestone v1.0.0 started

## Accumulated Context

### Roadmap Evolution

(New milestone — no phases yet)

### Decisions

Carried from v0.5.0:

- Visual identity: Figma Make file (bOunUsW8BHk1eqZrJu7Nxt) is the spec source
- Tailwind v4 standalone CLI — no npm dependency
- Porting done in thematic commits — version bump last

v1.0.0 decisions:

- Hugo replaces Eleventy — Eleventy OOMs at 192K pages with 7 GB heap (CI exit code 134)
- Pagefind addressed after Hugo if still insufficient
- R2 diff-based upload included in scope

### Pending Todos

- Entity data in data/ is stale (78K, should be 83K) — depends on zasqua-entities
- Protomaps CDN basemap failing on place detail pages
- Build chain data-copying gap (DATA_DIR vs data/ path issue)

### Blockers/Concerns

- v0.5.1 deploy to zasqua.org blocked by CI OOM — this milestone's primary motivation

## Session Continuity

Last activity: 2026-04-16 — Milestone v1.0.0 started
