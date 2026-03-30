---
phase: 09-entity-network-graph
plan: 01
subsystem: data
tags: [graphology, forceatlas2, precompute, graph, cooccurrence, node, edge]

# Dependency graph
requires:
  - phase: 04-build-pipeline-data-pre-compute
    provides: precompute-cooccurrence.js producing entity-cooccurrence.json with nodes/edges
provides:
  - entity-cooccurrence.json extended with x/y positions per node and role_pairs per edge
  - graphology and graphology-layout-forceatlas2 devDependencies for build-time layout
affects:
  - 09-02 (entity-network-graph renderer — reads extended entity-cooccurrence.json schema)
  - future graph plans needing role-pair data or pre-computed layout

# Tech tracking
tech-stack:
  added:
    - graphology 0.26.0 (devDependency — Node.js precompute only, not loaded in browser)
    - graphology-layout-forceatlas2 0.10.1 (devDependency — Node.js precompute only)
  patterns:
    - ForceAtlas2 runs synchronously at build time via inferSettings + assign, 150 iterations
    - Role pairs are normalised by sorting role names alphabetically before joining with |
    - Null/missing roles are defaulted to 'unknown' before normalisation

key-files:
  created: []
  modified:
    - scripts/precompute-cooccurrence.js
    - package.json
    - package-lock.json

key-decisions:
  - "ForceAtlas2 layout runs at build time (Node.js only) — x/y positions written to JSON; no browser-side simulation"
  - "Role-pair keys are alphabetically sorted (e.g. creator|subject, not subject|creator) for consistent lookup"
  - "Missing/null roles default to 'unknown' (not silently dropped) — ensures every entity appearance has a role label"
  - "Deduplication per description: entity codes grouped with all their roles before pairing — one entity with multiple roles in the same description generates multiple role variants per edge"

patterns-established:
  - "Pattern: ForceAtlas2 precompute — build layoutGraph separately from output graph, then extract x/y back to nodes array"
  - "Pattern: role-pair normalisation — [rA, rB].sort().join('|') ensures canonical key regardless of entity ordering"

requirements-completed: [GRAPH-01, GRAPH-02]

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 9 Plan 01: Entity co-occurrence JSON extended with ForceAtlas2 x/y positions and per-edge role-pair counts

**ForceAtlas2 layout (150 iterations) runs at build time in precompute-cooccurrence.js; node x/y and edge role_pairs written to entity-cooccurrence.json for browser-side graph rendering with no force simulation**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-30T04:44:07Z
- **Completed:** 2026-03-30T04:52:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Installed `graphology` and `graphology-layout-forceatlas2` as devDependencies (Node.js only, not loaded in browser)
- Extended precompute-cooccurrence.js to track entity roles per description, producing per-edge `role_pairs` objects with alphabetically-normalised keys
- Added ForceAtlas2 synchronous layout (150 iterations) that writes `x`, `y` positions to every node in the output JSON
- Verified against synthetic test data: nodes have numeric finite x/y, edges have `role_pairs` objects, role-pair keys are alphabetically sorted, `unknown|unknown` pairs are not spuriously introduced

## Task Commits

Each task was committed atomically:

1. **Task 1: Install graphology devDependencies and extend precompute script** - `4ea3f88` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `scripts/precompute-cooccurrence.js` — Extended with role tracking, role-pair accumulation, ForceAtlas2 layout, and x/y node output
- `package.json` — Added `graphology ^0.26.0` and `graphology-layout-forceatlas2 ^0.10.1` to devDependencies
- `package-lock.json` — Updated lockfile for new packages

## Decisions Made

- **ForceAtlas2 at build time only** — graphology-layout-forceatlas2 is devDependency, not loaded in browser (D-22)
- **Role-pair key normalisation** — `[rA, rB].sort().join('|')` ensures canonical lookup keys regardless of entity ordering within the pair (supports D-11 / Plan 02 filtering)
- **Null role default to 'unknown'** — preserves all co-occurrence information without silently dropping relationships where role metadata is absent (per RESEARCH.md Pitfall 6)
- **Deduplication strategy** — entities within a description are grouped by code; all roles per code are retained; role combinations are the Cartesian product of each entity's roles, ensuring complete role-pair counts

## Deviations from Plan

None — plan executed exactly as written. The synthetic data verification approach was used instead of real data (not present locally — downloaded at CI build time from B2), which matches the established pattern for this project.

## Issues Encountered

- Real data files (`entity_links.json`, `entities.json`) are not present in the local dev environment — they are downloaded from Backblaze B2 during CI builds. Verification was performed with synthetic data matching the documented schema. This is normal for this project — precompute scripts have always been tested this way locally.

## Known Stubs

None — all output fields are fully computed from real input data at build time.

## Next Phase Readiness

- Plan 02 (entity-network-graph renderer) can now read the extended entity-cooccurrence.json schema: `nodes[{id, label, type, count, x, y}]` and `edges[{source, target, weight, role_pairs}]`
- No blockers for Plan 02

---
*Phase: 09-entity-network-graph*
*Completed: 2026-03-30*
