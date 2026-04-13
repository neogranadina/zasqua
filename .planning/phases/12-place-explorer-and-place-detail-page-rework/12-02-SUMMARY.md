---
phase: 12-place-explorer-and-place-detail-page-rework
plan: 02
subsystem: ui
tags: [place-detail, layout, sort, vanilla-js]

requires:
  - phase: 12-01
    provides: Clustered map explorer, filter sync, card simplification
provides:
  - Always-visible map on place detail (no segmented toggle)
  - Description list with chronological/alphabetical sort
  - Placeholder notice for places without coordinates
  - Sort toggle hiding timeline dots in alphabetical mode
affects: [place-detail]

tech-stack:
  added: []
  patterns:
    - Inline sort toggle with mode-aware rendering
    - desc-notice pattern reuse for missing-data placeholders

key-files:
  created: []
  modified:
    - src/lugar.njk
    - src/js/place.js

decisions:
  - Removed broken segmented map/timeline toggle (mapEl scoping bug)
  - Chronological sort as default, oldest first, undated under "Sin fecha"
  - Alphabetical sort hides timeline dots/lines
  - Merged duplicate role pills (subject/mentioned share display label)
  - Moved "Ver en explorador" from pills area to Control section

deviations: []

self-check:
  status: PASSED
  must_haves:
    - "Place detail shows always-visible map — VERIFIED"
    - "Description list with sort toggle — VERIFIED"
    - "Undated under Sin fecha in chronological — VERIFIED"
    - "Places without coords show placeholder — VERIFIED"
    - "Role filter pills functional — VERIFIED"
---

## What was built

Refactored the place detail page layout: removed the broken segmented map/timeline toggle, made the map always visible when coordinates exist, and replaced the timeline with a scrollable description list with chronological/alphabetical sort.

## Additional improvements during review

- Renamed authority filter label to "Solo con autoridad externa"
- Added proper desc-notice placeholder for places without coordinates
- Moved headings: "Mapa" above map, "Descripciones vinculadas" below
- Added nl- prefix to place identifiers in Control section
- Moved "Ver en explorador" button to Control section (matching entity pages)
- Fixed entity explorer button styling (burgundy instead of white-on-white)
- Added escapeTemplate filter fixing OCR text crashing Eleventy builds
- Added searchable facet modal for Función principal (1,573 values)
