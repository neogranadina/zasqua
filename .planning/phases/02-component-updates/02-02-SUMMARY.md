---
phase: 02-component-updates
plan: "02"
subsystem: ui
tags: [css, tailwind, design-tokens, search, pagefind]

# Dependency graph
requires:
  - phase: 02-01
    provides: Header and homepage sections tokenised to stone/brand scale; @layer components patterns established
provides:
  - Active filter pills show burgundy background (D-07) with white text
  - Active pagination link shows periwinkle background (D-08) with stone-900 text
  - Sort controls, facet labels, panel borders, and all search section text use stone scale tokens (D-09)
  - Search Results section (lines ~924-1034) fully tokenised — no banned hex values
  - Search Page section (lines ~1038-1735) fully tokenised — no banned hex values
affects: [02-03, description-page-tokenisation, repository-page-tokenisation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@apply text-stone-N inside @layer components for colour utilities; var(--color-stone-N) for border shorthand values"
    - "All rendered filter pills are inherently active selections — D-07 applies burgundy to base .filter-pill rule, not a modifier class"

key-files:
  created: []
  modified:
    - src/css/input.css

key-decisions:
  - "D-07: filter-pill base background changed from #292524 (stone-900) to var(--color-burgundy) — all rendered pills are active selections per search.js audit"
  - "D-08: pagination-link.active changed from var(--color-burgundy-deep)/white to var(--color-periwinkle)/text-stone-900"
  - "#e0dcd4 (spinner border, line ~1505) kept as-is — decorative, no exact token match"
  - "#fff3cd (warning background in .result-snippet mark) kept as-is — functional warning colour, no token"

patterns-established:
  - "Pattern: All pills in search.js are active selections; no unselected pill state exists — confirmed by search.js className = 'filter-pill' (single class)"

requirements-completed:
  - COMP-05

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 02 Plan 02: Search Page Tokenisation Summary

**Burgundy active filter pills (D-07), periwinkle active pagination (D-08), and full stone scale tokenisation for all search section CSS across lines 924-1735 of input.css**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-24T~14:00Z
- **Completed:** 2026-03-24
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Search Results section fully tokenised — `#F5F5F4`, `#dedede`, `#f0f0f0`, `#A8A29E`, `#78716C`, `#57534E`, `#1C1917` all replaced with stone scale utilities or `var(--color-stone-N)`
- Search Page section fully tokenised — sort controls, facet labels, facet counts, filter panels, mobile sidebar, date tree, refine search, and responsive overrides all on stone scale
- D-07 applied: `.filter-pill` background changed from `#292524` to `var(--color-burgundy)`; confirmed via search.js audit that all rendered pills are active selections (no unselected state)
- D-08 applied: `.pagination-link.active` changed from `var(--color-burgundy-deep)` / `color: #fff` to `var(--color-periwinkle)` / `@apply text-stone-900`
- Both builds passed (eleventy --dryrun, 106,492 pages, exit 0)

## Task Commits

1. **Task 1: Tokenise search results section + sort/facet controls (D-09)** - `b0fb2c7` (refactor)
2. **Task 2: Apply D-07 active filter pills + D-08 active pagination + tokenise pills/pagination section** - `4b3bb96` (refactor)

## Files Created/Modified

- `src/css/input.css` — Search Results section (lines ~924-1034) and Search Page section (lines ~1038-1735) tokenised; D-07 and D-08 interactive states applied

## Decisions Made

- Confirmed via `search.js` audit: `createPill()` sets `pill.className = 'filter-pill'` with no modifier for selected state. All rendered pills are active filter selections. D-07 therefore applies burgundy to the base `.filter-pill` rule — no new modifier class needed in CSS or JS.
- `#e0dcd4` (spinner track border, line ~1505) kept as raw hex — decorative, no token equivalent, and changing it would affect the visual rhythm of the loading spinner.
- `#fff3cd` (highlight background for `<mark>` and `<em>` in search results) kept as raw hex — functional warning/highlight colour with no design token.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — both tasks applied cleanly. The filter pill class name audit confirmed the plan's assumption: no modifier class change was needed in JS.

## Known Stubs

None — all tokenisation changes are complete and wire directly to CSS custom properties defined in @theme from Phase 1.

## Next Phase Readiness

- Search page CSS is fully tokenised and interactive states match the visual identity spec
- Ready for Plan 02-03 (description and repository page tokenisation)
- No blockers

---
*Phase: 02-component-updates*
*Completed: 2026-03-24*
