# Phase 10: Explorer UX Redesign — Research

**Researched:** 2026-04-04
**Domain:** Entity/place explorer redesign — graph UX, prosopographical database patterns, curated network graphs, map tile providers, dynamic build-time data
**Confidence:** MEDIUM-HIGH (architecture well understood; reference site UX observations are subjective)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Graph panel rework**
- D-01: Keep entity network graph on the explorer page but rework as a curated starter graph — top 50–100 most-connected entities that loads fast on page open
- D-02: Ego-network expansion on click — clicking a node reveals 1-hop neighbours
- D-03: Deep-linking from entity detail pages — `/explorar/entidades/?nodo=entity_code` opens graph centred on that entity
- D-04: Research phase (10a) must study how prosopographical databases handle entity network exploration, graph navigation, and detail-to-explorer flow

**Explorer layout**
- D-05: Both explorers keep the sidebar+results layout — consistent with `/buscar/`
- D-06: Graph/map panel arrangement relative to sidebar+results deferred to post-research Figma exploration

**Research scope**
- D-07: Deep research before Figma — thorough survey producing a written research document
- D-08: Claude identifies reference sites (PROSOP, PASE, China Biographical Database, and others discovered during research)
- D-09: Research must address: (a) entity networks/graphs as discovery tools, (b) deep-linking between detail pages and explorers, (c) large entity sets (>10K) in search+browse interfaces

**Data and count refresh**
- D-10: Explorer intro text counts become dynamic from data — computed at build time from entities.json/places.json
- D-11: Place explorer data reflects 7,068 places (from 8,177)
- D-12: Fix Protomaps CDN basemap on place detail pages — map currently shows only burgundy dot, no tiles

**Phase sequencing**
- D-13: Three sub-phases: 10a (research report), 10b (Figma design), 10c (implementation)
- D-14: Each sub-phase produces a deliverable for the next

**Cleanup**
- D-15: Phase 9 graph dead code removed in 10c: `precompute-bipartite-graph.js`, `entity-doc-graph.json`, Sigma/graphology references, co-occurrence artefacts replaced by curated graph

### Claude's Discretion
- Graph rendering technology (force-graph CDN vs D3-force+SVG vs other)
- Exact curated graph size (50–100 nodes) and selection criteria (highest degree, most documents, editorial picks)
- Spanish number formatting for dynamic counts (use existing `numberFormat` filter or new approach)
- Protomaps vs OpenFreeMap standardisation decision for map tiles
- Visual polish details — typography, spacing, colour adjustments to match detail page designs

### Deferred Ideas (OUT OF SCOPE)
- Mobile-responsive redesign — separate future milestone; existing mobile collapse patterns stay
- Two-way graph-list binding (clicking a node filters results)
- Graph search (type-to-find-node within graph)
- Community detection / cluster colouring
- Standardise tile provider across all maps (beyond the Protomaps fix)
</user_constraints>

---

## Summary

Phase 10 is an UX redesign in three discrete sub-phases: research (10a), Figma design (10b), and implementation (10c). The primary technical challenges are: replacing the crashing full-graph on the entity explorer with a performant curated starter graph of 50–100 high-degree nodes with ego-network expansion and URL deep-linking; refreshing the place explorer data to 7,068 places; fixing the Protomaps CDN basemap on place detail pages (the CDN URL `cdn.protomaps.com/basemaps/v4/en.json` is stale — the current API requires an API key or static JSON); and making explorer intro text counts dynamic from build-time data.

The entity explorer crashes because it tries to build a bipartite graph from all ~83K entity link shards fetched on the fly. The curated graph approach pre-computes a small JSON file (the top 50–100 entities by document co-occurrence degree) at build time with ForceAtlas2 positions baked in — so the graph loads instantly from a static file and never triggers per-entity shard fetches on page load.

**Primary recommendation:** Build a new `precompute-curated-graph.js` script (adapting the existing `precompute-cooccurrence.js` and `precompute-bipartite-graph.js` patterns) that selects the top N entities by linked_description_count from entity-index.json, builds their co-occurrence subgraph, runs ForceAtlas2, and writes `data/curated-entity-graph.json`. Replace the current `EntityNetworkGraph` class with a new `CuratedEntityGraph` class that (a) loads this file once, (b) reads `?nodo=` from the URL on init to centre on a specific node, and (c) handles ego-network expansion for click. Fix the place detail page map by switching from `cdn.protomaps.com/basemaps/v4/en.json` to `https://tiles.openfreemap.org/styles/liberty` — the same provider already working in the place explorer.

---

## Prosopographical Database Reference Survey

### D-09(a): How comparable systems present entity networks as discovery tools

**PASE (Prosopography of Anglo-Saxon England)** — pase.ac.uk

PASE uses a three-panel layout: Search Column (left), Results List (middle), Record Display (right). No graph visualisation is provided for discovery. Navigation is entirely search-and-filter driven. Entity detail pages show structured factoids (events, roles, dates) but link to other entities only through text hyperlinks within factoids — no visual network. The interface is dense and database-like, designed for specialist researchers who arrive with specific names in mind. Confidence: MEDIUM (based on official site; the live database at pase.ac.uk/pase/ requires login for full access).

**SNAC (Social Networks and Archival Context Cooperative)** — snaccooperative.org

SNAC is the most directly comparable system. It provides CPF (Corporate Bodies, Persons, Families) authority records linked to archival collections. Key interface features:
- Entity search returns a list; clicking through to an entity detail page shows a structured record
- The "Relationships" tab on detail pages lists related entities (textually)
- A "Connection Graph" (radial graph view) visualises the entity's social network — directly navigable from the detail page
- The radial graph is limited to direct connections from the focal entity, not a full network browse
- Deep-linking: the graph view is accessed from the entity's own page, not from an explorer — it is a detail-page feature, not a separate explorer mode
- No "start from a global graph and zoom in" pattern — SNAC's graph is always ego-centric and triggered from a detail page

This is significant for D-03: SNAC treats the graph as a detail-page feature. Zasqua's design (graph on the explorer with URL-driven centring) is a more advanced pattern that combines global browse with deep-linking. Confidence: MEDIUM (based on public documentation; full SNAC interface fetched but returned a redirect error — observations from documentation and search results).

**China Biographical Database (CBDB)** — projects.iq.harvard.edu/cbdb

CBDB is a relational database for pre-modern China with 535K individuals (2024 release). The primary interface is a desktop application (FileMaker-based). The web interface supports text search. Social network and spatial analyses are described in academic papers as being done with external tools (exported data → Gephi, QGIS) rather than in-browser. No interactive network graph in the web explorer. Confidence: MEDIUM (based on official project documentation and published articles).

**PROSOP** (Byzantine prosopography) — not a single live URL; multiple projects

Byzantine prosopography is distributed across several databases (PBW — Prosopography of the Byzantine World at pbw.kcl.ac.uk, PmbZ — Prosopographie der mittelbyzantinischen Zeit). PBW provides text search and list navigation. No interactive network graph in current version. Research uses exported data with external network tools.

**Key pattern across all four systems:** None of the major prosopographical databases provide an interactive in-browser network graph as a *browse/explorer* entry point. SNAC comes closest with a radial graph on detail pages. The pattern is: search → list → detail → (optionally) graph from detail. Zasqua's design — a curated starter graph on the explorer page that deep-links from detail pages — is more ambitious than any existing reference system and represents original UX design work.

### D-09(b): Deep-linking patterns between detail pages and explorers

Common patterns found across archival and digital humanities systems:

| Pattern | Example | Mechanism |
|---------|---------|-----------|
| Detail → related list | PASE, SNAC | Hyperlink to search pre-filtered by entity |
| Detail → ego graph | SNAC, some Gephi-based DH projects | Tab or button on detail page opens graph view |
| URL state for graph centre | Custom implementations | `?node=X` or `?focus=X` query parameter |
| Breadcrumb back to explorer | Standard | Browser history / explicit "Back to explorer" link |

For Zasqua D-03, the URL parameter pattern (`?nodo=entity_code`) is technically straightforward and well-established. The key implementation detail: the `CuratedEntityGraph` class must read `?nodo=` on init and, if the requested entity is NOT in the curated graph (it may be outside the top 100), fetch its ego-network from the entity-link shards and merge it into the display — or show a graceful fallback ("Esta entidad no está en la vista de red curada. Ver ficha completa."). This is a real edge case that needs a plan-time decision.

### D-09(c): Large entity sets (>10K) in search+browse interfaces

The standard approach across all reviewed systems:

1. **Never render all records to DOM** — Zasqua already does this correctly with Pagefind pagination (EEXP-03 complete)
2. **Pagefind with 83K entities works** — Pagefind's index is pre-built; search is client-side but operates against a compact index, not DOM nodes. Current entity explorer pagination (20 per page) is appropriate.
3. **Graph must never attempt to show all entities** — The crash is caused by the bipartite graph fetching shards for all ~83K entities. The curated graph is the correct fix: a static pre-computed JSON with 50–100 nodes loads in < 100ms.

The "generous interface" framework (Whitelaw, DHQ 2015) is directly applicable here. Key principle: rather than presenting a blank search box, show an overview of the collection — the curated graph IS that overview. It surfaces the most connected entities as entry points, supporting serendipitous discovery before users have formed a search query.

---

## Standard Stack

### Core (already in use — no changes)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| force-graph (vasturiano) | 1.51.2 (current) | 2D canvas force-directed graph | CDN-loaded in entidades.njk |
| graphology | 0.26.0 | Graph data structure | Already installed (package.json devDeps) |
| graphology-layout-forceatlas2 | 0.10.1 | ForceAtlas2 layout at build time | Already installed |
| MapLibre GL JS | 5.x | Interactive maps | CDN-loaded in lugares.njk |
| Pagefind | (via npx pagefind) | Client-side search | Build tool |
| Eleventy 3 | ^3.1.2 | Static site generator | Project core |

### To add
| Library | Version | Purpose | How to add |
|---------|---------|---------|------------|
| graphology-metrics | 2.4.0 | Degree/centrality computation for curated graph selection | `npm install --save-dev graphology-metrics` (build-time only) |

**Version verification (confirmed 2026-04-04):**
- `force-graph` npm latest: **1.51.2**
- `graphology-metrics` npm latest: **2.4.0**
- `graphology` installed: 0.26.0 (current for this version series)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| force-graph CDN | D3-force + SVG | D3 gives more control; force-graph canvas is faster for 100+ nodes; force-graph already in codebase |
| force-graph CDN | Sigma.js + graphology | Sigma is more feature-rich but was part of the abandoned Phase 9 bipartite approach; adds complexity |
| OpenFreeMap (liberty) | Self-hosted PMTiles + Protomaps style | Self-hosting removes CDN dependency but requires Cloudflare Worker changes; OpenFreeMap works now |

---

## Architecture Patterns

### Curated Graph: Build-Time Precompute

The curated starter graph is pre-computed at build time. The script reads `entity_links.json` (already available in `data/`), selects the top N entities by co-occurrence degree, builds their subgraph, runs ForceAtlas2, and outputs `data/curated-entity-graph.json` with baked-in `x`/`y` positions.

```
scripts/
├── precompute-curated-graph.js   ← NEW: replaces precompute-bipartite-graph.js
├── precompute-links.js           ← existing (entity/place link shards)
├── precompute-cooccurrence.js    ← existing (may be removed in 10c cleanup)
└── precompute-bipartite-graph.js ← TO REMOVE in 10c cleanup (D-15)
```

Output format (extends existing co-occurrence script pattern):
```json
{
  "generated_at": "ISO8601",
  "top_n": 100,
  "node_count": 100,
  "edge_count": N,
  "nodes": [
    { "id": "entity_code", "label": "Display Name", "type": "person", "degree": 4521, "x": 12.3, "y": -45.6 }
  ],
  "edges": [
    { "source": "entity_code_a", "target": "entity_code_b", "weight": 42 }
  ]
}
```

Positions are pre-computed so `force-graph` can load with `cooldownTicks(0)` — simulation never runs in browser, graph appears instantly in final layout.

### CuratedEntityGraph Class Pattern

```javascript
// Source: force-graph API docs — vasturiano/force-graph GitHub
class CuratedEntityGraph {
  async init() {
    const data = await fetch('/data/curated-entity-graph.json').then(r => r.json());

    this.fg = new ForceGraph(this.container)
      .graphData(data)
      .cooldownTicks(0)               // Use pre-computed positions — no simulation
      .nodeId('id')
      .nodeLabel(node => node.label)
      .onNodeClick(node => this._onNodeClick(node));

    // Check for ?nodo= URL parameter
    const params = new URLSearchParams(window.location.search);
    const centreCode = params.get('nodo');
    if (centreCode) this._centreOnEntity(centreCode);
  }

  _centreOnEntity(code) {
    const node = this._findNode(code);
    if (node) {
      // force-graph API: centerAt(x, y, transitionMs) + zoom(level, ms)
      this.fg.centerAt(node.x, node.y, 800).zoom(4, 800);
    }
    // If node not in curated set — show fallback message
  }
}
```

### URL Deep-Linking Pattern

Entity detail page adds a button:
```html
<!-- In src/entidad.njk — links to explorer centred on this entity -->
<a href="/explorar/entidades/?nodo={{ entity.entity_code }}">
  Explorar en la red de entidades
</a>
```

The entity explorer's `EntityExplorer` init reads `?nodo=` only at startup; it does not affect Pagefind search state. The graph and explorer states are independent.

### Dynamic Build-Time Counts

The `numberFormat` Eleventy filter already exists (`eleventy.config.js` line 72). The data loaders (`entities.js`, `places.js`) already return arrays. Counts are derivable in templates:

```nunjucks
{# entidades.njk — replaces hardcoded "92.042" #}
<p>Explora las {{ entities | length | numberFormat }} entidades vinculadas...</p>

{# lugares.njk — replaces hardcoded "8.177" #}
<p>Explora los {{ places | length | numberFormat }} lugares vinculados...</p>
```

This works because `entities` and `places` are global Eleventy data available in all templates. In DEV_MODE, these will be truncated (100 records) — the count will reflect DEV_MODE correctly.

### Protomaps CDN Fix

**Problem:** `place.js` (map init IIFE) uses `style: 'https://cdn.protomaps.com/basemaps/v4/en.json'` — this CDN endpoint is stale. The current Protomaps API (`api.protomaps.com`) requires an API key; the free CDN URL is no longer maintained.

**Fix:** Replace with OpenFreeMap liberty style — the same provider already working in `place-explorer.js` (line 215):

```javascript
// In src/js/place.js — map init IIFE (line 304)
// BEFORE (broken):
style: 'https://cdn.protomaps.com/basemaps/v4/en.json',

// AFTER (working — matches place-explorer.js):
style: 'https://tiles.openfreemap.org/styles/liberty',
```

OpenFreeMap is free, self-sustaining via sponsorship, no API key required, and confirmed working in the place explorer. This is a one-line fix. The style is visually neutral and consistent.

### Anti-Patterns to Avoid

- **Fetching entity shards on explorer page load** — this was what crashed browsers. The curated graph must load a single pre-computed JSON, never individual shard files.
- **`cooldownTicks(Infinity)` or high `cooldownTime`** with pre-computed positions — always set `cooldownTicks(0)` when positions are baked in; otherwise the simulation will jitter and override them.
- **Setting `fx`/`fy` after graphData()** — for pre-computed layouts, set `fx` and `fy` directly on node objects in the JSON data so force-graph treats them as pinned nodes immediately.
- **Hardcoded entity/place counts in templates** — decision D-10 mandates build-time computation; never go back to hardcoded numbers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph layout | Custom force simulation in browser | Pre-compute with graphology-layout-forceatlas2 at build time | ForceAtlas2 runs in Node.js in seconds; browser layout of 100 nodes is instant when positions are pre-baked |
| Degree/centrality for top-N selection | Custom node degree counting loop | `graphology-metrics` weighted degree | Handles edge weights correctly; already used conceptually in precompute-bipartite-graph.js |
| Map tile serving | Self-hosted Protomaps tiles | OpenFreeMap `tiles.openfreemap.org/styles/liberty` | Already proven in place-explorer.js; zero infrastructure change |
| Client-side search over 83K entities | Custom index | Pagefind (already built) | Already complete (EEXP-01/02/03) |

**Key insight:** The precompute pipeline already exists in two scripts (`precompute-cooccurrence.js`, `precompute-bipartite-graph.js`). The curated graph script is a focused combination: take the top-N-by-degree selection from `precompute-bipartite-graph.js` and the ForceAtlas2 layout from `precompute-cooccurrence.js`.

---

## Common Pitfalls

### Pitfall 1: Entity not in curated graph — deep link fails silently
**What goes wrong:** User clicks "Explorar en la red" from an entity detail page. That entity is rank #5,000 by degree and not in the curated graph. `_centreOnEntity()` finds no node, does nothing, and the graph shows the default view with no indication of the requested entity.
**Why it happens:** The curated graph only has 50–100 of 83K entities.
**How to avoid:** When `?nodo=` resolves to a node not in the curated set, display a clear message: "Esta entidad no aparece en la vista de red curada (muestra las entidades con más vínculos). Ver todas sus conexiones desde la ficha." Link back to the entity detail page.
**Warning signs:** Deep-linking tested only with top-degree entities; testing with a low-degree entity reveals silent failure.

### Pitfall 2: Force-graph simulation runs on pre-computed positions
**What goes wrong:** Nodes have pre-computed `x`/`y` from ForceAtlas2 in the JSON. But if they are not also set as `fx`/`fy` (pinned), the D3 simulation will run and move them from their intended positions during the warm-up frames.
**Why it happens:** force-graph's D3 simulation treats `x`/`y` as initial positions but `fx`/`fy` as fixed (pinned) positions. With `cooldownTicks(0)`, the simulation never runs and `x`/`y` suffice. But if `cooldownTicks` is not set to 0, the simulation fires.
**How to avoid:** Either (a) set `cooldownTicks(0)` consistently, or (b) store positions as both `x`/`y` and `fx`/`fy` in the JSON output.

### Pitfall 3: OpenFreeMap rate limits at build time
**What goes wrong:** The build pipeline pings `tiles.openfreemap.org` to load map tiles for SSR screenshots or similar. In practice, Eleventy does not pre-render the MapLibre map — it is client-side. There is no build-time HTTP request to OpenFreeMap.
**Why it happens:** N/A — this is not a real risk for the current architecture.
**How to avoid:** Confirmed non-issue. OpenFreeMap is client-side only.

### Pitfall 4: Hardcoded entity count in Pagefind meta stale
**What goes wrong:** The intro text count is updated to dynamic (D-10), but Pagefind meta or page titles still contain hardcoded numbers (e.g., "92.042" appears in the page title or other elements).
**Why it happens:** The count appears multiple times in entidades.njk and lugares.njk.
**How to avoid:** Grep for hardcoded numbers (`92.042`, `8.177`, `92042`, `8177`) in all template and CSS files before closing 10c.

### Pitfall 5: DEV_MODE entity/place count discrepancy
**What goes wrong:** With DEV_MODE=true, `entities` array is capped at 100. The dynamic count `{{ entities | length | numberFormat }}` displays "100" in local dev builds, confusing anyone testing.
**Why it happens:** DEV_MODE intentionally limits arrays for fast local builds.
**How to avoid:** Add a note in the template: this is expected behaviour. Do not add special-case logic to override it — the count is correct for the data available in that build mode.

---

## Code Examples

### Curated graph precompute — node selection
```javascript
// Source: adapts precompute-bipartite-graph.js (scripts/) + entity-index.json pattern

const entityIndex = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'entity-index.json'), 'utf8'));
// entity-index.json: [{ entity_code, linked_description_count, ... }]

const topEntities = entityIndex
  .sort((a, b) => b.linked_description_count - a.linked_description_count)
  .slice(0, TOP_N)
  .map(e => e.entity_code);

const topSet = new Set(topEntities);
```

### force-graph: pre-computed positions + cooldown
```javascript
// Source: vasturiano/force-graph API — nodeId, graphData, cooldownTicks, centerAt, zoom

// Nodes in JSON should have: { id, label, type, x, y, fx, fy }
// Setting fx/fy pins nodes so simulation cannot move them
this.fg = new ForceGraph(container)
  .graphData({ nodes, links })
  .cooldownTicks(0)           // No simulation frames rendered
  .d3AlphaDecay(1)            // Belt-and-suspenders: simulation decays immediately
  .nodeId('id');
```

### force-graph: centre on node
```javascript
// Source: vasturiano/force-graph API — centerAt(x, y, ms), zoom(level, ms)

_centreOnEntity(code) {
  const node = this.graphData.nodes.find(n => n.id === code);
  if (!node) {
    this._showMessage(`Esta entidad no está en la vista de red curada.`);
    return;
  }
  this.fg.centerAt(node.x, node.y, 800);
  this.fg.zoom(5, 800);
  // Optionally highlight the node
  this._highlightNode(code);
}
```

### Nunjucks dynamic count
```nunjucks
{# entidades.njk — D-10 #}
<p class="text-stone-600 text-base" style="margin-bottom: 1.5rem">
  Explora las {{ entities | length | numberFormat }} entidades vinculadas a las descripciones de Zasqua. Busca por nombre, filtra por tipo de entidad o por rango de fechas.
</p>
```

### OpenFreeMap fix in place.js
```javascript
// Source: OpenFreeMap quick_start docs — https://openfreemap.org/quick_start/
// Already used in src/js/place-explorer.js line 215

var map = new maplibregl.Map({
  container: 'place-map',
  style: 'https://tiles.openfreemap.org/styles/liberty',  // was: cdn.protomaps.com/...
  center: [lon, lat],
  zoom: 7
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Full bipartite graph from live shard fetches | Pre-computed curated graph JSON | Eliminates browser crash; instant load |
| Hardcoded entity/place counts | Build-time `{{ entities \| length \| numberFormat }}` | Always accurate |
| `cdn.protomaps.com/basemaps/v4/en.json` (stale) | `tiles.openfreemap.org/styles/liberty` | Map tiles load correctly on place detail pages |
| Explorer graph reflects current search results | Explorer shows fixed curated starter graph | Predictable, fast entry point; exploration via ego-expansion |

**Deprecated/outdated:**
- `cdn.protomaps.com/basemaps/v4/en.json`: The Protomaps free CDN endpoint is no longer maintained. The API now requires a key (`api.protomaps.com`). Use OpenFreeMap.
- `precompute-bipartite-graph.js`: This script computed a bipartite (entity+document) graph from top-N entities. The curated graph is entity-only (no document nodes) for the explorer. Remove in 10c (D-15).
- `precompute-cooccurrence.js`: Built a full co-occurrence graph (still large). Replace with focused `precompute-curated-graph.js`. Remove in 10c (D-15).
- `entity-doc-graph.json`: Output of bipartite precompute. No longer needed. Remove in 10c (D-15).
- `eleventyConfig.addPassthroughCopy({ "data/entity-doc-graph.json": ... })` in eleventy.config.js: Remove in 10c.

---

## UX Research Findings for Figma (10b inputs)

These findings from the reference survey and "generous interfaces" research should directly inform the Figma design phase.

### For the entity explorer graph panel

1. **Curated overview as entry point** (from Whitelaw's generous interfaces framework): Show a visual overview of the collection's most connected entities before the user types a search query. The graph IS the "generous" entry point — it shows what the collection contains without demanding a search term.

2. **Ego-network pattern** (from SNAC): Clicking a node should expand to show that entity's direct connections (1-hop neighbours), not navigate away. Users should be able to explore outward from any node without losing their place.

3. **Detail-page-to-explorer link** (from SNAC model, extended): SNAC puts the graph on the detail page. Zasqua inverts this: the explorer has the graph, and the detail page links into it. This requires the `?nodo=` deep-link to be clearly surfaced on entity detail pages — a button or link that reads something like "Explorar en la red de entidades".

4. **Graph + list as two independent panels**: The graph and the results list serve different discovery modes (visual/relational vs. sequential/textual). They should not need to stay in sync. Clicking a graph node can navigate to an entity detail page; it should not necessarily filter the results list below.

5. **Panel sizing**: For a sidebar+results layout (D-05), the graph panel likely sits above the results list (full width) or to the right of the sidebar (in the 35/65 zone). The Figma phase should explore both. Reference: entity detail page uses 35/65 consistently.

### For the place explorer

1. **Map + list complement each other**: The heatmap serves spatial discovery; the list serves name-based search. Both are already implemented. Visual polish and coherence with detail page design is the focus.

2. **7,068 places vs 8,177**: The count fix is a data update + dynamic template change, not a UX redesign. The map and facets do not need structural changes.

---

## Open Questions

1. **What if `?nodo=` points to an entity not in the curated graph?**
   - What we know: The curated graph has 50–100 of 83K entities; most entities will not be in it
   - What's unclear: Should the explorer attempt to fetch and display that entity's ego-network from shards on demand? Or just show a message and link back to the detail page?
   - Recommendation: For 10c, implement the graceful fallback (message + link). On-demand ego-network loading from shards can be a future enhancement — it reintroduces the per-shard fetch pattern that caused the crash and needs careful throttling.

2. **What is the exact curated graph size: 50 or 100 nodes?**
   - What we know: D-01 says "50–100"; the precompute-bipartite-graph.js used `TOP_ENTITIES=30` as default; at 100 nodes with ForceAtlas2-computed positions the graph is likely readable
   - What's unclear: Graph legibility at 50 vs 100 nodes without actual data to test
   - Recommendation: Default to 100 in the precompute script (configurable via env var), let the Figma phase inform whether to reduce. The script can be rerun with different N at any time.

3. **Should `eleventy.config.js` passthrough for `entity-doc-graph.json` be removed in 10c or immediately?**
   - What we know: The file likely doesn't exist in `data/` currently (D-15 says it should be cleaned up in 10c); the passthrough copy is harmless if the source file doesn't exist
   - Recommendation: Remove in 10c cleanup wave alongside the other dead code (D-15).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build scripts | ✓ | v22.17.0 | — |
| graphology | Curated graph script | ✓ | 0.26.0 (installed) | — |
| graphology-layout-forceatlas2 | Curated graph script | ✓ | 0.10.1 (installed) | — |
| graphology-metrics | Curated graph script (degree) | ✗ | — | Hand-roll degree count (simple loop, already exists in precompute-bipartite-graph.js) |
| force-graph (CDN) | Entity explorer graph | ✓ | 1.51.2 (CDN) | — |
| MapLibre GL (CDN) | Place explorer map | ✓ | 5.x (CDN) | — |
| OpenFreeMap tiles | Place detail page map | ✓ | Active (no key required) | — |
| Pagefind | Entity/place search | ✓ | (via npx) | — |

**Missing dependencies with fallback:**
- `graphology-metrics` (degree computation): The `precompute-bipartite-graph.js` already implements a degree count loop manually (lines 47–54). That pattern can be reused directly in `precompute-curated-graph.js` without installing the package. However, installing graphology-metrics is preferable for correctness with weighted degrees.

---

## Project Constraints (from CLAUDE.md)

- **No co-author in commits** — keep commit messages short, no emojis
- **Pull before commits** — always pull before making commits
- **Consult guidelines first** — read `../docs/frontend/guidelines/` before implementation; especially `design-tokens.md` and `frontend-design.md`
- **Spanish style** — follow Colombian Spanish style guide for all Spanish-language UI strings; ISAD(G) terminology from `src/_data/ui.js`
- **Present drafts before committing** — all doc/translation changes need review before commit
- **No GSD artefacts in public repo** — `zasqua-frontend/` never receives `.planning/`, `CLAUDE.md`, or AI artefacts
- **Stack constraint** — Eleventy 3, Nunjucks, Pagefind, Cloudflare R2/Worker; Tailwind v4 standalone CLI
- **Porting** — at end of Phase 10 milestone, remind user to port to `zasqua-frontend/` and wait for approval

---

## Sources

### Primary (HIGH confidence)
- `src/js/entity-network-graph.js` — Current graph class, 463 lines, read in full
- `src/js/entity-explorer.js` — Entity explorer class (first 100 lines)
- `src/js/place.js` — Place detail page JS (map init IIFE); confirmed broken Protomaps URL at line 304
- `src/js/place-explorer.js` — Confirmed OpenFreeMap URL at line 215
- `scripts/precompute-cooccurrence.js` — ForceAtlas2 build-time pattern confirmed
- `scripts/precompute-bipartite-graph.js` — Degree-selection pattern confirmed
- `eleventy.config.js` — `numberFormat` filter confirmed at line 72; passthrough copies confirmed
- `package.json` — Confirmed: graphology 0.26.0, graphology-layout-forceatlas2 0.10.1 installed; graphology-metrics NOT installed
- vasturiano/force-graph GitHub — `centerAt()`, `zoom()`, `cooldownTicks()`, `fx`/`fy` pinning API confirmed; current version 1.51.2
- OpenFreeMap quick_start — `tiles.openfreemap.org/styles/liberty` confirmed as current free style URL
- Protomaps API docs — `cdn.protomaps.com` endpoint not mentioned; `api.protomaps.com` requires API key; free CDN is deprecated

### Secondary (MEDIUM confidence)
- PASE documentation (pase.ac.uk, Wikipedia, MDR) — three-panel layout, no graph visualisation
- SNAC documentation (prologue.blogs.archives.gov, Wikipedia, Minitex) — radial graph from detail page, CPF relationships tab
- CBDB documentation (openhumanitiesdata.metajnl.com article, Digital Orientalist 2024 interview) — no in-browser graph; external tools
- DHQ "Generous Interfaces" (Whitelaw 2015, dhq.digitalhumanities.org) — overview-first principle, browsing as fundamental information behaviour

### Tertiary (LOW confidence)
- WebSearch results for PASE graph exploration features — limited; full PASE database requires login
- graphology-metrics npm listing — degree centrality API confirmed but no code examples for top-N extraction verified against official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed via package.json, npm registry, and live CDN URLs
- Architecture (curated graph): HIGH — pattern is a direct adaptation of two existing working scripts
- Protomaps fix: HIGH — root cause confirmed (stale CDN URL); fix confirmed (OpenFreeMap URL already working in place-explorer.js)
- Dynamic counts: HIGH — numberFormat filter and entities/places data loaders confirmed
- Reference site UX patterns: MEDIUM — SNAC and PASE observations from documentation, not full live interface audit
- Generous interfaces framework: HIGH — primary source read in full (DHQ article)

**Research date:** 2026-04-04
**Valid until:** 2026-07-04 (stable stack; OpenFreeMap is a community service — monitor for changes)
