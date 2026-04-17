---
phase: 13-hugo-foundation
plan: 06
status: complete
completed: 2026-04-17
commits:
  - 96cbf8a
---

# Plan 13-06 — 404 and buscar page templates

## Outcome

Two page templates ported faithfully from Eleventy, plus a one-line backward-compatible addition to baseof.html to support page-level title overrides. All chrome from Plan 13-05 preserved; new pages inherit baseof correctly. Hugo build zero WARNs.

## Commits

| Hash | Subject | Files |
|------|---------|-------|
| `96cbf8a` | phase 13-06: port 404 + buscar templates | 4 (1 patch + 3 new) |

## What was ported

| Source (Eleventy) | Target (Hugo) | Source lines | Port lines |
|---|---|---|---|
| `src/404.njk` | `layouts/404.html` | 16 | 33 |
| `src/buscar.njk` | `content/buscar/_index.md` + `layouts/buscar/list.html` | 20 | 17 + 34 |

Content/layout split for buscar is a Hugo convention (section routing needs a content file to register the URL; the layout does the actual rendering). Net port size is proportional to source once narrative headers are subtracted.

## baseof.html patch (scope addition)

One-line edit: wrapped the `<title>` content in a Hugo block.

```diff
-  <title>{{ if .Title }}{{ .Title }} | {{ end }}{{ site.Title }}</title>
+  <title>{{ block "title" . }}{{ if .Title }}{{ .Title }} | {{ end }}{{ site.Title }}{{ end }}</title>
```

**Backward-compatibility proof:** the fallback content (inside the block) is byte-identical to the previous line. Any page that does not `{{ define "title" }}...{{ end }}` inherits the fallback unchanged. Regression-tested: `<title>Zasqua</title>` still renders for the home page (which has no front-matter title), `<title>Buscar | Zasqua</title>` still renders for the buscar section (which has a front-matter title via content/buscar/_index.md), and `<title>Página no encontrada | Zasqua</title>` renders for the 404 page (which defines the title block since it has no content file to supply `.Title`).

baseof.html version bumped v1.0.0 → v1.0.1.

## Deliberate divergences (two, both documented)

1. **No `permalink:` front matter on either page.** Eleventy's `permalink: /404.html` and `permalink: /buscar/` map directly to Hugo's file-path routing (`layouts/404.html` → `public/404.html`; `content/buscar/_index.md` → `public/buscar/index.html`). URLs produced are byte-identical to Eleventy's.

2. **JSON object key order in `data-level-labels` and `data-facet-labels`.** Eleventy's `{{ foo | dump | safe }}` preserves YAML source order (fonds, subfonds, series, subseries, file, item, collection, section, volume for levels). Hugo's `jsonify` sorts alphabetically (collection, file, fonds, item, section, series, subfonds, subseries, volume). **Functionally identical** — JavaScript object keys are unordered; `dataset.levelLabels.fonds` returns "Fondo" in both builds — but HTML source bytes differ in key sequence within the attribute value. Recorded for Phase 14 audit.

## JSON serialisation technique

The Nunjucks `{{ foo | dump | safe }}` pattern was ported as:
```gotmpl
{{ printf `data-level-labels='%s'` (jsonify hugo.Data.ui.levels) | safeHTMLAttr }}
```

**Why `printf` + `safeHTMLAttr` and not `jsonify ... | safeHTML`:** Hugo's `html/template` auto-escape runs in attribute context even when content is marked `safeHTML`. Attempting `data-level-labels='{{ jsonify ... | safeHTML }}'` yielded `{&#34;collection&#34;:...}` — HTML-entity-escaped double quotes. That's still browser-decodable (`element.dataset.levelLabels` returns parseable JSON), but bytes diverge from Eleventy. `printf` builds the entire `name=value` string and `safeHTMLAttr` marks the whole attribute as pre-escaped, bypassing the re-escape. Result: raw `{"collection":"Colección",...}` in the HTML source, matching Eleventy's output exactly.

JSON parseability verified:
- Raw HTML attribute value → JSON.parse succeeds → 9 level keys, 5 facet keys
- Sample: `levels.fonds = "Fondo"`, `facets.repository = "Repositorio"`

## Zero Hugo WARNs

The zero-WARN state established in Plan 13-05 (after the `site.Data` → `hugo.Data` migration) is preserved. Fresh `DEV_LIMIT=5 hugo` emits zero deprecation warnings, zero layout lookup failures, zero undefined-key errors.

## Chassis regression check

Confirmed Plan 13-05's chassis still renders correctly on all pages after the baseof title-block patch:

- `/` → `<title>Zasqua</title>`, site-header + site-footer + DM Sans + favicon all intact
- `/buscar/` → `<title>Buscar | Zasqua</title>`, full chassis + buscar-specific content
- `/404.html` → `<title>Página no encontrada | Zasqua</title>`, full chassis + error section content

No page lost any element from the Plan 13-05 chassis port.

## Known limitation — local buscar UI shows error

Visiting `http://127.0.0.1:1313/buscar/` in a browser renders the search chassis correctly but the `#search-page` mount shows the Spanish error state "Ha ocurrido un error / Intentar de nuevo". This is NOT a port regression.

**Root cause:** `static/js/search.js` line 51 imports `/pagefind/pagefind.js` to initialise the Pagefind static search engine. Pagefind indices are built by a separate `pagefind` CLI run over the final HTML output — a Phase 15 concern per the original ROADMAP.md ("Three Pagefind index builds run in parallel CI jobs"). The DEV_LIMIT=5 local build does not produce Pagefind indices, so `import('/pagefind/pagefind.js')` 404s, search.js's init() catches the error, and its internal `showError()` renders the generic failure UI.

**Proof the port is correct:**
- `/js/search.js` resolves (200) — our template's `<script src="/js/search.js"></script>` correctly loads
- `data-level-labels` and `data-facet-labels` parse as JSON — the JSON-serialisation pattern works
- search.js mounts onto `#search-page` — the container ID and class are present
- The same search.js would show the same error state on any build lacking Pagefind indices — it's not a template bug

**Resolution path:** Phase 15 adds Pagefind index building to `build.sh`, at which point local buscar will render real search results. Phase 14's visual+functional audit is the natural place to re-verify buscar once Pagefind is wired in.

## Forward pointer for Plan 13-07

Plan 13-07 ports `src/index.njk` (87 lines — hero with logo, search form, intro paragraphs, repo grid with images/overlays/counts) to `layouts/index.html` or `layouts/_default/home.html`.

Key contracts the home page needs:
- `hugo.Data.ui.search.placeholder` and other search.* strings — already available
- `hugo.Data.ui.repository.itemsCount` — verify in data/ui.yaml (Eleventy source uses `{{ ui.repository.itemsCount }}`)
- Repository-specific image paths (narra.jpg, AHR_front.jpg, AHRB_front.jpg, ACC_front.jpg, istmina.jpg) — already in static/img/ from Plan 13-04
- A `repositories` data source with `description_count` per repo — this is a gap. Eleventy reads `src/_data/repositories.js` which computes counts from the descriptions. Hugo needs either:
  - A content adapter that emits repository data (proposed Plan 13-08)
  - A shared `hugo-data/repositories.json` generated by `scripts/generate-content.js` (would require Plan 13-02 revisit)
  - A Go template computation at build time using `.Site.Pages` grouping

Decision to be surfaced in Plan 13-07's discussion: repositories data source. The Eleventy version has `repoOrder = ["pe-bn","co-ahjci", "co-ahr", "co-ahrb", "co-cihjml"]` hard-coded in the template AND dynamic counts computed from descriptions. Suggested path: add a small `repositories.json` to `assets/hugo-data/` via a quick generate-content.js extension.

## Version

Version: v1.0.0
