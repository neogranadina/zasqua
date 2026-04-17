---
phase: 13
slug: hugo-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-16
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Wave 0 (Plan 01) creates every test file referenced below; Plans 02 and 05 turn
> them from RED to GREEN. Every `<automated>` command in the map is transcribed
> verbatim from the corresponding task's `<verify><automated>` block.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (enrichment) + shell smoke (hugo build) |
| **Config file** | `vitest.config.js` (created in Plan 01 Task 3) |
| **Quick run command** | `npx vitest run tests/enrichment/ --reporter=dot` |
| **Full suite command** | `npx vitest run tests/ && SKIP_DOWNLOAD=1 DEV_LIMIT=100 ./build.sh` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/enrichment/ --reporter=dot`
- **After every plan wave:** `npx vitest run tests/ && SKIP_DOWNLOAD=1 DEV_LIMIT=100 ./build.sh`
- **Before `/gsd-verify-work`:** full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 0 | ENRICH-05 | — | N/A | manual | `hugo version \| grep -q '+extended' && node --version \| grep -q '^v22\.'` | N/A (checkpoint) | ⬜ pending |
| 13-01-02 | 01 | 0 | ENRICH-05 | T-13-01 | Fail-loud on malformed B2 exports (no silent fallback to stale data) | unit | `test ! -d data && test -d exports && test -f exports/descriptions.json && test -f exports/entities.json && test -f exports/places.json && ! grep -Rn --include='*.js' --include='*.sh' -E '["'\''\s](data/)' scripts/precompute-links.js scripts/places-to-geojson.js build.sh` | ✅ | ⬜ pending |
| 13-01-03 | 01 | 0 | ENRICH-05 | T-13-02 | Pinned vitest minor (`^2.1.0`), fixtures contain no fabricated metadata | unit | `npm install --silent && npx vitest --version && test -f vitest.config.js && test -f tests/fixtures/descriptions.sample.json && node -e 'const d=require("./tests/fixtures/descriptions.sample.json"); if(!Array.isArray(d)\|\|d.length<3)process.exit(1); if(!d[0].reference_code)process.exit(2)'` | ✅ | ⬜ pending |
| 13-01-04 | 01 | 0 | ENRICH-05 | T-13-03 | Fixtures contain only public B2 export fields (no PII leak) | unit | `SKIP_BUILD_TESTS=1 npx vitest run tests/ --reporter=verbose 2>&1 \| tee /tmp/vitest-output.txt; grep -q 'Test Files' /tmp/vitest-output.txt && grep -Eq '(failed\|skipped)' /tmp/vitest-output.txt` | ✅ | ⬜ pending |
| 13-02-01 | 02 | 1 | ENRICH-02 | — | Byte-for-byte Spanish date fidelity (no drift from Eleventy output) | unit | `npx vitest run tests/enrichment/date-format.test.js --reporter=verbose` | ✅ | ⬜ pending |
| 13-02-02 | 02 | 1 | ENRICH-01, ENRICH-03, ENRICH-04, ENRICH-05 | T-13-04 | 20-depth ancestor-chain cycle guard exits non-zero on cyclic input | unit | `node scripts/generate-content.js && npx vitest run tests/enrichment/ancestor-chain.test.js tests/enrichment/link-enrichment.test.js && DEV_LIMIT=100 node scripts/generate-content.js && DEV_LIMIT=100 npx vitest run tests/enrichment/enriched-counts.test.js && node -e 'const d=require("./assets/hugo-data/descriptions.json"); if(d.length!==100)process.exit(1); const r=d[0]; if(!r.ancestor_chain\|\|!("date_formatted" in r)\|\|!r.repository\|\|!r.entity_links\|\|!r.place_links)process.exit(2)'` | ✅ | ⬜ pending |
| 13-03-01 | 03 | 2 | HUGO-02, HUGO-04 | T-13-06 | Hugo config + module mount for `hugo_stats.json` (defeats Tailwind v4 gitignore silent-skip) | smoke | `hugo config --source . 2>&1 \| grep -q 'writestats.*true' && test -f data/ui.yaml && node -e 'const yaml=require("/dev/stdin"); process.stdout.write("")' < data/ui.yaml 2>/dev/null; python3 -c 'import yaml,sys;d=yaml.safe_load(open("data/ui.yaml"));sys.exit(0 if isinstance(d,dict) and "roles" in d else 1)'` | ✅ | ⬜ pending |
| 13-03-02 | 03 | 2 | HUGO-02, HUGO-04 | T-13-07 | try/.Err/errorf pattern blocks silent-nil resource reads; markup.unsafe scoped to trusted backend-produced content only | smoke | `test -f content/descripcion/_content.gotmpl && test -f content/entidad/_content.gotmpl && test -f content/lugar/_content.gotmpl && grep -q 'try (resources.Get' content/descripcion/_content.gotmpl && grep -q 'try (resources.Get' content/entidad/_content.gotmpl && grep -q 'try (resources.Get' content/lugar/_content.gotmpl && grep -q 'errorf' content/descripcion/_content.gotmpl && grep -qE 'url.*reference_code' content/descripcion/_content.gotmpl && grep -qE 'url.*entity_code' content/entidad/_content.gotmpl && grep -qE 'url.*place_code' content/lugar/_content.gotmpl && test -f content/_index.md && test -f content/descripcion/_index.md && test -f content/entidad/_index.md && test -f content/lugar/_index.md` | ✅ | ⬜ pending |
| 13-04-01 | 04 | 2 | HUGO-01 | T-13-09 | Vendored TIFY passthrough (local bundle, no remote fetch at build) | smoke | `test -f assets/css/main.css && test -d assets/js && test -d static/vendor/tify && test -d static/img && test -d static/data && grep -q '@import "tailwindcss"' assets/css/main.css && grep -q '@source "hugo_stats.json"' assets/css/main.css && test ! -d src/js && test ! -d src/vendor/tify && test ! -d src/img && test ! -f src/css/main.css` | ✅ | ⬜ pending |
| 13-04-02 | 04 | 2 | HUGO-01 | T-13-08 | Fingerprinted CSS + SRI integrity hash in production mode (detects asset tampering) | smoke | `test -f layouts/_default/baseof.html && test -f layouts/_default/home.html && test -f layouts/_default/list.html && test -f layouts/descripcion/single.html && test -f layouts/entidad/single.html && test -f layouts/lugar/single.html && test -f layouts/_partials/css.html && test -f layouts/_partials/header.html && test -f layouts/_partials/footer.html && grep -q 'css.TailwindCSS' layouts/_partials/css.html && grep -q 'templates.Defer' layouts/_default/baseof.html && grep -q 'ancestor_chain' layouts/descripcion/single.html && grep -q 'entity_links' layouts/descripcion/single.html && grep -q 'place_links' layouts/descripcion/single.html && grep -q 'display_name' layouts/entidad/single.html && grep -q 'display_name' layouts/lugar/single.html && hugo config >/dev/null 2>&1` | ✅ | ⬜ pending |
| 13-05-01 | 05 | 3 | HUGO-01 | T-13-10 | `git rm` irreversibility mitigated by commit-before/commit-after bracketing (D-05) | smoke | `test ! -f eleventy.config.js && test ! -d src && test ! -d _site && test ! -f tailwindcss && ! grep -q '@11ty/eleventy' package.json && grep -q 'vitest' package.json && test -x build.sh && grep -q 'hugo --minify' build.sh && grep -q 'scripts/generate-content.js' build.sh && grep -q 'exports/' build.sh && npm install --silent && grep -q 'Version:' README.md` | ✅ | ⬜ pending |
| 13-05-02 | 05 | 3 | HUGO-01 | T-13-11 | `public/` regenerated each build; stale-file accumulation accepted for Phase 13 (CI owns clean in Phase 15) | smoke | `SKIP_DOWNLOAD=1 DEV_LIMIT=100 ./build.sh && DEV_LIMIT=100 npx vitest run tests/ && test $(find public -name 'index.html' \| wc -l) -ge 300 && test $(find content -name '*.md' -not -name '_index.md' \| wc -l) -eq 0 && hugo version \| grep -q '+extended'` | ✅ | ⬜ pending |
| 13-05-03 | 05 | 3 | HUGO-01 | — | N/A (human verification of visible styling + TIFY curl) | manual | `curl -fsSL -o /dev/null -w '%{http_code}' http://127.0.0.1:1313/vendor/tify/tify.js \| grep -q 200` | N/A (checkpoint) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Threat refs (`T-13-XX`) map to each plan's `<threat_model>` STRIDE register. `—` indicates no threat surface at the task level (checkpoints and Eleventy-deletion tasks inherit the plan-level threat register but add no new attack surface of their own).*

---

## Wave 0 Requirements

All Wave 0 scaffolding is owned by Plan 01 Tasks 3 and 4:

- [x] `npm i -D vitest@^2.1.0` — vitest framework install (Plan 01 Task 3)
- [x] `vitest.config.js` — test runner config (Plan 01 Task 3)
- [x] `tests/fixtures/descriptions.sample.json` — real-shape fixture sampled from `exports/descriptions.json` (Plan 01 Task 3)
- [x] `tests/fixtures/entities.sample.json` — real-shape fixture sampled from `exports/entities.json` (Plan 01 Task 3)
- [x] `tests/fixtures/places.sample.json` — real-shape fixture sampled from `exports/places.json` (Plan 01 Task 3)
- [x] `tests/enrichment/date-format.test.js` — RED test for invariant I4 (ENRICH-02) (Plan 01 Task 4)
- [x] `tests/enrichment/ancestor-chain.test.js` — RED test for invariant I2 (ENRICH-01) (Plan 01 Task 4)
- [x] `tests/enrichment/link-enrichment.test.js` — RED test for invariant I2 (ENRICH-03) (Plan 01 Task 4)
- [x] `tests/enrichment/enriched-counts.test.js` — RED test for invariant I1 (ENRICH-04) (Plan 01 Task 4)
- [x] `tests/build/url-scheme.test.js` — RED test for invariant I3 (D-18 flat-code URLs) (Plan 01 Task 4; finalised by Plan 05 Task 2)
- [x] `tests/build/css-compiled.test.js` — RED test for invariant I8 (Tailwind output non-empty + class coverage) (Plan 01 Task 4; finalised by Plan 05 Task 2)

All files exist in `files_modified` for Plan 01 and have explicit task-level ownership. No MISSING references remain in the per-task verify map.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hugo Extended install verified on dev machine | ENRICH-05 (precondition) | Human must install a Homebrew binary on their local machine; Claude cannot `brew install` without the user's permission on their machine | `brew install hugo` (or upgrade); paste `hugo version` (must contain `+extended`) and `node --version` (must start `v22.`) into chat. Automated sanity: `hugo version \| grep -q '+extended'` |
| Visible Tailwind styling at smoke build | HUGO-01 | CSS rendering judgment (typography, spacing, colors) requires a browser and human visual assessment; byte-count + class-presence greps are necessary but not sufficient | After Plan 05 Task 2 completes, run `hugo server --bind 127.0.0.1 --port 1313` and visit `/`, `/descripcion/`, and one detail page (e.g. `/co-ahr-0001-…/`). Confirm: the page is NOT default-browser serif, the description detail renders ancestor-chain breadcrumb, Spanish narrative date, repository name, and entity/place link lists |
| TIFY passthrough availability | HUGO-01 (asset relocation) | Single HTTP status check against the live dev server — automatable alongside the manual browser visit but semantically a manual gate (human reads the chat response) | With `hugo server` running: `curl -sI http://127.0.0.1:1313/vendor/tify/tify.js \| head -1` must return `HTTP/1.1 200 OK` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 Task 4 scaffolds every test file referenced by Plans 02 and 05)
- [x] No watch-mode flags (vitest invocations use `run`, never `watch`; `hugo server` is only used at the human-verify checkpoint)
- [x] Feedback latency < 60s for the quick-run command
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-16
