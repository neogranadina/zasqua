---
phase: 13-hugo-foundation
scope: "Plans 13-09 through 13-14 (batch-mode execution)"
status: complete
completed: 2026-04-17
mode: batch
---

# Phase 13 — Plans 13-09 through 13-14 (batch summary)

## Batch-mode rationale

After Plans 13-04 through 13-08 landed with per-plan checkpoints and A/B verification against `zasqua.org`, the user granted batch execution through the remaining template ports (13-09 to 13-14). Plan 13-15 (Eleventy removal) stays gated on user approval per `feedback_batch_port_mode.md` — destructive actions never batch.

## Commits in this batch

| Hash | Plan | Subject |
|------|------|---------|
| `e2f1917` | 13-09 | port description detail template (ISAD(G) core) |
| `5ed59d3` | 13-10 | wire description IIIF viewer + Miller columns + scripts |
| `b9d1378` | 13-11 | add Pagefind metadata + OCR indexing to description page |
| `859b2e7` | 13-12 | port entity detail template |
| `8d3e973` | 13-13 | port place detail template |
| `8ce7e2a` | 13-14 | port explorer pages (/entidades/ + /lugares/) |

## Templates ported

| Source (Eleventy) | Target (Hugo) | Source lines | Ported in |
|---|---|---|---|
| `src/description.njk` | `layouts/descripcion/single.html` | 413 | 13-09 + 13-10 + 13-11 |
| `src/entidad.njk` | `layouts/entidad/single.html` | 261 | 13-12 |
| `src/lugar.njk` | `layouts/lugar/single.html` | 226 | 13-13 |
| `src/explorar/entidades.njk` | `layouts/entidades/list.html` | 237 | 13-14 |
| `src/explorar/lugares.njk` | `layouts/lugares/list.html` | 96 | 13-14 |
| **Total** | | **1,233 lines** | |

## Plan-specific outcomes

### 13-09 — Description skeleton + ISAD(G)
- Added `id` field to `content/descripcion/_content.gotmpl` params (for Plan 13-10's Miller columns data-parent-id)
- Ported ~80% of src/description.njk: breadcrumb (from ancestor_chain), detail-header, two-column detail-content with all ISAD(G) sections (Descripcion, Información bibliográfica, Personas y entidades, Lugares, Condiciones de acceso, Materiales relacionados, Notas, Reutilización), desc-notice fallback in aside column
- Filter translations: `splitPipe` → `split X "|"`, `formatDate` → pre-computed `date_formatted`, `safeSlug` → identity

### 13-10 — Description IIIF viewer + Miller columns
- Replaced two placeholder comments in description template: IIIF desc-viewer div (with data-manifest), Miller columns collection-tree div (with data-parent-id from .Params.id + data-level-labels via printf + safeHTMLAttr)
- Added head block (conditional tify.css) and scripts block (conditional tify.js + unconditional description.js + conditional tree.js)
- Template version v1.0.0 → v1.0.1

### 13-11 — Description Pagefind + OCR
- Added Pagefind metadata hidden div with 18 data-pagefind-* attributes (filters, sort, meta) at the top of main
- Added OCR hidden indexing block at the bottom (data-pagefind-body, data-pagefind-weight="0.5", hidden)
- Entity/place codes derived inline from entity_links/place_links (no separate params needed)
- `extractYear` → `substr date_start 0 4`; `escapeTemplate | safe` → Hugo's auto-escape in body context
- Template version v1.0.1 → v1.0.2

### 13-12 — Entity detail
- Content adapter extended with `entity_code`, `display_name`, `sort_name`, `entity_type`, `roles` (some already existed, de-duped)
- Full port with year/century/decade range filters implemented via Hugo `seq` + `math.Floor` + arithmetic (matching eleventy.config.js yearRange/centuryRange/decadeRange byte-for-byte)
- Fixed a latent bug in `src/entidad.njk`: the "Ver en explorador" anchor was missing its closing `>` (Hugo's strict html/template parser caught it where Eleventy tolerated)

### 13-13 — Place detail
- `hugo.toml` [params]: added `protomaps_key = "264dbbf1fa6f497d"` (ported from `src/_data/site.js`)
- Content adapter extended with `id` (for place_code fallback `nl-{id}` when place_code is missing)
- Full port with conditional Pagefind metadata (only when in_explorer = has coords OR linked_count > 1), Wikidata/TGN/WHG/HGIS authority rows, map panel (MapLibre + Protomaps) when coords exist else no-coords notice, linked-descriptions list with sort toggle
- `countryName` filter (Eleventy's Intl.DisplayNames) replaced by inline Spanish dict for 14 common codes (COL/PER/BOL/ECU/VEN/ARG/BRA/CHL/MEX/USA/ESP/FRA/GBR/PAN); unmapped codes fall back to the raw code
- `urlencode` → Hugo's `urlquery`

### 13-14 — Explorer pages
- content/entidades/_index.md + content/lugares/_index.md route /entidades/ and /lugares/
- layouts/entidades/list.html: full port including force-graph CDN script, inline IIFE wiring InfiniteBipartiteExplorer + EntityExplorer, viewport filter toggle, empty-state overlay with 4 example entity links
- layouts/lugares/list.html: full port with MapLibre + Protomaps basemap, place-count-live computed from places.json at build time (matches Eleventy's `places | length | numberFormat`), 4 example place buttons
- entity-count-live hardcoded at "92.042" matching Eleventy; JS overrides once Pagefind initialises

## Hugo invariants preserved across the batch

- **Zero new Hugo WARNs** on every plan's build (the `.Site.Data` deprecation fixed by Plan 13-05's `hugo.Data` migration still holds)
- **Faithful class names**: every CSS class in every ported template matches the Eleventy source byte-for-byte
- **Literal URLs preserved**: all `/img/*`, `/js/*`, `/vendor/*` paths load from `static/` passthrough placed by Plan 13-04; all external CDN URLs (Google Fonts, jsdelivr, unpkg, Cloudflare beacon) verbatim
- **Data attribute JSON**: all `data-*-labels` / `data-*-types` attributes use `printf + safeHTMLAttr` to emit raw double quotes (not HTML-entity-escaped) — matching Eleventy's `| dump | safe` output
- **flat-code URL scheme**: all detail pages remain at `/{code}/` per D-18

## Known local limitations (data-infrastructure, not port issues)

- **Pagefind indices** not built locally — buscar, entidades, lugares show "Ha ocurrido un error" JS-rendered state when Pagefind imports fail. Phase 15's CI pipeline builds the indices.
- **Miller columns children** don't expand beyond root level — tree.js fetches `/data/children/{id}.json` which isn't populated in DEV_LIMIT builds. Phase 15's `build.sh` wires these.
- **Map tiles** require the protomaps API key to reach protomaps.com from the browser. The key is set in `hugo.toml`. Tile rendering depends on network.

## Safety state

- `abandoned/phase-13-04-first-attempt` tag still in place
- Eleventy still on disk at `src/_data/`, `src/_includes/`, `src/_layouts/`, `src/*.njk`, `src/explorar/` — preserved for Plan 13-15 to delete
- `eleventy.config.js` preserved — Plan 13-15 deletes
- `package.json` dependencies preserved — Plan 13-15 prunes Eleventy deps

## Forward pointer

Plan 13-15 is the final integration + Eleventy removal step. It is **NOT** part of this batch — user approval required before the destructive operations (delete `src/`, delete `eleventy.config.js`, remove `@11ty/eleventy` from package.json, remove the standalone `tailwindcss` binary, rewrite `build.sh` for the Hugo-only pipeline).

## Version

Version: v1.0.0
