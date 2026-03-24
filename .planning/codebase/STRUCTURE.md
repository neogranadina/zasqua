# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
zasqua-frontend-dev/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Build & deploy to R2 (manual dispatch)
│       └── test-upload.yml     # Test upload to zasqua-tests bucket
├── .planning/                  # GSD planning (private, gitignored in public repo)
│   ├── PROJECT.md
│   └── codebase/               # Codebase analysis documents
├── data/                       # Downloaded export data (gitignored)
│   ├── descriptions.json       # ~218 MB, all archival descriptions
│   ├── repositories.json       # ~14 KB, repository metadata
│   └── children/               # ~1,600 JSON files, one per parent description
├── scripts/
│   └── upload-to-r2.py         # Parallel R2 upload script (Python/boto3)
├── src/                        # Eleventy source (input directory)
│   ├── _data/                  # Global data files (Eleventy data cascade)
│   │   ├── descriptions.js     # Loads descriptions.json, precomputes ancestors
│   │   ├── repositories.js     # Loads repositories.json
│   │   ├── site.js             # Site metadata (title, URL, version)
│   │   ├── ui.js               # All Spanish UI strings and ISAD(G) labels
│   │   ├── entities.js         # Stub (returns []) -- not used in frontend
│   │   ├── places.js           # Stub (returns []) -- not used in frontend
│   │   └── export/             # Export staging area (gitignored)
│   ├── _includes/              # Nunjucks partials
│   │   ├── header.njk          # Site header with nav and search
│   │   ├── footer.njk          # Site footer with credits and version
│   │   └── breadcrumb.njk      # Reusable breadcrumb partial (not currently used -- description.njk has inline breadcrumb)
│   ├── _layouts/
│   │   └── base.njk            # Base HTML layout with head/scripts blocks
│   ├── css/
│   │   └── main.css            # Single stylesheet (44 KB)
│   ├── js/
│   │   ├── header.js           # Hamburger menu toggle
│   │   ├── search.js           # Pagefind search UI (SearchPage class, 53 KB)
│   │   ├── tree.js             # Miller columns tree navigation (MillerColumnsTree class)
│   │   └── description.js      # Copy-to-clipboard, TIFY viewer integration
│   ├── img/                    # Static images (repository photos, branding)
│   ├── vendor/
│   │   └── tify/               # TIFY IIIF viewer (tify.js, tify.css)
│   ├── index.njk               # Homepage
│   ├── description.njk         # Description detail page (paginated, 1 per description)
│   ├── repository.njk          # Repository page (paginated, 1 per repository)
│   ├── buscar.njk              # Search page
│   └── 404.njk                 # 404 error page
├── worker/
│   ├── worker.js               # Cloudflare Worker (serves R2 with edge cache)
│   └── wrangler.toml           # Wrangler config for Worker deployment
├── _site/                      # Build output (gitignored)
├── build.sh                    # Local build script (downloads data, builds, indexes)
├── eleventy.config.js          # Eleventy configuration
├── package.json                # npm manifest (only devDep: @11ty/eleventy)
├── package-lock.json           # npm lockfile
├── .nvmrc                      # Node version: 22
├── .gitignore                  # Ignores _site/, node_modules/, data/, .env
├── CHANGELOG.md                # Project changelog
├── CLAUDE.md                   # Claude Code instructions
├── LICENSE                     # GPL-3.0
└── README.md                   # Project documentation
```

## Directory Purposes

**`src/_data/`:**
- Purpose: Eleventy global data files -- available to all templates via filename (e.g., `descriptions`, `ui`, `site`)
- Contains: JS modules that export data (sync or async functions)
- Key files: `descriptions.js` (loads and enriches description data), `ui.js` (all UI strings), `site.js` (site config)

**`src/_includes/`:**
- Purpose: Nunjucks partials included via `{% include %}` in layouts or templates
- Contains: `header.njk`, `footer.njk`, `breadcrumb.njk`
- Key files: `header.njk` (site navigation), `footer.njk` (credits/version)

**`src/_layouts/`:**
- Purpose: Page layouts that templates extend via `layout:` front matter
- Contains: Single base layout
- Key files: `base.njk` (HTML skeleton with `{% block head %}` and `{% block scripts %}`)

**`src/js/`:**
- Purpose: Client-side JavaScript -- vanilla JS, no build step, no framework
- Contains: Feature-specific scripts loaded per page
- Key files: `search.js` (largest file, full search UI), `tree.js` (Miller columns), `description.js` (viewer/clipboard), `header.js` (menu)

**`src/css/`:**
- Purpose: Stylesheets
- Contains: Single monolithic CSS file
- Key files: `main.css` (all styles for all pages)

**`src/img/`:**
- Purpose: Static images
- Contains: Repository cover photos, Neogranadina branding/logos, favicon

**`src/vendor/`:**
- Purpose: Third-party libraries served locally
- Contains: TIFY IIIF viewer
- Key files: `tify/tify.js`, `tify/tify.css`

**`data/`:**
- Purpose: Downloaded JSON data from Django backend (via B2)
- Contains: `descriptions.json`, `repositories.json`, `children/*.json`
- Key files: `descriptions.json` is the primary data source (~218 MB); `children/` contains one JSON file per parent description ID

**`worker/`:**
- Purpose: Cloudflare Worker that serves the site from R2
- Contains: Worker source and Wrangler config
- Key files: `worker.js` (request handling, content-type, caching), `wrangler.toml` (R2 bucket binding)

**`scripts/`:**
- Purpose: Build/deploy tooling
- Contains: Python scripts
- Key files: `upload-to-r2.py` (concurrent R2 upload with boto3)

**`.github/workflows/`:**
- Purpose: CI/CD pipelines
- Contains: GitHub Actions workflow files
- Key files: `deploy.yml` (full build and deploy), `test-upload.yml` (upload to test bucket)

## Key File Locations

**Entry Points:**
- `eleventy.config.js`: Eleventy build configuration -- input/output dirs, filters, passthrough copies, progress logging
- `build.sh`: Local convenience script -- downloads data from B2, runs Eleventy, runs Pagefind
- `.github/workflows/deploy.yml`: CI/CD entry point -- full pipeline from data download to live deploy
- `worker/worker.js`: Runtime entry point -- handles every request to zasqua.org

**Configuration:**
- `eleventy.config.js`: Build config (dirs, template formats, filters)
- `package.json`: Dependencies (only `@11ty/eleventy`)
- `.nvmrc`: Node version `22`
- `worker/wrangler.toml`: Worker deployment config (R2 bucket binding)
- `src/_data/site.js`: Site metadata (title, URL, version `0.3.1`)

**Core Logic:**
- `src/_data/descriptions.js`: Data loading and relationship precomputation (ancestors, repo lookup)
- `src/description.njk`: Main template -- generates one page per description with full ISAD(G) metadata, IIIF viewer, breadcrumb, Pagefind attributes, children tree
- `src/repository.njk`: Repository landing page with tree navigation
- `src/js/search.js`: Full search UI -- Pagefind integration, facets, URL state, pagination, sorting
- `src/js/tree.js`: Miller columns tree -- lazy-loading children from static JSON

**UI Strings:**
- `src/_data/ui.js`: All Spanish UI text -- navigation labels, error messages, ISAD(G) field names, description levels (singular/plural), facet labels, search labels

**Static Assets:**
- `src/css/main.css`: All CSS styles
- `src/vendor/tify/`: IIIF viewer library
- `src/img/`: Repository images and branding

## Naming Conventions

**Files:**
- Templates: `lowercase.njk` (e.g., `description.njk`, `buscar.njk`)
- Data files: `lowercase.js` (e.g., `descriptions.js`, `ui.js`)
- JS scripts: `lowercase.js` matching the feature (e.g., `search.js`, `tree.js`)
- CSS: Single file `main.css`
- Includes/layouts: `lowercase.njk`

**Directories:**
- Eleventy special dirs prefixed with underscore: `_data/`, `_includes/`, `_layouts/`
- Everything else: lowercase, no prefix

**URL Structure:**
- Descriptions: `/{reference_code}/` (e.g., `/co-ahr-gob-caj001/`)
- Repositories: `/{repo_code}/` (e.g., `/co-ahr/`)
- Search: `/buscar/`
- Children JSON: `/data/children/{parent_id}.json`

## Where to Add New Code

**New Page Template:**
- Create `src/{pagename}.njk` with front matter specifying `layout: base.njk`
- For paginated pages (one per data item), use Eleventy's `pagination` front matter
- If the page needs custom JS, create `src/js/{pagename}.js` and add a `{% block scripts %}` override
- If the page needs custom CSS, add styles to `src/css/main.css`

**New Data Source:**
- Create `src/_data/{name}.js` exporting an async function
- Data becomes available in all templates as `{name}` variable
- Load JSON from `data/` directory (downloaded from B2 at build time)

**New UI Strings:**
- Add to `src/_data/ui.js` in the appropriate section
- Reference in templates as `ui.{section}.{key}`

**New Include/Partial:**
- Create `src/_includes/{name}.njk`
- Include in templates with `{% include "{name}.njk" %}`

**New Client-Side Feature:**
- Create `src/js/{feature}.js` with a class or IIFE
- Load it in the relevant template's `{% block scripts %}`
- Use vanilla JS -- no framework, no build step, no bundler

**New Vendor Library:**
- Add to `src/vendor/{library}/`
- Add passthrough copy in `eleventy.config.js`: `eleventyConfig.addPassthroughCopy("src/vendor/{library}")`

**New Eleventy Filter:**
- Add in `eleventy.config.js` using `eleventyConfig.addFilter("{name}", function(...))`

**New GitHub Actions Workflow:**
- Create `.github/workflows/{name}.yml`

## Special Directories

**`_site/`:**
- Purpose: Eleventy build output -- the complete static site
- Generated: Yes (by `npx eleventy`)
- Committed: No (gitignored)

**`data/`:**
- Purpose: JSON data downloaded from B2 at build time
- Generated: Yes (by `build.sh` or CI workflow)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm ci`)
- Committed: No (gitignored)

**`src/_data/export/`:**
- Purpose: Export staging area
- Generated: Yes
- Committed: No (gitignored)

**`.conductor/`:**
- Purpose: Empty directory (possibly for future orchestration tooling)
- Generated: Unknown
- Committed: Yes (directory exists but is empty)

**`.planning/`:**
- Purpose: GSD planning and codebase analysis (private dev repo only)
- Generated: No (manually maintained)
- Committed: Yes (in dev repo only -- never in public repo)

---

*Structure analysis: 2026-03-24*
