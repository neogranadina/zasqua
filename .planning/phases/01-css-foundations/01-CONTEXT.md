# Phase 1: CSS Foundations - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the frontend from vanilla CSS to Tailwind CSS v4 and apply the new Zasqua visual identity. Deliver: Tailwind CLI in the build pipeline, all design tokens defined via `@theme`, Google Fonts updated to the new typeface stack, all templates converted to utility classes, main.css reduced to a minimal base with complex components in `@layer components`. The site renders in the new burgundy/periwinkle palette with DM Sans / Crimson Text / Cormorant Garamond typography.

This is a significant scope expansion from the original roadmap ("CSS custom properties only") — the user chose to introduce Tailwind now to reduce future work, align with zasqua-catalogacion, and improve long-term maintainability.

</domain>

<decisions>
## Implementation Decisions

### CSS Framework
- **D-01:** Introduce Tailwind CSS v4 as the CSS framework, replacing the current vanilla CSS approach
- **D-02:** Use the Tailwind standalone CLI binary — no npm dependency, no PostCSS config. CI downloads the binary in the workflow. This aligns with the minimal computing principle (one binary, no node_modules bloat)
- **D-03:** Full migration in Phase 1 — set up Tailwind, define tokens, convert ALL templates to utility classes, reduce main.css to a minimal base. Not a phased/hybrid approach

### Token Naming
- **D-04:** Use Tailwind's `@theme` naming conventions (`--color-burgundy`, `--font-sans` etc.) matching `design-tokens.md`. This aligns naming with zasqua-catalogacion which uses the same tokens via Tailwind v4 `@theme`

### Custom Component CSS
- **D-05:** Complex component CSS (Miller columns, masonry grid, TIFY viewer, Pagefind search UI) stays as named CSS classes in a `@layer components` block within the Tailwind input stylesheet. Simple styling moves to utility classes in templates

### Typography / Font Loading
- **D-06:** Google Fonts import updated to load trimmed weights for actual usage:
  - DM Sans: 400, 500, 600, 700 (not full variable range)
  - Crimson Text: 400, 700 (not 600 or italic — add later if needed)
  - Cormorant Garamond: 600 (display headings only)
- **D-07:** Font variable mapping: `--font-sans` = DM Sans (body, UI), `--font-serif` = Crimson Text (wordmark, titles), `--font-display` = Cormorant Garamond (section headings)

### Colour Palette
- **D-08:** All colour tokens from `design-tokens.md` defined in `@theme`: burgundy (#8B2942), deep burgundy (#6B1F33), light burgundy (#B14D66), dark burgundy (#4A1522), pale rose (#F5E6EA), ochre (#C5965F), sage (#8A9B8E)
- **D-09:** Neutral colours use Tailwind's built-in `stone` scale — no custom neutral tokens needed
- **D-10:** Background colour changes to warm white (#FAFAF9) from pure white (#FFFFFF)

### Hardcoded Values
- **D-11:** All 116 hardcoded hex values in main.css are eliminated — they either become utility classes in templates or `@theme` token references in `@layer components`

### Claude's Discretion
- Pill shape pattern for rounded interactive elements (border-radius: 50px) — planner decides whether to codify as a `@layer components` class or apply via `rounded-full` utility in each template

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Tokens & Visual Identity
- `../docs/frontend/guidelines/design-tokens.md` — Canonical colour, typography, and spacing tokens. Defines exact hex values, font stacks, weight usage, and component patterns shared with zasqua-catalogacion
- `../docs/frontend/guidelines/frontend-design.md` — Frontend design guidelines including colour usage, typography system, UI patterns, layout patterns, and responsive design
- `../docs/frontend/guidelines/shared-visual-language.md` — Shared interactive element styling between Zasqua and Telar (rounded pills, filter pills, search inputs, checkboxes)
- `../docs/frontend/images/visual-identity-brief.md` — Visual identity brief

### Technical Decisions
- `../docs/frontend/technical-decisions/bootstrap-adoption.md` — Prior framework evaluation (Bootstrap rejected for v0.1.0). Context for why Tailwind was chosen instead

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — CSS architecture (section comments, variable naming, class naming), template architecture, JS patterns
- `.planning/codebase/STACK.md` — Build pipeline, environment variables, data pipeline
- `.planning/codebase/STRUCTURE.md` — Full directory layout and file purposes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/css/main.css` — 2,489 lines, well-organised into 20 sections with banner comments. The `:root` block and section structure provide a clear map of what needs migrating
- `src/_layouts/base.njk` — Single base layout with Google Fonts link (line 13), CSS link, and block extension points. Font loading update happens here
- `src/_data/ui.js` — All Spanish UI strings. Templates reference `ui.*` — these references stay unchanged during migration

### Established Patterns
- Desktop-first responsive design with `@media (max-width: ...)` overrides at 768px, 1024px, 480px breakpoints
- Single-file CSS approach (no preprocessor, no modules)
- CSS custom properties already in use for colours, fonts, spacing — but with hardcoded values scattered throughout
- BEM-like class naming with single hyphens (not strict BEM)

### Integration Points
- `eleventy.config.js` — passthrough copy for CSS. Needs updating for Tailwind output
- `build.sh` — local build script. Needs Tailwind CLI step added
- `.github/workflows/deploy.yml` — CI/CD pipeline. Needs Tailwind CLI download + build step
- `src/js/search.js` — Pagefind search UI creates DOM elements with hardcoded class names and inline styles. These class names must be preserved or updated to match new Tailwind classes
- `src/js/tree.js` — Miller columns tree creates DOM elements with class names. Same consideration
- `src/js/description.js` — TIFY viewer integration with dynamic styling

</code_context>

<specifics>
## Specific Ideas

- The zasqua-catalogacion project's `app/app.css` `@theme` block is a direct reference for how tokens should be structured — same hex values, same naming
- Figma Make file (bOunUsW8BHk1eqZrJu7Nxt) is the authoritative visual source for the identity
- The Tailwind standalone CLI approach means the project keeps its "one npm dependency" simplicity — Tailwind is a binary, not a package

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-css-foundations*
*Context gathered: 2026-03-24*
