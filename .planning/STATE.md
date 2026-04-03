---
gsd_state_version: 1.0
milestone: v0.5.0
milestone_name: milestone
status: In progress
stopped_at: Entity explorer deep-link feature next, then places data update and v0.5.0 close-out
last_updated: "2026-04-02T12:00:00.000Z"
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
Working directly on code — entity detail page graph complete, entity explorer deep-link next

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
- [Phase 09]: Click-to-expand fetches entity page HTML for name/type (Pagefind search by code unreliable)
- [Phase 09]: Entity code added to Pagefind body in entidad.njk (needs rebuild)
- [Phase 09]: Entity detail page layout flipped to 35/65 (metadata/timeline)
- [Phase 09]: Timeline entries are cards with connectors, Spanish long dates, reference codes, role labels
- [Phase 09]: View toggle embedded in prose sentence, not separate tabs
- [Phase 09]: Role filters are pill buttons, no separate active-filter pills
- [Phase 09]: Entity explorer default sort changed to count:desc (most linked first)
- [Phase 09]: ?vista=red URL parameter auto-switches to graph view
- [Phase 09]: Pagefind bundlePath renamed to basePath in v1.4 — fixed across all JS files
- [Phase 09]: formatDate Eleventy filter for Spanish narrative dates (e.g. "12 de octubre de 1743")
- [Phase 09]: ISAAR Control section with entity code PID, Reutilización with EAC-CPF placeholder
- [Phase 09]: Place template updated: 35/65 layout, Control (conditional on place_code), Reutilización with Linked Places placeholder
- [Phase 09]: Explorer graph paused — to be replaced by ?entidad= deep-link ego-network

### Pending Todos

- Build entity explorer deep-link: ?entidad=ne-XXXXX opens ego-network in /explorar/entidades/
- Update places.json with rebuilt data from zasqua-entities pipeline (7,068 places, TGN links, country codes)
- Clean up unused precompute-bipartite-graph.js, entity-doc-graph.json, Sigma/graphology refs
- Full site rebuild + deploy
- Close out v0.5.0 (version bump, deploy, changelog, release)
- Backend: add place_code field to places export

### Blockers/Concerns

- None currently blocking

## Session Continuity

Last session: 2026-04-02
Stopped at: Entity detail graph fully working (tooltips, expand, legend, colours, deep-link). Entity explorer deep-link feature is the next task. Places data updated from zasqua-entities pipeline needs committing.

### To resume

1. `/clear` and start fresh context
2. Build entity explorer deep-link: ?entidad=ne-XXXXX in /explorar/entidades/
   - entity-explorer.js reads ?entidad= from URL
   - Fetches that entity's shard directly
   - entity-network-graph.js shows ego-network centred on that entity
   - Entity appears selected in results list
   - Update entity.js tooltip links and entidad.njk button to use this
   Key files: src/js/entity-network-graph.js, src/js/entity-explorer.js, src/js/entity.js, src/entidad.njk
3. Update places.json: commit data/places.json with rebuilt place data (7,068 places, TGN links, country codes, audited authorities)
   - Push and rebuild
   - Spot-check: places with TGN links, WHG variants (Latin-script only), country codes, corrected authority data
   - Check lugar.njk renders TGN link (tgn_id field) and country_code
4. Clean up: remove precompute-bipartite-graph.js, entity-doc-graph.json, old Sigma/graphology CDN refs from entidades.njk
5. Full site rebuild + deploy
6. Close out v0.5.0 (version bump, deploy, changelog, release)

### Key files changed this session

- `src/entidad.njk` — Control section, Reutilización section, graph legend, explore button, ?vista=red, entity code in Pagefind body, plain-text variants
- `src/js/entity.js` — click-to-expand via page fetch, document/entity tooltips, pre-check expandable, adjacency rebuild, conditional expand button, ?vista=red handling
- `src/css/input.css` / `src/css/main.css` — tooltip styles, legend, explore button, graph-frame position, actions text size, timeline title line-height
- `src/_data/ui.js` — entityCode field label, control/reuse section labels for entity and place
- `src/description.njk` — narrative dates (formatDate filter), monospace reference codes
- `src/lugar.njk` — 35/65 layout, plain variants, Control/Reutilización sections
- `eleventy.config.js` — formatDate Nunjucks filter (Spanish narrative dates)
- `src/js/entity-explorer.js` — bundlePath→basePath fix
- `src/js/place-explorer.js` — bundlePath→basePath fix

Resume file: .planning/HANDOFF.json
