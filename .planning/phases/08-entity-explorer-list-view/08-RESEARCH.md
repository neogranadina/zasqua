# Phase 8: Entity Explorer — List View - Research

**Researched:** 2026-03-28
**Domain:** Pagefind multiple indices, Eleventy Nunjucks templating, vanilla JS class architecture
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture — Pagefind Indices**
- D-01: Three separate Pagefind indices: `/buscar/` (descriptions), `/explorar/entidades/` (entities), `/explorar/lugares/` (places).
- D-02: Replaces Phase 4 JSON-in-memory approach. Pagefind handles search, facets, pagination natively.
- D-03: Entity and place pages gain `data-pagefind-body` and `data-pagefind-filter` attributes for their respective indices; remain excluded from the description Pagefind index.
- D-04: `place-index.json` is kept for the map only. Pagefind handles search, facets, and results for the place explorer.

**Entity Page Pagefind Attributes**
- D-05: `src/entidad.njk` needs `data-pagefind-filter` for `entity_type`, `primary_function`, and `year` (one per year in date range). `data-pagefind-sort` for `name` (sort_name) and `date` (date_earliest).
- D-06: Date filtering reuses the nested century → decade → year drill-down already in `search.js`. Entity date ranges emit one `data-pagefind-filter="year"` per year spanned.

**Place Page Pagefind Attributes**
- D-07: `src/lugar.njk` needs `data-pagefind-filter` for `place_type`, `has_coordinates` (boolean), `has_authority` (boolean). `data-pagefind-sort` for `name` (display_name).

**Page Layout**
- D-08: Same sidebar + results layout as `/buscar/` and `/explorar/lugares/`.
- D-09: Mobile sidebar collapses into toggleable filter panel (same pattern as place explorer).

**Entity Result Rows**
- D-10: Each row shows (inline): name link, type badge, date range, primary function, document count, name variants.

**Sorting**
- D-11: Default alphabetical (sort_name). Toggle for date (date_earliest) and document count.

**Loading**
- D-12: Pagefind chunked index loading — no special strategy needed.

**Search Behaviour**
- D-13: Pagefind full-text search replaces custom substring matching.

**Place Explorer Migration**
- D-14: `PlaceExplorer` class refactored to use Pagefind for search/facets/results; MapLibre map fed by `place-index.json` for coordinates.
- D-15: `entity-index.json` generation in `precompute-links.js` can be removed after migration. `place-index.json` stays.

### Claude's Discretion

- How to configure separate Pagefind index builds (CLI flags, config files, or build script steps)
- Exact Pagefind filter attribute placement within entity and place templates
- How to handle entities/places with no dates (exclude from date facet or show as "Sin fecha")
- Result row styling details (spacing, typography, badge colours)
- How to structure the EntityExplorer JS class (follow PlaceExplorer pattern or refactor further)
- Build script modifications for three parallel Pagefind runs

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EEXP-01 | User can search entities by name on `/explorar/entidades/` | Pagefind full-text search with `bundlePath` pointing to entity-specific index directory; `EntityExplorer` JS class mirrors `SearchPage` init pattern |
| EEXP-02 | User can filter entities by facets (entity type, primary function, date range) | `data-pagefind-filter` attributes on entity pages; century/decade/year drill-down already implemented in `search.js`; Pagefind `filters()` API provides counts |
| EEXP-03 | Entity explorer shows paginated/virtual results list (never renders all 92K to DOM) | Pagefind native pagination — loads only the current page of results; `search.results.slice(start, start+perPage)` pattern already proven in `search.js`; 20 results per page |
</phase_requirements>

---

## Summary

Phase 8 is a Pagefind-powered entity explorer. The hardest technical problem is building and serving separate Pagefind indices — one for entity pages, one for place pages, and one for description pages — without cross-contamination. Everything else is a variation of patterns already proven in `search.js` (SearchPage class) and `place-explorer.js` (PlaceExplorer class).

The current site has a single Pagefind run: `npx pagefind --site _site`. Entity and place pages are fully excluded via `data-pagefind-ignore` on every element, so they produce zero index entries. Phase 8 requires two additional Pagefind runs that index only entity pages (output to `_site/pagefind-entities/`) and only place pages (output to `_site/pagefind-places/`). The `EntityExplorer` JS class then imports from `/pagefind-entities/pagefind.js` and calls `pagefind.options({ bundlePath: '/pagefind-entities/' })` to point it at the right index.

The entity page template (`src/entidad.njk`) currently marks every element `data-pagefind-ignore`. The migration adds a hidden metadata block (as in `description.njk` lines 14–41) with filter and sort attributes, plus `data-pagefind-body` on the entity name for full-text search. The place template follows the same pattern. The existing description Pagefind index continues to exclude entity/place pages because those pages will carry `data-pagefind-ignore` on all body elements — only the hidden metadata block will be indexed, and that block has no `data-pagefind-body`, so the description index will not pick up any content from them.

**Primary recommendation:** Two additional Pagefind CLI runs in CI, each with `--output-subdir`, targeting a filtered subset of `_site`; JS classes import from their respective index paths via `bundlePath`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pagefind | 1.4.0 (current in repo) | Entity/place search indices, facets, pagination | Already used for description search; verified with `npx pagefind --version` |
| Eleventy | ^3.1.2 | Static site generation, Nunjucks templating | Project stack |
| Nunjucks | Bundled with Eleventy | Template language for entity/place pages | Project stack |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind v4 standalone CLI | latest | CSS compilation | Only at build time for CSS changes |
| MapLibre GL JS | 5 (CDN) | Place explorer map | Place explorer only — entity explorer has no map |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Three CLI runs | Pagefind Node.js API (`createIndex`) | Node API gives programmatic control but more complex; CLI is simpler and CI-friendly |
| `--output-subdir` | `--output-path` | `--output-path` is absolute; `--output-subdir` is relative to `--site`; either works — `--output-subdir` is cleaner |

**Installation:** Pagefind is invoked via `npx pagefind` — no package.json dependency.

---

## Architecture Patterns

### Recommended Project Structure

```
_site/
├── pagefind/               # Existing: descriptions index
├── pagefind-entities/      # New: entity pages index
├── pagefind-places/        # New: place pages index
├── entidad/                # 92K entity detail pages
└── lugar/                  # 8K place detail pages

src/
├── js/
│   ├── search.js           # SearchPage class (unchanged)
│   ├── place-explorer.js   # PlaceExplorer (refactor: Pagefind for search/facets)
│   └── entity-explorer.js  # New: EntityExplorer class
├── explorar/
│   ├── lugares.njk         # Unchanged template (JS handles all rendering)
│   └── entidades.njk       # New explorer page template
├── entidad.njk             # Add Pagefind metadata block
└── lugar.njk               # Add Pagefind metadata block
```

### Pattern 1: Separate Pagefind Index Per Resource Type

**What:** Run Pagefind CLI three times — once per index — with `--site _site` and `--output-subdir` specifying a unique subdirectory. Use `--glob` (or exclude-selectors) to ensure each run only indexes the relevant pages.

**When to use:** Whenever different site sections need independent search without result cross-contamination.

**How it works — CLI runs:**

```bash
# Run 1: Description index (existing — unchanged)
npx pagefind --site _site --output-subdir pagefind

# Run 2: Entity index (new)
npx pagefind --site _site --output-subdir pagefind-entities \
  --glob "entidad/**/*.html"

# Run 3: Place index (new)
npx pagefind --site _site --output-subdir pagefind-places \
  --glob "lugar/**/*.html"
```

The `--glob` flag restricts which HTML files Pagefind indexes in each run. Entity pages live at `_site/entidad/*/index.html` and place pages at `_site/lugar/*/index.html`.

**Confidence:** HIGH — verified against Pagefind 1.4.0 docs (`--output-subdir` and `--glob` options confirmed).

### Pattern 2: Loading a Non-Default Pagefind Index in JS

**What:** Import from the index-specific `pagefind.js` path, then call `pagefind.options({ bundlePath })` so Pagefind resolves its chunk files from the right directory.

**Example:**

```javascript
// Source: https://pagefind.app/docs/search-config/
this.pagefind = await import('/pagefind-entities/pagefind.js');
await this.pagefind.options({ bundlePath: '/pagefind-entities/' });
await this.pagefind.init();
this.globalFilters = await this.pagefind.filters();
```

**Confidence:** HIGH — `bundlePath` option confirmed in official Pagefind search config docs.

### Pattern 3: Pagefind Metadata Block on Entity Pages

**What:** A hidden `<div>` with `display:none` containing `data-pagefind-filter`, `data-pagefind-sort`, and `data-pagefind-meta` spans. No `data-pagefind-body` on content elements means body text is not indexed — only the entity name is offered to Pagefind for full-text search via `data-pagefind-body` on the name element.

**Example — entity page metadata block:**

```nunjucks
{# Pagefind metadata for entity index (filters, sorting, meta) #}
<div style="display:none">
  <span data-pagefind-filter="entity_type">{{ ent.entity_type }}</span>
  {% if ent.primary_function %}
    <span data-pagefind-filter="primary_function">{{ ent.primary_function }}</span>
  {% endif %}
  {% if ent.date_earliest and ent.date_latest %}
    {% for y in range(ent.date_earliest, ent.date_latest + 1) %}
      <span data-pagefind-filter="year">{{ y }}</span>
    {% endfor %}
  {% elif ent.date_earliest %}
    <span data-pagefind-filter="year">{{ ent.date_earliest }}</span>
  {% endif %}
  <span data-pagefind-sort="name">{{ ent.sort_name }}</span>
  <span data-pagefind-sort="date">{{ ent.date_earliest or '' }}</span>
  <span data-pagefind-meta="entity_code">{{ ent.entity_code }}</span>
  <span data-pagefind-meta="entity_type">{{ ent.entity_type }}</span>
  <span data-pagefind-meta="date_earliest">{{ ent.date_earliest or '' }}</span>
  <span data-pagefind-meta="date_latest">{{ ent.date_latest or '' }}</span>
  <span data-pagefind-meta="primary_function">{{ ent.primary_function or '' }}</span>
  <span data-pagefind-meta="linked_count">{{ ent._linked_count }}</span>
  {# Name variants — up to 3 for result row display #}
  {% if ent.name_variants %}
    <span data-pagefind-meta="name_variants">{{ ent.name_variants | join(', ') }}</span>
  {% endif %}
</div>

{# Body: entity name only — drives full-text search #}
<div data-pagefind-body style="display:none">
  {{ ent.display_name }}
  {% if ent.name_variants %}{{ ent.name_variants | join(' ') }}{% endif %}
</div>
```

**Nunjucks `range` filter:** Eleventy's bundled Nunjucks does not include a built-in `range` filter that accepts start/end integers. This needs a custom Eleventy filter or a macro. See Pitfall 2.

**Confidence:** HIGH for attribute semantics; MEDIUM for exact Nunjucks syntax for year range generation (see Pitfall 2).

### Pattern 4: EntityExplorer JS Class Structure

**What:** Model `EntityExplorer` after `SearchPage` (not `PlaceExplorer`) since it uses Pagefind, not in-memory JSON. Key differences from `SearchPage`: imports from `/pagefind-entities/`, different facet keys (`entity_type`, `primary_function`, `year`), different sort options, different `renderResultCard` output.

```javascript
class EntityExplorer {
  constructor(container) {
    this.container = container;
    this.pagefind = null;
    this.perPage = 20;
    this.state = {
      q: '',
      entity_type: [],
      primary_function: [],
      dateFilter: null,   // same shape as SearchPage.state.dateFilter
      sort: '',           // 'name:asc', 'date:asc', 'count:desc', etc.
      page: 1,
    };
    this.facetGroupState = { entity_type: true, primary_function: true, date: true };
    this.init();
  }

  async init() {
    this.parseUrlParams();
    try {
      this.pagefind = await import('/pagefind-entities/pagefind.js');
      await this.pagefind.options({ bundlePath: '/pagefind-entities/' });
      await this.pagefind.init();
      this.globalFilters = await this.pagefind.filters();
    } catch (e) {
      this.showError();
      return;
    }
    window.addEventListener('popstate', () => {
      this.parseUrlParams();
      this.search();
    });
    this.search();
  }
  // ... search(), renderSearchResults(), renderFacets(), renderResultCard(), etc.
}
```

### Pattern 5: Place Explorer Migration

**What:** Refactor `PlaceExplorer` to split responsibilities: Pagefind handles search/facets/results list; `place-index.json` feeds the MapLibre map only. The map initialisation and viewport filter toggle remain. The `loadData()` method fetches `place-index.json` solely to populate the map source — not for filtering.

**Key change:** Replace the `applyFilters()` + `renderResults()` path (which filters `this.allPlaces`) with Pagefind calls that mirror `EntityExplorer.search()`. The map still calls `updateMap(allPlacesForMap)` from `place-index.json`.

### Anti-Patterns to Avoid

- **Loading `/pagefind/pagefind.js` for entity/place explorers without `bundlePath`:** Will search descriptions index, not entity/place index.
- **Putting entity content text inside `data-pagefind-body` on existing elements:** Entity/place pages must stay excluded from the description index. Keep `data-pagefind-ignore` on all visible body elements; use a separate hidden `data-pagefind-body` div with only the entity name.
- **Using `--exclude-selectors` instead of `--glob`:** Exclude-selectors removes elements from already-selected pages; it does not restrict which pages are indexed. Use `--glob` to target only entity or place pages per run.
- **Generating year filters for unbounded date ranges:** Entities with `date_earliest` but no `date_latest` (or very wide ranges) should not emit thousands of `year` filter entries. Cap at a reasonable maximum or use `date_earliest` only for such cases.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text entity name search | Custom substring/fuzzy match | Pagefind | 92K records — substring match worked for 8K places; for 92K it will noticeably lag on every keystroke |
| Facet counts | Count arrays from filtered JS | Pagefind `filters()` API | Already handles cross-facet counting correctly |
| Pagination without DOM bloat | Virtual scroll / IntersectionObserver render loop | Pagefind slice-based pagination | `search.results.slice(start, end).map(r => r.data())` fetches only the current page; proven in `search.js` |
| Year range expansion | Template loop in Nunjucks | Custom Eleventy filter `yearRange(start, end)` | Nunjucks does not have a `range(start, end)` filter that works for dynamic integers; needs a filter |
| Sort by document count | Re-sort in JS from metadata | `data-pagefind-sort="count"` + integer value | Pagefind's native sort is faster and keeps the data pipeline clean |

**Key insight:** In this project, Pagefind does all the heavy lifting that would otherwise require 5–8 MB JSON downloads and custom in-memory pipelines.

---

## Common Pitfalls

### Pitfall 1: Description Index Contamination

**What goes wrong:** Running `npx pagefind --site _site` (the existing description index run) after adding `data-pagefind-body` to entity pages will start indexing 92K entity pages into the description search.

**Why it happens:** The existing run has no `--glob` restriction. Any page with `data-pagefind-body` (and no page-level `data-pagefind-ignore`) will be indexed.

**How to avoid:** Entity and place pages must NOT carry a page-level `data-pagefind-ignore` (that would exclude them from all runs), but they must not be picked up by the description run. Solution: the hidden metadata block and `data-pagefind-body` div are present, but the description run is updated with `--glob "**/*.html" --exclude-selectors "[data-pagefind-entity-page]"` — OR, simpler: add `--glob` to the description run to restrict it to only description page paths:

```bash
# Description index: exclude entity and place pages
npx pagefind --site _site --output-subdir pagefind \
  --glob "**/*.html" \
  --exclude-selectors "[data-entity-page],[data-place-page]"
```

Alternatively, mark entity and place page containers with a custom data attribute and use `--exclude-selectors` on the description run. The `--glob` approach is cleaner — add `--glob "!(entidad|lugar)/**/*.html"` to the description run, or target only the known directory patterns.

**Warning signs:** Description search results start showing entity names; entity page count in `_site/pagefind/` fragment count spikes.

### Pitfall 2: Nunjucks `range()` for Year Filters

**What goes wrong:** Attempting `{% for y in range(ent.date_earliest, ent.date_latest + 1) %}` in Nunjucks fails — Nunjucks's built-in `range()` only accepts a single argument (count from 0); it does not accept start/end integers.

**Why it happens:** Jinja2 and Python have `range(start, stop)`. Nunjucks `range` is different — it's a global function that accepts `(start, stop, step)` but Eleventy's Nunjucks environment may not expose it in the same way.

**How to avoid:** Add a custom Eleventy filter in `eleventy.config.js`:

```javascript
eleventyConfig.addFilter("yearRange", function(start, end) {
  if (!start) return [];
  const s = parseInt(start, 10);
  const e = end ? parseInt(end, 10) : s;
  const years = [];
  for (let y = s; y <= Math.min(e, s + 500); y++) years.push(y); // cap at 500 years
  return years;
});
```

Then in `entidad.njk`: `{% for y in ent.date_earliest | yearRange(ent.date_latest) %}`.

**Warning signs:** Template compilation error mentioning `range` or incorrect filter output.

### Pitfall 3: Entities Without Dates Not Showing Under Facet-Only Queries

**What goes wrong:** A user browses all entities with no filters. Entities with no `date_earliest` emit no `year` filter values, which is correct. But if the user then selects a century facet, entities with no dates correctly disappear — which is expected. The "Sin fecha" option needs to be handled explicitly if required.

**How to avoid:** Per D-06, entities with no dates are simply excluded from the date facet. The "Sin fecha" copy in the UI-SPEC is for the result row display only (date range omitted), not a filterable value. No special handling needed in the index — just omit `year` filter spans when date data is absent.

### Pitfall 4: Large Date Ranges Bloating Index

**What goes wrong:** An entity active from 1400–1900 would emit 500 `year` filter entries. At 92K entities, this could significantly inflate the entity Pagefind index size.

**Why it happens:** D-06 says "one filter per year spanned" — this is correct for moderate date ranges but needs a cap.

**How to avoid:** In the `yearRange` custom filter, cap at 500 years maximum (or whatever is reasonable for colonial-era entities). Also: most entities will have narrow date ranges or no dates. Verify with real data before worrying about this.

### Pitfall 5: `document.count` Sort Conflicts With Pagefind Sort

**What goes wrong:** Pagefind sort works on indexed `data-pagefind-sort` values. Document count (`_linked_count`) must be emitted as a `data-pagefind-sort="count"` integer to be sortable by Pagefind. If it is stored only as `data-pagefind-meta`, Pagefind cannot sort by it.

**How to avoid:** Include `<span data-pagefind-sort="count">{{ ent._linked_count }}</span>` in the entity page metadata block. Pagefind sorts numeric strings correctly.

### Pitfall 6: CI Build Order — Pagefind Runs After Eleventy

**What goes wrong:** The existing CI workflow runs `npx pagefind --site _site` after Eleventy. The two new Pagefind runs must also come after Eleventy, in the same CI step or a follow-on step.

**How to avoid:** Add the two new `npx pagefind` commands immediately after the existing one in `deploy.yml`. All three reads from `_site`, which is fully built by Eleventy at that point.

### Pitfall 7: `eleventy.config.js` Passthrough for New Index Directories

**What goes wrong:** Pagefind writes `_site/pagefind-entities/` and `_site/pagefind-places/` during the Pagefind step. These are not Eleventy passthrough directories — Eleventy does not need to copy them. But the upload script (`upload-to-r2.py`) uploads the entire `_site` directory, so they will be included automatically. No special passthrough needed.

**How to avoid:** Do nothing — just verify that `upload-to-r2.py` does not have an allowlist that would exclude the new directories.

---

## Code Examples

Verified patterns from existing codebase and official docs:

### Three Pagefind Runs in CI (deploy.yml)

```yaml
- name: Index with Pagefind
  run: |
    # Run 1: Description search index (existing)
    npx pagefind --site _site --output-subdir pagefind \
      --glob "!(entidad|lugar)/**/*.html"

    # Run 2: Entity explorer index (new)
    npx pagefind --site _site --output-subdir pagefind-entities \
      --glob "entidad/**/*.html"

    # Run 3: Place explorer index (new)
    npx pagefind --site _site --output-subdir pagefind-places \
      --glob "lugar/**/*.html"
```

Note: Glob negation syntax (`!(entidad|lugar)`) requires shell globbing — for CI, using `--exclude-selectors "[data-pagefind-entity-page]"` on the description run may be more portable than negation globs. Verify the shell interpreter in the ubuntu-latest runner.

### EntityExplorer — Pagefind Init (JS)

```javascript
// Source: https://pagefind.app/docs/search-config/ (bundlePath)
// Pattern: mirrors SearchPage.init() in src/js/search.js
this.pagefind = await import('/pagefind-entities/pagefind.js');
await this.pagefind.options({ bundlePath: '/pagefind-entities/' });
await this.pagefind.init();
this.globalFilters = await this.pagefind.filters();
```

### EntityExplorer — Search Call (JS)

```javascript
// Pattern: mirrors SearchPage.search() in src/js/search.js lines 220-280
const pfFilters = {};
if (this.state.entity_type.length) pfFilters.entity_type = { any: this.state.entity_type };
if (this.state.primary_function.length) pfFilters.primary_function = { any: this.state.primary_function };
if (this.state.dateFilter && this.state.dateFilter.years.length) {
  pfFilters.year = { any: this.state.dateFilter.years };
}

const pfSort = {};
if (this.state.sort) {
  const [field, dir] = this.state.sort.split(':');
  pfSort[field] = dir;
}

const search = await this.pagefind.search(this.state.q || null, {
  filters: Object.keys(pfFilters).length ? pfFilters : undefined,
  sort: Object.keys(pfSort).length ? pfSort : undefined,
});

const total = search.results.length;
const totalPages = Math.ceil(total / this.perPage);
const start = (this.state.page - 1) * this.perPage;
const pageResults = search.results.slice(start, start + this.perPage);
const hits = await Promise.all(pageResults.map(r => r.data()));
```

### Entity Page Pagefind Metadata Block (Nunjucks)

```nunjucks
{# Source: description.njk lines 13-41 — adapted for entities #}
<div style="display:none">
  <span data-pagefind-filter="entity_type">{{ ent.entity_type }}</span>
  {% if ent.primary_function %}
    <span data-pagefind-filter="primary_function">{{ ent.primary_function }}</span>
  {% endif %}
  {% for y in ent.date_earliest | yearRange(ent.date_latest) %}
    <span data-pagefind-filter="year">{{ y }}</span>
  {% endfor %}
  <span data-pagefind-sort="name">{{ ent.sort_name or ent.display_name }}</span>
  <span data-pagefind-sort="date">{{ ent.date_earliest or '' }}</span>
  <span data-pagefind-sort="count">{{ ent._linked_count }}</span>
  <span data-pagefind-meta="entity_type">{{ ent.entity_type }}</span>
  <span data-pagefind-meta="date_earliest">{{ ent.date_earliest or '' }}</span>
  <span data-pagefind-meta="date_latest">{{ ent.date_latest or '' }}</span>
  <span data-pagefind-meta="primary_function">{{ ent.primary_function or '' }}</span>
  <span data-pagefind-meta="linked_count">{{ ent._linked_count }}</span>
  {% if ent.name_variants and ent.name_variants.length %}
    <span data-pagefind-meta="name_variants">{{ ent.name_variants | join(', ') }}</span>
  {% endif %}
</div>
<div data-pagefind-body style="display:none">
  {{ ent.display_name }}
  {% if ent.name_variants %}{{ ent.name_variants | join(' ') }}{% endif %}
</div>
```

### Result Row Rendering (JS)

```javascript
// Pattern: mirrors PlaceExplorer renderResults in place-explorer.js
// UI-SPEC defines three rows (D-10, 08-UI-SPEC.md Entity Result Row Anatomy)
renderResultCard(hit) {
  const item = document.createElement('li');
  item.className = 'result-item';

  // Row 1: name link + type badge + date range
  const row1 = document.createElement('div');
  const titleEl = document.createElement('h3');
  titleEl.className = 'result-title';
  const link = document.createElement('a');
  link.href = hit.url;
  link.textContent = hit.meta.title || '';
  titleEl.appendChild(link);
  row1.appendChild(titleEl);

  const badge = document.createElement('span');
  badge.className = 'entity-type-badge';
  badge.textContent = this.entityTypeLabels[hit.meta.entity_type] || hit.meta.entity_type;
  row1.appendChild(badge);

  const dateStart = hit.meta.date_earliest;
  const dateEnd = hit.meta.date_latest;
  if (dateStart) {
    const dates = document.createElement('span');
    dates.className = 'result-meta';
    dates.textContent = dateEnd && dateEnd !== dateStart ? `${dateStart}\u2013${dateEnd}` : dateStart;
    row1.appendChild(dates);
  }
  item.appendChild(row1);

  // Row 2: function + doc count
  const func = hit.meta.primary_function;
  const count = parseInt(hit.meta.linked_count, 10) || 0;
  if (func || count) {
    const row2 = document.createElement('div');
    if (func) {
      const funcEl = document.createElement('span');
      funcEl.className = 'entity-result-function';
      funcEl.textContent = func;
      row2.appendChild(funcEl);
    }
    if (func && count) {
      row2.appendChild(document.createTextNode(' \u00B7 '));
    }
    if (count) {
      const countEl = document.createElement('span');
      countEl.className = 'entity-result-doccount';
      countEl.textContent = count === 1
        ? 'Asociado a 1 documento'
        : `Asociado a ${count.toLocaleString('es-CO')} documentos`;
      row2.appendChild(countEl);
    }
    item.appendChild(row2);
  }

  // Row 3: name variants (conditional, max 3)
  const variants = hit.meta.name_variants;
  if (variants) {
    const parts = variants.split(', ').slice(0, 3);
    const row3 = document.createElement('div');
    row3.className = 'entity-result-variants';
    row3.textContent = `También conocido como: ${parts.join(', ')}`;
    item.appendChild(row3);
  }

  return item;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 4 plan: entity-index.json in-memory filtering | Pagefind index per resource type | Phase 8 (D-02) | Removes 5–8 MB JSON download; Pagefind handles search, facets, pagination |
| PlaceExplorer: pure in-memory filtering | PlaceExplorer: Pagefind for search/facets | Phase 8 (D-14) | Consistent architecture across all three explorers |
| Single Pagefind run | Three Pagefind runs | Phase 8 | Independent indices; entity/place results don't pollute description search |

**Deprecated/outdated:**
- `entity-index.json` generation in `precompute-links.js`: Removed after migration (D-15). The `entities.js` data loader still reads `entity-index.json` for `_linked_count` at build time — this path must remain until the data loader is updated to compute `_linked_count` directly from the entity_links data or embed it in `entities.json`.

---

## Open Questions

1. **Glob negation portability in CI**
   - What we know: The description Pagefind run must exclude `entidad/` and `lugar/` directories. Negation globs (`!(entidad|lugar)/**`) work in some shells but not all.
   - What's unclear: Whether GitHub Actions ubuntu-latest `bash` supports glob negation without `extglob` enabled.
   - Recommendation: Use `--exclude-selectors "[data-pagefind-entity-page],[data-pagefind-place-page]"` on the description run and add those marker attributes to entity/place page containers. More portable than glob negation.

2. **`entity-index.json` dependency chain for `_linked_count`**
   - What we know: `src/_data/entities.js` loads `_linked_count` from `entity-index.json` at Eleventy build time. `entity-index.json` is generated by `precompute-links.js`. D-15 says entity-index.json generation can be removed, but `entities.js` still reads it.
   - What's unclear: Can `entities.js` compute `_linked_count` directly? Or should entity-index.json be kept (just not served)?
   - Recommendation: Keep `entity-index.json` generation in `precompute-links.js` for now (Eleventy still needs it for `_linked_count`). Remove the passthrough copy to `_site/` and the in-memory explorer code. The file stays as a build-time artefact only.

3. **Date range year fan-out — real data profile**
   - What we know: D-06 says emit one `year` filter per year spanned. Entities with dates like 1400–1900 would emit 500 entries.
   - What's unclear: What is the actual distribution of date range widths across 92K entities?
   - Recommendation: Add a 500-year cap in the `yearRange` custom filter. Profile index size after first build.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Eleventy, precompute scripts | ✓ | (from .nvmrc) | — |
| npx pagefind | All three index runs | ✓ | 1.4.0 | — |
| GitHub Actions ubuntu-latest | CI/CD | ✓ | — | — |

No missing dependencies. All required tools are already in use in the project.

---

## Validation Architecture

No automated test framework exists in this project. There are no test files, no test config, and no test scripts in `package.json`. The project uses manual validation against the running site.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — manual validation only |
| Config file | None |
| Quick run command | `npm run build:dev` (DEV_MODE=true, limited entities) |
| Full suite command | `npm run build` (full site) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EEXP-01 | Search by entity name returns matching results | manual | — | n/a |
| EEXP-02 | Facet filters (entity type, function, date) update results | manual | — | n/a |
| EEXP-03 | 20-result pages; DOM never contains all 92K results | manual (DevTools) | — | n/a |

### Sampling Rate

- **Per task commit:** `npm run build:dev` — builds with DEV_MODE=true (100 entities) and runs Pagefind
- **Per wave merge:** Full `npm run build` equivalent
- **Phase gate:** Manual browser validation on dev build before marking complete

### Wave 0 Gaps

None — no test infrastructure is expected in this project. Manual validation is the established pattern.

---

## Sources

### Primary (HIGH confidence)

- Pagefind 1.4.0 CLI (local install) — `--output-subdir`, `--glob` options; version confirmed
- Pagefind docs (https://pagefind.app/docs/config-options/) — CLI configuration options for output directory and glob patterns
- Pagefind docs (https://pagefind.app/docs/search-config/) — `bundlePath` option for custom index paths
- `src/js/search.js` — SearchPage class: Pagefind init, filter object shape, sort, pagination, date drill-down (direct code reading)
- `src/js/place-explorer.js` — PlaceExplorer class: DOM construction, mobile toggle, result rendering (direct code reading)
- `src/description.njk` lines 12–41 — Pagefind metadata block pattern (direct code reading)
- `src/entidad.njk` — Current entity template with `data-pagefind-ignore` on all elements (direct code reading)
- `.github/workflows/deploy.yml` — CI step order; existing single Pagefind run (direct code reading)
- `src/_data/entities.js` — `entity-index.json` dependency for `_linked_count` (direct code reading)
- `scripts/precompute-links.js` — entity-index.json generation path (direct code reading)
- `eleventy.config.js` — passthrough copies; custom filters (direct code reading)

### Secondary (MEDIUM confidence)

- Pagefind docs (https://pagefind.app/docs/multisite/) — multi-site merging; confirms `bundlePath` applies per-index

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions verified
- Architecture: HIGH — Pagefind CLI options confirmed; JS patterns traced directly from existing code
- Pitfalls: HIGH for Pagefind index contamination and Nunjucks range; MEDIUM for glob negation portability (shell-dependent)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Pagefind 1.x is stable; Eleventy 3.x is stable)
