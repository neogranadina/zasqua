# Phase 12: Place Explorer and Place Detail Page Rework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 12-place-explorer-and-place-detail-page-rework
**Areas discussed:** Explorer map redesign, Place detail layout, Index and interaction fixes, Data quality scope

---

## Explorer Map Redesign

| Option | Description | Selected |
|--------|-------------|----------|
| Clustered markers immediately | Load all places as clustered markers on a map centred on northern SA. No splash screen | ✓ |
| All markers, no clusters | Show individual markers for all places | |
| You decide | Claude chooses | |

**User's choice:** Clustered markers immediately
**Notes:** User also requested that the sample places and introductory text be moved above the map (not removed), combined with the existing header text. Approved Option A draft: "Explora los N lugares vinculados a las descripciones de Zasqua. Busca por nombre, filtra por tipo o selecciona un lugar en el mapa. Prueba con Santafé de Bogotá, Cartagena, Quito o Popayán."

---

### Cluster display

| Option | Description | Selected |
|--------|-------------|----------|
| Number inside circle | Cluster circle shows count of places, size scales with count | ✓ |
| Number + colour scale | Count AND colour shifts based on total linked documents | |
| You decide | Claude picks | |

**User's choice:** Number inside circle

---

### Marker click behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Select in sidebar | Clicking a marker selects that place — populates sidebar card, highlights in index | ✓ |
| Map popup + sidebar | Show MapLibre popup AND populate sidebar card | |
| You decide | Claude picks | |

**User's choice:** Select in sidebar

---

### Initial map view

| Option | Description | Selected |
|--------|-------------|----------|
| Northern South America | Centre on Colombia/Ecuador/Venezuela at a zoom showing main clusters | ✓ |
| Fit all markers | Auto-fit bounds to contain all places | |
| You decide | Claude picks | |

**User's choice:** Northern South America

---

### Cluster click behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Zoom in | Click a cluster to zoom until children separate | ✓ |
| Spiderfy | Fan out markers in spider pattern | |
| You decide | Claude picks | |

**User's choice:** Zoom in

---

### Marker colour

| Option | Description | Selected |
|--------|-------------|----------|
| Burgundy for all | Single burgundy colour for all markers and clusters | ✓ |
| Colour by place type | Different colours for city, river, region, other | |
| You decide | Claude picks | |

**User's choice:** Burgundy for all

---

### Viewport filter toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it | Users can toggle viewport filtering to narrow index to visible map area | ✓ |
| Remove it | Redundant with clustered markers always visible | |
| You decide | Claude decides | |

**User's choice:** Keep it

---

### Map-index sync

| Option | Description | Selected |
|--------|-------------|----------|
| Map follows filters | Map markers update to show only places matching current filters | ✓ |
| Map shows all, index filters | Map always shows all places regardless of filters | |
| You decide | Claude chooses | |

**User's choice:** Map follows filters

---

### Places without coordinates

| Option | Description | Selected |
|--------|-------------|----------|
| Index only, no marker | Appear in index list but no map marker. Has-coordinates facet filter exists | ✓ |
| Exclude from explorer | Only show places with coordinates in the explorer | |
| You decide | Claude chooses | |

**User's choice:** Index only, no marker

---

## Place Detail Layout

### Layout structure

| Option | Description | Selected |
|--------|-------------|----------|
| Map above, linked descriptions list below | Remove toggle. Map always visible, scrollable description list below | ✓ |
| Map above, role-grouped descriptions | Map always visible, descriptions grouped by role in collapsible sections | |
| Map above, chronological timeline | Map always visible, existing timeline without the toggle | |

**User's choice:** Map above, linked descriptions list below

---

### Description list fields

| Option | Description | Selected |
|--------|-------------|----------|
| Title + date + role | Description title (linked), date (if available), role label | ✓ |
| Title + role only | Simpler — just title and role | |
| You decide | Claude chooses | |

**User's choice:** Title + date + role

---

### No-map fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder notice + list | Keep "Ubicación no disponible" notice, then description list below | ✓ |
| Just the description list | No map section at all | |
| You decide | Claude chooses | |

**User's choice:** Placeholder notice + list

---

### Sort order

| Option | Description | Selected |
|--------|-------------|----------|
| Chronological, with sort toggle | Default by date (oldest first), toggle to switch to alphabetical | ✓ |
| Chronological only | Always sorted by date, no toggle | |
| By role, then date | Group by role, then chronological within each group | |

**User's choice:** Chronological, with sort toggle
**Notes:** User specifically asked about sorting — added as a follow-up question

---

## Index and Interaction Fixes

### Index click behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Click selects, link in card | Clicking selects place, centres map, populates card. Card has "Ver ficha" link | ✓ |
| Click navigates, separate select button | Keep click-to-navigate, add map icon button for select | |
| You decide | Claude chooses | |

**User's choice:** Click selects, link in card

---

### Card fields

| Option | Description | Selected |
|--------|-------------|----------|
| Match entity pattern | Place name, place type badge, linked description count, coordinates indicator | ✓ |
| Richer cards | Add authority IDs to cards | |
| You decide | Claude matches entity pattern | |

**User's choice:** Match entity pattern

---

### Filter checkbox bug

| Option | Description | Selected |
|--------|-------------|----------|
| Investigate and fix | Research phase investigates root cause | ✓ |
| Known issue, just fix it | Already know the cause | |
| You decide | Claude investigates | |

**User's choice:** Investigate and fix

---

### Sort options

| Option | Description | Selected |
|--------|-------------|----------|
| Match entity explorer | Sort by name (default) and by linked description count | ✓ |
| Add distance sort too | Name, count, plus distance from map centre | |
| You decide | Claude matches entity explorer | |

**User's choice:** Match entity explorer

---

### Selected place card

| Option | Description | Selected |
|--------|-------------|----------|
| Simplify | Name, type, doc count, "Ver ficha" link. Remove authority IDs | ✓ |
| Keep as-is | Phase 10.2 card design unchanged | |
| Add coordinates | Add lat/lon to the card | |

**User's choice:** Simplify

---

## Data Quality Scope

**User's choice:** Address all in Phase 12

**Actions taken during this session (database changes):**
- Deleted 148 places with zero linked descriptions
- Deleted Hacienda de Halla and Chatham (+ their 2 description links)
- Reclassified 15 "other" type places to city (10) and region (5)
- Generated geocoding audit report: `docs/enrichment/geocoding-audit-2026-04-12.md`
- Geocoding fixes deferred to `zasqua-entities` repo

---

## Claude's Discretion

- Exact MapLibre cluster configuration
- Cluster circle sizing and colour opacity
- Map initial zoom level
- Search input debounce timing
- Sort toggle visual treatment
- Coordinates indicator styling in index cards
- Filter checkbox bug fix approach (after investigation)

## Deferred Ideas

- Geocoding corrections — to be fixed in zasqua-entities
- Distance-based sort (mentioned, not selected)
- Spiderfy clusters (decided against)
