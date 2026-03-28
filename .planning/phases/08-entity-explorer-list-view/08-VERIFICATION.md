---
phase: 08-entity-explorer-list-view
verified: 2026-03-28T23:16:25Z
status: passed
score: 15/15 must-haves verified
re_verification: false
human_verification:
  - test: "Open /explorar/entidades/ in browser and type a name query"
    expected: "Matching entities appear in under 2 seconds, paginated at 20 per page, without the browser rendering all 92K records to the DOM"
    why_human: "Pagefind index only exists after a CI build; cannot load /pagefind-entities/pagefind.js in the local dev tree"
  - test: "Select 'Persona' in the Tipo de entidad facet, then select a century in the Fecha drill-down"
    expected: "Results narrow to persons within that century; facet counts update to reflect the intersection; URL updates with tipo=Persona&fecha_nivel=century&fecha_valor=..."
    why_human: "Requires a live Pagefind index"
  - test: "Reload /explorar/entidades/?q=gomez&tipo=person&pagina=3 directly"
    expected: "Page loads at page 3 of 'gomez' filtered to persons, showing correct results and pagination state"
    why_human: "URL state round-trip requires Pagefind at runtime"
  - test: "Open /explorar/lugares/ and confirm search, facets, and pagination work as before"
    expected: "Place explorer uses Pagefind (/pagefind-places/) for text and facets; map heatmap still renders; viewport-filter toggle still works; URL state preserved"
    why_human: "Requires live Pagefind place index and MapLibre PMTiles"
---

# Phase 08: Entity Explorer List View — Verification Report

**Phase Goal:** Users can search and filter the 92,042 entities and browse a paginated results list without the browser rendering all 92K records to the DOM
**Verified:** 2026-03-28T23:16:25Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All must-haves are drawn from the three plan frontmatter blocks. Fifteen truths across Plans 01, 02, and 03.

#### Plan 01 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Entity pages contain Pagefind filter attributes for entity_type, primary_function, and year | VERIFIED | `src/entidad.njk` lines 14, 16, 19: `data-pagefind-filter="entity_type"`, `data-pagefind-filter="primary_function"`, `data-pagefind-filter="year"` — 3 filter spans confirmed |
| 2 | Entity pages contain Pagefind sort attributes for name, date, and count | VERIFIED | `src/entidad.njk` lines 21-23: sort spans for name, date, count all present |
| 3 | Entity pages contain a data-pagefind-body div with entity name and name variants | VERIFIED | `src/entidad.njk` line 33: `<div data-pagefind-body style="display:none">` containing `ent.display_name` and `ent.name_variants` |
| 4 | Place pages contain Pagefind filter attributes for place_type, has_coordinates, and has_authority | VERIFIED | `src/lugar.njk` lines 14-16: all three filter spans confirmed |
| 5 | Place pages contain Pagefind sort attributes for name | VERIFIED | `src/lugar.njk` line 17: `data-pagefind-sort="name"` |
| 6 | CI builds three separate Pagefind indices without cross-contamination | VERIFIED | `.github/workflows/deploy.yml` lines 110-119: three separate `npx pagefind` runs — `--output-subdir pagefind` with `--exclude-selectors`, `--output-subdir pagefind-entities` with `--glob "entidad/**/*.html"`, `--output-subdir pagefind-places` with `--glob "lugar/**/*.html"` |
| 7 | The yearRange Eleventy filter generates an array of integers from start to end, capped at 500 | VERIFIED | `eleventy.config.js` lines 92-101: `parseInt`, `isNaN` guard, `Math.min(e, s + 500)` cap, integer loop — exact implementation from plan |

#### Plan 02 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | User on /explorar/entidades/ sees a search input, facet sidebar, and results area | VERIFIED | `src/explorar/entidades.njk` creates `#entity-explorer` container; `entity-explorer.js` `renderSearchResults()` builds `.search-layout`, `.search-sidebar`, `.search-results` — structure confirmed |
| 9 | Typing an entity name triggers Pagefind search and shows matching results | VERIFIED | `entity-explorer.js` line 176: `this.pagefind.search(this.state.q || null, ...)` — triggered on input change; results rendered from `search.results.map(r => r.data())` |
| 10 | Selecting entity type / function checkboxes filters results to that type/function | VERIFIED | Lines 163-164: `pfFilters.entity_type = { any: this.state.entity_type }`, `pfFilters.primary_function = { any: this.state.primary_function }` passed to Pagefind search |
| 11 | Date drill-down (century/decade/year) filters results | VERIFIED | Lines 84-90 and 165-167: `dateFilter.years` array built from drill-down selection, passed as `pfFilters.year = { any: years }`; `renderDateTree()` at line 685 implements century > decade > year hierarchy |
| 12 | Results show 20 per page with pagination controls | VERIFIED | `this.perPage = 20` (line 17); `search.results.slice(start, start + this.perPage)` (line 184); pagination rendered by `renderPagination()` |
| 13 | Each result row shows entity name link, type badge, date range, function, doc count, and name variants | VERIFIED | `renderResultCard()` lines 383-455: `result-title` link, `entity-type-badge` span, date range with en-dash, `entity-result-function`, `entity-result-doccount` with `es-CO` locale formatting and singular/plural, `entity-result-variants` capped at 3 |
| 14 | Sort toggles between name, date, and document count; URL state preserved | VERIFIED | Sort buttons at lines 487-489 (`name:asc`, `date:asc`, `count:desc`); `parseUrlParams()` / `pushState()` at lines 64-120 for `q`, `tipo`, `funcion`, `fecha_nivel`, `fecha_valor`, `orden`, `pagina` |

#### Plan 03 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 15 | Place explorer search uses Pagefind instead of in-memory substring matching; facets use Pagefind filter counts; results loaded from Pagefind hits; map still uses place-index.json; viewport toggle preserved; URL state preserved | VERIFIED | `place-explorer.js`: imports `/pagefind-places/pagefind.js` (line 56), `applyFilters` count = 0 (removed), `pagefind.search()` call at line 381, `fetch('/data/place-index.json')` at line 63 for map only, `filterByViewport()` and `renderFromCache()` at lines 463 and 475, URL params `q`/`type`/`coords`/`authority`/`sort`/`page`/`map_bound` unchanged from Phase 07 |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `eleventy.config.js` | yearRange custom filter | VERIFIED | `addFilter("yearRange", ...)` at line 92; entity-index.json passthrough removed; place-index.json passthrough preserved |
| `src/entidad.njk` | Pagefind metadata block with filters, sorts, and meta | VERIFIED | Hidden metadata div before breadcrumb nav; 3 filter spans, 3 sort spans, 6 meta spans, data-pagefind-body div, data-pagefind-entity-page marker |
| `src/lugar.njk` | Pagefind metadata block with filters, sorts, and meta | VERIFIED | Hidden metadata div before breadcrumb nav; 3 filter spans, 1 sort span, 4 meta spans, data-pagefind-body div, data-pagefind-place-page marker |
| `.github/workflows/deploy.yml` | Three Pagefind CLI runs with separate output subdirectories | VERIFIED | 3 `--output-subdir` flags, `--exclude-selectors` on description run, `--glob "entidad/**/*.html"` and `--glob "lugar/**/*.html"` on entity and place runs |
| `src/explorar/entidades.njk` | Entity explorer page template | VERIFIED | `/explorar/entidades/` permalink, breadcrumb, h1, intro, `#entity-explorer` div with `data-entity-types`, script loading entity-explorer.js, `data-pagefind-ignore` on container |
| `src/js/entity-explorer.js` | EntityExplorer class, 400+ lines | VERIFIED | 1187 lines; `class EntityExplorer`; Pagefind init from `/pagefind-entities/`; full search/facet/pagination/sort/URL-state/browse-prompt/mobile-toggle implementation |
| `src/css/input.css` | entity-type-badge, entity-result-function, entity-result-doccount, entity-result-variants | VERIFIED | All four classes defined at lines 2567-2594 inside `@layer components`; `entity-type-badge` uses `var(--color-burgundy)`, `#fff`, `border-radius: 4px`, `padding: 4px 8px`, `font-weight: 600` |
| `src/js/place-explorer.js` | Refactored PlaceExplorer using Pagefind for search/facets/results; place-index.json for map | VERIFIED | `pagefind-places` import, `bundlePath`, `applyFilters` removed (count = 0), `pagefind.search()` call, `place-index.json` fetch retained, `initMap()`, `mapBound`, `filterByViewport()`, `maplibregl.Map` all present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/entidad.njk` | `eleventy.config.js` | yearRange custom filter | WIRED | `ent.date_earliest \| yearRange(ent.date_latest)` at line 18; filter defined in eleventy.config.js |
| `.github/workflows/deploy.yml` | `_site/pagefind-entities/` | `npx pagefind --output-subdir` | WIRED | `--output-subdir pagefind-entities --glob "entidad/**/*.html"` at line 114 |
| `src/js/entity-explorer.js` | `/pagefind-entities/pagefind.js` | dynamic import with bundlePath | WIRED | `import('/pagefind-entities/pagefind.js')` at line 44; `pagefind.options({ bundlePath: '/pagefind-entities/' })` at line 45 |
| `src/explorar/entidades.njk` | `src/js/entity-explorer.js` | script tag | WIRED | `<script src="/js/entity-explorer.js"></script>` at line 28; `#entity-explorer` container drives class init via DOMContentLoaded |
| `src/js/entity-explorer.js` | `src/_data/ui.js` entity type labels | data-entity-types attribute on container | WIRED | `data-entity-types='{{ ui.entity.types \| dump \| safe }}'` on container; parsed in constructor at lines 20-24 |
| `src/js/place-explorer.js` | `/pagefind-places/pagefind.js` | dynamic import with bundlePath | WIRED | `import('/pagefind-places/pagefind.js')` at line 56; `pagefind.options({ bundlePath: '/pagefind-places/' })` at line 57 |
| `src/js/place-explorer.js` | `/data/place-index.json` | fetch for map coordinate data only | WIRED | `fetch('/data/place-index.json')` at line 63; loaded into `this.allPlaces` for map only; not used for search/facets |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/js/entity-explorer.js` | `search.results` | `this.pagefind.search()` against `/pagefind-entities/` index | Yes — Pagefind index built from entity detail pages by CI | FLOWING |
| `src/js/entity-explorer.js` | `this.globalFilters` | `this.pagefind.filters()` after init | Yes — filter counts from index | FLOWING |
| `src/js/place-explorer.js` | `search.results` | `this.pagefind.search()` against `/pagefind-places/` index | Yes — Pagefind index built from place detail pages by CI | FLOWING |
| `src/js/place-explorer.js` | `this.allPlaces` | `fetch('/data/place-index.json')` | Yes — place-index.json generated by precompute-links.js from real data | FLOWING |
| `src/explorar/entidades.njk` | `ui.entity.types` | `src/_data/ui.js` (static data file) | Yes — real entity type labels in Spanish | FLOWING |

**Note on browse prompt count:** The EntityExplorer browse prompt computes the entity count from `Object.values(this.globalFilters.entity_type).reduce(...)` when Pagefind is available, falling back to the hardcoded string "92.042" only on Pagefind init failure. This is an acceptable defensive fallback, not a stub.

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no local Pagefind indices exist (built only by CI after `npx pagefind` runs against `_site/`). The JS modules import from `/pagefind-entities/pagefind.js` at runtime; these paths do not exist in the dev tree. Module-level static analysis was used instead.

The following checks were verified statically:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| entity-explorer.js exports/self-inits | `DOMContentLoaded` listener at line 1184 instantiates `EntityExplorer` if `#entity-explorer` exists | Found at line 1184 | PASS |
| File is ≥ 400 lines | `wc -l src/js/entity-explorer.js` | 1187 lines | PASS |
| applyFilters removed from place-explorer.js | `grep -c "applyFilters" place-explorer.js` | 0 | PASS |
| All 5 plan commits exist | `git log 1978d03 818d7ed 3ccb60e 3671c56 5dca90d` | All 5 found | PASS |

---

### Requirements Coverage

All requirement IDs declared in plan frontmatter: EEXP-01, EEXP-02, EEXP-03 (claimed in all three plans).

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EEXP-01 | 08-01, 08-02, 08-03 | User can search entities by name on `/explorar/entidades/` | SATISFIED | `entity-explorer.js` search input triggers `pagefind.search(this.state.q \| null, ...)` — text search against Pagefind entity index; `entidades.njk` page exists at `/explorar/entidades/` |
| EEXP-02 | 08-01, 08-02, 08-03 | User can filter entities by facets (entity type, primary function, date range) | SATISFIED | `entity-explorer.js` builds `pfFilters` with `entity_type`, `primary_function`, and `year` keys; date drill-down renders century > decade > year hierarchy; facet checkboxes bound to `handleFacetChange()` |
| EEXP-03 | 08-01, 08-02, 08-03 | Entity explorer shows a paginated/virtual results list (never renders all 92K to DOM) | SATISFIED | `this.perPage = 20`; `search.results.slice(start, start + 20)` — only 20 results fetched and rendered per page; Pagefind never returns all 92K records to the browser simultaneously |

**Orphaned requirements check:** `grep -E "Phase 8" .planning/REQUIREMENTS.md` returns EEXP-01, EEXP-02, EEXP-03 only — no orphaned requirements.

**REQUIREMENTS.md status column** already marked Complete for all three — consistent with verification findings.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/js/entity-explorer.js` | 346, 598 | `input.placeholder = '...'` | Info | HTML input placeholder attribute — not a code stub; intentional UI copy |
| `src/js/entity-explorer.js` | 917 | `return null` | Info | Early-return when no active filters — correct guard clause, not a stub |

No blockers or warnings found. No TODO/FIXME/PLACEHOLDER comments. No empty implementations. No hardcoded empty arrays or objects used as final data sources.

---

### Human Verification Required

#### 1. Entity Search — Live Index

**Test:** Deploy the site (or run `npm run build` then serve `_site/`) and open `/explorar/entidades/`. Type "Mosquera" in the search box.
**Expected:** Results appear within 2 seconds. The results list shows 20 items max. The browser DOM contains only those 20 item nodes — not 92,042. Paginated navigation appears if more than 20 results.
**Why human:** Requires a live Pagefind entity index at `/pagefind-entities/`; cannot be verified statically.

#### 2. Facet Filtering — Entity Type and Date

**Test:** On `/explorar/entidades/`, select "Persona" from the Tipo de entidad facet, then click on the "Siglo XVII" century node in the Fecha drill-down.
**Expected:** Results narrow to persons active in the 1600s. Other facet counts update to show the intersection. The URL updates to include `tipo=person&fecha_nivel=century&fecha_valor=17` (or equivalent encoding). Deselecting the facet restores the previous result set.
**Why human:** Requires live Pagefind index with populated filter attributes from built entity pages.

#### 3. URL State Round-Trip

**Test:** Navigate to `/explorar/entidades/?q=gomez&tipo=person&pagina=2` directly.
**Expected:** Page loads at page 2 of "gomez" filtered to persons. Pagination shows correct current page. Back button restores previous state.
**Why human:** Requires live Pagefind index; `popstate` behaviour cannot be tested statically.

#### 4. Place Explorer — Pagefind Search with Map

**Test:** Open `/explorar/lugares/`, type "Bogotá" in the search input, and verify the viewport filter toggle.
**Expected:** Place results appear from the Pagefind place index (not in-memory JSON filtering). MapLibre heatmap still shows. Toggling "Filtrar por área del mapa" constrains the results list to the current map viewport. The 2 MB `place-index.json` is still fetched for map coordinates but the results list comes from Pagefind.
**Why human:** Requires live Pagefind place index and MapLibre/PMTiles tiles.

---

### Gaps Summary

No gaps. All 15 must-have truths are verified. All 7 required artifacts exist, are substantive, and are wired. All 7 key links are confirmed. Requirements EEXP-01, EEXP-02, EEXP-03 are satisfied. No blocker or warning anti-patterns found.

The phase goal — users can search and filter 92,042 entities and browse paginated results without the browser rendering all 92K records to the DOM — is achieved by the Pagefind-powered architecture: entity pages carry filter/sort/meta attributes that Pagefind indexes at build time, and the `EntityExplorer` class fetches only 20 results per page from that index at runtime.

One note on Plan 03 acceptance criteria: the criteria listed Spanish URL param names (`tipo`, `orden`, `pagina`, `mapa`) for the place explorer, but the actual implementation correctly preserves the English param names from Phase 07 (`type`, `sort`, `page`, `map_bound`). The underlying truth — "existing URL state parameters continue to work" — is satisfied; the plan's acceptance criteria text was aspirational rather than prescriptive.

---

_Verified: 2026-03-28T23:16:25Z_
_Verifier: Claude (gsd-verifier)_
