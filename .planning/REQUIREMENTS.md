# Requirements: Zasqua Frontend

**Defined:** 2026-03-24
**Core Value:** Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.

## v0.4.0 Requirements

Requirements for the Visual Identity & AHRB Volumes milestone. Each maps to roadmap phases.

### Visual Identity — Typography

- [x] **VIS-01**: Google Fonts import updated to load DM Sans, Crimson Text, and Cormorant Garamond (replacing Lato and IM Fell DW Pica)
- [x] **VIS-02**: `--font-body` and `--font-heading` set to DM Sans; `--font-logo` set to Crimson Text; `--font-serif` remains Cormorant Garamond

### Visual Identity — Colour Palette

- [x] **COL-01**: CSS custom properties updated with new palette — burgundy primary (`#8B2942`), periwinkle secondary (`#C9D5FF`), warm gray neutrals, dark burgundy footer (`#4A1522`)
- [ ] **COL-02**: All hardcoded colour values in `main.css` replaced with CSS variables or updated to match the new palette
- [ ] **COL-03**: Accent/selection colour changed from blue to periwinkle across search, Miller columns, filter pills, and pagination
- [ ] **COL-04**: Hover accent changed from orange to periwinkle/burgundy across links, buttons, and interactive elements

### Visual Identity — Components

- [ ] **COMP-01**: Header redesigned — pomegranate logo + "Neogranadina: Zasqua" lockup in Crimson Text, DM Sans navigation, periwinkle hover underlines
- [ ] **COMP-02**: Footer redesigned — dark burgundy background (`#4A1522`) replacing navy, updated text styling
- [ ] **COMP-03**: Homepage hero updated — burgundy search button with periwinkle hover, Crimson Text title
- [ ] **COMP-04**: Homepage masonry grid preserved — only colour/typography changes (hover overlay becomes burgundy instead of blue)
- [ ] **COMP-05**: Search page updated — periwinkle filter pills, burgundy active pagination, updated sort/facet styling
- [ ] **COMP-06**: Description page updated — periwinkle level badges, burgundy links, updated metadata section headers
- [ ] **COMP-07**: Repository page updated — periwinkle Miller column selection, burgundy links
- [ ] **COMP-08**: Background colour changed to warm white (`#FAFAF9`) from pure white

### AHRB Import

- [ ] **AHRB-01**: Backend data exported with `export_frontend_data` including all AHRB description records, uploaded to B2
- [ ] **AHRB-02**: Frontend rebuilt with AHRB data — ~106K pages generated and deployed to R2
- [ ] **AHRB-03**: AHRB repository landing page displays correctly with volume listings and IIIF viewer links

## Future Requirements

(None deferred from this milestone)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dark mode | Not in Figma spec; minimal computing — keep it simple |
| Catalogacion visual identity | Separate project (zasqua-catalogacion-dev) |
| Layout/structural changes | Only colours, typography, and interactive states change; layouts preserved |
| TIFY viewer theming | Self-contained vendor CSS; would require upstream work |
| Entity/place detail pages | Ships with a future release when zasqua-entities is ready |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 1 | Complete |
| VIS-02 | Phase 1 | Complete |
| COL-01 | Phase 1 | Complete |
| COL-02 | Phase 1 | Pending |
| COL-03 | Phase 1 | Pending |
| COL-04 | Phase 1 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| COMP-04 | Phase 2 | Pending |
| COMP-05 | Phase 2 | Pending |
| COMP-06 | Phase 2 | Pending |
| COMP-07 | Phase 2 | Pending |
| COMP-08 | Phase 2 | Pending |
| AHRB-01 | Phase 3 | Pending |
| AHRB-02 | Phase 3 | Pending |
| AHRB-03 | Phase 3 | Pending |

**Coverage:**
- v0.4.0 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — traceability populated after roadmap creation*
