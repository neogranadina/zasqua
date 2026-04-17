# Project Research Summary

**Project:** Zasqua Frontend v0.6.0 — Hugo migration
**Domain:** Large-scale static site build engine migration (Eleventy → Hugo, 192K-page archival site)
**Researched:** 2026-04-16
**Confidence:** HIGH

## Executive Summary

Zasqua Frontend v0.6.0 is a forced migration: Eleventy OOMs on GitHub Actions at 192K pages even with a 7 GB heap (exit code 134). The Node.js single-process model cannot paginate three large JSON arrays (descriptions 106K, entities 78K, places 7K) plus their enrichment data simultaneously. Hugo is the correct replacement — its content adapter mechanism (introduced v0.126.0, stable in all current releases) generates pages directly from JSON without stub files, renders in parallel across all CPU cores, and uses on-demand resource loading that caps memory well under the GitHub Actions runner limit. Community benchmarks confirm linear scaling to 100K pages and the Hugo forum documents dozens of sites at this scale. This is a well-understood migration path.

The recommended approach treats the migration as three parallel work streams: (A) a new Node.js enrichment script (`generate-content.js`) that absorbs all data-preparation logic previously embedded in Eleventy's data cascade and writes denormalised JSON to `assets/hugo-data/`; (B) Go template ports of the 13 Nunjucks templates with returning partials replacing all 15 custom Eleventy filters; and (C) CI/CD updates removing the Node.js heap override and replacing the Eleventy build step with Hugo. The Pagefind search indices, Tailwind CSS compilation, and Cloudflare R2 upload are all downstream of the build and remain largely unchanged. The diff-based R2 upload enhancement (ETag/MD5 comparison) can be developed independently and reduces deploy time from ~10 minutes to under 2 minutes on typical content builds.

The primary risks are data architecture decisions that must be locked in before any template work begins. Using Hugo's `data/` directory for the 370 MB combined JSON corpus would be an OOM risk; loading via `resources.Get` in content adapters avoids this. Content adapters cannot access `.Site.Pages` at all — all cross-referencing between descriptions, entities, and places must be pre-computed in `generate-content.js`. Go template variable scoping inside `with`/`range` blocks will be the main friction during template porting, particularly in the 413-line description template. None of these risks are blockers; all have clear, documented mitigations.

## Key Findings

### Recommended Stack

Hugo v0.160.1 replaces Eleventy as the SSG. It must be the Extended edition (for Hugo Pipes / `css.TailwindCSS`). Tailwind CSS must be installed via npm (`@tailwindcss/cli`) rather than the standalone binary — Hugo ≥ v0.146.0 cannot find binaries outside `node_modules/.bin` due to a Go upstream security change. Pagefind upgrades from v1.4.0 to v1.5.2 bring ~45% smaller index chunks and ~2× faster indexing with no API changes. The R2 upload script extends the existing Node.js parallel uploader with ETag/MD5 diff logic; rclone and r2sync are both unsuitable.

**Core technologies:**
- **Hugo v0.160.1 Extended:** Replaces Eleventy — content adapters generate 192K pages in ~1 GB RAM vs Eleventy's 7 GB OOM
- **Hugo content adapters (`_content.gotmpl`):** Key mechanism; one per section (`descripcion/`, `ne/`, `nl/`); reads JSON via `resources.Get`
- **`@tailwindcss/cli` via npm:** Tailwind v4 CSS compilation; must be in `node_modules/.bin/` for Hugo to find it (Hugo ≥ v0.146.0 PATH regression)
- **Pagefind v1.5.2:** Three independent search indices (descriptions, entities, places); post-build step; ~2× faster indexing than v1.4.0
- **`@aws-sdk/client-s3` (existing):** Extended with `ListObjectsV2` + ETag comparison for diff-based R2 upload

### Expected Features

All six capabilities are P1 — each is required for the migration to be functional and the site to deploy correctly.

**Must have (table stakes):**
- Content adapters for all three page types — generates the site; unblocks all other work
- Go template partials replicating all 15 Nunjucks filters — zero regressions in rendered output
- Tailwind v4 compilation wired through `css.TailwindCSS` with `hugo_stats.json` — visual parity
- Three Pagefind index builds in CI with `data-pagefind-body`/`data-pagefind-ignore` in all layouts — search parity
- Diff-based R2 upload replacing full sync — CI sustainability (current full upload ~10 minutes)

**Should have (post-migration stability):**
- Template metrics profiling pass (`--templateMetrics`) — identify hot partials once stable
- Dry-run deploy mode for the diff uploader — validate logic against production before relying on it
- `partialCached` applied to shared partials — measurable build-time improvement at 192K pages

**Defer (future):**
- Multisite Pagefind index merging — only relevant if cross-content-type unified search is required
- Hugo native `hugo deploy` with R2 — Cloudflare R2 not officially documented as an endpoint target

### Architecture Approach

The migration replaces only the build engine and template layer. Data source (B2), hosting (R2 + Worker), CI runner (GitHub Actions), client-side JS (vanilla, 8K lines), Pagefind, and Tailwind are all unchanged. The critical new component is `scripts/generate-content.js` — a Node.js script absorbing all enrichment logic previously in Eleventy's `_data/*.js` files, writing fully denormalised JSON to `assets/hugo-data/`. Hugo content adapters read these files and call `$.AddPage` per record. The build order is strictly sequential: B2 sync → `precompute-links.js` → `generate-content.js` → Tailwind CSS → `hugo` → Pagefind ×3 → R2 upload.

**Major components:**
1. `scripts/generate-content.js` (NEW) — reads raw + pre-computed JSON; writes enriched `assets/hugo-data/` files; highest-risk new component; must produce fully denormalised records
2. `content/{section}/_content.gotmpl` ×3 — Hugo content adapters; one per section; reads enriched JSON via `resources.Get`; calls `$.AddPage` per record; replaces Eleventy pagination
3. `layouts/{section}/single.html` ×3 — Go templates porting 13 Nunjucks templates; returning partials in `layouts/partials/filters/` replace all 15 custom Eleventy filters
4. `deploy.yml` — removes `NODE_OPTIONS` heap override; adds Hugo Extended setup; replaces `npx eleventy` with `hugo --minify`; updates upload source from `_site/` to `public/`

### Critical Pitfalls

1. **`.Site.Data` OOM from large JSON corpus** — never put the 370 MB combined JSON in Hugo's `data/` directory; load via `resources.Get` in content adapters; must be decided before any template work (Phase 1)
2. **Content adapters cannot access `.Site.Pages`** — any cross-referencing inside `_content.gotmpl` causes a fatal build error; all enrichment must be pre-computed in `generate-content.js` (Phase 1)
3. **Hugo Extended not installed in CI** — standard `hugo` binary silently omits `css.TailwindCSS`; CSS processes without error but produces raw unprocessed output; always install with `extended: true` (Phase 1)
4. **`hugo_stats.json` excluded by `.gitignore`** — Tailwind v4 respects `.gitignore` and silently skips the file, producing CSS missing most dynamic classes; remove from `.gitignore` or add explicit `@source` override (Phase 1)
5. **Spanish date formatting has no native Hugo equivalent** — `time.Format` produces English-only months; ISAD(G) date expressions are not parseable as `time.Time`; pre-compute `date_formatted` in `generate-content.js` (Phase 2)
6. **Go template variable scope inside `with`/`range`** — variables declared with `:=` inside a block are invisible outside it; declare all output variables before conditionals, use `=` reassignment inside blocks (Phase 3, description template)

## Implications for Roadmap

Based on research, the migration organises into four phases with two parallel work streams (pre-build pipeline and Hugo templates) converging at a full production build.

### Phase 1: Hugo Scaffolding and Data Architecture

**Rationale:** Every subsequent step depends on two foundational decisions: (a) large JSON loaded via `resources.Get` not `data/`, and (b) content adapters as the page-generation mechanism. These are expensive to reverse once templates are ported. CI scaffolding (Hugo Extended, `hugo_stats.json` fix) must also be validated before any template work — otherwise CSS regressions will be invisible until near the end of the migration.

**Delivers:** Working Hugo project skeleton building a subset of pages (DEV_LIMIT mode) with correct CSS output in CI; verified Hugo Extended installation; `hugo_stats.json` not excluded.

**Addresses:** Content adapters (P1), Tailwind v4 CSS compilation (P1), `hugo.toml` configuration

**Avoids:** `.Site.Data` OOM (Pitfall 1), stub file filesystem pressure (Pitfall 7), Hugo Extended missing (Pitfall 4), `hugo_stats.json` exclusion (Pitfall 5)

### Phase 2: Pre-Build Enrichment Script

**Rationale:** `generate-content.js` is the architectural keystone — templates cannot be fully validated until this script produces correct, denormalised JSON with all display values pre-computed (Spanish dates, number formatting, ancestor chains). Developing this script before or in parallel with template porting avoids rework when templates need fields that the enrichment script does not yet produce.

**Delivers:** `assets/hugo-data/descriptions.json`, `entities.json`, `places.json` with all enrichment fields pre-computed; validated against production data counts; `date_formatted` and `number_formatted` fields avoiding Go template date/number complexity.

**Addresses:** Go template data lookups (P1), Spanish date formatting, number formatting, ancestor chain computation

**Avoids:** Content adapters accessing `.Site.Pages` (Pitfall 2), Spanish date logic in Go templates (Pitfall 6), regex-heavy template logic (anti-pattern)

### Phase 3: Template Porting

**Rationale:** With a working skeleton (Phase 1) and correct enriched JSON (Phase 2), template porting is the bulk of the migration work. The description template is the highest-risk file and should be ported last. Port order: base layout → header/footer/breadcrumb partials → returning-partial filter library → entity and place templates → description template. This order surfaces Go template syntax issues on simple templates before encountering the 413-line description template.

**Delivers:** All 13 Nunjucks templates ported as Go templates; all 15 custom filters as returning partials; Pagefind metadata attributes (`data-pagefind-filter`, `data-pagefind-meta`, `data-pagefind-sort`) preserved in all layouts; full 192K-page build validated against production data.

**Addresses:** Go template data lookups (P1), Pagefind index parity (P1)

**Avoids:** Go template variable scope breakage (Pitfall 3), Pagefind metadata double-escaping (Pitfall 8)

### Phase 4: CI Pipeline and R2 Diff Upload

**Rationale:** CI changes and the diff-based upload are both architecturally independent of Hugo templates and can be developed in parallel with Phase 3. They belong in the same final phase because both require a working full build for end-to-end validation. The upload path change (`_site/` → `public/`) is a one-line change but a silent failure mode if missed.

**Delivers:** Updated `deploy.yml` with clean full build; R2 diff upload replacing full sync; full CI run verified end-to-end; dry-run mode for upload validation.

**Addresses:** Diff-based R2 upload (P1), CI pipeline correctness

**Avoids:** R2 upload targeting wrong output directory (Pitfall mapping), full-sync upload at 192K files on every build

### Phase Ordering Rationale

- Phase 1 must precede all other phases — data architecture and CI scaffolding decisions are foundational and expensive to reverse
- Phase 2 can overlap with Phase 1 (enrichment script is independent of Hugo) but its output is required before Phase 3 can be validated against real data
- Phase 3 is the longest phase and has an internal order: base/partials first, description template last (highest risk)
- Phase 4 is final integration; CI and upload changes require a working full build as their validation environment

### Research Flags

Phases with standard, well-documented patterns — skip `/gsd-research-phase`:
- **Phase 1 (scaffolding):** Hugo content adapters and `css.TailwindCSS` are thoroughly documented in official Hugo docs; the Extended edition requirement and `hugo_stats.json` gotcha are explicitly noted in official documentation
- **Phase 3 (templates):** Nunjucks-to-Go template porting is a known migration path with extensive Hugo community documentation; filter equivalences are fully mapped in ARCHITECTURE.md
- **Phase 4 (CI/R2):** Diff-based R2 upload uses the existing `@aws-sdk/client-s3` SDK; ETag comparison logic verified against Cloudflare's documented S3-compatible API

Phases that may benefit from targeted investigation during implementation:
- **Phase 2 (enrichment script):** Memory profile of building the ancestor-chain lookup map for 106K descriptions simultaneously needs to be profiled on a GitHub Actions runner; if it approaches the limit, a two-pass approach will be needed
- **Phase 3 (description template):** The `countryName` filter equivalent needs a `data/countries.json` lookup; enumerate the ~10 country codes from production data before building the lookup

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Hugo v0.160.1, Pagefind v1.5.2, `@tailwindcss/cli` approach all verified against official docs, official GitHub issues, and Hugo core maintainer reference repo |
| Features | HIGH | All six P1 features directly derived from the OOM failure mode and existing site requirements; no speculative features |
| Architecture | HIGH (patterns) / MEDIUM (scale) | Content adapter pattern, data flow, component boundaries verified against official Hugo docs; 192K-page performance extrapolated from 100K community benchmarks (linear scaling confirmed but not tested at exact scale) |
| Pitfalls | HIGH | All eight critical pitfalls verified against official docs, official GitHub issues, or Hugo Discourse with maintainer responses |

**Overall confidence:** HIGH

### Gaps to Address

- **192K-page build time on GitHub Actions:** Community benchmarks confirm 100K pages; 192K is an extrapolation. First full CI build may reveal the need to tune `HUGO_MEMORYLIMIT`. Monitor closely and adjust before shipping.
- **`lang.FormatNumber` with Colombian Spanish separators:** `lang.FormatNumber 0 $num` with `language = "es-CO"` in `hugo.toml` needs verification before relying on it. If it produces comma-separated output instead of period-separated (`1.234`), pre-compute in `generate-content.js`.
- **URL path compatibility:** Content adapter `path` values are relative to the adapter's location in `content/`. Verify that description, entity, and place URLs match existing published URLs before full cutover to avoid breaking inbound links.

## Sources

### Primary (HIGH confidence)
- [Hugo content adapters docs](https://gohugo.io/content-management/content-adapters/) — `_content.gotmpl`, `.AddPage`, adapter limitations including `.Site.Pages` constraint
- [Hugo `css.TailwindCSS` docs](https://gohugo.io/functions/css/tailwindcss/) — `build.writeStats`, `hugo_stats.json`, `@source` directive, `.gitignore` conflict
- [Hugo issue #13617](https://github.com/gohugoio/hugo/issues/13617) — PATH regression for standalone Tailwind binary, v0.146.0+, closed as docs-only
- [bep/hugo-testing-tailwindcss-v4](https://github.com/bep/hugo-testing-tailwindcss-v4) — Hugo core maintainer reference repo confirming npm approach
- [Pagefind changelog](https://github.com/CloudCannon/pagefind/blob/main/CHANGELOG.md) — v1.5.2 confirmed latest; v1.5.0 features documented
- [Pagefind discussion #831](https://github.com/Pagefind/pagefind/discussions/831) — incremental indexing not supported, architectural constraint confirmed by maintainer
- [Cloudflare R2 aws-sdk-js-v3 docs](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/) — `ListObjectsV2` support, ETag format, single-part MD5
- [Hugo data sources docs](https://gohugo.io/content-management/data-sources/) — `data/` memory behaviour, `resources.Get` as alternative

### Secondary (MEDIUM confidence)
- [Hugo Discourse: content adapters performance](https://discourse.gohugo.io/t/content-adapters-examples-and-performance/49830) — linear scaling benchmarks to 100K pages
- [Hugo Discourse: memory tracking](https://discourse.gohugo.io/t/how-to-track-and-reduce-hugo-memory-usage-on-build-getting-oom/47245) — `HUGO_MEMORYLIMIT`, streaming builds v0.123.0+
- [Hugo Discourse: Tailwind binary PATH](https://discourse.gohugo.io/t/how-to-configure-hugo-to-use-the-tailwindcss-v4-binary-instead-of-npm/53018) — Hugo Extended requirement for Hugo Pipes
- [Hugo Discourse: Spanish date parsing](https://discourse.gohugo.io/t/parsing-custom-date-format-french-spanish/39463) — `time.Format` locale limitations

### Tertiary (LOW confidence)
- [r2sync v0.0.4](https://github.com/Songmu/r2sync) — evaluated and ruled out (experimental, unproven at 192K-file scale)
- [rclone R2 sync issues](https://github.com/rclone/rclone/issues/7881) — `--checksum` HEAD-request cost evaluated and ruled out

---
*Research completed: 2026-04-16*
*Ready for roadmap: yes*
