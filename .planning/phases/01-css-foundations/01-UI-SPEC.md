---
phase: 1
slug: css-foundations
status: draft
shadcn_initialized: false
preset: none
created: 2026-03-24
---

# Phase 1 — UI Design Contract: CSS Foundations

> Visual and interaction contract for Phase 1. This phase is a token/infrastructure
> migration — no new UI surfaces are introduced. The contract defines exact token
> values that the build system and stylesheet must produce; Phase 2 consumes these
> tokens when styling components.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — 11ty static site, not a React/Next.js project; shadcn does not apply |
| Preset | not applicable |
| Component library | none — vanilla HTML + Nunjucks templates |
| Icon library | none — SVG assets inline or via passthrough |
| CSS approach | Tailwind CSS v4 standalone CLI; tokens defined via `@theme` in input stylesheet |

**Source:** CONTEXT.md D-01, D-02 (Tailwind v4 standalone CLI, no npm dependency)

---

## Spacing Scale

Tailwind v4 built-in spacing scale is used. No custom spacing tokens are defined — the default scale covers all current usage. The existing CSS variables (`--spacing-sm` through `--spacing-xxl`) are replaced by Tailwind utilities.

| Token | Value | Tailwind Utility | Usage |
|-------|-------|-----------------|-------|
| xs | 4px | `p-1` / `gap-1` | Icon gaps, tight inline padding |
| sm | 8px | `p-2` / `gap-2` | Compact element spacing |
| md | 16px | `p-4` / `gap-4` | Default element spacing |
| lg | 24px | `p-6` / `gap-6` | Section padding |
| xl | 32px | `p-8` / `gap-8` | Layout gaps |
| 2xl | 48px | `p-12` / `gap-12` | Major section breaks |
| 3xl | 64px | `p-16` / `gap-16` | Page-level spacing |

Layout constants carried forward as CSS custom properties (not Tailwind utilities):

| Token | Value | Usage |
|-------|-------|-------|
| `--max-width` | 1200px | Container max width |
| `--header-height` | 70px | Header fixed height |

Exceptions:
- Desktop-first responsive breakpoints preserved from current codebase: `max-width: 1024px`, `max-width: 768px`, `max-width: 480px`
- Miller columns and masonry grid use `@layer components` named classes — spacing within these components is not migrated to utilities in Phase 1

**Source:** CONTEXT.md D-05; existing `main.css` `:root` block

---

## Typography

### Font Stack (defined in `@theme`)

| Role | Font Family | Tailwind Token | Weights Loaded |
|------|-------------|---------------|----------------|
| Sans (body, UI) | `"DM Sans", ui-sans-serif, system-ui, sans-serif` | `--font-sans` → `font-sans` | 400, 600 |
| Serif (wordmark, titles) | `"Crimson Text", ui-serif, Georgia, serif` | `--font-serif` → `font-serif` | 400, 700 |
| Display (section headings) | `"Cormorant Garamond", ui-serif, Georgia, serif` | `--font-display` → `font-display` | 600 |

**Source:** CONTEXT.md D-06, D-07; design-tokens.md Font Stack

### Type Scale

Two weights only: `font-normal` (400) and `font-semibold` (600).

| Role | Size | Weight | Line Height | Font | Tailwind |
|------|------|--------|-------------|------|---------|
| Body | 16px | 400 | 1.6 | DM Sans | `text-base font-normal` |
| Label / UI | 14px | 400 | 1.4 | DM Sans | `text-sm font-normal` |
| Heading (h3, section) | 20px | 600 | 1.3 | DM Sans or Cormorant Garamond | `text-xl font-semibold` |
| Display (h1, h2) | 28px–32px | 600 | 1.2 | Cormorant Garamond or Crimson Text | `text-3xl font-semibold` |

Note: exact heading sizes in templates are preserved from the current `main.css` (h1: 2rem, h2: 1.75rem, h3: 1.25rem). The scale above captures the intent; the executor must match existing rendered sizes when converting to utility classes.

**Source:** existing `main.css` base styles; design-tokens.md When to Use Each Font

### Google Fonts Import

Replace current `<link>` in `src/_layouts/base.njk` with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Crimson+Text:wght@400;700&family=Cormorant+Garamond:wght@600&display=swap" rel="stylesheet" />
```

Rationale: trimmed to two weights for DM Sans (400 and 600 only — weight 500 dropped per typography contract). Crimson Text loads 400 and 700 for serif body and wordmark use. Cormorant Garamond loads 600 only.

---

## Color

### Brand Tokens (defined in `@theme`)

| Role | Token | Value | Tailwind Class |
|------|-------|-------|---------------|
| Brand / wordmark | `--color-burgundy` | `#8B2942` | `text-burgundy` / `bg-burgundy` |
| Primary actions (buttons, CTAs) | `--color-burgundy-deep` | `#6B1F33` | `bg-burgundy-deep` |
| Links, hover text, focus rings | `--color-burgundy-light` | `#B14D66` | `text-burgundy-light` |
| Dark surfaces (footer) | `--color-burgundy-dark` | `#4A1522` | `bg-burgundy-dark` |
| Tinted backgrounds | `--color-pale-rose` | `#F5E6EA` | `bg-pale-rose` |
| Periwinkle (interactive accents) | `--color-periwinkle` | `#C9D5FF` | `bg-periwinkle` / `text-periwinkle` |
| Ochre (secondary accent, sparingly) | `--color-ochre` | `#C5965F` | `text-ochre` |
| Sage (secondary accent, sparingly) | `--color-sage` | `#8A9B8E` | `text-sage` |

**Source:** CONTEXT.md D-08; REQUIREMENTS.md COL-01; design-tokens.md Brand Colors

### Neutrals

Use Tailwind built-in `stone` scale — no custom neutral tokens. `stone-50` through `stone-900` as documented in design-tokens.md.

**Source:** CONTEXT.md D-09; design-tokens.md Neutrals

### Page Background

| Token | Old Value | New Value |
|-------|-----------|-----------|
| `--color-bg` | `#ffffff` (pure white) | `#FAFAF9` (warm white) |

Applied as `bg-[#FAFAF9]` or via `@theme` token `--color-bg: #FAFAF9`.

**Source:** REQUIREMENTS.md COMP-08; CONTEXT.md D-10; ROADMAP.md Phase 1 success criterion 4

### 60/30/10 Split

| Role | Hex | % | Specific Usage |
|------|-----|---|---------------|
| Dominant surface | `#FAFAF9` (warm white) + `stone` neutrals | 60% | Page background, content areas, header |
| Secondary surface | `stone-50` / `stone-100` (#F5F5F4 / #F5F5F4) | 30% | Card backgrounds, input fields, secondary buttons, hover states |
| Accent (burgundy family) | `#8B2942` / `#6B1F33` / `#4A1522` | 10% | Buttons, CTAs, active states, footer background, wordmark |

Accent reserved for: primary action buttons, footer background, wordmark text, link hover underlines, masonry grid hover overlay, active pagination, active Miller column selection.

Periwinkle (`#C9D5FF`) serves as a secondary interactive accent replacing the previous blue — reserved for: filter pill active states, search result highlights, level badges (Phase 2), Miller column hover states (Phase 2).

**Source:** REQUIREMENTS.md COL-03, COL-04; ROADMAP.md Phase 1 + 2 success criteria

### Eliminated Colors

| Old Value | Role | Replacement |
|-----------|------|------------|
| `rgba(41,98,255,0.8)` | Accent primary / buttons | `#6B1F33` (burgundy-deep) |
| `#f18e00` | Hover state | `#C9D5FF` (periwinkle) or `#8B2942` (burgundy) |
| `#F2784B` | Link hover | `#B14D66` (burgundy-light) |
| `#003660` | Footer background | `#4A1522` (burgundy-dark) |

**Source:** REQUIREMENTS.md COL-03, COL-04; existing `main.css` `:root`

---

## Copywriting Contract

Phase 1 is a pure CSS/build-pipeline migration. No new user-facing UI surfaces are introduced, so there are no new CTAs, empty states, or error states in this phase. All Spanish UI strings in `src/_data/ui.js` are unchanged.

| Element | Status |
|---------|--------|
| Primary CTA | Not applicable — no new interactive elements in Phase 1 |
| Empty state | Not applicable — no new page states in Phase 1 |
| Error state | Not applicable — no new error surfaces in Phase 1 |
| Destructive confirmation | Not applicable — no destructive actions in Phase 1 |

**Source:** REQUIREMENTS.md (Phase 1 requirements VIS-01, VIS-02, COL-01–04 are all CSS/token changes); CONTEXT.md Phase Boundary

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none — not applicable (11ty project) | not applicable |
| Third-party | none | not applicable |

Tailwind CSS v4 is integrated as a standalone binary downloaded at build time — no npm registry, no registry vetting needed.

**Source:** CONTEXT.md D-02

---

## Implementation Notes for Executor

These notes translate the contract into actionable constraints:

### Tailwind Input Stylesheet Structure

```
src/css/input.css (new file)
├── @import "tailwindcss";
├── @theme { ... }           ← brand color + font tokens
├── @layer base { ... }      ← html/body reset, heading defaults
└── @layer components { ... } ← Miller columns, masonry, Pagefind, TIFY CSS
```

The existing `src/css/main.css` is replaced by `input.css`. Tailwind CLI outputs `src/css/main.css` (or a new output path configured in `eleventy.config.js`).

**Source:** CONTEXT.md D-03, D-05

### JS-Generated Class Names (Must Preserve)

These files create DOM elements with hardcoded class names — the new stylesheet must provide matching styles in `@layer components`:

- `src/js/search.js` — Pagefind search UI class names
- `src/js/tree.js` — Miller columns tree class names
- `src/js/description.js` — TIFY viewer integration

**Source:** CONTEXT.md Code Context

### Hardcoded Hex Elimination

All 116 hardcoded hex values in the current `main.css` must be eliminated. Success criterion: `grep -c "#[0-9a-fA-F]" output.css` returns 0 outside the `:root` / `@theme` block.

**Source:** REQUIREMENTS.md COL-02; CONTEXT.md D-11; ROADMAP.md Phase 1 success criterion 5

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
