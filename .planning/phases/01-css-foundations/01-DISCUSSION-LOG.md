# Phase 1: CSS Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 01-css-foundations
**Areas discussed:** CSS variable naming, Hardcoded value strategy, Font weight loading, Neutral colours, CSS framework adoption, Migration scope, Build pipeline, Custom component CSS, Pill shape pattern

---

## CSS Framework Adoption (pre-empted original gray areas)

Before discussing the four original gray areas, the user raised whether this was the moment to introduce a CSS framework (Tailwind or Bootstrap). This reshaped the entire discussion.

| Option | Description | Selected |
|--------|-------------|----------|
| Stay with vanilla CSS | Update tokens only, keep existing approach | |
| Introduce Tailwind CSS | Matches catalogacion, utility-first, better long-term maintainability | |
| Introduce Bootstrap | Component library, but opinionated and heavy | |

**User's choice:** Tailwind CSS
**Notes:** User's motivation was threefold: (1) reduce future work in Phase 2, (2) consistency with zasqua-catalogacion which already uses Tailwind v4, (3) long-term maintainability of 2,489-line single-file CSS. Bootstrap was not seriously considered — prior technical decision (bootstrap-adoption.md) already evaluated and rejected it.

---

## Migration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Tokens + hybrid | Set up Tailwind + tokens, keep main.css alongside, migrate templates in Phase 2 | |
| Full migration | Set up Tailwind + tokens + convert ALL templates to utility classes in Phase 1 | ✓ |
| Tokens only | Just add Tailwind and define tokens, everything else in Phase 2 | |

**User's choice:** Full migration
**Notes:** User accepted the risk of larger scope (2,489 lines CSS + 8 templates) in exchange for doing the migration once properly.

---

## Build Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone CLI | Tailwind v4 standalone binary, no npm dependency, no PostCSS | ✓ |
| npm + PostCSS | Install tailwindcss as npm dependency with PostCSS plugin | |

**User's choice:** Standalone CLI
**Notes:** Aligns with minimal computing — one binary, package.json stays minimal.

---

## Custom Component CSS

| Option | Description | Selected |
|--------|-------------|----------|
| @layer components | Keep complex CSS in Tailwind @layer components block | ✓ |
| Separate CSS file | Keep a separate components.css file imported into Tailwind | |

**User's choice:** @layer components
**Notes:** Miller columns, masonry grid, TIFY viewer, and Pagefind search UI styling stay as named CSS classes.

---

## Font Weight Loading

| Option | Description | Selected |
|--------|-------------|----------|
| Match design-tokens.md exactly | DM Sans variable (all weights), Crimson Text 400/600/700+italic, Cormorant Garamond 600/700 | |
| Trim to actual usage | DM Sans 400/500/600/700, Crimson Text 400/700, Cormorant Garamond 600 | ✓ |

**User's choice:** Trim to actual usage
**Notes:** Smaller download (~100KB). If Phase 2 needs additional weights, update the import then.

---

## Pill Shape Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Utility classes only | Apply rounded-full directly in templates | |
| Component class + utilities | Define .pill-interactive base class in @layer components | |

**User's choice:** "You decide" — deferred to Claude's discretion
**Notes:** User had no preference. Planner decides during implementation.

---

## Claude's Discretion

- Pill shape pattern — whether to use a component class or utility-only approach

## Deferred Ideas

None raised during discussion.
