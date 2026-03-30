# Phase 9: Entity Network Graph - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

The entity explorer page (`/explorar/entidades/`) gains a network graph showing entity co-occurrence through shared archival descriptions. The graph uses pre-computed ForceAtlas2 layout positions — no force simulation runs in the browser. Users can expand ego-networks on click. The graph reflects the current search/facet filter state. Rendering uses Sigma.js v3 with graphology.

</domain>

<decisions>
## Implementation Decisions

### Graph scope & entry point
- **D-01:** The graph is always visible on the entity explorer page, same pattern as the heatmap on the place explorer — not toggled, not a separate tab
- **D-02:** On initial page load (before any search), the graph shows the ~100 most-connected entities (highest edge degree or document count) as a starter network
- **D-03:** The graph loads the full `entity-cooccurrence.json` once on page load and subsets it client-side for display

### Node interaction & ego-network
- **D-04:** Single click on a node expands its 1-hop ego-network — immediate co-occurring neighbours appear in the graph
- **D-05:** Double-click on a node navigates to the entity detail page (`/entidad/{code}/`)
- **D-06:** Ego-network expansion is 1-hop only — no 2-hop or recursive expansion
- **D-07:** Hover shows a tooltip with entity name and document count

### Filter synchronisation
- **D-08:** One-way sync: search/facet changes in the entity explorer highlight matching nodes in the graph; non-matching nodes fade to grey/transparent but remain visible (preserving network context)
- **D-09:** Clicking a graph node does NOT filter the results list — the list is controlled solely by its own search/facets. Graph and list are visually connected but state-independent
- **D-10:** This is a refinement from ROADMAP success criterion 2 ("highlights those entities in the results list") — during visual verification we may revisit adding list highlighting if the one-way approach feels disconnected

### Role-typed edges
- **D-11:** Edges carry role-pair information — the precompute script must output per-edge role-pair counts (e.g. `{ "creator|subject": 3, "creator|mentioned": 2 }`) alongside the total weight
- **D-12:** Edges are visually coded by role pair — different colours or styles per role combination (exact mapping is Claude's discretion)
- **D-13:** Edge tooltip shows the full role breakdown: "Juan Pérez ↔ María Gómez: 5 documentos (3 productor/materia, 2 productor/mencionado)"
- **D-14:** Role filter checkboxes live inside the graph panel (not in the sidebar): Productor, Colaborador, Materia, Mencionado, Editor. Unchecking a role hides edges where that role participates. Independent from the sidebar entity explorer facets
- **D-15:** When a role filter hides all edges for a node, that node also fades or hides (no orphan nodes)

### Visual style
- **D-16:** Node radius scales with document count (more linked descriptions = larger node)
- **D-17:** Node colour maps to entity type (person, corporate body, family, place) — use the same colours as the entity explorer type facet chips
- **D-18:** Edge thickness scales with co-occurrence weight (more shared descriptions = thicker edge)

### Responsive behaviour
- **D-19:** On desktop, the graph panel sits above the results list at full width (like the place explorer map)
- **D-20:** On mobile, the graph is collapsible — a toggle lets users hide/show it to reclaim screen space. Same pattern as the place explorer map on mobile

### Technology
- **D-21:** Sigma.js v3 for WebGL rendering (~50KB gzip), graphology for the graph data model
- **D-22:** Pre-computed ForceAtlas2 layout positions are stored in the co-occurrence JSON — the precompute script must be extended to run ForceAtlas2 and write x/y coordinates per node
- **D-23:** The precompute script must be extended to output role-pair counts per edge — current script discards the `role` field from `entity_links.json`; the new version groups co-occurrences by the role pair (sorted alphabetically) so the frontend can filter and display by relationship type

### Claude's Discretion
- Graph container height and aspect ratio
- Exact tooltip styling and positioning
- Zoom/pan controls and reset button design
- Animation timing for ego-network expansion
- Edge colour and opacity values
- How to handle the transition from ~100 starter nodes to a filter-driven subgraph

</decisions>

<specifics>
## Specific Ideas

- "It should be the equivalent of the heatmap view" — referring to the place explorer's always-visible map panel
- The node colours should reuse the entity type colour palette already established in the entity explorer facets
- We may revisit the ROADMAP's original behaviour (click highlights in results list) during visual verification — keeping the door open without building it now
- The existing roles in the data are: creator, contributor, publisher, subject, mentioned (Spanish labels in `ui.js`: Productor, Colaborador, Editor, Materia, Mencionado) — the role filter should use the Spanish labels
- The precompute script currently only tracks `entity_code` pairs — it needs to be refactored to also track which roles each entity plays in each shared document to produce role-pair counts per edge

</specifics>

<canonical_refs>
## Canonical References

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — GRAPH-01 through GRAPH-04: network graph requirements
- `.planning/ROADMAP.md` §Phase 9 — Success criteria, dependencies (Phase 4 + Phase 8)

### Pre-computed data
- `scripts/precompute-cooccurrence.js` — Current co-occurrence precompute script (outputs `entity-cooccurrence.json` with nodes and edges; needs extending with ForceAtlas2 x/y positions)
- `eleventy.config.js` line 20 — Passthrough copy rule for `data/entity-cooccurrence.json`

### Integration points
- `src/js/entity-explorer.js` — EntityExplorer class (Pagefind search/facets/pagination); the graph must integrate with this class's filter state
- `src/js/entity.js` — Entity detail page JS (timeline rendering); graph links navigate here
- `src/_data/ui.js` §roles — Spanish role labels (Productor, Colaborador, Editor, Materia, Mencionado) used in entity detail pages and needed for graph role filter checkboxes

### Prior phase context
- `.planning/phases/04-build-pipeline-data-pre-compute/04-CONTEXT.md` — Build pipeline decisions, co-occurrence precompute decisions
- `.planning/phases/08-entity-explorer-list-view/08-CONTEXT.md` — Entity explorer UI decisions, Pagefind integration

### Frontend guidelines
- `../docs/frontend/guidelines/` — Frontend design guidelines, design tokens, shared visual language

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/precompute-cooccurrence.js`: Already produces `{ nodes: [{id, label, type, count}], edges: [{source, target, weight}] }` — needs ForceAtlas2 extension to add `x`, `y` to each node
- `EntityExplorer` class in `src/js/entity-explorer.js`: Exposes filter state (`state.q`, `state.entity_type`, `state.primary_function`, `state.dateFilter`); the graph can subscribe to state changes
- Entity type colours from the explorer's CSS/facet chips: reusable for graph node colouring

### Established Patterns
- Place explorer: always-visible map panel above results, collapsible on mobile — exact pattern to replicate for the graph
- Pagefind integration: entity explorer uses Pagefind for search with URL state sync — the graph reads filter state but doesn't write to it
- Pre-computed data loaded via fetch at page load (entity shards, place index) — same pattern for co-occurrence JSON

### Integration Points
- The graph component will be instantiated on the entity explorer page, reading the same page's EntityExplorer filter state
- The co-occurrence JSON is already wired into the build via passthrough copy in `eleventy.config.js`
- ForceAtlas2 layout computation runs at build time (in the precompute script), not in the browser

</code_context>

<deferred>
## Deferred Ideas

- Two-way graph↔list binding (clicking a node filters the results list) — may revisit during visual verification
- 2-hop ego-network expansion — keep it at 1-hop for now, reassess if users find it limiting
- Graph search (type-to-find-node within the graph) — could be a future enhancement
- Community detection / cluster colouring — interesting but out of scope for initial implementation

</deferred>

---

*Phase: 09-entity-network-graph*
*Context gathered: 2026-03-29*
