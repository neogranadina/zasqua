# Phase 8: Entity Explorer — List View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 08-entity-explorer-list-view
**Areas discussed:** Page layout & results display, Performance & rendering strategy, Date range filtering, Search behaviour

---

## Page Layout & Results Display

| Option | Description | Selected |
|--------|-------------|----------|
| Same sidebar layout | Sidebar with facets on left, results on right. Consistent with /buscar/ and /explorar/lugares/ | ✓ |
| Full-width with top filters | Filters as horizontal bar above full-width results | |
| Sidebar with summary panel | Sidebar with facets plus summary area above results | |

**User's choice:** Same sidebar layout
**Notes:** Consistency across all three explorers

### Row Content (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Type badge + date range | Entity type as badge, plus date range when available | ✓ |
| Primary function | e.g. 'Alcalde', 'Escribano' as secondary text | ✓ |
| Document count | 'Asociado a N documentos' | ✓ |
| Name variants | Alternative names as subtle subtitle | ✓ |

**User's choice:** All four options selected

### Sorting

| Option | Description | Selected |
|--------|-------------|----------|
| Alphabetical by name | Consistent with place explorer, sort by sort_name | ✓ |
| By document count | Most-linked entities first | |
| By date | Chronological ordering | |

**User's choice:** Alphabetical by name

---

## Performance & Rendering Strategy

### Rendering approach

| Option | Description | Selected |
|--------|-------------|----------|
| Pagination | 50 results per page, URL-synced | ✓ |
| Virtual scrolling | Smooth infinite scroll, only renders visible rows | |
| Hybrid | Pagination with virtual rendering within each page | |

**User's choice:** Pagination

### Data source (pivotal decision)

**User challenged the Phase 4 approach.** Instead of loading entity-index.json (5-8 MB) with in-memory filtering, user proposed using Pagefind — creating separate indices for entities and places alongside the existing description index. User noted: "I thought this meant from the document pagefind — not that we weren't going to take advantage of the tool for these. It sounds like we're reinventing the wheel here."

**Outcome:** Three separate Pagefind indices: `/buscar/` (descriptions), `/explorar/entidades/` (entities), `/explorar/lugares/` (places). This supersedes Phase 4 decisions D-01, D-02, D-03.

---

## Date Range Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Century buckets | Filter by 'Siglo XVI', 'Siglo XVII', etc. | |
| Half-century buckets | '1700–1749', '1750–1799', etc. | |
| Reuse existing date drill-down | Same century→decade→year from /buscar/ | ✓ |

**User's choice:** Reuse existing date drill-down approach from search.js
**Notes:** User said "We have this down to the year in nested buckets in documents already — let's reuse as much as poss"

---

## Place Explorer Migration & Map Data

| Option | Description | Selected |
|--------|-------------|----------|
| Keep place-index.json for map only | Pagefind powers search/facets/results, JSON feeds the map | ✓ |
| Embed coords in Pagefind metadata | Single data source via Pagefind | |
| Separate lightweight coords JSON | Tiny JSON with just id/lat/lon | |

**User's choice:** Keep place-index.json for map only
**Notes:** Also decided to migrate place explorer to Pagefind in this phase (not later)

---

## Claude's Discretion

- Pagefind index build configuration (CLI flags, separate configs)
- Pagefind filter attribute placement in templates
- Handling entities/places with no dates
- Result row styling details
- EntityExplorer JS class structure
- Build script modifications

## Deferred Ideas

None
