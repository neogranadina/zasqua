---
phase: 13-hugo-foundation
plan: 04
status: complete
completed: 2026-04-17
commits:
  - 1db429d
  - 226a00e
---

# Plan 13-04 — Asset relocation to Hugo canonical paths

## Outcome

Every static asset from `src/` moved to its Hugo canonical directory. Byte identity preserved end-to-end: `src/` → `static/` → `public/` sha256 matches on all spot-checked files. CSS entry point ported from `src/css/input.css` to `assets/css/main.css` with Tailwind v4 `@source` directive swapped in for the Eleventy-era filesystem scan.

## Commits

| Hash | Subject | Files changed |
|------|---------|---------------|
| `1db429d` | phase 13-04: relocate static assets to Hugo canonical paths | 28 renames, 0 insertions, 0 deletions |
| `226a00e` | phase 13-04: port CSS entry to assets/css/main.css (Tailwind v4) | 2 files (1 rename at 98% similarity, 1 deletion), 29 insertions, 3944 deletions |

## What moved

| Source | Destination | Files | Git detection |
|--------|-------------|-------|---------------|
| `src/js/` | `static/js/` | 9 | R100 (byte-identical renames) |
| `src/vendor/tify/` | `static/vendor/tify/` | 2 | R100 |
| `src/img/` | `static/img/` | 17 | R100 |
| `src/css/input.css` | `assets/css/main.css` | 1 | R98 (preamble swap) |
| `src/css/main.css` | deleted | — | stale Tailwind compiled output |

28 R100 renames + 1 R98 port + 1 deletion. No new content, no modified content, nothing invented.

## Byte-identity evidence

Pre-move sha256 baselines were captured in `/tmp/zasqua-13-04-snapshots/baseline.txt`. Post-move hashes match:

```
src/js/header.js (baseline)   sha256 372d845f28464cc30c0e8b753b7732f3d4b25edac9f2f536fc5482b916965354
  → static/js/header.js       sha256 372d845f28464cc30c0e8b753b7732f3d4b25edac9f2f536fc5482b916965354
  → public/js/header.js       sha256 372d845f28464cc30c0e8b753b7732f3d4b25edac9f2f536fc5482b916965354
```

Same-byte verification repeated for `src/js/search.js`, `src/vendor/tify/tify.js`, `src/img/favicon.png`, `src/img/zasqua-3-burgundy-sm.svg`, `src/css/input.css` — all identical across the move.

## Hugo server passthrough checkpoint

`hugo server` on port 1313 — 10 passthrough URLs returned 200 with byte sizes matching the `static/` sources:

| URL | Status | Size (bytes) |
|-----|--------|--------------|
| /js/header.js | 200 | 1608 |
| /js/search.js | 200 | 53893 |
| /js/entity.js | 200 | 37122 |
| /vendor/tify/tify.js | 200 | 391013 |
| /vendor/tify/tify.css | 200 | 32367 |
| /img/favicon.png | 200 | 2015 |
| /img/zasqua-3-burgundy-sm.svg | 200 | 82306 |
| /img/logo_grande.svg | 200 | 50737 |
| /img/hero.jpg | 200 | 322908 |
| /img/AHR_front.jpg | 200 | 286263 |

## Documented divergences (two, both minor)

1. **Tailwind `@source` directive swap.** `src/css/input.css` line 1 was `@import "tailwindcss" source("..");` (the Eleventy-era filesystem-scan mode). `assets/css/main.css` replaces this with:
   ```css
   @import "tailwindcss";

   @source "hugo_stats.json";
   ```
   This is the Hugo + Tailwind v4 pattern (per RESEARCH Pattern 4). The `source("..")` mode does not work with Hugo's asset pipeline because Hugo classes live in `layouts/**` and are known via `hugo_stats.json`, not via a filesystem walk of the parent directory. Every other line of `input.css` is byte-identical.

2. **One trailing blank line.** The ported CSS body has an extra blank line between the last rule and the `/* Version: v1.0.0 */` footer comment — an artefact of the `printf "\n/* Version: v1.0.0 */\n"` in the build command. Whitespace only. Zero visual or functional effect on compiled CSS.

## Out-of-scope observation

**None of the JavaScript files in `src/js/` (now `static/js/`) had narrative headers or version footers.** This was a pre-existing gap in the codebase; no file was created or modified in this plan, so adding headers would have been out of scope. Recommendation: add narrative headers during each JS file's next functional touch, likely when its owning template is ported in Plans 13-05 through 13-14. The complete list of files lacking headers:

- `static/js/description.js`
- `static/js/entity-explorer.js`
- `static/js/entity.js`
- `static/js/header.js`
- `static/js/infinite-bipartite-explorer.js`
- `static/js/place-explorer.js`
- `static/js/place.js`
- `static/js/search.js`
- `static/js/tree.js`

Flagging here so the gap is tracked, not forgotten.

## Untouched (per plan scope)

Verified via `git status` that the following were not modified or moved:

- `src/_data/*` — enrichment script still reads `src/_data/ui.js` until Plan 13-15
- `src/_includes/*.njk` — header, footer, breadcrumb sources for Plan 13-05
- `src/_layouts/base.njk` — source for Plan 13-05's baseof.html
- `src/*.njk` — page templates for Plans 13-06 through 13-11
- `src/explorar/*.njk` — sources for Plan 13-14
- `hugo.toml`, `package.json`, `build.sh`, `eleventy.config.js`
- Any `.planning/phases/` file except this SUMMARY

## Forward pointer for Plan 13-05

Plan 13-05 ports the base layout + global partials (base.njk → baseof.html, header.njk → _partials/header.html, footer.njk → _partials/footer.html, breadcrumb.njk → _partials/breadcrumb.html, plus the new _partials/css.html for Tailwind).

When Plan 13-05's baseof.html is written, it can reference the literal paths the Eleventy templates use — **no URL rewriting needed**:

- `<link rel="icon" type="image/png" href="/img/favicon.png">` — resolves from `static/img/favicon.png`
- `<script src="/js/header.js"></script>` — resolves from `static/js/header.js`
- `<img src="/img/zasqua-3-burgundy-sm.svg" alt="...">` (inside header.html) — resolves from `static/img/zasqua-3-burgundy-sm.svg`

The **only** URL that requires a Hugo expression (not a literal) is the CSS entry: use `{{ with resources.Get "css/main.css" | css.TailwindCSS }}...{{ .RelPermalink }}{{ end }}` in the `css.html` partial. Hugo's `resources.Get` reads from `assets/css/main.css`; the output lives at `/css/main.css` in dev (un-fingerprinted when `hugo.IsDevelopment`) or `/css/main.HASH.css` in prod (fingerprinted + SRI). Both load identical CSS — only the cache-bust URL differs.

Plan 13-05's `css.html` partial must use `templates.Defer` so Hugo finishes rendering all pages (populating `hugo_stats.json`) before Tailwind scans for classes. Pattern documented in `.planning/phases/13-hugo-foundation/13-RESEARCH.md` §"Pattern 2: Tailwind v4 Partial with css.TailwindCSS".

## Human checkpoint approval

User approved the plan as complete after confirming:
- All 10 curl spot-checks returned 200 with matching byte sizes
- Understood that the Hugo server root still shows Hugo's built-in default rendering (no layouts yet) — visual port begins in Plan 13-05
- Two documented divergences (Tailwind `@source` swap + trailing blank line) acceptable

Hugo server left running on port 1313 for continuity into Plan 13-05.

## Safety tag

`abandoned/phase-13-04-first-attempt` still in place, pointing at commit `a81e5c0` (the pre-revert state with the stub templates). Reachable via `git reset --hard abandoned/phase-13-04-first-attempt` if ever needed, though nothing in the current execution plan intends to resurrect any of that work.

## Version

Version: v1.0.0
