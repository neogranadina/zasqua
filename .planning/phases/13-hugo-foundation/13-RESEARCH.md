# Phase 13: Hugo Foundation - Research

**Researched:** 2026-04-16
**Domain:** Hugo Extended static site generation, build-time JSON enrichment, Tailwind CSS v4 pipeline
**Confidence:** HIGH (verified against official Hugo docs, Tailwind docs, npm registry, and canonical source code at `eleventy.config.js`, `precompute-links.js`, `src/_data/*`)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (from 13-CONTEXT.md)

**Project layout and Eleventy cut-over:**
- D-01: Hard cut-over — Phase 13 removes Eleventy (`eleventy.config.js`, `src/_data/`, `src/_layouts/`, `src/_includes/`, `src/*.njk`, `src/explorar/*.njk`, `_site/` deleted; `@11ty/eleventy` dropped from `package.json`).
- D-02: Client-side assets relocate in Phase 13: `src/js/` → `assets/js/`, `src/css/main.css` → `assets/css/main.css`, `src/vendor/tify/` → `static/vendor/tify/`, `src/img/` → `static/img/`.
- D-03: Phase 13 lands with assets in Hugo locations so Phase 14 templates have zero file-moving work.
- D-04: `src/_data/ui.js` content moves to Hugo `data/ui.yaml` (small UI-string file is fine on `.Site.Data`; the prohibition applies to large archival datasets).
- D-05: No fallback to Eleventy if Phase 14 hits a Hugo blocker — git history is the rollback path.

**Enrichment pipeline architecture:**
- D-06: Two-step pipeline. `precompute-links.js` stays as-is; `generate-content.js` runs after it.
- D-07: `generate-content.js` consumes `data/descriptions.json`, `entities.json`, `places.json`, `repositories.json`, and precompute outputs; writes `assets/hugo-data/{descriptions,entities,places}.json`.
- D-08: Port ancestor-walking + repository attachment from `src/_data/descriptions.js`; port entity/place enrichment from `src/_data/entities.js` and `places.js`. Eleventy data loaders deleted after port.
- D-09: Further refactor into shared `scripts/enrichment/*.js` modules is **deferred** to after Phase 14.

**Denormalisation depth:**
- D-10: Description records carry inline `ancestor_chain`, `date_formatted`, full `repository` object, `entity_links[{entity_code, display_name, role_label}]`, `place_links[{place_code, display_name, role_label}]`.
- D-11: Full entity/place records live only in `entities.json`/`places.json`.
- D-12: Entity/place records include pre-computed `display_name`, `date_formatted` range, `_linked_count`, etc. Generator should be pluggable (exact field list finalised during Phase 14 planning).

**DEV_LIMIT:**
- D-13: **DEV_LIMIT dropped from Phase 13 scope.** Hugo full builds are ~3-5 min with <1 GB memory — full local builds viable without subset mode.
- D-14: ROADMAP success criteria 1 & 5, REQUIREMENTS ENRICH-05, and STATE.md DEV_LIMIT bullet to be removed before planning (see Follow-ups in CONTEXT.md).

**Pre-computed output contract:**
- D-15: `date_formatted` matches the existing Eleventy `formatDate` output byte-for-byte. Port `formatDateNarrative` from `eleventy.config.js:37-64` verbatim.
- D-16: Lowercase Colombian Spanish month names: `enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre`.
- D-17: Port `numberFormat` (thousands with `.` separator) as helper.

**URL permalinks (flat-code scheme):**
- D-18: Content adapters override permalink to strip the content-section prefix — descriptions at `/{reference_code}/`, entities at `/{entity_code}/` (e.g. `/ne-xxxxxx/`), places at `/{place_code}/` (e.g. `/nl-xxxxxx/`).
- D-19: Repositories publish at `/{repo_code}/` — implementation approach (small adapter vs. static content) picked in Phase 14.
- D-20: Explorer list pages `/entidades/`, `/lugares/`, `/buscar/` driven by standalone page templates in Phase 14.

**Hugo data-loading pattern:**
- D-21: Large JSON loaded inside content adapters via `resources.Get "hugo-data/*.json" | transform.Unmarshal`. NEVER placed under `data/` (would trigger `.Site.Data` OOM).
- D-22: `hugo_stats.json` is **not** excluded from `.gitignore` — Tailwind v4 reads it to drive JIT content detection. (See research below — this is the simplest path; the module-mount workaround is an alternative.)
- D-23: Hugo Extended required (`hugo version` output contains `+extended`). Plan must include a local install check.

**Tailwind CSS wiring:**
- D-24: `@tailwindcss/cli ^4.2.2` + `tailwindcss ^4.2.2` already in `package.json`. Wire into Hugo Pipes via `css.TailwindCSS`. Entry CSS stays at `assets/css/main.css`.
- D-25: No PostCSS config file churn — Tailwind v4 CLI handles processing; existing `src/css/main.css` ports as-is.

### Claude's Discretion
- Exact shape of entity and place records in `entities.json`/`places.json` (beyond `display_name`, `role_label`) — leave generator pluggable.
- Whether the Phase 13 smoke-test page is a description, entity, or place detail — description recommended (largest dataset, most plumbing).
- `hugo.toml` structural choices (module mounts, output formats beyond HTML, minify options) — Hugo defaults where possible, document exceptions.
- Directory layout for content-adapter companion files (shared partials in `layouts/partials/`) — follow Hugo community conventions.

### Deferred Ideas (OUT OF SCOPE)
- Shared enrichment modules (`scripts/enrichment/*.js`) — revisit after Phase 14.
- Representative-sample DEV_LIMIT — not needed in Phase 13.
- CI smoke-test subset build — Phase 15 concern if CI time becomes a problem.
- Hugo custom Go function for `formatDate` — not needed; Node pre-computes it.
- Diff-based rendering (skip pages whose data hasn't changed) — future optimisation phase.
- Update `.planning/codebase/*.md` intel docs — not Phase 13 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HUGO-01 | Hugo Extended builds all 192K pages without exceeding GitHub Actions memory limits | Verified: content adapters iterate via `resources.Get` + `transform.Unmarshal` scale linearly (Hugo community reports 100K+ pages with ~1.2 GB RAM peak on modest hardware); avoids the 7 GB Eleventy heap bottleneck |
| HUGO-02 | Content adapters generate pages from pre-enriched JSON — no stub markdown files | `_content.gotmpl` adapter pattern is the canonical Hugo mechanism for this (introduced in v0.126.0); verified example in gohugo.io docs |
| HUGO-04 | Use `resources.Get` + `transform.Unmarshal`, never `.Site.Data` | Standard stack section documents the exact invocation pattern with error handling via `try`/`errorf` |
| ENRICH-01 | Ancestor breadcrumb chains pre-computed | Ancestor-walking logic already exists at `src/_data/descriptions.js:53-66`; port verbatim |
| ENRICH-02 | Pre-computed Spanish narrative dates (ranges included) | `formatDateNarrative` at `eleventy.config.js:37-64` is the byte-for-byte reference; D-15 locks port |
| ENRICH-03 | Entity/place links enriched with display names + role labels | `desc-entity-lookup.json` already carries `{code, display_name, entity_type, roles}` from `precompute-links.js`; `ui.js` `roles` map provides `role_label` translation |
| ENRICH-04 | Enriched JSON written to `assets/hugo-data/` | Canonical Hugo location for resource-loaded JSON (must be under `assets/`, not `data/`) |
</phase_requirements>

## Summary

Hugo Extended ≥ v0.160.x provides everything needed for this phase: content adapters (`_content.gotmpl`, introduced v0.126.0), `resources.Get` + `transform.Unmarshal` for memory-bounded JSON loading from `assets/`, and `css.TailwindCSS` (≥ v0.128, stable in recent releases) that invokes the Tailwind v4 CLI. The architectural win over Eleventy is that content adapters do not materialise all pages in a single data graph — each page dict is handed to Hugo's render pipeline and released, which is how the community reports linear scaling past 100K pages with ~1 GB RAM. The enrichment script is a straightforward Node port of four existing Eleventy data loaders (`descriptions.js`, `entities.js`, `places.js`) plus two filters (`formatDateNarrative`, `numberFormat`) from `eleventy.config.js`; no new algorithms are required.

Two landmines deserve explicit flagging in the plan: (1) `resources.Get` only resolves paths under `assets/` or directories mounted to `assets/` via `module.mounts`, so `assets/hugo-data/*.json` is the canonical location — placing files under `data/` triggers `.Site.Data` semantics and the OOM that motivated this migration; (2) Tailwind v4's built-in `.gitignore` respect means `hugo_stats.json` is invisible if gitignored, and the official workaround is to mount it to `assets/notwatching/hugo_stats.json` and `@source` it from CSS — this deserves a belt-and-braces verification in the plan (both the `.gitignore` exclusion AND the mount+source strategy are valid; pick one and verify the generated Tailwind CSS contains classes used only in the rendered HTML).

**Primary recommendation:** Structure the phase as six task clusters — (1) repo cleanup (delete Eleventy, move assets), (2) enrichment script (port four data loaders and two filters), (3) Hugo scaffold (`hugo.toml`, three content adapters, one baseof template, one smoke-test layout), (4) Tailwind v4 wiring (module mount + CSS `@source` + `css.TailwindCSS` partial), (5) client-runtime data wiring (decide where `data/children/`, `data/entity-links/`, `data/place-links/`, graph JSON land so client JS still finds them at current URLs), (6) build orchestration (rewrite `build.sh` and three npm scripts). The smoke-test is a description detail page — largest dataset exercises the most plumbing.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JSON export from backend | Backend / B2 | — | Already owned by `zasqua-backend-dev` export task; Phase 13 only consumes its outputs |
| Link sharding (per-entity, per-place JSON files, graph, lookup files) | Build-time Node (`precompute-links.js`) | — | Existing script, runs unchanged — outputs consumed both by `generate-content.js` and by client JS at runtime |
| Denormalisation / enrichment (ancestor_chain, date_formatted, display_name, role_label) | Build-time Node (`generate-content.js`) | — | Hugo has no equivalent of `Intl.DateTimeFormat` with Colombian narrative conventions; pre-compute in Node then hand Hugo a flat object |
| Page generation from JSON | Hugo content adapter (`_content.gotmpl`) | — | The whole point of migrating to Hugo — avoids the Eleventy data-graph memory profile |
| CSS compilation | Tailwind v4 CLI (invoked from Hugo Pipes via `css.TailwindCSS`) | Hugo Pipes (fingerprint, minify) | `css.TailwindCSS` is the current official integration; standalone tailwindcss binary (currently at `./tailwindcss`) is deleted |
| Static asset serving (TIFY, images, runtime JSON shards) | Hugo `static/` passthrough | — | No processing needed; preserves existing URLs for client JS |
| Search index (Pagefind) | Post-build Node | — | Unchanged; deferred to Phase 15 |
| R2 upload | GitHub Actions | — | Phase 15 concern |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hugo` (Extended) | 0.160.1 | Static site generator — replaces Eleventy | [VERIFIED: github.com/gohugoio/hugo/releases/tag/v0.160.1] Latest stable (2026-04-08). Must be Extended variant for Sass/WebP; `hugo version` output must contain `+extended`. Content adapters introduced v0.126.0, `css.TailwindCSS` stable from v0.128.0+. |
| `@tailwindcss/cli` | ^4.2.2 | Tailwind v4 CLI invoked by Hugo's `css.TailwindCSS` | [VERIFIED: npm view @tailwindcss/cli version → 4.2.2] Already in `package.json`. v4 uses automatic content detection + `@source` directives in CSS (no `tailwind.config.js` content array). |
| `tailwindcss` | ^4.2.2 | Tailwind v4 runtime (peer of `@tailwindcss/cli`) | [VERIFIED: npm view tailwindcss version → 4.2.2] Already in `package.json`. |
| Node.js | 22.x | Runs `precompute-links.js` and `generate-content.js` | [VERIFIED: `.nvmrc` → 22; node --version → v22.17.0] Matches CI config. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hugo-extended` Homebrew cask / GitHub tarball | same as hugo | Dev-machine install | `brew install hugo` currently installs Extended by default on macOS. CI uses `peaceiris/actions-hugo@v3` with `extended: true` (Phase 15 concern). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resources.Get` + `transform.Unmarshal` | `.Site.Data` (files in `data/`) | **Rejected in CONTEXT.md D-21.** Hugo loads all of `data/` into memory at build start and keeps it for the entire build — exactly the OOM profile we're escaping. `resources.Get` is read on demand from within the adapter. |
| `css.TailwindCSS` (Hugo's integrated function) | Standalone `./tailwindcss` binary (currently in repo) | **Locked by D-24.** Hugo ≥ v0.146 added a PATH security patch that blocks standalone binary discovery in some configs; the npm-based CLI is now the officially-documented path. Standalone binary is also a 76 MB file checked into git — deleting it is a cleanup win. |
| Content adapters | Stub markdown files generated by Node (`content/descripcion/{code}.md`) | **Rejected in CONTEXT.md D-21 / PROJECT.md.** 106K markdown stubs on disk triggers Hugo's own OOM profile because every file becomes a page with a data graph entry. Content adapters let Hugo iterate the JSON once and synthesise pages without on-disk files. |
| Hugo's `js.Build` for client JS | Hugo's `resources.Get` + `resources.Minify` for existing hand-written JS | Not explored further — out of scope; JS moves from `src/js/` to `assets/js/` (D-02) but how it's served (passthrough vs. bundled) is a Phase 14 decision. Recommend Phase 13 just does `resources.Get "js/..." | fingerprint` to keep it simple. |

**Installation (dev-machine prerequisites — not code changes):**
```bash
brew install hugo            # installs Extended on modern macOS
hugo version                 # MUST contain "+extended"
npm install                  # already-declared deps install
```

**Version verification (at planning time):**
- `hugo version` on CI (Phase 15 concern, but worth noting in Phase 13 plan as a fail-fast CI step) — should match the version declared in the Phase 15 workflow
- `npm view @tailwindcss/cli version` → **4.2.2** (verified 2026-04-16 via `npm view` CLI)
- `npm view tailwindcss version` → **4.2.2** (verified 2026-04-16)
- Latest Hugo at time of research: **0.160.1** (verified via GitHub releases 2026-04-16). Minimum required: v0.146.0 for the PATH security patch, v0.128.0+ for stable `css.TailwindCSS`. Plan should pin to `>= 0.160.0`.

## Architecture Patterns

### System Architecture Diagram

```
    ┌────────────────────────────────────────────────────────────┐
    │ B2 exports (backend-produced, downloaded at build start)   │
    │   descriptions.json (208 MB)  entities.json (35 MB)        │
    │   places.json (2.6 MB)        repositories.json            │
    │   entity_links.json           place_links.json             │
    └────────────────────────────────────────────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────┐
          │ scripts/precompute-links.js          │
          │ (UNCHANGED — existing script)         │
          │                                      │
          │ Writes to data/:                     │
          │   entity-links/{code}.json shards    │
          │   place-links/{code}.json shards     │
          │   entity-index.json, place-index.json│
          │   desc-entity-lookup.json            │
          │   desc-place-lookup.json             │
          └──────────────────────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────┐
          │ scripts/generate-content.js (NEW)    │
          │                                      │
          │ Consumes data/*.json + precompute    │
          │ outputs; applies enrichment:         │
          │   • ancestor_chain walk              │
          │   • date_formatted (Spanish narrative)│
          │   • display_name, role_label         │
          │   • repository inline-attach         │
          │   • _linked_count                    │
          │                                      │
          │ Writes to assets/hugo-data/:         │
          │   descriptions.json (enriched)       │
          │   entities.json    (enriched)        │
          │   places.json      (enriched)        │
          └──────────────────────────────────────┘
                             │
                             ▼
    ┌────────────────────────────────────────────────────────────┐
    │ hugo --minify                                               │
    │                                                             │
    │  ┌───────────────────────────────────────────────────────┐ │
    │  │ content/descripcion/_content.gotmpl                   │ │
    │  │   resources.Get "hugo-data/descriptions.json"         │ │
    │  │   | transform.Unmarshal                               │ │
    │  │   → range → AddPage with url="/{reference_code}/"     │ │
    │  ├───────────────────────────────────────────────────────┤ │
    │  │ content/entidad/_content.gotmpl    (entities)         │ │
    │  │ content/lugar/_content.gotmpl      (places)           │ │
    │  └───────────────────────────────────────────────────────┘ │
    │                                                             │
    │  layouts/_default/baseof.html → one smoke-test template     │
    │  layouts/_partials/css.html   → css.TailwindCSS invocation  │
    │                                                             │
    │  Static passthrough from static/:                           │
    │    vendor/tify/, img/, (runtime data shards — see Q1)       │
    └────────────────────────────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ public/ (build output)│
                  │  ~192K HTML pages    │
                  │  css/*, js/*, assets │
                  └──────────────────────┘
                             │
                             ▼
             (Pagefind indexing — Phase 15)
             (R2 diff upload      — Phase 15)
```

### Recommended Project Structure

```
zasqua-frontend-dev/
├── hugo.toml                    # site config (D-22 build.buildStats, module mounts)
├── package.json                 # @tailwindcss/cli, tailwindcss, (drop @11ty/eleventy)
├── build.sh                     # rewritten: download → precompute → generate-content → hugo
├── scripts/
│   ├── precompute-links.js      # UNCHANGED
│   ├── generate-content.js      # NEW — port of src/_data/descriptions.js, entities.js, places.js + formatDateNarrative + numberFormat
│   ├── places-to-geojson.js     # UNCHANGED
│   ├── upload-to-r2.py          # UNCHANGED (Phase 15 rewrites)
│   └── check-css-tokens.sh      # UNCHANGED
├── assets/                      # Hugo-managed (Pipes target)
│   ├── css/main.css             # ported from src/css/main.css
│   ├── js/                      # ported from src/js/
│   └── hugo-data/               # written by generate-content.js — LARGE JSON lives here (resources.Get)
│       ├── descriptions.json
│       ├── entities.json
│       └── places.json
├── content/
│   ├── descripcion/_content.gotmpl   # adapter for descriptions
│   ├── entidad/_content.gotmpl       # adapter for entities
│   └── lugar/_content.gotmpl         # adapter for places
├── data/                        # Hugo-managed; small UI lookups only (NOT large JSON — D-21)
│   └── ui.yaml                  # ported from src/_data/ui.js (D-04)
├── layouts/
│   ├── _default/
│   │   └── baseof.html          # minimal base
│   ├── descripcion/
│   │   └── single.html          # smoke-test template
│   └── _partials/
│       └── css.html             # css.TailwindCSS invocation per Hugo docs example
├── static/                      # passthrough
│   ├── vendor/tify/             # ported from src/vendor/tify/
│   ├── img/                     # ported from src/img/
│   └── data/                    # OPEN QUESTION — see Runtime State Inventory
├── data/                        # build-time downloads (gitignored per current .gitignore)
│   ├── descriptions.json        # raw B2 export
│   ├── entities.json
│   ├── places.json
│   ├── repositories.json
│   ├── entity_links.json
│   ├── place_links.json
│   ├── children/                # produced by precompute or backend
│   ├── entity-links/            # produced by precompute-links.js
│   ├── place-links/             # produced by precompute-links.js
│   └── *.json lookups
└── (NO src/, NO eleventy.config.js, NO _site/, NO tailwindcss binary)
```

**Note:** Hugo's `data/` directory and the repo's existing build-time `data/` directory are both named `data` — but Hugo's `data/` is at the project root and is loaded into `.Site.Data`. Our existing `data/` directory at the project root holds large JSON exports and is NOT what Hugo scans — **we must either rename the build-time directory or use Hugo's config to not treat files in `data/` as site data**. Hugo's default is to scan `data/` for `.yaml`, `.json`, `.toml`, `.xml` — which would catch our 208 MB `descriptions.json`. **This is a landmine.** Options: (a) rename existing `data/` to `raw/` or `exports/` and update all scripts, (b) use `module.mounts` to remap, (c) use `ignoreFiles` / `build.buildStats` exclusions. The plan must address this explicitly. See Common Pitfalls → "data/ directory collision".

### Pattern 1: Content Adapter with `resources.Get`

**What:** Dynamically create pages from enriched JSON without stub markdown files.
**When to use:** Large datasets (>1K pages) where on-disk markdown files would cause OOM or repo bloat.

**Example** (descriptions adapter — `content/descripcion/_content.gotmpl`):

```gotmpl
{{/*
  Source: https://gohugo.io/content-management/content-adapters/
  Verified 2026-04-16. Introduced Hugo v0.126.0.
*/}}
{{ $data := slice }}
{{ with try (resources.Get "hugo-data/descriptions.json") }}
  {{ with .Err }}
    {{ errorf "[descripcion adapter] Unable to read hugo-data/descriptions.json: %s" . }}
  {{ else }}
    {{ $data = .Value | transform.Unmarshal }}
  {{ end }}
{{ end }}

{{ range $data }}
  {{ $params := dict
      "reference_code" .reference_code
      "parent_reference_code" .parent_reference_code
      "repository_code" .repository_code
      "repository" .repository
      "ancestor_chain" .ancestor_chain
      "date_formatted" .date_formatted
      "entity_links" .entity_links
      "place_links" .place_links
      "description_level" .description_level
      /* (plus ISAD(G) fields — finalised Phase 14) */
  }}
  {{ $page := dict
      "kind" "page"
      "path" .reference_code                     /* hugo's internal path — not the URL */
      "title" .title
      "params" $params
      "content" (dict "mediaType" "text/html" "value" "")
  }}
  /* D-18: strip the /descripcion/ section prefix — use the url front matter override */
  {{ $page = merge $page (dict "url" (printf "/%s/" .reference_code)) }}
  {{ $.AddPage $page }}
{{ end }}
```

**Critical details:**
- `try (resources.Get ...)` is Hugo's error-capturing pattern — the plain `resources.Get` returns `nil` silently on failure, which would produce an empty build without any error. The `try`/`.Err`/`errorf` trio surfaces the failure.
- `.Value | transform.Unmarshal` on a resource — in newer Hugo this is documented as piping the resource directly (`. | transform.Unmarshal`). Both forms work; the plan can pick one style and stick to it.
- Setting `url` in the page dict overrides the section prefix entirely (verified via Hugo front-matter docs — `url` "overrides the entire path"). This is the mechanism for D-18.
- `content.mediaType: "text/html"` with empty value means Hugo uses the layout template to render; no markdown parsing. Saves parser time across 106K pages.

### Pattern 2: Tailwind v4 Partial with `css.TailwindCSS`

**What:** Hugo-integrated Tailwind v4 compilation with fingerprinting and dev/prod differentiation.
**When to use:** Default choice — Hugo docs recommend this over standalone CLI invocation.

**Example** (`layouts/_partials/css.html`):

```gotmpl
{{/*
  Source: https://gohugo.io/functions/css/tailwindcss/
  Verified 2026-04-16. Requires @tailwindcss/cli ≥ v4.0 installed via npm.
*/}}
{{ with resources.Get "css/main.css" }}
  {{ $opts := dict "minify" (not hugo.IsDevelopment) }}
  {{ with . | css.TailwindCSS $opts }}
    {{ if hugo.IsDevelopment }}
      <link rel="stylesheet" href="{{ .RelPermalink }}">
    {{ else }}
      {{ with . | fingerprint }}
        <link rel="stylesheet"
              href="{{ .RelPermalink }}"
              integrity="{{ .Data.Integrity }}"
              crossorigin="anonymous">
      {{ end }}
    {{ end }}
  {{ end }}
{{ end }}
```

**Invocation** (in `layouts/_default/baseof.html`):
```gotmpl
<head>
  {{ with (templates.Defer (dict "key" "global")) }}
    {{ partial "css.html" . }}
  {{ end }}
</head>
```

### Pattern 3: `hugo.toml` for Tailwind v4 + Large-JSON Data Loading

```toml
baseURL = "https://zasqua.org/"
languageCode = "es-CO"
defaultContentLanguage = "es"
title = "Zasqua — Archivo Histórico"

[build]
  writeStats = true                 # D-22: required for Tailwind content detection
  [build.buildStats]
    enable = true                   # v4-specific; more granular than writeStats

# Official Hugo/Tailwind recommended pattern: mount hugo_stats.json inside assets/
# so .gitignore doesn't hide it from Tailwind. See Common Pitfalls for rationale.
[module]
  [[module.mounts]]
    source = "assets"
    target = "assets"
  [[module.mounts]]
    source = "hugo_stats.json"
    target = "assets/notwatching/hugo_stats.json"
    disableWatch = true             # prevents rebuild loops

  [[build.cachebusters]]
    source = 'assets/notwatching/hugo_stats\.json'
    target = 'css'
  [[build.cachebusters]]
    source = '(postcss|tailwind)\.config\.js'
    target = 'css'

[markup]
  [markup.goldmark.renderer]
    unsafe = true                   # needed if any description content ever includes HTML

# Disable Hugo's sitemap? (TODO — at 192K pages the default XML sitemap may itself be large)
# [sitemap]
#   changefreq = 'monthly'

# NO [permalinks] section needed — D-18 uses per-page url override inside adapters.

# Other Hugo directories at their defaults:
#   contentDir = "content"     (where the three _content.gotmpl adapters live)
#   dataDir    = "data"        ← COLLISION with existing data/ export directory — see Common Pitfalls
```

### Pattern 4: Entry CSS file (`assets/css/main.css`)

```css
/* Tailwind v4 directive-based config — no tailwind.config.js needed */
@import "tailwindcss";

/* Required for Tailwind v4 to pick up Hugo's class usage stats
   (because automatic content detection doesn't find the generated HTML) */
@source "hugo_stats.json";

/* Existing design-token CSS ports as-is from src/css/main.css */
/* (body + custom properties + utility classes currently in use) */
```

### Anti-Patterns to Avoid

- **Placing large JSON under `data/`:** Triggers `.Site.Data` loading — 208 MB descriptions.json in-memory at build start. This is literally the OOM profile we're migrating away from. The existing root-level `data/` directory is an export staging area and MUST NOT be what Hugo treats as its data directory (see Common Pitfalls).
- **Stub markdown files:** Do not generate `content/descripcion/{reference_code}.md` files. 106K markdown files on disk is slow for git, slow for Hugo (each becomes a page in Hugo's page graph), and re-introduces the memory profile.
- **Forgetting `+extended`:** Plain `hugo` build will fail on CSS transpilation without an obvious error — Hugo falls back to treating CSS as a passthrough. `hugo version | grep "+extended"` must be a fail-fast precondition in every build script.
- **Using `resources.Get` on files outside `assets/`:** `resources.Get` only resolves paths relative to `assets/` (or module-mounted targets to `assets/`). Putting files under `static/hugo-data/` will silently return `nil`.
- **Hand-rolling date formatting in Go templates:** Hugo's `time.Format` does not produce lowercase Colombian Spanish narrative output ("15 de marzo de 1723"). Pre-compute in Node (D-15) — this is non-negotiable per locked decision and the existing `formatDateNarrative` function is already correct and battle-tested.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV/JSON → page generation | A Node script that writes 106K markdown stubs | Hugo content adapters (`_content.gotmpl`) | Scales linearly, no on-disk pollution, Hugo-native |
| Tailwind CSS compilation | Invoking `./tailwindcss` binary from build.sh | `css.TailwindCSS` from within Hugo | Official path, handles dev/prod modes, integrates with Hugo Pipes fingerprint/minify |
| Spanish date narrative format | Re-implementing in Go templates | `formatDateNarrative` port from `eleventy.config.js:37-64` (D-15) | Already correct; reinventing loses fidelity |
| Thousands separator | Re-implementing in Go templates | Port `numberFormat` from `eleventy.config.js:68-71` (D-17) | Same reason |
| Ancestor-chain walk for breadcrumbs | New algorithm | Port from `src/_data/descriptions.js:53-66` | Battle-tested; three `.planning/codebase` references confirm correctness |
| Role label translation | Hugo template lookups | Pre-compute in Node via `ui.js` `roles` map (D-10 `role_label`) | Keeps Hugo templates dumb; one fewer `.Site.Data.ui.roles` lookup per link × many links |
| Repository attachment | Hugo template joins | Inline full `repository` object on each description (D-10) | Eliminates a per-page Hugo lookup |

**Key insight:** The migration's whole thesis is "do all computation in Node at build start, hand Hugo a flat object graph with zero lookups remaining, then let Hugo just iterate and emit HTML." Every piece of computation that stays in a Go template is a risk for OOM or slowness at 192K pages.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — this is a static site build; nothing is persistent across builds except B2 exports (owned by backend, not touched here) | None |
| Live service config | None — no runtime services | None |
| OS-registered state | None | None |
| Secrets/env vars | `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY` — already used by `build.sh`. No change in Phase 13. | None |
| Build artifacts | **CRITICAL**: `./tailwindcss` (76 MB standalone binary at repo root) — D-24 locks deletion. `_site/` directory (Eleventy output) — D-01 locks deletion. `node_modules/@11ty/eleventy` — removed when `@11ty/eleventy` is dropped from package.json and `npm install` runs. | Delete `./tailwindcss`, delete `_site/`, run `npm install` after package.json change (lockfile regen). |
| **Rename / refactor state** | D-01 removes Eleventy artefacts: `eleventy.config.js`, `src/_data/`, `src/_layouts/`, `src/_includes/`, `src/*.njk`, `src/explorar/*.njk`. D-02 relocates `src/js/` → `assets/js/`, `src/css/main.css` → `assets/css/main.css`, `src/vendor/tify/` → `static/vendor/tify/`, `src/img/` → `static/img/`. The `src/` directory is fully empty after both and should be removed. | Plan must include a single task that verifies `src/` is empty before deleting it. |
| **URL preservation** | The existing flat-code scheme (`/{reference_code}/`, `/ne-xxxxxx/`, `/nl-xxxxxx/`, `/co-ahr/`, `/entidades/`, `/lugares/`, `/buscar/`) is live at zasqua.org. Phase 13 outputs a subset build; Phase 14 validates full coverage. But D-18 must be implemented correctly in Phase 13 or Phase 14 inherits a broken URL scheme. | Verification step in plan: after smoke-test build, inspect `public/` and confirm the expected permalink structure (e.g., `public/{reference_code}/index.html`, not `public/descripcion/{reference_code}/index.html`). |
| **Client-side runtime data paths** | `tree.js`, explorer JS, entity/place detail JS expect data at `/data/children/*.json`, `/data/entity-links/*.json`, `/data/place-links/*.json`, `/data/entity-index.json`, `/data/place-index.json`, graph JSON, lookup files. These are produced by `precompute-links.js` into `./data/` and served by Eleventy's passthrough copy from `data/*` to `_site/data/*`. | **OPEN QUESTION** (see below) — how does Hugo serve these? Options: (1) `precompute-links.js` writes to `static/data/` directly; (2) add a module mount or `ignoreFiles` to make Hugo passthrough-copy `data/children/` etc.; (3) rename the build-time export directory to avoid the `data/` collision. Recommend option 1 combined with renaming the export staging directory. |

## Common Pitfalls

### Pitfall 1: `data/` directory collision

**What goes wrong:** Hugo's default `contentDir = "content"`, `dataDir = "data"`. The repo's existing `data/` directory holds 208 MB `descriptions.json`, 35 MB `entities.json`, and other exports — downloaded at build time. If `hugo` runs in a directory with `data/descriptions.json`, Hugo loads it into `.Site.Data` and OOMs — the very failure we're migrating away from.

**Why it happens:** Hugo scans its `dataDir` on build start and makes every file accessible via `.Site.Data.{filename}`. There is no content filter; a 208 MB JSON file will be fully parsed and held.

**How to avoid:** Choose one of three strategies, make the plan pick ONE:
1. **Rename the export staging directory** from `data/` → `exports/` or `raw/`. Update `build.sh`, `precompute-links.js`, `scripts/places-to-geojson.js`, `scripts/generate-content.js` (new) to use the new name. Simplest and clearest. **Recommended.**
2. **Override `dataDir`** in `hugo.toml` (e.g. `dataDir = "hugo-data-dir"`) and move `ui.yaml` there. Leaves existing `data/` alone but fragments conceptual ownership of "data".
3. **Use `ignoreFiles` or `module.mounts` with exclusion patterns** to hide the big files from Hugo. Brittle — new files added to `data/` must be remembered to ignore.

**Warning signs:** Hugo build output shows `memory alloc: X GB` in the first 10 seconds; `ps aux | grep hugo` shows RSS > 3 GB before rendering starts; `hugo --templateMetrics` shows nothing because the build OOMs before templates run.

### Pitfall 2: `hugo_stats.json` invisible to Tailwind v4

**What goes wrong:** Tailwind v4 respects `.gitignore`. Hugo writes `hugo_stats.json` at the project root. If `hugo_stats.json` is in `.gitignore` (which is the natural thing to do — it's a generated file), Tailwind v4 **silently** ignores it — which means the Tailwind content scanner doesn't know which classes are actually used by the rendered HTML, so the generated CSS contains only classes Tailwind found by scanning CSS directly. The output is a skeletal stylesheet and the site looks broken.

**Why it happens:** Tailwind v4's content auto-detection was designed with Git-tracked content in mind; generated stats files are an edge case. The silent-skip is by design.

**How to avoid:** Use the officially-documented `module.mounts` workaround (shown in Pattern 3 above): mount `hugo_stats.json` → `assets/notwatching/hugo_stats.json` + reference it with `@source "hugo_stats.json"` in CSS. CONTEXT.md's D-22 mentions "not excluded from `.gitignore`" as an alternative — that also works but is less robust (a future dev with instinct to gitignore it will silently break Tailwind). The mount approach is preferred because it works regardless of `.gitignore`.

**Warning signs:** Built CSS is very small (< 10 KB); rendered pages display as unstyled HTML; browser devtools show class names on elements but no matching CSS rules; `grep "bg-burgundy" public/css/*.css` returns nothing despite the class being used.

### Pitfall 3: `resources.Get` silent nil

**What goes wrong:** If the path passed to `resources.Get` doesn't resolve (typo, file moved, wrong location), the function returns `nil` and the `{{ with }}` block silently doesn't execute. The adapter emits no pages and the build succeeds with a near-empty `public/` directory.

**Why it happens:** Hugo's error surfacing for resource functions is opt-in via `try`.

**How to avoid:** Always wrap in `{{ with try (resources.Get ...) }}{{ with .Err }}{{ errorf ... }}{{ else }}...{{ end }}{{ end }}`. This is shown in the canonical Hugo docs example and must be mandatory in our three adapters.

**Warning signs:** Hugo build exits 0; `public/` contains baseof-rendered shell pages but no per-record pages; `find public -name 'index.html' | wc -l` is orders of magnitude lower than expected.

### Pitfall 4: Hugo non-extended binary

**What goes wrong:** Plain `hugo` (non-extended) does not include LibSass, WebP, and — critically — can miss certain CSS-pipeline features. `css.TailwindCSS` technically runs on non-extended, but some Pipes functions (e.g. `resources.ToCSS` for Sass, `resources.Fingerprint` integrity calculation on ARM) behave differently. Also, Tailwind v4 emits modern CSS features that historically needed extended for any asset processing.

**Why it happens:** `brew install hugo` has installed Extended by default for several releases, but a CI runner using `peaceiris/actions-hugo@v3` without `extended: true` gets the smaller binary.

**How to avoid:** Fail-fast step in every build script: `hugo version | grep -q '+extended' || exit 1`. Plan must include this check both in Phase 13 `build.sh` and flag it for Phase 15 CI.

**Warning signs:** CSS output contains unresolved `@import` or weird Sass syntax in the output; `hugo version` shows "Hugo Static Site Generator" without `+extended`; CI logs show a subtle difference in asset output between local and CI.

### Pitfall 5: Content-adapter URL not overriding the section prefix

**What goes wrong:** D-18 requires `/{reference_code}/` URLs, not `/descripcion/{reference_code}/`. If the plan sets `path` in `AddPage` but not `url`, Hugo will use the section-prefixed path — breaking every existing URL.

**Why it happens:** `path` is Hugo's internal logical path (used for cross-references), not the output URL. The `url` front-matter field is what overrides the output URL.

**How to avoid:** Always set BOTH `path` (internal identifier) and `url` (output path) in the page dict passed to `AddPage`. Pattern 1 above shows the correct form. Add a verification step: after the smoke-test build, check that `public/{smoke-test-ref-code}/index.html` exists and `public/descripcion/{smoke-test-ref-code}/index.html` does not.

**Warning signs:** `public/descripcion/*/` directories exist; smoke-test URL in a browser 404s at `/co-ahr-0001/` but works at `/descripcion/co-ahr-0001/`.

### Pitfall 6: Date narrative mismatch on range formatting

**What goes wrong:** The existing `formatDateNarrative` treats `"YYYY-MM-DD .. YYYY-MM-DD"` as a range, splitting on `" .. "` (space dot dot space) and joining with `" – "` (en dash with spaces). A naive port using `" - "` (hyphen) or missing the space-padding changes every historical date range on the site.

**Why it happens:** The delimiter is easy to miss in a port.

**How to avoid:** D-15 is explicit: "byte-for-byte". The port should have a golden-file test with a set of known inputs and expected outputs. Suggested test inputs to verify:
- `"1723-03-15"` → `"15 de marzo de 1723"`
- `"1723-03"` → `"marzo de 1723"`
- `"1723"` → `"1723"`
- `"1723-03-15 .. 1725-12-01"` → `"15 de marzo de 1723 – 1 de diciembre de 1725"`
- `""` → `""`
- `"fecha desconocida"` → `"fecha desconocida"` (unparseable passthrough)

**Warning signs:** Spot-check failures between a Phase 13 smoke-test page and the current live site for the same `reference_code`.

## Code Examples

### Ancestor-chain walk (port from `src/_data/descriptions.js:53-66`)

```javascript
// scripts/generate-content.js — ancestor-chain enrichment
// Source: verbatim port of src/_data/descriptions.js:53-66 (D-08)

function buildAncestorChain(desc, byRefCode) {
  const ancestors = [];
  let current = desc;
  while (current && current.parent_reference_code) {
    const parent = byRefCode.get(current.parent_reference_code);
    if (!parent) break;
    ancestors.unshift({
      reference_code: parent.reference_code,
      title: parent.title,
      description_level: parent.description_level,
    });
    current = parent;
  }
  return ancestors;
}
```

**Notes:** Cycle guard (infinite parent loop) is **absent** in the Eleventy original — it relies on the backend producing DAG data. Port should keep this — a cycle in the source data is an upstream bug and should be surfaced (not silenced) by the build failing. Consider adding a depth cap (e.g. 20 levels) with an `errorf`-equivalent log and non-zero exit if exceeded.

### Spanish narrative date format (port from `eleventy.config.js:37-64`)

```javascript
// scripts/generate-content.js — date formatter
// Source: verbatim port of eleventy.config.js:37-64 (D-15, D-16)

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDateNarrative(dateStr) {
  if (!dateStr) return '';

  // Range: "YYYY-MM-DD .. YYYY-MM-DD" — note the literal " .. " separator
  if (dateStr.indexOf(' .. ') !== -1) {
    const [start, end] = dateStr.split(' .. ');
    return formatDateNarrative(start) + ' – ' + formatDateNarrative(end);
  }

  // Full date
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const day = parseInt(ymdMatch[3], 10);
    const month = SPANISH_MONTHS[parseInt(ymdMatch[2], 10) - 1];
    return `${day} de ${month} de ${ymdMatch[1]}`;
  }

  // Year-month only
  const ymMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    const month = SPANISH_MONTHS[parseInt(ymMatch[2], 10) - 1];
    return `${month} de ${ymMatch[1]}`;
  }

  // Year only or unparseable — passthrough
  return dateStr;
}
```

### Thousands-separator format (port from `eleventy.config.js:68-71`)

```javascript
// scripts/generate-content.js — number formatter
// Source: verbatim port of eleventy.config.js:68-71 (D-17)

function numberFormat(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
```

### Entity-link role_label enrichment (new)

```javascript
// scripts/generate-content.js — role_label computation
// Builds on desc-entity-lookup.json output from precompute-links.js
// Uses ui.js roles map for Spanish translation (D-10)

// Load ui.js roles map — ui.js is being migrated to data/ui.yaml (D-04);
// for Phase 13, read from ui.js before deletion, or move ui.js first and
// read it via require() here.
const ui = require('../src/_data/ui.js');  // TODO: will change when ui.js moves

function enrichEntityLinks(descReferenceCode, descEntityLookup) {
  const links = descEntityLookup[descReferenceCode] || [];
  return links.map(ent => ({
    entity_code: ent.code,
    display_name: ent.display_name,
    // role_label: take first role, translate via ui.roles; fallback to code
    role_label: (ent.roles && ent.roles.length > 0)
      ? (ui.roles[ent.roles[0]] || ent.roles[0])
      : null,
  }));
}
```

**Note:** The existing `src/_data/descriptions.js:73-78` returns `role_labels` (plural array) for all roles. D-10 specifies singular `role_label`. Planner should confirm whether Phase 14 templates need all roles or just the primary one — if all roles, the plan should track `role_labels: string[]` instead and update D-10 in a follow-up.

### Place-link enrichment

```javascript
// Already enriched by precompute-links.js (desc-place-lookup.json carries
// {place_code, display_name}). Phase 13 only needs to pass it through.
// No role_label for places (place_links don't carry roles in the current schema).

function enrichPlaceLinks(descReferenceCode, descPlaceLookup) {
  return (descPlaceLookup[descReferenceCode] || []).map(p => ({
    place_code: p.place_code,
    display_name: p.display_name,
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stub markdown files (`content/{section}/{id}.md`) generated by build script | Content adapters (`_content.gotmpl`) iterate JSON directly | Hugo v0.126.0 (2024 — April-ish) | Eliminates disk-bloat + Hugo page-graph memory at scale; mandatory for 100K+ page sites |
| `.Site.Data` loading of large JSON | `resources.Get` + `transform.Unmarshal` inside content adapters | Always available but now the documented pattern for large data (gohugo.io Data sources page explicitly recommends this) | Memory bounded to one adapter's JSON parse + emission; doesn't persist in memory for whole build |
| Hugo + PostCSS + Tailwind v3 config file | Hugo + `@tailwindcss/cli` v4 + CSS-first config via `@import` and `@source` | Tailwind v4 (2025) | No `tailwind.config.js` churn; automatic content detection via `hugo_stats.json` |
| Standalone tailwindcss binary downloaded from GitHub | `@tailwindcss/cli` npm package invoked by Hugo's `css.TailwindCSS` | Hugo v0.146 PATH security patch (2025) | Binary-in-repo pattern discouraged; npm install is the canonical path |
| Eleventy `_data/` JS modules producing async data | Node scripts writing enriched JSON to `assets/hugo-data/` at build start | v0.5.x → v1.0.0 migration (this phase) | Decouples data fetching/enrichment from site generator; either could be replaced independently |

**Deprecated/outdated in this codebase:**
- Eleventy 3.1.2 (GPL-3.0-licensed SSG) — replaced entirely
- Standalone `./tailwindcss` binary (76 MB, at repo root) — replaced by `@tailwindcss/cli`
- Nunjucks custom filters in `eleventy.config.js` — two ported to Node (`formatDateNarrative`, `numberFormat`), rest reimplemented in Phase 14
- `DEV_MODE=true eleventy --serve` (Eleventy dev server) — replaced by `hugo server` (Hugo ships its own watch + reload)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Content adapters scale linearly past 100K pages at ~1 GB peak RAM | Summary, HUGO-01 traceability | Medium. Community reports go up to "100,000 pages" with linear scaling on modest hardware, but 192K is 2× that. Mitigation: Phase 13's smoke-test at DEV-subset scale doesn't prove this — Phase 14 full-build is the real validation. Plan should flag a preliminary "memory profile on full build" before Phase 14 wraps. |
| A2 | Setting `url` in the AddPage dict overrides the section prefix entirely | Pattern 1, Pitfall 5 | Low. Verified via Hugo front-matter URL docs: "Set the `url` in front matter to override the entire path." But the behaviour specifically in combination with content adapters' AddPage is `[ASSUMED]` from reading the docs together — no single doc example confirms it. Mitigation: the smoke-test build must verify the output directory structure. |
| A3 | `hugo_stats.json` module-mount pattern works with `@tailwindcss/cli` ≥ v4.2.2 | Pattern 3, Pitfall 2 | Low. Pattern is canonical per gohugo.io TailwindCSS docs. `@tailwindcss/cli` version 4.2.2 postdates the v4 stable release, so CLI-level behaviour is stable. Mitigation: a `grep` spot-check of the built CSS for a known-used class (e.g. `bg-burgundy-500`) in the plan verification step. |
| A4 | 208 MB descriptions.json does not exceed `transform.Unmarshal` memory budget in the adapter | Pattern 1 | Medium. `transform.Unmarshal` for a 208 MB file will allocate roughly 2-3× the size as Go interface{} tree (500-600 MB). Adapter runs once, releases after pages are emitted. Unverified at this scale — closest community data point is 100 MB, not 208 MB. Mitigation: if this hits a limit, split descriptions.json by repository (5 files of ~40 MB average) and iterate per-file in the adapter. Easy fallback. |
| A5 | Hugo 0.160.x Extended is available via `brew install hugo` on contributor machines | Standard Stack | Low. `brew install hugo` has installed Extended by default since mid-2024 on modern setups. Mitigation: plan includes a `hugo version | grep +extended` precondition script that fails fast with an install hint. |
| A6 | Phase 13's existing `package-lock.json` regen after dropping `@11ty/eleventy` doesn't break other deps | D-01 | Low. Only peer is `graphology` and `graphology-layout-forceatlas2` — independent of Eleventy. |
| A7 | `src/_data/ui.js` → `data/ui.yaml` conversion is a straightforward module → YAML serialisation | D-04 | Low. `ui.js` is a pure `module.exports = {...}` object with string values. `js-yaml.dump()` or a manual one-off transcription handles it. No functions, no conditionals in the object. |
| A8 | Client-runtime data shards (`/data/children/*.json`, etc.) can be served from `static/data/` without URL change | Runtime State Inventory | Medium. Hugo's `static/` is passthrough and its URLs map directly. The question is whether `precompute-links.js` should write to `static/data/` (Node-side concern) or whether Hugo should mount/passthrough the existing `data/` (Hugo-side concern). Either works; plan needs to pick one. |

**If this table is empty:** — Not empty. Seven of eight are low risk; two (A1, A4) are the real uncertainties. Both are answerable by running the full build in Phase 14, which is why Phase 13's scope is correctly narrow (subset build only).

## Open Questions

1. **Where do client-runtime data shards live in the new layout?**
   - What we know: client JS fetches from `/data/children/{refcode}.json`, `/data/entity-links/{code}.json`, `/data/place-links/{code}.json`, `/data/entity-index.json`, `/data/place-index.json`, graph JSON, and lookup files. Currently these are in the root-level `data/` directory, served by Eleventy's passthrough copy.
   - What's unclear: with Hugo's `data/` directory collision (Pitfall 1), the simplest fix is renaming the export staging directory. But then `precompute-links.js` writes to `exports/entity-links/` or `raw/entity-links/` — we need those URL-visible at `/data/{type}/{code}.json` for client code. Options: (a) `precompute-links.js` writes directly to `static/data/` (Hugo serves it unchanged); (b) an intermediate copy step from the export dir to `static/data/`; (c) a Hugo `module.mounts` rule from `raw/entity-links/` → `static/data/entity-links/`.
   - Recommendation: **Option (a)** — cleanest; `precompute-links.js` takes an output directory override (env var or CLI flag), Phase 13's `build.sh` sets it to `static/data/`. Requires a one-line change to the script. Keeps `data/` (or renamed `exports/`) purely as the B2-download landing zone.

2. **Does Phase 13 include the `data/` directory rename, or defer it?**
   - What we know: the collision (Pitfall 1) is not optional — it's a blocker for Phase 13 building at all.
   - What's unclear: the scope of rename impact (`build.sh`, `precompute-links.js`, `scripts/places-to-geojson.js`, `.github/workflows/deploy.yml` — Phase 15 concern but still touched).
   - Recommendation: **Rename in Phase 13**, because without it the `hugo` invocation can't even start. Suggested new name: `exports/` (matches B2 bucket name `zasqua-export`). Touch CI workflow only to update the path references (no logic change).

3. **Entity count: 92K or 83K?**
   - What we know: STATE.md says "Entity data is stale (entities.json has 92K records; canonical count from zasqua-entities Phase 10 is 83K) — will be resolved upstream before or during Phase 13." REQUIREMENTS.md HUGO-01 says "78K entities." Phase 13 success criterion 3 says "~83K entities."
   - What's unclear: which number is canonical at Phase 13 start, and whether a refreshed B2 export is a precondition for the plan.
   - Recommendation: planner checks with the user at plan kickoff; the record-count verification step in `generate-content.js` (specific numbers logged to stdout) makes this self-documenting at build time regardless.

4. **Does the smoke-test template include the TIFY viewer and map?**
   - What we know: D-03 says Phase 13 "validates end-to-end that the Hugo Pipes CSS pipeline, vendored TIFY passthrough, and static image serving all work." CONTEXT.md specifics say "Don't port the full description.njk — just prove the pipeline with a stub that shows title, reference_code, ancestor chain, and date_formatted."
   - What's unclear: does "TIFY passthrough" need a link to TIFY in the smoke-test HTML, or just `static/vendor/tify/` being served at `/vendor/tify/tify.js`?
   - Recommendation: the latter — add a `curl -fsSL https://<devserver>/vendor/tify/tify.js > /dev/null` check in the plan's verification rather than embedding the viewer in the smoke-test template. Cheaper, same signal.

5. **Does `data/ui.yaml` live at project root (Hugo's `dataDir`) or under a renamed directory?**
   - What we know: D-04 moves `ui.js` to `data/ui.yaml`. Pitfall 1 says Hugo's default `dataDir = "data"` collides with the export directory.
   - What's unclear: if we rename the export dir to `exports/`, then `data/ui.yaml` is fine and uncollided. If we override `dataDir` instead, `ui.yaml` goes to wherever that is.
   - Recommendation: rename export → `exports/`, keep `data/ui.yaml` at `dataDir = data` (Hugo default). This is the cleanest semantics — "data" is where Hugo lookup tables live; "exports" is where B2 downloads land.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `generate-content.js`, `precompute-links.js` | ✓ | v22.17.0 | — |
| npm | dep install | ✓ | 10.9.2 | — |
| `hugo` (Extended) | Whole phase | ✗ (not installed on dev machine verified 2026-04-16) | — | **Blocking.** Must `brew install hugo` before any smoke-test works. Plan's first task should be an install-verification script. |
| `@tailwindcss/cli` | CSS pipeline | ✗ (not installed; in package.json but `node_modules` is Eleventy-era) | 4.2.2 | `npm install` after package.json update |
| `tailwindcss` | CSS pipeline (peer) | ✗ (same) | 4.2.2 | `npm install` |
| `b2` CLI (Backblaze) | Data download in `build.sh` | Unknown — `build.sh` installs it per-run (`pip install b2[full]`) | — | Unchanged in Phase 13 |
| Python 3 | `b2` install, `places-to-geojson.js` | Assumed (not verified in this research) | — | If missing, plan flags and adds install step |

**Missing dependencies with no fallback:**
- Hugo Extended — contributor must install before running `hugo --minify`. This is the single most important precondition.

**Missing dependencies with fallback:**
- Tailwind v4 CLI — resolved by `npm install` after package.json is regenerated.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No Node-side test framework currently in `package.json`. Validation is end-to-end via build output inspection. |
| Config file | none — see Wave 0 gap |
| Quick run command | `node scripts/generate-content.js` + `hugo --minify` + shell assertions |
| Full suite command | `./build.sh` + shell assertions against `public/` |

**Approach:** Because this phase ports a working pipeline to a new SSG, validation is predominantly **golden-file comparison** (ancestor chains, date formats, record counts) + **output structure assertions** (URL scheme, CSS classes present, JSON shape on disk). A heavyweight framework (Jest, vitest) is overkill; plain `node --test` scripts + shell `grep`/`test` assertions suffice and match the existing codebase conventions (no test framework in package.json).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HUGO-01 | Hugo build completes under memory limits | manual (full-scale verification is Phase 14) | `/usr/bin/time -l hugo --minify` (macOS) or `/usr/bin/time -v hugo --minify` (Linux) | ❌ Wave 0 |
| HUGO-02 | No stub markdown files exist in content/ | assertion | `find content -name '*.md' | wc -l` → expect 0 (adapter files only) | ❌ Wave 0 |
| HUGO-04 | `hugo.toml` uses `resources.Get`, has `build.writeStats = true`; no large JSON under `data/` | assertion | `grep -q 'writeStats = true' hugo.toml && grep -rq 'resources.Get' content/ && test $(wc -c < data/ui.yaml) -lt 10000` | ❌ Wave 0 |
| ENRICH-01 | Every description record has `ancestor_chain` array | unit | `node tests/check-ancestor-chains.js` — asserts every record in `assets/hugo-data/descriptions.json` has `ancestor_chain` as an array, and for N random samples, the chain is consistent with `parent_reference_code` walking | ❌ Wave 0 |
| ENRICH-02 | Every date field has `date_formatted` in Spanish narrative format | unit (golden-file) | `node tests/check-date-formatting.js` — runs a fixed input-output table of 6 cases through `formatDateNarrative` and asserts exact equality | ❌ Wave 0 |
| ENRICH-03 | Entity/place links include `display_name` and `role_label` | unit | `node tests/check-link-enrichment.js` — asserts `entity_links[*].display_name` and `role_label` non-empty on N samples; `place_links[*].display_name` non-empty | ❌ Wave 0 |
| ENRICH-04 | Enriched JSON at `assets/hugo-data/` with correct record counts | assertion | `node tests/check-enriched-counts.js` (flagged in CONTEXT.md specifics as optional but we elevate it to required) — reads the three files, asserts they exist, valid JSON, and lengths match the source-file counts within a small delta | ❌ Wave 0 |
| URL scheme (D-18) | Pages publish at `/{code}/` not `/descripcion/{code}/` etc. | assertion | `test -d public/$SMOKE_REF/ && ! test -d public/descripcion/` | ❌ Wave 0 |
| Tailwind v4 wiring (D-22/24) | Built CSS contains classes used by rendered HTML | assertion | `grep -q 'burgundy' public/css/main.*.css && grep -q 'bg-burgundy-' public/$SMOKE_REF/index.html` | ❌ Wave 0 |
| Hugo Extended precondition (D-23) | `hugo version` contains `+extended` | assertion | `hugo version | grep -q '+extended' || exit 1` | ❌ Wave 0 |

**Key phase invariants** (what must hold for Phase 13 to be "done"):

- **I1 (Record-count fidelity):** `assets/hugo-data/descriptions.json.length` equals `data/descriptions.json.length` (same for entities, places). No silent filtering.
- **I2 (Shape contract):** Every description carries `ancestor_chain: Array<{reference_code, title, description_level}>`, `date_formatted: string`, `repository: object|null`, `entity_links: Array<{entity_code, display_name, role_label}>`, `place_links: Array<{place_code, display_name, role_label|null}>`. Use a JSON Schema or simple `typeof` assertions per field.
- **I3 (URL preservation):** Smoke-test pages publish at `/{reference_code}/index.html` (no `/descripcion/` prefix).
- **I4 (Byte-for-byte date fidelity):** `formatDateNarrative` golden-file test passes all six canonical cases (see Pitfall 6).
- **I5 (No stub markdown):** `find content -name '*.md'` returns zero files.
- **I6 (No large JSON in `data/`):** `find data -size +1M` returns zero files (allows `ui.yaml` but excludes 208 MB exports).
- **I7 (Hugo Extended):** `hugo version | grep -c +extended` equals 1.
- **I8 (Tailwind content detection):** At least one semantic class used in the smoke-test HTML appears in the built CSS.

### Sampling Rate
- **Per task commit:** run the relevant test script from the table (e.g., after porting date formatter, run `check-date-formatting.js`)
- **Per wave merge:** full `./build.sh` (subset build — one smoke-test page type) + all test scripts
- **Phase gate:** every invariant I1-I8 holds

### Wave 0 Gaps

All test scripts are new — the existing repo has no Node tests. Create in Phase 13's Wave 0:

- [ ] `tests/check-ancestor-chains.js` — covers ENRICH-01
- [ ] `tests/check-date-formatting.js` — covers ENRICH-02 (golden-file cases from Pitfall 6)
- [ ] `tests/check-link-enrichment.js` — covers ENRICH-03
- [ ] `tests/check-enriched-counts.js` — covers ENRICH-04
- [ ] `tests/check-url-scheme.sh` — shell script covering D-18 / I3
- [ ] `tests/check-extended.sh` — one-liner covering D-23 / I7 (can live in `build.sh` as precondition rather than separate file — planner's call)
- [ ] `tests/check-css-compiled.sh` — covers D-22/24 / I8

*(No framework install needed — `node --test` is built into Node ≥ 18 and works with plain `*.test.js` or `*.js` files using `node:assert`.)*

## Project Constraints (from CLAUDE.md)

Extracted actionable directives from `CLAUDE.md` (project) and `../CLAUDE.md` (workspace):

- **Language:** UK English in all conversational output; US English in user-facing docs/UI strings/commits; Colombian Spanish in archival descriptions and Spanish UI. Applies to any new strings in `data/ui.yaml` and any log messages in `generate-content.js`.
- **No AI artefacts in public repo:** `.planning/`, `CLAUDE.md`, `.claude/` never ported to `zasqua-frontend/`. Phase 13 plan porting to public repo (if any at this milestone) excludes these paths. **Phase 13 is dev-repo only — porting is end-of-milestone.**
- **No phase/plan prefixes in commit messages** (`feat(13-01):` is wrong in public repo; fine in this dev repo).
- **Narrative headers + version footers required on every source file** (`../docs/guidelines/code-conventions.md`). Every new file created in Phase 13 MUST have one: `scripts/generate-content.js`, `hugo.toml`, `content/*/\_content.gotmpl`, `layouts/**/*.html`, `data/ui.yaml`, test scripts. **The planner MUST add a task for this.** Checked files too — if any ported file lacks a header, add one.
- **Ask before naming/structural changes:** The `data/` → `exports/` rename (Open Question 2) is a naming change. Planner should flag this to the user explicitly at plan kickoff — do NOT proceed without approval per CLAUDE.md rules.
- **Commit along the way, short messages, no emojis, no co-author.**
- **Never commit secrets or credentials:** `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY` come from environment; never committed.
- **Never generate placeholder/dummy text:** smoke-test page uses real data from a real `reference_code`, not fabricated content.
- **Never invent archival metadata:** no fabricated titles/dates/creators in examples; all test inputs come from real B2 exports.
- **Consult guidelines before new task types:** `../docs/frontend/guidelines/frontend-workflow.md`, `shared-visual-language.md`, `design-tokens.md` — planner should confirm no CSS refactoring conflicts with existing tokens.

## Sources

### Primary (HIGH confidence)
- [Hugo content adapters documentation](https://gohugo.io/content-management/content-adapters/) — canonical `_content.gotmpl` syntax, `AddPage`, `AddResource`, `Site`, `Store`
- [Hugo `resources.Get`](https://gohugo.io/functions/resources/get/) — asset loading mechanics
- [Hugo `transform.Unmarshal`](https://gohugo.io/functions/transform/unmarshal/) — JSON parsing pattern
- [Hugo `css.TailwindCSS`](https://gohugo.io/functions/css/tailwindcss/) — the canonical Tailwind v4 invocation pattern with module-mount config
- [Hugo URL management](https://gohugo.io/content-management/urls/) — `url` front-matter override behaviour
- [Hugo releases v0.160.1](https://github.com/gohugoio/hugo/releases/tag/v0.160.1) — latest stable version (2026-04-08)
- [Hugo v0.126.0 release notes](https://github.com/gohugoio/hugo/releases/tag/v0.126.0) — content adapters introduction
- `eleventy.config.js:37-64` — `formatDateNarrative` (ground truth for port)
- `eleventy.config.js:68-71` — `numberFormat` (ground truth for port)
- `src/_data/descriptions.js` (92 lines) — ancestor walker + entity/place enrichment (ground truth for port)
- `src/_data/entities.js`, `places.js` — entity/place enrichment details
- `scripts/precompute-links.js` (277 lines) — upstream producer contract (unchanged, input to generate-content.js)
- npm registry (`npm view @tailwindcss/cli version`, `npm view tailwindcss version`) — confirmed 4.2.2 for both, 2026-04-16

### Secondary (MEDIUM confidence)
- [hugoDocs TailwindCSS.md source](https://github.com/gohugoio/hugoDocs/blob/master/content/en/functions/css/TailwindCSS.md) — full module-mount + CSS `@source` example
- [bep/hugo-testing-tailwindcss-v4](https://github.com/bep/hugo-testing-tailwindcss-v4) — community reference implementation of three Tailwind v4 wiring variants
- [Hugo content-adapters discussion thread](https://discourse.gohugo.io/t/content-adapters-examples-and-performance/49830) — community-reported scaling behaviour at 100K+ pages (linear, ~1.2 GB peak)
- [Hugo URL management "url vs slug vs permalinks"](https://discourse.gohugo.io/t/content-adapters-path-or-permalink/55941) — behaviour of `path` vs `url` in content-adapter output
- [Harry Cresswell — Content adapters from Google Sheets](https://harrycresswell.com/writing/generate-pages-from-google-sheets/) — real-world example of content-adapter path handling
- [Hugo macOS install](https://gohugo.io/installation/macos/) — `brew install hugo` installs Extended
- [Hugo-stats.json gitignore issue](https://discourse.gohugo.io/t/hugo-stats-json-does-not-work-when-added-to-gitignore/56956) — confirms the silent-skip behaviour

### Tertiary (LOW confidence, flagged)
- Assumption A4 (208 MB `transform.Unmarshal` memory cost) — inferred from 100 MB community data points; not directly measured at our scale
- Assumption A1 (192K pages scales from 100K community reports) — 2× extrapolation from known-good data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm/GitHub; Hugo Extended install path is well-established
- Architecture: HIGH — content adapters + `resources.Get` is the canonical Hugo pattern, confirmed by multiple HIGH sources
- Pitfalls: HIGH for Pitfalls 1, 2, 3, 5, 6 (documented behaviour); MEDIUM for Pitfall 4 (Extended behaviour at edge cases is interpretation)
- URL override mechanism: MEDIUM — the mechanism (front-matter `url`) is documented, the specific composition with content adapters' `AddPage` is `[ASSUMED]` (A2) and must be smoke-tested in Phase 13

**Research date:** 2026-04-16
**Valid until:** 2026-06-15 — Hugo ships monthly, Tailwind v4 is stable but active. Expect ≤ 2 minor Hugo releases and one Tailwind patch release in that window, both likely non-breaking.
