---
phase: 01-css-foundations
plan: 02
subsystem: css-layout-shell
tags: [tailwind, css, templates, design-tokens, layout, header, footer, hero, masonry, buttons]
dependency_graph:
  requires: [01-01]
  provides: [layout-shell-css, brand-colour-tokens-applied, template-utility-classes]
  affects:
    - src/css/input.css
    - src/css/main.css
    - src/_layouts/base.njk
    - src/_includes/header.njk
    - src/_includes/footer.njk
    - src/_includes/breadcrumb.njk
    - src/index.njk
    - src/repository.njk
    - src/404.njk
tech_stack:
  added: []
  patterns: [@layer components named classes, Tailwind utility classes in templates, colour token migration]
key_files:
  created: []
  modified:
    - src/css/input.css
    - src/css/main.css
    - src/_layouts/base.njk
    - src/_includes/header.njk
    - src/_includes/footer.njk
    - src/_includes/breadcrumb.njk
    - src/index.njk
    - src/repository.njk
    - src/404.njk
key_decisions:
  - All structural shell CSS migrated into @layer components, not converted to utility-only — preserves JS-compatible class names and keeps responsive behaviour via desktop-first media queries
  - Old CSS variable references (--accent-*, --footer-bg, --font-body, --spacing-*) eliminated entirely; replaced with direct rem values and brand token references
  - repo-overlay background changed from rgba(41,98,255,0.8) (blue) to rgba(107,31,51,0.85) (burgundy-deep with opacity)
metrics:
  duration: "~17 min"
  completed: "2026-03-24"
  tasks_completed: 2
  files_changed: 9
---

# Phase 01 Plan 02: Layout Shell CSS Migration Summary

**One-liner:** All 14 structural shell CSS sections migrated from old main.css into @layer components with brand colour tokens; 6 layout templates converted to use Tailwind utility classes for colours, typography, and spacing.

## What Was Built

### Task 1: Migrate layout shell CSS into @layer components (496262b)

Populated the empty `@layer components` block in `src/css/input.css` with 14 structural CSS sections ported from the original 2,489-line `main.css`:

1. **Layout** — `.container`, `.page-content`
2. **Header** — `.site-header`, `.site-logo`, `.site-logo-text`, `.site-nav`, `.header-search`, `.hamburger-toggle` with full responsive rules
3. **Hero** — `.hero`, `.hero-content`, `.hero-logo`, `.hero .search-form`, `.hero .search-input`, `.hero .search-button`
4. **Home Sections** — `.section`, `.section-title`, `.section-intro`, `.intro-section`, `.repo-section`
5. **Masonry Grid** — `.repo-grid`, `.repo-item`, `.repo-link`, `.repo-image`, `.repo-caption`, `.repo-caption-title`, `.repo-caption-category`, `.repo-overlay`, `.repo-info`, `.repo-title`, `.repo-subtitle`
6. **Footer** — `.site-footer`, `.footer-left`, `.footer-right`, `.footer-copyright`, `.footer-seal`
7. **Buttons** — `.btn`, `.btn-primary`, `.btn-outline`, `.btn-pill`, `.btn-secondary`
8. **Breadcrumb** — `.breadcrumb`, `.breadcrumb-separator`
9. **Cards** — `.card`
10. **Detail Page** — `.detail-header`, `.detail-title`, `.detail-meta`, `.detail-content`, `.detail-section`, `.detail-field`, `.detail-label`, `.detail-value`, `.detail-list`
11. **Repository Header** — `.repo-header`, `.repo-header-overlay`, `.repo-header-title`, `.repo-header-subtitle`, `.repo-header-stats`
12. **Description List** — `.description-list`, `.description-item`, `.description-item-content`, `.description-item-title`, `.description-item-meta`, `.description-item-arrow`
13. **Placeholder Image** — `.placeholder-img`
14. **Utilities** — `.text-muted`, `.bg-gray`, `.mb-md`, `.mb-lg`
15. **Error Page** — `.error-page`, `.error-message`, `.error-actions`

**Colour replacements applied:**
- `var(--accent-overlay)` / `rgba(41,98,255,0.8)` → `rgba(107,31,51,0.85)` (burgundy-deep masonry overlay)
- `var(--footer-bg)` / `#003660` → `var(--color-burgundy-dark)` / `#4A1522`
- `var(--accent-primary)` → `var(--color-burgundy-deep)` (button primary)
- `var(--accent-hover)` / `#f18e00` → `var(--color-burgundy)` (button hover) and `var(--color-periwinkle)` (nav/footer links)
- `var(--accent-link)` / `#F2784B` → `var(--color-burgundy-light)` (breadcrumb hover)
- `var(--bg-color)` → `var(--color-bg)` / `#FAFAF9`
- `var(--bg-gray)` → `#F5F5F4` (stone-100)
- `var(--text-color)` → `#78716C` (stone-500)
- `var(--text-dark)` → `#1C1917` (stone-900)
- `var(--text-muted)` → `#A8A29E` (stone-400)
- `var(--font-body)` / `var(--font-heading)` → `var(--font-sans)`
- `var(--font-logo)` → `var(--font-serif)` (Crimson Text for site name)
- `var(--font-serif)` (Cormorant) → `var(--font-display)` (section titles)
- All `var(--spacing-*)` → direct rem values

Sections reserved for Plan 03 (Search, Miller Columns, Description Page, Children Tree) were NOT included.

Tailwind compile: exit 0.

### Task 2: Convert layout shell templates to Tailwind utility classes (ad7f82f)

Updated 7 templates to use Tailwind utility classes:

- **`src/_layouts/base.njk`** — added `bg-bg font-sans text-stone-600` to `<body>`
- **`src/_includes/header.njk`** — added `font-serif` to site wordmark span, `font-sans` to `<nav>`, `text-sm uppercase tracking-wide` to nav links
- **`src/_includes/footer.njk`** — added `bg-burgundy-dark text-white` to `<footer>`, `text-white font-semibold hover:text-periwinkle` to footer links
- **`src/_includes/breadcrumb.njk`** — added `text-sm text-stone-400 hover:text-burgundy-light` to links, `text-sm text-stone-500` to current crumb
- **`src/index.njk`** — added `font-serif` to `.site-name`, `font-display` to section title and `.section-intro`
- **`src/repository.njk`** — added `text-white`, `text-stone-*` utilities to repo header elements, `text-sm text-stone-400` to breadcrumb
- **`src/404.njk`** — added `font-display text-stone-900` to section title, `text-stone-500` to error message, `bg-burgundy-deep text-white hover:bg-burgundy` to primary button

`src/buscar.njk` and `src/description.njk` were not modified (reserved for Plan 03).

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Status

- [x] All 14 structural CSS sections migrated into @layer components with new colour tokens
- [x] No orange hover colours (#f18e00, #F2784B) in input.css — verified: 0 matches
- [x] No navy footer colour (#003660) in input.css — verified: 0 matches
- [x] No old CSS variable names (--accent-*, --footer-bg, etc.) in input.css
- [x] Footer background is dark burgundy (var(--color-burgundy-dark) = #4A1522)
- [x] Header wordmark uses font-serif (Crimson Text per D-07)
- [x] All 6 layout shell templates converted to use Tailwind utility classes
- [x] Tailwind compiles successfully (exit 0, v4.2.2)
- [x] COL-04 check passes: no blue or orange accent values in compiled main.css

## Known Stubs

None — all structural shell sections are wired to actual brand tokens and rendered in live templates.

## Self-Check: PASSED

- src/css/input.css — FOUND
- src/_includes/header.njk — FOUND
- src/_includes/footer.njk — FOUND
- src/_includes/breadcrumb.njk — FOUND
- src/index.njk — FOUND
- src/repository.njk — FOUND
- src/404.njk — FOUND
- Commit 496262b — FOUND (Task 1: migrate layout shell CSS into @layer components)
- Commit ad7f82f — FOUND (Task 2: convert layout shell templates to Tailwind utility classes)
