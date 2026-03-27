# Phase 6: Entity & Place Detail Pages - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Every entity and place has a publicly accessible detail page with correct metadata, authority links, a chronological timeline of archival appearances, and a link to the search page for full description filtering. Place pages include an embedded interactive map. This phase delivers Nunjucks templates, data loaders, client-side JS for timeline and map, ui.js strings, and the Pagefind filter additions needed for entity/place scoped search.

</domain>

<decisions>
## Implementation Decisions

### Page Layout & Visual Design
- **D-01:** Both entity and place pages use a **two-column layout** — metadata on the left, aside on the right — matching the existing description page pattern
- **D-02:** Place pages show the **map + chronological timeline** stacked in the aside column
- **D-03:** Entity pages show the **chronological timeline** alone in the aside column
- **D-04:** Page titles use **DM Sans (font-sans)** to match description pages — no serif distinction
- **D-05:** Type badges use **periwinkle** to match the existing description-level badge style
- **D-06:** Section headers use **DM Sans uppercase** to match description page section headers
- **D-07:** Field labels are **stacked** (label above value), matching the description page `detail-field` pattern
- **D-08:** Name variants display as **inline tags** (rounded chips)

### Map Embed (Place Pages)
- **D-09:** Place pages embed an interactive MapLibre + PMTiles map at **360px height** in the right aside column
- **D-10:** Map centres on the place's coordinates at a **country/region-level zoom (~z6–8)** — colonial-era places need geographic context for orientation
- **D-11:** **Coordinates displayed below the map** (lat/lon)
- **D-12:** Place pages **without coordinates** show a placeholder notice in the aside — "Ubicación no disponible" with an icon, following the "Material no digitalizado" pattern on description pages

### Aside Timeline (Both Page Types)
- **D-13:** The aside includes a **scrollable chronological timeline** of the entity/place's archival appearances — each entry shows date, role label (for entities), description title, and a link to the description page
- **D-14:** The timeline is a **static visual chronology** — no filtering, no role toggle, no interactivity beyond clicking through to descriptions
- **D-15:** Entries without dates go at the bottom in a "Sin fecha" group
- **D-16:** Role labels on entity timelines use the existing `ui.roles` vocabulary (Productor, Colaborador, Mencionado, etc.)
- **D-17:** Timeline data comes from the per-entity/per-place JSON shards — shards must include **role** and **date** per linked description

### Linked Descriptions
- **D-18:** The "Descripciones vinculadas" section on the detail page is **a single link** to the search page: "Ver las N descripciones vinculadas →" linking to `/buscar/?entidad={code}` or `/buscar/?lugar={code}`
- **D-19:** This requires adding **Pagefind filter attributes** on description pages — `data-pagefind-filter="entidad"` and `data-pagefind-filter="lugar"` with entity/place codes
- **D-20:** The precompute script must generate **reverse lookups** — for each description, which entity and place codes are linked to it — so the description data loader can attach them
- **D-21:** `search.js` must recognise the `entidad` and `lugar` URL parameters and apply them as Pagefind filters
- **D-22:** The timeline provides the chronological browsing experience; the search page provides the faceted filtering experience — no duplicate pagination or list rendering on the detail page

### Authority Links (Place Pages)
- **D-23:** Authority links (Wikidata, WHG, HGIS) display as **pill-shaped buttons** with external-link icons
- **D-24:** Only render links that **exist for the record** — no empty slots

### Spanish UI Strings & Labels
- **D-25:** Entity types follow **ISAAR(CPF) terminology** — Persona, Entidad corporativa, Familia
- **D-26:** Place types use **plain Spanish geographic terms** — Lugar poblado, División administrativa, Región, País, Accidente geográfico
- **D-27:** Section headers follow **ISAAR(CPF) areas** — Identificación, Historia, Relaciones, Fuentes — consistent with ISAD(G) usage on description pages
- **D-28:** Add `entity` and `place` sections to `ui.js` with all type labels, field labels, and section headers

### Claude's Discretion
- Whether entity and place templates share a base partial or are fully separate templates
- Exact MapLibre configuration (zoom levels, tile styling, pin styling)
- Timeline visual treatment (CSS/SVG approach, date formatting, gap visualisation)
- How to handle entities/places with very many linked descriptions in the timeline (hundreds of entries)
- Description data loader implementation for attaching reverse entity/place lookups
- Search facet sidebar labelling for new entity/place filters

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Templates & Patterns
- `src/description.njk` — Existing detail page pattern: two-column layout, `detail-header`/`detail-section`/`detail-field` classes, breadcrumb, Pagefind metadata, aside column with IIIF viewer or notice
- `src/_includes/header.njk` — Site header partial
- `src/_includes/footer.njk` — Site footer partial
- `src/_layouts/base.njk` — Base layout with `{% block head %}`, `{% block content %}`, `{% block scripts %}` extension points

### Data & Build Pipeline
- `src/_data/descriptions.js` — Data loading pattern: CommonJS, read JSON, build lookup maps, precompute relationships
- `src/_data/entities.js` — Currently a stub returning `[]` — to be replaced with real data loader
- `src/_data/places.js` — Currently a stub returning `[]` — to be replaced with real data loader
- `src/_data/ui.js` — All Spanish UI strings; entity `roles` already defined; needs `entity` and `place` sections added
- `.planning/phases/04-build-pipeline-data-pre-compute/04-CONTEXT.md` — Phase 4 decisions on JSON shards, index files, Pagefind exclusion
- `scripts/precompute-links.js` — Pre-compute script for entity/place shards (needs reverse lookup addition)

### Search Integration
- `src/js/search.js` — SearchPage class, Pagefind integration, URL parameter handling, facet rendering
- `src/buscar.njk` — Search page template

### Design & Visual Identity
- `../docs/frontend/guidelines/design-tokens.md` — Canonical colour, typography, and spacing tokens
- `../docs/frontend/guidelines/frontend-design.md` — Frontend design guidelines
- `src/css/main.css` — Stylesheet with Tailwind + `@layer components` for complex components

### Infrastructure
- `.planning/phases/05-pmtiles-infrastructure/05-CONTEXT.md` — PMTiles Worker at `tiles.zasqua.org`, MapLibre tile URL pattern
- `worker-tiles/` — Tiles Worker code

### Data Schema
- `.planning/PROJECT.md` §Context — Entity data fields (entity_code, display_name, entity_type, given_name, surname, honorific, dates, function, history, variants) and place data fields (place_code, display_name, place_type, lat/lon, variants, authority IDs)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `description.njk` — Two-column layout with `desc-layout`, `desc-metadata`, `desc-aside` classes; `detail-header`, `detail-section`, `detail-field` pattern; breadcrumb navigation; Pagefind filter spans; IIIF viewer or "not digitised" notice in aside
- `src/css/main.css` — `detail-*` classes, `level-badge`, `desc-viewer`, `desc-notice` styles all reusable or extensible for entity/place pages
- `src/js/description.js` — Copy-to-clipboard, TIFY viewer init — reference for client-side JS init pattern
- `src/js/search.js` — URL parameter parsing, Pagefind filter application — extend for `entidad`/`lugar` parameters

### Established Patterns
- Pagination via Eleventy front matter: `data: entities`, `size: 1`, `alias: ent`, `permalink: "/entidad/{{ ent.entity_code }}/"`
- Conditional rendering with `{% if field %}...{% endif %}` for every optional field
- `data-pagefind-ignore` on non-searchable content, `data-pagefind-body` on indexed content
- CommonJS `module.exports = async function()` for data files
- `DEV_MODE` limits data for fast local builds

### Integration Points
- `eleventy.config.js` — Needs passthrough copy for any new client-side assets (timeline JS, MapLibre)
- `data/entity-links/` and `data/place-links/` — Pre-computed JSON shards (from Phase 4)
- `data/entity-index.json` and `data/place-index.json` — Metadata indexes (from Phase 4)
- Pagefind indexing step — Description pages need new filter attributes for entity/place scoped search

</code_context>

<specifics>
## Specific Ideas

- The aside timeline is the primary browsing interface for linked descriptions — it shows the chronological narrative of an entity's or place's archival footprint
- "Descripciones vinculadas" is just a link: "Ver las N descripciones vinculadas →" to `/buscar/?entidad={code}` or `/buscar/?lugar={code}`
- URL parameters use Spanish: `lugar`, `entidad` — matching the site's language
- Place pages without coordinates still get the two-column layout with the "Ubicación no disponible" notice and the timeline below it
- The playground file (`entity-place-playground.html`) in the repo root shows the visual direction — delete it before porting

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-entity-place-detail-pages*
*Context gathered: 2026-03-26*
