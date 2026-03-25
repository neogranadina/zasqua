# Phase 3: AHRB Import - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Export a fresh AHRB dataset from the backend, port all Phase 1–3 changes to the public `zasqua-frontend` repo, rebuild the site with ~106K pages (including ~10,500 AHRB descriptions), deploy to R2, and verify. This is the final phase of the v0.4.0 milestone — the site version is bumped to v0.4.0 as part of this phase.

</domain>

<decisions>
## Implementation Decisions

### Backend Export
- **D-01:** A fresh `export_frontend_data` run is required — the March 24 data is stale. The export will be executed together in this session from zasqua-backend-dev, not treated as an external prerequisite
- **D-02:** The export includes running `export_frontend_data` in the backend, uploading the results to B2 (`zasqua-export` bucket), then downloading to the frontend's `data/` directory

### Data Scope
- **D-03:** The full AHRB dataset is included — all description levels (fonds, subfonds, series, files, items). The "542 volumes" in the roadmap was an approximate count of file-level notarial volumes; actual count is ~549 file-level + ~9,948 items + 27 upper-level records
- **D-04:** IIIF manifest coverage is as expected — ~880 of 10,524 AHRB descriptions have IIIF manifests. The rest are catalogue-only entries without digitised images. No backend fix needed

### AHRB Display
- **D-05:** The AHRB repository subtitle in `repository.njk` and `index.njk` is correct as-is: "Materiales digitalizados por Neogranadina en el Archivo Histórico Regional de Boyacá, Tunja, Colombia."
- **D-06:** The AHRB repository image (`/img/AHRB_front.jpg`) exists in `src/img/` and is correct

### Porting to Public Repo
- **D-07:** All Phase 1–3 changes must be ported to `zasqua-frontend` before deploying. The public repo is the deployment source — it currently lacks the Tailwind CLI build step and all visual identity changes
- **D-08:** Full porting process: thematic commits (visual identity, build pipeline, AHRB data), each presented for review, verified in the public repo before pushing. Follow CLAUDE.md porting guidelines
- **D-09:** Files only in dev that need porting: `src/css/input.css`, `src/img/zasqua-3-burgundy-sm.svg`, `src/img/ampl-cropped-1.png`, `scripts/check-css-tokens.sh`
- **D-10:** Files changed in dev that need porting: `src/css/main.css`, `src/_layouts/base.njk`, `src/_includes/header.njk`, `src/_includes/footer.njk`, `src/index.njk`, `src/repository.njk`, `src/description.njk`, `src/js/search.js`, `build.sh`, `.github/workflows/deploy.yml`, `src/_data/site.js`

### Version & Deploy
- **D-11:** Version in `src/_data/site.js` bumped to `0.4.0` as part of this phase (final milestone phase)
- **D-12:** Deploy triggered from this session via `gh workflow run` on the public repo after porting and pushing
- **D-13:** Verification: build log page count (~106K), then manual spot checks — AHRB landing page, sample volume pages, IIIF viewer links on zasqua.org

### Claude's Discretion
- Ordering and grouping of porting commits — Claude decides thematic grouping as long as it follows the porting guidelines (by feature/concern, not by phase)
- Build verification approach — Claude decides which specific AHRB pages to spot-check

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Porting Guidelines
- `../CLAUDE.md` §Porting to public repos — Full porting process, commit style, thematic grouping rules
- `../CLAUDE.md` §Public Repo Hygiene — What must never appear in public repos
- `../CLAUDE.md` §Closing Out a Release — Version bump, deploy, verification, changelog, tagging, release notes

### Build & Deploy Pipeline
- `.planning/codebase/STACK.md` §Build Pipeline — Local and CI build steps, environment variables
- `.planning/codebase/STACK.md` §Data Pipeline — Export → B2 → build-time download flow
- `.github/workflows/deploy.yml` — CI/CD pipeline (needs Tailwind CLI step added during porting)
- `build.sh` — Local build script (reference for how the pipeline works)

### Backend Export
- `../zasqua-backend-dev/` — Backend repo where `export_frontend_data` runs (Django management command)

### Prior Phase Context
- `.planning/phases/01-css-foundations/01-CONTEXT.md` — Phase 1 decisions: Tailwind v4, token naming, component CSS approach
- `.planning/phases/02-component-updates/02-CONTEXT.md` — Phase 2 decisions: header, footer, hero, search, description page styling

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — Directory layout and file purposes
- `.planning/codebase/CONCERNS.md` §Duplicated repository metadata — tech debt in index.njk/repository.njk (relevant but not being fixed in this phase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/repository.njk` — Already has AHRB template block with title, subtitle, and image for `co-ahrb`
- `src/index.njk` — Already includes `co-ahrb` in the masonry grid display order
- `build.sh` — Complete local build pipeline including B2 download, Tailwind CLI, Eleventy, Pagefind
- `.github/workflows/deploy.yml` — CI/CD pipeline (dev version has Tailwind CLI step; public version needs it)
- `scripts/upload-to-r2.py` — Parallel upload script (100 concurrent threads, ~345 files/s)

### Established Patterns
- Data pipeline: Django backend → `export_frontend_data` → B2 upload → build-time download → Eleventy → Pagefind → R2 deploy
- All AHRB descriptions flow through the same templates as other repositories — no AHRB-specific template work needed
- Porting: full file copy from dev to public, staged thematically, with tests before pushing

### Integration Points
- `data/descriptions.json` — Main data file, will grow with fresh AHRB export
- `data/repositories.json` — Repository records (AHRB already present)
- `data/children/*.json` — Per-parent child lists for tree navigation (will include AHRB hierarchy)
- `src/_data/site.js` — Version field to bump to `0.4.0`

</code_context>

<specifics>
## Specific Ideas

- The deploy workflow in the public repo must have the Tailwind CLI step added during porting — without it, the build would produce the old (pre-Phase 1) design
- The `scripts/check-css-tokens.sh` script should be ported to keep the public repo's CI capabilities consistent
- The total page count should increase from ~104K to ~106K with the AHRB data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-ahrb-import*
*Context gathered: 2026-03-24*
