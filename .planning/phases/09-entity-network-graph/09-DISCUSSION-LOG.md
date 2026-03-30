# Phase 9: Entity Network Graph - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 09-entity-network-graph
**Areas discussed:** Graph scope & entry point, Node interaction & ego-network, Filter synchronisation, Visual style & layout, Role-typed edges

---

## Graph Scope & Entry Point

### How should the graph appear on the entity explorer page?

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle panel | Button toggles graph panel above/beside results. Loads on demand. | |
| Always visible | Graph always shown above results, like the place explorer map. Loads on page load. | ✓ |
| Separate tab/view | Tab switches between List and Graph views. Only one visible at a time. | |

**User's choice:** Always visible — "It should be the equivalent of the heatmap view"
**Notes:** Direct reference to the place explorer's always-visible map panel as the pattern to follow.

### What should the graph show by default before any search?

| Option | Description | Selected |
|--------|-------------|----------|
| Top connected entities | Show ~N most-connected entities immediately on page load. | ✓ |
| Empty until search | Graph blank until user searches or selects facets. | |
| Browse prompt | Prompt matching Phase 8 browse-first pattern with a "Ver toda la red" button. | |

**User's choice:** Top connected entities

### How many nodes should the initial view show?

| Option | Description | Selected |
|--------|-------------|----------|
| ~50 nodes | Compact, readable labels, fast render. | |
| ~100 nodes | Richer view, may need label hiding at this density. | ✓ |
| You decide | Claude picks based on actual data size and rendering. | |

**User's choice:** ~100 nodes

---

## Node Interaction & Ego-network

### What should happen when a user clicks a node?

| Option | Description | Selected |
|--------|-------------|----------|
| Expand ego-network | Click expands 1-hop neighbours. Second click or link navigates to detail page. | ✓ |
| Navigate to detail page | Click goes straight to /entidad/{code}/. | |
| Expand + highlight in list | Expand ego-network AND highlight entity in results list below. | |

**User's choice:** Expand ego-network

### How should users navigate to an entity detail page?

| Option | Description | Selected |
|--------|-------------|----------|
| Double-click node | Single click = ego-network, double-click = navigate. | ✓ |
| Link in hover tooltip | Tooltip with clickable link, click stays for ego-network. | |
| Right-click / context | Right-click opens menu with 'Ver entidad' link. | |

**User's choice:** Double-click node

### Ego-network depth?

| Option | Description | Selected |
|--------|-------------|----------|
| 1-hop only | Direct neighbours only. Keeps graph readable. | ✓ |
| 1-hop default, 2-hop on demand | Default 1-hop with "Expandir más" option. | |

**User's choice:** 1-hop only

---

## Filter Synchronisation

### How should the graph respond to search/facet filter changes?

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight matching nodes | All nodes stay, matching get full colour, non-matching fade to grey. | ✓ |
| Hide non-matching nodes | Non-matching nodes and edges removed. | |
| Highlight + recentre | Highlight matching, viewport pans/zooms to frame matches. | |

**User's choice:** Highlight matching nodes

### Should clicking a node filter the results list?

| Option | Description | Selected |
|--------|-------------|----------|
| No | Click only expands ego-network. List controlled by its own search/facets. | ✓ |
| Yes, filter list | Clicking filters results to show only that entity. Two-way binding. | |

**User's choice:** No — graph and list are state-independent

---

## Visual Style & Layout

### Node sizing and colouring?

| Option | Description | Selected |
|--------|-------------|----------|
| Size by doc count, colour by type | Radius = document count, colour = entity type. | ✓ |
| Size by degree, colour by type | Radius = edge degree, colour = entity type. | |
| Uniform size, colour by type | All same size, only colour varies. | |

**User's choice:** Size by doc count, colour by type

### Mobile behaviour?

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width, collapsible | Spans full width, toggle to hide/show on mobile. Like place explorer map. | ✓ |
| Hidden on mobile | Only on desktop/tablet. | |
| Separate mobile page | "Ver red" button opens full-screen overlay. | |

**User's choice:** Full-width, collapsible

### Graph rendering library?

| Option | Description | Selected |
|--------|-------------|----------|
| Sigma.js v3 | WebGL, ~50KB gzip, works with graphology. Good for pre-computed layouts. | ✓ |
| D3 force-graph | SVG/Canvas, flexible but heavier. Would need to disable force sim. | |
| Cytoscape.js | Full-featured, ~170KB gzip. May be overkill. | |

**User's choice:** Sigma.js v3

---

## Role-typed Edges

User raised that entity-document relationships carry role information (creator, contributor, publisher, subject, mentioned) and wanted this surfaced in the graph.

### Role filter location?

| Option | Description | Selected |
|--------|-------------|----------|
| Facet in graph panel | Checkboxes inside the graph panel. Independent from sidebar facets. | ✓ |
| Sidebar facet group | New "Relación" group in sidebar. Affects graph and list. | |
| Dropdown in graph toolbar | Compact dropdown/pill bar at top of graph panel. | |

**User's choice:** Facet in graph panel

### Edge tooltip detail?

| Option | Description | Selected |
|--------|-------------|----------|
| Role breakdown | Full per-role-pair counts in tooltip. | ✓ |
| Dominant role only | Just the most frequent role pair. | |
| You decide | Claude picks based on space/complexity. | |

**User's choice:** Role breakdown

---

## Claude's Discretion

- Graph container height and aspect ratio
- Exact tooltip styling and positioning
- Zoom/pan controls and reset button design
- Animation timing for ego-network expansion
- Edge colour and opacity values per role pair
- Transition from ~100 starter nodes to filter-driven subgraph

## Deferred Ideas

- Two-way graph↔list binding (click node filters results list) — may revisit during visual verification
- 2-hop ego-network expansion
- Graph search (type-to-find-node)
- Community detection / cluster colouring
