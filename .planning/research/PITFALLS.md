# Pitfalls Research

**Domain:** Hugo migration from Eleventy — 192K-page archival static site with data-driven pages, Pagefind search, and Tailwind CSS v4
**Researched:** 2026-04-16
**Confidence:** HIGH (Hugo-specific pitfalls, verified against official docs and Hugo Discourse), MEDIUM (Pagefind multi-index behaviour), HIGH (Tailwind/Hugo Pipes requirements)

---

## Critical Pitfalls

### Pitfall 1: `.Site.Data` loads all JSON into memory and holds it for the entire build

**What goes wrong:**
Placing the large data files (`descriptions.json`, `entities.json`, `places.json`, combined ~370 MB) in Hugo's `data/` directory causes Hugo to parse every file into a combined in-memory structure at startup and hold it there for the full build. Unlike Eleventy's pagination which loads data lazily, `.Site.Data` is fully materialised before any template renders. At 370 MB of JSON, this single step uses significant heap before any page is generated. The project is also storing entity shards, place shards, children trees, and index files — these must not go in `data/`.

**Why it happens:**
The Hugo documentation states: "Hugo reads the combined data structure into memory and keeps it there for the entire build." The official guidance for infrequently accessed data is to use `resources.Get` + `transform.Unmarshal` instead. Most Hugo migration guides show small data files in `data/` and do not address the large-dataset case.

**How to avoid:**
Use content adapters (Hugo v0.126+) as the primary page-generation mechanism. In the `_content.gotmpl` adapter, load each data file as a global resource (`resources.Get "descriptions.json" | transform.Unmarshal`) rather than from `.Site.Data`. This uses on-demand loading rather than upfront materialisation. Do not put any of the large JSON exports in `data/`. Only put small, frequently referenced configuration data (e.g., repository metadata, UI strings) in `data/` — these are accessed on every page and the overhead is acceptable.

**Warning signs:**
- `hugo --templateMetrics` shows disproportionately long initialisation time before first page renders
- RSS or process monitor shows 2–3 GB memory spike before page generation begins
- Hugo logs show "data file" loading step taking > 30 seconds on a file exceeding 100 MB

**Phase to address:**
Phase 1 (Hugo scaffolding and data architecture) — this decision must be made before any templates are written, because it determines whether pages are generated from content stubs or content adapters.

---

### Pitfall 2: Content adapters cannot access `.Site.Pages` — causes a hard error during template execution

**What goes wrong:**
Content adapters run before the site is fully initialised. Any template call inside a `_content.gotmpl` that queries existing pages — `.Site.Pages`, `.Site.RegularPages`, `.GetPage`, `.Site.Taxonomies` — produces a fatal error: "this method cannot be called before the site is fully initialized." If the adapter tries to cross-reference descriptions against an already-generated entity page list (e.g., to resolve a canonical entity URL), the build will abort.

**Why it happens:**
Content adapters are designed to define pages, not to query pages. Hugo's build pipeline runs adapters before the page tree is assembled. This is a deliberate architectural constraint, not a bug.

**How to avoid:**
All cross-referencing between data sets (descriptions ↔ entities, descriptions ↔ places) must happen in the pre-build Node.js enrichment script, not in the adapter. The adapter's role is purely: read JSON record, emit page. If a description page needs to know an entity's canonical path, that path is pre-computed and stored as a field in the enriched JSON that the adapter reads. Do not attempt dynamic lookups inside the adapter.

**Warning signs:**
- Build aborts with `error calling Pages: this method cannot be called before the site is fully initialized`
- Any template in `_content.gotmpl` that calls a `.Site.*` method beyond `.Site.BaseURL`, `.Site.Params`, and `.Site.Data` (safe small values)

**Phase to address:**
Phase 1 (data architecture) — pre-build enrichment script must produce fully denormalised JSON so adapters never need to cross-reference live site data.

---

### Pitfall 3: Go template variable scope inside `with` and `range` breaks complex conditionals

**What goes wrong:**
The description template is 413 lines with nested conditionals that set variables inside `if` and `with` blocks and then use them outside. Go templates have strict block scoping — a variable declared with `:=` inside a `with` or `range` block is invisible outside that block. The Nunjucks pattern `{% set x = value %}` used before a condition, then checked after, does not map directly to Go templates.

A secondary failure: Go templates have no ternary operator. Complex `{% if a %}X{% elif b %}Y{% else %}Z{% endif %}` chains become deeply nested `{{ if a }}X{{ else }}{{ if b }}Y{{ else }}Z{{ end }}{{ end }}` constructs, which compound the scoping problem — variables set inside each branch cannot be promoted to the outer scope.

**Why it happens:**
Go's template engine has stricter scoping than JavaScript-based engines. The `=` reassignment operator (available in Go 1.11+ and Hugo templates since ~v0.48) allows reassigning a variable declared in an outer scope, but only if the variable was declared in that outer scope with `:=` first. Developers porting from Nunjucks expect Jinja-style scoping and are caught by this repeatedly.

**How to avoid:**
For each complex conditional chain in the 413-line description template, audit the variable use pattern before porting. If a value is conditionally set and then used later, declare a `$var` with a zero value before the block, then reassign inside (`$var = newValue`). For very complex sections (e.g., the ISAD(G) metadata rendering), extract to named partials — each partial gets its own scope and returns a value cleanly. Use `partialCached` for partials that are identical across pages of the same type.

For the `countryName` filter (uses `Intl.DisplayNames` in Eleventy, Node.js only), there is no built-in Go equivalent. Use a small pre-built lookup map (`data/countries.json`) for the ~10 country codes actually present in the data, and look up via `index .Site.Data.countries $code`.

**Warning signs:**
- Build errors containing `$varName: variable not defined`
- Template producing empty output where values should appear, without errors (variable shadows)
- Hugo `--templateMetrics` showing very high cache potential on a partial that is called 100K times (correct direction — add `partialCached`)

**Phase to address:**
Phase 2 (template porting) — the description template is the highest-risk file and should be ported last, with breadcrumb, header, and simpler templates validated first.

---

### Pitfall 4: Hugo Pipes requires Hugo Extended — standard Hugo binary silently omits CSS processing

**What goes wrong:**
The `css.TailwindCSS` Hugo Pipes function is only available in the Hugo Extended edition. If CI installs standard Hugo (e.g., via `apt-get install hugo` on Ubuntu, or the default GitHub Actions `peaceiris/actions-hugo` action without specifying `extended: true`), the build appears to succeed but CSS is not processed through Tailwind — either the pipeline throws a silent error that is swallowed, or it falls back to serving the raw CSS file without purging. The result is a site that looks correct in dev (where the full Tailwind CDN is available) but is missing utility classes in production.

**Why it happens:**
Hugo has two binaries: `hugo` (standard) and `hugo_extended`. Hugo Extended bundles libsass and additional asset pipeline support including Hugo Pipes for CSS transformations. The distinction is not visible in `hugo version` output beyond the `+extended` tag. Many install guides omit the distinction.

**How to avoid:**
Always install `hugo_extended` in CI. In `peaceiris/actions-hugo`, set `extended: true`. Verify with `hugo version` — output must contain `+extended`. For the standalone Tailwind binary approach (which this project currently uses), confirm the binary is on PATH in the CI environment and that Hugo's configuration specifies `binary: "tailwindcss"` in the `css.TailwindCSS` call options. Test CSS output in a clean CI run before any templates are ported.

Note: As of Hugo v0.146.0 there was a regression where PATH is no longer checked for the standalone `tailwindcss` binary (issue #13617). Pin to a Hugo version below that regression or use the npm Tailwind approach if the binary approach fails.

**Warning signs:**
- `hugo version` output does not include `+extended`
- `hugo build` succeeds with no CSS transformation errors, but `public/css/` contains raw unreprocessed CSS
- Missing utility classes in the deployed site that are present in the input CSS
- Error: `feature not available in your current Hugo version: css.TailwindCSS`

**Phase to address:**
Phase 1 (CI scaffolding) — verify Hugo Extended is installed and CSS processes correctly before any template work begins.

---

### Pitfall 5: `hugo_stats.json` in `.gitignore` silently breaks Tailwind class detection

**What goes wrong:**
When Hugo is configured to emit `hugo_stats.json` (via `[build] buildStats.enable = true`), it writes a file listing all classes, IDs, and tags found in rendered templates. Tailwind v4 uses this as a content source to determine which utility classes to include. If `hugo_stats.json` is listed in `.gitignore` (which it is in standard Hugo `.gitignore` templates), Tailwind's `@source` directive will silently skip the file, producing a CSS file that is missing every class first introduced by a Go template (i.e., most dynamic classes). The build succeeds and reports no errors.

**Why it happens:**
Tailwind v4 respects `.gitignore` files when scanning content sources. Hugo's own example `.gitignore` excludes `hugo_stats.json` because it is a generated file. The two tools' conventions conflict. Neither tool warns about the other's behaviour.

**How to avoid:**
Either remove `hugo_stats.json` from `.gitignore` or add an explicit `@source "../../hugo_stats.json";` override before the `.gitignore`-exclusion kicks in. The Hugo docs note this explicitly: "if `hugo_stats.json` is listed in your `.gitignore` file, Tailwind CSS will ignore it." Add a CI check that fails if `hugo_stats.json` is absent from the build output directory.

**Warning signs:**
- `public/css/styles.css` output is very small (< 10 KB for this site's Tailwind usage) indicating few classes survived purging
- Utility classes that appear in Go templates but are absent from `hugo_stats.json` — verify with `cat hugo_stats.json | jq '.htmlElements.classes | length'`
- Site looks correct with Tailwind CDN (dev) but broken in production (purged CSS)

**Phase to address:**
Phase 1 (CI scaffolding) — test CSS output explicitly in the first CI run, not after all templates are ported.

---

### Pitfall 6: Spanish date formatting (`15 de enero de 1820`) has no native Hugo equivalent

**What goes wrong:**
The current Eleventy `formatDate` filter produces locale-specific Spanish date strings including month names in Spanish (`enero`, `febrero`, etc.), the `de` preposition between day/month/year, and range dates using ` .. ` separators. Hugo's `time.Format` function produces English-only month names even with `languageCode = "es"` unless the locale is configured, and it cannot handle the partial dates (`YYYY-MM`, `YYYY`), range strings (`YYYY-MM-DD .. YYYY-MM-DD`), or the ISAD(G) date expressions stored in `date_expression` which mix free text with structured dates.

The `gohugoio/locales` package used by Hugo's `time.Format ":date_medium"` does support Spanish locale — but only for properly parsed `time.Time` values. The date strings in `date_expression` are not parseable as `time.Time` in many cases (partial dates, ranges, free text like "ca. 1780").

**Why it happens:**
Hugo's date functions are designed for front-matter dates (ISO 8601 full timestamps). The archival date strings in this project are ISAD(G) date expressions, which are a domain-specific partially structured text format, not ISO timestamps. There is no Hugo built-in that handles this format.

**How to avoid:**
Implement the `formatDate` logic in the pre-build enrichment script. For each record, add a `date_formatted` field containing the pre-rendered Spanish string. The Go template simply outputs this pre-computed value. This approach eliminates the need to replicate complex date parsing logic in Go template syntax and guarantees identical output to the existing Eleventy filter. The enrichment script already runs Node.js, so the existing `formatDateNarrative` function can be reused directly.

For `numberFormat` (thousands separator using `.` in Colombian Spanish): Go templates have `lang.FormatNumber` which respects locale settings, but the specific period-as-thousands-separator convention requires `language = "es-CO"` in `hugo.toml` and using `lang.FormatNumber 0 $num` — verify this produces `1.234.567` not `1,234,567` before relying on it. If not, pre-compute formatted numbers in the enrichment script.

**Warning signs:**
- Date fields showing raw strings like `1820-03-15` instead of `15 de marzo de 1820` in the rendered output
- `time.AsTime` errors on partial dates (`1820-03`) in build logs
- `lang.FormatNumber` producing comma-separated thousands instead of period-separated

**Phase to address:**
Phase 2 (enrichment script) — extend the pre-build script to pre-compute all formatted display values before template porting begins. Do not attempt to replicate the date logic in Go templates.

---

### Pitfall 7: Content file generation at 192K files — filesystem pressure and git tracking

**What goes wrong:**
If the migration strategy generates 192K stub Markdown files in `content/` before each build (one per description, entity, place), two problems emerge: (1) the `content/` directory cannot be committed to git — adding 192K tracked files makes every `git status` and `git diff` unusably slow and bloats the repository; (2) file creation at this scale takes non-trivial time on GitHub Actions runners where the ephemeral filesystem has lower throughput than local SSDs.

A secondary problem: if stub files are committed and then the data changes (new descriptions added), the commit-diff approach requires tracking which stubs to add, modify, or delete, which reintroduces the complexity that content adapters eliminate.

**Why it happens:**
Early Hugo migration guides predate content adapters (added in v0.126.0) and recommend stub-file generation scripts. This approach was reasonable for <10K pages but does not scale to 192K.

**How to avoid:**
Use content adapters exclusively — do not generate stub files. Content adapters read JSON data directly and emit pages without touching the filesystem. The `_content.gotmpl` file is the only file committed; the generated pages exist only in memory during the build. This matches the Eleventy pagination model closely and eliminates all filesystem pressure.

If a hybrid approach is unavoidable for some page type, gitignore the generated `content/` subdirectory and regenerate it in CI before `hugo build`. Do not commit generated content files.

**Warning signs:**
- `git status` hangs or takes > 5 seconds in the repo with stub files present
- CI step "generate content stubs" takes > 2 minutes to create 192K files
- Incremental `git add` of changed stubs takes longer than a full Hugo build

**Phase to address:**
Phase 1 (data architecture) — the content adapter vs. stub file decision must be made and validated with a prototype before any templates are ported.

---

### Pitfall 8: Pagefind `data-pagefind-*` attributes in Go templates require explicit passthrough

**What goes wrong:**
In Hugo, template output is HTML-escaped by default. Expressions like `data-pagefind-filter="repository"` in a Go template are safe — they are literal attribute names, not interpolated values. However, the values written into Pagefind metadata attributes often contain characters that could be double-escaped. If a description title contains `&` or `<`, the Pagefind metadata attribute value will contain the escaped entity, which Pagefind reads verbatim — search results then display `&amp;` instead of `&`.

A second, distinct problem: Hugo's template context (`.`) changes inside `range` and `with` blocks. The current Nunjucks template uses `{{ desc.title }}` and `{{ repo.short_name or repo.name if repo else desc.repository_code }}` in Pagefind metadata blocks — these ternary-style expressions require rewriting as `{{ with .Params.repo }}{{ .short_name | default .name }}{{ else }}{{ $.Params.repository_code }}{{ end }}`.

**Why it happens:**
Hugo HTML-escapes values by default for security. Pagefind's indexer reads text content from the DOM, so double-escaped HTML entities in attribute values or hidden text end up in the search index verbatim. The pattern is invisible in local testing where titles are clean ASCII.

**How to avoid:**
Use `{{ .Params.title | safeHTML }}` only for content rendered visibly. For hidden metadata elements that Pagefind reads, do not use `safeHTML` — let Hugo's escaping produce the correct HTML entity. Pagefind decodes HTML entities when reading attribute values and element text. The issue arises only if the enrichment script writes pre-escaped entities into the JSON (double-escaping). Verify the enrichment script outputs raw strings, not HTML-escaped strings.

For the `data-pagefind-filter="ancestor"` loop that emits one span per ancestor (currently using `{% for anc in desc._ancestors %}`), rewrite as `{{ range .Params._ancestors }}<span data-pagefind-filter="ancestor">{{ .reference_code }}</span>{{ end }}` — verify the dot context is the ancestor object inside the range, not the page.

**Warning signs:**
- Pagefind returns results where titles display `&amp;` instead of `&`
- `data-pagefind-filter` values in source HTML contain double-encoded entities
- Facet filter values in the search UI show raw HTML entities

**Phase to address:**
Phase 3 (description template) — add a Pagefind integration test that checks metadata attribute values for a description with special characters in the title before considering the template done.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Putting large JSON files in Hugo `data/` | Simple `.Site.Data.descriptions` access | All 370 MB parsed into memory before first page renders; memory pressure throughout build | Never — use `resources.Get` + `transform.Unmarshal` in content adapters |
| Generating 192K stub Markdown files in `content/` | Familiar content-file workflow | git unusable with tracked stubs; filesystem creation time adds 2–5 min to CI; deletion/recreating stubs on every build has own overhead | Never for data-driven pages — use content adapters |
| Using standard Hugo binary (not Extended) | Easier install | `css.TailwindCSS` silently unavailable; CSS not processed in production | Never — always install `hugo_extended` |
| Reimplementing `formatDate` in Go templates | No extra pre-build step | Complex Go template logic for date parsing that is fragile, hard to test, and must duplicate existing JS | Never — pre-compute in enrichment script |
| Replicating `countryName` filter via JS `Intl.DisplayNames` in Go templates | Consistent with Eleventy behaviour | `Intl.DisplayNames` does not exist in Go; requires either a full lookup table or an external library | Acceptable only as a small data file (`data/countries.json`) for the ~10 codes in the dataset |
| Using `partialCached` without a cache key | Faster builds | Cached output is shared across all pages regardless of per-page variation | Never for partials with page-specific content — always pass a discriminating cache key |
| Skipping `--templateMetrics` during development | Faster iteration | Performance regressions accumulate silently; hard to find bottlenecks later | Acceptable during initial porting; run before each phase sign-off |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Hugo Pipes + Tailwind v4 | Install standard `hugo` binary | Always install `hugo_extended`; check `hugo version` output for `+extended` in CI logs |
| Tailwind v4 + `hugo_stats.json` | Add `hugo_stats.json` to `.gitignore` per standard Hugo gitignore templates | Either remove from `.gitignore` or add explicit `@source` override before Tailwind scans; add CI check for file presence |
| Tailwind standalone binary + Hugo Pipes | Assume binary on PATH is found by Hugo | Specify `binary: "tailwindcss"` explicitly in `css.TailwindCSS $opts`; pin Hugo version below v0.146.0 if PATH regression affects the CI environment |
| Pagefind + Hugo build output | Run `pagefind` on `public/` immediately after `hugo build` | Pagefind must run after Hugo emits all HTML; in CI, `pagefind --site public/` as a separate step after `hugo --minify`; Pagefind output goes into `public/pagefind/` and is then uploaded alongside the site |
| Three separate Pagefind indexes (descriptions, entities, places) | Run one `pagefind` pass over all of `public/` | Keep the three-index architecture: use `data-pagefind-ignore` on page types not belonging to each index, or run three separate `pagefind` invocations targeting different subsets via `--root-selector` or separate output directories |
| Content adapters + multilingual | Adapter runs once by default for the primary language | If the site ever adds a second language, add `{{ .EnableAllLanguages }}` to the adapter; for now this is a future-proofing note only |
| Hugo + R2 upload | Upload script uses `_site/` path (Eleventy output) | Hugo default output is `public/`; update `upload-to-r2.py` to target `public/` or configure `publishDir = "_site"` in `hugo.toml` to preserve the existing upload script path |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Calling `partial` (not `partialCached`) for shared components on 192K pages | Build time scales linearly with page count for identical partial output | Use `partialCached` with a type-level cache key (e.g., `partialCached "header.html" .Type`) for site-wide static partials | At ~10K pages — perceptible; at 100K+ pages — severe |
| Using `.Site.Data` for the 370 MB JSON corpus | 370 MB in memory before first page renders; Hugo may exceed GitHub Actions runner memory | Load per-dataset via `resources.Get` in content adapters | Immediately — any file over ~50 MB in `data/` is a risk |
| `range` over 192K items in a single template | Template execution time for the range loop itself; Go GC pressure | Never range over the full dataset in a template — range in the content adapter, one record per page | At ~50K items — noticeable stall during template execution phase |
| No `partialCached` key variation on entity-type partials | Entity page partial cache hits on wrong content | Always pass `.Params.entity_type` or `.Params.reference_code` as the cache key variation where output differs per record | First page render — produces wrong output silently |
| `--renderToMemory` with 370 MB data + 192K pages | Memory pressure from keeping all rendered pages in memory simultaneously | Use default disk rendering in CI; `--renderToMemory` is for dev speed, not large builds | Depends on available RAM — risky above ~100K pages with data-rich templates |
| Hugo build without `HUGO_MEMORYLIMIT` set on GitHub Actions | Hugo's automatic memory detection may be too aggressive or too conservative on the runner | Set `HUGO_MEMORYLIMIT` explicitly (in GB) in the CI environment; start at `6` and adjust based on observed usage | Hugo v0.123.0+ uses streaming builds when limit is set — essential for 192K pages |

---

## "Looks Done But Isn't" Checklist

- [ ] **Hugo Extended confirmed:** `hugo version` in CI logs shows `+extended` — if absent, Tailwind processing will silently fail
- [ ] **CSS completeness test:** `public/css/styles.css` after a full CI build contains the Tailwind utility classes used in templates — spot-check 5 classes from the description template
- [ ] **`hugo_stats.json` present:** File appears in the build working directory and is not excluded by `.gitignore` when Tailwind scans it
- [ ] **Date display correct:** A description with `date_expression = "1820-03-15 .. 1821-06-20"` renders `15 de marzo de 1820 – 20 de junio de 1821`, not the raw ISO string
- [ ] **Thousands separator correct:** A description with `extent = 1234` renders `1.234` (period-separated), not `1,234` (comma-separated)
- [ ] **Pagefind metadata intact:** Hidden Pagefind filter spans are present in rendered HTML for a description page — check `<span data-pagefind-filter="repository">` etc. in source view
- [ ] **Breadcrumb ancestors render:** A deeply nested description (4+ levels) shows the full ancestor chain in the breadcrumb, not just immediate parent
- [ ] **Variable scope in conditionals:** ISAD(G) fields that are conditionally absent (e.g., `scope_content` on file-level items) produce no output and no empty section heading, not a blank `<div>`
- [ ] **R2 upload path:** Upload script targets `public/` (Hugo default) not `_site/` (Eleventy default) — or `publishDir` is set in `hugo.toml`
- [ ] **Content adapter page count matches Eleventy:** Hugo build produces the same number of description, entity, and place pages as the previous Eleventy build — confirm with `find public/ -name "index.html" | wc -l`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| `.Site.Data` OOM during build | MEDIUM | Move data files out of `data/`; rewrite adapter to use `resources.Get`; test with `--templateMetrics` to confirm memory behaviour |
| Missing CSS classes in production | LOW | Check `hugo_stats.json` for missing classes; verify `.gitignore` exclusion; add explicit `@source`; rebuild CSS |
| Wrong Hugo binary (not Extended) | LOW | Update CI action to `extended: true`; re-run build |
| Go template variable scope errors | LOW-MEDIUM per template | Declare all output variables with `:=` before the first conditional block; use `=` reassignment inside blocks; extract complex sections to partials |
| `formatDate` producing raw ISO strings | LOW | Extend enrichment script to pre-compute `date_formatted` field; update templates to use `{{ .Params.date_formatted }}` |
| Page count mismatch after migration | MEDIUM | Run `hugo --printPathWarnings` to detect path collisions; check adapter for off-by-one in range; compare against Eleventy output list |
| Tailwind binary PATH regression (v0.146.0+) | LOW | Pin Hugo to a known-good version in CI; or switch to npm Tailwind install (`@tailwindcss/cli`) — the project already has no other npm dependencies, so this adds a light npm step |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `.Site.Data` OOM from large JSON corpus | Phase 1: Hugo scaffolding and data architecture | Build a prototype with all three data files loaded via `resources.Get`; confirm memory usage under 4 GB on GitHub Actions |
| Content adapters cannot access `.Site.Pages` | Phase 1: data architecture — enrichment script must produce denormalised JSON | No `.Site.Pages` calls in any `_content.gotmpl`; enrichment script tests pass with cross-referenced data |
| Go template variable scope breaking complex conditionals | Phase 2: template porting (description template) | Description template renders correctly for 10 sample records covering all ISAD(G) metadata combinations |
| Hugo Extended not installed in CI | Phase 1: CI scaffolding | `hugo version` step in CI explicitly asserts `+extended` in output |
| `hugo_stats.json` excluded by `.gitignore` | Phase 1: CI scaffolding | CI step verifies `hugo_stats.json` presence; CSS output contains expected utility class count |
| Spanish date formatting missing | Phase 2: enrichment script extension | Automated output comparison: enrichment script `date_formatted` values match expected strings for 20 sample dates including ranges, partial dates, and free-text expressions |
| 192K content stub files in git | Phase 1: data architecture | Content adapter approach adopted; `content/` directory for data-driven pages is either absent or gitignored |
| Pagefind metadata double-escaping | Phase 3: description template | Spot-check 5 descriptions with special characters in titles; verify Pagefind index returns correct display values |
| R2 upload targeting wrong output directory | Phase 4: CI pipeline rewrite | Upload step dry-run confirms `public/` is the source; file count matches expected total |

---

## Sources

- Hugo `data/` memory behaviour (official docs): [gohugo.io/content-management/data-sources/](https://gohugo.io/content-management/data-sources/)
- Hugo content adapters — limitations and `.Site.Pages` constraint: [gohugo.io/content-management/content-adapters/](https://gohugo.io/content-management/content-adapters/)
- Hugo content adapters — performance at scale (20K→100K pages, linear scaling confirmed): [discourse.gohugo.io — content-adapters-examples-and-performance](https://discourse.gohugo.io/t/content-adapters-examples-and-performance/49830)
- Hugo memory management — `HUGO_MEMORYLIMIT` and streaming builds (v0.123.0+): [discourse.gohugo.io — how-to-track-and-reduce-hugo-memory-usage-on-build-getting-oom](https://discourse.gohugo.io/t/how-to-track-and-reduce-hugo-memory-usage-on-build-getting-oom/47245)
- Hugo memory at 350K pages (~15 GB without streaming): [discourse.gohugo.io — why-does-hugo-need-so-much-memory](https://discourse.gohugo.io/t/why-does-hugo-need-so-much-memory-for-big-site/31850)
- Hugo Extended requirement for Hugo Pipes: [discourse.gohugo.io — how-to-configure-hugo-to-use-the-tailwindcss-v4-binary](https://discourse.gohugo.io/t/how-to-configure-hugo-to-use-the-tailwindcss-v4-binary-instead-of-npm/53018)
- Hugo Tailwind `css.TailwindCSS` official docs: [gohugo.io/functions/css/tailwindcss/](https://gohugo.io/functions/css/tailwindcss/)
- Tailwind v4 PATH regression in Hugo v0.146.0: [github.com/gohugoio/hugo/issues/13617](https://github.com/gohugoio/hugo/issues/13617)
- `hugo_stats.json` not generating classes (TailwindCSS v4.x): [discourse.gohugo.io — tailwindcss-4-x-not-generating-classes-from-hugo_stats-json-file](https://discourse.gohugo.io/t/tailwindcss-4-x-not-generating-classes-from-hugo_stats.json-file/55899)
- `hugo_stats.json` + `.gitignore` conflict: [gohugo.io/functions/css/tailwindcss/](https://gohugo.io/functions/css/tailwindcss/) (explicit note in official docs)
- Hugo Go template variable scope and `with` block: [regisphilibert.com — hugo-the-scope-the-context-and-the-dot](https://www.regisphilibert.com/blog/2018/02/hugo-the-scope-the-context-and-the-dot/)
- Hugo template variable scope — `.Scratch` workaround pre-Go 1.11: [discourse.gohugo.io — variable-scope-problem-in-template-override-partial](https://discourse.gohugo.io/t/variable-scope-problem-in-template-override-partial/27942)
- Hugo date localisation — Spanish locale limitations: [discourse.gohugo.io — parsing-custom-date-format-french-spanish](https://discourse.gohugo.io/t/parsing-custom-date-format-french-spanish/39463)
- Hugo date localisation — locale-specific formatting issue tracker: [github.com/gohugoio/hugo/issues/422](https://github.com/gohugoio/hugo/issues/422)
- Hugo build performance — `partialCached`, `--templateMetrics`, `debug.Timer`: [gohugo.io/troubleshooting/performance/](https://gohugo.io/troubleshooting/performance/)
- Hugo 0.126.x content adapters introduction (BryceWray): [brycewray.com — hugo-0-126-x-speedy-pages-data](https://www.brycewray.com/posts/2024/05/hugo-0-126-x-speedy-pages-data/)
- Pagefind + Hugo integration pattern: [pagefind.app/docs/](https://pagefind.app/docs/)

---
*Pitfalls research for: Zasqua Frontend v0.6.0 — Hugo migration (Eleventy → Hugo) for 192K-page archival static site*
*Researched: 2026-04-16*
