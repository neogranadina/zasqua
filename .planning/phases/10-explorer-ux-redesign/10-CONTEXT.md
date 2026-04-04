# Phase 10: Explorer UX Redesign - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Both entity and place explorer interfaces are redesigned with proper UX research, Figma design, and implementation. The entity explorer must stop crashing browsers at 83K+ entities. The entity network graph is reworked as a curated starter view with deep-linking from entity detail pages. Place explorer data is refreshed (7,068 places). Both explorers get visual coherence with the Phase 9 detail page designs. Phase 9 graph-related dead code is cleaned up.

Mobile-responsive layout redesign is explicitly out of scope — that is a future milestone. Existing mobile collapse patterns remain as-is.

</domain>

<decisions>
## Implementation Decisions

### Graph panel rework
- **D-01:** Keep the entity network graph on the explorer page but rework it as a **curated starter graph** — a small, pre-computed set of the top 50–100 most-connected entities that loads fast on page open
- **D-02:** Ego-network expansion on click — clicking a node reveals its 1-hop neighbours, same as the Phase 9 design intent
- **D-03:** **Deep-linking from entity detail pages** — entity pages link to the explorer with a URL parameter (e.g. `/explorar/entidades/?nodo=entity_code`) that opens the graph centred on that entity. This enables users to move from a detail page into network exploration
- **D-04:** The research phase (10a) must study how prosopographical databases handle entity network exploration, graph navigation, and the detail-to-explorer flow specifically

### Explorer layout
- **D-05:** Both explorers **keep the sidebar+results layout** — consistent with `/buscar/` and each other. The redesign focuses on visual polish and coherence with detail page designs, not structural layout change
- **D-06:** How the graph panel (entity) and map panel (place) relate to the sidebar+results area is **deferred to post-research Figma exploration** — the arrangement will be decided during the Figma sub-phase based on research findings and mockup iterations

### Research scope
- **D-07:** **Deep research** before Figma — thorough survey of prosopographical databases, archival discovery portals, and digital humanities entity explorer tools. Produce a written research document with findings, patterns, and recommendations
- **D-08:** Claude identifies the reference sites (PROSOP, PASE, China Biographical Database, and others discovered during research). No user-specified must-study list — the research agent has latitude to find the best examples
- **D-09:** Research must specifically address: (a) how comparable systems present entity networks/graphs as discovery tools, (b) deep-linking patterns between detail pages and explorers, (c) how large entity sets (>10K) are handled in search+browse interfaces

### Data and count refresh
- **D-10:** Explorer intro text counts become **dynamic from data** — computed at build time from the actual data files (entities.json, places.json) using template variables. No more hardcoded numbers
- **D-11:** Place explorer data reflects the updated 7,068 places (from 8,177), with correct place-index.json and Pagefind place index
- **D-12:** **Fix Protomaps CDN basemap** on place detail pages as part of this phase — the map currently shows only a burgundy dot with no tiles. The place explorer uses OpenFreeMap which works; standardise or fix the detail page provider

### Phase sequencing
- **D-13:** Three sub-phases: **10a** (research — deep survey, written report), **10b** (Figma design — mockups, review, iterate), **10c** (implementation). Each has its own plan. Figma review gates implementation
- **D-14:** Each sub-phase produces a deliverable that the next sub-phase consumes: research report informs Figma, approved Figma designs inform implementation

### Cleanup
- **D-15:** Phase 9 graph-related dead code is cleaned up in the implementation sub-phase (10c): remove unused `precompute-bipartite-graph.js` (if present), `entity-doc-graph.json`, Sigma/graphology references, and any other co-occurrence artefacts replaced by the new curated graph approach

### Claude's Discretion
- Graph rendering technology (force-graph CDN vs D3-force+SVG vs other) — to be decided based on research findings and codebase constraints
- Exact curated graph size (50–100 nodes) and selection criteria (highest degree, most documents, editorial picks)
- Spanish number formatting for dynamic counts (use existing `numberFormat` filter or new approach)
- Protomaps vs OpenFreeMap standardisation decision for map tiles
- Visual polish details — typography, spacing, colour adjustments to match detail page designs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current explorer implementations
- `src/explorar/entidades.njk` — Entity explorer template with graph panel and explorer container
- `src/explorar/lugares.njk` — Place explorer template with MapLibre map
- `src/js/entity-explorer.js` (1188 lines) — EntityExplorer class: Pagefind search, facets, pagination, URL state, sort
- `src/js/place-explorer.js` (969 lines) — PlaceExplorer class: Pagefind search, facets, map, pagination, URL state
- `src/js/entity-network-graph.js` (463 lines) — Current force-graph implementation with ego-network expansion

### Detail pages (visual coherence targets)
- `src/entidad.njk` — Entity detail page: 35/65 layout, timeline view, role filters
- `src/lugar.njk` — Place detail page: 35/65 layout, segmented toggle, authority rows
- `src/js/entity.js` — Entity detail page JS (timeline rendering, graph)
- `src/js/place.js` — Place detail page JS (map init, IIFE pattern, role labels)

### Design and visual language
- `../docs/frontend/guidelines/design-tokens.md` — Colour, typography, spacing tokens
- `../docs/frontend/guidelines/frontend-design.md` — Frontend design guidelines
- `src/css/main.css` — Stylesheet with explorer, search, and graph CSS classes

### Data files
- `src/_data/ui.js` — Spanish UI strings, entity types, place types, role labels
- `src/_data/entities.js` — Entity data loader
- `src/_data/places.js` — Place data loader

### Prior phase context
- `.planning/phases/07-place-explorer/07-CONTEXT.md` — Place explorer design decisions (layout, heatmap, facets, URL state)
- `.planning/phases/08-entity-explorer-list-view/08-CONTEXT.md` — Entity explorer decisions (Pagefind indices, result rows, sorting)
- `.planning/phases/09-entity-network-graph/09-CONTEXT.md` — Graph decisions (ego-network, role filters, co-occurrence approach — partially superseded)

### Build pipeline
- `scripts/precompute-cooccurrence.js` — Current co-occurrence precompute (may need rework or replacement for curated graph)
- `.github/workflows/deploy.yml` — CI/CD pipeline
- `eleventy.config.js` — Build config, passthrough copies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EntityExplorer` class — Pagefind integration, facet rendering, URL state sync, pagination. Core search+browse functionality stays; graph integration needs rework
- `PlaceExplorer` class — Same Pagefind pattern plus MapLibre map. Map coordinate loading from place-index.json is solid
- `SearchPage` class (`src/js/search.js`) — Reference pattern for all three explorers
- CSS classes: `.search-layout`, `.search-sidebar`, `.facet-group`, `.filter-pill`, `.search-pagination`, `.graph-panel`, `.explorer-map` — all reusable
- `numberFormat` Eleventy filter — formats numbers with `.` thousands separator (useful for dynamic counts)

### Established Patterns
- Three separate Pagefind indices (descriptions, entities, places) — architecture stays
- Sidebar facets with collapsible groups and active filter pills
- URL-driven state with `pushState`/`popstate`
- MapLibre loaded via CDN conditionally in template head
- force-graph loaded via CDN on entity explorer only

### Integration Points
- Entity detail pages need a new link/button to `/explorar/entidades/?nodo={entity_code}` for graph deep-linking
- Dynamic counts need build-time data computation (new data file or enriched existing loaders)
- Graph curated dataset needs a precompute step (replace or adapt current co-occurrence script)
- Map tile provider fix needed on `src/js/place.js` (Protomaps CDN broken)

</code_context>

<specifics>
## Specific Ideas

- "I want a curated view, and a working system by which entity pages can link to the explorer and open it centred on any node in the graph, so users can continue exploration and discovery"
- Research should specifically study prosopographical databases for graph/network exploration patterns
- Panel arrangement (graph above results vs beside results) to be explored in Figma mockups after research, not pre-decided
- Mobile experience is a future milestone — don't redesign mobile layouts here

</specifics>

<deferred>
## Deferred Ideas

- **Mobile-responsive redesign** — the user explicitly stated this is a separate future milestone. Existing mobile collapse patterns remain as-is in Phase 10
- **Two-way graph-list binding** (clicking a node filters results) — deferred from Phase 9, remains deferred
- **Graph search** (type-to-find-node within graph) — deferred from Phase 9
- **Community detection / cluster colouring** — deferred from Phase 9
- **Standardise tile provider across all maps** — if the Protomaps fix resolves the detail page issue, full standardisation can wait

</deferred>

---

*Phase: 10-explorer-ux-redesign*
*Context gathered: 2026-04-04*
