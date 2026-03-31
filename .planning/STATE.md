---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: In progress
stopped_at: Entity detail graph view — click-to-expand needs testing
last_updated: "2026-03-31T19:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 17
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.
**Current focus:** Phase 09 — entity network graph (redesigned as bipartite document-entity graph)

## Current Position

Phase: 9 (redesigned — no longer following original plans)
Working directly on code — entity detail page graph + timeline, entity explorer graph prototype

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Carried from v0.4.0:

- Visual identity: Figma Make file (bOunUsW8BHk1eqZrJu7Nxt) is the spec source
- Tailwind v4 standalone CLI — no npm dependency
- Porting done in thematic commits — version bump last

v0.5.0 decisions:

- [Phase 04–08]: All prior decisions remain valid (see git history)
- [Phase 09 — redesign]: Co-occurrence graph scrapped — bipartite document-entity graph instead
- [Phase 09]: Entity detail page is the primary home for the graph, not the explorer
- [Phase 09]: Graph builds from entity-link shards fetched on demand, not pre-computed JSON
- [Phase 09]: Click-to-expand on document nodes uses desc-entity-lookup.json + Pagefind entity index
- [Phase 09]: Entity detail page layout flipped to 35/65 (metadata/timeline)
- [Phase 09]: Timeline entries are cards with connectors, Spanish long dates, reference codes, role labels
- [Phase 09]: View toggle embedded in prose sentence, not separate tabs
- [Phase 09]: Role filters are pill buttons, no separate active-filter pills
- [Phase 09]: Entity explorer default sort changed to count:desc (most linked first)
- [Phase 09]: Entity explorer graph driven by search results — fetches shards for visible entities, finds shared documents
- [Phase 09]: Explorer graph paused — 20 entities per page too sparse for shared documents

### Pending Todos

- FIX-01 (ui.js nav keys) already pushed to public repo — mark complete
- Clean up unused precompute-bipartite-graph.js and entity-doc-graph.json
- Remove graphology/sigma CDN scripts from entidades.njk (replaced by force-graph)

### Blockers/Concerns

- **Phase 9**: Explorer graph needs more than 20 entities to find shared documents — either fetch more results or rethink the trigger
- **Phase 9**: Click-to-expand on entity detail graph untested — Pagefind entity search may return wrong results if entity code isn't in the indexed text
- **Phase 9**: Full site rebuild needed to apply entidad.njk template changes to all 92K pages

## Session Continuity

Last session: 2026-03-31
Stopped at: Entity detail page graph view working (ego-network with zoomToFit). Click-to-expand coded but untested. Explorer graph prototype paused.

### To resume

1. `/clear` and start fresh context
2. Test entity detail graph click-to-expand: navigate to `/entidad/ne-00001/`, switch to graph view, click a document node — verify new entity nodes appear incrementally without zooming out
3. If click-to-expand works, polish: node colours for expanded entities, labels on hover, cursor feedback
4. Decide on explorer graph: fetch 50+ entities? collapse panel when empty? or defer entirely?
5. Clean up: remove precompute-bipartite-graph.js, entity-doc-graph.json, old Sigma/graphology references
6. Full site rebuild to test all entity pages render correctly with new template
7. After graph work settles, close out v0.5.0 (version bump, deploy, changelog, release)

### Key files changed this session

- `src/entidad.njk` — entity detail template: 35/65 layout, intro sentence, view toggle, role filters, timeline frame, graph frame, force-graph CDN
- `src/js/entity.js` — complete rewrite: timeline with cards/connectors/Spanish dates, role filters, graph view with ego-network and click-to-expand
- `src/css/input.css` — entity page styles: timeline cards, connectors, entity-layout, graph frame, role pills, view links, intro sentence
- `src/js/entity-network-graph.js` — rewritten to build from explorer search results + entity-link shards (paused)
- `src/js/entity-explorer.js` — default count:desc sort, pre-search bypass when sort is active, _lastRenderData for graph replay
- `_site/entidad/ne-00001/index.html` — manually patched for testing (will be overwritten on next build)

Resume file: None
