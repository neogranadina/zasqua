---
phase: 13-hugo-foundation
plan: 01
status: complete
date_completed: 2026-04-17
---

# Plan 13-01 Summary — Phase 13 Foundation

## What shipped

- Hugo Extended v0.160.1 installed locally via Homebrew (`hugo v0.160.1+extended+withdeploy darwin/arm64`).
- Node v22.17.0 already present; `.nvmrc` already pinned to `22`.
- Archival data directory renamed `data/` → `exports/` (913 MB moved, gitignore updated).
- `scripts/precompute-links.js`, `scripts/places-to-geojson.js`, and `build.sh` now reference `exports/` for all file I/O. All three files received narrative headers + `Version: v1.0.0` per `docs/guidelines/code-conventions.md`.
- `vitest ^2.1.0` installed as a dev dependency. `package.json` scripts gain `test` (`vitest run`) and `test:watch` (`vitest`). `vitest.config.js` pins Node environment and `tests/**/*.test.js` include pattern.
- Three real-shape fixtures extracted verbatim from the canonical export: `tests/fixtures/descriptions.sample.json` (3 records with `parent_reference_code`), `entities.sample.json` (5 records), `places.sample.json` (5 records). No invented metadata.
- Six RED test files scaffolded, one per invariant:
  - `tests/enrichment/date-format.test.js` (I4) — 8 golden cases for `formatDateNarrative`.
  - `tests/enrichment/ancestor-chain.test.js` (I2) — breadcrumb chain walk + shape.
  - `tests/enrichment/link-enrichment.test.js` (I2) — entity/place link denormalisation.
  - `tests/enrichment/enriched-counts.test.js` (I1) — 78,476/106,529/6,722 record counts with DEV_LIMIT support.
  - `tests/build/url-scheme.test.js` (I3) — flat-code D-18 URL scheme, gated by `SKIP_BUILD_TESTS`.
  - `tests/build/css-compiled.test.js` (I8) — Tailwind v4 JIT output sanity, gated by `SKIP_BUILD_TESTS`.

## Test baseline

- `SKIP_BUILD_TESTS=1 npx vitest run tests/enrichment/` — 9 failing / 4 files. Expected RED state.
- `SKIP_BUILD_TESTS=1 npx vitest run tests/build/` — 4 skipped / 2 files. Will become RED once Plan 13-05 builds `public/`.
- Failure messages reference the missing `scripts/generate-content.js` export and missing `assets/hugo-data/*.json` — confirming the tests are exercising the right things.

## Commits

- `dd27c2b` — rename `data/` → `exports/` and update script path references
- `ead5c2f` — install vitest and scaffold real-shape fixtures
- `59c74b4` — scaffold RED tests for invariants I1–I8

(Plan's success criterion #7 called for a single commit; we used three atomic commits — one per execute-plan task — which matches the project-wide GSD commit protocol. No downstream impact.)

## Deviations

- **`grep -c 'exports/' scripts/precompute-links.js` returns 5, not ≥ 10.** The plan's acceptance criterion was written assuming the script used literal `data/foo.json` paths for each file. In reality it already uses a `DATA_DIR` constant with a single default literal, so only one file-path literal changed. The plan's stronger gate — `grep -En '["'\''\s](data/)'` on all three scripts returning zero — does pass, confirming functional completeness.
- **B2 download retained under `exports/`.** The old 913 MB archive at `data/` was `mv`-ed (not redownloaded) into `exports/` so downstream plans don't wait on a network roundtrip.

## Forward pointer

Plan 13-02 imports `formatDateNarrative` from `scripts/generate-content.js` and writes `assets/hugo-data/{descriptions,entities,places}.json`. Those actions make the four enrichment tests green. `tests/build/*` stay skipped until Plan 13-05 runs the smoke build.
