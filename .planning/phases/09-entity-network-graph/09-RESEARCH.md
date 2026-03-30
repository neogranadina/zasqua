# Phase 9: Entity Network Graph — Research

**Researched:** 2026-03-29
**Domain:** Sigma.js v3 / graphology graph visualisation, ForceAtlas2 layout precompute, Eleventy passthrough JS
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Graph always visible on entity explorer page — not toggled, not a tab (same pattern as place explorer heatmap)
- **D-02:** On initial load, graph shows ~100 most-connected entities (highest edge degree) as starter network
- **D-03:** Loads full `entity-cooccurrence.json` once on page load; subsets client-side
- **D-04:** Single click expands 1-hop ego-network — immediate co-occurring neighbours appear
- **D-05:** Double-click navigates to `/entidad/{code}/`
- **D-06:** Ego-network expansion is 1-hop only
- **D-07:** Hover shows tooltip with entity name and document count
- **D-08:** One-way sync — search/facet changes highlight matching nodes; non-matching nodes fade but remain visible
- **D-09:** Clicking a graph node does NOT filter the results list
- **D-10:** One-way approach used for now; may revisit during visual verification
- **D-11:** Edges carry role-pair counts — precompute script outputs per-edge role-pair counts (e.g. `{ "creator|subject": 3 }`)
- **D-12:** Edges visually coded by role pair (colours Claude's discretion, defined in UI-SPEC)
- **D-13:** Edge tooltip shows full role breakdown
- **D-14:** Role filter checkboxes live inside graph panel: Productor, Colaborador, Editor, Materia, Mencionado
- **D-15:** When all edges for a node are hidden by role filters, that node fades/hides (no orphan nodes)
- **D-16:** Node radius scales with document count
- **D-17:** Node colour maps to entity type (person, corporate_body, family) — same colours as entity explorer type facet chips
- **D-18:** Edge thickness scales with co-occurrence weight
- **D-19:** Desktop: graph panel sits above results list at full width; Mobile: collapsible
- **D-20:** Mobile collapse toggle reuses `.mobile-filter-toggle` pattern from place explorer
- **D-21:** Sigma.js v3 for WebGL rendering; graphology for graph data model
- **D-22:** ForceAtlas2 layout positions stored in co-occurrence JSON — precompute script extended to run ForceAtlas2 and write x/y per node
- **D-23:** Precompute script extended to output role-pair counts per edge

### Claude's Discretion

- Graph container height and aspect ratio
- Exact tooltip styling and positioning (resolved in UI-SPEC: stone-100 bg, shadow `0 2px 8px rgba(0,0,0,0.12)`)
- Zoom/pan controls and reset button design (resolved in UI-SPEC: `Restablecer vista` pill button, top-right)
- Animation timing for ego-network expansion (resolved in UI-SPEC: 300ms ease-out camera zoom-to-fit)
- Edge colour and opacity values (resolved in UI-SPEC: per-role-pair palette)
- Transition from ~100 starter nodes to filter-driven subgraph (resolved in UI-SPEC: suppress non-matching in place, no node set replacement)

### Deferred Ideas (OUT OF SCOPE)

- Two-way graph↔list binding (clicking a node filters the results list)
- 2-hop ego-network expansion
- Graph search (type-to-find-node within the graph)
- Community detection / cluster colouring
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRAPH-01 | Entity explorer includes a network graph showing entity co-occurrence through shared documents | Sigma.js v3 CDN + graphology CDN; graph panel above results list; co-occurrence JSON already wired via passthrough copy |
| GRAPH-02 | Graph uses pre-computed ForceAtlas2 layout positions (no browser-side force simulation) | `graphology-layout-forceatlas2` for precompute script (Node.js only); x/y positions written to JSON at build time |
| GRAPH-03 | User can click a graph node to expand its ego-network (immediate neighbours) | `sigma.on("clickNode")` event; nodeReducer/edgeReducer for visual suppression; `sigma.getCamera().animate()` for zoom-to-fit |
| GRAPH-04 | Graph filters in sync with the entity explorer search/facet state | EntityExplorer exposes `this.state`; graph subscribes by observing popstate + custom event; nodeReducer recalculates on state change |
</phase_requirements>

---

## Summary

Phase 9 adds a network graph panel to the entity explorer page (`/explorar/entidades/`). The graph renders entity co-occurrence data using Sigma.js v3 (WebGL) with graphology as the graph data model. Layout positions are pre-computed at build time by the `scripts/precompute-cooccurrence.js` script using `graphology-layout-forceatlas2`, so no force simulation runs in the browser.

The key integration challenge is hooking the graph into the EntityExplorer class's filter state without modifying its internals, since the EntityExplorer rebuilds its entire DOM on each `renderSearchResults()` call. The graph must live outside that rebuild cycle — mounted once to a stable container element above the entity explorer's `#entity-explorer` div.

The project has no bundler. All JavaScript is served as passthrough files from `src/js/`. Heavy libraries (MapLibre GL is the established precedent) are loaded from jsDelivr CDN via `<script>` tags. Sigma v3 exposes `window.Sigma` as a UMD global; graphology exposes `window.graphology` as a UMD global. The `@sigma/utils` package (`fitViewportToNodes`) has no UMD bundle, so camera zoom-to-fit must be implemented manually using `sigma.getCamera().animate()`.

The precompute script currently tracks only entity code pairs without role information. It must be extended in two ways: (1) capture per-edge role-pair counts from the `role` field in `entity_links.json`; (2) run ForceAtlas2 with `graphology-layout-forceatlas2` and write `x`, `y` per node.

**Primary recommendation:** Mount `EntityNetworkGraph` as a standalone class on the entidades page. Load sigma + graphology via jsDelivr CDN `<script>` tags. Extend the precompute script before any frontend work begins.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sigma | 3.0.2 | WebGL graph renderer | Locked by D-21; handles 1K–100K nodes at 60fps; ships UMD bundle (`sigma.min.js`) |
| graphology | 0.26.0 | Graph data model (nodes/edges/attributes) | sigma's required companion; ships UMD bundle (`graphology.umd.min.js`) |
| graphology-layout-forceatlas2 | 0.10.1 | ForceAtlas2 synchronous layout (precompute script only) | Locked by D-22; Node.js only; not loaded in browser |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| graphology-utils | 2.5.2 | Bundled with sigma (peer dep) — graph traversal utilities | `subgraph()` for ego-network construction |
| events | 3.3.0 | Bundled with sigma (peer dep) | No direct use needed in browser |

### Not Used (rationale)

| Library | Why Excluded |
|---------|-------------|
| @sigma/utils | No UMD bundle — cannot be loaded as CDN script tag |
| graphology-layout-random | Not needed — ForceAtlas2 positions come from precompute JSON |
| graphology-communities-louvain | Deferred (community detection out of scope) |
| graphology-layout-forceatlas2 (browser) | Locked out of scope — D-22 mandates precomputed positions only |

**Version verification (npm registry, 2026-03-29):**
- `sigma`: 3.0.2 (latest tag)
- `graphology`: 0.26.0 (latest tag)
- `graphology-layout-forceatlas2`: 0.10.1 (latest tag)
- `graphology-utils`: 2.5.2 (latest tag)

**Installation (precompute script only — not for browser bundle):**
```bash
npm install --save-dev graphology graphology-layout-forceatlas2
```

**CDN loading (browser — add to `entidades.njk` `{% block head %}`):**
```html
<script src="https://cdn.jsdelivr.net/npm/graphology@0.26.0/dist/graphology.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sigma@3.0.2/dist/sigma.min.js"></script>
```

---

## Architecture Patterns

### Recommended Project Structure

```
scripts/
  precompute-cooccurrence.js   # extend with ForceAtlas2 + role-pair counts
src/
  js/
    entity-network-graph.js    # new — EntityNetworkGraph class
  explorar/
    entidades.njk              # add CDN script tags + graph container + graph init
  css/
    input.css                  # add .graph-panel, .graph-canvas, .graph-tooltip, etc.
data/
  entity-cooccurrence.json     # extended schema: nodes get x/y, edges get role_pairs
```

### Pattern 1: Precompute Script Extension

**What:** Extend `scripts/precompute-cooccurrence.js` to:
1. Track which roles each entity plays per shared description
2. Output per-edge `role_pairs` object alongside total `weight`
3. Run ForceAtlas2 and write `x`, `y` to each node

**Extended JSON schema:**
```javascript
// nodes (extended)
{ id, label, type, count, x, y }

// edges (extended)
{ source, target, weight, role_pairs: { "creator|subject": 3, "creator|mentioned": 2 } }
```

**ForceAtlas2 in precompute script:**
```javascript
const Graph = require('graphology');
const forceAtlas2 = require('graphology-layout-forceatlas2');
const circularLayout = require('graphology-layout/circular'); // or manual random init

// After building filteredEdges and nodes:
const layoutGraph = new Graph();
for (const node of nodes) {
  layoutGraph.addNode(node.id, { x: Math.random(), y: Math.random(), size: 1 });
}
for (const edge of filteredEdges) {
  if (!layoutGraph.hasEdge(edge.source, edge.target)) {
    layoutGraph.addEdge(edge.source, edge.target, { weight: edge.weight });
  }
}

// Infer sensible settings and run synchronous layout
const settings = forceAtlas2.inferSettings(layoutGraph);
forceAtlas2.assign(layoutGraph, { iterations: 150, settings, getEdgeWeight: 'weight' });

// Extract positions back into nodes array
for (const node of nodes) {
  const attrs = layoutGraph.getNodeAttributes(node.id);
  node.x = attrs.x;
  node.y = attrs.y;
}
```
Source: [graphology-layout-forceatlas2 docs](https://graphology.github.io/standard-library/layout-forceatlas2.html)

**Role-pair tracking:**
```javascript
// In the group-by-description loop, track roles per entity per description
const byDescription = new Map();
for (const link of entityLinks) {
  const refCode = link.reference_code;
  if (!byDescription.has(refCode)) byDescription.set(refCode, []);
  byDescription.get(refCode).push({ code: link.entity_code, role: link.role });
}

// In the edge-pair emission loop, also record role pairs
for (let i = 0; i < unique.length; i++) {
  for (let j = i + 1; j < unique.length; j++) {
    const a = unique[i]; const b = unique[j];
    const key = a.code < b.code ? `${a.code}|${b.code}` : `${b.code}|${a.code}`;
    // Normalise role pair alphabetically
    const roles = [a.role, b.role].sort().join('|');
    // Accumulate
    if (!edgeRolePairs.has(key)) edgeRolePairs.set(key, {});
    const pairs = edgeRolePairs.get(key);
    pairs[roles] = (pairs[roles] || 0) + 1;
  }
}
```

### Pattern 2: EntityNetworkGraph Class

**What:** Standalone JS class mounted on the entity explorer page. Does not extend EntityExplorer. Communicates through observing URL state (popstate event) + polling EntityExplorer state.

**Instantiation in `entidades.njk`:**
```html
{# Graph container — above the #entity-explorer div #}
<div id="entity-graph-panel" class="graph-panel">
  {# mobile toggle, heading, role filters, canvas — all built by EntityNetworkGraph #}
</div>

{% block scripts %}
  <script src="/js/entity-network-graph.js"></script>
  <script src="/js/entity-explorer.js"></script>
  <script>
    // EntityNetworkGraph needs access to the EntityExplorer instance for state sync
    const graphPanel = document.getElementById('entity-graph-panel');
    const explorerContainer = document.getElementById('entity-explorer');
    window._entityGraph = new EntityNetworkGraph(graphPanel);
    window._entityExplorer = new EntityExplorer(explorerContainer);
    // Connect after both are created
    window._entityGraph.setExplorer(window._entityExplorer);
  </script>
{% endblock %}
```

**Filter sync strategy — the critical design choice:**
EntityExplorer rebuilds its entire DOM on each `renderSearchResults()` call via `this.container.innerHTML = ''`. There is no event emitter or callback hook. The graph must detect filter changes by:
- Listening to `popstate` (URL changes happen on every search/facet change via `updateUrl()`)
- Reading `window._entityExplorer.state` when popstate fires
- Also calling a `syncFilters()` method on popstate

```javascript
class EntityNetworkGraph {
  setExplorer(explorer) {
    this.explorer = explorer;
    window.addEventListener('popstate', () => this.syncFilters());
    // Also patch EntityExplorer.updateUrl to fire a custom event
    // (cleaner than polling)
  }

  syncFilters() {
    if (!this.explorer) return;
    const state = this.explorer.state;
    this.applyFilterHighlight(state);
  }
}
```

**Alternative (less invasive):** patch `EntityExplorer.prototype.updateUrl` after construction to dispatch a `CustomEvent` on `document`:
```javascript
const origUpdateUrl = this.explorer.updateUrl.bind(this.explorer);
this.explorer.updateUrl = () => {
  origUpdateUrl();
  document.dispatchEvent(new CustomEvent('entity-explorer:filter-change', {
    detail: this.explorer.state
  }));
};
document.addEventListener('entity-explorer:filter-change', e => this.applyFilterHighlight(e.detail));
```
This is clean and requires no modification to entity-explorer.js.

### Pattern 3: Sigma Node/Edge Reducers for Dynamic Styling

**What:** Sigma's `nodeReducer` and `edgeReducer` settings allow dynamic visual transformations without mutating the graph. Called on every render frame.

**Ego-network expansion:**
```javascript
// Source: https://www.sigmajs.org/docs/advanced/data/
sigma.setSetting('nodeReducer', (node, data) => {
  if (this.highlightedNodes.size > 0) {
    if (this.highlightedNodes.has(node)) {
      return { ...data, highlighted: true, zIndex: 1 };
    }
    return { ...data, color: '#E5E1DC', size: data.size * 0.7, zIndex: 0 };
  }
  if (this.suppressedNodes.has(node)) {
    // filter-suppressed (non-matching after facet change)
    return { ...data, color: data.color + '1F', size: data.size * 0.7 };
    // Note: Sigma doesn't support opacity natively; use lighter colour or small size
  }
  return data;
});
```

**Important: Sigma does not have a native `opacity` attribute for nodes.** Suppression is achieved by replacing the node fill with a very light colour (e.g., `#E5E1DC` for suppressed, matching `--color-stone-200`). The UI-SPEC specifies fill opacity 0.12 — this should be translated to a computed lighter hex colour at render time.

**Edge visibility via role filters:**
```javascript
sigma.setSetting('edgeReducer', (edge, data) => {
  if (this.hiddenEdges.has(edge)) {
    return { ...data, hidden: true };
  }
  if (this.highlightedEdges.size > 0 && !this.highlightedEdges.has(edge)) {
    return { ...data, color: '#E5E1DC', size: 1 };
  }
  return data;
});
```
Source: sigma `edgeReducer` — edge `hidden: true` removes it from rendering.

### Pattern 4: Sigma Events

```javascript
// Source: https://www.sigmajs.org/docs/advanced/events/
sigma.on('enterNode', ({ node }) => { this.showNodeTooltip(node); });
sigma.on('leaveNode', () => { this.hideTooltip(); });
sigma.on('clickNode', ({ node }) => { this.expandEgoNetwork(node); });
sigma.on('doubleClickNode', ({ node, event }) => {
  event.preventDefault(); // prevent sigma's default zoom
  const attrs = this.graph.getNodeAttributes(node);
  window.location.href = `/entidad/${attrs.id}/`;
});
sigma.on('clickStage', () => { this.collapseEgoNetwork(); });

// Edge events require settings flags
const sigmaInstance = new Sigma(graph, container, {
  enableEdgeClickEvents: true,
  enableEdgeHoverEvents: true
});
sigma.on('enterEdge', ({ edge }) => { this.showEdgeTooltip(edge); });
sigma.on('leaveEdge', () => { this.hideTooltip(); });
```

### Pattern 5: Camera Animation (Ego-Network Zoom)

`fitViewportToNodes` from `@sigma/utils` has no UMD bundle. Use `sigma.getCamera()` directly:

```javascript
expandEgoNetwork(nodeId) {
  // Collect ego-network nodes
  const egoNodes = [nodeId, ...this.graph.neighbors(nodeId)];
  this.highlightedNodes = new Set(egoNodes);

  // Get bounding box of ego-network nodes
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of egoNodes) {
    const { x, y } = this.graph.getNodeAttributes(n);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }

  // Convert graph coords to camera state via sigma utilities
  const camera = sigma.getCamera();
  const { x: cx, y: cy } = sigma.graphToViewport({
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  });

  camera.animate(
    { x: cx, y: cy, ratio: 0.5 }, // ratio < 1 = zoom in
    { duration: 300 }
  );

  sigma.refresh();
}
```

**Note:** The camera `animate()` method is confirmed in the sigma discussion threads. The exact ratio calculation requires experimentation — a fixed `ratio: 0.5` is a reasonable default for ego-networks.

### Pattern 6: Starter Network (Top-100 Nodes)

```javascript
buildStarterGraph() {
  // Sort nodes by degree (edge count) descending
  const nodeDegrees = new Map();
  for (const edge of this.cooccurrenceData.edges) {
    nodeDegrees.set(edge.source, (nodeDegrees.get(edge.source) || 0) + 1);
    nodeDegrees.set(edge.target, (nodeDegrees.get(edge.target) || 0) + 1);
  }
  const topNodes = [...nodeDegrees.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([id]) => id);
  const topNodeSet = new Set(topNodes);

  // Subset edges to only those connecting top-100 nodes
  const starterEdges = this.cooccurrenceData.edges.filter(
    e => topNodeSet.has(e.source) && topNodeSet.has(e.target)
  );
  return { nodes: topNodes, edges: starterEdges };
}
```

### Anti-Patterns to Avoid

- **Running ForceAtlas2 in the browser:** Blocked by D-22; freezes the main thread above ~500 nodes. Positions must come from the precomputed JSON.
- **Using sigma without graphology:** sigma requires a graphology graph instance. They cannot be decoupled.
- **Mutating graph attributes directly for visual state:** Use nodeReducer/edgeReducer instead. Mutating graph attributes calls `sigma.refresh()` implicitly but also changes the source data.
- **Setting `hidden: true` directly on nodes in the graph:** This persists after reducer runs. Hidden state for filter suppression belongs in the reducer, keyed by an external Set.
- **Fetching entity-cooccurrence.json inside EntityExplorer:** The graph manages this fetch independently. Adding it to EntityExplorer would couple the two.
- **Loading sigma or graphology via npm require in browser JS:** The project has no bundler. Use CDN UMD bundles and access `window.Sigma` / `window.graphology.Graph`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL graph rendering | Custom canvas renderer | sigma v3 | WebGL instancing, label collision, zoom, pan — hundreds of hours of work |
| Graph data model | Object-of-objects | graphology | Adjacency lists, neighbour traversal, serialisation — sigma requires graphology |
| ForceAtlas2 layout | Custom force sim | graphology-layout-forceatlas2 | Barnes-Hut O(n log n) approximation, weight influence, convergence — not trivial |
| Ego-network subgraph | Manual BFS | `graph.neighbors(nodeId)` | graphology's built-in neighbour traversal |

**Key insight:** The only custom logic needed is the role-pair precompute refactor, the reducer-based highlight system, and the camera-fit calculation. Everything else is handled by sigma + graphology.

---

## Common Pitfalls

### Pitfall 1: sigma.min.js Does Not Bundle graphology

**What goes wrong:** Loading only `sigma.min.js` and calling `new Sigma(new Graph(), el)` fails because `Graph` is undefined — graphology must be loaded separately.
**Why it happens:** sigma lists graphology as a peer dependency (not bundled).
**How to avoid:** Always load `graphology.umd.min.js` before `sigma.min.js` in the template.
**Warning signs:** `ReferenceError: Graph is not defined` in console.

### Pitfall 2: Edge Events Require Explicit Settings Flags

**What goes wrong:** `sigma.on('enterEdge', ...)` registers but never fires.
**Why it happens:** Edge hover/click events are disabled by default for performance.
**How to avoid:** Pass `{ enableEdgeHoverEvents: true, enableEdgeClickEvents: true }` to the Sigma constructor.
**Warning signs:** Edge tooltips never appear despite correct event binding.

### Pitfall 3: doubleClickNode Also Fires clickNode

**What goes wrong:** Double-clicking a node triggers the ego-network expand (clickNode) immediately before navigation (doubleClickNode).
**Why it happens:** Sigma fires clickNode on each click in a double-click sequence.
**How to avoid:** Use a single-click delay timer (~250ms) that cancels if a second click arrives. Alternatively, track `lastClickTime` and skip ego-expand if delta < 300ms.
**Warning signs:** Ego-network briefly expands then navigation occurs.

### Pitfall 4: Entity Explorer DOM Rebuild Unmounts Graph

**What goes wrong:** EntityExplorer calls `this.container.innerHTML = ''` on every search. If the graph canvas is inside `#entity-explorer`, it is destroyed and re-creates a new sigma instance on each search.
**Why it happens:** EntityExplorer has no event system — it fully replaces DOM on every render.
**How to avoid:** Mount the graph panel in a separate container (`#entity-graph-panel`) above `#entity-explorer`. Never nest the graph inside the explorer container.
**Warning signs:** Graph disappears after any search or facet change.

### Pitfall 5: ForceAtlas2 Requires Pre-Initialised Node Positions

**What goes wrong:** `forceAtlas2.assign(graph, ...)` throws if nodes lack `x` and `y` attributes.
**Why it happens:** ForceAtlas2 requires a starting position for each node.
**How to avoid:** Assign random or circular positions to all nodes before calling `forceAtlas2.assign()`. Use `node.x = Math.random() * 100; node.y = Math.random() * 100`.
**Warning signs:** `TypeError: Cannot read properties of undefined` in precompute script.

### Pitfall 6: role Field May Be Missing or null in entity_links.json

**What goes wrong:** Role-pair precompute crashes or outputs `undefined|undefined` keys.
**Why it happens:** Not all entity link records in the Django export include a `role` field, or it may be `null`.
**How to avoid:** Default missing roles to `'unknown'` and skip `unknown|unknown` pairs in the output.
**Warning signs:** Edge role_pairs object has keys like `"null|creator"` or `"undefined|subject"`.

### Pitfall 7: @sigma/utils fitViewportToNodes Is Not Available as UMD

**What goes wrong:** Importing `fitViewportToNodes` from `@sigma/utils` via CDN fails — no UMD bundle exists.
**Why it happens:** `@sigma/utils` only ships ESM/CJS builds (confirmed via jsDelivr dist listing).
**How to avoid:** Implement camera fit manually using `sigma.getCamera().animate()` with a bounding-box calculation on the ego-network nodes.
**Warning signs:** `window['@sigma/utils']` is undefined; `Uncaught TypeError` when trying to call `fitViewportToNodes`.

### Pitfall 8: Co-occurrence JSON File Size

**What goes wrong:** `entity-cooccurrence.json` grows too large to fetch at page load after adding x/y positions and role_pairs.
**Why it happens:** The graph has potentially thousands of nodes. Adding 2 floats (x, y) per node and a role_pairs object per edge increases file size.
**How to avoid:** Keep `COOCCURRENCE_MIN_WEIGHT >= 3` (current default). Monitor file size after the precompute script extension. Truncate x/y to 4 decimal places: `Math.round(x * 10000) / 10000`. If file exceeds ~500 KB gzipped, raise the threshold.
**Warning signs:** Page load waterfall shows co-occurrence JSON as a performance bottleneck.

---

## Code Examples

### Sigma + graphology Initialisation (Browser)

```javascript
// Source: https://www.sigmajs.org/docs/ (verified)
// window.Sigma and window.graphology.Graph are globals from CDN UMD bundles

const Graph = graphology.Graph;
const graph = new Graph();

// Add nodes with pre-computed positions from JSON
for (const node of cooccurrenceData.nodes) {
  graph.addNode(node.id, {
    label: node.label,
    x: node.x,
    y: node.y,
    size: Math.max(4, Math.log(node.count + 1) * 3),
    color: NODE_COLOURS[node.type] || '#888',
    type: node.type,
    count: node.count,
  });
}

// Add edges with role_pairs stored as attribute
for (const edge of cooccurrenceData.edges) {
  graph.addEdge(edge.source, edge.target, {
    weight: edge.weight,
    size: Math.max(1, Math.log(edge.weight) * 2),
    color: resolveEdgeColour(edge.role_pairs),
    role_pairs: edge.role_pairs,
  });
}

const sigmaInstance = new Sigma(graph, containerEl, {
  enableEdgeHoverEvents: true,
  enableEdgeClickEvents: true,
  renderEdgeLabels: false,
  defaultEdgeType: 'line',
});
```

### nodeReducer for Filter Suppression + Ego-Network Highlight

```javascript
// Source: https://www.sigmajs.org/docs/advanced/data/
sigmaInstance.setSetting('nodeReducer', (node, data) => {
  const isHighlighted = this.highlightedNodes.has(node);
  const isSuppressed = this.suppressedNodes.has(node);
  const isEgoActive = this.highlightedNodes.size > 0;

  if (isEgoActive && !isHighlighted) {
    return { ...data, color: '#E9E6E0', size: data.size * 0.6, zIndex: 0 };
  }
  if (isSuppressed) {
    return { ...data, color: '#E9E6E0', size: data.size * 0.5 };
  }
  return data;
});
```

### Sigma Event Binding

```javascript
// Source: https://www.sigmajs.org/docs/advanced/events/
sigmaInstance.on('clickNode', ({ node }) => {
  if (this._clickTimer) {
    clearTimeout(this._clickTimer);
    this._clickTimer = null;
    return; // second click — double-click handled separately
  }
  this._clickTimer = setTimeout(() => {
    this._clickTimer = null;
    this.expandEgoNetwork(node);
  }, 250);
});

sigmaInstance.on('doubleClickNode', ({ node, event }) => {
  event.preventDefault();
  clearTimeout(this._clickTimer);
  this._clickTimer = null;
  const attrs = graph.getNodeAttributes(node);
  window.location.href = `/entidad/${node}/`;
});

sigmaInstance.on('clickStage', () => this.collapseEgoNetwork());
sigmaInstance.on('enterNode', ({ node }) => this.showNodeTooltip(node));
sigmaInstance.on('leaveNode', () => this.hideTooltip());
sigmaInstance.on('enterEdge', ({ edge }) => this.showEdgeTooltip(edge));
sigmaInstance.on('leaveEdge', () => this.hideTooltip());
```

### Filter Sync via Custom Event Patch

```javascript
// Patch EntityExplorer.updateUrl post-construction to emit filter-change event
patchExplorerForFilterSync(explorer) {
  const orig = explorer.updateUrl.bind(explorer);
  explorer.updateUrl = () => {
    orig();
    document.dispatchEvent(new CustomEvent('entity-explorer:filter-change', {
      detail: { ...explorer.state }
    }));
  };
  document.addEventListener('entity-explorer:filter-change', (e) => {
    this.applyFilterHighlight(e.detail);
  });
  // Also handle popstate (back/forward navigation)
  window.addEventListener('popstate', () => {
    this.applyFilterHighlight(explorer.state);
  });
}
```

### CSS Component Stubs (per UI-SPEC)

```css
/* To be added to src/css/input.css */

.graph-panel {
  width: 100%;
  margin-bottom: 24px; /* lg spacing token */
}

.graph-canvas {
  width: 100%;
  height: 50vh; /* matches .explorer-map */
  background-color: var(--color-bg);
  border: 1px solid var(--color-stone-100);
  border-radius: 4px;
  position: relative;
}

@media (max-width: 768px) {
  .graph-canvas {
    height: 40vh;
  }
  .graph-canvas.graph-collapsed {
    height: 0;
    overflow: hidden;
  }
}

.graph-tooltip {
  position: fixed;
  background: var(--color-stone-100);
  border: 1px solid var(--color-stone-300);
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  pointer-events: none;
  z-index: 100;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sigma v1/v2 (canvas) | Sigma v3 (WebGL) | March 2024 | 10–50x more nodes at 60fps; requires graphology instead of custom graph format |
| `sigma.graph.addNode()` v2 API | `new Graph(); sigma = new Sigma(graph, el)` v3 API | v3 (2024) | Graphology is now the source of truth; sigma only reads it |
| Inline ForceAtlas2 in browser | Precomputed positions | Best practice 2024+ | Above 500 nodes, browser force sim freezes main thread |
| `fitViewportToNodes` from @sigma/utils | `camera.animate()` with manual bbox | Required for no-bundler setup | @sigma/utils has no UMD CDN bundle |

**Deprecated/outdated:**
- Sigma v2 API (`sigma.graph.*`): replaced entirely in v3 — do not use sigma v2 documentation
- sigma v2 `settings.defaultLabelSize`: v3 uses graphology node `label` attribute directly

---

## Open Questions

1. **entity_links.json role field — field name and null rate**
   - What we know: The precompute script currently ignores the `role` field from entity_links.json (`byDescription` only stores `link.entity_code`, not `link.role`)
   - What's unclear: Whether the field is named `role`, `entity_role`, or something else in the actual backend export; whether it is null for all/some records
   - Recommendation: In the first task, log the field names of the first 3 records from entity_links.json before writing any role-pair code. Fail loudly if role is absent.

2. **Co-occurrence JSON file size after extension**
   - What we know: Current file is produced with `COOCCURRENCE_MIN_WEIGHT=3`; adding x/y floats and role_pairs objects will increase size
   - What's unclear: Actual node/edge counts against real data (the data directory shows no `entity-cooccurrence.json` present in dev environment — only `place-index.json` and others)
   - Recommendation: After extending the precompute script, measure file size. If > 400 KB, raise min_weight to 5 or truncate coordinates to 3dp.

3. **Double-click prevention on mobile**
   - What we know: Mobile browsers may not reliably distinguish single vs. double tap
   - What's unclear: Whether sigma's `doubleClickNode` event fires on mobile from two taps
   - Recommendation: Test on real mobile device. If double-tap navigation is unreliable on mobile, add a fallback: long-press (300ms delay) navigates to entity detail page.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | precompute script extension | Yes | v22.17.0 | — |
| graphology (npm) | precompute script (ForceAtlas2) | No (not in package.json) | — | Must install as devDependency |
| graphology-layout-forceatlas2 (npm) | precompute script (x/y positions) | No (not in package.json) | — | Must install as devDependency |
| sigma v3 (CDN) | browser rendering | Via CDN (no install) | 3.0.2 | — |
| graphology (CDN) | browser graph model | Via CDN (no install) | 0.26.0 | — |
| entity-cooccurrence.json | graph data | Passthrough wired (eleventy.config.js line 20) | — | Generated by precompute script against real data |

**Missing dependencies with no fallback:**
- `graphology` and `graphology-layout-forceatlas2` must be added to `package.json` as devDependencies before the precompute script can run ForceAtlas2

**Missing dependencies with fallback:**
- `entity-cooccurrence.json` does not exist in the local dev data directory — the precompute script must be run against the full dataset from B2 to produce it. For local development, a small fixture file can be created manually.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test framework currently in the project |
| Config file | None — Wave 0 must create fixture + node test file |
| Quick run command | `node scripts/test-precompute.js` (Wave 0 fixture test) |
| Full suite command | `node scripts/test-precompute.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRAPH-01 | Graph panel renders in DOM with sigma canvas | manual (browser) | — | ❌ manual |
| GRAPH-02 | Precomputed JSON contains x/y per node and role_pairs per edge | unit | `node scripts/test-precompute.js` | ❌ Wave 0 |
| GRAPH-03 | Ego-network expansion highlights correct neighbours | manual (browser) | — | ❌ manual |
| GRAPH-04 | Filter change suppresses non-matching nodes | manual (browser) | — | ❌ manual |

### Sampling Rate

- **Per task commit:** `node scripts/test-precompute.js` (precompute schema validation)
- **Per wave merge:** `node scripts/test-precompute.js`
- **Phase gate:** Manual browser smoke test before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/test-precompute.js` — validates extended JSON schema: nodes have `x`, `y`; edges have `role_pairs` object; covers GRAPH-02
- [ ] `data/entity-cooccurrence.fixture.json` — small synthetic fixture (5 nodes, 4 edges with role_pairs and x/y) for unit test

*(All browser-rendered requirements GRAPH-01, GRAPH-03, GRAPH-04 are manual-only — sigma WebGL cannot be unit tested without a real DOM/WebGL context)*

---

## Project Constraints (from CLAUDE.md)

- No bundler (webpack/rollup/vite) — JS served as passthrough files; heavy libraries loaded from CDN as `<script>` tags
- Commits: short, no emojis, no co-author, pull before commit
- No `.planning/`, `CLAUDE.md`, `.claude/` in public repo
- Consult guidelines in `../docs/frontend/guidelines/` before starting each new type of task
- Present drafts for review before committing
- Show test output — don't verify silently
- Colombian Spanish in all Spanish-language UI copy
- US English in English-language user-facing content
- Ask before naming/structural changes

---

## Sources

### Primary (HIGH confidence)
- [Sigma.js v3 Events docs](https://www.sigmajs.org/docs/advanced/events/) — all event names, edge event flags
- [Sigma.js v3 Data docs](https://www.sigmajs.org/docs/advanced/data/) — nodeReducer/edgeReducer signatures and usage
- [graphology-layout-forceatlas2 docs](https://graphology.github.io/standard-library/layout-forceatlas2.html) — synchronous layout API, inferSettings
- npm registry (2026-03-29) — verified versions: sigma 3.0.2, graphology 0.26.0, graphology-layout-forceatlas2 0.10.1
- jsDelivr CDN dist listings — confirmed sigma.min.js UMD exports `window.Sigma`; confirmed graphology.umd.min.js exports `window.graphology`; confirmed @sigma/utils has no UMD bundle

### Secondary (MEDIUM confidence)
- [GitHub Discussion #1471 — Fit graph to viewport](https://github.com/jacomyal/sigma.js/discussions/1471) — `fitViewportToNodes` API, custom bounding box gotcha, `camera.animate()` pattern
- [ouestware.com — Sigma v3 announcement (March 2024)](https://www.ouestware.com/2024/03/21/sigma-js-3-0-en/) — v3 architecture overview, monorepo, CDN bundles
- Codebase inspection of `src/js/place-explorer.js` — place explorer DOM pattern, map container, mobile toggle

### Tertiary (LOW confidence)
- Camera animation `animate()` options and ratio semantics — inferred from sigma source code inspection and GitHub discussion, not from official docs; requires empirical testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry; UMD bundle availability confirmed via jsDelivr
- Architecture: HIGH — based on codebase inspection of EntityExplorer, place-explorer, eleventy.config.js, and deploy.yml
- Pitfalls: MEDIUM — most verified via official docs or sigma source; file size and mobile double-tap are LOW (empirical)

**Research date:** 2026-03-29
**Valid until:** 2026-06-29 (sigma v3 is stable; graphology APIs are stable)
