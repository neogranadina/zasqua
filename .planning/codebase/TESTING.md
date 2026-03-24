# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runner:**
- None. No test framework is installed or configured.
- No test files exist anywhere in the codebase (no `*.test.*`, `*.spec.*`, or test directories).
- No `jest.config.*`, `vitest.config.*`, `.mocharc.*`, or equivalent configuration.
- `package.json` has no `test` script defined.

**Assertion Library:**
- None.

**Run Commands:**
```bash
npm run dev               # Local dev server (Eleventy --serve with DEV_MODE=true, limited to 100 descriptions)
npm run build             # Full production build (Eleventy + Pagefind)
npm run build:dev         # Dev build with limited data + Pagefind
npm run debug             # Eleventy with debug logging
```

## Build Verification

The project relies on **build success as implicit verification**. If the Eleventy build completes and Pagefind indexes without errors, the site is considered working.

**Build pipeline (local):**
```bash
./build.sh                # Downloads data from B2, runs npm ci, eleventy, pagefind
```

**Build pipeline (CI):**
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Triggered: `workflow_dispatch` only (manual trigger, not on push or PR)
- Steps: checkout, setup Node 22 + Python 3.x, download data from B2, `npm ci`, `npx eleventy`, `npx pagefind --site _site`, upload to R2, purge Cloudflare cache
- Timeout: 60 minutes (large builds with tens of thousands of pages)

**Build output verification (in CI):**
```bash
echo "Pages: $(find _site -name 'index.html' | wc -l)"
echo "Site size: $(du -sh _site | cut -f1)"
```
- Page count and site size are logged but not asserted against thresholds

**Test upload workflow:** `.github/workflows/test-upload.yml`
- Same build pipeline but uploads to `zasqua-tests` bucket instead of `zasqua-site`
- Used to validate deployment changes without affecting production

## Test File Organization

**Location:**
- Not applicable -- no test files exist.

**Naming:**
- Not applicable.

## What Could Be Tested

**Eleventy filters (`eleventy.config.js`):**
- `splitPipe`, `safeSlug`, `numberFormat`, `extractYear`, `truncate`, `sortByOrder`, `filterByRepo`, `filterByLevel`, `findByRef`, `siblingsOf`
- These are pure functions ideal for unit testing

**Data loading (`src/_data/descriptions.js`):**
- Ancestor chain computation
- Repository lookup map construction
- DEV_MODE limiting behavior

**JavaScript components:**
- `MillerColumnsTree` class (`src/js/tree.js`): `extractDocNumber()` is a pure function testable in isolation
- `SearchPage` class (`src/js/search.js`): URL parsing (`parseUrlParams`), URL serialization (`updateUrl`), filter estimation, HTML escaping

**Build output:**
- Page count assertions (expected minimum number of pages)
- Pagefind index presence
- Critical page existence (`/index.html`, `/404.html`, `/buscar/index.html`)

## Coverage

**Requirements:** None enforced.

**View Coverage:**
- Not applicable.

## CI/CD Pipeline

**Workflows:**

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Build and deploy to R2 | `.github/workflows/deploy.yml` | `workflow_dispatch` | Full production build + deploy |
| Test parallel R2 upload | `.github/workflows/test-upload.yml` | `workflow_dispatch` | Build + upload to test bucket |

**No automated testing in CI.** Both workflows build the site but do not run any test suite.

**No PR checks.** Neither workflow runs on `push` or `pull_request` events. There is no branch protection or required status checks.

**Deployment verification:**
- After deploy, Cloudflare cache is purged via API call
- No post-deploy smoke tests or health checks

## Build Environment

**Node version:** 22 (specified in `.nvmrc`, used by CI via `node-version-file`)

**Memory requirements:** Large builds need increased Node heap:
```bash
export NODE_OPTIONS="--max-old-space-size=7168"   # local (build.sh)
# CI uses --max-old-space-size=6144
```

**Data dependency:** Build requires exported JSON data from B2 bucket (`zasqua-export`):
- `data/descriptions.json`
- `data/repositories.json`
- `data/children/*.json`

**Dev mode:** Setting `DEV_MODE=true` limits descriptions to 100 items for fast local iteration.

## Recommended Testing Approach

If tests are added in the future, the following approach aligns with the codebase:

**Unit tests for Eleventy filters:**
- Extract filter functions from `eleventy.config.js` into a testable module
- Test with any Node test runner (Node's built-in `node:test` or Vitest)

**Unit tests for JS utility functions:**
- `MillerColumnsTree.extractDocNumber()` in `src/js/tree.js`
- URL parsing/serialization in `src/js/search.js`
- Would require either extracting to Node-compatible modules or using a browser-context runner

**Build smoke tests (shell script or CI step):**
```bash
# Verify critical pages exist
test -f _site/index.html
test -f _site/404.html
test -f _site/buscar/index.html
# Verify Pagefind index was generated
test -d _site/pagefind
# Verify minimum page count
PAGE_COUNT=$(find _site -name 'index.html' | wc -l)
test "$PAGE_COUNT" -gt 100
```

---

*Testing analysis: 2026-03-24*
