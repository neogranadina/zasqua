---
phase: 13-hugo-foundation
plan: 07
status: complete
completed: 2026-04-17
commits:
  - 5b5d8a4
  - a483594
---

# Plan 13-07 — Home page port

## Outcome

Home page rendered at `http://127.0.0.1:1313/` is structurally indistinguishable from `https://zasqua.org/`. Hero + intro + 5-card repo grid all visually match, description counts format correctly in Latin American convention (14.776, 55.359, 10.569, 25.549), zero Hugo WARNs.

## Commits

| Hash | Subject | Files |
|------|---------|-------|
| `5b5d8a4` | phase 13-07: add repositories.json copy step to generate-content.js | 1 |
| `a483594` | phase 13-07: port home page template (layouts/index.html) | 1 new |

## What was ported

| Source | Target | Source lines | Port lines |
|---|---|---|---|
| `src/index.njk` | `layouts/index.html` | 87 | 121 |

Port ratio 139% — overhead is entirely narrative header + Hugo variable assignments (per-repo override blocks use `{{ $var := ... }}` instead of Nunjucks `{% set %}`, slightly more verbose).

## Deliberate divergences (three)

1. **Repository data source location.** Eleventy reads `exports/repositories.json` via `src/_data/repositories.js` at build setup; Hugo reads `assets/hugo-data/repositories.json` via `resources.Get | transform.Unmarshal` at template-render time. Task 1's `generate-content.js` extension copies the file verbatim so the JSON content is byte-identical.

2. **sortByOrder → explicit $order iteration.** Eleventy's `repositories | sortByOrder(repoOrder)` is a custom filter. Hugo port iterates the hardcoded `$order` slice `["pe-bn","co-ahjci","co-ahr","co-ahrb","co-cihjml"]` and looks up each code with `where`. Output sequence is identical.

3. **numberFormat → lang.FormatNumber 0 N.** Eleventy's `numberFormat` filter uses a regex to insert dot separators. Hugo's `lang.FormatNumber 0 N` uses the site locale (es-CO per hugo.toml) which defaults to the same Latin convention. Output byte-identical for the displayed integers.

   **Execution note:** Initial plan proposed `lang.FormatNumberCustom 0 X "" "," "."` which compiled but returned unformatted output (no thousands separator). Hugo's `FormatNumberCustom` takes a single options string like `"- , ."`, not 3 separate strings. Swapped to the simpler `lang.FormatNumber 0 N` form which leverages the site's already-configured locale.

## scripts/generate-content.js extension

Added at the top of `main()` right after DATA_DIR/DEV_LIMIT logging:

```js
const repositoriesSrc = path.join(DATA_DIR, 'repositories.json');
const repositoriesDst = path.join(OUT_DIR, 'repositories.json');
if (fs.existsSync(repositoriesSrc)) {
  fs.copyFileSync(repositoriesSrc, repositoriesDst);
  console.log(`[generate-content] repositories.json copied (${fs.statSync(repositoriesDst).size.toLocaleString()} bytes)`);
} else {
  console.warn(`[generate-content] WARN: ${repositoriesSrc} not found ...`);
}
```

Version bumped v1.0.0 → v1.0.1. Narrative header gained one "Side-step" paragraph explaining the copy step's purpose.

**Resulting log line on every run:** `[generate-content] repositories.json copied (14,071 bytes)`.

## Chassis + existing pages regression check

All prior pages verified unaffected:
- `/` now renders the real home page (shadowing `_default/list.html` bridge stub as expected)
- `/buscar/` still renders the search page from Plan 13-06
- `/404.html` still renders the 404 page from Plan 13-06
- `/descripcion/`, `/entidad/`, `/lugar/` still render via the bridge stub (chassis only, no content) — these get their real templates in Plans 13-09+

Zero new Hugo WARNs. The zero-WARN state established in Plan 13-05 (after `.Site.Data` → `hugo.Data` migration) persists.

## Count freshness observation

Local DEV build and zasqua.org differ by one count: local shows `10.569` for co-ahrb, zasqua.org shows `10.524`. This is an exports data-freshness divergence (exports/repositories.json on this machine reflects a later B2 sync than zasqua.org's last deployment), NOT a port issue. If the same `exports/repositories.json` were used in both builds, counts would match byte-for-byte.

## Forward pointer for Plan 13-08

Plan 13-08 ports `src/repository.njk` (87 lines) to `/{repo_code}/` detail pages. Needs:
- One content file per repository OR a Hugo content adapter that emits a page per entry in `assets/hugo-data/repositories.json`. Preferred: content adapter at `content/repository/_content.gotmpl`, mirroring the pattern used in Plan 13-03 for descripcion/entidad/lugar
- Template at `layouts/repository/single.html`
- Repository data shape includes `root_descriptions` — an array of fonds-level descriptions per repo, used to link from the landing into top-level fonds pages
- Link/URL scheme: per D-18, repositories live at `/{repo_code}/` (e.g., `/pe-bn/`, `/co-ahr/`) — these are short codes, not the reference_codes used for descriptions

One gotcha: the Eleventy template currently handles both repository landings and a related "collection" page (`/pe-bn-cdip/`). The "collection" concept may need its own plan or may be absorbed into repository landings. Investigate during Plan 13-08 planning.

## Version

Version: v1.0.0
