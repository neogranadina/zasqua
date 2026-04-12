---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: Ready to plan
stopped_at: Phase 11 context gathered
last_updated: "2026-04-12T05:38:21.849Z"
progress:
  total_phases: 10
  completed_phases: 7
  total_plans: 28
  completed_plans: 26
  percent: 93
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 10.2 — explorer-parity

## Current Position

Phase: 11
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

Last session: 2026-04-12T05:38:21.845Z
Stopped at: Phase 11 context gathered
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
