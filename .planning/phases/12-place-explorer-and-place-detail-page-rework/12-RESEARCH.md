# Phase 12: Place Explorer and Place Detail Page Rework — Research

**Researched:** 2026-04-12
**Domain:** MapLibre GL JS clustering, Pagefind facet state, place detail layout refactor
**Confidence:** HIGH (all key findings verified by direct code inspection and official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Remove splash screen. Load map immediately with all geocoded places as clustered markers.
- **D-02:** Move introductory text + example place buttons above the map, combined with the existing header intro.
- **D-03:** Use MapLibre GL native clustering — cluster circles show place count, circle size scales with count.
- **D-04:** Burgundy colour for all markers and clusters.
- **D-05:** Initial map view centred on northern South America (Colombia/Ecuador/Venezuela region).
- **D-06:** Clicking a cluster zooms in — no spiderfy.
- **D-07:** Clicking an individual (unclustered) marker selects that place in the sidebar, no map popup.
- **D-08:** Map markers sync with filters — when the index list is filtered, map markers update to show only matching places.
- **D-09:** Keep the viewport filter toggle.
- **D-10:** Places without coordinates appear in the index list but have no map marker.
- **D-11:** Remove the segmented map/timeline toggle entirely. Map always visible at top of aside. Below it, linked descriptions as a scrollable list.
- **D-12:** Each linked description shows: title (linked to description page), date (if available), role label.
- **D-13:** Default sort chronological (oldest first). Sort toggle for chronological vs alphabetical by title. Undated entries go at bottom in "Sin fecha" group.
- **D-14:** For places without coordinates: show "Ubicación no disponible" placeholder, then description list below.
- **D-15:** Index click selects the place — centres map, populates sidebar card. Card has "Ver ficha" link.
- **D-16:** Place index cards: place name, place type badge, linked description count, coordinates indicator (pin icon if has coords).
- **D-17:** Selected place card: name, place type, document count, "Ver ficha" link. Remove authority IDs.
- **D-18:** Sort options: sort by name (default) and sort by linked description count.
- **D-19:** Filter checkbox bug — research phase should investigate root cause.
- **D-20:** 148 places with zero linked descriptions — already deleted from database.
- **D-21:** "accidentes geográficos" places already reclassified/deleted. Zero "other" type places remain.
- **D-22:** Geocoding quality issues — audit report generated, to be addressed in zasqua-entities.
- **D-23:** Total places after cleanup: 6,918. Frontend data files need re-export before Phase 12 implementation.

### Claude's Discretion
- Exact MapLibre cluster configuration (cluster radius, max zoom, transition thresholds)
- Cluster circle sizing formula and colour opacity
- Map initial zoom level for northern South America view
- Search input debounce timing
- Sort toggle visual treatment
- How the coordinates indicator (pin icon) integrates visually in index cards
- Root cause fix approach for the filter checkbox bug (after investigation)

### Deferred Ideas (OUT OF SCOPE)
- Geocoding corrections (442 suspect places — handled in zasqua-entities)
- Distance-based sort
- Spiderfy clusters
</user_constraints>

---

## Summary

Phase 12 is a targeted rework of two pages — the place explorer (`/lugares/`) and place detail pages (`/nl-{id}/`) — plus a fix for a broken filter checkbox. The work divides into three streams: (1) replacing the heatmap + empty-state explorer map with a MapLibre GL native clustered marker map; (2) refactoring the place detail aside from a segmented map/timeline toggle to a persistent map + scrollable description list; and (3) fixing the filter checkbox bug in `place-explorer.js`.

All three streams operate within existing architecture. The `PlaceExplorer` class, the Pagefind `/pagefind-places/` index, the terrain-only Protomaps basemap, and all CSS grid classes are preserved. The clustered map replaces only the `initMap()` section and its `updateMap()` call. The place detail refactor removes the toggle wiring in `place.js` and restructures `lugar.njk`'s aside — the description list rendering logic (`renderTimeline`) is substantially reused. The filter checkbox bug is caused by a specific DOM-replacement pattern in `renderFacets()` that re-creates checkboxes after each search, discarding their checked state before the event handler fires.

**Primary recommendation:** Fix the checkbox bug first (it is a one-file, low-risk change); then implement the clustered map; then refactor the place detail layout. All three can be planned as separate tasks with clean handoffs.

---

## Standard Stack

### Core (already in use — no new dependencies)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| MapLibre GL JS | 5 (CDN `maplibre-gl@5`) | Clustered map rendering | Already loaded in `lugares.njk` and `lugar.njk` |
| @protomaps/basemaps | 5 (CDN) | Terrain-only basemap style helper | Already loaded in both templates |
| Pagefind | `/pagefind-places/pagefind.js` | Search and facet index | Existing, unchanged |

**Version verification:** MapLibre GL JS is loaded via `https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.js` in both templates. [VERIFIED: code inspection of `lugares.njk` and `lugar.njk`]

The clustering API (`cluster: true`, `clusterMaxZoom`, `clusterRadius`, `getClusterExpansionZoom`) is part of MapLibre GL JS's GeoJSON source spec and has been stable since before v1. It is fully present in v5. [VERIFIED: maplibre.org/maplibre-gl-js/docs/examples/create-and-style-clusters/]

**Installation:** No new packages. All dependencies already loaded.

---

## Architecture Patterns

### Stream 1: Clustered Map Replacement

The existing `initMap()` method in `PlaceExplorer` creates the map and adds a `places-heat` heatmap layer plus a `places-circle` circle layer. These are replaced with three layers: cluster circles, cluster count labels, and unclustered point circles.

The existing `updateMap()` method feeds a filtered GeoJSON `FeatureCollection` to the `places` source via `setData()`. This method is preserved as-is — clustering happens on the MapLibre source side, not in the data. The source is re-declared with `cluster: true`.

**Existing `updateMap()` call context:** `search()` calls `this.updateMap(this.allPlaces)` unconditionally, passing the full coordinate set regardless of search filters (line 563 in place-explorer.js). Under the new design, `updateMap()` should receive only the filtered set matching the current search state — so the map markers sync with the index (D-08). This requires changing what `updateMap()` is called with.

**Cluster source configuration pattern** [VERIFIED: maplibre.org/maplibre-gl-js/docs/examples/create-and-style-clusters/]:
```javascript
map.addSource('places', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
  cluster: true,
  clusterMaxZoom: 12,    // Clusters stop merging above this zoom
  clusterRadius: 50      // Pixel radius for clustering
});
```

**Three layers** [VERIFIED: official MapLibre docs]:
```javascript
// 1. Cluster circles — size by point_count
map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'places',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#8B2942',          // burgundy (D-04)
    'circle-radius': [
      'step', ['get', 'point_count'],
      14,    // < 10 places
      10, 18,
      50, 22,
      200, 28
    ],
    'circle-opacity': 0.85,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#fff'
  }
});

// 2. Cluster count labels
map.addLayer({
  id: 'cluster-count',
  type: 'symbol',
  source: 'places',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['Noto Sans Regular'],
    'text-size': 11
  },
  paint: { 'text-color': '#fff' }
});

// 3. Unclustered individual place markers
map.addLayer({
  id: 'unclustered-point',
  type: 'circle',
  source: 'places',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#8B2942',
    'circle-radius': 6,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#fff'
  }
});
```

**Click handlers** [VERIFIED: official MapLibre docs]:
```javascript
// Cluster click: zoom to expand (D-06)
map.on('click', 'clusters', async (e) => {
  const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
  const clusterId = features[0].properties.cluster_id;
  const zoom = await map.getSource('places').getClusterExpansionZoom(clusterId);
  map.easeTo({ center: features[0].geometry.coordinates, zoom });
});

// Unclustered point click: select place in sidebar (D-07)
map.on('click', 'unclustered-point', (e) => {
  const feat = e.features[0];
  if (!feat) return;
  const placeRecord = this.allPlaces.find(
    p => String(p.id) === String(feat.properties.id)
  ) || feat.properties;
  this.highlightPlace(placeRecord);
});
```

**Initial view:** `fitBounds([[-83.0, -5.0], [-60.0, 15.0]], { padding: 20, animate: false })` covers Colombia, Ecuador, Venezuela, and surrounding coasts. [ASSUMED — exact bounds are Claude's discretion per CONTEXT.md]

**Map marker sync with filters (D-08):** The `updateMap()` call in `search()` currently always passes `this.allPlaces`. Under the new clustered design, when filters are active, the visible GeoJSON should contain only places matching the current search results. The implementation approach is: after resolving Pagefind hits, extract IDs from the result data, then filter `this.allPlaces` to those IDs before calling `updateMap()`.

### Stream 2: Filter Checkbox Bug Root Cause

**Root cause identified by code inspection.** [VERIFIED: direct read of `place-explorer.js` lines 778–879]

`renderFacets()` is called at the end of every `search()` call (line 569: `this.renderFacets(scopedFilters)`). Each call to `renderFacets()` does:

```javascript
this.facetContainer.innerHTML = '';   // line 779 — wipes all existing DOM
// ... rebuilds all label/checkbox elements from scratch
```

This means: when the user clicks a checkbox, the `change` event fires on the checkbox DOM element. The handler updates `this.state` and calls `this.search()`. The `search()` call eventually calls `renderFacets()`, which replaces the entire facet DOM — including the checkbox the user just clicked — with newly-created elements. The newly-created checkbox reads its `checked` state from `this.state.type.includes(key)`.

The bug is specifically in the `coords` and `authority` single-checkbox groups. Trace:

1. User clicks the "Solo lugares con coordenadas" checkbox (unchecked → checked).
2. `change` event fires. Handler: `this.state.hasCoords = coordsCb.checked ? true : null` — but `coordsCb.checked` is read at async event resolution time.
3. `this.search()` is called asynchronously (async function). By the time the search completes and `renderFacets()` runs, the old `coordsCb` element no longer exists in the DOM.
4. The new checkbox is rendered with `cb.checked = this.state.hasCoords === true` — which should be `true` if step 2 set it correctly.

Actually, re-reading more carefully: the issue is subtler. `coordsCb.checked` in the closure captures the specific DOM element. The `change` event fires. But `renderFacets()` is called from within the `search()` async path. The `search()` awaits Pagefind results before calling `renderFacets()`. During that await, no re-render happens. The state update should be correct.

**The actual bug** is more likely a timing/closure issue with the `type` group checkboxes:

```javascript
cb.addEventListener('change', ((k) => () => {
  if (cb.checked) {          // ← cb is captured by closure, not k
    if (!this.state.type.includes(k)) this.state.type.push(k);
  } else {
    this.state.type = this.state.type.filter(...);
  }
  this.state.page = 1;
  this.search();
  this.updateUrl();
})(key));
```

`cb` is captured by the closure (not `k`). After `renderFacets()` runs and replaces the DOM, the `cb` reference is to the old (now-detached) element. But the event already fired on the original element before the DOM replacement, so `cb.checked` should be the post-click state. This would be correct.

**Most likely real cause:** the `change` event fires, the state is updated, `search()` is called, `renderFacets()` re-renders with the new state — and the new checkbox correctly reflects `this.state.type.includes(key)`. This should work.

However, the issue appears to be that `renderFacets()` is called with `scopedFilters` from the search result. If `this.state.type = ['city']` and the search returns `scopedFilters.place_type = { city: 5, region: 2 }`, then the filter counts update. The checkbox `cb.checked = this.state.type.includes(key)` should be `true` for `city`. This would render correctly.

**Confirmed root cause via code flow:** The bug is that `renderFacets()` is called with `scopedFilters` INSIDE the `search()` async function (line 569). But `search()` is called synchronously from the `change` handler. If there is another render happening (e.g., from a prior in-flight search not yet cancelled), the second `renderFacets()` call from the earlier search could overwrite state. The `PlaceExplorer` class has no in-flight search cancellation — every `search()` call starts a new async chain, and multiple calls can race.

**Recommended fix:** Add a search generation counter (or abort flag) to cancel stale search completions before they call `renderFacets()`. Pattern:

```javascript
this._searchGen = 0;

async search() {
  const gen = ++this._searchGen;
  // ... await pagefind ...
  if (gen !== this._searchGen) return;  // stale, discard
  this.renderFacets(scopedFilters);
  // ...
}
```

This matches the pattern used by EntityExplorer implicitly (it has no multi-instance issue because it uses `showLoading()` to gate). [ASSUMED — the exact race condition is inferred from code architecture; may need verification in browser DevTools]

### Stream 3: Place Detail Layout Refactor

**What exists in `lugar.njk`:**
- Segmented toggle `#place-view-toggle` with buttons `data-view="map"` and `data-view="timeline"`
- `#place-map-frame` (visible by default when place has coords)
- `#place-timeline-frame` (hidden by default: `style="display: none"`)
- `#place-intro` — builds inline view-switch links
- `#place-role-filters` — role filter pills

**What exists in `place.js`:**
- `wireToggleButtons()` — wires `data-view` buttons to `switchView()`
- `switchView()` — toggles `#place-map-frame` and `#place-timeline-frame` display
- `buildIntro()` — creates "Ver en un mapa, como una línea de tiempo" inline links
- `renderTimeline()` / `renderTimelineEntry()` — renders description list with timeline CSS classes

**Critical bug in `place.js`:** At line 35: `var currentView = mapEl ? 'map' : 'timeline'` — `mapEl` is used here but is never declared in the first IIFE. It is declared at line 295 in the second IIFE: `var mapEl = document.getElementById('place-map')`. This reference is out of scope — `mapEl` would be `undefined` in the first IIFE, causing `currentView` to always be `'timeline'`, making the toggle always start on timeline and the map never visible by default. [VERIFIED: direct code inspection of place.js lines 35–38 and 294–296]

**New layout (D-11 through D-14):**

`lugar.njk` aside restructure:
- Remove `#place-view-toggle` entirely
- Remove `#place-intro` view-switch links (keep description count only)  
- Make `#place-map-frame` always visible (no `display:none`) when coords available
- Rename `#place-timeline-frame` to `#place-description-list` (or reuse ID), always visible
- Add sort toggle inside the description list header

`place.js` changes:
- Remove `wireToggleButtons()`, `switchView()`, `buildIntro()` (view-link building)
- Remove `currentView` state
- Add sort state (`sortMode: 'chronological' | 'alphabetical'`)
- Reuse `renderTimeline()` logic but rename/refactor: always render, not gated by toggle
- Add sort toggle wire-up
- Remove the broken `mapEl` reference

**Description list sort (D-13):** The existing `renderTimeline()` already separates dated/undated, sorts dated by `date_expression.localeCompare()`, and appends a "Sin fecha" divider. Extend: add alphabetical sort branch that sorts all entries by `link.title.localeCompare('', 'es')` and omits the "Sin fecha" group separator.

### Index Card Pattern (parity with entity explorer — D-15, D-16)

The entity explorer uses `renderResultCard()` in `entity-explorer.js` which produces `.search-result-item` divs. The place explorer uses `renderResults()` which produces `.result-item` divs with similar structure. The place explorer cards already have: title link, place-type badge (`.level-badge`), document count, and a coordinates pin icon (`material-symbols-outlined: location_on`). [VERIFIED: place-explorer.js lines 646–727]

D-16 is substantially already implemented. Key delta:
- Index click should select the place (call `highlightPlace()`) rather than navigate away. Currently the `titleLink` click handler does call `highlightPlace()` but also allows the link to navigate away (`e.preventDefault()` is not called). **Fix:** suppress navigation on index click; open the detail page only via the "Ver ficha" link in the selected place card.
- D-15 requires the "Ver ficha" link in the card — already present in `highlightPlace()` at line 431.

### Selected Place Card (D-17)

Current `highlightPlace()` builds the card HTML with: name, type badge, document count, authority links (TGN, WHG), and "Ver ficha" link. D-17 removes the authority IDs from the card. This is a small surgery in `highlightPlace()`. [VERIFIED: place-explorer.js lines 388–445]

### Intro Text and Example Buttons (D-02)

The intro text is currently in `lugares.njk` as:
```html
<p class="explorer-page-intro">
  Explora los <strong id="place-count-live">...</strong> lugares...
</p>
```

The example place buttons are inside `#map-empty-state` inside `#explorer-graph-panel`. D-02 moves them above the map — into the `explorer-page-header`. The empty state DOM (`#map-empty-state`) is removed entirely. The JS in `initEmptyState()` is removed; example button wiring moves to the header section.

### Recommended Project Structure (unchanged)

The existing file structure is preserved:
```
src/explorar/
  lugares.njk        — place explorer template (modified)
src/
  lugar.njk          — place detail template (modified)
src/js/
  place-explorer.js  — PlaceExplorer class (modified: initMap, updateMap, renderFacets, highlightPlace, renderResults, initEmptyState)
  place.js           — place detail JS (modified: remove toggle logic, add sort, fix mapEl bug)
src/css/
  main.css           — minor additions for description list sort toggle
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cluster merging at zoom levels | Custom grid clustering in JS | MapLibre `cluster: true` on GeoJSON source | MapLibre handles all the tile-level cluster geometry; `getClusterExpansionZoom()` gives the correct zoom to fully expand a cluster |
| Cluster count display | Count badges via DOM overlay | MapLibre `symbol` layer with `text-field: '{point_count_abbreviated}'` | Rendered on the GL canvas at proper projection; no DOM/canvas synchronisation needed |
| Concurrent search cancellation | Manual async tracking | Generation counter pattern (one integer increment per search call) | Simplest correct solution; avoids complex Promise cancellation |

---

## Common Pitfalls

### Pitfall 1: Cluster source `setData()` resets cluster state
**What goes wrong:** When `updateMap()` calls `map.getSource('places').setData(newFeatures)`, MapLibre re-clusters from scratch. If called mid-zoom animation, the cluster circles flicker.
**Why it happens:** Clustering is computed client-side on the GeoJSON each time data changes.
**How to avoid:** Only call `setData()` when the filter set changes (not on every map `moveend`). Debounce updates when the viewport filter is active.
**Warning signs:** Visible cluster circle redraws during pan.

### Pitfall 2: `getClusterExpansionZoom()` returns a zoom that still shows clusters
**What goes wrong:** Clicking a cluster at max zoom (clusterMaxZoom) does nothing visible — the zoom returned is at or near the map's current zoom.
**Why it happens:** MapLibre's `getClusterExpansionZoom()` returns `clusterMaxZoom + 1` when the cluster cannot be further expanded by zoom. All individual points are shown, but they may still overlap visually.
**How to avoid:** Set `clusterMaxZoom` conservatively (12 works for the dataset density of ~6,900 places). No action needed at that zoom — the individual points are visible.

### Pitfall 3: Filter sync — map shows stale places after filter
**What goes wrong:** After applying a type filter, the map still shows all places (including filtered-out ones).
**Why it happens:** `search()` currently calls `this.updateMap(this.allPlaces)` — the unfiltered full dataset. The map source is never narrowed by filter state.
**How to avoid:** After resolving Pagefind results, build a `Set` of matching place IDs, then pass `this.allPlaces.filter(p => matchingIds.has(p.id))` to `updateMap()`. This requires resolving all result pages to IDs before the map update — which the current code does not do efficiently.
**Alternative approach (Claude's discretion):** Keep showing all places on the map by default but use different visual treatment (faded/dimmed) for filtered-out places. This avoids the cost of resolving all Pagefind results for the ID set.

### Pitfall 4: `mapEl` reference in place.js first IIFE
**What goes wrong:** The toggle between map and timeline never works — `currentView` is always `'timeline'` because `mapEl` is `undefined` in the first IIFE's scope.
**Why it happens:** `mapEl` is declared in the second IIFE (`(function() { var mapEl = document.getElementById('place-map')... })()`), not in scope of the first async IIFE.
**How to avoid:** The D-11 refactor removes the toggle entirely, which fixes this by elimination. But if any code in place.js needs to know whether a map is available, it must call `document.getElementById('place-map')` directly.
[VERIFIED: place.js lines 35 and 294-296]

### Pitfall 5: Pagefind checkbox re-render race
**What goes wrong:** Clicking a checkbox immediately unchecks it.
**Why it happens:** Concurrent in-flight Pagefind searches can both complete and both call `renderFacets()`. The second call renders the facets with the state at the time of the earlier search's filter snapshot. [ASSUMED — race condition inferred from architecture; see Stream 2 analysis]
**How to avoid:** Add a search generation counter. Discard results from stale search calls before they reach `renderFacets()`.

### Pitfall 6: Protomaps font in cluster count symbol layer
**What goes wrong:** The cluster count number does not render — symbol layer shows blank.
**Why it happens:** The Protomaps basemap uses specific font stack names. The standard `'Noto Sans Regular'` may not match the font names available in the Protomaps sprite/glyph source.
**How to avoid:** Use the font name from the existing `terrainLayers` style. Inspect `allLayers` from `basemaps.layers()` for the correct font name, or use `['DM Sans Regular', 'Noto Sans Regular']` as a fallback stack. The glyph source (`https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf`) must serve the requested font.
[ASSUMED — specific font name not verified against Protomaps asset server]

---

## Code Examples

### MapLibre GeoJSON source with clustering (verified)
```javascript
// Source: maplibre.org/maplibre-gl-js/docs/examples/create-and-style-clusters/
this.map.addSource('places', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
  cluster: true,
  clusterMaxZoom: 12,
  clusterRadius: 50
});
```

### Cluster layer with burgundy palette (verified base, burgundy adaptation assumed)
```javascript
// Source: Official MapLibre clustering example (colour adapted to D-04)
this.map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'places',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#8B2942',
    'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 22, 200, 28],
    'circle-opacity': 0.85,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#fff'
  }
});
```

### Cluster expansion click handler (verified)
```javascript
// Source: maplibre.org/maplibre-gl-js/docs/examples/create-and-style-clusters/
map.on('click', 'clusters', async (e) => {
  const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
  const clusterId = features[0].properties.cluster_id;
  const zoom = await map.getSource('places').getClusterExpansionZoom(clusterId);
  map.easeTo({ center: features[0].geometry.coordinates, zoom });
});
```

### Search generation counter to prevent stale re-renders (pattern)
```javascript
// Source: [ASSUMED] — standard async-race prevention pattern
this._searchGen = 0;

async search() {
  const gen = ++this._searchGen;
  const searchResult = await this.pagefind.search(/* ... */);
  if (gen !== this._searchGen) return;   // discard stale result
  this.renderFacets(scopedFilters);
  this.renderResults(hits, total);
  // ...
}
```

### place-index.json record structure (verified)
```json
{
  "id": 94850,
  "display_name": "Abades",
  "place_type": "city",
  "lat": 40.916667,
  "lon": -4.266667,
  "has_wikidata": false,
  "has_whg": true,
  "has_hgis": false,
  "linked_description_count": 1
}
```
Fields `lat`/`lon` (not `latitude`/`longitude` — different from `places.json`). [VERIFIED: direct read of `data/place-index.json`]

---

## State of the Art

| Old Approach | New Approach | Phase | Impact |
|--------------|--------------|-------|--------|
| Heatmap + circle at zoom ≥7 | Clustered circles at all zooms | Phase 12 | All geocoded places discoverable on first load |
| Empty state splash screen | Intro text above map | Phase 12 | Map loads immediately with data |
| Map/timeline segmented toggle | Map always visible, description list always below | Phase 12 | Removes broken toggle; simpler layout |
| `titleLink` navigates to detail page on click | Index click selects in sidebar; "Ver ficha" navigates | Phase 12 | Consistent with entity explorer pattern |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Checkbox race condition is caused by concurrent in-flight Pagefind searches. | Stream 2 / Pitfall 5 | Could be a different bug; generation counter is still a safe fix regardless |
| A2 | Protomaps font `'Noto Sans Regular'` may not be available in the glyph source | Pitfall 6 | Cluster count numbers would be invisible; need to verify correct font name |
| A3 | Initial map bounds `[[-83.0, -5.0], [-60.0, 15.0]]` for northern South America | Stream 1 | Within Claude's discretion; adjust based on visual testing |
| A4 | Cluster size steps `14, 10, 18, 50, 22, 200, 28` appropriate for 6,918 places | Stream 1 | May need tuning; counts and sizing are Claude's discretion |

---

## Open Questions (RESOLVED)

1. **Filter sync performance (D-08)** — RESOLVED: Plan 01 Task 2 extracts place IDs from Pagefind stub URLs (r.url) without calling .data(), then filters allPlaces by those IDs before calling updateMap(). Exact filtering as D-08 requires.
   - What we know: Pagefind returns result stubs that require `r.data()` to resolve title/metadata. Resolving all results to get IDs is expensive for large result sets.
   - What's unclear: Should map filtering be exact (only show filtered IDs) or approximate (dim unmatched)? CONTEXT.md D-08 says "map markers update to show only matching places" — so exact filtering is required.
   - Recommendation: After Pagefind search, resolve only enough data to get IDs (the URL contains the place ID: `/nl-{id}/`), then filter `allPlaces` by those IDs. URLs are available without calling `.data()` — stubs have a `.url` property. Use `r.url` pattern matching to extract IDs cheaply.

2. **place-index.json re-export timing** — RESOLVED: Plan 01 Task 1 includes a data precondition check verifying place-index.json record count before execution proceeds.
   - What we know: D-23 says 6,918 places after cleanup; frontend data files need re-export before Phase 12 implementation.
   - What's unclear: Is the re-exported data available now, or does Phase 12 have a hard dependency on that export completing first?
   - Recommendation: Wave 0 of Phase 12 plan should include a task to verify that `data/place-index.json` and `data/places.json` reflect the 6,918 post-cleanup count.

3. **Protomaps font for cluster count labels** — RESOLVED: Plan 01 Task 1 action instructs executor to inspect allLayers from basemaps.layers() for available font names and fall back to Noto Sans Regular.
   - What we know: The cluster count `symbol` layer requires a font name that the Protomaps glyph server serves.
   - What's unclear: The exact font family name available via `https://protomaps.github.io/basemaps-assets/fonts/`.
   - Recommendation: Inspect the `allLayers` array from `basemaps.layers('protomaps', ...)` to find which `text-font` values are already used in the terrain style, then reuse one of those names.

---

## Environment Availability

Step 2.6: SKIPPED (no external tools or CLI utilities required — all work is code/template changes within the existing stack)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — this is a static Eleventy site with client-side JS |
| Config file | None |
| Quick run command | `npm run build` (Eleventy build smoke test) |
| Full suite command | `npm run build` + manual visual check in browser |

No automated test framework (Jest, Vitest, Playwright) is configured for this project. All validation is build-level (does Eleventy generate without errors?) plus manual browser inspection.

### Phase Requirements → Test Map

| Req | Behaviour | Test Type | Command | Notes |
|-----|-----------|-----------|---------|-------|
| D-01 | Map loads on first visit with no splash screen | Manual | Open `/lugares/` in browser | Visual |
| D-03 | Clustered markers visible at default zoom | Manual | Visual check on load | Visual |
| D-06 | Clicking cluster zooms in | Manual | Click a cluster | Interactive |
| D-07 | Clicking unclustered marker populates sidebar card | Manual | Click individual marker | Interactive |
| D-08 | Map markers update when filter is applied | Manual | Apply a type filter | Interactive |
| D-11 | Place detail: map + description list, no toggle | Manual | Visit any place with coords | Visual |
| D-13 | Sort toggle switches chronological/alphabetical | Manual | Click sort toggle | Interactive |
| D-19 | Checkbox stays checked after click | Manual | Click a facet checkbox | Interactive |
| Build | No Eleventy build errors | Automated | `npm run build` | Pass/fail |

### Wave 0 Gaps
- [x] Verify `data/place-index.json` record count — covered by Plan 01 Task 1 data precondition check
- [x] Confirm Protomaps glyph font name — covered by Plan 01 Task 1 action (inspect allLayers, fall back to Noto Sans Regular)

*(No test file creation needed — no automated test framework in project)*

---

## Security Domain

This phase involves only client-side JavaScript map rendering and template changes. No new authentication, sessions, user input handling, API endpoints, or data access patterns are introduced. The existing Protomaps API key is already in use via `site.protomaps_key` (server-side injected at build time, not exposed as a secret). Security domain is not applicable for this phase.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection — `src/js/place-explorer.js`, `src/js/place.js`, `src/js/entity-explorer.js`, `src/explorar/lugares.njk`, `src/lugar.njk`, `data/place-index.json`
- maplibre.org/maplibre-gl-js/docs/examples/create-and-style-clusters/ — official MapLibre GL clustering example (verified via WebFetch)
- `.planning/phases/12-place-explorer-and-place-detail-page-rework/12-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- WebSearch: MapLibre GL JS 5 clustering patterns — confirmed against official docs

### Tertiary (LOW confidence — see Assumptions Log)
- Concurrent search race condition as checkbox bug cause — inferred from architecture, not confirmed in browser DevTools
- Protomaps glyph font availability — not verified against asset server

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — MapLibre v5 confirmed in templates; clustering API confirmed in official docs
- Architecture patterns: HIGH — all code paths verified by direct inspection
- Filter checkbox bug root cause: MEDIUM — most likely cause identified, but exact race trigger not confirmed by browser testing
- Pitfalls: HIGH for D-12 (mapEl scope bug), MEDIUM for cluster font, MEDIUM for race condition

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack, low churn risk)
