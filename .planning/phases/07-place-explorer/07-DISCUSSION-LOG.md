# Phase 7: Place Explorer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 07-place-explorer
**Areas discussed:** Page layout & map/list split, Heatmap & map interaction, Search & filtering UX, Results list behaviour, Empty/no-results states, Map-list synchronisation, Place type facet values

---

## Page Layout & Map/List Split

### Map and results arrangement

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side | Map right, list left. Classic spatial explorer (WHG, Peripleo). List stacks above map on mobile | |
| Map dominant with drawer | Full-width map with collapsible results drawer/panel | |
| Stacked | Map on top (fixed height), results list below | ✓ |

**User's choice:** Stacked
**Notes:** None

### Map height

| Option | Description | Selected |
|--------|-------------|----------|
| ~400px | Enough for country/region context without dominating | |
| ~300px compact | More space for results, map still usable | |
| 50vh (half viewport) | Adapts to screen size, more immersive | ✓ |

**User's choice:** 50vh (half viewport)
**Notes:** None

### Page intro

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal heading only | Just title + breadcrumb, straight to search + map | |
| Brief intro paragraph | Title + 1-2 sentences explaining what users can do | ✓ |
| You decide | Claude picks based on site patterns | |

**User's choice:** Brief intro paragraph
**Notes:** None

---

## Heatmap & Map Interaction

### Heatmap rendering approach

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side from JSON | Load place-index.json, filter in JS, render as MapLibre heatmap layer | ✓ |
| PMTiles vector layer | Use existing PMTiles as vector tile source with filter expressions | |
| Hybrid | PMTiles for basemap, client-side GeoJSON for data overlay | |

**User's choice:** Client-side from JSON
**Notes:** None

### Map click behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Popup with name + link | Small popup with place name and link to detail page | ✓ |
| Highlight in results list | Scroll to and highlight place in results list | |
| Both popup and highlight | Popup on map AND scroll-to in results list | |
| You decide | Claude picks | |

**User's choice:** Popup with name + link
**Notes:** None

### Zoom level behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Heatmap at low zoom, points at high zoom | Smooth transition around z8-z10 | ✓ |
| Heatmap only at all zoom levels | Always density heatmap, never individual points | |
| You decide | Claude picks | |

**User's choice:** Heatmap at low zoom, points at high zoom
**Notes:** None

---

## Search & Filtering UX

### Filter layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal bar above map | Search + filter dropdowns/pills in a single row | |
| Sidebar (like /buscar/) | Vertical sidebar with facet groups | ✓ |
| Collapsible panel above map | Expandable filter panel between intro and map | |

**User's choice:** Sidebar (like /buscar/)
**Notes:** None

### Active filter pills

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, match /buscar/ pattern | Removable pills between search bar and results | ✓ |
| No pills, just sidebar state | Sidebar checkboxes only indicator | |
| You decide | Claude picks | |

**User's choice:** Yes, match /buscar/ pattern
**Notes:** None

### Search mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Simple substring match | Case-insensitive substring on display_name | ✓ |
| Fuzzy/approximate matching | Fuse.js or similar for typo tolerance | |
| You decide | Claude picks | |

**User's choice:** Simple substring match
**Notes:** None

### URL state sync

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, URL params | Filters sync to query params, matching /buscar/ | ✓ |
| No URL sync | Ephemeral filters, reset on refresh | |

**User's choice:** Yes, URL params
**Notes:** None

### Mobile filter behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible filter panel | Sidebar collapses into toggleable panel on mobile | ✓ |
| Match /buscar/ mobile behaviour | Same pattern as search page | |
| You decide | Claude picks | |

**User's choice:** Collapsible filter panel
**Notes:** None

---

## Results List Behaviour

### Result row content

| Option | Description | Selected |
|--------|-------------|----------|
| Name + type + linked count | Display name link, type badge, description count | ✓ |
| Name + type only | Just name and type badge | |
| Name + type + authority icons | Name, type, and authority source icons | |

**User's choice:** Name + type + linked count
**Notes:** None

### Pagination

| Option | Description | Selected |
|--------|-------------|----------|
| Paginated | 50/page with page navigation, URL tracks page | ✓ |
| Virtual scroll / infinite | Render as user scrolls | |
| Load more button | Initial batch + click to load more | |

**User's choice:** Paginated
**Notes:** None

### Sort order

| Option | Description | Selected |
|--------|-------------|----------|
| Alphabetical by name | Predictable default, easy to scan | |
| By linked description count (desc) | Most-referenced first | |
| Both with toggle | Default alphabetical, toggle for by-count | ✓ |

**User's choice:** Both with toggle (alphabetical default)
**Notes:** User initially selected "both with toggle" thinking about documents where alphabetical is useless. Corrected: for places, alphabetical is the right default.

---

## Empty/No-Results States

### Zero results display

| Option | Description | Selected |
|--------|-------------|----------|
| Message + clear filters link | Brief message + "Clear all filters" link, basemap with no overlay | ✓ |
| Message only | Text message, manual filter adjustment | |
| You decide | Claude picks | |

**User's choice:** Message + clear filters link
**Notes:** None

---

## Map-List Synchronisation

### Map viewport filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Independent | Map and list show same filter data, viewport doesn't affect list | |
| Map bounds filter the list | Moving map updates results to visible places only | |
| Toggle | Independent by default, explicit toggle enables viewport filtering | ✓ |

**User's choice:** Independent by default with explicit toggle for viewport filtering
**Notes:** User specified: "I think there should be a toggle enabling [map bounds filtering] explicitly"

---

## Place Type Facet Values

### Missing labels for river/other types

**User's choice:** `river` → "Cuerpo de agua", `other` → "Accidente geográfico"
**Notes:** User noted that "city" is too specific for the broad category — confirmed that ui.js already maps it to "Lugar poblado" which is correct. User examined the actual data: 253 "river" records are actually rivers (163), streams/quebradas (81), lakes (5), and a few others — "Cuerpo de agua" better represents the category than "Río". The 17 "other" records are mountains, islands, and passes — "Accidente geográfico" already exists in ui.js and fits.

---

## Claude's Discretion

- MapLibre heatmap layer configuration (colour ramp, radius, intensity, opacity)
- Zoom transition thresholds for heatmap-to-points
- Search input debounce timing
- Sidebar facet expand/collapse defaults
- Pagination component styling
- "Filter by map area" toggle visual integration
- Protomaps basemap style variant

## Deferred Ideas

None — discussion stayed within phase scope
