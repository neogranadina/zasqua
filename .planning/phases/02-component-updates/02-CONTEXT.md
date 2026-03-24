# Phase 2: Component Updates - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Every page type — home, search, repository, and description — is fully redesigned with the new header, footer, and interactive component styling. This phase applies the CSS foundations from Phase 1 across all components, replacing remaining hardcoded hex values with token references, and updating interactive states to use the burgundy/periwinkle palette.

</domain>

<decisions>
## Implementation Decisions

### Header Nav Styling
- **D-01:** Nav link hover effect is a periwinkle underline (border-bottom on the anchor), text stays dark stone-900. Replaces the current stone grey colour change
- **D-02:** Header search pill — Claude's discretion on visual treatment. At minimum, replace hardcoded hex values with token references
- **D-03:** All hardcoded colours in the header map to stone tokens: #1C1917→stone-900, #dedede→stone-300, #f0f0f0→stone-100, #A8A29E→stone-400

### Homepage Hero & Masonry
- **D-04:** Hero search button stays as-is — do NOT apply burgundy fill. COMP-03's button criterion is intentionally skipped
- **D-05:** Hero title keeps Crimson Text (font-serif) — no change to font-display
- **D-06:** Masonry grid hover overlay becomes semi-transparent burgundy (e.g., rgba(139,41,66,0.85)) replacing the previous colour

### Search Page
- **D-07:** Active/selected filter pills get bg-burgundy + white text, distinguishing them from unselected dark stone pills
- **D-08:** Active pagination number gets bg-periwinkle + stone-900 dark text
- **D-09:** Sort controls, facet labels, and panel borders map to stone scale — neutral, no brand colour treatment

### Description & Repository Pages
- **D-10:** Burgundy link placement — Claude's discretion. Apply base link colours consistently and adjust where needed
- **D-11:** Miller column selection styling stays as-is — no periwinkle change needed
- **D-12:** Metadata section headers keep current styling — just ensure hardcoded colours are replaced with token references
- **D-13:** Level badges (periwinkle bg) and warm white background (#FAFAF9) already completed in Phase 1 — no changes needed

### Claude's Discretion
- D-02: Header search pill visual treatment (beyond tokenising hardcoded values)
- D-10: How to apply burgundy links across description pages — all links or selective

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Tokens & Visual Identity
- `../docs/frontend/guidelines/design-tokens.md` — Canonical colour, typography, and spacing tokens. Defines exact hex values, font stacks, weight usage
- `../docs/frontend/guidelines/frontend-design.md` — Frontend design guidelines including colour usage, typography system, UI patterns
- `../docs/frontend/guidelines/shared-visual-language.md` — Shared interactive element styling between Zasqua and Telar (rounded pills, filter pills, search inputs)

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — CSS architecture, template architecture, JS patterns
- `.planning/codebase/STRUCTURE.md` — Full directory layout and file purposes

### Prior Phase Context
- `.planning/phases/01-css-foundations/01-CONTEXT.md` — Phase 1 decisions including Tailwind v4 setup, token naming, component CSS approach

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/css/input.css` — All component CSS in `@layer components`, all tokens in `@theme`. This is the only CSS file to modify
- `src/_includes/header.njk` — Header already has pomegranate logo + lockup with font-serif utility classes
- `src/_includes/footer.njk` — Footer already has bg-burgundy-dark, periwinkle hover links — largely complete from Phase 1
- `src/index.njk` — Homepage template with hero, intro section, masonry grid

### Established Patterns
- Complex component CSS stays in `@layer components` (Phase 1 decision D-05)
- Simple styling uses Tailwind utility classes in templates
- Hardcoded hex values in `@layer components` should be replaced with `var(--color-*)` token references or Tailwind classes
- Desktop-first responsive with `@media (max-width: ...)` breakpoints

### Integration Points
- `src/js/search.js` — Creates DOM elements with class names for search landing, pagination, pills. Class names in JS must match CSS
- `src/js/tree.js` — Miller columns tree creates DOM elements with class names for selection states
- `src/js/description.js` — TIFY viewer integration with dynamic styling

### Phase 1 Regressions Fixed During Discussion
- Hero search input text was white-on-white (fixed: explicit dark colour)
- Browser search cancel button had blue gradient (fixed: custom SVG icon)
- Cormorant Garamond weight 300 not loaded (fixed: added to Google Fonts import)
- Search landing page used old logo (fixed: swapped to zasqua-3-burgundy-sm.svg)
- Search landing hints text too light and small (fixed: darker em colour, larger font)

</code_context>

<specifics>
## Specific Ideas

- COMP-03 hero search button criterion intentionally skipped — user prefers the current transparent/unstyled button
- COMP-07 Miller column selection criterion intentionally skipped — user is happy with current styling
- The Figma Make file (bOunUsW8BHk1eqZrJu7Nxt) remains the authoritative visual source

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-component-updates*
*Context gathered: 2026-03-24*
