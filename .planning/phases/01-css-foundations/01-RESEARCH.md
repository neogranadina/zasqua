# Phase 1: CSS Foundations — Research

**Researched:** 2026-03-24
**Domain:** Tailwind CSS v4 standalone CLI integration; design token migration; 11ty build pipeline
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Introduce Tailwind CSS v4 as the CSS framework, replacing the current vanilla CSS approach
- **D-02:** Use the Tailwind standalone CLI binary — no npm dependency, no PostCSS config. CI downloads the binary in the workflow. This aligns with the minimal computing principle (one binary, no node_modules bloat)
- **D-03:** Full migration in Phase 1 — set up Tailwind, define tokens, convert ALL templates to utility classes, reduce main.css to a minimal base. Not a phased/hybrid approach
- **D-04:** Use Tailwind's `@theme` naming conventions (`--color-burgundy`, `--font-sans` etc.) matching `design-tokens.md`. This aligns naming with zasqua-catalogacion which uses the same tokens via Tailwind v4 `@theme`
- **D-05:** Complex component CSS (Miller columns, masonry grid, TIFY viewer, Pagefind search UI) stays as named CSS classes in a `@layer components` block within the Tailwind input stylesheet. Simple styling moves to utility classes in templates
- **D-06:** Google Fonts import updated to load trimmed weights: DM Sans 400/600, Crimson Text 400/700, Cormorant Garamond 600
- **D-07:** Font variable mapping: `--font-sans` = DM Sans, `--font-serif` = Crimson Text, `--font-display` = Cormorant Garamond
- **D-08:** All colour tokens from `design-tokens.md` defined in `@theme`
- **D-09:** Neutral colours use Tailwind's built-in `stone` scale — no custom neutral tokens
- **D-10:** Background colour changes to warm white (`#FAFAF9`) from pure white
- **D-11:** All 116 hardcoded hex values in main.css are eliminated

### Claude's Discretion

- Pill shape pattern for rounded interactive elements (border-radius: 50px) — planner decides whether to codify as a `@layer components` class or apply via `rounded-full` utility in each template

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIS-01 | Google Fonts import updated to load DM Sans, Crimson Text, and Cormorant Garamond (replacing Lato and IM Fell DW Pica) | Exact `<link>` string confirmed in UI-SPEC line 96; base.njk line 13 is the single location to update |
| VIS-02 | `--font-body` and `--font-heading` set to DM Sans; `--font-logo` set to Crimson Text; `--font-serif` remains Cormorant Garamond | Tailwind v4 `@theme` replaces `:root` variables; new names are `--font-sans`, `--font-serif`, `--font-display` per D-07; old variable names in `:root` are deprecated |
| COL-01 | CSS custom properties updated with new palette — burgundy primary, periwinkle secondary, warm gray neutrals, dark burgundy footer | `@theme` block in `input.css` carries all brand tokens; stone scale built in; exact hex values confirmed in design-tokens.md |
| COL-02 | All hardcoded colour values in `main.css` replaced with CSS variables or updated to match new palette | 116 confirmed hardcoded hex values (grep count); they fall into three buckets: neutral grays (→ stone utilities), brand accents (→ token utilities), and structural whites/blacks (→ stone utilities or `@layer components`) |
| COL-03 | Accent/selection colour changed from blue to periwinkle across search, Miller columns, filter pills, and pagination | Current offenders: `rgba(41,98,255,0.8)` and `#2c3e50` throughout search.js-generated DOM, main.css search/tree sections; replacement is `#C9D5FF` (periwinkle token) |
| COL-04 | Hover accent changed from orange to periwinkle/burgundy across links, buttons, and interactive elements | Current offenders: `#f18e00` (hover), `#F2784B` (link hover) in `:root` and throughout; replacements are `--color-periwinkle` and `--color-burgundy-light` |
</phase_requirements>

---

## Summary

Phase 1 is a build-pipeline and token migration, not a new feature. The scope is: wire the Tailwind v4 standalone CLI into the build chain, replace the existing `src/css/main.css` with a Tailwind input stylesheet, move all design tokens into `@theme`, convert every template from handwritten CSS class names to Tailwind utility classes where practical, and preserve complex component CSS in `@layer components`.

The work has three distinct layers. First, infrastructure: the standalone CLI binary needs to be integrated into local builds (`build.sh`) and the CI workflow (`deploy.yml`). The Eleventy passthrough config copies CSS already — but the input file name changes and an output path must be wired correctly. Second, the stylesheet itself: `src/css/main.css` (2,489 lines, 116 hardcoded hex values, 20 sections) is replaced by a new `src/css/input.css` that Tailwind compiles into `src/css/main.css` (output). Third, templates: the five Nunjucks templates and three partials must have their inline class attributes updated to use Tailwind utility classes; JS files that inject class names dynamically must either have their classes preserved in `@layer components` or be updated to emit new utility-compatible class names.

The zasqua-catalogacion `app/app.css` is the directly reusable reference — its `@theme` block defines exactly the same tokens in exactly the same format and was written by the same team. The main difference for zasqua-frontend is the `source()` directive scope (pointing at `src/` not `.`) and the larger `@layer components` block needed to cover the 20-section legacy stylesheet.

**Primary recommendation:** Create `src/css/input.css` with `@import "tailwindcss" source("../src")`, copy the `@theme` block verbatim from zasqua-catalogacion, write `@layer base` for html/body/heading resets, and write `@layer components` for the named classes from all 20 CSS sections that cannot be replaced by utilities. Configure Tailwind CLI to output to `src/css/main.css` so all existing template references to `/css/main.css` remain valid with no template changes needed for the CSS link itself.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 standalone CLI | v4.2.2 (2026-03-18) | CSS framework and build tool | Locked per D-01/D-02; used by zasqua-catalogacion; no Node.js dependency |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Google Fonts CDN | — | DM Sans, Crimson Text, Cormorant Garamond | Font loading in base.njk; trimmed weights per D-06 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Standalone binary | npm package | npm would add a second devDependency alongside Eleventy; rejected per D-02 |
| Standalone binary | pytailwindcss (pip) | Same binary, different delivery; pip already used for b2/boto3 in CI but adds coupling |

**Installation (standalone binary — macOS arm64):**
```bash
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-arm64
chmod +x tailwindcss-macos-arm64
mv tailwindcss-macos-arm64 tailwindcss
```

**CI download (ubuntu-latest, x64):**
```bash
curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-linux-x64
chmod +x tailwindcss-linux-x64
mv tailwindcss-linux-x64 tailwindcss
./tailwindcss -i src/css/input.css -o src/css/main.css --minify
```

**Version verification:** v4.2.2 confirmed via GitHub API (`github.com/tailwindlabs/tailwindcss/releases/latest`), published 2026-03-18.

---

## Architecture Patterns

### Recommended Project Structure (post-migration)

```
src/css/
├── input.css       ← NEW: Tailwind source file (committed)
└── main.css        ← Tailwind CLI output (committed or generated at build time)
```

The current `src/css/main.css` becomes the output target. `input.css` is the new source of truth.

### Pattern 1: Tailwind v4 `@theme` block (direct reuse from zasqua-catalogacion)

**What:** Defines brand tokens that generate Tailwind utility classes automatically.
**When to use:** All brand colour and font tokens. Never hardcode hex values anywhere else.

```css
/* Source: zasqua-catalogacion-dev/app/app.css (exact reference implementation) */
@import "tailwindcss" source("../src");

@theme {
  --color-burgundy: #8B2942;
  --color-burgundy-deep: #6B1F33;
  --color-burgundy-light: #B14D66;
  --color-burgundy-dark: #4A1522;
  --color-pale-rose: #F5E6EA;
  --color-ochre: #C5965F;
  --color-sage: #8A9B8E;
  --color-periwinkle: #C9D5FF;
  --color-bg: #FAFAF9;

  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-serif: "Crimson Text", ui-serif, Georgia, Cambria, "Times New Roman",
    Times, serif;
  --font-display: "Cormorant Garamond", ui-serif, Georgia, Cambria,
    "Times New Roman", Times, serif;
}
```

Note: `--color-periwinkle` and `--color-bg` are additions not present in catalogacion's theme block — add them here.

### Pattern 2: `@layer base` for HTML/body reset

**What:** Global element defaults that replace the current Reset & Base section of main.css.
**When to use:** html, body, heading tags, anchor defaults, img reset.

```css
/* Source: Tailwind v4 docs; adapted from current main.css lines 47-89 */
@layer base {
  html {
    font-size: 16px;
    line-height: 1.6;
    background-color: #FAFAF9; /* --color-bg */
  }
  body {
    @apply font-sans text-stone-600;
    margin: 0;
    padding: 0;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-sans font-semibold text-stone-900;
    margin-top: 0;
    line-height: 1.3;
  }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.25rem; }
  a { @apply text-stone-900 no-underline; }
  a:hover { @apply text-burgundy-light underline; }
  img { max-width: 100%; height: auto; }
}
```

### Pattern 3: `@layer components` for named CSS classes

**What:** Preserves the named class system for components that cannot use utility classes directly — primarily because JS creates DOM elements with hardcoded class names, or because the component has too many properties for inline utilities.
**When to use:** All 20 legacy sections that have JS-referenced class names, or components with >5 CSS properties.

```css
/* Source: Tailwind v4 docs — @layer components pattern */
@layer components {
  .container {
    max-width: var(--max-width, 1200px);
    margin: 0 auto;
    padding: 0 15px;
  }

  /* Miller columns — tree.js creates elements with these class names */
  .miller-columns { /* ... */ }
  .miller-column { /* ... */ }
  .miller-item { /* ... */ }
  .miller-item.selected { @apply bg-burgundy-deep text-white; }
  .miller-item.selected-ancestor { background: rgba(107,31,51,0.5); @apply text-white; }

  /* Filter pills — search.js creates elements with these class names */
  .filter-pill {
    @apply inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-stone-800 text-white;
  }

  /* Pagefind search UI overrides */
  .search-input {
    @apply border border-stone-300 rounded-full bg-stone-50 px-4 py-3;
    transition: border-color 0.2s, background-color 0.2s;
  }
  .search-input:focus {
    @apply border-burgundy-light bg-white outline-none;
  }
}
```

### Pattern 4: Source detection for 11ty project

**What:** `source("../src")` in the `@import` directive tells Tailwind to scan all non-CSS files inside `src/` for utility class names.
**When to use:** `input.css` lives in `src/css/`; templates live in `src/`. The `..` traversal from the CSS file's location points Tailwind at the right root.

```css
/* Source: Tailwind v4 docs — source() directive */
@import "tailwindcss" source("../src");
```

This replaces the catalogacion pattern `source(".")` (which works from the app root). The 11ty project's `input.css` is one level down from `src/`, hence `../src`.

### Pattern 5: CSS link output path — keep `/css/main.css` as the output target

**What:** Tailwind CLI outputs to `src/css/main.css`. The Eleventy passthrough `addPassthroughCopy("src/css")` already copies everything in `src/css/` to `_site/css/`. Templates reference `/css/main.css`. No template changes are needed for the CSS link itself.
**When to use:** Wiring the CLI build command. Output must be `src/css/main.css`, not a different filename.

```bash
./tailwindcss -i src/css/input.css -o src/css/main.css --minify
```

### Pattern 6: Layout constants as standard CSS custom properties

**What:** Two layout values (`--max-width` and `--header-height`) are not Tailwind tokens — they are layout constants used in `calc()` expressions. Keep them as plain CSS custom properties in `@layer base` or at the `:root` level, outside `@theme`.
**When to use:** Any value used in `calc()` that is not a Tailwind spacing token.

```css
/* In @layer base or at :root — NOT in @theme */
:root {
  --max-width: 1200px;
  --header-height: 70px;
}
```

### Anti-Patterns to Avoid

- **Putting layout constants in `@theme`:** `--max-width` and `--header-height` are not Tailwind tokens. Tailwind v4 `@theme` variables become utility classes, which is not appropriate for values only used in `calc()`.
- **Writing `input.css` output directly to `_site/`:** Tailwind output must go to `src/css/main.css` so Eleventy passthrough copy picks it up with the rest of `src/css/`.
- **Running Tailwind after Eleventy in CI:** Tailwind must run before Eleventy so the compiled CSS is present when pages are built. Alternatively, Tailwind can run in parallel or as a pre-step.
- **Dynamically constructed utility class names in JS:** `search.js` and `tree.js` must either use static class names preserved in `@layer components`, or emit complete, statically spelled utility class names. Partial class names like `"bg-" + color` will not be detected by Tailwind's scanner.
- **Forgetting `!important` overrides in TIFY section:** `src/css/main.css` lines 2159–2230 use `!important` to override TIFY's internal CSS. These overrides must be preserved in `@layer components`. `@layer components` rules have lower specificity than arbitrary selectors, so `!important` is still needed in this block.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Colour token system | Custom CSS variable naming scheme | `@theme` in Tailwind v4 | Generates utility classes automatically; same system already used in zasqua-catalogacion |
| Neutral gray scale | Custom `--gray-100` through `--gray-900` variables | Tailwind `stone` scale built-in | stone scale is already calibrated for warm tones that match the burgundy palette |
| Build-time CSS compilation | Custom PostCSS pipeline | Tailwind standalone CLI | One binary, zero config, same output |
| Font-face declarations | Custom `@font-face` blocks | Google Fonts CDN `<link>` | Fonts already loaded this way; only the URL string changes |

**Key insight:** The zasqua-catalogacion codebase is a complete, working reference implementation of every token and pattern needed here. Do not invent — copy and adapt.

---

## Runtime State Inventory

Step 2.5: SKIPPED — this phase is not a rename, rebrand, or migration of stored identifiers. It replaces a CSS file and build pipeline configuration. No stored data, live service configs, OS registrations, secrets, or build artifacts carry the old CSS variable names as identifiers.

---

## Environment Availability Audit

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | Eleventy build | Must verify per machine | See `.nvmrc` | — (required) |
| Tailwind CLI standalone | CSS compilation | Not installed (not in project) | v4.2.2 available | Download from GitHub releases at build time |
| curl | CI binary download | Standard on ubuntu-latest | — | wget |
| npm | Eleventy install | Available | Present in package-lock.json | — |
| Google Fonts CDN | Font loading | External service | — | font-display: swap provides fallback |

**Missing dependencies with no fallback:**
- Tailwind CLI binary must be added to `build.sh` (local) and `deploy.yml` (CI). Neither file currently downloads it.

**Missing dependencies with fallback:**
- Google Fonts CDN outage: `font-display: swap` ensures body text falls back to `ui-sans-serif` / system stack.

**Step 2.6 notes:**
- Local development: the planner must decide whether to commit the binary to the repo (acceptable for a private dev repo), add it to `.gitignore` with a setup script, or require the developer to download it manually. The CI approach (download at build time) is confirmed correct per D-02. For local `build.sh`, the same download-at-build-time pattern is simplest and most consistent with CI.
- The Eleventy `addWatchTarget("src/css/")` in `eleventy.config.js` already watches CSS changes. During local dev, Tailwind CLI `--watch` can run in parallel with `eleventy --serve`. This is a new workflow detail not currently documented in `build.sh` or `package.json`.

---

## Common Pitfalls

### Pitfall 1: Breaking JS-referenced class names during template conversion

**What goes wrong:** `search.js` (53 KB) and `tree.js` create DOM elements with hardcoded class names like `.miller-item`, `.filter-pill`, `.search-results-list`, etc. If these class names are removed from the stylesheet without being added to `@layer components`, those elements lose all styling.
**Why it happens:** Tailwind's scanner looks for class names in HTML/Nunjucks files. It cannot see class names that are assembled at runtime in JavaScript strings like `el.className = 'miller-item selected'`.
**How to avoid:** Before removing any CSS rule from the old `main.css`, check if the class name appears in `src/js/`. If it does, the rule must move to `@layer components` in `input.css`.
**Warning signs:** Elements styled in JS appear unstyled after migration; the Tailwind scanner misses them entirely.

### Pitfall 2: Tailwind CLI must run before Eleventy

**What goes wrong:** If Eleventy runs first, it copies the old (or absent) `src/css/main.css` to `_site/css/main.css`. The new compiled CSS never makes it to the output.
**Why it happens:** Eleventy's passthrough copy runs once at build start; it copies whatever is in `src/css/` at that moment.
**How to avoid:** In `build.sh` and `deploy.yml`, run the Tailwind CLI step before `npx eleventy`. Alternatively, add Tailwind CLI as an Eleventy plugin or watch target — but the standalone binary approach makes a pre-step cleaner.
**Warning signs:** Deployed site renders with no styles or wrong styles even though the source files look correct.

### Pitfall 3: `source()` path resolved relative to input CSS file location

**What goes wrong:** Writing `@import "tailwindcss" source("./src")` when `input.css` lives inside `src/css/` causes Tailwind to look for `src/css/src/`, which doesn't exist.
**Why it happens:** The `source()` path is relative to the input CSS file, not to the project root.
**How to avoid:** Since `input.css` is at `src/css/input.css`, the correct path to the source root is `source("../src")` or `source("../..")` for the project root. Use `source("../src")` to match the 11ty source directory.
**Warning signs:** Tailwind generates an empty CSS file (only reset/base styles, no utilities) because no templates are found.

### Pitfall 4: `@theme` variables vs `:root` custom properties

**What goes wrong:** Mixing `@theme` variables and plain `:root` variables causes confusion. Code in `@layer components` tries to reference `var(--color-burgundy)` expecting a plain CSS custom property, but Tailwind v4 `@theme` also exposes variables as `var(--color-burgundy)` in the generated CSS — this actually works, but it must be understood.
**Why it happens:** In Tailwind v4, `@theme` variables are simultaneously Tailwind token definitions AND CSS custom properties available via `var()`. They live on `:root` in the compiled output.
**How to avoid:** No conflict in practice — `var(--color-burgundy)` works in both `@layer components` rules and inline styles. But avoid defining the same variable in both `@theme` and `:root` as they will collide. Layout constants (`--max-width`, `--header-height`) should live only in `:root`, not `@theme`.
**Warning signs:** Duplicate variable definitions; specificity conflicts between `@theme`-generated `:root` rules and explicit `:root` rules.

### Pitfall 5: TIFY vendor CSS overrides require `!important`

**What goes wrong:** TIFY's internal CSS uses specific selectors. The overrides in `main.css` lines 2120–2264 use `!important` to punch through. If these are rewritten as `@layer components` rules without `!important`, TIFY's CSS wins.
**Why it happens:** `@layer components` has lower cascade priority than regular (unlayered) CSS. TIFY's `tify.css` is unlayered and loaded via `addPassthroughCopy("src/vendor")`.
**How to avoid:** Keep all TIFY overrides in `@layer components` with `!important`, or move them outside any layer to ensure cascade priority.
**Warning signs:** TIFY viewer appears with wrong background colours or broken input styling after migration.

### Pitfall 6: Warm white background `#FAFAF9` not in `stone` scale

**What goes wrong:** The page background `#FAFAF9` (warm white) is not a named `stone` Tailwind class. Using `bg-stone-50` gives `#FAFAF8` (slightly different). The token `--color-bg` must be defined in `@theme` and applied as `bg-bg` or via `@layer base`.
**Why it happens:** Stone-50 hex is `#FAFAFA` in Tailwind v4, not `#FAFAF9`.
**How to avoid:** Define `--color-bg: #FAFAF9` in `@theme`. Apply to `html` or `body` in `@layer base` via `background-color: theme(--color-bg)` or `@apply bg-bg`.

---

## Code Examples

### Complete `input.css` skeleton

```css
/* Source: tailwindcss.com/docs/installation/tailwind-cli + zasqua-catalogacion-dev/app/app.css */
@import "tailwindcss" source("../src");

@theme {
  /* Brand colours */
  --color-burgundy: #8B2942;
  --color-burgundy-deep: #6B1F33;
  --color-burgundy-light: #B14D66;
  --color-burgundy-dark: #4A1522;
  --color-pale-rose: #F5E6EA;
  --color-ochre: #C5965F;
  --color-sage: #8A9B8E;
  --color-periwinkle: #C9D5FF;
  --color-bg: #FAFAF9;

  /* Font stacks */
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-serif: "Crimson Text", ui-serif, Georgia, Cambria, "Times New Roman",
    Times, serif;
  --font-display: "Cormorant Garamond", ui-serif, Georgia, Cambria,
    "Times New Roman", Times, serif;
}

/* Layout constants — NOT in @theme (used in calc(), not as utility tokens) */
:root {
  --max-width: 1200px;
  --header-height: 70px;
}

@layer base {
  /* html/body/heading/link resets adapted from main.css lines 47–89 */
}

@layer components {
  /* All 20 sections from main.css that cannot be replaced by utilities */
  /* Including all JS-referenced class names */
}
```

### Google Fonts replacement link (base.njk line 13)

```html
<!-- Source: design-tokens.md Font Loading + UI-SPEC Typography section -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Crimson+Text:wght@400;700&family=Cormorant+Garamond:wght@600&display=swap" rel="stylesheet" />
```

### Tailwind CLI build commands

```bash
# Local build (single pass)
./tailwindcss -i src/css/input.css -o src/css/main.css --minify

# Local dev (watch mode, run alongside eleventy --serve)
./tailwindcss -i src/css/input.css -o src/css/main.css --watch

# CI (linux-x64 binary)
./tailwindcss-linux-x64 -i src/css/input.css -o src/css/main.css --minify
```

### Verifying hardcoded hex elimination

```bash
# After build — count hardcoded hex values in output CSS outside @theme/:root
# Should return 0 (or a very small number for TIFY-specific unavoidable values)
grep -v "^  --" src/css/main.css | grep -c "#[0-9a-fA-F]\{3,6\}"
```

### JavaScript inline style pattern (must use `var()` not computed values)

```javascript
// Source: frontend-design.md "Usage in JavaScript" section
// Good — CSS variable used directly, adapts to theme changes
element.style.color = 'var(--color-burgundy-deep)';
element.style.backgroundColor = 'var(--color-periwinkle)';

// Bad — reads computed value, bypasses token system
const color = getComputedStyle(document.documentElement).getPropertyValue('--color-burgundy-deep');
element.style.color = color; // Now a static value
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` | Tailwind v4 (2025) | Single import replaces three directives |
| `tailwind.config.js` | `@theme {}` block in CSS | Tailwind v4 (2025) | No JavaScript config file; tokens live in CSS |
| `theme.extend.colors` in JS config | `--color-*` in `@theme {}` | Tailwind v4 (2025) | CSS-first configuration |
| `purge: []` or `content: []` in config | `source()` in `@import` or `@source` directives | Tailwind v4 (2025) | Source scanning configured in CSS, not JS |
| `@apply` for all component styles | `@layer components` with plain CSS or `@apply` | Tailwind v4 (2025) | Both `@apply` and plain CSS work in v4 |

**Deprecated/outdated:**
- `tailwind.config.js`: Replaced by `@theme` in v4. Do not create one.
- `postcss.config.js`: Not needed with standalone CLI. Do not create one.
- `@tailwind` directives: Replaced by `@import "tailwindcss"` in v4.

---

## Open Questions

1. **Should `input.css` be committed or generated?**
   - What we know: `input.css` is source code; `main.css` (output) could be generated at build time or committed
   - What's unclear: For local dev without running the full Tailwind CLI, does a committed `main.css` help?
   - Recommendation: Commit both. Commit `input.css` as the source of truth; commit `main.css` as the compiled output so `npm run dev` (Eleventy only, no Tailwind) still works without requiring the binary. Update `.gitignore` if needed to allow `src/css/main.css` to be tracked.

2. **Where to store the Tailwind binary in the dev repo?**
   - What we know: D-02 says standalone CLI binary; CI downloads it at build time
   - What's unclear: Local workflow — should `build.sh` download it every time, or should developers install it once?
   - Recommendation: Add a binary download step to `build.sh` that checks if `./tailwindcss` exists before downloading (`[ -f ./tailwindcss ] || curl ...`). CI always downloads to ensure the correct version. Add `tailwindcss` and `tailwindcss-linux-x64` to `.gitignore`.

3. **Pill shape: `@layer components` class or `rounded-full` utility?**
   - What we know: Shared visual language spec calls for `border-radius: 50px` on all interactive controls; JS files create some of these elements
   - What's unclear: Whether `rounded-full` (which produces `border-radius: 9999px`, functionally identical to `50px` for non-circular elements) is acceptable
   - Recommendation (Claude's discretion): Define a `.pill` class in `@layer components` with `border-radius: 50px` and all shared pill properties (transition, padding, font-size). Apply `@apply pill` in templates where applicable, and reference `.pill` directly in JS-created elements. This avoids repeating the same 5+ properties across dozens of utility class strings while keeping pill-ness semantically named and JS-safe.

---

## Validation Architecture

No test framework is currently configured in this project — `package.json` has no `test` script, and no jest/vitest/playwright config files exist. This is a CSS migration phase; the natural validation approach is visual inspection plus automated CSS auditing.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no automated test framework. Validation is via CSS audit scripts and visual inspection |
| Config file | Not applicable |
| Quick run command | `grep -c "#[0-9a-fA-F]\{3,6\}" src/css/main.css` (hardcoded hex count; target: only within `:root`/`@theme`) |
| Full suite command | `npm run build:dev` (full Tailwind + Eleventy build in dev mode) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | DM Sans/Crimson Text/Cormorant Garamond loaded; Lato/IM Fell DW Pica absent | manual | Open DevTools → Network → filter Fonts | N/A |
| VIS-02 | `font-sans`, `font-serif`, `font-display` tokens resolve to correct families | manual | `getComputedStyle(document.body).fontFamily` in console | N/A |
| COL-01 | `--color-burgundy` and siblings defined in compiled CSS | smoke | `grep "color-burgundy" src/css/main.css` → must appear | ❌ Wave 0 |
| COL-02 | Zero hardcoded hex values outside `:root`/`@theme` | smoke | `grep -v "^\s*--" src/css/main.css \| grep -c "#[0-9a-fA-F]\{3,6\}"` → 0 | ❌ Wave 0 |
| COL-03 | No blue accent (`rgba(41,98,255`) or `#2c3e50`) in compiled CSS | smoke | `grep -c "41,98,255\|2c3e50\|003660" src/css/main.css` → 0 | ❌ Wave 0 |
| COL-04 | No orange hover (`#f18e00`, `#F2784B`) in compiled CSS | smoke | `grep -c "f18e00\|F2784B" src/css/main.css` → 0 | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Run the smoke `grep` commands (COL-01 through COL-04) — fast, no build required
- **Per wave merge:** `npm run build:dev` — full Tailwind + Eleventy build, visual inspection of homepage and search page
- **Phase gate:** Full `build:dev` green + all four `grep` checks pass + visual confirmation of typography and colour in browser before closing Phase 1

### Wave 0 Gaps

- [ ] `scripts/check-css-tokens.sh` — shell script wrapping the four grep smoke checks for COL-01 through COL-04; saves repeating commands manually
- [ ] Tailwind CLI binary available locally before any implementation task runs

*(No existing test infrastructure to build on — all validation is new for this phase)*

---

## Sources

### Primary (HIGH confidence)

- `zasqua-catalogacion-dev/app/app.css` — Direct reference implementation; `@theme` block is copy-pasteable for brand tokens
- `.planning/phases/01-css-foundations/01-CONTEXT.md` — Locked decisions D-01 through D-11; canonical source for all implementation choices
- `.planning/phases/01-css-foundations/01-UI-SPEC.md` — Exact token values, Google Fonts URL, spacing decisions
- `../docs/frontend/guidelines/design-tokens.md` — Canonical token hex values and font stack strings
- `src/css/main.css` — Existing 2,489-line stylesheet; audited for hardcoded hex count (116 confirmed) and section structure
- GitHub API (`github.com/tailwindlabs/tailwindcss/releases/latest`) — Confirmed v4.2.2, 2026-03-18
- `tailwindcss.com/docs/installation/tailwind-cli` — CLI flag syntax (`-i`, `-o`, `--watch`, `--minify`)
- `tailwindcss.com/docs/detecting-classes-in-source-files` — `source()` directive behaviour and path resolution

### Secondary (MEDIUM confidence)

- `../docs/frontend/guidelines/frontend-design.md` — Visual design guidelines; confirmed colour token usage rules
- `../docs/frontend/guidelines/shared-visual-language.md` — Pill pattern spec; confirmed pill shape is `border-radius: 50px`
- `.planning/codebase/CONVENTIONS.md`, `STACK.md`, `STRUCTURE.md` — Codebase analysis; confirmed passthrough copy, build pipeline, and JS class naming patterns

### Tertiary (LOW confidence)

- None — all findings for this phase are verifiable against the codebase and official docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — version confirmed via GitHub API
- Architecture patterns: HIGH — reference implementation exists in zasqua-catalogacion; Tailwind v4 docs verified
- Pitfalls: HIGH — derived directly from auditing existing `src/js/` files and `main.css` structure; not speculation

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (stable Tailwind v4 API; check for new minor releases at build time)
