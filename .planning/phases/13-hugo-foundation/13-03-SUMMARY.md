---
phase: 13-hugo-foundation
plan: 03
status: complete
date_completed: 2026-04-17
subsystem: frontend/hugo
tags: [hugo, content-adapters, tailwind-v4, data-loading, url-scheme, i18n]
dependency_graph:
  requires:
    - plan: 13-01
      provides: Hugo Extended toolchain, exports/ export staging, vitest bootstrap
    - plan: 13-02
      provides: enriched sharded JSON at assets/hugo-data/
  provides:
    - hugo.toml (site-wide config with writeStats + module mounts)
    - three content adapters (descriptions/entities/places) producing flat-code URLs
    - data/ui.yaml (Spanish UI strings for .Site.Data.ui)
    - four section listing pages
  affects:
    - plan: 13-04
      reason: consumes .Site.Data.ui, adapters' .Params, and baseURL from hugo.toml
    - plan: 13-05
      reason: full-corpus build verification runs against this scaffold
tech_stack:
  added:
    - Hugo content adapters (_content.gotmpl)
    - Hugo module mounts (hugo_stats.json bridging Tailwind v4)
    - resources.Match for sharded JSON loading
  patterns:
    - try/.Err/errorf on every resource load
    - per-page url override inside AddPage dict
    - sharded-glob iteration for descriptions (not single-file load)
key_files:
  created:
    - hugo.toml
    - data/ui.yaml
    - content/_index.md
    - content/descripcion/_content.gotmpl
    - content/descripcion/_index.md
    - content/entidad/_content.gotmpl
    - content/entidad/_index.md
    - content/lugar/_content.gotmpl
    - content/lugar/_index.md
  modified:
    - .gitignore
decisions:
  - D-22 overridden: hugo_stats.json handled via module.mounts (not via .gitignore non-exclusion alone); mount is robust against future developers gitignoring the file
  - descriptions adapter uses resources.Match for glob iteration over sharded output (not resources.Get on a nonexistent unified file)
  - per-page url override set inside AddPage dict via merge — verified in smoke build to strip the /descripcion/, /entidad/, /lugar/ section prefixes
metrics:
  duration_minutes: 45
  tasks_completed: 2
  tasks_total: 2
  commits:
    - 010e947
    - d384607
  files_created: 9
  files_modified: 1
  pages_verified: 191733
---

# Plan 13-03 Summary — Hugo Scaffold and Content Adapters

## One-liner

Hugo site scaffold landed: `hugo.toml` with `build.writeStats = true` and a module mount bridging `hugo_stats.json` into Tailwind v4's reach, three content adapters emitting 191,733 pages at the flat-code URL scheme, and `data/ui.yaml` ported byte-for-byte from `src/_data/ui.js`.

## What shipped

### Task 1 — `hugo.toml`, `data/ui.yaml`, `.gitignore` (commit `010e947`)

- `hugo.toml` at project root:
  - `baseURL = "https://zasqua.org/"`, `languageCode = "es-CO"`, `defaultContentLanguage = "es"`
  - `title = "Zasqua — Archivo Histórico"` (em dash with surrounding spaces per user convention)
  - `[build] writeStats = true` + `[build.buildStats] enable = true` — verified by a throwaway build that `hugo_stats.json` is written
  - `[module.mounts]` entries for `assets → assets` and `hugo_stats.json → assets/notwatching/hugo_stats.json` (with `disableWatch = true` to avoid rebuild loops) — Tailwind v4 sees the stats file via the mount regardless of `.gitignore` state (RESEARCH.md Pitfall 2)
  - `[[build.cachebusters]]` entries linking stats and `(postcss|tailwind).config.js` to the `css` target so CSS rebuilds pick up class-usage changes
  - `[markup.goldmark.renderer] unsafe = true` — reserved for any legit HTML inline inside description titles (e.g. diacritics or HTML-entity-escaped characters); all content is backend-produced and trusted per the threat model
  - narrative header comment block (about 30 lines) covering *why* the module mount exists, *why* large JSON is not placed in `data/`, and the V8 string-length ceiling that forces sharded data loading
- `data/ui.yaml` (~240 lines):
  - every top-level key from `src/_data/ui.js` present — 15/15 match on sorted key comparison
  - deep-diff against the JS source via `js-yaml` shows zero value mismatches at any depth (nav, error404, breadcrumb, search, facets, levels, levelsPlural, description, roles, entity, place, fields, repository, footer, general)
  - Spanish strings preserved byte-for-byte, including lowercase role labels (Productor, Testigo, Escribano, etc.) per D-16
  - accessible as `.Site.Data.ui` in Hugo templates
- `.gitignore`:
  - added `resources/_gen/` (Hugo asset cache) and `.hugo_build.lock` (Hugo runtime lock)
  - `hugo_stats.json` intentionally NOT added (Tailwind v4 silent-skip avoidance — even though the module mount is the primary fix)
  - pre-existing entries unchanged (`_site/`, `public/`, `node_modules/`, `exports/`, `assets/hugo-data/*.json`, `assets/hugo-data/descriptions/`, etc.)

### Task 2 — content adapters and section listings (commit `d384607`)

- `content/descripcion/_content.gotmpl` — **sharded** descriptions adapter:
  - `resources.Match "hugo-data/descriptions/*.json"` globs the six shard files (000.json…005.json)
  - outer guard raises `errorf` if zero shards match (surfaces "enrichment never ran" clearly)
  - inner `try`/`.Err`/`errorf` on each shard's `transform.Unmarshal`
  - params dict carries every enrichment field (`ancestor_chain`, `date_formatted`, `entity_links`, `place_links`) plus the full ISAD(G) pass-through fields so Phase 14 templates need no additional data access
  - `url` override to `/{reference_code}/` via `merge` into the AddPage dict
- `content/entidad/_content.gotmpl` — single-file entities adapter:
  - `resources.Get "hugo-data/entities.json"` (entities file is ~35 MB, comfortably under V8's 512 MiB ceiling — no sharding needed)
  - `try`/`.Err`/`errorf` on both `resources.Get` and the subsequent `transform.Unmarshal`
  - params: `entity_code`, `display_name`, `entity_type`, `dates_of_existence`, `date_formatted`, `viaf_id`, `dbe_id`, `_linked_count`, plus the ISAAR CPF pass-through fields
  - `url` override to `/{entity_code}/` (e.g. `/ne-da5jn/`)
- `content/lugar/_content.gotmpl` — single-file places adapter:
  - `resources.Get "hugo-data/places.json"` (~2.4 MB)
  - same `try`/`.Err`/`errorf` discipline
  - params: `place_code`, `display_name`, `place_type`, `latitude`, `longitude`, `_linked_count`, plus the full place authority fields
  - `url` override to `/{place_code}/` (e.g. `/nl-qfsbu/`)
- Four `_index.md` section-listing files:
  - `content/_index.md` — home page (title "Zasqua — Archivo Histórico")
  - `content/descripcion/_index.md` — "Descripciones"
  - `content/entidad/_index.md` — "Entidades"
  - `content/lugar/_index.md` — "Lugares"
  - each has minimal YAML front matter followed by an HTML-comment narrative-header + Version footer (placed after the front matter so Hugo's front-matter parser accepts it)

## Verification results

- `hugo config` exits 0 and reports the two module mounts and `build.buildstats.enable = true`
- `python3 -c "import yaml; yaml.safe_load(open('data/ui.yaml'))"` exits 0; 15 top-level keys match `src/_data/ui.js` exactly
- `js-yaml` deep-diff between `data/ui.yaml` and `src/_data/ui.js` reports zero differences (keys and values identical)
- `hugo --quiet` with no layouts — exit 0, zero parse errors; only WARN messages about missing layout files (expected — Plan 13-04 provides them)
- Smoke build with a throwaway one-line `layouts/_default/{single,list}.html` — **191,733 pages emitted** at the flat-code URL scheme:
  - sample descriptions: `public/co-ahjci-mfc-007-006/index.html`, `public/co-ahjci-mfc-007-001/index.html`
  - sample entities: `public/ne-uaq2e/index.html`, `public/ne-msp6v/index.html`
  - sample places: `public/nl-7sqmn/index.html`, `public/nl-as3be/index.html`
  - zero per-record pages under `public/descripcion/`, `public/entidad/`, `public/lugar/` — only the section landing pages sit there (correct)
- Titles and params flow through correctly — sampled page content includes full Spanish titles (e.g. "Camilo E. López y Ángel E. Torres contra los demás comuneros, juicio de división de los predios Madre Vieja, Santa Rosa y Pindaza") and the flat-code identifier in `.Params.reference_code`
- Invariant I5 (no stub markdown): `find content -name '*.md' -not -name '_index.md' | wc -l` = 0
- Invariant I6 (no large files under `data/`): `find data -size +1M` = empty

## Deviations from plan

### 1. Descriptions adapter uses `resources.Match`, not `resources.Get` on a single file

**Found during:** reading required context before Task 2
**Issue:** The plan's frontmatter and `<interfaces>` block call for `resources.Get "hugo-data/descriptions.json"` on a single unified file. That pattern pre-dates the Plan 13-02 sharding pivot and is incompatible with it — no unified `descriptions.json` exists, and regenerating one would re-introduce V8's 512 MiB max-string-length OOM that Plan 13-02 architecturally removed.
**Fix:** The descriptions adapter uses `resources.Match "hugo-data/descriptions/*.json"` to glob the shard directory, iterates the resulting resources, and calls `transform.Unmarshal` per shard. Filenames are not hard-coded (they are opaque zero-padded indices).
**Justification:** Three authoritative documents required this route: `.planning/phases/13-hugo-foundation/.continue-here.md` (the "BLOCKING CONSTRAINTS" block), `13-02-SUMMARY.md`'s "Forward pointer for Plan 13-03", and the V8 architectural ceiling itself. The plan frontmatter was stale by three commits.
**Classification:** Rule 3 (unblocker) — the documented pattern cannot work because the file it references cannot exist.
**Files modified:** `content/descripcion/_content.gotmpl`
**Commit:** `d384607`

### 2. Added `.hugo_build.lock` to `.gitignore`

**Found during:** post-Task 2 verification
**Issue:** Hugo writes `.hugo_build.lock` at the project root on every build; it is a runtime lock, not a source artefact, and was appearing as untracked after every smoke build.
**Fix:** Added the lock file to `.gitignore` alongside the other Hugo outputs (`public/`, `resources/_gen/`).
**Classification:** Rule 2 (auto-add missing critical functionality — keeps the repository clean across builds; matches Hugo community convention).
**Files modified:** `.gitignore`
**Commit:** `d384607`

### 3. Two commits instead of one

**Found during:** execute-plan protocol
**Issue:** Success criterion 6 ("Single commit with message `phase 13-03: hugo scaffold and content adapters`") conflicts with the GSD execute-plan rule "commit atomically per task".
**Fix:** Two commits — `010e947` (Task 1: hugo.toml + ui.yaml + .gitignore) and `d384607` (Task 2: content adapters + section listings + lock-file ignore). Same deviation shape as Plan 13-02.
**Classification:** Rule 2 (protocol conformance — atomic commits are more reviewable).

### 4. Per-page params include every top-level field

**Found during:** Task 2 authoring
**Issue:** The plan's `<interfaces>` lists only a curated subset of params fields. But Phase 14's templates will want access to the full ISAD(G) record on every page (scope_content, access_conditions, notes, publication metadata, etc.) and having to re-enrich to add fields later means re-running `generate-content.js` and re-running a 28-second adapter pass.
**Fix:** The descriptions adapter now includes every non-ancillary top-level field in the params dict (still omitting the nested `repository.root_descriptions` sub-tree, which is self-referential and not needed at the page level). Entities and places likewise include every top-level field.
**Classification:** Rule 2 (auto-add missing critical functionality — Phase 14 will need these; expanding now costs nothing).

## Note on the D-22 override

CONTEXT.md's D-22 originally said "`hugo_stats.json` is explicitly not excluded from `.gitignore` — Tailwind v4 reads it to drive JIT content detection". Plan 13-03 (per RESEARCH.md Pitfall 2) adopted the stronger `module.mounts` pattern instead: `hugo_stats.json` is mounted into `assets/notwatching/hugo_stats.json`, which Tailwind's `@source` directive can read via Hugo's asset pipeline regardless of `.gitignore` state. This is the officially-recommended Hugo + Tailwind v4 pattern and is robust against a future developer reflexively gitignoring `hugo_stats.json`. The `.gitignore` exclusion is preserved as a secondary defence (no `hugo_stats.json` line), but the mount is the primary mechanism.

## Forward pointer for Plan 13-04

Plan 13-04 adds:
- `layouts/_default/baseof.html` (base template with `<head>` + `<body>` scaffolding)
- `layouts/_partials/css.html` invoking `css.TailwindCSS` per RESEARCH.md Pattern 2
- `layouts/_default/single.html` and `list.html` — minimal smoke-test layouts that read `.Params.*` from the adapters and `.Site.Data.ui.*` for UI strings
- `assets/css/main.css` ported from `src/css/main.css` (with the `@source "hugo_stats.json"` Tailwind v4 directive)
- relocation of `src/js/`, `src/img/`, `src/vendor/tify/` to their Hugo-canonical locations (`assets/js/`, `static/img/`, `static/vendor/tify/`) per D-02

The adapters are ready — Plan 13-04 just needs templates that read `.Title` and `.Params.*`, nothing more complex.

## Self-Check: PASSED

- `hugo.toml` — FOUND
- `data/ui.yaml` — FOUND (YAML parses, 15 top-level keys match `src/_data/ui.js`)
- `content/descripcion/_content.gotmpl` — FOUND (uses `resources.Match`, has `try`/`.Err`/`errorf`, url override to `/{reference_code}/`)
- `content/entidad/_content.gotmpl` — FOUND (uses `resources.Get`, has `try`/`.Err`/`errorf`, url override to `/{entity_code}/`)
- `content/lugar/_content.gotmpl` — FOUND (uses `resources.Get`, has `try`/`.Err`/`errorf`, url override to `/{place_code}/`)
- `content/_index.md`, `content/descripcion/_index.md`, `content/entidad/_index.md`, `content/lugar/_index.md` — all FOUND
- `.gitignore` — MODIFIED (added `resources/_gen/`, `.hugo_build.lock`; `hugo_stats.json` confirmed absent)
- commit `010e947` — FOUND in `git log`
- commit `d384607` — FOUND in `git log`
- `hugo config` exit 0 — VERIFIED
- `hugo config mounts` reports `hugo_stats.json → assets/notwatching/hugo_stats.json` — VERIFIED
- smoke build emits 191,733 pages at flat-code URLs — VERIFIED
