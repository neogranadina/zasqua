# Phase 10: Explorer UX Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 10-explorer-ux-redesign
**Areas discussed:** Graph panel fate, Explorer layout & interaction, Research scope, Data & count refresh, Phase sequencing, Cleanup scope

---

## Graph Panel Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it entirely | Co-occurrence shelved in Phase 9, CDN dependency, crashes browsers | |
| Keep but rework | Concept valid, needs lighter load, curated starter view | ✓ |
| Replace with something else | Remove graph, add different discovery feature | |

**User's choice:** Keep but rework
**Notes:** None

### Follow-up: Graph rework approach

| Option | Description | Selected |
|--------|-------------|----------|
| Pagefind-driven subgraph | Build graph from current search/filter results | |
| Curated starter graph | Pre-computed top 50–100 entities, fast load, ego-network expansion | ✓ |
| On-demand toggle | Graph hidden by default, shown via toggle | |

**User's choice:** Curated starter graph
**Notes:** User specified two requirements: (a) a curated view, and (b) a deep-linking system where entity detail pages link to the explorer and open it centred on any node in the graph, enabling continued exploration and discovery. User also wants prosopographical database research to inform the approach.

### Follow-up: Graph technology

| Option | Description | Selected |
|--------|-------------|----------|
| Keep force-graph | Already wired in, WebGL, CDN dependency stays | |
| Switch to D3-force + SVG | Lighter, no CDN, more styling control | |
| You decide | Claude picks based on research and codebase constraints | ✓ |

**User's choice:** You decide

---

## Explorer Layout & Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Keep sidebar+results | Same as /buscar/, focus on visual polish not structural change | ✓ |
| Evolve the layout | Rethink filter/results/graph arrangement | |
| Differentiate the two | Each explorer gets its own optimised layout | |

**User's choice:** Keep sidebar+results
**Notes:** None

### Follow-up: Panel arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Above results, full width | Current pattern — graph/map spans full width above results | |
| Beside results, split view | Graph/map shares horizontal space with results | |
| Decide after research | Let research and Figma exploration determine arrangement | ✓ |

**User's choice:** Decide after research
**Notes:** "Let's discuss it after research, and mocking up some possibilities"

---

## Research Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Focused survey | 5–10 interfaces, ~1 session | |
| Lightweight scan | 3–5 sites, move to Figma fast | |
| Deep research | Thorough survey, written document with findings and recommendations | ✓ |

**User's choice:** Deep research
**Notes:** None

### Follow-up: Reference sites

| Option | Description | Selected |
|--------|-------------|----------|
| I have some in mind | User shares specific references | |
| Claude finds them | Research agent identifies best examples | ✓ |
| Both | User names a few, Claude supplements | |

**User's choice:** Claude finds them

---

## Data & Count Refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic from data | Build-time counts from data files, template variables | ✓ |
| Keep hardcoded, update now | Update numbers manually | |
| Dynamic + formatted | Build-time with Spanish number formatting | |

**User's choice:** Dynamic from data
**Notes:** None

### Follow-up: Protomaps basemap fix

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in Phase 10 | Fix place detail page basemap as part of this phase | ✓ |
| Separate fix | Keep Phase 10 focused, fix basemap separately | |
| Switch both to same provider | Standardise on one tile provider | |

**User's choice:** Fix in Phase 10

---

## Phase Sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Three sub-phases | 10a research, 10b Figma, 10c implementation. Each has own plan. | ✓ |
| Research then one plan | Research standalone, then single plan for Figma+implementation | |
| Continuous flow | One plan, sequential tasks, no formal gates | |

**User's choice:** Three sub-phases
**Notes:** None

---

## Cleanup Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Clean up in Phase 10 | Remove dead code as part of implementation sub-phase | ✓ |
| Separate cleanup task | Keep Phase 10 focused, clean up later | |
| Clean up what we touch | Only remove things that conflict with new implementation | |

**User's choice:** Clean up in Phase 10
**Notes:** None

---

## Claude's Discretion

- Graph rendering technology (force-graph vs D3-force+SVG vs other)
- Curated graph size and selection criteria
- Spanish number formatting approach for dynamic counts
- Protomaps vs OpenFreeMap standardisation
- Visual polish details

## Deferred Ideas

- Mobile-responsive redesign — future milestone (user explicitly stated)
- Two-way graph-list binding — remains deferred from Phase 9
- Graph search (type-to-find-node) — remains deferred from Phase 9
- Community detection / cluster colouring — remains deferred from Phase 9
