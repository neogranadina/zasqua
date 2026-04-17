# Roadmap: Zasqua Frontend — v1.0.0 Build Pipeline Sustainability

## Overview

Phases 13–15 migrate the frontend build from Eleventy to Hugo so the site builds reliably at 192K+ pages without hitting memory limits, and remains sustainable as the catalogue grows.

Phase numbering continues from v0.5.0 (which completed at Phase 12).

---

## Previous Milestone (v0.5.0)

Phases 4–12 are documented in the v0.5.0 roadmap. All complete. The last phase was Phase 12 (Place Explorer & Detail Page Rework, completed 2026-04-14).

---

## Phases

- [ ] **Phase 13: Hugo Foundation + Full Template Port** - Hugo project scaffold with content adapters, enrichment script, AND a byte-for-byte faithful port of every Eleventy template (base layout, partials, all page types, explorer pages). The local Hugo build produces output visually and functionally indistinguishable from the current Eleventy site.
- [ ] **Phase 14: Visual + Functional Audit** - Paranoid page-by-page QA pass against the Phase 13 Hugo build. Diff every page type against the live Eleventy baseline, click every interactive element, catch any regression Phase 13 missed. All 15 Nunjucks filters verified replaced, Pagefind attributes audited, production-scale full build validated.
- [ ] **Phase 15: Deploy Pipeline** - GitHub Actions workflow rewritten for Hugo build chain, Pagefind indices built in parallel, diff-based R2 upload replaces full sync

## Phase Details

### Phase 13: Hugo Foundation + Full Template Port
**Goal**: A working Hugo project skeleton with a byte-for-byte faithful port of every Eleventy template. The local Hugo build produces output visually and functionally indistinguishable from the current Eleventy site for every page type.
**Depends on**: Nothing (first phase of milestone)
**Requirements**: HUGO-01, HUGO-02, HUGO-03, HUGO-04, ENRICH-01, ENRICH-02, ENRICH-03, ENRICH-04, ENRICH-05, TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07
**Success Criteria** (what must be TRUE):
  1. Running `DEV_LIMIT=100 hugo --minify` locally produces HTML output for a capped subset of descriptions, entities, places, and repositories without error; content adapters in `content/descripcion/`, `content/entidad/`, and `content/lugar/` generate pages via `resources.Get`/`resources.Match` — no stub markdown files
  2. `generate-content.js` writes sharded descriptions (fixed record count) + single-file entities + single-file places under `assets/hugo-data/`; record counts match the source exports (106,529 descriptions, 78,476 entities, 6,722 places) when DEV_LIMIT is unset
  3. Every description record includes pre-computed `ancestor_chain`, `date_formatted`, `entity_links[*].{display_name,role_label}`, `place_links[*].display_name` fields — no formatting logic inside Go templates
  4. Every Nunjucks template in `src/*.njk`, `src/_layouts/*.njk`, `src/_includes/*.njk`, and `src/explorar/*.njk` has a Go template equivalent. Rendered HTML for equivalent data is visually and functionally indistinguishable from the Eleventy output — same DOM structure, same CSS classes, same copy, same font `<link>`s, same `<script>` tags, same analytics beacons, same interactive behaviours (dropdown nav, hamburger toggle, search form, IIIF/TIFY viewer, entity force-graph, etc.)
  5. Every URL scheme preserved: descriptions at `/{reference_code}/`, entities at `/{entity_code}/`, places at `/{place_code}/`, repositories at `/{repo_code}/`, explorers at `/explorar/entidades/` and `/explorar/lugares/`, search at `/buscar/`, 404 at `/404.html`
  6. Eleventy is deleted — `src/`, `eleventy.config.js`, `@11ty/eleventy`, and the standalone `tailwindcss` binary all gone; `build.sh` orchestrates the Hugo pipeline end-to-end
**Plans**: 15 plans
- [x] 13-01-PLAN.md — Foundation: Hugo install, `data/` → `exports/` rename, vitest + RED tests for I1–I8
- [x] 13-02-PLAN.md — Enrichment port: `scripts/generate-content.js` with date/number/ancestor/link modules, sharded description writer
- [x] 13-03-PLAN.md — Hugo scaffold: `hugo.toml` with module mounts, three content adapters, `data/ui.yaml` ported from `src/_data/ui.js`
- [ ] 13-04-PLAN.md — Asset relocation: move `src/css/main.css` → `assets/css/main.css` (prepend Tailwind v4 directives), `src/js/` → `assets/js/`, `src/vendor/tify/` → `static/vendor/tify/`, `src/img/` → `static/img/`
- [ ] 13-05-PLAN.md — Base layout + global partials: port `base.njk` → `baseof.html` (fonts, favicon, analytics), `header.njk` (dropdown + hamburger + search form), `footer.njk`, `breadcrumb.njk`, `css.html` partial. Human checkpoint: chassis A/B vs Eleventy home.
- [ ] 13-06-PLAN.md — 404 + buscar: port `404.njk` + `buscar.njk`. Human checkpoint: both pages render + search.js mount works.
- [ ] 13-07-PLAN.md — Home page: port `index.njk` (hero + logo + search form + intro + repo grid with images/overlays/counts). Human checkpoint: A/B vs Eleventy home.
- [ ] 13-08-PLAN.md — Repository detail: port `repository.njk`. Data-source decision for `/{repo_code}/` pages surfaced in plan. Human checkpoint.
- [ ] 13-09-PLAN.md — Description detail part 1: skeleton + breadcrumb + all ISAD(G) field sections. Human checkpoint.
- [ ] 13-10-PLAN.md — Description detail part 2: related entities + places (with role labels, pre-computed). Human checkpoint.
- [ ] 13-11-PLAN.md — Description detail part 3: IIIF/TIFY viewer + Miller columns + any remaining interactive blocks. Human checkpoint.
- [ ] 13-12-PLAN.md — Entity detail: port `entidad.njk` (timeline/graph views, role filter pills, bipartite graph init). Reuses existing entity.js force-graph config. Human checkpoint.
- [ ] 13-13-PLAN.md — Place detail: port `lugar.njk` (authority links, embedded map, description list). Human checkpoint.
- [ ] 13-14-PLAN.md — Explorer pages: port `src/explorar/entidades.njk` (237 lines) + `src/explorar/lugares.njk` (96 lines). Reuses existing force-graph config. Human checkpoint.
- [ ] 13-15-PLAN.md — Integration + Eleventy removal: rewrite `build.sh` for the Hugo pipeline, delete `src/` + `eleventy.config.js` + `@11ty/eleventy` + standalone `tailwindcss` binary, run full-corpus build + regression tests. Final human checkpoint before `src/` deletion.

### Phase 14: Visual + Functional Audit
**Goal**: Paranoid page-by-page QA pass against the Phase 13 Hugo build. Diff every page type against the live Eleventy baseline captured pre-deletion, click every interactive element, catch any regression Phase 13 missed.
**Depends on**: Phase 13 (the port must be complete before the audit)
**Requirements**: HUGO-01, HUGO-03, TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07
**Success Criteria** (what must be TRUE):
  1. A side-by-side visual diff (Eleventy baseline captured from zasqua.org + Hugo local) is recorded for at least one page of every type: home, 404, buscar, 1 description per repo (5 repos = 5 pages), 1 entity, 1 place, 1 repository, `/explorar/entidades/`, `/explorar/lugares/`. Any divergence is triaged — fixed, accepted with justification, or deferred with a follow-up ticket.
  2. Pagefind `data-pagefind-body`, `data-pagefind-filter`, and `data-pagefind-meta` attributes are present on every page type that had them in Eleventy
  3. All 15 Nunjucks custom filters are accounted for — either as returning partials in `layouts/_partials/filters/` or as pre-computed fields in the enrichment JSON — no Nunjucks-only logic remains
  4. A full build (`hugo --minify`) on production-scale data (106,529 + 78,476 + 6,722 records) completes without error and every existing published URL resolves to a page in the Hugo build output
  5. Interactive elements all functional: search UI mounts and returns results, header dropdown opens, hamburger toggles, IIIF/TIFY viewer loads deep-zoom images, entity graph renders and expands, place map pans/zooms
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
| 13. Hugo Foundation + Full Template Port | 3/15 | In Progress |  |
| 14. Visual + Functional Audit | 0/? | Not started | - |
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
