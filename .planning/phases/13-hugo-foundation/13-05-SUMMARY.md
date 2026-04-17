---
phase: 13-hugo-foundation
plan: 05
status: complete
completed: 2026-04-17
commits:
  - 1bc8b0f
  - 47e36dc
---

# Plan 13-05 — Base layout + global partials

## Outcome

Every byte of HTML the Eleventy chassis emits (base layout + header + footer + breadcrumb + CSS pipeline) now has a Hugo Go-template equivalent. Rendered output for an empty-content page on `http://127.0.0.1:1313/` is structurally indistinguishable from `https://zasqua.org/` from `<!DOCTYPE html>` through `</body>` except for the main content area — which this plan intentionally does not populate (Plan 13-07 ports the home page).

## Commits

| Hash | Subject | Files |
|------|---------|-------|
| `1bc8b0f` | phase 13-05: fix hugo.toml title and add [params] block | 1 (hugo.toml) |
| `47e36dc` | phase 13-05: port base layout and global partials | 8 (5 new layouts + 2 bridge stubs + content/_index.md fix) |

## What was ported

| Source (Eleventy) | Target (Hugo) | Source lines | Port lines | Port / source ratio |
|---|---|---|---|---|
| `src/_layouts/base.njk` | `layouts/_default/baseof.html` | 37 | 60 | 162% (extra lines are narrative header + version footer) |
| `src/_includes/header.njk` | `layouts/_partials/header.html` | 30 | 53 | 177% |
| `src/_includes/footer.njk` | `layouts/_partials/footer.html` | 13 | 31 | 238% (narrative header carries more context for this file) |
| `src/_includes/breadcrumb.njk` | `layouts/_partials/breadcrumb.html` | 13 | 31 | 238% |
| — (new, Hugo-specific) | `layouts/_partials/css.html` | — | 34 | Tailwind v4 pipeline partial |

All port ratios are within the 110–250% band documented in the plan — the excess is entirely narrative headers, version footers, and block-comment documentation required by `../docs/guidelines/code-conventions.md`. Actual rendered HTML output is structurally 1:1.

## Deliberate divergences from byte-for-byte verbatim (documented in plan)

1. **CSS `<link>` path.**
   - Eleventy: `<link rel="stylesheet" href="/css/main.css">` (literal, compiled by Tailwind CLI into src/css/main.css before build).
   - Hugo: emitted by `layouts/_partials/css.html` using `resources.Get "css/main.css" | css.TailwindCSS`. In `hugo server` (dev), the URL resolves to `/css/main.css` un-fingerprinted for fast reloads. In prod builds (`hugo --minify`), the URL is `/css/main.HASH.css` with a `crossorigin="anonymous"` SRI integrity attribute added. Rendered CSS content is identical — only the cache-bust filename differs.

2. **`<meta description>` fallback.**
   - Eleventy: `<meta name="description" content="{{ description or site.description }}">` — falls back to `site.description` from `src/_data/site.js`.
   - Hugo: `<meta name="description" content="{{ with .Params.description }}{{ . }}{{ else }}{{ site.Params.description }}{{ end }}">` — after adding `description` to `[params]` in hugo.toml. Output bytes identical for equivalent data.

3. **Footer `{year}` and buildDate substitution.**
   - Eleventy: `{{ ui.footer.copyright | replace("{year}", site.buildYear) }}` where `site.buildYear = new Date().getFullYear()`. And `Última actualización: {{ site.buildDate }}` where `site.buildDate = new Date().toISOString().split('T')[0]`.
   - Hugo: `{{ replace hugo.Data.ui.footer.copyright "{year}" (now.Format "2006") }}` and `Última actualización: {{ now.Format "2006-01-02" }}`. Same dynamic build-time behaviour, same output format (YYYY for year, YYYY-MM-DD for date).

## Additional corrections made during execution

Two issues were discovered during the Task 5 verification step. Both were cross-plan bugs that only became detectable once baseof.html could actually render. Both corrected in this plan as part of the "zero visual-fidelity divergence" goal.

1. **content/_index.md title removed.** Plan 13-03's content adapter setup included `title: "Zasqua — Archivo Histórico"` in the home-page front matter. Once baseof began rendering, this produced `<title>Zasqua — Archivo Histórico | Zasqua</title>` — a doubled string that diverges from Eleventy's home-page title (which is simply "Zasqua" because `src/index.njk` has no page-level title). Removed the front-matter title; replaced the narrative comment with an explanation of why the file is intentionally empty. Version bumped to v1.0.1.

2. **`.Site.Data` deprecation warnings eliminated.** Hugo 0.156.0 deprecated `.Site.Data` / `site.Data` in favour of `hugo.Data`. The initial port used `site.Data.ui.*` (the lowercase-method form), which still triggered the WARN. Migrated all three partials (header, footer, breadcrumb) to `hugo.Data.ui.*`. Result: `DEV_LIMIT=5 hugo` now emits zero WARNs.

## Scope additions: bridge stubs

Hugo's template inheritance model requires page templates (e.g. `home.html`, `single.html`, `list.html`) to `{{ define "main" }}...{{ end }}` for baseof.html to actually render. Without any page template, Hugo falls back to its built-in default renderer, which does NOT extend baseof.

To let baseof be testable immediately (rather than waiting for Plan 13-07's home.html to land), two minimal bridge stubs were added:

- `layouts/_default/list.html` — `{{ define "main" }}{{ end }}`. Catches home (`/`) and section listings (`/descripcion/`, `/entidad/`, `/lugar/`) until plans 13-07 and later replace it.
- `layouts/_default/single.html` — `{{ define "main" }}{{ end }}`. Catches detail pages (`/{reference_code}/`, `/{entity_code}/`, `/{place_code}/`) until plans 13-08 through 13-13 replace it.

Each file is 3 lines of actual template (narrative header + `{{ define "main" }}{{ end }}` + version footer = ~19 lines total). Zero content, zero design decisions — explicitly placeholder.

## Chassis verification checklist

All items passed in the `DEV_LIMIT=5 hugo` rebuild + local curl at `http://127.0.0.1:1313/`:

- [x] `<title>Zasqua</title>` — matches zasqua.org exactly
- [x] `<meta charset="UTF-8">` (uppercase — matches source)
- [x] `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (`initial-scale=1.0` with trailing `.0` — matches source)
- [x] `<meta name="description">` resolves via site.Params.description
- [x] `<link rel="icon" type="image/png" href="/img/favicon.png">`
- [x] 4 Google Fonts `<link>` tags (preconnect × 2, DM+Sans+Crimson+Text+Cormorant+Garamond, Material+Symbols+Outlined) — verbatim
- [x] CSS resolves via Hugo Pipes: `/css/main.css` returns 200, 98 KB Tailwind v4 compiled CSS
- [x] CSS contains custom theme tokens: `--color-burgundy`, `--font-sans: "DM Sans"`, `--font-serif: "Crimson Text"`
- [x] CSS contains ported component classes: `.site-header`, `.site-footer`, `.hamburger-toggle`, `.site-logo`, `.site-nav`, `.nav-dropdown`
- [x] CSS contains utility classes: `.bg-bg`, `.bg-burgundy-dark`, `.text-white`, `.font-serif`, `.font-sans`, `.text-stone-600`, `.text-stone-400`
- [x] `<body class="bg-bg font-sans text-stone-600">` — three classes verbatim
- [x] Header: `<header class="site-header">` with `<a href="/" class="site-logo">` + `<img src="/img/zasqua-3-burgundy-sm.svg" alt="Zasqua">` + `<span class="site-logo-text font-serif">Neogranadina: <strong>Zasqua</strong></span>`
- [x] Hamburger: `<button class="hamburger-toggle" type="button" aria-label="Menu" aria-expanded="false">` with `<span class="material-symbols-outlined">menu</span>`
- [x] Nav: Inicio / Explorar dropdown (with Documentos / Entidades / Lugares) / Acerca / Catalogación
- [x] Search form: action `/buscar/`, method get, placeholder "Buscar en el catálogo..."
- [x] Footer: `<footer class="site-footer bg-burgundy-dark text-white">` with credits paragraph, copyright "© 2026 Fundación Histórica Neogranadina.", version link "Zasqua v0.4.0", "Última actualización: 2026-04-17."
- [x] Two footer seals: `/img/logo_grande.svg` + `/img/ampl-cropped-1.png` with correct alt text
- [x] `<script src="/js/header.js"></script>` immediately after footer partial
- [x] Cloudflare Web Analytics beacon script with correct data-cf-beacon token
- [x] Zero Hugo build WARNs
- [x] All 5 passthrough asset URLs return 200 (header.js, favicon.png, logo_grande.svg, ampl-cropped-1.png, zasqua-3-burgundy-sm.svg)

## A/B outcome

User visually verified side-by-side:
- Local Hugo chassis (header, footer, fonts, colours, body background) matches zasqua.org byte-for-byte
- Main content area differs as expected (local shows empty — bridge stub; zasqua.org shows the full home page content from Plan 13-07's scope)

## Forward pointer for Plan 13-06

Plan 13-06 ports `src/404.njk` and `src/buscar.njk`. Both are simple page templates that extend baseof by defining `{{ define "main" }}...{{ end }}`:

- **404**: Hugo looks for `layouts/404.html` (not `_default/404.html`) — this file should be the NEW 404 template. Its content is the Eleventy `src/404.njk` body inside `{{ define "main" }}...{{ end }}`. Port every `section`, `container`, and `btn` class verbatim.
- **buscar**: Either create `content/buscar/_index.md` + `layouts/buscar/list.html`, OR create `content/buscar.md` + `layouts/_default/single.html` (replacing the bridge stub). The template mounts the `<div id="search-page" data-level-labels=... data-facet-labels=...>` hook and loads `<script src="/js/search.js"></script>`.

The `hugo.Data.ui.error404.*` and `hugo.Data.ui.search.*` keys are already in data/ui.yaml (ported by Plan 13-03). Keys available:
- `hugo.Data.ui.error404.title`, `.message`, `.home`, `.search`
- `hugo.Data.ui.search.placeholder`, `.button`, `.results`, `.noResults`, `.clearFilters`, `.filtersHeader`, `.sidebarHeading`, etc.

Plan 13-06 should NOT yet touch `hugo.Data.ui.levels` and `hugo.Data.ui.facets` — those are consumed by the inline `data-level-labels='{{ ui.levels | dump | safe }}'` and `data-facet-labels='{{ ui.facets | dump | safe }}'` in buscar.njk; Hugo's `jsonify` function handles the `| dump | safe` port.

## Safety

- `abandoned/phase-13-04-first-attempt` tag still in place
- No changes to `src/` (sources preserved for Plans 13-06 through 13-14)
- No changes to `assets/hugo-data/`, `scripts/`, `eleventy.config.js`, `package.json`, `build.sh`

## Version

Version: v1.0.0
