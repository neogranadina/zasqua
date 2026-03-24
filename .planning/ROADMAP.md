# Roadmap: Zasqua Frontend — v0.4.0 Visual Identity & AHRB Volumes

## Overview

Three phases deliver the v0.4.0 milestone. Phase 1 lays the CSS foundations — new typefaces and colour palette as custom properties. Phase 2 applies those foundations across every component and page type. Phase 3 imports the AHRB notarial volumes so new content lands in the finished design.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: CSS Foundations** - New typography and colour palette as CSS custom properties
- [ ] **Phase 2: Component Updates** - All page components updated to use the new visual identity
- [ ] **Phase 3: AHRB Import** - Backend export, frontend rebuild, and deploy with ~106K pages

## Phase Details

### Phase 1: CSS Foundations
**Goal**: Tailwind CSS v4 standalone CLI integrated into the build pipeline, all design tokens defined via @theme, Google Fonts updated to DM Sans / Crimson Text / Cormorant Garamond, all templates converted to utility classes, main.css reduced to a Tailwind input stylesheet with @layer components for complex components — no hardcoded hex values remaining
**Depends on**: Nothing (first phase)
**Requirements**: VIS-01, VIS-02, COL-01, COL-02, COL-03, COL-04
**Success Criteria** (what must be TRUE):
  1. Page text renders in DM Sans; the logotype renders in Crimson Text; display headings render in Cormorant Garamond
  2. The primary colour throughout the site is burgundy (#8B2942) — visible in buttons and active states
  3. No blue or orange accent colours remain — all interactive elements use periwinkle or burgundy
  4. The page background is warm white (#FAFAF9) rather than pure white
  5. Inspecting the stylesheet shows no hardcoded hex values outside the `:root` custom properties block
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Infrastructure: Tailwind CLI, input.css with @theme tokens, Google Fonts, build pipeline
- [ ] 01-02-PLAN.md — Layout shell: header, footer, hero, masonry, buttons, breadcrumb, cards + template conversion
- [ ] 01-03-PLAN.md — Interactive components: search, Miller columns, description page, TIFY, children tree + visual verification

**UI hint**: yes

### Phase 2: Component Updates
**Goal**: Every page type — home, search, repository, and description — is fully redesigned with the new header, footer, and interactive component styling
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08
**Success Criteria** (what must be TRUE):
  1. The header shows the pomegranate logo and "Neogranadina: Zasqua" lockup in Crimson Text with DM Sans navigation and periwinkle hover underlines
  2. The footer has a dark burgundy (#4A1522) background replacing the previous navy
  3. The homepage hero search button is burgundy; hovering turns it periwinkle; the masonry grid overlay is burgundy
  4. Search page filter pills and active pagination use periwinkle/burgundy; no blue accent colours remain
  5. Description pages show periwinkle level badges and burgundy links; repository pages show periwinkle Miller column selection
**Plans**: TBD
**UI hint**: yes

### Phase 3: AHRB Import
**Goal**: The 542 AHRB notarial volumes are live on zasqua.org, rendered in the new visual identity
**Depends on**: Phase 2
**Requirements**: AHRB-01, AHRB-02, AHRB-03
**Success Criteria** (what must be TRUE):
  1. The AHRB repository landing page is accessible on zasqua.org and lists volume records
  2. Individual AHRB volume description pages load correctly with IIIF viewer links
  3. The rebuilt site has approximately 106K pages deployed to R2 (verified via build log or page count)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CSS Foundations | 0/3 | Planned | - |
| 2. Component Updates | 0/? | Not started | - |
| 3. AHRB Import | 0/? | Not started | - |
