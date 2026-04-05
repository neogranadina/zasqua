---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: Executing Phase 10
stopped_at: Phase 10 context gathered
last_updated: "2026-04-05T00:00:15.788Z"
progress:
  total_phases: 8
  completed_phases: 5
  total_plans: 21
  completed_plans: 16
  percent: 76
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 10 — explorer-ux-redesign

## Current Position

Phase: 10 (explorer-ux-redesign) — EXECUTING
Plan: 1 of 4

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Carried from v0.4.0:

- Visual identity: Figma Make file (bOunUsW8BHk1eqZrJu7Nxt) is the spec source
- Tailwind v4 standalone CLI — no npm dependency
- Porting done in thematic commits — version bump last

v0.5.0 decisions:

- [Phase 04–08]: All prior decisions remain valid (see git history)
- [Phase 09]: Co-occurrence graph scrapped — bipartite document-entity graph on detail pages instead
- [Phase 09]: Entity detail page is the primary home for the graph, not the explorer
- [Phase 09]: Graph builds from entity-link shards fetched on demand, not pre-computed JSON
- [Phase 09]: 35/65 layout, timeline cards, role filters, view toggle in prose sentence
- [Phase 09]: Place template updated: 35/65 layout, Control/Reutilización, full-width authority rows
- [Phase 09]: Place data updated to 7,068 (from 8,177) with TGN links, WHG audited
- [Phase 09]: Explorer graph paused — entity explorer crashes browsers, needs full UX redesign
- [Phase 10 scoping]: Explorer UX redesign includes research, Figma design, then implementation
- [Phase 11 scoping]: Description linking deferred until entity data stabilises (zasqua-entities phases 10.1–10.2)

### Pending Todos

- Clean up unused precompute-bipartite-graph.js, entity-doc-graph.json, Sigma/graphology refs
- Update entity data after zasqua-entities phases 10.1–10.2 complete (currently 92K in data, should be 83K)
- Full site rebuild + deploy (after Phase 10)
- Close out v0.5.0 (version bump, deploy, changelog, release — after Phase 11)
- Backend: add place_code field to places export
- Fix Protomaps CDN basemap on place detail pages (map shows burgundy dot only, no tiles)

### Blockers/Concerns

- Entity data in data/ is stale (92K, should be 83K) — depends on zasqua-entities
- Protomaps CDN basemap failing on place detail pages (place explorer uses OpenFreeMap which works)
- Live site: pagefind-entities and pagefind-places both 404 — will appear after next deploy

## Session Continuity

Last session: 2026-04-05T20:32:39.936Z
Stopped at: Plan 10-04 verification complete; UX pivot to three-column layout with ego-subset graph decided but not yet implemented

### To resume

1. `/clear` and start fresh context
2. `/gsd-resume-work`

Resume file: .planning/phases/10-explorer-ux-redesign/.continue-here.md
