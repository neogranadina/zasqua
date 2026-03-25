# Phase 3: AHRB Import - Research

**Researched:** 2026-03-24
**Domain:** Static site data pipeline, public repo porting, Eleventy build, Cloudflare R2 deploy
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Backend Export**
- D-01: A fresh `export_frontend_data` run is required — the March 24 data is stale. The export will be executed together in this session from zasqua-backend-dev, not treated as an external prerequisite
- D-02: The export includes running `export_frontend_data` in the backend, uploading the results to B2 (`zasqua-export` bucket), then downloading to the frontend's `data/` directory

**Data Scope**
- D-03: The full AHRB dataset is included — all description levels (fonds, subfonds, series, files, items). The "542 volumes" in the roadmap was an approximate count of file-level notarial volumes; actual count is ~549 file-level + ~9,948 items + 27 upper-level records
- D-04: IIIF manifest coverage is as expected — ~880 of 10,524 AHRB descriptions have IIIF manifests. The rest are catalogue-only entries without digitised images. No backend fix needed

**AHRB Display**
- D-05: The AHRB repository subtitle in `repository.njk` and `index.njk` is correct as-is: "Materiales digitalizados por Neogranadina en el Archivo Histórico Regional de Boyacá, Tunja, Colombia."
- D-06: The AHRB repository image (`/img/AHRB_front.jpg`) exists in `src/img/` and is correct

**Porting to Public Repo**
- D-07: All Phase 1–3 changes must be ported to `zasqua-frontend` before deploying. The public repo is the deployment source — it currently lacks the Tailwind CLI build step and all visual identity changes
- D-08: Full porting process: thematic commits (visual identity, build pipeline, AHRB data), each presented for review, verified in the public repo before pushing. Follow CLAUDE.md porting guidelines
- D-09: Files only in dev that need porting: `src/css/input.css`, `src/img/zasqua-3-burgundy-sm.svg`, `src/img/ampl-cropped-1.png`, `scripts/check-css-tokens.sh`
- D-10: Files changed in dev that need porting: `src/css/main.css`, `src/_layouts/base.njk`, `src/_includes/header.njk`, `src/_includes/footer.njk`, `src/index.njk`, `src/repository.njk`, `src/description.njk`, `src/js/search.js`, `build.sh`, `.github/workflows/deploy.yml`, `src/_data/site.js`

**Version & Deploy**
- D-11: Version in `src/_data/site.js` bumped to `0.4.0` as part of this phase (final milestone phase)
- D-12: Deploy triggered from this session via `gh workflow run` on the public repo after porting and pushing
- D-13: Verification: build log page count (~106K), then manual spot checks — AHRB landing page, sample volume pages, IIIF viewer links on zasqua.org

### Claude's Discretion
- Ordering and grouping of porting commits — Claude decides thematic grouping as long as it follows the porting guidelines (by feature/concern, not by phase)
- Build verification approach — Claude decides which specific AHRB pages to spot-check

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AHRB-01 | Backend data exported with `export_frontend_data` including all AHRB description records, uploaded to B2 | D-01/D-02: publish.sh `--export` + `--upload` steps; 10,524 AHRB records confirmed in stale export; fresh run needed from zasqua-backend-dev |
| AHRB-02 | Frontend rebuilt with AHRB data — ~106K pages generated and deployed to R2 | D-07/D-12: port all Phase 1–3 changes to public repo first; then `gh workflow run deploy.yml`; target 106K+ pages confirmed via CONCERNS.md performance data |
| AHRB-03 | AHRB repository landing page displays correctly with volume listings and IIIF viewer links | D-03/D-04/D-05/D-06: templates already support AHRB; ~880 records have IIIF manifests; no template work needed |
</phase_requirements>

---

## Summary

Phase 3 is a data pipeline and release phase — no new frontend code to write. The work divides into four sequential streams: (1) run a fresh backend export, (2) port all Phase 1–3 dev changes to the public `zasqua-frontend` repo, (3) trigger a full CI build + R2 deploy via GitHub Actions, and (4) verify the live site.

The data pipeline is well understood: `export_frontend_data` writes JSON to `export/`, `publish.sh --upload` syncs to Backblaze B2 (`zasqua-export` bucket), and the GitHub Actions `deploy.yml` workflow downloads from B2 at build time. The current dev-repo export already contains 10,524 AHRB records (confirmed by inspection of `data/descriptions.json`, dated 2026-03-24), but D-01 specifies a fresh export is required in this session.

The critical risk in porting is the Tailwind CLI step: the public repo's `deploy.yml` currently lacks the "Build CSS with Tailwind" step present in the dev repo. Without this step, the deployed site would use the old pre-Phase 1 `main.css` (which exists as a committed file in both repos but will be overwritten by the Tailwind compilation step during build). Every ported file and the workflow change must be presented for review before committing.

**Primary recommendation:** Execute in strict sequence — export → B2 upload → port (with review) → push public repo → `gh workflow run` → verify. Do not trigger the build before the Tailwind step is in the public repo's workflow.

---

## Standard Stack

### Core (all versions confirmed by inspection)

| Library / Tool | Version | Purpose | Notes |
|----------------|---------|---------|-------|
| Eleventy | 3.1.2 | Static site generator | Only npm dependency; `^3.1.2` in package.json, pinned via lockfile |
| Tailwind CSS CLI | latest (binary) | CSS compilation from `input.css` | Downloaded at build time via `curl` from GitHub releases; not in package.json |
| Pagefind | latest (npx) | Client-side search indexing | Run via `npx pagefind --site _site` after Eleventy |
| TIFY | 0.31.0 | IIIF deep-zoom viewer | Vendored at `src/vendor/tify/` |
| Node.js | 22 | Runtime | Pinned via `.nvmrc` |

### Supporting (operations)

| Tool | Purpose | Where Used |
|------|---------|-----------|
| b2 CLI | Download export from B2 at build time; upload export to B2 | `deploy.yml`, `build.sh`, `publish.sh` |
| boto3 (Python) | Parallel R2 upload | `scripts/upload-to-r2.py` (100 concurrent threads) |
| gh CLI | Trigger `workflow_dispatch` on public repo | `publish.sh --rebuild`, also direct `gh workflow run` |
| Python 3 | Upload scripts | GitHub Actions runner |

### Data files (build-time inputs)

| File | Location | Size (current) | Content |
|------|----------|----------------|---------|
| `descriptions.json` | `data/` (downloaded from B2) | ~208 MB | 106,484 descriptions across 5 repos |
| `repositories.json` | `data/` (downloaded from B2) | ~14 KB | 5 repository records |
| `children/*.json` | `data/children/` (downloaded from B2) | ~1,612 files | Per-parent child lists |

---

## Architecture Patterns

### Publishing Pipeline

The canonical publish workflow is documented in the `publishing-zasqua` skill:

```
zasqua-backend-dev/
  manage.py export_frontend_data --output-dir /tmp/zasqua-export/
      ↓
publish.sh --upload
  b2 file upload zasqua-export /tmp/zasqua-export/descriptions.json descriptions.json
  b2 file upload zasqua-export /tmp/zasqua-export/repositories.json repositories.json
  b2 sync --delete /tmp/zasqua-export/children/ b2://zasqua-export/children/
      ↓
gh workflow run deploy.yml --repo neogranadina/zasqua-frontend
      ↓
GitHub Actions (deploy.yml):
  1. Checkout public repo
  2. Setup Node 22 + Python 3
  3. Download data from B2 → data/
  4. npm ci
  5. Build CSS: ./tailwindcss-linux-x64 -i src/css/input.css -o src/css/main.css --minify
  6. npx eleventy (NODE_OPTIONS=--max-old-space-size=6144, SITE_URL=https://zasqua.org)
  7. npx pagefind --site _site
  8. python3 scripts/upload-to-r2.py _site zasqua-site --concurrency 100
  9. Cloudflare cache purge
```

**Critical:** Step 5 (Tailwind CSS build) is present in the dev repo's `deploy.yml` but **absent** from the public repo's current `deploy.yml`. This is the single highest-priority change in porting.

### Porting Pattern

Per CLAUDE.md §Porting to public repos:

```
for each thematic group:
  1. Compare dev and public file-by-file
  2. Copy full file from dev to public (no surgical edits)
  3. Draft commit message for review
  4. Wait for approval
  5. Stage and commit
  6. (After all groups) run npm ci + local build check in public repo if feasible
  7. Push
```

Commit style for public repo:
- Sentence case, no conventional commit prefixes
- No emojis, no phase numbers, no AI references
- One commit per logical concern (typography/fonts, colour palette, components, build pipeline)

### Recommended Porting Commit Groups

Based on the file list from D-09 and D-10:

| Group | Files | Public commit message |
|-------|-------|-----------------------|
| New visual identity — fonts and colour tokens | `src/css/input.css` (new), `src/css/main.css` | "Update visual identity: DM Sans, Crimson Text, burgundy palette" |
| New branding assets | `src/img/zasqua-3-burgundy-sm.svg` (new), `src/img/ampl-cropped-1.png` (new) | "Add new branding images for v0.4.0 visual identity" |
| Updated templates — header, footer, base | `src/_layouts/base.njk`, `src/_includes/header.njk`, `src/_includes/footer.njk` | "Redesign header and footer for new visual identity" |
| Updated page templates | `src/index.njk`, `src/repository.njk`, `src/description.njk` | "Update homepage, repository, and description page styling" |
| Updated search JS | `src/js/search.js` | "Update search page for new colour tokens" |
| Build pipeline | `build.sh`, `.github/workflows/deploy.yml` | "Add Tailwind CSS compilation step to build pipeline" |
| CSS token verification script | `scripts/check-css-tokens.sh` (new) | "Add CSS token verification script" |
| Version bump | `src/_data/site.js` (0.3.1 → 0.4.0) | "Bump version to 0.4.0" |

**Note on `src/_data/site.js`:** The file is currently identical between dev and public repos (both at 0.3.1). The version bump to 0.4.0 should happen in the dev repo first, then be ported as the final commit.

### Anti-Patterns to Avoid

- **Triggering the build before the Tailwind step is ported:** The public repo's deploy workflow will silently use the committed (pre-compilation) `main.css` and produce the old design.
- **Porting automatically without review:** CLAUDE.md is explicit: "Never port automatically — always check with the user first." Every commit draft must be presented before applying.
- **Committing all changes in one squash:** Defeats the thematic grouping requirement and makes it impossible to review individual changes.
- **Porting `.planning/`, `CLAUDE.md`, `.claude/`:** These must never appear in the public repo.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Publishing fresh data to B2 | Manual b2 upload commands | `scripts/publish.sh --export --upload` | Handles export dir, sync with `--delete`, correct bucket and paths |
| Triggering CI rebuild | Manual curl to GitHub API | `gh workflow run deploy.yml --repo neogranadina/zasqua-frontend` | gh CLI handles auth; `publish.sh --rebuild` wraps this |
| Tailwind CLI download | Custom download logic | Existing pattern in `build.sh` and `deploy.yml` (already in dev) | Architecture-specific binary detection already implemented |
| Page count verification | Custom scripts | `find _site -name 'index.html' | wc -l` (already in deploy.yml echo) | Built into the workflow output |

---

## Current State of the Repositories

### What exists in dev but NOT in public

| File | Type | Status |
|------|------|--------|
| `src/css/input.css` | New file | Missing from public repo |
| `src/img/zasqua-3-burgundy-sm.svg` | New file | Missing from public repo |
| `src/img/ampl-cropped-1.png` | New file | Missing from public repo |
| `scripts/check-css-tokens.sh` | New file | Missing from public repo |

### What differs between dev and public (verified by diff)

All 10 files from D-10 are confirmed different between dev and public repos:

| File | Key change |
|------|-----------|
| `src/css/main.css` | Full recompile with Tailwind v4 tokens, new visual identity |
| `src/_layouts/base.njk` | Updated Google Fonts imports (DM Sans, Crimson Text, Cormorant Garamond) |
| `src/_includes/header.njk` | Redesigned header with pomegranate logo lockup |
| `src/_includes/footer.njk` | Dark burgundy footer redesign |
| `src/index.njk` | Hero and masonry grid colour/typography updates |
| `src/repository.njk` | Miller column periwinkle selection, burgundy links |
| `src/description.njk` | Periwinkle level badges, burgundy links |
| `src/js/search.js` | Burgundy filter pills, periwinkle pagination |
| `build.sh` | Added Tailwind CLI compilation step (architecture-aware binary selection) |
| `.github/workflows/deploy.yml` | Added "Build CSS with Tailwind" step between npm ci and Eleventy |
| `src/_data/site.js` | Currently identical (0.3.1) — version bump (0.4.0) done as final porting step |

### AHRB data verified in current export

Current `data/descriptions.json` (dated 2026-03-24) confirmed to contain:

| Repository | Count |
|------------|-------|
| co-ahr | 55,359 |
| co-ahrb | **10,524** |
| co-cihjml | 25,549 |
| pe-bn | 14,776 |
| co-ahjci | 276 |
| **Total** | **106,484** |

AHRB breakdown by description level:
- fonds: 3
- subfonds: 3
- series: 21
- file: 549
- item: 9,948

AHRB IIIF manifest coverage: 880 of 10,524 records have `iiif_manifest_url` populated.

**Implication for D-01:** The March 24 data already includes complete AHRB records. The "stale" designation refers to potential cataloguing changes made since March 14 (when the export file was last written). A fresh export is required per D-01 regardless.

---

## Common Pitfalls

### Pitfall 1: Deploying without Tailwind in the workflow
**What goes wrong:** Public repo deploy runs `npx eleventy` and uses the committed `main.css` (pre-Tailwind, pre-Phase-1 styles), producing the old design on the live site.
**Why it happens:** The public repo's `deploy.yml` does not have the "Build CSS with Tailwind" step. The dev repo's workflow has it. Porting `main.css` alone without the workflow change is insufficient — the workflow step overwrites `main.css` at build time using the freshly downloaded `input.css`.
**How to avoid:** Port the workflow change in the same commit group as `build.sh`. Verify the step appears between "Install npm dependencies" and "Build site with Eleventy".
**Warning signs:** CI log shows no "Build CSS with Tailwind" step; deployed site shows old Lato/navy design.

### Pitfall 2: Version bump order
**What goes wrong:** Version is bumped in the public repo before all other porting commits, or not bumped at all, leaving the live site showing 0.3.1 for a v0.4.0 milestone.
**Why it happens:** Version bump is easy to forget as a standalone step; or it gets grouped with other changes and lost.
**How to avoid:** Make the version bump the final porting commit, after all other files are verified. Confirm `site.js` shows `version: "0.4.0"` before triggering the workflow.

### Pitfall 3: Forgetting `src/css/input.css` in the public repo
**What goes wrong:** Tailwind compilation step runs in CI but fails because `src/css/input.css` doesn't exist in the public repo.
**Why it happens:** `input.css` is a new file in dev with no counterpart in public. The CI step references it explicitly: `-i src/css/input.css`.
**How to avoid:** Port `input.css` in the same commit as the workflow change, or in the visual identity commit that precedes it.
**Warning signs:** CI error "No such file or directory: src/css/input.css" during Tailwind build step.

### Pitfall 4: Porting CLAUDE.md or .planning/ to public repo
**What goes wrong:** AI artefacts appear in the public neogranadina/zasqua-frontend repo, violating public repo hygiene.
**Why it happens:** `git add .` or `git add -A` sweeps up ignored files if `.gitignore` is not properly set in the public repo.
**How to avoid:** Always add files by name. Never use `git add .` or `git add -A` when porting.

### Pitfall 5: Build timeout on GitHub Actions
**What goes wrong:** 106K-page Eleventy build + Pagefind indexing + R2 upload exceeds the 60-minute workflow timeout.
**Why it happens:** At this scale, the build takes ~20-30 minutes and upload ~10-15 minutes. Total approaches but generally stays within 60 minutes.
**How to avoid:** No action needed — existing configuration handles this scale. Monitor the Actions run. If timeout occurs, re-trigger; uploads are idempotent.

### Pitfall 6: Stale Cloudflare cache after deploy
**What goes wrong:** Live site shows old content despite R2 having new files.
**Why it happens:** Cloudflare CDN serves cached pages; purge step in workflow handles this, but only if secrets are correctly set.
**How to avoid:** The `deploy.yml` already includes a `Purge Cloudflare cache` step with `CF_API_TOKEN` and `CF_ZONE_ID` secrets. Verify this step completes successfully in the Actions log.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| b2 CLI | Export upload (publish.sh), build data download | Must verify at publish time | Authenticated via `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY` |
| gh CLI | Triggering workflow_dispatch | Must verify | Authenticated via `gh auth login` |
| Python 3 + venv | export_frontend_data in zasqua-backend-dev | Present in backend dev repo | venv at `zasqua-backend/venv/bin/python` (publish.sh uses public backend path — note: D-01 specifies running from zasqua-backend-dev) |
| GitHub Actions secrets | CI build | Assumed set (site deployed before) | `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `CLOUDFLARE_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_ZONE_ID` |
| Node.js 22 | CI build | Pinned via `.nvmrc` and `actions/setup-node@v4` | No local Node version concerns for this phase |

**Note on `publish.sh` path:** The workspace `scripts/publish.sh` hardcodes `BACKEND_DIR="$ZASQUA_ROOT/zasqua-backend"` (public backend). D-01 specifies running the export from `zasqua-backend-dev`. The plan should specify either: (a) running `manage.py export_frontend_data` directly from `zasqua-backend-dev/`, or (b) running `publish.sh --export` with a path override. The upload step (`--upload`) can use publish.sh normally regardless.

---

## Validation Architecture

No automated test framework exists in this codebase (confirmed by CONCERNS.md §Test Coverage Gaps: "No automated tests exist"). The `nyquist_validation` config key is absent, so the section is included, but the test map reflects the manual-only reality.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — zero automated tests |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| AHRB-01 | Export produces AHRB records, B2 upload succeeds | Manual/smoke | N/A | Verify with `ls -lh` on export dir, B2 upload stdout |
| AHRB-02 | ~106K pages generated and deployed | Manual/smoke | `find _site -name 'index.html' | wc -l` (in CI log) | Target: 106K+; current data already has 106,484 descriptions |
| AHRB-03 | AHRB landing page and volume pages load on zasqua.org | Manual/e2e | N/A | Spot-check URLs listed in Verification section |

### Sampling Rate
- **Per task:** Manual verification described in task
- **Phase gate:** All three manual checks pass before closing phase

### Wave 0 Gaps
No test infrastructure to set up — manual verification only.

---

## Verification Plan

### After export (AHRB-01)
```bash
# In zasqua-backend-dev/
ls -lh /tmp/zasqua-export/descriptions.json /tmp/zasqua-export/repositories.json
ls /tmp/zasqua-export/children/ | wc -l
python3 -c "
import json
with open('/tmp/zasqua-export/descriptions.json') as f:
    data = json.load(f)
ahrb = [d for d in data if d.get('repository_code') == 'co-ahrb']
print(f'AHRB: {len(ahrb)} records')
print(f'Total: {len(data)}')
"
```
Expected: 10,000+ AHRB records; total ~106K.

### After deploy (AHRB-02, AHRB-03)
- Build log: `Pages: 106...` line in CI output
- Live checks on zasqua.org:
  - `https://zasqua.org/co-ahrb/` — AHRB repository landing page loads, shows volume list
  - `https://zasqua.org/co-ahrb-not-{sample-file-code}/` — A file-level volume page loads with correct metadata
  - A record with IIIF manifest — verify TIFY viewer appears
  - `https://zasqua.org/` — Homepage loads with new visual identity (DM Sans, burgundy palette)
  - `https://zasqua.org/buscar/` — Search page loads
- Version: Footer should display v0.4.0

---

## Sources

### Primary (HIGH confidence — verified by direct inspection)
- `/Users/juancobo/Databases/zasqua/zasqua-frontend-dev/.github/workflows/deploy.yml` — exact CI pipeline steps
- `/Users/juancobo/Databases/zasqua/zasqua-frontend/.github/workflows/deploy.yml` — public repo pipeline (confirmed missing Tailwind step)
- `/Users/juancobo/Databases/zasqua/zasqua-frontend-dev/data/descriptions.json` — confirmed 10,524 AHRB records
- `/Users/juancobo/Databases/zasqua/zasqua-frontend-dev/build.sh` — local build pipeline
- `/Users/juancobo/Databases/zasqua/scripts/publish.sh` — full export + upload + rebuild pipeline
- `/Users/juancobo/Databases/zasqua/.claude/skills/publishing-zasqua/SKILL.md` — operations reference
- `.planning/codebase/STACK.md` — verified stack versions
- `.planning/codebase/STRUCTURE.md` — directory layout
- `.planning/codebase/CONCERNS.md` — known issues, performance data

### Secondary (HIGH confidence — project context)
- `.planning/phases/03-ahrb-import/03-CONTEXT.md` — locked decisions
- `.planning/REQUIREMENTS.md` — requirement definitions
- `/Users/juancobo/Databases/zasqua/zasqua-backend-dev/catalog/management/commands/export_frontend_data.py` — export command interface

---

## Metadata

**Confidence breakdown:**
- Data pipeline: HIGH — verified by direct inspection of all scripts, CLI tools, and export files
- Porting file list: HIGH — confirmed by diff of dev vs public repos; all 14 files verified
- Page count estimate: HIGH — current data has 106,484 descriptions, matching CONCERNS.md figure
- AHRB data shape: HIGH — confirmed by Python inspection of descriptions.json (level breakdown, IIIF count)

**Research date:** 2026-03-24
**Valid until:** Stable — no external dependencies that change frequently; valid for this session
