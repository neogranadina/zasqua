# Phase 6: Entity & Place Detail Pages — Research

**Researched:** 2026-03-26
**Domain:** Eleventy 3 / Nunjucks templates, MapLibre GL JS + PMTiles embeds, Pagefind filter expansion, data loader enrichment
**Confidence:** HIGH — all findings grounded in verified codebase reads and previously validated stack research

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page Layout & Visual Design**
- D-01: Both entity and place pages use a two-column layout — metadata on the left, aside on the right — matching the existing description page pattern
- D-02: Place pages show the map + chronological timeline stacked in the aside column
- D-03: Entity pages show the chronological timeline alone in the aside column
- D-04: Page titles use DM Sans (font-sans) to match description pages — no serif distinction
- D-05: Type badges use periwinkle to match the existing description-level badge style
- D-06: Section headers use DM Sans uppercase to match description page section headers
- D-07: Field labels are stacked (label above value), matching the description page `detail-field` pattern
- D-08: Name variants display as inline tags (rounded chips)

**Map Embed (Place Pages)**
- D-09: Place pages embed an interactive MapLibre + PMTiles map at 360px height in the right aside column
- D-10: Map centres on the place's coordinates at a country/region-level zoom (~z6–8)
- D-11: Coordinates displayed below the map (lat/lon)
- D-12: Place pages without coordinates show a placeholder notice — "Ubicación no disponible" with an icon, following the "Material no digitalizado" pattern on description pages

**Aside Timeline (Both Page Types)**
- D-13: The aside includes a scrollable chronological timeline of the entity/place's archival appearances — each entry shows date, role label (for entities), description title, and a link to the description page
- D-14: The timeline is a static visual chronology — no filtering, no role toggle, no interactivity beyond clicking through to descriptions
- D-15: Entries without dates go at the bottom in a "Sin fecha" group
- D-16: Role labels on entity timelines use the existing `ui.roles` vocabulary (Productor, Colaborador, Mencionado, etc.)
- D-17: Timeline data comes from the per-entity/per-place JSON shards — shards must include role and date per linked description

**Linked Descriptions**
- D-18: "Descripciones vinculadas" is a single link: "Ver las N descripciones vinculadas →" to `/buscar/?entidad={code}` or `/buscar/?lugar={code}`
- D-19: This requires adding `data-pagefind-filter="entidad"` and `data-pagefind-filter="lugar"` on description pages
- D-20: The precompute script must generate reverse lookups — for each description, which entity and place codes are linked — so the description data loader can attach them
- D-21: `search.js` must recognise the `entidad` and `lugar` URL parameters and apply them as Pagefind filters
- D-22: The timeline provides chronological browsing; the search page provides faceted filtering — no duplicate pagination on the detail page

**Authority Links (Place Pages)**
- D-23: Authority links (Wikidata, WHG, HGIS) display as pill-shaped buttons with external-link icons
- D-24: Only render links that exist for the record — no empty slots

**Spanish UI Strings & Labels**
- D-25: Entity types follow ISAAR(CPF) terminology — Persona, Entidad corporativa, Familia
- D-26: Place types use plain Spanish geographic terms — Lugar poblado, División administrativa, Región, País, Accidente geográfico
- D-27: Section headers follow ISAAR(CPF) areas — Identificación, Historia, Relaciones, Fuentes
- D-28: Add `entity` and `place` sections to `ui.js` with all type labels, field labels, and section headers

### Claude's Discretion
- Whether entity and place templates share a base partial or are fully separate templates
- Exact MapLibre configuration (zoom levels, tile styling, pin styling)
- Timeline visual treatment (CSS/SVG approach, date formatting, gap visualisation)
- How to handle entities/places with very many linked descriptions in the timeline (hundreds of entries)
- Description data loader implementation for attaching reverse entity/place lookups
- Search facet sidebar labelling for new entity/place filters

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLACE-01 | User can view a place detail page at `/lugar/{display_name}/` showing display name and place type label in Spanish | Eleventy pagination from `places` data, `safeSlug` filter for permalink, `ui.place.types` lookup |
| PLACE-02 | Place detail page shows name variants when available | `name_variants` field in places.json; conditional rendering pattern from description.njk; inline tag CSS from playground |
| PLACE-03 | Place detail page shows an embedded interactive map for places with coordinates | MapLibre GL JS 5.21.1 + pmtiles 4.4.0 via CDN; tile URL from Phase 5 (`tiles.zasqua.org`); conditional on `lat`/`lon` presence |
| PLACE-04 | Place detail page shows clickable authority links (Wikidata, WHG, HGIS) only for those that exist | `wikidata_id`, `whg_id`, `hgis_id` fields in places.json; conditional rendering; pill-button pattern from playground |
| PLACE-05 | Place detail page shows linked archival descriptions loaded from pre-built JSON shards | Shard at `data/place-links/{place_code}.json`; fetch on page load via vanilla JS; timeline rendering |
| ENT-01 | User can view an entity detail page at `/entidad/{entity_code}/` showing display name and entity type in Spanish | Eleventy pagination from `entities` data; `ui.entity.types` lookup |
| ENT-02 | Entity detail page shows structured name (given name, surname, honorific), date range, and primary function | All fields present in entities.json; `detail-field` stacked pattern |
| ENT-03 | Entity detail page shows name variants when available | Same `name_variants` pattern as places; inline tag chips |
| ENT-04 | Entity detail page shows dates of existence and history when available | `dates_of_existence`, `history` fields in entities.json; conditional rendering |
| ENT-05 | Entity detail page shows linked archival descriptions loaded from pre-built JSON shards | Shard at `data/entity-links/{entity_code}.json`; timeline rendering; count for "Ver las N" link |
</phase_requirements>

---

## Summary

Phase 6 builds two new page types — entity detail pages and place detail pages — on top of infrastructure completed in Phases 4 and 5. The pattern is established: Eleventy generates ~100K pages via front-matter pagination, Nunjucks templates reuse `desc-layout`/`desc-aside`/`detail-field` CSS classes, and client-side JS fetches pre-built JSON shards to render the timeline.

The key new elements are: (1) a MapLibre GL JS map embed in the place page aside, loading tiles from `tiles.zasqua.org` via the pmtiles protocol handler; (2) a static timeline component that renders linked descriptions from the shard in chronological order, grouped with "Sin fecha" at the bottom; (3) Pagefind filter additions on description pages (`entidad`, `lugar` filter spans) fed by a reverse-lookup pass in `precompute-links.js`; and (4) search.js extensions to read `?entidad=` and `?lugar=` URL parameters.

The entities.js and places.js data loaders currently return raw arrays; both need enrichment to attach the `linked_description_count` and the reverse lookup lists for Pagefind filter spans. The descriptions.js data loader needs a complementary change to attach `_entity_codes` and `_place_codes` arrays so description templates can emit the filter spans.

**Primary recommendation:** Follow the description.njk two-column pattern exactly. Reuse `desc-layout`, `desc-aside`, `detail-header`, `detail-section`, `detail-field`, `level-badge`, and `desc-notice` CSS classes unchanged. New CSS additions are limited to: timeline item styles, authority link pill styles, and the map container.

---

## Standard Stack

### Core (no new packages — all from prior phases or CDN)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Eleventy 3 | already installed | Page generation from `entities` / `places` data | Existing SSG |
| Nunjucks | already installed | Templates | Existing template engine |
| MapLibre GL JS | 5.21.1 | Interactive map embed on place pages | Verified current on npm (2026-03-26) |
| pmtiles (JS) | 4.4.0 | PMTiles protocol handler for MapLibre | Verified current on npm (2026-03-26) |
| Tailwind CSS v4 (standalone) | already installed | CSS utility classes | Existing |
| Pagefind | 1.4.0 | Search filter integration | Existing |

### CDN Loading Pattern (no npm build step)

```html
<!-- Place page <head> — only on lugar.njk -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.css" />
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.js"></script>
<script type="module">
  import { Protocol } from 'https://cdn.jsdelivr.net/npm/pmtiles@4/dist/pmtiles.js';
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
</script>
```

Source: `.planning/research/STACK.md` — confirmed MapLibre 5.21.1 + pmtiles 4.4.0, CDN snippet

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── entidad.njk          # Entity detail page template (new)
├── lugar.njk            # Place detail page template (new)
├── js/
│   ├── entity.js        # Timeline fetch + render for entity pages (new)
│   └── place.js         # Timeline fetch + render + map init for place pages (new)
└── _data/
    ├── entities.js      # Replace stub with real loader + linked_description_count
    ├── places.js        # Replace stub with real loader + linked_description_count
    └── descriptions.js  # Add reverse lookups: _entity_codes, _place_codes
```

```
scripts/
└── precompute-links.js  # Add reverse-lookup pass (step 5)
```

### Pattern 1: Eleventy Pagination for Entity/Place Pages

The description.njk pagination pattern applies directly:

```yaml
# entidad.njk front matter
---
pagination:
  data: entities
  size: 1
  alias: ent
permalink: "/entidad/{{ ent.entity_code }}/"
layout: base.njk
eleventyComputed:
  title: "{{ ent.display_name }}"
---
```

```yaml
# lugar.njk front matter
---
pagination:
  data: places
  size: 1
  alias: place
permalink: "/lugar/{{ place.display_name | safeSlug }}/"
layout: base.njk
eleventyComputed:
  title: "{{ place.display_name }}"
---
```

Source: `src/description.njk` — established pagination pattern; `eleventy.config.js` — `safeSlug` filter confirmed present

**Important:** `safeSlug` currently strips only `?` and `#`. Place display names may contain characters that conflict with filesystem paths (slashes, colons). Verify place display names against the filter before committing. Add any additional characters to the filter if needed.

### Pattern 2: Two-Column Layout (reuse description.njk CSS classes)

The `desc-layout`, `desc-metadata`, and `desc-aside` classes are defined in `src/css/input.css` (compiled to `main.css`). Entity and place templates can use them unchanged:

```html
<div class="detail-content">
  <div class="container">
    <div class="desc-layout">

      <!-- Left column: metadata -->
      <div class="desc-metadata" data-pagefind-ignore>
        <!-- detail-section / detail-field blocks -->
      </div>

      <!-- Right column: aside -->
      <div class="desc-aside">
        <!-- map (place only) + timeline -->
      </div>

    </div>
  </div>
</div>
```

`desc-aside` width is fixed at 440px (desktop), 100% (mobile). This is sufficient for the 360px-height map and a scrollable timeline below it.

Source: `src/css/input.css` lines 2004–2032 — confirmed class definitions and responsive breakpoints

### Pattern 3: Pagefind Exclusion on Entity/Place Pages

Per Phase 4 decision D-01: entity and place pages are excluded from Pagefind. Apply `data-pagefind-ignore` on the page body wrapper, matching the tree children pattern in description.njk:

```html
<div class="detail-content" data-pagefind-ignore>
```

Alternatively, exclude these pages in the Pagefind CLI invocation by path prefix. Either approach works; `data-pagefind-ignore` on the container is more explicit.

### Pattern 4: Pagefind Filter Spans on Description Pages

Decision D-19 requires adding `entidad` and `lugar` filter spans to description.njk. The established pattern (from description.njk lines 13–35) is hidden `<span>` elements inside a `display:none` div before `data-pagefind-body`. The same location works for entity/place filters:

```html
{# In the hidden filter div in description.njk #}
{% for code in desc._entity_codes %}
  <span data-pagefind-filter="entidad">{{ code }}</span>
{% endfor %}
{% for code in desc._place_codes %}
  <span data-pagefind-filter="lugar">{{ code }}</span>
{% endfor %}
```

This requires `_entity_codes` and `_place_codes` arrays to be attached to each description object by the data loader. See "Reverse Lookup" below.

Source: `src/description.njk` lines 13–35 — hidden filter span pattern confirmed

### Pattern 5: Reverse Lookup Generation in precompute-links.js

The current `precompute-links.js` (verified) writes forward shards: entity_code → [descriptions]. The reverse lookup is the inverse: reference_code → [entity_codes] and reference_code → [place_codes]. This is a new pass in the same script:

```javascript
// Step 5: reverse lookup maps
const entityCodesForDesc = new Map();   // reference_code -> Set<entity_code>
const placeCodesForDesc  = new Map();   // reference_code -> Set<place_code>

for (const link of entityLinks) {
  if (!entityCodesForDesc.has(link.reference_code)) {
    entityCodesForDesc.set(link.reference_code, new Set());
  }
  entityCodesForDesc.get(link.reference_code).add(link.entity_code);
}

for (const link of placeLinks) {
  if (!placeCodesForDesc.has(link.reference_code)) {
    placeCodesForDesc.set(link.reference_code, new Set());
  }
  placeCodesForDesc.get(link.reference_code).add(link.place_code);
}

// Write reverse-lookup JSON files for the description data loader
const descEntityLinksPath = path.join(DATA_DIR, 'desc-entity-lookup.json');
const descPlaceLookupPath = path.join(DATA_DIR, 'desc-place-lookup.json');

const entityLookupObj = {};
for (const [ref, codes] of entityCodesForDesc) {
  entityLookupObj[ref] = Array.from(codes);
}
const placeLookupObj = {};
for (const [ref, codes] of placeCodesForDesc) {
  placeLookupObj[ref] = Array.from(codes);
}

fs.writeFileSync(descEntityLinksPath, JSON.stringify(entityLookupObj));
fs.writeFileSync(descPlaceLookupPath, JSON.stringify(placeLookupObj));
```

Then `descriptions.js` reads these lookup files and attaches `_entity_codes` / `_place_codes` to each description object.

**Memory estimate:** 308K entity-description links, each with a reference_code key (~20 chars) and entity_code value (~15 chars). The reverse lookup JSON file will be approximately 10–15 MB uncompressed. This is read once at build time and discarded after `descriptions.js` finishes — no runtime impact.

### Pattern 6: Data Loader Enrichment (entities.js and places.js)

The stubs currently return raw JSON arrays. For Phase 6, both need `linked_description_count` attached from the pre-built index files, so templates can render "Ver las N descripciones vinculadas":

```javascript
// In entities.js — load entity-index.json to get linked_description_count
const entityIndexPath = path.join(DATA_DIR, 'entity-index.json');
const entityIndex = JSON.parse(fs.readFileSync(entityIndexPath, 'utf8'));
const countByCode = new Map();
for (const idx of entityIndex) {
  countByCode.set(idx.entity_code, idx.linked_description_count);
}
for (const entity of entities) {
  entity._linked_count = countByCode.get(entity.entity_code) || 0;
}
```

**Alternative (simpler):** Load linked_description_count directly from entity-index.json instead of entities.json and join in the data loader. Either approach works. The planner should choose based on whether the full entities.json fields are needed in the template.

### Pattern 7: Client-Side Timeline Rendering

The shard files (`data/entity-links/{code}.json`, `data/place-links/{place_code}.json`) are already passthrough-copied to `_site/` via `eleventy.config.js`. Client JS fetches the shard on page load:

```javascript
// entity.js — minimal fetch pattern
const entityCode = document.getElementById('entity-timeline').dataset.entityCode;
const res = await fetch(`/data/entity-links/${entityCode}.json`);
const links = await res.json();

// Sort: dated entries by date_expression ascending, undated last
const dated = links.filter(l => l.date_expression).sort(/* year extraction */);
const undated = links.filter(l => !l.date_expression);
const sorted = [...dated, ...undated];
// Render to timeline container
```

Decision D-17 requires shards to include `role` and `date` per linked description. Verify: `precompute-links.js` (confirmed at lines 33–39) already writes `role` and `date_expression` into entity-link shards. Place-link shards also write `role` and `date_expression` (lines 108–114). Both shards contain the required fields.

**Large timeline concern (Claude's discretion):** Some entities may have hundreds or thousands of linked descriptions. Options include: (a) render all entries but use CSS `max-height` + `overflow-y: auto` on the timeline container; (b) render the first N entries and show a "Ver más" button that reveals the rest; (c) render all but virtualise with IntersectionObserver. Option (a) is simplest and consistent with the static, non-interactive approach chosen in D-14. The timeline container will naturally need a scrollable wrapper since the aside column is not infinite.

### Pattern 8: MapLibre Map Embed (Place Pages)

```javascript
// In place.js — init after DOM ready
const mapEl = document.getElementById('place-map');
if (mapEl) {
  const lat = parseFloat(mapEl.dataset.lat);
  const lon = parseFloat(mapEl.dataset.lon);

  // pmtiles protocol handler (loaded via <script type="module"> in head)
  const map = new maplibregl.Map({
    container: 'place-map',
    style: {
      version: 8,
      sources: {
        'places': {
          type: 'vector',
          url: 'pmtiles://https://tiles.zasqua.org/zasqua-places.pmtiles'
        }
      },
      layers: [/* background + circle layer */]
    },
    center: [lon, lat],
    zoom: 7
  });

  new maplibregl.Marker({ color: '#8B2942' })
    .setLngLat([lon, lat])
    .addTo(map);
}
```

**Tile URL:** `https://tiles.zasqua.org/zasqua-places.pmtiles` — confirmed in Phase 5 context D-03.

**Zoom:** D-10 specifies z6–8 for colonial-era geographic context. z7 is a sensible default (shows the full country).

**No-coordinates case:** D-12 specifies a "Ubicación no disponible" notice. The template conditionally renders either the map container or the notice based on whether `place.lat` is set. The `desc-notice` CSS class and icon pattern from description.njk is the established pattern.

Source: `.planning/research/STACK.md` — MapLibre + pmtiles CDN snippet; Phase 5 CONTEXT D-03 — tile URL

### Pattern 9: search.js Extension for entidad/lugar Parameters

The `parseUrlParams` method reads `params.getAll(...)` for each filter dimension. Adding entity/place support is additive:

```javascript
// Add to state object
this.state.entidad = [];
this.state.lugar = [];

// In parseUrlParams()
this.state.entidad = params.getAll('entidad');
this.state.lugar = params.getAll('lugar');

// In updateUrl()
for (const e of this.state.entidad) params.append('entidad', e);
for (const l of this.state.lugar) params.append('lugar', l);

// In search() — build Pagefind filters
if (this.state.entidad.length) pfFilters.entidad = { any: this.state.entidad };
if (this.state.lugar.length) pfFilters.lugar = { any: this.state.lugar };
```

These filters are not rendered in the sidebar facet UI (the user arrives from a detail page link, not from a sidebar selection), so no new facet group is needed. If the search page detects an active `entidad` or `lugar` filter, it could display a contextual pill showing which entity/place is scoped — this is Claude's discretion.

Source: `src/js/search.js` lines 26–103, 215–244 — confirmed state/filter pattern

### Anti-Patterns to Avoid

- **Fetching shard data at build time in the data loader:** Do not pre-load all 92K shard files in `entities.js`. Shards are fetched client-side on demand — the whole point is deferred loading. The data loader only needs the metadata fields in entities.json/places.json.
- **Rendering linked descriptions as a full list in the template:** D-18 explicitly says the "Descripciones vinculadas" section is a single link. Rendering descriptions in the template (not the timeline JS) would bloat the HTML and duplicate what the timeline provides.
- **Adding entity/place pages to the Pagefind index:** Phase 4 D-01 locked this decision. Do not add `data-pagefind-body` to entity/place templates.
- **Using npm for new JS libraries:** STACK.md is explicit — no npm JS builds. MapLibre and pmtiles load via CDN only.
- **Sharing a single Eleventy config between description and entity/place builds:** If the build is split into two parallel Eleventy processes, each needs its own config. If remaining as a single build, this is not an issue.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map rendering | Custom canvas/SVG map | MapLibre GL JS | WebGL vector rendering, PMTiles protocol handling, marker API — all built in |
| PMTiles range requests | Custom fetch + binary parser | `pmtiles` JS library via `addProtocol` | PMTiles binary format parsing has edge cases; official library handles all of them |
| URL parameter management in search.js | New URL parsing class | Extend existing `parseUrlParams`/`updateUrl` | Pattern already works for 8 filter dimensions; adding 2 more is 10 lines |
| Sorting timeline entries | Custom date sort with colonial edge cases | `date_expression` field sorting with undated-last group | Colonial dates are already normalised as strings in the shard; sort lexicographically and handle the undated case explicitly |
| CSS layout system | New grid/flex layout for entity/place pages | `desc-layout` / `desc-metadata` / `desc-aside` classes | Already compiled into main.css; responsive breakpoints included |

**Key insight:** The entire Phase 6 UI is a composition of patterns already proven in description.njk. The only genuinely new element is the MapLibre map embed; everything else — layout, fields, badges, notices, client-side fetch — has a direct analogue in the existing codebase.

---

## Common Pitfalls

### Pitfall 1: safeSlug does not cover all place display name characters

**What goes wrong:** Place display names (e.g. "Santa Fe de Bogotá") include spaces, accents, and potentially other characters. The current `safeSlug` filter only strips `?` and `#`. Eleventy generates file paths from the permalink, so names with slashes (`/`) would create unexpected directory nesting.

**Why it happens:** The filter was designed for reference codes, not natural-language place names.

**How to avoid:** Before using place display names as permalink slugs, check for path-separator characters in the dataset. If any exist, add them to the `safeSlug` filter. Alternatively, use `place_code` as the URL key (similar to `entity_code` for entities) — cleaner but changes the URL structure from what D-01 specifies.

**Warning signs:** Build produces more directory levels than expected; place pages not found at their expected URLs.

### Pitfall 2: Pagefind filter spans on description pages inflate the index

**What goes wrong:** Adding `entidad` and `lugar` filter spans with entity/place codes to every description page could significantly increase the Pagefind index size. Some descriptions link to dozens of entities.

**Why it happens:** Pagefind indexes all filter values. If a description is linked to 50 entities, 50 `entidad` filter spans are added. The index grows proportionally.

**How to avoid:** Profile the index size increase after adding the spans. If index size grows unacceptably (more than ~20%), consider whether the filter-by-entity-on-search-page feature is worth the trade-off, or limit filter spans to the first N entity/place codes per description. Given that the `?entidad=...` link on entity pages links to the search page filtered by entity code — and this is a direct URL navigating from the detail page — the Pagefind filter spans are only needed if the search page sidebar shows entity/place as filterable facets. Since decision D-21 only requires reading the URL parameter, not building a sidebar facet, this may be a non-issue if the `entidad`/`lugar` filters are applied via the URL and never shown as sidebar groups.

**Warning signs:** Pagefind CLI reports index file sizes over 5MB per chunk; `pagefind --bundle-dir` takes significantly longer than before.

### Pitfall 3: MapLibre `addProtocol` called multiple times

**What goes wrong:** If `place.js` is included on pages where the `<script type="module">` pmtiles initialiser also runs, `addProtocol` may be called twice, causing a "Protocol already registered" warning or silent failure.

**Why it happens:** The module script and the place.js script both initialise the protocol.

**How to avoid:** Put the `addProtocol` call in the inline module script (in the `{% block head %}` of lugar.njk) and have `place.js` assume it is already registered. Do not call `addProtocol` in `place.js`. The module script runs before `place.js`.

**Warning signs:** Browser console shows "Protocol 'pmtiles' already registered"; tiles fail to load.

### Pitfall 4: reverse lookup JSON files too large for descriptions.js

**What goes wrong:** `desc-entity-lookup.json` containing 308K entity-description links may be large enough (~10–15 MB) to noticeably slow the Eleventy build's data loading phase.

**Why it happens:** `descriptions.js` reads multiple large files sequentially. Reading and parsing a 10MB JSON file takes ~100–200ms; not a blocker but worth knowing.

**How to avoid:** Read the lookup file once, build a `Map`, then iterate. Do not use `JSON.parse` + `Object.keys` in a loop. The `Map` approach used in `descriptions.js` for ancestors and repos is the correct pattern.

**Warning signs:** Build time increases noticeably without a proportional increase in page count.

### Pitfall 5: Entity/place pages included in Pagefind index inadvertently

**What goes wrong:** If `data-pagefind-body` is added to entity/place templates (or no `data-pagefind-ignore` is present), entity/place pages appear in description search results with irrelevant snippets.

**Why it happens:** Pagefind indexes all HTML files in `_site/` by default. Without explicit exclusion, entity/place pages are indexed.

**How to avoid:** Add `data-pagefind-ignore` to the main content wrapper in both `entidad.njk` and `lugar.njk`. Do not add `data-pagefind-body` to any entity/place content. Confirm in the Pagefind CLI output (`--output-path _site/pagefind`) that entity/place paths do not appear in the index.

**Warning signs:** Search results return entity or place pages for archival queries; Pagefind index is larger than expected.

---

## Code Examples

### Entity page front matter and data access

```nunjucks
{# Source: description.njk pagination pattern #}
---
pagination:
  data: entities
  size: 1
  alias: ent
permalink: "/entidad/{{ ent.entity_code }}/"
layout: base.njk
eleventyComputed:
  title: "{{ ent.display_name }}"
---

{# Type badge — periwinkle, pill shape (D-05, D-08) #}
<span class="level-badge">{{ ui.entity.types[ent.entity_type] or ent.entity_type }}</span>

{# Name variants — inline chips (D-08) #}
{% if ent.name_variants and ent.name_variants.length %}
  <div class="entity-variants">
    {% for v in ent.name_variants %}
      <span class="entity-variant-tag">{{ v }}</span>
    {% endfor %}
  </div>
{% endif %}

{# Linked descriptions count link (D-18) #}
{% if ent._linked_count > 0 %}
  <a href="/buscar/?entidad={{ ent.entity_code }}">
    Ver las {{ ent._linked_count }} descripciones vinculadas &rarr;
  </a>
{% endif %}

{# Timeline container (D-13) — populated by entity.js #}
<div id="entity-timeline" data-entity-code="{{ ent.entity_code }}"></div>
```

### Place page — conditional map or notice

```nunjucks
{# Source: desc-notice pattern from description.njk + MapLibre decision D-09/D-12 #}
{% if place.lat %}
  {# Map embed #}
  <div id="place-map" class="place-map-container"
       data-lat="{{ place.lat }}" data-lon="{{ place.lon }}"></div>
  <p class="place-coords">{{ place.lat }}, {{ place.lon }}</p>
{% else %}
  {# No-coordinates notice — mirrors desc-notice pattern #}
  <div class="desc-notice">
    <span class="material-symbols-outlined desc-notice-icon">location_off</span>
    <div class="desc-notice-title">{{ ui.place.noCoordinates }}</div>
  </div>
{% endif %}
```

### Authority link pills (place pages)

```nunjucks
{# Source: decision D-23/D-24 — only render links that exist #}
<div class="place-authority-links">
  {% if place.wikidata_id %}
    <a href="https://www.wikidata.org/wiki/{{ place.wikidata_id }}"
       class="authority-pill" target="_blank" rel="noopener">
      <span class="material-symbols-outlined">open_in_new</span>
      Wikidata
    </a>
  {% endif %}
  {% if place.whg_id %}
    <a href="https://whgazetteer.org/places/{{ place.whg_id }}/detail"
       class="authority-pill" target="_blank" rel="noopener">
      <span class="material-symbols-outlined">open_in_new</span>
      WHG
    </a>
  {% endif %}
  {% if place.hgis_id %}
    <span class="authority-pill authority-pill--text">HGIS: {{ place.hgis_id }}</span>
  {% endif %}
</div>
```

Note: HGIS (Historical GIS of the Americas) identifiers may not have a stable deep-link URL — render as a plain identifier unless a URL pattern is confirmed.

### Pagefind filter spans on description pages

```nunjucks
{# In the hidden filter div in description.njk — alongside existing filters #}
{% for code in desc._entity_codes %}
  <span data-pagefind-filter="entidad">{{ code }}</span>
{% endfor %}
{% for code in desc._place_codes %}
  <span data-pagefind-filter="lugar">{{ code }}</span>
{% endfor %}
```

### search.js — entidad/lugar parameter handling

```javascript
// Source: search.js parseUrlParams/updateUrl/search pattern (lines 67–243)
// Add to state initialisation:
this.state.entidad = [];
this.state.lugar = [];

// In parseUrlParams():
this.state.entidad = params.getAll('entidad');
this.state.lugar = params.getAll('lugar');

// In updateUrl():
for (const e of this.state.entidad) params.append('entidad', e);
for (const l of this.state.lugar) params.append('lugar', l);

// In search() pfFilters construction:
if (this.state.entidad.length) pfFilters.entidad = { any: this.state.entidad };
if (this.state.lugar.length) pfFilters.lugar = { any: this.state.lugar };
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Description-only Eleventy build | Separate entity/place Eleventy build (Phase 4 decision) | Phase 4, 2026-03-26 | Two build processes; templates need their own config or share the existing one |
| No PMTiles infrastructure | Worker at `tiles.zasqua.org` serving PMTiles from `zasqua-tiles` bucket | Phase 5, 2026-03-26 | Map embed can reference the tile URL directly without any additional setup |
| Pagefind description-only index | Pagefind description-only with entity/place filter spans | Phase 6 (this phase) | Filter spans add `entidad`/`lugar` dimensions to the description index |

**Deprecated/outdated:**
- `src/_data/entities.js` returning `[]` stub — must be replaced with real data loader
- `src/_data/places.js` returning `[]` stub — must be replaced with real data loader

---

## Open Questions

1. **HGIS deep-link URL pattern**
   - What we know: `hgis_id` field is present in places.json; HGIS de las Indias is the likely data source
   - What's unclear: Whether HGIS has a stable URL pattern for individual place records (e.g., `https://hgis.org/record/{id}`)
   - Recommendation: Render as a plain identifier (`HGIS: {id}`) for Phase 6; add a URL if verified later

2. **Place display names with path-separator characters**
   - What we know: `safeSlug` strips `?` and `#` only; place display names are natural-language strings from the backend
   - What's unclear: Whether any of the 8,177 place names contain `/` or other filesystem-unsafe characters
   - Recommendation: Inspect the first 50–100 place display names in places.json at build time; update `safeSlug` if needed before creating place templates. Alternatively, use `place_code` as the URL key (cleaner, collision-free), but this changes the URL pattern from D-01.

3. **Single build vs. two-build architecture for Phase 6**
   - What we know: Phase 4 decision kept a single Eleventy build but noted "profile first, split only if build exceeds ~25 min"; entity/place templates now exist, so profiling is possible
   - What's unclear: Whether ~200K pages in a single build OOMs on GitHub Actions (~6 GB heap limit)
   - Recommendation: Run the single build locally with all data; if it exceeds 25 minutes or OOMs, implement the two-build parallel architecture described in `.planning/research/STACK.md`

4. **Pagefind index size impact from entidad/lugar filter spans**
   - What we know: 308K entity-description links, 85K place-description links; some descriptions have many linked entities
   - What's unclear: Whether many-filter-span descriptions cause meaningful index size growth
   - Recommendation: Profile after adding spans; if index grows >20%, consider omitting the filter spans and relying solely on the direct URL link (`/buscar/?entidad={code}`) without Pagefind index support

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All data loaders, precompute scripts | Yes | v22.17.0 | — |
| npm | Version checks only | Yes | 10.9.2 | — |
| MapLibre GL JS | Place map embed | CDN | 5.21.1 (verified 2026-03-26) | — |
| pmtiles (JS) | Place map embed | CDN | 4.4.0 (verified 2026-03-26) | — |
| tiles.zasqua.org Worker | Place map tiles | Deployed (Phase 5) | — | Show static notice if Worker unreachable |
| data/entity-links/ shards | Timeline JS | Built (Phase 4) | — | — |
| data/place-links/ shards | Timeline JS | Built (Phase 4) | — | — |
| data/entity-index.json | linked_description_count in templates | Built (Phase 4) | — | — |
| data/place-index.json | linked_description_count in templates | Built (Phase 4) | — | — |

**Missing dependencies with no fallback:** None — all infrastructure from Phases 4 and 5 is confirmed complete.

---

## Validation Architecture

> `workflow.nyquist_validation` not set in config.json — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — this is a static SSG project; no automated test framework is installed |
| Config file | None |
| Quick run command | `DEV_MODE=true npx @11ty/eleventy --serve` (visual inspection) |
| Full suite command | `npx @11ty/eleventy --dryrun` (verifies all templates parse without error) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLACE-01 | Place page renders at `/lugar/{name}/` | smoke | `npx @11ty/eleventy --dryrun 2>&1 | grep lugar` | No — template to create |
| PLACE-02 | Name variants render when present | visual | Inspect with DEV_MODE=true place with known variants | No |
| PLACE-03 | Map renders for place with coordinates | visual | Open `/lugar/{name-with-coords}/` in browser | No |
| PLACE-04 | Only present authority links render | visual | Inspect place with known partial authority links | No |
| PLACE-05 | Timeline loads from shard | visual | Open place page; check Network tab for shard fetch | No |
| ENT-01 | Entity page renders at `/entidad/{code}/` | smoke | `npx @11ty/eleventy --dryrun 2>&1 | grep entidad` | No — template to create |
| ENT-02 | Structured name, dates, function render | visual | Inspect entity with known full metadata | No |
| ENT-03 | Name variants render when present | visual | Inspect entity with known variants | No |
| ENT-04 | Dates of existence and history render | visual | Inspect entity with known history field | No |
| ENT-05 | Timeline loads from shard | visual | Open entity page; check Network tab for shard fetch | No |

All tests are visual/smoke — this project has no automated unit or integration test framework. Verification is by Eleventy `--dryrun` (template syntax) + browser inspection (runtime behaviour).

### Wave 0 Gaps

- [ ] `src/entidad.njk` — covers ENT-01 through ENT-05
- [ ] `src/lugar.njk` — covers PLACE-01 through PLACE-05
- [ ] `src/js/entity.js` — timeline fetch and render
- [ ] `src/js/place.js` — timeline fetch, render, and map init

*(No test framework gaps — project has no automated test suite by design)*

---

## Sources

### Primary (HIGH confidence)

- Codebase direct reads:
  - `src/description.njk` — two-column layout, pagination pattern, Pagefind filter spans, detail-field pattern
  - `src/_data/entities.js`, `src/_data/places.js` — current stub loaders
  - `src/_data/descriptions.js` — data loader enrichment pattern
  - `src/_data/ui.js` — existing string vocabulary; roles already defined
  - `scripts/precompute-links.js` — entity/place shard format (fields: reference_code, title, date_expression, repository_code, role confirmed)
  - `eleventy.config.js` — passthrough copy config; safeSlug filter definition
  - `src/css/input.css` — desc-layout, desc-aside, detail-field, level-badge, desc-notice class definitions
  - `src/js/search.js` — state/filter/URL parameter pattern
  - `entity-place-playground.html` — playground visual spec for badge, variant tag, authority pill, map embed, timeline
  - `.planning/phases/06-entity-place-detail-pages/06-CONTEXT.md` — all locked decisions

- Pre-existing research:
  - `.planning/research/STACK.md` — MapLibre 5.21.1, pmtiles 4.4.0 CDN snippets, version compatibility
  - `.planning/phases/04-build-pipeline-data-pre-compute/04-CONTEXT.md` — D-01 (Pagefind exclusion), D-06/D-07 (index fields)
  - `.planning/phases/05-pmtiles-infrastructure/05-CONTEXT.md` — tile URL `tiles.zasqua.org`, D-03

### Secondary (MEDIUM confidence)

- npm registry: maplibre-gl@5.21.1 and pmtiles@4.4.0 verified as current versions (2026-03-26)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against npm registry; CDN patterns from prior phase research
- Architecture: HIGH — grounded in direct codebase reads; patterns replicated from description.njk
- Pitfalls: HIGH — derived from reading actual code and data schemas, not from general knowledge
- Open questions: documented gaps, not hidden assumptions

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (MapLibre releases frequently; re-verify CDN version if planning is delayed more than 30 days)
