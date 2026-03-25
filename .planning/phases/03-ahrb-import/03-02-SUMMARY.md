---
phase: 03-ahrb-import
plan: 02
subsystem: infra
tags: [eleventy, tailwind, cloudflare-r2, github-actions, porting, visual-identity]

# Dependency graph
requires:
  - phase: 03-01
    provides: Fresh AHRB data export uploaded to B2, ready for frontend build
  - phase: 02-03
    provides: All visual identity changes (DM Sans, Crimson Text, burgundy palette) complete in dev
provides:
  - All Phase 1-3 dev changes ported to public zasqua-frontend repo in 8 thematic commits
  - v0.4.0 deployed live to zasqua.org via GitHub Actions (106,491 pages)
  - AHRB repository and volume pages live at zasqua.org/co-ahrb/
  - Tailwind CSS compilation step integrated into public CI pipeline
affects: []

# Tech tracking
tech-stack:
  added: [tailwind-css-cli (public repo CI pipeline)]
  patterns: [Tailwind CSS compiled from input.css at build time via GitHub Actions step]

key-files:
  created:
    - zasqua-frontend/src/css/input.css
    - zasqua-frontend/src/img/zasqua-3-burgundy-sm.svg
    - zasqua-frontend/src/img/ampl-cropped-1.png
    - zasqua-frontend/scripts/check-css-tokens.sh
  modified:
    - zasqua-frontend/src/css/main.css
    - zasqua-frontend/src/_layouts/base.njk
    - zasqua-frontend/src/_includes/header.njk
    - zasqua-frontend/src/_includes/footer.njk
    - zasqua-frontend/src/index.njk
    - zasqua-frontend/src/repository.njk
    - zasqua-frontend/src/description.njk
    - zasqua-frontend/src/js/search.js
    - zasqua-frontend/build.sh
    - zasqua-frontend/.github/workflows/deploy.yml
    - zasqua-frontend/src/_data/site.js

key-decisions:
  - "Porting done in 8 thematic commits (visual identity, assets, layout, templates, search, build pipeline, tooling, version bump) as approved by user"
  - "Version bump (0.3.1 -> 0.4.0) applied as the final porting commit per D-11"
  - "Tailwind CSS step ported with build pipeline in same commit (eb67c46) — input.css already in place from first commit"

patterns-established:
  - "Porting pattern: copy full files dev->public, stage by name, commit thematically, no git add ."
  - "Public repo commit style: sentence case, no conventional prefixes, no phase numbers"
  - "Version bump always last porting commit"

requirements-completed: [AHRB-02, AHRB-03]

# Metrics
duration: ~45min
completed: 2026-03-25
---

# Phase 3 Plan 02: Port and Deploy Summary

**All Phase 1-3 changes ported to zasqua-frontend in 8 thematic commits, CI build produced 106,491 pages deployed to zasqua.org, AHRB repository and volume pages live with new visual identity at v0.4.0**

## Performance

- **Duration:** ~45 min (8 commits + 28 min CI build)
- **Started:** 2026-03-25T05:47Z
- **Completed:** 2026-03-25T06:17Z
- **Tasks:** 2 of 3 complete (Task 3 is human verification checkpoint)
- **Files modified in public repo:** 15 (4 new, 11 changed)

## Accomplishments

- Ported 15 files from zasqua-frontend-dev to zasqua-frontend in 8 reviewed thematic commits
- Tailwind CSS compilation step added to public CI pipeline — critical missing link between Phases 1-3 and the live site
- GitHub Actions build succeeded in 28m 23s: 106,491 pages generated, deployed to R2, Cloudflare cache purged
- zasqua.org/co-ahrb/ confirmed live (automated curl check passed)
- Site version bumped to v0.4.0 as the final porting commit

## Task Commits

Commits applied directly to the public `zasqua-frontend` repo (thematic porting commits — no phase/plan prefix per public repo hygiene rules):

1. **Commit 1 — CSS visual identity** - `69f3873` (Update visual identity: DM Sans, Crimson Text, burgundy palette)
2. **Commit 2 — Branding assets** - `bf310c0` (Add new branding images for v0.4.0 visual identity)
3. **Commit 3 — Header/footer/base** - `df4876f` (Redesign header and footer for new visual identity)
4. **Commit 4 — Page templates** - `edc108b` (Update homepage, repository, and description page styling)
5. **Commit 5 — Search JS** - `d51f944` (Update search page for new colour tokens)
6. **Commit 6 — Build pipeline** - `eb67c46` (Add Tailwind CSS compilation step to build pipeline)
7. **Commit 7 — Token check script** - `226dae4` (Add CSS token verification script)
8. **Commit 8 — Version bump** - `0ed8cc0` (Bump version to 0.4.0)

## Files Created/Modified

**New files ported to public repo:**
- `zasqua-frontend/src/css/input.css` — Tailwind v4 theme source (DM Sans, Crimson Text, burgundy/periwinkle/stone tokens)
- `zasqua-frontend/src/img/zasqua-3-burgundy-sm.svg` — New pomegranate logo lockup
- `zasqua-frontend/src/img/ampl-cropped-1.png` — New hero image
- `zasqua-frontend/scripts/check-css-tokens.sh` — CSS token audit script

**Files updated in public repo:**
- `zasqua-frontend/src/css/main.css` — Full Tailwind v4 recompile with new visual identity
- `zasqua-frontend/src/_layouts/base.njk` — DM Sans, Crimson Text, Cormorant Garamond Google Fonts imports
- `zasqua-frontend/src/_includes/header.njk` — Redesigned with pomegranate logo lockup
- `zasqua-frontend/src/_includes/footer.njk` — Dark burgundy footer
- `zasqua-frontend/src/index.njk` — Hero and masonry grid colour/typography
- `zasqua-frontend/src/repository.njk` — Periwinkle Miller column selection, burgundy links
- `zasqua-frontend/src/description.njk` — Periwinkle level badges, burgundy links
- `zasqua-frontend/src/js/search.js` — Burgundy filter pills, periwinkle pagination
- `zasqua-frontend/build.sh` — Tailwind CLI compilation step (architecture-aware binary detection)
- `zasqua-frontend/.github/workflows/deploy.yml` — "Build CSS with Tailwind" step between npm ci and Eleventy
- `zasqua-frontend/src/_data/site.js` — version 0.3.1 -> 0.4.0

## CI Build Verification

- **Workflow run:** `23526934352` on neogranadina/zasqua-frontend
- **Result:** completed success (28m 23s)
- **Descriptions loaded:** 106,484
- **Pages generated:** 106,491
- **All steps passed:** Download data from B2, Build CSS with Tailwind, Build site with Eleventy, Index with Pagefind, Deploy to R2, Purge Cloudflare cache
- **Automated spot check:** `curl https://zasqua.org/co-ahrb/` — OK

## Decisions Made

- Ported in the exact 8-group order approved by user (visual identity first, version bump last)
- Version bump applied to dev repo's site.js before porting (0.4.0 already present in dev)
- Tailwind step verified to reference `input.css` after porting — confirmed present at `src/css/input.css` from Commit 1

## Deviations from Plan

None — plan executed exactly as written. All 8 commit groups applied in specified order with specified messages.

## Issues Encountered

None — no errors during porting, CI build, or deployment. Node.js 20 action deprecation warning noted (non-blocking, affects GitHub Actions tooling from June 2026 onward — deferred).

## Known Stubs

None — all data is live from the AHRB export. IIIF manifests present on ~880 of 10,524 AHRB records (expected per D-04 — catalogue-only entries have no digitised images, which is correct behaviour).

## User Setup Required

None — all CI secrets were already set from previous deployments.

## Next Phase Readiness

Phase 3 is the final phase for milestone v0.4.0. Remaining step is Task 3 — human verification of the live site at zasqua.org (checkpoint:human-verify). Once approved, the phase and milestone are complete.

Deferred item (non-blocking): GitHub Actions runner Node.js 20 deprecation warning — actions/checkout@v4, actions/setup-node@v4, actions/setup-python@v5 will need updating before June 2026.

---
*Phase: 03-ahrb-import*
*Completed: 2026-03-25*
