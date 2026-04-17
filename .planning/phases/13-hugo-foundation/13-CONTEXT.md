# Phase 13: Hugo Foundation - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 delivers the Hugo project scaffold at repository root and the `scripts/generate-content.js` enrichment script. The scaffold builds a subset of pages end-to-end with correct CSS output; the enrichment script produces fully-enriched denormalised JSON in `assets/hugo-data/` that Phase 14 templates will consume.

Template porting is Phase 14. CI/deploy pipeline is Phase 15.

In scope for Phase 13:
- Hugo project files at repo root (`hugo.toml`, `content/`, `layouts/` skeleton, `assets/`, `static/`, `config/`)
- Content adapters (`_content.gotmpl`) in `content/descripcion/`, `content/entidad/`, `content/lugar/` that iterate the enriched JSON via `resources.Get` + `transform.Unmarshal` and emit page resources with permalinks preserved to the flat-code URL scheme
- Client-asset relocation from the current Eleventy `src/` tree to Hugo's canonical locations (`assets/`, `static/`)
- Removal of Eleventy (`eleventy.config.js`, `src/` tree, `_site/`, `@11ty/eleventy` dep)
- `scripts/generate-content.js` that reads the downloaded `data/` JSON + the outputs of `scripts/precompute-links.js` and writes `assets/hugo-data/descriptions.json`, `entities.json`, `places.json`
- Tailwind v4 wired via `@tailwindcss/cli` + Hugo Pipes with `hugo_stats.json` produced (`build.writeStats = true`) and not excluded from `.gitignore`
- One minimal base layout (`layouts/_default/baseof.html`) and a single smoke-test page template proving the pipeline end-to-end — full template porting is Phase 14

Out of scope for Phase 13 (belongs in Phase 14):
- Porting all 13 Nunjucks templates
- Implementing the 15 custom filters as Go partials
- Pagefind attribute wiring

</domain>

<decisions>
## Implementation Decisions

### Project layout and Eleventy cut-over
- **D-01:** Hard cut-over — Phase 13 removes Eleventy. `eleventy.config.js`, `src/_data/`, `src/_layouts/`, `src/_includes/`, `src/*.njk`, `src/explorar/*.njk`, `_site/` are deleted; `@11ty/eleventy` is dropped from `package.json`.
- **D-02:** Client-side assets relocate in Phase 13 (not Phase 14):
  - `src/js/*.js` → `assets/js/` (Hugo Pipes-managed)
  - `src/css/main.css` → `assets/css/main.css`
  - `src/vendor/tify/` → `static/vendor/tify/`
  - `src/img/` → `static/img/`
- **D-03:** Phase 13 lands with assets in Hugo locations so Phase 14 templates have zero file-moving work; validates end-to-end that the Hugo Pipes CSS pipeline, vendored TIFY passthrough, and static image serving all work before template porting starts.
- **D-04:** `src/_data/ui.js` content moves to Hugo `data/ui.yaml` (or `data/ui.toml`) for templates to access via `.Site.Data.ui`. The file is small, pure UI strings, and is fine on `.Site.Data` (the `.Site.Data` prohibition applies to the large archival datasets, not small lookup tables).
- **D-05:** No fallback to Eleventy if Phase 14 hits a Hugo blocker — git history is the rollback path. Accepted because v0.5.1 is already blocked from deploying to zasqua.org by CI OOM, so there is no live-site hotfix scenario this decision forecloses.

### Enrichment pipeline architecture
- **D-06:** Two-step pipeline. `scripts/precompute-links.js` stays as-is and continues producing per-entity/per-place shards, the co-occurrence graph, `desc-entity-lookup.json`, and `desc-place-lookup.json` — all of which are consumed by client-side JS at runtime (tree.js, explorers). `scripts/generate-content.js` is the new script and runs after `precompute-links.js`.
- **D-07:** `generate-content.js` consumes `data/descriptions.json`, `data/entities.json`, `data/places.json`, `data/repositories.json`, and the precompute outputs (`desc-entity-lookup.json`, `desc-place-lookup.json`, plus any per-record shards needed for `_linked_count`). It writes three files: `assets/hugo-data/descriptions.json`, `assets/hugo-data/entities.json`, `assets/hugo-data/places.json`.
- **D-08:** Logic port source: the ancestor-walking and repository-attachment logic currently in `src/_data/descriptions.js`, plus the entity/place link enrichment logic currently in `src/_data/entities.js` and `src/_data/places.js`, is ported to `generate-content.js`. The Eleventy data loaders are then deleted (D-01).
- **D-09:** Further refactor into shared `scripts/enrichment/*.js` modules is **deferred** — good idea, wrong phase. Revisit after Phase 14 if duplication becomes painful.

### Denormalisation depth
- **D-10:** Minimal inline link enrichment on description records. Each description in `assets/hugo-data/descriptions.json` carries:
  - `ancestor_chain` — array of `{reference_code, title, description_level}` from root to direct parent
  - `date_formatted` — pre-formatted Spanish narrative date string (D-15)
  - `repository` — full repository object (code, name, etc.) — attached inline
  - `entity_links` — array of `{entity_code, display_name, role_label}` — no other entity fields
  - `place_links` — array of `{place_code, display_name, role_label}` — no other place fields
- **D-11:** Full entity / place records (given_name, surname, entity_type, dates_of_existence, history, coordinates, authority links, etc.) live only in `assets/hugo-data/entities.json` and `places.json`, reached via `/ne-xxxxxx/` and `/nl-xxxxxx/` detail pages.
- **D-12:** Entity and place records in their respective files are themselves enriched with pre-computed presentation fields: `display_name`, `date_formatted` range if applicable, `_linked_count` (from precompute shards), and anything else Phase 14 detail templates need pre-computed. Exact field list to be finalised during Phase 14 planning; Phase 13 plan should leave the generator pluggable.

### DEV_LIMIT
- **D-13:** **Dropped from Phase 13 scope.** The equivalent Eleventy `DEV_MODE` has never been used because it's incompatible with a meaningful Pagefind-enabled local dev experience. Hugo's full build is ~3-5 min with <1 GB memory, making full local builds viable without a subset mode.
- **D-14:** ROADMAP.md Phase 13 success criteria 1 and 5 need updating to remove DEV_LIMIT references; REQUIREMENTS.md ENRICH-05 to be removed; STATE.md v1.0.0 decisions line "DEV_LIMIT environment variable for fast local builds introduced in Phase 13" to be removed. Handled before planning (see Follow-ups).

### Pre-computed output contract
- **D-15:** `date_formatted` matches the existing Eleventy `formatDate` filter output byte-for-byte. Port `formatDateNarrative` from `eleventy.config.js:37-64` verbatim into `generate-content.js`. Format rules:
  - `YYYY-MM-DD` → `"15 de marzo de 1723"` (day, month, year in narrative Spanish)
  - `YYYY-MM` → `"marzo de 1723"`
  - `YYYY` → passed through unchanged
  - Ranges (split on `" .. "`) → each side formatted, joined with `" – "` (en dash with surrounding spaces)
  - Empty/null → empty string
  - Unparseable → passed through unchanged
- **D-16:** Month names use lowercase Colombian Spanish: `enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre`.
- **D-17:** `numberFormat` (thousands separator with `.`) also ports into `generate-content.js` as a helper used wherever counts are pre-formatted into the enriched JSON.

### URL permalinks (preserve existing flat-code scheme)
- **D-18:** Content adapters override Hugo's default permalink to strip the content-section prefix:
  - `content/descripcion/_content.gotmpl` → resources publish at `/{reference_code}/`
  - `content/entidad/_content.gotmpl` → resources publish at `/{entity_code}/` (e.g. `/ne-xxxxxx/`)
  - `content/lugar/_content.gotmpl` → resources publish at `/{place_code}/` (e.g. `/nl-xxxxxx/`)
- **D-19:** Repositories publish at `/{repo_code}/` (e.g. `/co-ahr/`). Not covered by a content adapter in the same sense — repository pages are bounded (~5 of them) and can be driven by a small `content/repositorio/` adapter or static content files with computed slug; pick in Phase 14 planning.
- **D-20:** Explorer list pages stay at `/entidades/` and `/lugares/` (plural, no `/explorar/` prefix). Search stays at `/buscar/`. These are driven by standalone page templates in Phase 14, not content adapters.

### Hugo data-loading pattern (carried forward from PROJECT.md)
- **D-21:** Large JSON is loaded inside content adapters via `resources.Get "hugo-data/descriptions.json" | transform.Unmarshal`. Never placed under `data/` (would trigger `.Site.Data` behaviour and OOM). `hugo.toml` sets `build.writeStats = true`.
- **D-22:** `hugo_stats.json` is explicitly **not** excluded from `.gitignore` — Tailwind v4 reads it to drive JIT content detection. Silent no-op if this is wrong; Phase 13 plan must verify the generated file exists after build.
- **D-23:** Hugo Extended is required (`hugo version` output contains `+extended`). Plan must include a local install check and a CI install check (wired in Phase 15 but verified locally in Phase 13).

### Tailwind CSS wiring
- **D-24:** `@tailwindcss/cli ^4.2.2` and `tailwindcss ^4.2.2` are already in `package.json`. Phase 13 wires them into Hugo Pipes via `resources.Get "css/main.css" | postCSS` (or the Tailwind v4 equivalent). Entry CSS stays at `assets/css/main.css`.
- **D-25:** No PostCSS config file churn — Tailwind v4 CLI handles its own processing; existing `src/css/main.css` ports as-is to `assets/css/main.css`.

### Claude's Discretion
- Exact shape of entity and place records in `entities.json` and `places.json` (beyond the success-criteria-mandated `display_name` and `role_label`) — finalise during Phase 13 planning against Phase 14 template needs; the `generate-content.js` API should be easy to add fields to.
- Whether the single smoke-test page template in Phase 13 is a description, entity, or place detail — pick whichever proves the content adapter + `resources.Get` + permalink override + Tailwind pipeline fastest. Description is probably the answer (largest dataset, exercises most plumbing).
- `hugo.toml` structural choices (module mounts, output formats beyond HTML, minify options) — use Hugo defaults where possible, document exceptions.
- Directory layout for Hugo content adapters' companion files (e.g., shared partials in `layouts/partials/`) — follow Hugo community conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §Phase 13 — goal, depends-on, requirements list, success criteria (note: criteria 1 and 5 pending update per D-14)
- `.planning/REQUIREMENTS.md` — HUGO-01, HUGO-02, HUGO-04, ENRICH-01..ENRICH-04 (ENRICH-05 pending removal per D-14)
- `.planning/PROJECT.md` — v1.0.0 milestone framing, key decisions, constraints

### Prior technical decisions
- `../docs/frontend/technical-decisions/build-pipeline-sustainability.md` — detailed Hugo migration assessment. **Note drift:** this doc pre-dates the "content adapters, no stub markdown" decision and describes the older stub-markdown approach (§"Content files must be pre-generated"). The filter migration table (§"Custom filters reimplemented…") and the effort-estimate table remain useful; the content-file section is superseded by the `_content.gotmpl` decision in PROJECT.md.

### Data contract
- `../docs/frontend/backend-contract.md` — B2 bucket layout, JSON file shapes, required fields per record type. Authoritative source for what `data/*.json` contains.

### Code references (ground truth for ports)
- `eleventy.config.js:37-64` — `formatDateNarrative` (canonical source for D-15/D-16)
- `eleventy.config.js:68-71` — `numberFormat` (canonical source for D-17)
- `src/_data/descriptions.js` — ancestor walking and repository attachment logic to port
- `src/_data/entities.js` — entity enrichment logic to port
- `src/_data/places.js` — place enrichment logic to port
- `src/_data/ui.js` — Spanish UI strings to move to Hugo `data/ui.yaml`
- `scripts/precompute-links.js` — untouched in Phase 13; contract is what it writes to `data/` (consumed by `generate-content.js` and by client JS)
- `src/entidad.njk:1-8`, `src/lugar.njk:1-8`, `src/repository.njk:1-8` — current permalink shapes (ground truth for D-18/D-19)
- `src/explorar/entidades.njk:1-4`, `src/explorar/lugares.njk:1-4` — current explorer permalinks (ground truth for D-20)

### Codebase intel (read with date awareness)
- `.planning/codebase/STACK.md` — dated 2026-03-24; reflects v0.3.x single-dep Eleventy state. Phase 4–12 added entities/places, three Pagefind indices, Tailwind v4 — treat as structural reference only, not up-to-date inventory.
- `.planning/codebase/STRUCTURE.md` — same caveat; URL sections were partially wrong and have been corrected in PROJECT/REQUIREMENTS/ROADMAP (commit eda9e3c).
- `.planning/codebase/CONVENTIONS.md`, `INTEGRATIONS.md`, `TESTING.md`, `CONCERNS.md`, `ARCHITECTURE.md` — same date, read for structural conventions only.

### Project conventions
- `../docs/guidelines/code-conventions.md` — narrative header + version footer requirement for every source file, including `generate-content.js`, the new Hugo templates, and any relocated JS/CSS that didn't already have one. Non-negotiable.
- `../docs/frontend/guidelines/frontend-workflow.md`, `frontend-design.md`, `design-tokens.md`, `shared-visual-language.md` — frontend conventions that still apply post-migration.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/precompute-links.js` (276 lines) — shards, graph, lookup files. Stays untouched; `generate-content.js` consumes its outputs.
- `formatDateNarrative` in `eleventy.config.js:37-64` — port verbatim into `generate-content.js` (D-15).
- `numberFormat` in `eleventy.config.js:68-71` — port as helper (D-17).
- Ancestor walker in `src/_data/descriptions.js` — port to enrichment script (D-08).
- Entity/place enrichment logic in `src/_data/entities.js`, `places.js` — port to enrichment script (D-08).
- `src/vendor/tify/` — TIFY v0.31.0 IIIF viewer. Moves to `static/vendor/tify/` (D-02); no code changes, Hugo serves it as-is.
- `@tailwindcss/cli ^4.2.2` — already in `package.json` (D-24).

### Established Patterns
- UI strings in Spanish live in one place and are referenced by key — the `ui.js` → `data/ui.yaml` move preserves this (D-04).
- Data pre-computation happens at build time; no runtime API. `generate-content.js` keeps this principle.
- JSON data enters via Backblaze B2 → `data/` at build time; backend-contract.md defines the shapes.
- Commit-along-the-way during development, thematic commits when porting to public repo (per CLAUDE.md).
- Every source file has a narrative header + version footer.

### Integration Points
- `build.sh` — current Eleventy orchestration. Replaces with: B2 download → `node scripts/precompute-links.js` → `node scripts/generate-content.js` → `hugo --minify` (Pagefind and R2 upload wired in Phase 15).
- `package.json` scripts — `dev`, `build`, `build:dev`, `debug` all rewrite around Hugo. `DEV_MODE=true` branching is removed (D-13).
- `.github/workflows/deploy.yml` — untouched in Phase 13; rewritten in Phase 15.
- `worker/worker.js` — untouched; flat-code URL scheme preserved means no Worker-side URL remapping needed.
- Client JS expects runtime data at `/data/children/*.json`, `/data/{entity,place}-links/*.json`, graph JSON, lookup files — these come from `scripts/precompute-links.js` outputs and must remain accessible at their current URLs. Decide during planning whether they move to `static/data/` (Hugo passthrough) or are written there directly by `precompute-links.js`.
- `assets/hugo-data/` — new directory owned by `generate-content.js`; Hugo reads it inside content adapters via `resources.Get` (D-21).

</code_context>

<specifics>
## Specific Ideas

- Smoke-test page for Phase 13 is likely a description detail page (exercises most plumbing — `resources.Get` on the largest JSON, content-adapter permalink override, Tailwind compiled output, TIFY passthrough if we want to stretch-test). Don't port the full `description.njk` — just prove the pipeline with a stub that shows title, reference_code, ancestor chain, and date_formatted.
- `generate-content.js` should exit non-zero on any parse error and log record counts to stdout in a format that's grep-able in CI (Phase 15 will diff counts against known totals: ~106K descriptions, ~83K entities, ~7K places).
- Spot-check script (optional, nice-to-have in Phase 13): a tiny `scripts/check-enriched-counts.js` that reads `assets/hugo-data/*.json` and prints counts — useful for Phase 14 QA.

</specifics>

<deferred>
## Deferred Ideas

- **Shared enrichment modules** — Extracting ancestor walking, entity/place enrichment, date formatting into `scripts/enrichment/*.js` modules and refactoring both `precompute-links.js` and `generate-content.js` to use them. Revisit after Phase 14 if duplication becomes painful.
- **Representative-sample DEV_LIMIT** — If a future workflow needs a dev subset that spans all repositories / hierarchy levels, build it then. Not in Phase 13 scope (D-13).
- **CI smoke-test subset build** — A GitHub Actions PR check that builds, say, 100 descriptions end-to-end in <60s to catch pipeline breakage before full 6-hour production builds. Reasonable for Phase 15 if CI time becomes a problem; don't preempt.
- **Hugo custom Go function for formatDate** — The old tech-decision doc suggests this for complex date logic. Not needed: `generate-content.js` pre-computes `date_formatted`, so Go templates do zero date logic.
- **Diff-based rendering (skip pages whose data hasn't changed)** — orthogonal to Phase 13 scope; belongs to a future optimisation phase.
- **Update `.planning/codebase/*.md` intel docs to reflect v0.5.0 reality** — they're from 2026-03-24. Not Phase 13 scope; run `/gsd-map-codebase` before the next major milestone.

## Follow-ups before planning

These must happen before `/gsd-plan-phase 13` so the planner doesn't re-derive from stale spec:

1. **ROADMAP.md Phase 13 success criterion 1** — drop `DEV_LIMIT=100` prefix; the criterion becomes "Running `hugo --minify` locally produces HTML output for descriptions, entities, and places without error; content adapters (`_content.gotmpl`) in `content/descripcion/`, `content/entidad/`, and `content/lugar/` generate pages via `resources.Get` + `transform.Unmarshal` — no stub markdown files exist on disk".
2. **ROADMAP.md Phase 13 success criterion 5** — remove entirely (DEV_LIMIT-dependent).
3. **ROADMAP.md Phase 13 one-line summary (line 19)** — drop "DEV_LIMIT builds working, ".
4. **REQUIREMENTS.md ENRICH-05** — remove. Update Traceability table to drop the ENRICH-05 row. Update coverage count (20 → 19).
5. **ROADMAP.md Phase 13 Requirements line** — remove `ENRICH-05`.
6. **STATE.md v1.0.0 decisions** — remove the `DEV_LIMIT environment variable for fast local builds introduced in Phase 13` bullet.

</deferred>

---

*Phase: 13-hugo-foundation*
*Context gathered: 2026-04-16*
