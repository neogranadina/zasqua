# Roadmap: Zasqua Frontend — v1.0.0 Build Pipeline Sustainability

## Overview

Phases 13–15 migrate the frontend build from Eleventy to Hugo so the site builds reliably at 192K+ pages without hitting memory limits, and remains sustainable as the catalogue grows.

Phase numbering continues from v0.5.0 (which completed at Phase 12).

---

## Previous Milestone (v0.5.0)

Phases 4–12 are documented in the v0.5.0 roadmap. All complete. The last phase was Phase 12 (Place Explorer & Detail Page Rework, completed 2026-04-14).

---

## Phases

- [ ] **Phase 13: Hugo Foundation** - Hugo project scaffold with content adapters, correct data-loading architecture, Tailwind CSS wired, DEV_LIMIT builds working, and the `generate-content.js` enrichment script producing fully-enriched denormalised JSON in `assets/hugo-data/`
- [ ] **Phase 14: Template Porting** - All Nunjucks templates ported as Go templates, all 15 custom filters as returning partials or pre-computed fields, Pagefind attributes preserved, full 192K-page build validated
- [ ] **Phase 15: Deploy Pipeline** - GitHub Actions workflow rewritten for Hugo build chain, Pagefind indices built in parallel, diff-based R2 upload replaces full sync

## Phase Details

### Phase 13: Hugo Foundation
**Goal**: A working Hugo project skeleton builds a subset of pages with correct CSS output, and `generate-content.js` produces fully-enriched, denormalised JSON in `assets/hugo-data/` — both the data architecture decisions and the enrichment output format are locked in together before any template work begins
**Depends on**: Nothing (first phase of milestone)
**Requirements**: HUGO-01, HUGO-02, HUGO-04, ENRICH-01, ENRICH-02, ENRICH-03, ENRICH-04, ENRICH-05
**Success Criteria** (what must be TRUE):
  1. Running `DEV_LIMIT=100 hugo --minify` locally produces HTML output for a capped subset of descriptions, entities, and places without error; content adapters (`_content.gotmpl`) in `content/descripcion/`, `content/entidad/`, and `content/lugar/` generate pages via `resources.Get` + `transform.Unmarshal` — no stub markdown files exist on disk
  2. `hugo.toml` uses `resources.Get` data loading and has `build.writeStats = true`; no large JSON is placed under the `data/` directory; Hugo Extended is confirmed in CI with `hugo version` output containing `+extended`
  3. `generate-content.js` writes `assets/hugo-data/descriptions.json`, `entities.json`, and `places.json`; record counts match the source exports (spot-checked against known totals: ~106K descriptions, ~83K entities, ~7K places)
  4. Every description record includes a pre-computed `ancestor_chain` array; every date field includes a pre-computed `date_formatted` string in Colombian Spanish narrative format; entity and place link records include pre-computed `display_name` and `role_label` strings — no formatting logic remains for Go templates to handle
  5. `DEV_LIMIT` mode truncates all three datasets so a local enrichment + build cycle completes in under 60 seconds
**Plans**: TBD

### Phase 14: Template Porting
**Goal**: Every Nunjucks template has a Go equivalent that produces functionally identical HTML output, all 15 custom filters are replaced, and a full 192K-page build completes without error
**Depends on**: Phase 13 (data architecture and enrichment output format must be locked before template work begins)
**Requirements**: HUGO-01, HUGO-03, TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07
**Success Criteria** (what must be TRUE):
  1. The base layout (`baseof.html`) with header, footer, and breadcrumb partials renders identical structure to the current site — Pagefind `data-pagefind-body`, `data-pagefind-filter`, and `data-pagefind-meta` attributes are present on all page types
  2. A description detail page shows all ISAD(G) sections, linked entity and place names with role labels, correct Spanish dates, the IIIF viewer embed, Miller columns, and breadcrumb navigation — verified on a spot-checked sample from each of the five repositories
  3. Entity and place detail pages render correctly: entity shows timeline/graph views, role filter pills, and bipartite graph initialisation; place shows the authority links section, embedded map, and description list
  4. All 15 Nunjucks filters are replaced — either as returning partials in `layouts/partials/filters/` or as pre-computed fields in the enrichment JSON — no Nunjucks-only logic remains
  5. A full build (`hugo --minify`) on production-scale data completes without error and all existing published URLs (`/descripcion/`, `/entidad/`, `/lugar/`, `/explorar/`, `/buscar/`, `/repositorio/`) resolve to pages in the Hugo build output — no redirects needed
**Plans**: TBD
**UI hint**: yes

### Phase 15: Deploy Pipeline
**Goal**: The full build-and-deploy pipeline runs end-to-end in GitHub Actions with Hugo, three parallel Pagefind indices, and diff-based R2 upload — replacing the current Eleventy pipeline
**Depends on**: Phase 14 (full Hugo build must be working before CI can be validated end-to-end)
**Requirements**: CI-01, CI-02, CI-03, CI-04
**Success Criteria** (what must be TRUE):
  1. A GitHub Actions workflow run using Hugo Extended (not standard), `@tailwindcss/cli` via npm, and Pagefind v1.5.2 completes without error and deploys the site to R2
  2. Three Pagefind index builds run in parallel CI jobs and produce index bundles under `public/pagefind-descriptions/`, `public/pagefind-entities/`, and `public/pagefind-places/`
  3. The complete CI pipeline (B2 download + enrich + Hugo build + Pagefind ×3 + R2 upload) finishes within the GitHub Actions 6-hour timeout on the 192K-page production dataset
  4. The R2 upload script performs a diff against the existing bucket using ETag/MD5 comparison: on a run with no content changes, fewer than 100 files are uploaded; a summary line in CI logs shows counts of uploaded, skipped, and deleted files
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 13 → 14 → 15

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Hugo Foundation | 0/? | Not started | - |
| 14. Template Porting | 0/? | Not started | - |
| 15. Deploy Pipeline | 0/? | Not started | - |

---

## Previous Milestone Phase History (v0.5.0)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 4. Build Pipeline & Data Pre-compute | 2/2 | Complete | 2026-03-26 |
| 5. PMTiles Infrastructure | 2/2 | Complete | 2026-03-26 |
| 6. Entity & Place Detail Pages | 4/4 | Complete | 2026-03-28 |
| 7. Place Explorer | 3/3 | Complete | 2026-03-28 |
| 8. Entity Explorer — List View | 3/3 | Complete | 2026-03-28 |
| 9. Entity & Place Page Redesign | — | Complete | 2026-04-03 |
| 10. Explorer UX Redesign | 4/4 | Complete | 2026-04-12 |
| 10.1. Infinite Bipartite Graph Explorer | 4/4 | Complete | 2026-04-12 |
| 10.2. Explorer Parity | 3/3 | Complete | 2026-04-12 |
| 11. Description Linking | 2/2 | Complete | 2026-04-12 |
| 12. Place Explorer & Detail Rework | 2/2 | Complete | 2026-04-14 |
