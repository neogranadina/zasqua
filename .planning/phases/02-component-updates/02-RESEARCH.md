# Phase 2: Component Updates - Research

**Researched:** 2026-03-24
**Domain:** CSS tokenisation, Nunjucks template styling, Tailwind v4 utility application
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Header Nav Styling**
- D-01: Nav link hover effect is a periwinkle underline (border-bottom on the anchor), text stays dark stone-900. Replaces the current stone grey colour change
- D-02: Header search pill — Claude's discretion on visual treatment. At minimum, replace hardcoded hex values with token references
- D-03: All hardcoded colours in the header map to stone tokens: #1C1917→stone-900, #dedede→stone-300, #f0f0f0→stone-100, #A8A29E→stone-400

**Homepage Hero & Masonry**
- D-04: Hero search button stays as-is — do NOT apply burgundy fill. COMP-03's button criterion is intentionally skipped
- D-05: Hero title keeps Crimson Text (font-serif) — no change to font-display
- D-06: Masonry grid hover overlay becomes semi-transparent burgundy (e.g., rgba(139,41,66,0.85)) replacing the previous colour

**Search Page**
- D-07: Active/selected filter pills get bg-burgundy + white text, distinguishing them from unselected dark stone pills
- D-08: Active pagination number gets bg-periwinkle + stone-900 dark text
- D-09: Sort controls, facet labels, and panel borders map to stone scale — neutral, no brand colour treatment

**Description & Repository Pages**
- D-10: Burgundy link placement — Claude's discretion. Apply base link colours consistently and adjust where needed
- D-11: Miller column selection styling stays as-is — no periwinkle change needed
- D-12: Metadata section headers keep current styling — just ensure hardcoded colours are replaced with token references
- D-13: Level badges (periwinkle bg) and warm white background (#FAFAF9) already completed in Phase 1 — no changes needed

### Claude's Discretion
- D-02: Header search pill visual treatment (beyond tokenising hardcoded values)
- D-10: How to apply burgundy links across description pages — all links or selective

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | Header redesigned — pomegranate logo + "Neogranadina: Zasqua" lockup in Crimson Text, DM Sans navigation, periwinkle hover underlines | D-01/D-03: nav hover changes in `.site-nav a:hover`, logo + lockup already in header.njk |
| COMP-02 | Footer redesigned — dark burgundy background replacing navy | footer.njk already uses `bg-burgundy-dark text-white`; CSS `.site-footer` uses `var(--color-burgundy-dark)` — largely done in Phase 1 |
| COMP-03 | Homepage hero updated — SKIPPED (D-04: hero search button stays as-is) | Only residual hardcoded hex values need tokenising |
| COMP-04 | Homepage masonry grid — hover overlay becomes burgundy instead of prior colour | `.repo-overlay` already uses `rgba(107, 31, 51, 0.85)` — this is done; verify via D-06 spec |
| COMP-05 | Search page updated — periwinkle filter pills, burgundy active pagination, updated sort/facet styling | D-07: active pills → bg-burgundy; D-08: active pagination → bg-periwinkle stone-900 text; D-09: sort/facet → stone scale tokens |
| COMP-06 | Description page updated — periwinkle level badges, burgundy links, updated metadata section headers | D-13: level badges done; D-10: apply burgundy to `.detail-field a`; D-12: tokenise hardcoded values |
| COMP-07 | Repository page updated — SKIPPED (D-11: Miller column selection stays as-is) | Only hardcoded hex tokenisation needed |
| COMP-08 | Background colour changed to warm white (#FAFAF9) | Already done in Phase 1: `@theme { --color-bg: #FAFAF9 }` and `html { background-color: var(--color-bg) }` |
</phase_requirements>

---

## Summary

Phase 2 is primarily a CSS tokenisation and targeted interactive-state styling pass. Phase 1 already established all design tokens in `@theme`, set the warm-white background, styled the footer, added level badges in periwinkle, and set the masonry overlay to burgundy. The bulk of Phase 2 work is: (1) replacing the ~190 remaining hardcoded hex values in `input.css` with `var(--color-*)` token references or Tailwind utility `@apply` calls, and (2) applying the specific interactive-state colour decisions for nav links, active filter pills, and active pagination.

Several COMP requirements are already fully or partially satisfied by Phase 1 work (COMP-02, COMP-04, COMP-08, partially COMP-06). Others (COMP-03, COMP-07 selection state) are intentionally skipped per user decisions D-04 and D-11. The remaining work is well-scoped: the single file `src/css/input.css` is the only CSS file to touch, and the changes are isolated to specific named CSS classes.

The one area requiring genuine design judgment is D-10 (burgundy links on description pages). The base `a` style in `@layer base` already applies `text-burgundy-light` on hover. The `.detail-field a` style has its own colour override. The decision is whether to bring `.detail-field a` default colour to burgundy-light or keep it dark stone with only hover treatment.

**Primary recommendation:** Work section by section through `input.css`, replacing hardcoded hex values with their token equivalents, then apply the four targeted interactive-state changes (D-01, D-06, D-07, D-08). Verify after each section using a local build.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 (standalone CLI) | 4.x | Utility classes, @theme tokens, @layer components | Established in Phase 1 — binary already in CI |
| Eleventy | 3.x | Static site build | Project SSG |
| Node.js | 22 | Build runtime | .nvmrc pins v22 |

No new dependencies are needed for Phase 2. All tools are already in place.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

No structural changes. All work goes into:

```
src/
├── css/
│   └── input.css        # Only CSS file to modify
├── _includes/
│   ├── header.njk       # D-01: nav hover underline
│   └── footer.njk       # Already complete from Phase 1
├── index.njk            # D-04/D-06: hero + masonry (verify existing state)
├── buscar.njk           # Static shell — search UI is DOM-built by search.js
├── description.njk      # D-10: link colour
└── repository.njk       # D-11: no change to miller selection
```

### Pattern 1: Replacing Hardcoded Hex Values

**What:** Most hardcoded hex values in `input.css` map directly to named Tailwind stone tokens or brand token variables. The mapping is straightforward.

**Canonical token map (from D-03 and design-tokens.md):**

| Hardcoded value | Replace with | Notes |
|----------------|--------------|-------|
| `#1C1917` | `var(--color-stone-900)` or `@apply text-stone-900` | stone-900 canonical |
| `#dedede` | `var(--color-stone-300)` | borders, dividers |
| `#f0f0f0` | `var(--color-stone-100)` | light dividers |
| `#A8A29E` | `var(--color-stone-400)` | muted text, secondary UI |
| `#78716C` | `var(--color-stone-500)` | secondary body text |
| `#57534E` | `var(--color-stone-600)` | secondary labels |
| `#292524` | `var(--color-stone-900)` | stone-900 (dark pill background, existing filter-pill uses this) |
| `#F5F5F4` | `var(--color-stone-100)` | light grey backgrounds |
| `#fff` / `#ffffff` | keep as-is or `white` | no token replacement needed for white |
| `rgba(107,31,51,0.5)` (selected-ancestor) | `rgba(var(--color-burgundy-deep-rgb), 0.5)` or keep raw value | no token for rgba — keep raw or use CSS color-mix |
| `#b8c4f0` (level-badge border) | keep as-is | no matching token; specific to level-badge |

**Note on stone tokens in `@layer components`:** In Tailwind v4, `@apply text-stone-900` works inside `@layer components`. For CSS property values (e.g., `border: 1px solid`), use `var(--color-stone-300)` directly — Tailwind v4 `@theme` generates CSS variables for all built-in scales.

**Tailwind v4 CSS variable naming for stone scale:**
- `--color-stone-50` through `--color-stone-950` are generated automatically
- Access via `var(--color-stone-300)` inside `@layer components` CSS

### Pattern 2: Interactive State Targeting

**D-01 — Nav hover underline (periwinkle):**

Current state in `input.css` (lines 141–145):
```css
.site-nav a:hover,
.site-nav a.active {
  color: #A8A29E;   /* grey colour change — REPLACE */
  text-decoration: none;
}
```

Replace with:
```css
.site-nav a:hover,
.site-nav a.active {
  color: var(--color-stone-900);  /* text stays dark */
  text-decoration: none;
  border-bottom: 2px solid var(--color-periwinkle);
}
```

The nav links already have `padding: 0.5rem 0` which provides space for the border-bottom. No template changes needed.

**D-07 — Active filter pills (burgundy):**

Current state (line 1383–1392): `.filter-pill` uses `background: #292524` (stone-900 equivalent) for ALL pills. D-07 says active/selected pills get bg-burgundy while unselected pills keep dark stone.

This requires checking `search.js` to see how selected vs unselected pills are rendered — whether they use the same class or different classes. If JS creates a single `.filter-pill` class for all pills, a modifier class (e.g., `.filter-pill.selected` or `.filter-pill-active`) needs to be added in both CSS and JS.

**D-08 — Active pagination (periwinkle bg, stone-900 text):**

Current state (lines 1446–1450):
```css
.pagination-link.active {
  background: var(--color-burgundy-deep);  /* deep burgundy — CHANGE to periwinkle */
  color: #fff;                              /* white text — CHANGE to stone-900 */
  border-color: var(--color-burgundy-deep);
}
```

Replace with:
```css
.pagination-link.active {
  background: var(--color-periwinkle);
  @apply text-stone-900;
  border-color: var(--color-periwinkle);
}
```

**D-06 — Masonry hover overlay (burgundy):**

Current state (line 484):
```css
.repo-overlay {
  background: rgba(107, 31, 51, 0.85);
```

This is already set to a burgundy tone (`#6B1F33` = burgundy-deep at 0.85 opacity). Per D-06 spec of `rgba(139,41,66,0.85)` (which is `#8B2942` = burgundy at 0.85), the value needs a minor update from deep to primary burgundy.

### Pattern 3: Description Page Link Styling (D-10)

The base `@layer base` already sets:
```css
a { @apply text-stone-900 no-underline; }
a:hover { @apply text-burgundy-light underline; }
```

The `.detail-field a` override at line 2164–2172 explicitly re-sets colour to `#1C1917` (stone-900) with a light underline. This means all description field links are dark with a subtle underline decoration, and turn burgundy-light on hover — already consistent with the base.

**Recommendation for D-10 (Claude's discretion):** Keep `.detail-field a` dark (stone-900) with underline-decoration pattern. Do NOT override to `text-burgundy` for default state — this would make all metadata links (which are often raw text values like dates and reference codes) look like clickable actions. Apply burgundy only on hover via the existing base rule. This is the "selective" interpretation.

### Anti-Patterns to Avoid

- **Using arbitrary Tailwind values `bg-[#1C1917]` instead of token references:** Defeats the purpose of tokenisation. Use `var(--color-stone-900)` or `@apply` utilities.
- **Modifying templates to apply utility classes for what belongs in `@layer components`:** Per Phase 1 D-05, complex component styling stays in `@layer components`. Do not scatter interactive state colours across Nunjucks templates.
- **Touching `main.css`:** This is the old pre-Tailwind CSS file. It appears to still exist but `input.css` is the Tailwind entry point and the only file served. All Phase 2 changes go in `input.css` only.
- **Changing class names used by JS:** `search.js` and `tree.js` create DOM elements with class names like `.filter-pill`, `.pagination-link`, `.miller-item`. Any CSS class name changes break the JS.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Colour token references | Custom CSS variables | Tailwind v4 `@theme` + `var(--color-*)` | Already established in Phase 1 |
| Utility class application inside components | Custom properties | `@apply` inside `@layer components` | Tailwind v4 supports this natively |
| Stone scale colour lookup | Manual hex matching | Tailwind's built-in stone scale CSS vars | `--color-stone-300`, `--color-stone-900` etc. are auto-generated |

**Key insight:** The design token infrastructure is fully in place from Phase 1. Phase 2 is purely a find-and-replace pass over the CSS, not a new architectural problem.

---

## Common Pitfalls

### Pitfall 1: Stone Scale Variable Availability

**What goes wrong:** Writing `var(--color-stone-300)` in `@layer components` and it resolves to nothing, because Tailwind only generates CSS variables for tokens actually used in utility classes present in scanned templates.

**Why it happens:** Tailwind v4 scans templates at build time. If no template uses `border-stone-300`, the `--color-stone-300` variable might not appear in the compiled output.

**How to avoid:** Two options: (a) Add `@apply border-stone-300` instead of the raw CSS property, or (b) add a `@source` safelist for stone values, or (c) define the stone values explicitly in `:root` for the specific values needed. Option (a) is cleanest.

**Warning signs:** Borders or text appearing in browser defaults (black/transparent) instead of the expected grey.

### Pitfall 2: Filter Pill Selected State — JS Class Name

**What goes wrong:** Adding a `.filter-pill.selected` CSS modifier but not adding the corresponding class in `search.js` DOM creation.

**Why it happens:** The pill creation logic in `search.js` uses imperative DOM creation. CSS changes and JS class assignment must be coordinated.

**How to avoid:** Read the `search.js` pill-rendering code before writing CSS. Identify whether pills are created with a single `.filter-pill` class or whether selected/active state is already tracked. If a new modifier class is needed, add it in both places.

**Warning signs:** All pills appear burgundy (if the new class is never applied) or no pills change colour at all.

### Pitfall 3: `main.css` vs `input.css` confusion

**What goes wrong:** Editing `main.css` instead of `input.css`. The build uses `input.css` as the Tailwind source; `main.css` is the old file that still exists but is superseded.

**Why it happens:** Both files are in `src/css/`. `main.css` is the familiar name from old convention. `input.css` is the new Tailwind entry point.

**How to avoid:** All Phase 2 edits go to `src/css/input.css` only.

**Warning signs:** Changes made but not visible in build output.

### Pitfall 4: Nav Border-Bottom and `text-decoration: none` Interaction

**What goes wrong:** Adding `border-bottom` to nav hover while leaving `text-decoration: none` — the border-bottom appears but doesn't look like an underline because vertical spacing is off, or it conflicts with link underline behaviour.

**Why it happens:** Nav links have `padding: 0.5rem 0` with a bottom padding that puts space between text and any border.

**How to avoid:** Use `padding-bottom: 0` on the hover state and apply `border-bottom: 2px solid var(--color-periwinkle)` on the element itself (not as a text-decoration). Alternatively, use `text-decoration: underline; text-decoration-color: var(--color-periwinkle); text-underline-offset: 4px` — which is more reliable across browsers.

**Warning signs:** Underline looks misaligned or too far from text.

### Pitfall 5: TIFY Viewer `!important` Overrides

**What goes wrong:** Adding tokenised values to TIFY section overrides and forgetting the `!important` suffix, causing TIFY's internal CSS to win.

**Why it happens:** TIFY viewer injects its own CSS. All overrides in the `.desc-viewer .tify-*` section require `!important`.

**How to avoid:** When tokenising values in the TIFY section, always preserve `!important` on every property.

**Warning signs:** TIFY viewer header styling reverting to library defaults after changes.

---

## Code Examples

### Replacing Hardcoded Stone Values in @layer components

```css
/* Source: Tailwind v4 CSS variable conventions + design-tokens.md */

/* Before (hardcoded) */
.some-component {
  border: 1px solid #dedede;
  color: #A8A29E;
}

/* After (tokenised) */
.some-component {
  @apply border-stone-300;
  @apply text-stone-400;
}

/* OR for properties that can't use @apply */
.some-component {
  border: 1px solid var(--color-stone-300);
  color: var(--color-stone-400);
}
```

### Nav Hover Underline (D-01)

```css
/* Source: D-01 decision + design-tokens.md periwinkle token */
.site-nav a:hover,
.site-nav a.active {
  color: var(--color-stone-900);
  text-decoration: none;
  border-bottom: 2px solid var(--color-periwinkle);
  padding-bottom: calc(0.5rem - 2px); /* preserve layout */
}
```

### Active Filter Pill — Burgundy (D-07)

```css
/* Source: D-07 decision. Requires coordinating class name with search.js */
.filter-pill {
  /* default: dark stone (unselected) */
  background: var(--color-stone-900);
  color: #fff;
}

/* Active/selected pills get burgundy treatment */
.filter-pill.active,
.filter-pill[data-active="true"] {  /* class name TBD from search.js audit */
  background: var(--color-burgundy);
  color: #fff;
}
```

### Active Pagination — Periwinkle (D-08)

```css
/* Source: D-08 decision */
.pagination-link.active {
  background: var(--color-periwinkle);
  @apply text-stone-900;
  border-color: var(--color-periwinkle);
}
```

### Masonry Hover Overlay — Burgundy (D-06)

```css
/* Source: D-06 decision: rgba(139,41,66,0.85) = burgundy #8B2942 at 0.85 */
.repo-overlay {
  background: rgba(139, 41, 66, 0.85);
  /* Note: no CSS custom property for rgba — keep raw value or use color-mix */
}
```

---

## Current State Assessment

### What Phase 1 Already Completed (confirmed by reading input.css)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| COMP-02 Footer bg-burgundy-dark | Done | `.site-footer { background-color: var(--color-burgundy-dark) }` line 532 |
| COMP-04 Masonry overlay burgundy | Largely done | `.repo-overlay { background: rgba(107, 31, 51, 0.85) }` — value is burgundy-deep; D-06 wants primary burgundy `rgba(139,41,66,0.85)` |
| COMP-06 Level badges periwinkle | Done | `.level-badge { background: var(--color-periwinkle) }` line 2039 |
| COMP-08 Warm white bg | Done | `--color-bg: #FAFAF9` in @theme + `html { background-color: var(--color-bg) }` |
| COMP-01 Header logo+lockup | Done | `header.njk` has logo SVG + font-serif lockup; CSS needs nav hover update (D-01) |
| COMP-08 Periwinkle pagination hover | Done | `.pagination-link:hover { background: var(--color-periwinkle) }` line 1442 |

### What Still Needs Doing (confirmed by hardcoded hex audit)

1. **Header** (lines 83–239): `#dedede`, `#1C1917`, `#A8A29E`, `#f0f0f0` — replace with stone tokens. Nav hover → periwinkle underline (D-01). Header search pill — tokenise + optional D-02 styling.
2. **Masonry overlay** (line 484): Update from `rgba(107,31,51,0.85)` to `rgba(139,41,66,0.85)` per D-06.
3. **Filter pills** (lines 1383–1422): Active pills → bg-burgundy per D-07. Requires search.js class audit.
4. **Pagination active** (lines 1446–1450): Change from bg-burgundy-deep/white to bg-periwinkle/stone-900 per D-08.
5. **Sort, facets, search refinement** (lines 1074–1370): Multiple hardcoded hex values → stone tokens per D-09.
6. **Description/repo page components** (lines 1740–2090): Multiple hardcoded hex values → stone tokens. `.detail-field a` link colour treatment per D-10.
7. **Miller columns** (lines 1790–1970): Hardcoded hex values → stone tokens. Selected state stays as-is (D-11).
8. **TIFY viewer overrides** (lines 2182–2285): Hardcoded `#ddd`, `#f8f8f8`, `#78716C` — tokenise while preserving `!important`.
9. **Miscellaneous** (buttons, breadcrumb, cards, error page): Scattered hardcoded hex values throughout.

---

## Open Questions

1. **Filter pill active class name in search.js**
   - What we know: CSS defines `.filter-pill` for all pills
   - What's unclear: Does `search.js` add any class to distinguish active/selected pills, or are all rendered pills already "active" (i.e., they only appear when a filter is selected)?
   - Recommendation: Read `search.js` pill-creation code before implementing D-07. If all `.filter-pill` instances are inherently active selections (no unselected state), then D-07 simply means changing the existing `.filter-pill` background from stone-900 to burgundy.

2. **`main.css` — still served or replaced?**
   - What we know: Both `src/css/main.css` and `src/css/input.css` exist. Phase 1 introduced `input.css` as the Tailwind entry point.
   - What's unclear: Does `base.njk` now link to the compiled Tailwind output (e.g., `main.css` compiled from `input.css`) or to `main.css` directly?
   - Recommendation: Read `base.njk` CSS link + Eleventy config before implementing. The compiled output filename determines which file the browser loads.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — Phase 2 is CSS/template changes only; all tools established in Phase 1).

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test framework installed |
| Config file | None |
| Quick run command | `npm run build` (Eleventy build — syntax errors surface as build failures) |
| Full suite command | `npm run build` + manual browser review |

This is a static site with no automated test framework. Validation is build-based and visual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Header nav hover shows periwinkle underline | manual-only | `npm run build` (compile check) | N/A |
| COMP-02 | Footer has dark burgundy background | manual-only | `npm run build` | N/A |
| COMP-03 | SKIPPED per D-04 | — | — | — |
| COMP-04 | Masonry hover overlay is burgundy | manual-only | `npm run build` | N/A |
| COMP-05 | Active filter pills burgundy; active pagination periwinkle | manual-only | `npm run build` | N/A |
| COMP-06 | Level badges periwinkle; description links burgundy on hover | manual-only | `npm run build` | N/A |
| COMP-07 | SKIPPED per D-11 | — | — | — |
| COMP-08 | Background warm white | manual-only | `npm run build` | N/A |

**Justification for manual-only:** All requirements are visual/CSS. Automated DOM tests (Playwright, Cypress) are not part of this project's stack and would require new infrastructure. The build-passing check catches CSS syntax errors; correctness must be verified in browser.

### Sampling Rate

- **Per task commit:** `npm run build` — confirms CSS compiles without errors
- **Per wave merge:** `npm run build` + open `_site/index.html` in browser
- **Phase gate:** Visual review of all four page types (home, search, description, repository) before `/gsd:verify-work`

### Wave 0 Gaps

None — no test framework to scaffold. The "test" for this phase is a working Eleventy build plus visual review.

---

## Sources

### Primary (HIGH confidence)
- `src/css/input.css` — Direct code audit, 2026-03-24. Full inventory of hardcoded hex values and current component states
- `src/_includes/header.njk`, `footer.njk`, `src/index.njk` — Direct template read, 2026-03-24
- `.planning/phases/02-component-updates/02-CONTEXT.md` — User decisions, 2026-03-24
- `../docs/frontend/guidelines/design-tokens.md` — Canonical token definitions
- `../docs/frontend/guidelines/shared-visual-language.md` — Interactive element conventions
- `.planning/codebase/CONVENTIONS.md` — CSS architecture, class naming, JS patterns

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Project decisions and Phase 1 outcomes
- `.planning/REQUIREMENTS.md` — Requirement definitions

---

## Metadata

**Confidence breakdown:**
- Current code state: HIGH — direct file reads
- Token mapping: HIGH — verified against design-tokens.md and input.css @theme block
- Interactive state changes: HIGH — locked decisions from CONTEXT.md
- Filter pill D-07 implementation detail: MEDIUM — depends on search.js audit not yet performed

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable domain — static site, no external dependencies)
