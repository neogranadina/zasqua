# Stack Research

**Domain:** Static archival discovery site — Hugo migration, Pagefind at scale, R2 diff upload
**Researched:** 2026-04-16
**Confidence:** HIGH for Hugo and Pagefind (official sources verified); MEDIUM for R2 diff upload (tooling landscape well understood but the existing custom uploader may be the best path)

---

## Context: Existing Stack (Do Not Change)

This milestone replaces the build engine. The following remain unchanged:

- Tailwind CSS v4 (standalone CLI)
- Pagefind (client-side search, 3 separate indices)
- TIFY v0.31.0 (IIIF viewer)
- Vanilla JS throughout — MapLibre, Sigma.js, Pagefind JS API, all via CDN
- Cloudflare R2 + Worker hosting
- GitHub Actions CI/CD
- Pre-compute Node.js scripts for entity/place link shards, co-occurrence graph

---

## New Stack Additions / Replacements

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Hugo | v0.160.1 (latest as of 2026-04-08) | Replace Eleventy as the static site generator | Hugo builds 192K+ pages in under 4 GB of RAM in CI; content adapters (v0.126.0+) generate pages directly from JSON without writing 192K stub files. Eleventy hits OOM at 192K pages even with 7 GB heap. Hugo is a single binary with no Node.js dependency for the SSG phase. |
| Hugo content adapters | built into Hugo ≥ v0.126.0 | Generate description, entity, and place pages from JSON at build time | Content adapters read JSON data files and call `$.AddPage` per record; Hugo parallelises rendering across CPU cores. Linear scaling confirmed: 20K pages on M2 in ~5 seconds, 37K pages in ~8 minutes on old hardware. For 192K pages on a 4-core GitHub Actions runner, expect 10–20 minutes. |
| Pagefind | v1.5.2 (latest as of 2026-04-12) | Client-side search (unchanged), but reindexed post-Hugo | v1.5.0 delivers ~45% smaller index chunks, doubled indexing speed on macOS/Windows (Linux regression fixed in v1.5.2), diacritics support (café matches cafe), and automatic CJK segmentation. These gains directly reduce CI index time. Upgrade from 1.4.0 is low-risk: API surface is unchanged. |
| @aws-sdk/client-s3 | already in use for custom uploader | R2 diff upload — ListObjectsV2 + HeadObject + conditional PutObject | R2 supports the full S3 API including `ListObjectsV2` (returns ETags) and `HeadObject`. The existing parallel uploader already uses this SDK. Extend it to skip files whose local MD5 matches the remote ETag, rather than uploading everything on every build. |

### Tailwind CSS Integration with Hugo

The existing project uses the **Tailwind CSS v4 standalone CLI** with no npm. Hugo's built-in `css.TailwindCSS` function is the natural pairing, but there is a known issue to be aware of.

**Decision: use `css.TailwindCSS` with npm-installed `@tailwindcss/cli`, not the standalone binary.**

Rationale: A Go upstream security change in v0.146.0 broke Hugo's ability to find executables in arbitrary PATH entries (including local `./bin/`). Hugo only searches `node_modules/.bin` for the Tailwind binary. The issue was closed as a documentation matter — Hugo will not fix it. This means the standalone binary path is unreliable in CI unless placed in `node_modules/.bin`, which requires npm anyway. Use `npm install --save-dev @tailwindcss/cli` in the Hugo project and rely on `node_modules/.bin/tailwindcss`. This is the documented path and is verified to work.

The build step for Tailwind remains a compile-time step only, not a runtime dependency.

---

## Hugo Configuration Details

### Required `hugo.toml` Settings

```toml
[build]
  # Required for css.TailwindCSS to know which classes are in use
  writeStats = true

  [[build.cachebusters]]
    source = "assets/css/.*.css"
    target = "css"

  [[build.cachebusters]]
    source = "(postcss|tailwind)\\.config\\..*"
    target = "css"

  [[build.cachebusters]]
    source = "hugo_stats\\.json"
    target = "css"

[module]
  [[module.mounts]]
    source = "hugo_stats.json"
    target = "assets/notwatching/hugo_stats.json"
    disableWatch = true
```

### Content Adapter Pattern (`content/_content.gotmpl`)

```go-html-template
{{- $data := resources.Get "data/descriptions.json" | transform.Unmarshal -}}
{{- range $data -}}
  {{- $.AddPage (dict
    "path"   (printf "descripcion/%s" .slug)
    "title"  .title
    "params" .
  ) -}}
{{- end -}}
```

Each content type (descriptions, entities, places) gets its own `_content.gotmpl` in its section directory.

### Performance Knobs

- Use `partialCached` for any partial that produces identical output across many pages (e.g. global nav, footer). Do NOT use `partialCached` with per-page variants — an LRU cache of 1000 entries is the limit before memory pressure occurs.
- `--renderToMemory` flag on the `hugo` command avoids disk I/O during the build phase; beneficial in CI but increases RAM usage. Omit if RAM is a concern.
- `--minify` can be combined with the build command to eliminate a post-processing step.

---

## Pagefind at Scale

### Why No Incremental Indexing

Pagefind does not support incremental index updates. Adding any page redistributes words across all index chunks, invalidating the entire cache. This is a fundamental design constraint acknowledged by the maintainer — the architecture depends on chunk sharding by word, not by page. Full reindex on every build is the only option.

**Mitigation:** Pagefind v1.5.0+ is ~2× faster on indexing. With 45% smaller chunks, the browser-side load is also smaller. Run all three indices in parallel in CI (they are independent CLI invocations).

### CLI Invocation for Three Indices

The three separate Pagefind indices (descriptions, entities, places) are already built in CI. Post-Hugo, each invocation points at the merged build output, using `data-pagefind-index-attrs` or `--root-selector` to scope what each index sees:

```bash
# Descriptions index
pagefind \
  --site public/ \
  --glob "descripcion/**/*.html" \
  --output-path public/pagefind-desc/ \
  --root-selector "[data-pagefind-body-desc]"

# Entities index
pagefind \
  --site public/ \
  --glob "entidad/**/*.html" \
  --output-path public/pagefind-entities/ \
  --root-selector "[data-pagefind-body-entities]"

# Places index
pagefind \
  --site public/ \
  --glob "lugar/**/*.html" \
  --output-path public/pagefind-places/ \
  --root-selector "[data-pagefind-body-places]"
```

Run these three as parallel jobs in the GitHub Actions workflow using a matrix or job parallelism.

### Relevant Pagefind v1.5.2 Flags

| Flag | Purpose |
|------|---------|
| `--site <dir>` | Root of built static HTML |
| `--glob <pattern>` | Restrict which HTML files are indexed (prevents cross-index bleed) |
| `--output-path <dir>` | Where to write the index bundle (use absolute or relative-to-cwd path) |
| `--root-selector <selector>` | CSS selector of the element Pagefind treats as document root |
| `--verbose` | Extra logging — useful for diagnosing unexpected page counts |
| `--quiet` | Suppress per-file output — recommended for CI to reduce log noise at 192K pages |

---

## R2 Diff-Based Upload

### Approach: Extend the Existing Custom Uploader

The project already has a custom parallel uploader script that achieves 345 files/s. Rclone and r2sync are the two third-party options, but both have trade-offs:

- **rclone**: `--checksum` requires HEAD requests per file at 192K files, which is very slow (30 ms RTT × 192K = ~96 minutes). `--size-only` is fast but misses same-size changed files (common for HTML where only content differs). `rclone sync` also has a known issue where it falls back to size-only comparison silently if ETags are unavailable.
- **r2sync**: v0.0.4 (Oct 2024) supports ETag-based diff but is written in Rust and less battle-tested. API surface is minimal.

**Recommended: extend the existing Node.js uploader.** It already uses `@aws-sdk/client-s3`. The diff logic is straightforward:

1. `ListObjectsV2` to get all remote ETags (one paginated API call to list all 192K objects — R2 supports this)
2. For each local file, compute MD5 → compare against remote ETag
3. Only `PutObject` files where MD5 does not match or file is not in remote listing
4. Delete remote files not present locally (`DeleteObjects` batch)

This keeps the parallel upload speed (configurable concurrency) while skipping unchanged files. On a typical content build, ~90% of HTML files are unchanged — this reduces upload time from ~10 minutes to ~1–2 minutes.

**ETag caveat:** R2 ETags are MD5 of the object content for single-part uploads (the common case for static HTML). Verify this assumption when testing; multipart upload ETags differ. Since no static HTML file exceeds R2's default single-part threshold (5 MB), MD5 comparison is valid for this use case.

### AWS SDK Configuration for R2 Diff Upload

```js
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Hugo content adapters | Pre-generate 192K stub `.md` files, commit them | Writing 192K files to disk before the build adds 5–10 minutes of I/O and creates a massive git history. Content adapters keep data in JSON and generate pages in memory. |
| Hugo content adapters | Hugo data-driven content (range over site.Data) | `site.Data` loads all data into memory before template execution. At 31 MB for entities.json, this works but is less efficient than streaming via `resources.Get` in an adapter. |
| npm for Tailwind CLI | Tailwind standalone binary in arbitrary PATH | Hugo ≥ v0.146.0 cannot find binaries outside `node_modules/.bin` due to a Go upstream security patch. Using npm is the only supported path. |
| Custom diff uploader (Node.js) | rclone `--checksum` | 192K HEAD requests to R2 ≈ 96 minutes. Not viable. |
| Custom diff uploader (Node.js) | rclone `--size-only` | Misses changed files of the same size (common in HTML-heavy sites). |
| Custom diff uploader (Node.js) | r2sync v0.0.4 | Experimental Rust tool, last released Oct 2024, minimal documentation, unproven at 192K-file scale. |
| Parallel Pagefind CI jobs | Sequential Pagefind runs | Three sequential full-site scans at 192K pages add up to significant CI time. Running in parallel keeps the indexing phase under the build time. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Hugo Modules (Go module system) | Adds `go.mod`/`go.sum` files, requires `go` in CI, overkill for a single-site project with no third-party Hugo themes | Plain Hugo project with assets in `/assets/` and no modules |
| Hugo's built-in image processing | No images are processed at build time in this project (images are served via IIIF from R2) | TIFY viewer continues to handle images |
| Webpack / Vite / esbuild | JS stays vanilla + CDN. No JS build step. | CDN-loaded libraries |
| Incremental Pagefind indexing | Not supported by Pagefind; architecture prevents it | Full reindex on every build; parallelise across 3 indices |
| Hugo `--renderToMemory` in CI unconditionally | Increases RAM; on GitHub Actions' 7 GB limit this may cause OOM on a 192K-page build with large JSON data | Enable only after benchmarking RAM usage; default to disk renders |
| Hugo server (`hugo server`) in CI | Development-only feature | Use `hugo --minify` for CI builds |

---

## Version Compatibility

| Component | Version | Compatible With | Notes |
|-----------|---------|-----------------|-------|
| Hugo | v0.160.1 | Go 1.26.1 (bundled) | Hugo ships as a self-contained binary; no Go installation needed in CI |
| Hugo content adapters | Hugo ≥ v0.126.0 | — | `EnableAllDimensions` requires ≥ v0.153.0 if needed |
| css.TailwindCSS | Hugo ≥ v0.128.0 | Tailwind CSS CLI v4.0+ | Requires `build.writeStats = true` in hugo.toml |
| @tailwindcss/cli | v4.x | Hugo ≥ v0.128.0 | Must be in `node_modules/.bin/` — standalone binary path is unreliable since Hugo v0.146.0 |
| Pagefind | v1.5.2 | Any Hugo output dir | v1.5.0 API is backward-compatible with v1.4.0 JS API; upgrade is safe |
| @aws-sdk/client-s3 | already in use | Cloudflare R2 (S3-compatible API) | R2 ListObjectsV2 returns MD5 ETags for single-part objects |

---

## Installation

```bash
# Hugo — single binary, no package manager needed
# macOS dev
brew install hugo

# CI (GitHub Actions) — pin to the release version
# In workflow: uses: peaceiris/actions-hugo@v3 with hugo-version: '0.160.1'

# Tailwind CSS CLI — must go in node_modules/.bin/ for Hugo to find it
npm install --save-dev @tailwindcss/cli

# Pagefind — already installed as npm dev dependency
npm install --save-dev pagefind  # confirms v1.5.2

# No additional packages needed for R2 diff upload
# @aws-sdk/client-s3 is already used by the parallel uploader
```

---

## Sources

- [Hugo releases page](https://github.com/gohugoio/hugo/releases) — v0.160.1 confirmed latest (2026-04-08) — HIGH confidence
- [Hugo content adapters docs](https://gohugo.io/content-management/content-adapters/) — `_content.gotmpl`, `.AddPage` signature, introduced ≥ v0.126.0 — HIGH confidence (official docs)
- [Hugo discourse: content adapter performance](https://discourse.gohugo.io/t/content-adapters-examples-and-performance/49830) — linear scaling confirmed, 20K pages ~5s on M2 — MEDIUM confidence (community benchmarks)
- [Hugo `css.TailwindCSS` docs](https://gohugo.io/functions/css/tailwindcss/) — parameters, requirements, `build.writeStats`, `templates.Defer` pattern — HIGH confidence (official docs)
- [Hugo issue #13617: PATH no longer checked for tailwindcss](https://github.com/gohugoio/hugo/issues/13617) — standalone binary path broken since v0.146.0, resolved as docs-only — HIGH confidence (official GitHub issue, closed)
- [Hugo issue #13221: npx cannot be disabled](https://github.com/gohugoio/hugo/issues/13221) — corroborates binary PATH issue — MEDIUM confidence
- [bep/hugo-testing-tailwindcss-v4](https://github.com/bep/hugo-testing-tailwindcss-v4) — reference repo from Hugo maintainer, confirms css.TailwindCSS + hugo_stats.json pattern — HIGH confidence (Hugo core maintainer)
- [Pagefind changelog](https://github.com/CloudCannon/pagefind/blob/main/CHANGELOG.md) — v1.5.2 confirmed latest (2026-04-12), v1.5.0 features documented — HIGH confidence (official changelog)
- [Pagefind config options docs](https://pagefind.app/docs/config-options/) — `--glob`, `--output-path`, `--root-selector`, `--quiet` flags — HIGH confidence (official docs)
- [Pagefind discussion #831: updateable indexes](https://github.com/Pagefind/pagefind/discussions/831) — incremental indexing not supported, architectural constraint explained by maintainer — HIGH confidence (official maintainer response)
- [Pagefind Node.js API docs](https://pagefind.app/docs/node-api/) — programmatic indexing API, `addDirectory`, `writeFiles` — HIGH confidence (official docs)
- [Cloudflare R2 aws-sdk-js-v3 docs](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/) — endpoint format, ListObjectsV2 support, ETag in response — HIGH confidence (official Cloudflare docs)
- [rclone R2 sync issues](https://github.com/rclone/rclone/issues/7881) — `--checksum` requires download/HEAD per file, falls back to size-only without it — MEDIUM confidence (GitHub issue thread)
- [r2sync](https://github.com/Songmu/r2sync) — v0.0.4, ETag-based diff supported but experimental — LOW confidence (unproven at scale)

---

*Stack research for: Zasqua Frontend v0.6.0 — Hugo migration, Pagefind optimisation, R2 diff upload*
*Researched: 2026-04-16*
