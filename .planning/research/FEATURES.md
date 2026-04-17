# Feature Research

**Domain:** Hugo migration and build pipeline sustainability for a 192K-page static archival site
**Researched:** 2026-04-16
**Confidence:** HIGH for Hugo core patterns (verified via official docs, discourse, and release notes); MEDIUM for Pagefind multi-index behaviour at this scale (verified from Pagefind docs and maintainer statements); MEDIUM for diff-based R2 deploy (S3-compatible API confirmed, specific tooling still needs vetting)

---

## Context

This research covers four capability areas required for v0.6.0 — migrating the Zasqua Frontend from Eleventy to Hugo. Eleventy OOMs on GitHub Actions at 192K pages even with a 7 GB heap (exit code 134). The migration must:

1. **Hugo large-scale builds** — generate 192K+ pages from JSON data within GitHub Actions memory limits
2. **Go template data lookups** — replicate 15 Nunjucks filters and complex data-enrichment lookups in Go templates
3. **Pagefind indexing** — retain three separate Pagefind indices (descriptions, entities, places) after the Hugo build
4. **Diff-based R2 deployment** — replace full-sync upload with ETag/MD5 delta upload to cut CI time

Existing infrastructure: Cloudflare R2 bucket, Cloudflare Worker, GitHub Actions, Backblaze B2 (data source), Node.js pre-build enrichment scripts, Tailwind CSS v4 standalone CLI.

---

## Feature Landscape

### 1. Hugo Large-Scale Build

#### Table Stakes (Required for Migration to Work)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Content adapters (`_content.gotmpl`) | Primary mechanism for generating 192K pages from JSON data without individual markdown files — introduced Hugo v0.126.0 | MEDIUM | `AddPage` iterates over JSON array; one adapter per content subdirectory. Page collisions if duplicate paths — must guard against |
| Sub-linear memory growth | Eleventy OOMs at 192K pages on 7 GB heap; Hugo must stay well under GitHub Actions' ~7 GB limit | LOW (Hugo handles it) | Hugo 0.123+ uses disk-based rendering by default, which offloads memory. Community benchmarks: 100K pages in ~20 seconds, < 2 GB RAM. `--renderToMemory` flag available but adds memory pressure — leave off |
| Parallel page rendering | Hugo renders pages in parallel by default, using all CPU cores | LOW | Built-in; no configuration needed. Build time scales with CPU cores, not just page count |
| JSON data loading via `transform.Unmarshal` or content adapters | Load large JSON exports (e.g., 31 MB entities.json) as build-time data sources | MEDIUM | Hugo reads data into memory once and reuses it. For very large files (31 MB+), prefer loading via content adapter `resources.Get` rather than `site.Data` to enable LRU garbage collection |
| `partialCached` for repeated partials | Shared navigation, breadcrumbs, metadata sections rendered once and cached per variant — critical for 192K iterations | MEDIUM | Replace all `partial` calls with `partialCached` where output is deterministic per section/type. Measurable 40% reduction in template render time on large sites |
| Build stats for Tailwind v4 | Hugo must emit `hugo_stats.json` listing all used HTML classes so the Tailwind v4 standalone CLI can purge correctly | LOW | Requires `build.buildStats: true` in `hugo.toml` and a cache buster on `hugo_stats.json`. Hugo's native `css.TailwindCSS` function supports the standalone CLI binary |

#### Differentiators (Improve Build Speed Beyond Baseline)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `--gc` flag in CI | Garbage-collects unused cache files after each build, preventing cache bloat over many CI runs | LOW | Add to `hugo --gc --minify` in CI workflow |
| Template metrics profiling | `--templateMetrics --templateMetricsHints` flags identify which templates execute most often and which have high cache potential — points to optimisation targets before they become problems | LOW | Run once after migration to baseline; not needed in every CI build |
| Content adapter per content type | One `_content.gotmpl` in `content/descripcion/`, one in `content/entidad/`, one in `content/lugar/` — keeps adapters small and debuggable rather than one monolithic adapter | LOW | Hugo allows one adapter per directory; splitting by type is the natural structure |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| `--renderToMemory` flag | Faster on SSD-limited machines | Negates Hugo's disk-based rendering optimization; reintroduces OOM risk on GitHub Actions with 192K pages | Leave off by default; only test if disk I/O becomes the bottleneck (unlikely on GitHub Actions which uses SSD-backed runners) |
| Storing all JSON data under `data/` directory | Convenient — `site.Data.entities` is globally accessible | Hugo loads `data/` entirely into memory and holds it for the full build. A 31 MB JSON in `data/` adds 31 MB minimum to build heap. At three large files (descriptions, entities, places) this could add 100+ MB | Load large JSON via content adapter's `resources.Get` instead; Hugo can garbage-collect those resources via LRU cache |
| Hugo modules for theme sharing | Standard recommendation in Hugo tutorials | Adds `go.sum` dependency management and `go` toolchain requirement to CI; unnecessary for a single-repo site with no shared theme | Keep templates in `layouts/` directly; no Hugo module needed |

---

### 2. Go Template Data Lookups

#### Table Stakes (Required to Replicate Existing Filters)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Date formatting via `time.Format` | Replaces `formatDate` Nunjucks filter — display archival dates as "16 April 2026", "1650", etc. | LOW | Hugo uses Go reference time layout (`Mon Jan 2 2006`). Unlike Nunjucks/moment, the layout string uses a specific reference date, not format tokens like `YYYY`. Requires learning the idiom once |
| Number formatting via `lang.FormatNumber` / `lang.FormatNumberCustom` | Replaces `numberFormat` Nunjucks filter — display "106,432" with locale-appropriate separators | LOW | Hugo provides `lang.FormatNumber` (uses current language locale) and `lang.FormatNumberCustom` (explicit separator control). Both are built-in; no custom function needed |
| String splitting via `split` | Replaces `splitPipe` Nunjucks filter — many fields store multiple values pipe-separated | LOW | Go templates have `split` built-in: `{{ $parts := split .Params.field "|" }}` |
| Map lookup via `index` function | Replaces inline logic that maps role codes or place type codes to human-readable labels | LOW | `{{ index $roleLabels .role_code }}` where `$roleLabels` is a dict defined in a partial or front matter |
| Partials as function substitutes | Hugo has no user-defined custom functions — all reusable logic must be encapsulated as partials | MEDIUM | Partials accept a context map (`.`) and return a value via `return`. This is the idiomatic Hugo equivalent of Nunjucks filters for complex logic. For simple transforms, built-in functions suffice |
| `range` / `where` / `sort` pipelines | Replaces Nunjucks `for`, filter, and sort operations | LOW | All built-in. `where` filters slices by field value. `sort` sorts slices by key. `first N` limits results |
| `dict` for building context maps | Passing structured data into partials (equivalent to Nunjucks macro parameters) | LOW | `{{ partial "my-partial" (dict "key" $value "other" $other) }}` |

#### Differentiators (Improve Template Maintainability)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Centralised label-map partials | Define `yearRange`, `centuryRange`, `decadeRange` equivalents as partials that accept a year integer and return a formatted string — reusable across description, entity, place templates | LOW | One partial per filter; called with `partialCached` for performance. Keeps label logic out of every template |
| `hugo_stats.json`-driven Tailwind purge | Hugo emits used class names; Tailwind v4 reads them to purge unused CSS — ensures the CSS bundle only contains classes actually used across 192K pages | LOW | Already the recommended setup per Hugo's `css.TailwindCSS` docs; requires `@source "hugo:vars"` in the CSS entry file |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Sprig library functions | Many Hugo tutorials mention Sprig for extended template functions (string padding, regex, etc.) | Sprig is only available in Helm charts, not Hugo. Hugo has its own function set. Tutorials conflating the two cause confusion | Verify each needed function against the Hugo functions reference at gohugo.io/functions before concluding something is missing |
| Custom Go plugin for template functions | Some developers compile custom Hugo binaries to add functions | Requires maintaining a forked Hugo build; breaks on Hugo upgrades; not supported in standard CI | Implement all filter logic as partials; push complex transformations into the pre-build Node.js pipeline instead |
| Regex-heavy template logic | Nunjucks allows complex string manipulation inline | Hugo's regex functions exist (`findRE`, `replaceRE`) but are slow in tight loops over 192K pages | Move string normalisation and complex transformations into the pre-build Node.js enrichment script; write clean values to JSON |

---

### 3. Pagefind Indexing

#### Table Stakes (Retain Existing Search Functionality)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Three separate Pagefind index runs after Hugo build | Descriptions, entities, and places each have their own Pagefind index for independent search widgets | LOW | Run `pagefind --site public --output-path public/pagefind-descriptions`, etc., targeting different HTML subtrees via `--glob` or `--root` per index. Order matters: Hugo must complete before any Pagefind run |
| `data-pagefind-body` on indexable content | Once any page on the site uses this attribute, pages without it are excluded — prevents nav, footer, and sidebar text from polluting search results | LOW | Add `data-pagefind-body` to the main content region in each Hugo layout template. Critical that all three content types use it consistently |
| `data-pagefind-ignore` on repeated non-content elements | Breadcrumbs, related-items lists, metadata labels repeat identical text across pages — excluding them improves result quality | LOW | Add `data-pagefind-ignore` to navigation, related-descriptions panels, and UI labels. The `all` value also suppresses filter/metadata processing within the element |
| Pagefind filters preserved post-migration | Existing faceted filters (repository, level, date, country, language) are driven by `data-pagefind-filter` attributes — must survive the template rewrite | MEDIUM | Map each Nunjucks `data-pagefind-filter` attribute to the equivalent Hugo template output. Audit all five filter attributes before migration is considered complete |
| CI index build order | Pagefind must run after Hugo generates HTML; three index passes must complete before R2 upload | LOW | Enforce in GitHub Actions with explicit step ordering: `hugo` → `pagefind (descriptions)` → `pagefind (entities)` → `pagefind (places)` → upload |

#### Differentiators (Improve at Scale)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Pagefind `--exclude-selectors` for CI-time exclusion | Alternative to `data-pagefind-ignore` on templates — can suppress element types globally without template changes, useful when fixing indexing quality post-launch | LOW | Pass via `pagefind.yml` config file; complements but does not replace `data-pagefind-ignore` on templates |
| Multisite index merging in the browser | Pagefind supports `mergeIndex` to load a secondary index bundle at runtime — if descriptions and entities ever need to be queried together, this is the mechanism | MEDIUM | Not needed now but documented for future cross-index search. Requires CORS headers on the R2 bucket if indices are loaded cross-origin |
| Pagefind custom ranking weights per index | `indexWeight` in `mergeIndex` lets one index's results rank higher than another's — useful if entity search results should rank above place results in a unified query | LOW | Currently each index is independent; relevant only if merged index approach is adopted later |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Incremental Pagefind indexing | "Only re-index changed pages" to speed up CI | Pagefind's index structure means nearly any page change invalidates most index chunks; the maintainers have explicitly ruled this out as a goal. CI environments also reset modification times, making change detection unreliable | Accept full re-index per build. At Zasqua's scale (Unity docs: 30K pages in 42 seconds), a full descriptions index at 106K pages should complete in under 3 minutes — well within GitHub Actions limits |
| Single unified Pagefind index for all content types | Simpler build step; one index to query | Mixes archival descriptions, entities, and places into one result set without clear type separation. Faceted filters work poorly across heterogeneous content types. All three explorers currently have independent search widgets | Retain three separate indices. The complexity cost is two additional `pagefind` invocations, which is trivial |
| Pagefind as the data layer for explorers | The entity and place explorers use Pagefind for filtering, not just search | Already the current approach and a good one — but do not extend this to use Pagefind as the primary data store for features like the co-occurrence graph or the description aggregates. Those must remain pre-computed JSON | Keep Pagefind for search and filtering; keep pre-computed JSON for structured data lookups |

---

### 4. Diff-Based R2 Deployment

#### Table Stakes (Required to Reduce CI Time)

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| MD5/ETag comparison before PUT | The current parallel upload script uploads every file on every deploy (~192K files). A diff using MD5 hashes against R2 ETags skips unchanged files — a typical content update touches <1% of pages | MEDIUM | R2 exposes ETags via `ListObjectsV2` (S3-compatible API). Compute MD5 of local file; compare to ETag from R2 list response; only PUT on mismatch |
| R2 `ListObjectsV2` for remote manifest | Build a map of `{path → ETag}` for all objects currently in the bucket before computing the diff | MEDIUM | Standard S3 API, works with R2 via S3-compatible endpoint + R2 API token. Paginated — must handle `ContinuationToken` for buckets with 192K+ objects |
| Deletion of removed files | Files removed from the build (renamed pages, restructured URLs) must be deleted from R2 to prevent stale content | MEDIUM | Collect paths in the R2 manifest that have no local counterpart; batch-delete them after uploads complete. Limit deletions per run (Hugo's native deploy caps at 256 — a sensible default) |
| Parallel upload retained for new/changed files | The existing 345 files/s parallel upload speed should be preserved for the subset of changed files | LOW | Keep the existing `p-limit`-based parallel upload logic; just apply it to the diff-filtered file list instead of all files |
| Cache-Control headers preserved | HTML files need `max-age=0` (or short TTL); assets (JS, CSS, fonts, images) can have long TTLs. The diff logic must not silently drop these | LOW | Pass `Cache-Control` as custom metadata on each PUT. Keep a content-type → header map as currently implemented |

#### Differentiators (Improve Deploy Reliability)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dry-run mode (`--dry-run`) | Show which files would be uploaded/deleted without executing — useful for validating the diff logic before first production use | LOW | Log planned actions to stdout; skip actual AWS SDK calls. A one-flag addition to the existing upload script |
| Summary metrics logged in CI | "Uploaded: 432 files, Skipped: 191,890 files, Deleted: 12 files, Duration: 47s" — makes CI logs interpretable | LOW | Counters maintained during the loop; logged at the end. Helps catch runaway diff logic early |
| ETag normalisation for multipart uploads | R2 ETags for large files uploaded via multipart differ from single-part MD5. For static site assets (all small files < 5 MB) this is not a concern, but the diff logic should document this assumption | LOW | Document the limitation. For this site's file profile (HTML, JSON, JS, CSS — all small), single-part ETags match MD5 reliably |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| `rclone sync` | Standard tool for S3-compatible sync with diff | rclone has a 30ms/file round-trip cost at sequential upload — benchmarked at 30 files/s for this bucket vs the current 345 files/s parallel script. Also lacks fine-grained `Cache-Control` per content type | Retain the custom Node.js upload script with S3-compatible `@aws-sdk/client-s3`; add ETag diff on top of existing parallelism |
| `aws s3 sync` CLI | Built-in, well-documented | Relies on file timestamps, not content hashes. Hugo regenerates all files on every build (timestamps updated even when content is identical), so `aws s3 sync` uploads everything every time — the exact problem being solved | Use MD5/ETag comparison |
| `hugo deploy` built-in | Hugo has a native deploy command with MD5 diff | Hugo deploy only officially supports Amazon S3, Azure Blob Storage, and Google Cloud Storage. Cloudflare R2 is not mentioned in the documentation; endpoint-url configuration is undocumented for R2. Also: `hugo deploy` removes the parallel upload performance gains | Keep the custom Node.js upload script; implement ETag diff within it |
| Wrangler for R2 uploads | Cloudflare-native tool for R2 | Wrangler uploads one file at a time; documentation confirms no bulk parallel upload. No ETag comparison capability | Use the S3-compatible API with `@aws-sdk/client-s3` (already in use) |

---

## Feature Dependencies

```
Hugo build (content adapters)
    └──requires──> Pre-build Node.js enrichment scripts (ancestor chains, entity/place link data)
    └──requires──> JSON exports downloaded from B2 at CI start
    └──produces──> public/ directory with 192K+ HTML files

Go template data lookups
    └──requires──> Hugo build setup (layouts/, partials/)
    └──requires──> JSON data loaded via content adapters or resources.Get
    └──enhanced by──> partialCached for repeated lookup partials

Tailwind CSS v4 compilation
    └──requires──> Hugo build (hugo_stats.json must be generated first)
    └──requires──> Tailwind v4 standalone CLI on PATH in CI
    └──enhanced by──> Hugo css.TailwindCSS function (native integration)

Pagefind indexing (3 indices)
    └──requires──> Hugo build complete (needs HTML output in public/)
    └──requires──> data-pagefind-body/ignore attributes in Hugo layout templates
    └──produces──> public/pagefind-descriptions/, public/pagefind-entities/, public/pagefind-places/

Diff-based R2 upload
    └──requires──> Hugo build complete
    └──requires──> Pagefind indices complete (they are also files to diff and upload)
    └──requires──> R2 ListObjectsV2 to build remote ETag manifest
    └──enhanced by──> Dry-run mode for validation

CI pipeline (GitHub Actions)
    └──orchestrates──> All of the above in sequence
    └──depends on──> B2 download, Node.js enrichment, Hugo build, Pagefind ×3, R2 upload
```

### Dependency Notes

- **Content adapters are the architectural keystone**: Every page type (description, entity, place) must be generated via content adapters before any other step can proceed. This is the highest-risk item to get right first.
- **Build order is strict**: B2 download → Node.js enrichment → Hugo (generates HTML + `hugo_stats.json`) → Tailwind CSS compilation → Pagefind ×3 → R2 diff upload. Each step depends on the previous.
- **Tailwind v4 standalone binary must be on PATH in CI**: Not available as an npm package without Node.js overhead. Must be installed as a binary in the CI workflow before the Hugo build step.
- **Pagefind runs after Hugo, not during**: Hugo does not invoke Pagefind; they are separate processes. Pagefind processes the finished HTML output.
- **Diff-based upload is independent of Hugo**: The upload script only cares about the final `public/` directory contents. It can be developed and tested independently of the Hugo migration.

---

## MVP Definition

### Launch With (v0.6.0)

- [ ] Content adapters for all three page types (descriptions, entities, places) — unblocks everything
- [ ] Go template partials replicating all 15 Nunjucks filters — no regressions in rendered output
- [ ] Tailwind v4 compilation wired through `css.TailwindCSS` with `hugo_stats.json` — CSS output preserved
- [ ] Three Pagefind index builds in CI — existing search functionality retained
- [ ] `data-pagefind-body` / `data-pagefind-ignore` attributes in all Hugo layout templates — index quality preserved
- [ ] Diff-based R2 upload replacing full sync — deploy time reduced from ~10 minutes to under 2 minutes on typical content updates

### Add After Validation (v0.6.x)

- [ ] Template metrics profiling pass (`--templateMetrics`) — identify and cache hot partials once migration is stable
- [ ] Dry-run deploy mode — validate diff logic against production bucket before relying on it

### Future Consideration

- [ ] Multisite Pagefind index merging — if cross-content-type unified search becomes a requirement
- [ ] Hugo's native `hugo deploy` with R2 support — if Cloudflare officially documents R2 endpoint configuration

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Content adapters (all 3 page types) | HIGH — builds the site | HIGH | P1 |
| Go template partials (filter equivalents) | HIGH — output parity | MEDIUM | P1 |
| Tailwind v4 CSS compilation | HIGH — visual parity | LOW | P1 |
| Pagefind index ×3 in CI | HIGH — search retained | LOW | P1 |
| `data-pagefind-body` in Hugo layouts | HIGH — search quality | LOW | P1 |
| Diff-based R2 upload | HIGH — CI sustainability | MEDIUM | P1 |
| `partialCached` optimisation | MEDIUM — build speed | LOW | P2 |
| Template metrics profiling pass | MEDIUM — ongoing health | LOW | P2 |
| Dry-run deploy mode | MEDIUM — operational safety | LOW | P2 |
| Multisite Pagefind merging | LOW — not currently needed | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v0.6.0 launch
- P2: Should have, add once P1 items are stable
- P3: Nice to have, future consideration

---

## Sources

- Hugo content adapters: [gohugo.io/content-management/content-adapters](https://gohugo.io/content-management/content-adapters/)
- Content adapter performance benchmarks: [Hugo Discourse: Content adapters examples and performance](https://discourse.gohugo.io/t/content-adapters-examples-and-performance/49830)
- Hugo data sources: [gohugo.io/content-management/data-sources](https://gohugo.io/content-management/data-sources/)
- Hugo build performance: [gohugo.io/troubleshooting/performance](https://gohugo.io/troubleshooting/performance/)
- Hugo partialCached: [gohugo.io/functions/partials/includecached](https://gohugo.io/functions/partials/includecached/)
- Hugo Tailwind v4 integration: [gohugo.io/functions/css/tailwindcss](https://gohugo.io/functions/css/tailwindcss/)
- Pagefind selective indexing: [pagefind.app/docs/indexing](https://pagefind.app/docs/indexing/)
- Pagefind multisite merging: [pagefind.app/docs/multisite](https://pagefind.app/docs/multisite/)
- Pagefind incremental indexing (maintainer position): [GitHub Pagefind discussion #831](https://github.com/Pagefind/pagefind/discussions/831)
- s3deploy (ETag-based diff for Hugo sites): [github.com/bep/s3deploy](https://github.com/bep/s3deploy)
- Hugo deploy (native, S3 only): [gohugo.io/host-and-deploy/deploy-with-hugo-deploy](https://gohugo.io/host-and-deploy/deploy-with-hugo-deploy/)

---

*Feature research for: Hugo migration and build pipeline sustainability, 192K-page static archival site*
*Researched: 2026-04-16*
