---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: Executing Phase 10
stopped_at: Phase 10.1 shakedown complete — layout, empty state, infinite trail, viewport filter
last_updated: "2026-04-08T02:00:00.000Z"
progress:
  total_phases: 9
  completed_phases: 5
  total_plans: 21
  completed_plans: 19
  percent: 90
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

Last session: 2026-04-08T02:00:00.000Z
Stopped at: /entidades/ shakedown wrapped up clean. Earlier in the session
(committed in 279ee55): focal-entity uncap, role facet relocated to the
selected card with the 7-group Phase 12.1/13 taxonomy, simulation tuned
for expanded clusters. Since then:

1. **Layout restructure** — graph + selected entity card now sit on the
   top row of a 2-row grid; filters + entity index occupy row 2.
   Card and graph share a 560px height; card scrolls internally.
   Both share the 12px corner radius.
2. **Browse-prompt parity with description search** — added the
   `Tomará algunos segundos en cargar` warning paragraph; new
   filter-overload mode triggers at >10k estimated results when only
   facets are active (estimateFilterCount mirrors search.js).
3. **Empty-state overlay on first load** — explainer text + faint
   pomegranate emblem + four example entity buttons (Real Audiencia
   de Quito, Cabildo de Rionegro, José Gabriel Túpac Amaru, Simón
   Bolívar). Inline single-paragraph styling. Skipped when ?entidad=
   URL param is present. Dismissed on first focal load.
4. **Truly infinite trail** — `MAX_EXPAND_ENTITIES` removed (corpus
   worst case is 210 entities on a single doc; 99% have ≤20).
   `MAX_HOPS` raised to 50 as a soft long-session safety valve.
   pruneDistantNodes now resets `expanded`/`expandable` flags on
   docs that lose entities so they can be re-expanded later.
5. **Critical bugfix**: pruneDistantNodes still referenced the
   removed `MAX_HOPS` constant briefly, throwing a ReferenceError on
   every refocus and silently breaking tooltip/hover state. Fixed
   alongside the hop-cap restoration.
6. **Viewport filter button** moved into the filter column above the
   search bar with a vertical-arrows icon. Two bugs fixed: the
   overload threshold no longer trips when only viewport mode is
   active, and the sidebar facets now narrow to scoped counts
   computed locally from visible entities (entity_type + year +
   century + decade).
7. **Entity tooltip on click** — non-focal entities now show a
   tooltip with badge/name/id/count and a single
   "Seleccionar y desplegar vínculos" link in `.graph-tooltip-actions`.
   Click no longer immediately refocuses; mirrors the doc-click
   "Desplegar" pattern.
8. **Card facet label** changed to "Filtrar conexiones a documentos
   por rol".

### To resume

1. `/clear` and start fresh context
2. `/gsd-resume-work`

Phase 10.1 ready for closure: write 10.1-04-SUMMARY.md, decide
whether the redesign is in scope of 10.1 (10.1-05 plan) or its own
phase, then formal phase verification.
