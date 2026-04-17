---
phase: 13-hugo-foundation
plan: 08
status: complete
completed: 2026-04-17
commits:
  - 9eb8372
  - 37a7ff5
---

# Plan 13-08 — Repository landing pages

## Outcome

5 repository landing pages rendered at `/pe-bn/`, `/co-ahjci/`, `/co-ahr/`, `/co-ahrb/`, `/co-cihjml/` — structurally indistinguishable from their `zasqua.org` counterparts. Zero new Hugo WARNs. All per-repo hero imagery, titles, subtitles, formatted counts, and Miller-columns mount points present.

## Commits

| Hash | Subject | Files |
|------|---------|-------|
| `9eb8372` | phase 13-08: repository content adapter | 1 (content/repository/_content.gotmpl) |
| `37a7ff5` | phase 13-08: port repository landing template | 1 (layouts/repository/single.html) |

## Port metrics

| Source | Target | Source lines | Port lines |
|---|---|---|---|
| `src/repository.njk` (pagination + template) | `content/repository/_content.gotmpl` + `layouts/repository/single.html` | 87 | 65 + 104 = 169 (93% narrative overhead) |

## Automated A/B vs zasqua.org/pe-bn/

Structural pattern counts — all match between local DEV build and production:

| Pattern | Local | Prod |
|---|---|---|
| `Narra la Independencia` | 4 | 4 |
| `repo-header` | 5 | 5 |
| `repo-header-title` | 1 | 1 |
| `repo-header-stats` | 1 | 1 |
| `buscar/?ancestor=pe-bn` | 1 | 1 |
| `collection-tree` | 1 | 1 |
| `tree.js` | 1 | 1 |

## Deliberate divergences (three)

1. **Routing: Eleventy pagination → Hugo content adapter.** Both emit 5 pages at `/{code}/`. Output identical; mechanism differs.
2. **numberFormat → `lang.FormatNumber 0 N`.** Site-locale es-CO produces dot thousands separator — byte-equivalent to Eleventy for integer counts.
3. **`ui.levelsPlural | dump | safe` → `printf + jsonify + safeHTMLAttr`.** Raw JSON inside `data-level-labels='...'`. JSON key order alphabetical vs source-order — functionally identical per same reasoning as Plan 13-06.

## Documented local limitation

Miller columns tree mounts correctly with root-level data (embedded in the `<script type="application/json" id="root-descriptions-data">` tag). Click-to-expand children requires `/data/children/{code}.json` files which are Phase 15's responsibility to populate in `build.sh`. Tree display at root level works locally; nested expansion will show empty columns until Phase 15 wires the children JSON into the static passthrough.

## Forward pointer for Plan 13-09

Plan 13-09 ports `src/description.njk` (413 lines) — the largest single template. Scope split across 3 plans:
- **13-09**: Skeleton + breadcrumb + all ISAD(G) field sections (title, reference code, level, dates, scope/content, extent, arrangement, etc.)
- **13-10**: Related entities + places links (using the pre-computed `entity_links` and `place_links` arrays)
- **13-11**: IIIF/TIFY viewer + Miller columns + any remaining interactive blocks

Content adapter `content/descripcion/_content.gotmpl` already exists from Plan 13-03 and correctly populates page params with all ISAD(G) fields — Plan 13-09 only writes the template at `layouts/descripcion/single.html` (replacing Plan 13-05's `_default/single.html` bridge stub for description pages via Hugo's lookup precedence).

## Version

Version: v1.0.0
