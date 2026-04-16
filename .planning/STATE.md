---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: Milestone complete
stopped_at: Completed 12-01-PLAN.md
last_updated: "2026-04-14T04:15:54.638Z"
progress:
  total_phases: 11
  completed_phases: 9
  total_plans: 32
  completed_plans: 30
  percent: 94
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 12 — place-explorer-and-place-detail-page-rework

## Current Position

Phase: 12
Plan: Not started
Next: Phase 10.2 (explorer-parity) — INSERTED, ready to plan

## Accumulated Context

### Roadmap Evolution

- 2026-04-05: Phase 10.1 inserted after Phase 10 — infinite bipartite graph explorer (completed 2026-04-08)
- 2026-04-08: Phase 10.2 inserted after Phase 10.1 — explorer parity for place explorer, place pages, and entity pages

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
- [Phase 12]: Detect Protomaps font from basemap layers for cluster count labels
- [Phase 12]: Extract place IDs from Pagefind stub URLs for map filter sync

### Pending Todos

- Clean up unused precompute-bipartite-graph.js, entity-doc-graph.json, Sigma/graphology refs
- Update entity data after zasqua-entities phases 10.1–10.2 complete (currently 78K in data/, should be 83K)
- Full site rebuild + deploy (held for zasqua-entities data cleanup)
- Fix Protomaps CDN basemap on place detail pages (map shows burgundy dot only, no tiles)

### Blockers/Concerns

- Entity data in data/ is stale (78K, should be 83K) — depends on zasqua-entities
- Protomaps CDN basemap failing on place detail pages (place explorer uses OpenFreeMap which works)
- Live site: pagefind-entities and pagefind-places both 404 — will appear after next deploy

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260415-q73 | Fix Phase 13 spot-check bugs | 2026-04-16 | bcd7c6d | [260415-q73-fix-phase-13-spot-check-bugs-place-explo](./quick/260415-q73-fix-phase-13-spot-check-bugs-place-explo/) |

## Session Continuity

Last activity: 2026-04-16 - Completed quick task 260415-q73: Fix Phase 13 spot-check bugs
Last session: 2026-04-12T20:50:43.937Z
Stopped at: Completed 12-01-PLAN.md
shakedown narrative, decisions, original-criteria verification table,
backend open items). Decision: the redesign and infinite-trail work
stayed in scope of 10.1-04 — no 10.1-05 plan, no separate phase. Three
of the original 7 success criteria were marked superseded (viewport-fill
layout → scroll-page; auto-load → empty state; sidebar role facet →
card-scoped role facet) per user-driven scope changes during the
shakedown. The other four are met or exceeded.

### To resume

1. `/clear` and start fresh context
2. `/gsd-resume-work`

Next up: whatever the roadmap has after Phase 10.1 (likely Phase 11
description linking, but that depends on zasqua-entities phases 10.1–10.2
finishing first per the v0.5.0 decisions log).

### Backend follow-ups (non-blocking, surfaced during Phase 10.1)

- Normalise `corporate` vs `corporate_body` in entity export
- Populate `Entity.primary_function` (currently null for all 92k) or drop the field
- Phase 13 will replace flat creator/witness/mentioned with the 7-group taxonomy
  the card facet is already built against
