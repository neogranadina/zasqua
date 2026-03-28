# Phase 7: Place Explorer - Research

**Researched:** 2026-03-28
**Domain:** MapLibre GL JS heatmap, in-memory JSON filtering, URL-state management, Eleventy/Nunjucks template
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page Layout**
- D-01: Stacked layout — search/filters sidebar alongside map (50vh height), then results list below the map
- D-02: Sidebar on the left for facet filters (matching `/buscar/` pattern), with map and results to the right of the sidebar
- D-03: Map height is 50vh (half viewport) — adapts to screen size
- D-04: Page has a brief intro paragraph — title ("Explorar lugares") + 1-2 sentences explaining what users can do here, above the search + map area
- D-05: On mobile, sidebar collapses into a toggleable filter panel above the map/results

**Heatmap & Map Interaction**
- D-06: Heatmap rendered client-side from place-index.json — filter in JS, build GeoJSON FeatureCollection, update MapLibre heatmap layer. No PMTiles data layer needed (PMTiles used for basemap tiles only)
- D-07: Heatmap at low zoom, individual points at high zoom — smooth transition around z8-z10 where heatmap layer fades out and circle markers fade in
- D-08: Clicking a point shows a popup with place name + link to `/lugar/{name}/`. At heatmap zoom levels, clicking zooms in to reveal individual points

**Search & Filtering**
- D-09: Simple substring match on display_name (case-insensitive) — no fuzzy search library needed for 8K place names
- D-10: Facet filters in sidebar: place type, has coordinates (boolean), has authority links (boolean) — matching requirements PEXP-01/PEXP-02
- D-11: Active filter pills shown between search bar and results (removable), matching `/buscar/` pattern
- D-12: Filter state synced to URL query params — enables sharing filtered views and browser back/forward
- D-13: Map and results list are independent by default — both show the same filter-based dataset. An explicit "Filter by map area" toggle constrains results to places within the current map viewport when activated

**Results List**
- D-14: Each result row shows: place name (link to `/lugar/{name}/`), place type badge, and linked description count
- D-15: Paginated — 50 results per page with page navigation at the bottom, URL tracks page number
- D-16: Default sort alphabetical by name, with a toggle to sort by linked description count (descending)

**Empty States**
- D-17: Zero results: message ("No se encontraron lugares con estos criterios") + "Clear all filters" link. Map shows basemap with no heatmap overlay

**Place Type Labels**
- D-18: Add missing ui.js labels: `river: "Cuerpo de agua"` and `other: "Accidente geográfico"`
- D-19: Facet shows only types with records in the data (currently: city/7860, river/253, region/47, other/17). Zero-record types stay defined in ui.js for future use

### Claude's Discretion
- Exact MapLibre heatmap layer configuration (colour ramp, radius, intensity, opacity transition)
- Zoom transition thresholds for heatmap-to-points switch
- Search input debounce timing
- Sidebar facet group expand/collapse defaults
- Exact pagination component styling (reuse from /buscar/ or new)
- How the "Filter by map area" toggle integrates visually
- Protomaps basemap style (en.json vs other variants)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PEXP-01 | User can search places by name on `/explorar/lugares/` | D-09: substring match on display_name in place-index.json loaded client-side |
| PEXP-02 | User can filter places by facets (place type, has coordinates, has authority links) | D-10: three facets driven from place-index.json boolean fields has_wikidata/has_whg/has_hgis |
| PEXP-03 | Place explorer renders filtered results as a heatmap on an interactive map (MapLibre + PMTiles) | D-06/D-07: GeoJSON FeatureCollection built in JS, two-layer MapLibre setup (heatmap + circle) |
| PEXP-04 | Place explorer shows a results list alongside the map | D-14/D-15/D-16: paginated list with sort, reusing search.js patterns |

</phase_requirements>

---

## Summary

Phase 7 builds a single-page discovery interface at `/explorar/lugares/` that loads `place-index.json` (~300 KB, all 8,177 places) once on init, filters the array in memory with vanilla JS, and drives both a MapLibre heatmap and a paginated results list from the same filtered state. No server, no Pagefind, no external search API — the entire interaction is client-side.

The architecture is a new JS class `PlaceExplorer` in `src/js/place-explorer.js`, modelled on `SearchPage` in `search.js` for URL-state, facets, pagination, and filter pills; and on `place.js` for MapLibre + Protomaps init. The two patterns are mature and well-proven in the codebase — the explorer wires them together with an in-memory data layer instead of Pagefind.

A critical pre-condition is a one-line fix to `scripts/precompute-links.js`: it currently writes `place_code: p.place_code` but `places.json` exports only `id` (no `place_code` field), so every record in `place-index.json` has `place_code: undefined`. The explorer must use `id` as the place identifier throughout. This affects the `place-index.json` schema, the shard fetch path, and the URL link to `/buscar/?lugar={id}`.

**Primary recommendation:** New template `src/explorar/lugares.njk` + `src/js/place-explorer.js` following the SearchPage/place.js split. Reuse all existing CSS classes from `/buscar/`. Fix `precompute-links.js` to use `p.id` as the place identifier before planning any data access.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| MapLibre GL JS | v5 (CDN: `maplibre-gl@5`) | Interactive map, heatmap layer, circle layer, popups | Already in use on place detail pages (lugar.njk); pinned to v5 |
| PMTiles (pmtiles@4) | v4 (CDN) | Protomaps tile protocol registration | Already in use on place detail pages; tiles served from `tiles.zasqua.org` |
| Protomaps basemap | `en.json` (CDN: `cdn.protomaps.com`) | Basemap tiles | Same basemap as place detail map |
| Eleventy 3 / Nunjucks | v3.1.2 | Template for `/explorar/lugares/` | Project stack |
| Vanilla JS (ES2020) | — | In-memory filter, URL state, DOM rendering | No framework; consistent with search.js and place.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind v4 standalone | standalone CLI | Utility classes in template markup | Already in use for layout |
| `@layer components` CSS | — | Custom CSS classes reused from /buscar/ | All `.search-*`, `.facet-*`, `.filter-pill`, `.pagination-*` classes are already defined |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla JS filtering | Pagefind | Pagefind is overkill for 8K records and doesn't support boolean facets without custom index; in-memory is simpler and instant |
| GeoJSON heatmap layer | PMTiles vector tiles for heatmap | PMTiles tile data is for basemap only (D-06); a second tile source for heatmap adds complexity with no benefit at 8K points |
| Custom circle markers | MapLibre circle layer | DOM markers can't handle thousands of points efficiently; MapLibre circle layers render on the GPU canvas |

**Installation:** No new packages required. All dependencies are loaded via CDN already used on lugar.njk.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── explorar/
│   └── lugares.njk          # New: place explorer template at /explorar/lugares/
├── js/
│   └── place-explorer.js    # New: PlaceExplorer class
├── _data/
│   └── ui.js                # Modified: add river/other type labels (D-18)
src/css/
└── main.css                 # May need: .explorer-map, .explorer-layout classes
scripts/
└── precompute-links.js      # Fix: p.place_code → p.id for place-index.json records
```

### Pattern 1: Template structure — extending base.njk

The explorer template follows the same pattern as `buscar.njk`: a thin Nunjucks shell that passes server-side data as `data-*` attributes on the container element, and hands off all rendering to a JS class.

```nunjucks
{# src/explorar/lugares.njk #}
---
layout: base.njk
title: "Explorar lugares"
permalink: /explorar/lugares/
---

<div class="container font-sans" data-pagefind-ignore>
  <div id="place-explorer"
       data-place-types='{{ ui.place.types | dump | safe }}'
       data-total='{{ places | length }}'></div>
</div>

{% block head %}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.css" />
  <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.js"></script>
  <script type="module">
    import { Protocol } from 'https://cdn.jsdelivr.net/npm/pmtiles@4/dist/pmtiles.js';
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
  </script>
{% endblock %}

{% block scripts %}
  <script src="/js/place-explorer.js"></script>
{% endblock %}
```

**Why:** MapLibre CDN is loaded unconditionally on this page (unlike lugar.njk where it's conditional on coordinates). The `data-place-types` attribute passes Nunjucks-rendered JSON for type label lookups client-side — mirrors how `search.js` gets level labels via `data-level-labels`.

### Pattern 2: PlaceExplorer class — data loading and filter loop

```javascript
// src/js/place-explorer.js
// Source: search.js (SearchPage class) pattern

class PlaceExplorer {
  constructor(container) {
    this.container = container;
    this.placeTypes = JSON.parse(container.dataset.placeTypes || '{}');
    this.allPlaces = [];       // Loaded once from place-index.json
    this.filtered = [];        // Result of current filter pass
    this.perPage = 50;

    this.state = {
      q: '',
      type: [],         // place_type values
      hasCoords: null,  // true | false | null (null = no filter)
      hasAuthority: null,
      sort: 'name',     // 'name' | 'linked'
      page: 1,
      mapBound: false,  // "Filter by map area" toggle
    };

    this.map = null;
    this.init();
  }

  async init() {
    this.parseUrlParams();
    await this.loadData();
    this.initMap();
    window.addEventListener('popstate', () => {
      this.parseUrlParams();
      this.render();
    });
    this.render();
  }

  async loadData() {
    const res = await fetch('/data/place-index.json');
    this.allPlaces = await res.json();
  }
  // ...
}
```

### Pattern 3: MapLibre heatmap + circle dual-layer

```javascript
// Source: https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer/

map.on('load', () => {
  map.addSource('places', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  // Heatmap layer — visible at low zoom, fades out at z9
  map.addLayer({
    id: 'places-heat',
    type: 'heatmap',
    source: 'places',
    maxzoom: 10,
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 2],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(139,41,66,0)',
        0.2, 'rgba(201,213,255,0.6)',
        0.4, 'rgba(180,100,120,0.8)',
        0.8, 'rgba(139,41,66,0.9)',
        1, '#4A1522'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 10, 0]
    }
  });

  // Circle layer — invisible at low zoom, fades in at z8
  map.addLayer({
    id: 'places-circle',
    type: 'circle',
    source: 'places',
    minzoom: 7,
    paint: {
      'circle-radius': 6,
      'circle-color': '#8B2942',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 1]
    }
  });
});
```

**Colour ramp note:** The heatmap colour uses the project's burgundy (#8B2942) at high density and periwinkle (#C9D5FF) as the mid-density shoulder — consistent with the established visual identity (design-tokens.md).

### Pattern 4: Dynamic GeoJSON source update

```javascript
// Source: https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/
updateMap(filteredPlaces) {
  const features = filteredPlaces
    .filter(p => p.lat != null && p.lon != null)
    .map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, display_name: p.display_name }
    }));

  const source = this.map.getSource('places');
  if (source) {
    source.setData({ type: 'FeatureCollection', features });
  }
}
```

### Pattern 5: Click popup + heatmap zoom-in

```javascript
// Source: MapLibre GL JS official docs (Popup class)

// Click on circle layer — show popup
this.map.on('click', 'places-circle', (e) => {
  const props = e.features[0].properties;
  const name = props.display_name;
  const slug = name.replace(/[?#]/g, '');
  new maplibregl.Popup()
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(`<a href="/lugar/${encodeURIComponent(slug)}/">${name}</a>`)
    .addTo(this.map);
});

// Click on heatmap area — zoom in to reveal individual points
this.map.on('click', 'places-heat', (e) => {
  this.map.easeTo({ center: e.lngLat, zoom: this.map.getZoom() + 2 });
});

// Pointer cursor on circle layer
this.map.on('mouseenter', 'places-circle', () => {
  this.map.getCanvas().style.cursor = 'pointer';
});
this.map.on('mouseleave', 'places-circle', () => {
  this.map.getCanvas().style.cursor = '';
});
```

### Pattern 6: URL state management — matching search.js

The explorer must sync all filter state to URL params and handle `popstate` for browser back/forward — same pattern as `SearchPage.updateUrl()` and `SearchPage.parseUrlParams()`.

```javascript
// URL param names: q=, type=, coords=1|0, authority=1|0, sort=, page=
updateUrl() {
  const params = new URLSearchParams();
  if (this.state.q) params.set('q', this.state.q);
  for (const t of this.state.type) params.append('type', t);
  if (this.state.hasCoords !== null) params.set('coords', this.state.hasCoords ? '1' : '0');
  if (this.state.hasAuthority !== null) params.set('authority', this.state.hasAuthority ? '1' : '0');
  if (this.state.sort !== 'name') params.set('sort', this.state.sort);
  if (this.state.page > 1) params.set('page', this.state.page);
  if (this.state.mapBound) params.set('map_bound', '1');
  const qs = params.toString();
  const url = qs ? `/explorar/lugares/?${qs}` : '/explorar/lugares/';
  history.pushState(null, '', url);
}
```

### Pattern 7: "Filter by map area" bounding box

```javascript
// Called when mapBound toggle is active and map moves
filterByViewport() {
  if (!this.state.mapBound) return this.filtered;
  const bounds = this.map.getBounds();
  return this.filtered.filter(p =>
    p.lat != null && p.lon != null &&
    p.lon >= bounds.getWest() && p.lon <= bounds.getEast() &&
    p.lat >= bounds.getSouth() && p.lat <= bounds.getNorth()
  );
}
```

### Anti-Patterns to Avoid
- **DOM markers for 5,572 points:** Using `maplibregl.Marker` for each place creates 5,572 DOM elements. Always use GeoJSON source + layer rendering (GPU canvas).
- **Re-adding layers on each filter change:** Call `source.setData()` to update the data, not `removeLayer/addLayer`. Layers are added once on map load.
- **Calling `addProtocol` in place-explorer.js:** Protocol is already registered in the template `<head>` module script (same pattern as lugar.njk). Calling it again throws a warning.
- **Loading place-index.json at build time via `src/_data/`:** The file is served as a passthrough static file and fetched client-side. Adding it to `_data/` would inject 8,177 records into every Eleventy page's data cascade.
- **Using `place_code` as place identifier:** `places.json` has no `place_code` field — only `id`. All code must use `id`. The precompute script currently has this bug.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map rendering + heatmap | Custom canvas drawing | MapLibre heatmap layer | GPU-accelerated; handles zoom transitions, tile loading, projection |
| Tile serving | Direct R2 URLs | `tiles.zasqua.org` Worker (Phase 5) | Range requests, CORS, caching — already solved |
| CSS for facets/pills/pagination | New component classes | Existing `.facet-group`, `.filter-pill`, `.search-pagination`, `.search-sidebar` classes in main.css | Already styled, matching /buscar/ |
| Place type label lookup | Hardcode labels in JS | `data-place-types` attribute on container, parsed at init | Consistent with how search.js gets level labels; labels are Nunjucks-rendered from ui.js |
| URL serialisation | Custom string builder | `URLSearchParams` (native) | Already used by search.js |

---

## Critical Pre-condition: place_code / id Mismatch

This is the most important finding from reading the codebase. **It must be addressed before or in Wave 1.**

### The Problem

`scripts/precompute-links.js` writes `place-index.json` with `place_code: p.place_code`, but `data/places.json` exports only `id` — it has no `place_code` field. As a result:
- Every record in `place-index.json` has `place_code: undefined`
- `src/_data/places.js` does `countByCode.get(place.id)` — but the map has `undefined` as keys, so `_linked_count` is 0 for all places
- `lugar.njk` uses `place.id` for the search URL (`/buscar/?lugar={{ place.id }}`)

### The Fix

In `scripts/precompute-links.js`, change:
```javascript
place_code: p.place_code,
```
to:
```javascript
id: p.id,
```

And update `src/_data/places.js` to match:
```javascript
countByCode.set(entry.id, entry.linked_description_count);
```

The explorer's `place-index.json` records should use `id` (not `place_code`) as the identifier. The place detail page permalink already uses `display_name` (not any code), so the link from explorer to detail page is `/lugar/${encodeURIComponent(p.display_name.replace(/[?#]/g, ''))}/` — the same slug logic as the Eleventy `safeSlug` filter.

STATE.md records this as a known issue: *"place.id used for shard fetch and search URL — places.json has no place_code field"*.

---

## place-index.json Schema (as produced by precompute-links.js after fix)

| Field | Type | Notes |
|-------|------|-------|
| `id` | number | Place identifier (was `place_code: undefined`; fix maps `p.id`) |
| `display_name` | string | Shown in results list and popup |
| `place_type` | string | `city`, `river`, `region`, `other` — drives type facet |
| `lat` | number or null | Renamed from `latitude` at build time |
| `lon` | number or null | Renamed from `longitude` at build time |
| `has_wikidata` | boolean | `!!p.wikidata_id` |
| `has_whg` | boolean | `!!p.whg_id` |
| `has_hgis` | boolean | `!!p.hgis_id` |
| `linked_description_count` | number | Count from place_links.json grouping by `place_code` |

**"Has authority links" facet** (D-10): derived client-side as `p.has_wikidata || p.has_whg || p.has_hgis`. No additional field needed.

**Coordinate check** (D-10 "has coordinates"): `p.lat != null && p.lon != null`. Note: 5,572 of 8,177 places have coordinates. 2,605 do not and will appear in the list but not on the map.

---

## ui.js Changes Required

Two labels must be added to `src/_data/ui.js` under `place.types` (D-18):

```javascript
// Current:
types: {
  city: "Lugar poblado",
  administrative_division: "División administrativa",
  region: "Región",
  country: "País",
  geographical_feature: "Accidente geográfico"
}

// After Phase 7:
types: {
  city: "Lugar poblado",
  administrative_division: "División administrativa",
  region: "Región",
  country: "País",
  geographical_feature: "Accidente geográfico",
  river: "Cuerpo de agua",       // D-18: add
  other: "Accidente geográfico"  // D-18: add
}
```

The facet in the explorer shows only types with records in the current dataset: city (7,860), river (253), region (47), other (17). Administrative_division and country have 0 records and must not appear in the facet (D-19).

---

## Common Pitfalls

### Pitfall 1: addProtocol double-registration
**What goes wrong:** Calling `maplibregl.addProtocol('pmtiles', ...)` in `place-explorer.js` when the template already registers it in the `<head>` module script, causing "Protocol already registered" warnings and potential tile failures.
**Why it happens:** `place.js` had the same issue and was fixed. The pattern is to register once in the template head.
**How to avoid:** Do not call `addProtocol` in `place-explorer.js`. The protocol is already registered by the inline `<script type="module">` in the template head — exactly as in lugar.njk.
**Warning signs:** Console error "Protocol pmtiles already registered."

### Pitfall 2: Map init before container has height
**What goes wrong:** MapLibre map renders as 0px height (blank) because the container div has no height when `new maplibregl.Map()` is called.
**Why it happens:** CSS height is set by a class, but the div is empty and class hasn't applied yet, or the JS fires before the layout is painted.
**How to avoid:** Set a fixed CSS height on the map container (`height: 50vh`) before calling `new maplibregl.Map()`. Also call `map.resize()` after any layout changes that might affect the container.
**Warning signs:** Blank map area; `map.getCanvas().offsetHeight === 0` in console.

### Pitfall 3: setData on a source that doesn't exist yet
**What goes wrong:** `map.getSource('places').setData(...)` called before the map fires `'load'`, throwing "Cannot read properties of undefined".
**Why it happens:** The filter/render loop may fire before the map has finished initialising.
**How to avoid:** Only call `setData` after `map.on('load', ...)` has fired. The `PlaceExplorer.init()` sequence should call `initMap()`, wait for the `load` event, then call `render()`.

### Pitfall 4: place_code undefined in place-index.json
**What goes wrong:** All places show 0 linked descriptions; place detail page links use the string "undefined".
**Why it happens:** `precompute-links.js` reads `p.place_code` but `places.json` only has `p.id`.
**How to avoid:** Fix `precompute-links.js` to write `id: p.id` and update `places.js` to read `entry.id`. Fix must go in Wave 1 before the JS uses the data.

### Pitfall 5: Popup HTML injection
**What goes wrong:** A place name containing `<` or `>` breaks the popup HTML.
**Why it happens:** Naive string interpolation: `` `<a href="...">${name}</a>` ``
**How to avoid:** Use `document.createElement` / `.textContent` for the link text, or call `place.display_name.replace(/</g, '&lt;')` before interpolation. All 8,177 place names are archival place names — low real-world risk, but worth one line of escaping.

### Pitfall 6: Debounce timing on search input
**What goes wrong:** Every keystroke triggers a full filter pass + DOM re-render + `setData` call on 8K records, creating visible jank on slow devices.
**Why it happens:** No debounce on the search input handler.
**How to avoid:** 200-300ms debounce on the search input event. This is listed under Claude's Discretion — 250ms is a reasonable default.

### Pitfall 7: "Filter by map area" and popstate
**What goes wrong:** When the map viewport changes and `mapBound` is active, the URL gets polluted with frequent `pushState` calls (one per map `moveend` event while filtering).
**Why it happens:** Viewport-bound filtering is triggered by `map.on('moveend', ...)`, and if `updateUrl()` is called there, every pan/zoom creates a history entry.
**How to avoid:** Do not call `updateUrl()` from the `moveend` handler. Call `render()` (which re-filters and updates the list/map) but skip URL push. The `mapBound` toggle state is already in the URL; the viewport itself does not need to be serialised.

---

## Code Examples

### Full heatmap + circle layer init (verified pattern)

```javascript
// Source: https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer/
// Adapted to project colour palette

initMap() {
  this.map = new maplibregl.Map({
    container: 'explorer-map',
    style: 'https://cdn.protomaps.com/basemaps/v4/en.json',
    center: [-74.0, 4.5],   // Colombia centroid (default view for the archive)
    zoom: 4
  });

  this.map.on('load', () => {
    this.map.addSource('places', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    this.map.addLayer({
      id: 'places-heat',
      type: 'heatmap',
      source: 'places',
      maxzoom: 10,
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 2],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(139,41,66,0)',
          0.1, 'rgba(201,213,255,0.4)',
          0.4, 'rgba(180,90,115,0.7)',
          0.8, 'rgba(139,41,66,0.9)',
          1, '#4A1522'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 4, 9, 20],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 10, 0]
      }
    });

    this.map.addLayer({
      id: 'places-circle',
      type: 'circle',
      source: 'places',
      minzoom: 7,
      paint: {
        'circle-radius': 6,
        'circle-color': '#8B2942',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 1]
      }
    });

    // Click: circle layer → popup
    this.map.on('click', 'places-circle', (e) => {
      const props = e.features[0].properties;
      const slug = props.display_name.replace(/[?#]/g, '');
      new maplibregl.Popup()
        .setLngLat(e.features[0].geometry.coordinates.slice())
        .setHTML(`<strong><a href="/lugar/${encodeURIComponent(slug)}/">${
          props.display_name.replace(/</g, '&lt;')
        }</a></strong>`)
        .addTo(this.map);
    });

    // Click: heatmap area → zoom in
    this.map.on('click', 'places-heat', (e) => {
      this.map.easeTo({ center: e.lngLat, zoom: this.map.getZoom() + 2 });
    });

    this.map.on('mouseenter', 'places-circle', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'places-circle', () => {
      this.map.getCanvas().style.cursor = '';
    });

    // Initial render after map ready
    this.render();
  });
}
```

### In-memory filter function

```javascript
applyFilters() {
  let result = this.allPlaces;
  const q = this.state.q.trim().toLowerCase();
  if (q) {
    result = result.filter(p => p.display_name.toLowerCase().includes(q));
  }
  if (this.state.type.length > 0) {
    result = result.filter(p => this.state.type.includes(p.place_type));
  }
  if (this.state.hasCoords === true)  result = result.filter(p => p.lat != null && p.lon != null);
  if (this.state.hasCoords === false) result = result.filter(p => p.lat == null || p.lon == null);
  if (this.state.hasAuthority === true)  result = result.filter(p => p.has_wikidata || p.has_whg || p.has_hgis);
  if (this.state.hasAuthority === false) result = result.filter(p => !p.has_wikidata && !p.has_whg && !p.has_hgis);
  return result;
}
```

### Sort function

```javascript
sortResults(results) {
  if (this.state.sort === 'linked') {
    return [...results].sort((a, b) => b.linked_description_count - a.linked_description_count);
  }
  // Default: alphabetical by display_name
  return [...results].sort((a, b) => a.display_name.localeCompare(b.display_name, 'es'));
}
```

### Reusing existing CSS classes

The explorer reuses all of these without modification:
- `.search-layout` — sidebar + content flex row
- `.search-sidebar` / `sidebar-open` — left panel + mobile open state
- `.search-sidebar-heading` — "Filtrar por:" heading
- `.facet-group`, `.facet-group-toggle`, `.facet-group-title`, `.facet-group-content` — collapsible facet groups
- `.facet-option`, `.facet-label-text`, `.facet-count` — individual facet checkboxes
- `.filter-pill`, `.filter-pill-remove` — active filter tags
- `.search-pagination`, `.pagination-link`, `.pagination-link.active`, `.pagination-link.disabled` — page nav
- `.search-results-info`, `.results-count`, `.sort-btn`, `.sort-btn.active` — results header + sort
- `.search-loading`, `.search-loading-overlay` — loading state

New classes needed (likely):
- `.explorer-map` — map container with `height: 50vh`
- `.explorer-layout` — stacked layout: sidebar + map/results column

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pagefind for all search | Pagefind for descriptions only; in-memory JSON for entities/places | Phase 4 decision (D-01/D-02) | Explorer pages need no Pagefind integration |
| MapLibre v4 | MapLibre v5 (CDN `@5`) | Phase 6 (lugar.njk uses v5) | Stable; no API changes relevant to heatmap |
| PMTiles v3 | PMTiles v4 (CDN `@4`) | Phase 6 | `import { Protocol }` syntax unchanged |

---

## Environment Availability Audit

Step 2.6: Skipped for JS implementation steps. All external dependencies are CDN-loaded (MapLibre, PMTiles, Protomaps basemap) and already verified working in production on lugar.njk pages. No new CLI tools required.

The `tiles.zasqua.org` Worker (Phase 5) serves the Protomaps basemap — this is the basemap URL used on lugar.njk detail pages and must continue to work. The explorer uses the same basemap URL pattern. No additional tile Worker changes are needed for Phase 7 (D-06: PMTiles is basemap-only).

---

## Validation Architecture

`workflow.nyquist_validation` is not set to false in `.planning/config.json` (only `_auto_chain_active` is set). No automated test framework is currently configured in this project — it is a static site with no jest/vitest/playwright setup. All validation is manual browser testing.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PEXP-01 | Typing a name substring filters the results list | manual | — | N/A |
| PEXP-02 | Selecting place type / has coords / has authority facets updates results | manual | — | N/A |
| PEXP-03 | Filtered GeoJSON FeatureCollection renders as heatmap; heatmap updates on filter change | manual | — | N/A |
| PEXP-04 | Results list shows name, type badge, linked count; each row links to correct detail page | manual | — | N/A |

**No automated test framework is present.** All phase gates are manual verification in the browser.

### Sampling Rate
- **Per task commit:** Run `npm run build:dev` and open `/explorar/lugares/` locally
- **Per wave merge:** Full browser smoke test of filter combinations, map interactions, mobile layout
- **Phase gate:** All four PEXP requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps
None — no test framework to configure. Verification is browser-based smoke testing.

---

## Open Questions

1. **linked_description_count accuracy**
   - What we know: `precompute-links.js` calculates count from `place_links.json` grouped by `place_code`, but `places.json` uses `id` not `place_code`. The `byPlace` map will have keys matching `place_links.json`'s `place_code` field.
   - What's unclear: What values does the backend export in `place_links.json`'s `place_code` field — are they numeric IDs or string codes?
   - Recommendation: Inspect `data/place_links.json` in the dev environment before building the explorer. If `place_links.json` uses numeric IDs matching `places.json.id`, the fix is straightforward. If it uses a different identifier, the `precompute-links.js` grouping key also needs updating.

2. **`safeSlug` for popup links**
   - What we know: `lugar.njk` permalink uses `{{ place.display_name | safeSlug }}` which strips `?` and `#` only. The explorer popup link must produce the same URL.
   - What's unclear: Whether `encodeURIComponent` is needed for place names with spaces/accents (e.g., "Bogotá", "Santa Fe de Antioquia").
   - Recommendation: Use the same `.replace(/[?#]/g, '')` logic as the `safeSlug` Eleventy filter. Eleventy does not apply `encodeURIComponent` to permalink slugs — spaces become literal spaces in the URL. The popup `href` should match exactly.

3. **Navigation link for the explorer**
   - What we know: `ui.nav.browse` ("Explorar") exists but has no `href` pointing to a subnav or `/explorar/lugares/` specifically.
   - What's unclear: Whether Phase 7 should add a direct "Explorar lugares" link to the nav, or whether the "Explorar" nav item becomes a link to `/explorar/lugares/` directly (since the entity explorer is Phase 8).
   - Recommendation: Add `/explorar/lugares/` as the `href` for `nav.browse` for now, updating it to an index page when Phase 8 ships. The planner should include a task for this.

---

## Sources

### Primary (HIGH confidence)
- MapLibre GL JS official docs — heatmap layer paint properties, GeoJSONSource.setData(), Popup API
  - https://maplibre.org/maplibre-gl-js/docs/examples/create-a-heatmap-layer/
  - https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/
  - https://maplibre.org/maplibre-gl-js/docs/API/classes/Popup/
- Codebase direct inspection — `src/js/search.js`, `src/js/place.js`, `src/lugar.njk`, `src/buscar.njk`, `src/css/main.css`, `src/_data/ui.js`, `scripts/precompute-links.js`, `src/_data/places.js`, `eleventy.config.js`
- Data inspection — `data/places.json` field schema, type distribution, coordinate coverage

### Secondary (MEDIUM confidence)
- Geoapify MapLibre heatmap tutorial (WebSearch, verified against official docs)
  - https://www.geoapify.com/tutorial/js-heatmap-example-with-maplibre-gl/

### Tertiary (LOW confidence)
None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — CDN versions confirmed from lugar.njk; no new dependencies
- Architecture: HIGH — patterns read directly from existing search.js and place.js code
- Pitfalls: HIGH — place_code bug confirmed by code inspection + STATE.md; map init pitfalls from official docs
- Data schema: HIGH — inspected places.json directly (8,177 records), confirmed field names

**Research date:** 2026-03-28
**Valid until:** 2026-06-28 (stable stack; MapLibre v5, PMTiles v4 unlikely to break)
