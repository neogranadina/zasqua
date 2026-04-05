---
phase: 10-explorer-ux-redesign
plan: 03
subsystem: frontend
tags: [graph, entity-explorer, deep-link, curated-graph, css]
dependency_graph:
  requires: [10-02]
  provides: [CuratedEntityGraph, nodo-deep-link, graph-message-css]
  affects: [entity-explorer, entity-detail-pages, graph-panel-css]
tech_stack:
  added: []
  patterns: [pre-computed graph JSON, ego-network expansion, URL deep-linking via ?nodo=]
key_files:
  created:
    - src/js/curated-entity-graph.js
  modified:
    - src/explorar/entidades.njk
    - src/entidad.njk
    - src/css/main.css
decisions:
  - "curated-entity-graph.json node type is 'corporate' (not 'corporate_body') — _nodeColor handles both values"
  - "Ego-network expansion uses description-link shards (description nodes, not entity-to-entity), capped at 20 per click"
  - "setExplorer() is a no-op stub — curated graph and explorer list are intentionally independent (per design decision D-05, research finding #4)"
  - "Bipartite graph tooltip classes removed from CSS — curated graph uses force-graph built-in nodeLabel"
metrics:
  duration: 420s
  completed_date: "2026-04-05"
  tasks_completed: 3
  files_changed: 4
---

# Phase 10 Plan 03: CuratedEntityGraph Implementation Summary

**One-liner:** New CuratedEntityGraph class replaces the crashing bipartite EntityNetworkGraph — loads pre-computed JSON instantly, supports ?nodo= URL deep-linking with fallback, and ego-network expansion on click; entity detail pages link to the explorer.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create CuratedEntityGraph class | 96e02ea | src/js/curated-entity-graph.js |
| 2 | Update entity explorer template and add deep-link to entity detail pages | 155f131 | src/explorar/entidades.njk, src/entidad.njk |
| 3 | Update graph panel CSS for curated graph | 0082ac2 | src/css/main.css |

## What Was Built

### Task 1 — CuratedEntityGraph class (323 lines)

New `src/js/curated-entity-graph.js` replacing `EntityNetworkGraph`:

- **init():** Builds DOM (canvas, legend, message container), fetches `/data/curated-entity-graph.json` once, renders with force-graph using `cooldownTicks(0)` and `d3AlphaDecay(1)` so pre-computed positions are used immediately. On load, reads `?nodo=` via `URLSearchParams` and calls `_centreOnEntity()`.
- **_centreOnEntity(code):** If node found in curated set, pans to its pre-computed x/y with `fg.centerAt(x, y, 800)` and zooms to 5 with `fg.zoom(5, 800)`. Adds "Entidad enfocada" entry to legend. If NOT found, renders a fallback message with a link back to the entity detail page — built via DOM API (not innerHTML with raw user input, per ASVS threat model).
- **_onNodeClick(node):** First click triggers ego-network expansion (fetches entity-link shard, adds up to 20 description nodes as 1-hop context). Second click on the same node navigates to `/entidad/{id}/`.
- **setExplorer():** No-op stub for API compatibility — curated graph and explorer list are independent panels.
- **_nodeColor():** Handles `'person'` (burgundy `#8B2942`), `'corporate'`/`'corporate_body'`/`'family'` (periwinkle `#6666BB`), `'document'` (warm stone `#A09888`). Note: curated JSON uses `'corporate'` not `'corporate_body'` — both handled.

### Task 2 — Template updates

- **entidades.njk:** Replaced `entity-network-graph.js` script tag and `EntityNetworkGraph` instantiation with `curated-entity-graph.js` and `CuratedEntityGraph`. Changed `window._entityGraph`/`window._entityExplorer` globals to local `var` declarations. Added explicit `entityGraph.init()` call (the new class does not auto-init in constructor).
- **entidad.njk:** Added a "Red de entidades" detail field inside the Control section with a link to `/explorar/entidades/?nodo={{ ent.entity_code }}`. Text: "Explorar en la red de entidades →". Placed as the last field before the Control section's closing `</div>`.

### Task 3 — CSS updates

- **Removed** bipartite graph tooltip classes (`.graph-tooltip`, `.graph-tooltip-date`, `.graph-tooltip-role`, `.graph-tooltip-name`, `.graph-tooltip-name a`, `.graph-tooltip-ref`, `.graph-tooltip-actions`, `.graph-tooltip-btn`, `.graph-tooltip-btn:hover`, `.graph-tooltip-btn:disabled`) — 64 lines removed. Curated graph uses force-graph's built-in `nodeLabel` tooltip.
- **Added** `.graph-message` (padding, stone-600 text colour `#57534e`, warm-white background) and `.graph-message a` (burgundy `#8B2942`, underline) for the fallback message when `?nodo=` entity is not in the curated set.
- **Added** `.graph-legend-line` helper for the "Fuerza del vínculo" legend entry.
- Kept `.graph-mobile-toggle`, `.graph-loading`, `@media` responsive rules — unchanged.

## Verification

All four plan verification checks passed:

1. `src/explorar/entidades.njk` loads `curated-entity-graph.js` (not `entity-network-graph.js`)
2. `CuratedEntityGraph.init()` fetches `/data/curated-entity-graph.json` — no per-entity shard fetches on page load
3. `src/entidad.njk` contains `?nodo={{ ent.entity_code }}` deep-link to explorer
4. `src/css/main.css` has `.graph-message` with correct colours and `.graph-panel` remains

## Deviations from Plan

**1. [Rule 2 - Auto-fix] Ego-network expansion uses description nodes, not entity nodes**

- **Found during:** Task 1 implementation
- **Issue:** The plan spec for `_expandEgoNetwork` described fetching entity-link shards and adding "new entity nodes" as 1-hop neighbours. However, the entity-link shards (`/data/entity-links/{code}.json`) contain links between entities and archival descriptions — not entity-to-entity co-occurrence data. Each shard entry has `reference_code` (description) and `role`, not a peer entity code.
- **Fix:** Ego expansion creates description nodes (shown as small `'document'` type nodes) rather than peer entity nodes. This accurately represents the shard data structure and still provides useful context (up to 20 linked descriptions). Entity-to-entity co-occurrence is available in `curated-entity-graph.json` itself for nodes already in the curated set.
- **Impact:** Minor visual difference — expanded nodes are description nodes (warm stone colour), not entity nodes. Functionally correct for the available data.
- **Files modified:** `src/js/curated-entity-graph.js`
- **Commit:** 96e02ea

## Known Stubs

None. All plan features are fully wired:
- `CuratedEntityGraph` loads real data from `/data/curated-entity-graph.json`
- Deep-link reads real `?nodo=` URL parameter
- Entity detail pages link to real explorer URL with real `entity_code`
- `setExplorer()` is intentionally a no-op (documented in code comment)

## Self-Check: PASSED

- src/js/curated-entity-graph.js — FOUND (committed 96e02ea)
- src/explorar/entidades.njk — FOUND (committed 155f131)
- src/entidad.njk — FOUND (committed 155f131)
- src/css/main.css — FOUND (committed 0082ac2)
