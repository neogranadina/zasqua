# Codebase Concerns

**Analysis Date:** 2026-03-24

## Tech Debt

**Duplicated repository metadata in index.njk and repository.njk:**
- Issue: Repository display names, subtitles, images, and categories are hardcoded in both `src/index.njk` (lines 37-67) and `src/repository.njk` (lines 14-38) using chains of `{% if repo.code == "..." %}` blocks. Adding a new repository requires updating both files identically.
- Files: `src/index.njk`, `src/repository.njk`
- Impact: Inconsistent display when one file is updated but not the other. Every new repository requires editing two templates.
- Fix approach: Move repository display metadata (title overrides, subtitles, images, categories) into a data file (e.g. `src/_data/repoDisplay.js` or extend `repositories.json` from the backend export). Both templates would then read from one source.

**Monolithic search.js (1,610 lines):**
- Issue: `src/js/search.js` contains the entire search page — state management, URL parsing, Pagefind integration, all rendering (facets, results, pills, pagination, date tree), event handling, and utility functions — in a single class.
- Files: `src/js/search.js`
- Impact: Any modification to one concern (e.g. changing facet rendering) risks breaking unrelated functionality. The file is difficult to review and reason about.
- Fix approach: Extract into modules: `SearchState` (URL parsing, state), `SearchRenderer` (DOM rendering), `SearchFacets` (facet/date tree rendering), and utility functions. Use ES modules or a simple build step.

**Monolithic main.css (2,489 lines):**
- Issue: All styles live in a single `src/css/main.css` covering header, hero, search, repository, description detail, Miller columns, IIIF viewer, breadcrumbs, pagination, responsive breakpoints, and more.
- Files: `src/css/main.css`
- Impact: Hard to locate styles for a specific component. Risk of unintended cascade side effects when modifying styles.
- Fix approach: Split into component-level CSS files (e.g. `search.css`, `tree.css`, `description.css`) and either concatenate during build or use CSS `@import` with a bundler.

**Duplicated data directories (~500 MB total):**
- Issue: Export data exists in both `data/` (254 MB, used at build time) and `src/_data/export/` (247 MB, appears to be an older copy with slightly fewer files). Both are gitignored, but the duplication wastes disk space and can cause confusion about which is canonical.
- Files: `data/`, `src/_data/export/`
- Impact: `src/_data/descriptions.js` reads from `data/` (via `DATA_DIR`), so `src/_data/export/` appears to be a stale leftover. Developers may accidentally reference the wrong copy.
- Fix approach: Remove `src/_data/export/` if it is unused, or consolidate to a single location. Update `.gitignore` and `build.sh` accordingly.

**TIFY vendor bundle is committed without version tracking:**
- Issue: `src/vendor/tify/tify.js` (391 KB) and `src/vendor/tify/tify.css` (32 KB) are committed directly without any version metadata, lockfile reference, or update mechanism.
- Files: `src/vendor/tify/tify.js`, `src/vendor/tify/tify.css`
- Impact: No way to know which TIFY version is in use or whether security patches have been released. Updates require manual download and replacement.
- Fix approach: Add a `vendor/tify/VERSION` file documenting the exact version and download URL. Consider loading TIFY from a CDN with SRI hashes, or adding it as an npm dependency.

**Hardcoded UI strings in search.js:**
- Issue: Many Spanish UI strings are hardcoded directly in `src/js/search.js` (e.g. "Filtrar por:", "Buscar en resultados...", "Ordenar por:", "Fecha (inicial)", "Limpiar filtros", etc.) rather than drawn from the `ui.js` data file.
- Files: `src/js/search.js`
- Impact: Inconsistency with the i18n approach used in Nunjucks templates. If the site ever needs to support multiple languages or if wording changes, these strings would be missed.
- Fix approach: Pass all UI labels into the `SearchPage` constructor via `data-*` attributes on the container element (as is already done for `levelLabels` and `facetLabels`), and reference them consistently.

**Hardcoded filter string in tree.js:**
- Issue: The column filter placeholder "Filtrar..." in `src/js/tree.js` (line 58) is hardcoded in Spanish rather than passed through as a configurable label.
- Files: `src/js/tree.js`
- Impact: Same i18n concern as search.js — inconsistent with the data-driven approach elsewhere.
- Fix approach: Pass filter placeholder via the container's `data-*` attributes or an options object.

## Security Considerations

**No security headers on served content:**
- Risk: The Cloudflare Worker (`worker/worker.js`) sets `content-type`, `cache-control`, and `etag` but does not set any security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security).
- Files: `worker/worker.js`
- Current mitigation: None. The site is static and read-only, which limits attack surface, but clickjacking and content sniffing are still possible.
- Recommendations: Add `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or `SAMEORIGIN`), `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` headers. Consider a basic CSP that allows Google Fonts, Cloudflare analytics, and inline scripts.

**Missing `rel="noopener"` on some external links:**
- Risk: `target="_blank"` links without `rel="noopener"` in older browsers could allow the opened page to access `window.opener`.
- Files: `src/_includes/footer.njk` (lines 4 — two links missing `rel="noopener"`)
- Current mitigation: Modern browsers default to `noopener` for `target="_blank"`, but older browsers do not.
- Recommendations: Add `rel="noopener"` to all `target="_blank"` links in `src/_includes/footer.njk`. The links in `src/description.njk` already have it.

**Cloudflare Web Analytics token in base template:**
- Risk: The Cloudflare beacon token `bd05fe4ac01547849248727c0598306e` is embedded in `src/_layouts/base.njk` (line 34). This is standard practice for analytics snippets and is not a secret (it is a write-only analytics token), but it is worth noting for awareness.
- Files: `src/_layouts/base.njk`
- Current mitigation: Token is write-only; cannot be used to read analytics data.
- Recommendations: No immediate action needed. If the site is open-source, this is expected.

**innerHTML used with user-influenced data in search.js:**
- Risk: `src/js/search.js` uses `innerHTML` in several places. Most are safe (static HTML strings), but `renderResultCard` sets `link.innerHTML` (line 595) using the output of `highlightTerms(escapeHtml(...))`. The `escapeHtml` call provides XSS protection, but the subsequent `highlightTerms` injects `<mark>` tags using regex replacement on the escaped string, which could theoretically produce malformed HTML if the regex interacts with escaped entities.
- Files: `src/js/search.js` (lines 595, 632)
- Current mitigation: `escapeHtml()` runs first, and `highlightTerms` only adds `<mark>` tags. The Pagefind excerpt (line 632) comes from the Pagefind index, not raw user input.
- Recommendations: Low risk given the current flow, but consider using `textContent` where possible and only using `innerHTML` for Pagefind excerpts that already contain `<mark>` tags.

## Performance Bottlenecks

**106,503-page Eleventy build:**
- Problem: The site generates over 106,000 static HTML pages — one per archival description. Build time requires `--max-old-space-size=6144` (CI) or `7168` (local) to avoid OOM, and uses a progress logging transform to track the multi-minute build.
- Files: `eleventy.config.js`, `build.sh`, `.github/workflows/deploy.yml`
- Cause: Every description record produces a full HTML page at build time. The `descriptions.json` input is 218 MB.
- Improvement path: This is an inherent characteristic of the static site architecture and is managed well (DEV_MODE limits to 100 pages for development). The build is already optimized for the scale. Future growth (more repositories) will increase build time linearly. Monitor and consider incremental builds if Eleventy adds support, or pre-rendering only changed pages.

**Pagefind WASM blocking main thread for large filter-only queries:**
- Problem: Filter-only queries (no text search) over large result sets (~55,000+ results) cause the Pagefind WASM engine to block the main thread for ~5 seconds.
- Files: `src/js/search.js` (lines 193-210)
- Cause: Pagefind's WASM-based search scans all matching results; with no text query to narrow candidates, this is expensive.
- Improvement path: A browse prompt threshold (10,000 results) is already implemented to warn users and offer a "View all" button. This is a pragmatic workaround. True fix would require Pagefind upstream improvements or a complementary server-side search for browse-style queries.

**All descriptions loaded into memory during build:**
- Problem: `src/_data/descriptions.js` reads the entire 218 MB `descriptions.json` into memory, parses it, and then iterates to precompute ancestors and repository lookups for every record.
- Files: `src/_data/descriptions.js`
- Cause: Eleventy's data cascade requires all data to be available as a JavaScript array. The ancestor chain computation (lines 38-51) walks up the tree for each description.
- Improvement path: The ancestor computation is O(n*d) where d is tree depth — this is acceptable. The memory pressure is managed via Node's `--max-old-space-size`. If the dataset grows significantly, consider streaming JSON parsing or splitting the data file.

**CSS and JS not minified or bundled:**
- Problem: `src/css/main.css` (2,489 lines) and `src/js/search.js` (1,610 lines) are served unminified. No build step compresses or bundles assets.
- Files: `src/css/main.css`, `src/js/search.js`, `src/js/tree.js`, `src/js/description.js`
- Cause: Intentional simplicity — no bundler in the stack. Eleventy passes through CSS/JS as-is.
- Improvement path: Add a lightweight minification step (e.g. `esbuild` or `lightningcss`) to the build pipeline. The `cache-control` for CSS/JS is already set to 7 days, so the unminified size is mainly a first-load concern.

**Google Fonts loaded from CDN on every page:**
- Problem: Three font families (Cormorant Garamond, IM Fell DW Pica, Lato) plus Material Symbols are loaded from Google Fonts on every page load via external CSS.
- Files: `src/_layouts/base.njk` (lines 11-14)
- Cause: Convenience of CDN-hosted fonts.
- Improvement path: Consider self-hosting the font files (subset to required characters/weights) to eliminate the external dependency and the two DNS lookups (`fonts.googleapis.com`, `fonts.gstatic.com`). This also improves privacy.

## Fragile Areas

**TIFY viewer integration via DOM manipulation:**
- Files: `src/js/description.js` (lines 43-121)
- Why fragile: The description.js script waits 1,500ms via `setTimeout` for TIFY to render its Vue-based UI, then queries TIFY's internal DOM structure (`.tify-header`, `.tify-header-column`, `.tify-header-popup`, `.tify-header-button`) to inject custom controls. It also programmatically clicks TIFY's native buttons to toggle thumbnails.
- Safe modification: Any TIFY version update that changes its internal DOM structure will break these custom controls silently. Test viewer functionality after any TIFY update.
- Test coverage: No automated tests exist for this integration.

**Repository display order hardcoded:**
- Files: `src/index.njk` (line 28)
- Why fragile: `{% set repoOrder = ["pe-bn","co-ahjci", "co-ahr", "co-ahrb", "co-cihjml"] %}` must be manually updated when repositories are added or reordered.
- Safe modification: Add new repository codes to this array and to the if-blocks below. Consider moving to a data file.
- Test coverage: None.

**Children JSON fetch path assumption:**
- Files: `src/js/tree.js` (line 195)
- Why fragile: `fetch(`/data/children/${parentId}.json`)` assumes the static JSON files exist at a predictable URL pattern. If a parent has children but no corresponding JSON file was exported, the tree silently fails for that node (caught error logged to console).
- Safe modification: The error is caught, but no user-visible feedback is shown when a children file is missing.
- Test coverage: None.

## Accessibility Gaps

**Focus outlines suppressed:**
- Files: `src/css/main.css` (lines 189, 351, 855, 1055, 1958)
- Issue: Multiple `outline: none` declarations without replacement focus indicators. This makes keyboard navigation difficult for users who rely on visible focus.
- Fix approach: Replace `outline: none` with custom focus-visible styles (e.g. `outline: 2px solid var(--accent-primary); outline-offset: 2px`) using `:focus-visible` to avoid showing outlines on mouse click.

**Miller columns tree not keyboard-accessible:**
- Files: `src/js/tree.js`
- Issue: Tree items use `<li>` elements with click handlers but no `tabindex`, `role`, or keyboard event handlers. Users cannot navigate the Miller columns tree with keyboard alone.
- Fix approach: Add `tabindex="0"` and `role="treeitem"` to items. Add `keydown` handlers for Enter/Space (select), Arrow keys (navigate within column), and Right/Left arrows (navigate between columns).

**Search facets lack proper ARIA roles:**
- Files: `src/js/search.js` (facet rendering, ~lines 766-836)
- Issue: Facet groups use `<div>` containers with `<button>` toggles but no `role="group"`, `aria-expanded`, or `aria-controls` attributes linking toggles to their content panels.
- Fix approach: Add `role="group"` and `aria-labelledby` to facet content containers. Add `aria-expanded` to toggle buttons.

**Date tree checkboxes lack associated labels:**
- Files: `src/js/search.js` (date tree rendering, ~lines 838-1068)
- Issue: Checkboxes in the date tree are created as bare `<input type="checkbox">` elements next to `<span>` labels, but without `<label>` elements wrapping them or `for`/`id` attributes linking them. Screen readers may not announce what each checkbox controls.
- Fix approach: Wrap each checkbox and its label span in a `<label>` element, or add `id` to checkboxes and `for` attributes to label spans.

**Search results lack skip link or landmark:**
- Files: `src/js/search.js`
- Issue: After filtering, keyboard users must tab through all sidebar facets to reach the results. No skip link or `role="search"` landmark helps them jump to results.
- Fix approach: Add `role="search"` to the search form area. Add a visually hidden skip link at the top of the sidebar that targets the results region.

## Scaling Limits

**Static site build scales linearly with descriptions:**
- Current capacity: ~106,500 pages, ~2.8 GB output, requiring 6-7 GB Node heap.
- Limit: At ~200,000-250,000 descriptions, the build will likely exceed GitHub Actions' 7 GB memory limit and 60-minute timeout.
- Scaling path: Increase runner size (GitHub Actions large runners), or adopt incremental/partial builds. The `data/children/` passthrough (1,612 JSON files) is efficient; the bottleneck is Eleventy's page generation.

**R2 deployment uploads every file on each deploy:**
- Current capacity: ~106,500 files, ~2.8 GB, uploaded at ~100 concurrent threads.
- Limit: Upload time increases linearly. At 200K+ files, deployment may exceed 60-minute timeout.
- Scaling path: `scripts/upload-to-r2.py` could be enhanced to compare file hashes and skip unchanged files (differential upload). Currently it uploads everything unconditionally.

**Pagefind index size:**
- Current capacity: The Pagefind index covers 106K+ pages including OCR text. Index files are served as static assets from R2.
- Limit: As the corpus grows, the initial Pagefind WASM + index download will increase, affecting first-search latency on slow connections.
- Scaling path: Pagefind handles chunked index loading well. Monitor the total index size and first-search latency as the corpus grows.

## Test Coverage Gaps

**No automated tests exist:**
- What's not tested: The entire codebase — JavaScript (search, tree, description), Nunjucks templates, Eleventy filters, data loading, and the Cloudflare Worker — has zero automated tests.
- Files: All of `src/js/`, `src/_data/`, `eleventy.config.js`, `worker/worker.js`
- Risk: Any change to search logic, facet rendering, tree navigation, data loading, URL parsing, or the serving worker could introduce regressions undetected. The search.js file (1,610 lines) is particularly high-risk given its complexity.
- Priority: High. At minimum, add tests for: (1) Eleventy custom filters in `eleventy.config.js`, (2) URL parsing and state management in search.js, (3) the Cloudflare Worker's routing and content-type logic, (4) data loading in `src/_data/descriptions.js`.

## Dependencies at Risk

**Single devDependency with broad version range:**
- Risk: `@11ty/eleventy: ^3.1.2` is the only npm dependency. The `^` range allows minor version updates that could introduce breaking changes in Eleventy's API.
- Impact: A `npm ci` on a fresh environment could pull a newer Eleventy version with different behavior.
- Migration plan: Low risk in practice — Eleventy maintains good semver discipline. The `package-lock.json` pins the exact version. Consider pinning to exact version in `package.json` for extra safety.

---

*Concerns audit: 2026-03-24*
