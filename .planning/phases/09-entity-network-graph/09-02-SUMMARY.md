---
phase: 09-entity-network-graph
plan: 02
subsystem: ui
tags: [sigma, graphology, network-graph, entity-explorer, css, nunjucks, javascript]

# Dependency graph
requires:
  - phase: 09-entity-network-graph-01
    provides: entity-cooccurrence.json with x/y ForceAtlas2 positions and role_pairs per edge
  - phase: 08-entity-explorer-list-view
    provides: EntityExplorer class with updateUrl method and filter state shape
provides:
  - EntityNetworkGraph class rendering Sigma.js graph on entity explorer page
  - Graph panel CSS classes (.graph-panel through .graph-loading) in input.css
  - Updated entidades.njk with CDN scripts, graph panel container, init script
affects:
  - entity explorer page at /explorar/entidades/
  - future graph plans needing EntityNetworkGraph API

# Tech tracking
tech-stack:
  added:
    - sigma 3.0.2 (CDN, browser-side WebGL renderer)
    - graphology 0.26.0 (CDN, browser-side graph data model — UMD global)
  patterns:
    - Graph panel container placed ABOVE #entity-explorer to survive innerHTML resets
    - updateUrl patching with CustomEvent dispatch for non-invasive filter sync
    - Double-click guard via lastClickTime + 300ms threshold + setTimeout(250ms)
    - Starter network: top 100 nodes by edge degree, edges subset to top-100
    - nodeReducer/edgeReducer as arrow function closures capturing `this`

key-files:
  created:
    - src/js/entity-network-graph.js
  modified:
    - src/explorar/entidades.njk
    - src/css/input.css

key-decisions:
  - "Graph panel container placed above #entity-explorer (D-01, D-19) — EntityExplorer.renderSearchResults wipes innerHTML on every render"
  - "graphology loaded before sigma in head block — per Pitfall 1 (sigma depends on graphology UMD global)"
  - "updateUrl patching via CustomEvent entity-explorer:filter-change — no modifications to entity-explorer.js needed"
  - "Filter sync uses attribute-based approximation (type + label substring) — Pagefind results set not enumerable without loading all pages"

patterns-established:
  - "Pattern: non-invasive explorer patching — wrap origUpdateUrl in closure, dispatch CustomEvent; graph listens independently"
  - "Pattern: Sigma double-click guard — track lastClickTime, setTimeout 250ms for single-click handler, cancel on second click within 300ms"

requirements-completed: [GRAPH-01, GRAPH-02, GRAPH-03]

# Metrics
duration: 20min
completed: 2026-03-30
---

# Phase 9 Plan 02: EntityNetworkGraph class — Sigma.js renderer with ego-network, tooltips, role filters, and filter sync wired into entity explorer

**Sigma.js v3 + graphology UMD graph renderer with ForceAtlas2 pre-computed positions, 1-hop ego-network expansion, node/edge tooltips, role-pair filters, mobile toggle, and attribute-based filter sync with EntityExplorer**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-30T05:00:00Z
- **Completed:** 2026-03-30T05:20:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added 11 graph panel CSS classes to input.css (.graph-panel, .graph-canvas, .graph-panel-header, .graph-panel-heading, .graph-role-filters, .graph-role-filter-label, .graph-tooltip, .graph-tooltip-name, .graph-tooltip-meta, .graph-mobile-toggle, .graph-loading) with correct spacing, typography, colour tokens, and mobile responsive behaviour
- Created EntityNetworkGraph class (src/js/entity-network-graph.js) with full Sigma.js v3 integration: builds starter network (top 100 nodes by degree), ForceAtlas2 x/y positions, node/edge reducers, hover tooltips, single-click ego-network, double-click navigation, role filter checkboxes, mobile toggle, reset view
- Updated entidades.njk: CDN script tags (graphology before sigma), graph panel div above #entity-explorer, script block loading entity-network-graph.js before entity-explorer.js, and setExplorer() connection call for filter sync

## Task Commits

Each task was committed atomically:

1. **Task 1: Add graph panel CSS classes to input.css** - `f8263f2` (feat)
2. **Task 2: Create EntityNetworkGraph class and wire into entidades.njk template** - `0b8b4b9` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/js/entity-network-graph.js` — EntityNetworkGraph class: init DOM, fetch co-occurrence JSON, buildGraph, nodeReducer/edgeReducer, ego-network, tooltips, role filters, filter sync via CustomEvent
- `src/explorar/entidades.njk` — Added CDN script tags, graph panel container, updated scripts block
- `src/css/input.css` — Added 11 graph panel CSS classes with mobile responsive section

## Decisions Made

- **Graph panel above #entity-explorer**: EntityExplorer.renderSearchResults() wipes innerHTML on every filter/search — any DOM inside #entity-explorer would be destroyed. Graph panel must live outside that container.
- **Non-invasive updateUrl patching**: Wrapping explorer.updateUrl() and dispatching a CustomEvent avoids modifying entity-explorer.js. The graph subscribes independently without coupling the two classes.
- **Attribute-based filter sync**: Pagefind does not expose the full result set without loading all pages. Approximation using node `type` and label substring match gives reasonable visual feedback for the most common filter combinations (entity type facet and text search).
- **Double-click guard implementation**: Sigma fires both `clickNode` and `doubleClickNode` for a double-click. The 300ms lastClickTime check in `clickNode` plus a 250ms setTimeout before executing the single-click handler prevents the ego-network expansion from firing on a double-click.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all EntityNetworkGraph methods are fully implemented. The filter sync uses an intentional approximation (attribute-based) rather than a full Pagefind result enumeration, which is documented in the plan as the primary strategy.

## Next Phase Readiness

- EntityNetworkGraph is live on the entity explorer page and will render the co-occurrence network once entity-cooccurrence.json is built by the CI pipeline (requires real entity_links.json data from B2)
- Filter sync, ego-network, tooltips, role filters, and mobile toggle are all implemented
- No blockers for subsequent phases

---
*Phase: 09-entity-network-graph*
*Completed: 2026-03-30*
