/**
 * Place Explorer
 *
 * In-memory search and faceted filtering over place-index.json, with a
 * MapLibre heatmap/circle map, paginated results list, sidebar facets,
 * filter pills, URL state sync, sort toggle, and "Filter by map area" toggle.
 *
 * Satisfies PEXP-01 (search), PEXP-02 (facet filtering), PEXP-03 (heatmap
 * map), and PEXP-04 (paginated results list).
 */

class PlaceExplorer {
  constructor(container) {
    this.container = container;
    this.allPlaces = [];
    this.filtered = [];
    this.map = null;
    this.mapReady = false;
    this.perPage = 50;
    this._debounce = null;

    this.placeTypes = {};
    try {
      this.placeTypes = JSON.parse(container.dataset.placeTypes || '{}');
    } catch (e) {
      console.warn('PlaceExplorer: could not parse data-place-types');
    }

    this.state = {
      q: '',
      type: [],
      hasCoords: null,
      hasAuthority: null,
      sort: 'name',
      page: 1,
      mapBound: false
    };

    this.facetGroupState = { type: true, coords: true, authority: true };

    this.init();
  }

  async init() {
    this.parseUrlParams();
    this.showLoadingOverlay();

    try {
      await this.loadData();
    } catch (e) {
      this.hideLoadingOverlay();
      this.showError();
      return;
    }

    this.hideLoadingOverlay();
    this.buildDOM();
    this.initMap();

    window.addEventListener('popstate', () => {
      this.parseUrlParams();
      this.syncFormToState();
      this.render();
    });
  }

  async loadData() {
    const response = await fetch('/data/place-index.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.allPlaces = await response.json();
  }

  showLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'search-loading search-loading-overlay';
    overlay.id = 'place-explorer-loading';
    overlay.innerHTML = '<p>Cargando lugares\u2026</p>';
    this.container.appendChild(overlay);
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('place-explorer-loading');
    if (overlay) overlay.remove();
  }

  showError() {
    this.container.innerHTML =
      '<div class="search-no-results">' +
      '<p style="font-size:1.1rem;font-weight:500;color:var(--color-stone-600)">No se pudo cargar el \u00edndice de lugares.</p>' +
      '<p style="color:var(--color-stone-400)">Comprueba tu conexi\u00f3n e intenta recargar la p\u00e1gina.</p>' +
      '</div>';
  }

  // ─── DOM construction ───────────────────────────────────────────────────────

  buildDOM() {
    this.container.innerHTML = '';

    // Search input (full width, above layout)
    const searchHeader = document.createElement('div');
    searchHeader.style.cssText = 'margin-bottom:1rem';

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'search';
    this.searchInput.placeholder = 'Buscar por nombre de lugar\u2026';
    this.searchInput.value = this.state.q;
    this.searchInput.style.cssText = 'width:100%;padding:0.75rem 1.25rem;font-size:1rem;border:1px solid var(--color-stone-300);border-radius:50px;outline:none;font-family:var(--font-sans);box-sizing:border-box';
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this._debounce);
      this._debounce = setTimeout(() => {
        this.state.q = this.searchInput.value;
        this.state.page = 1;
        this.render();
        this.updateUrl();
      }, 250);
    });
    searchHeader.appendChild(this.searchInput);
    this.container.appendChild(searchHeader);

    // Active filter pills
    this.pillsEl = document.createElement('div');
    this.pillsEl.className = 'active-filters';
    this.pillsEl.style.marginBottom = '0.75rem';
    this.container.appendChild(this.pillsEl);

    // Main layout: sidebar + content
    const layout = document.createElement('div');
    layout.className = 'search-layout';

    // Sidebar
    this.sidebar = document.createElement('aside');
    this.sidebar.className = 'search-sidebar';

    const sidebarHeading = document.createElement('h2');
    sidebarHeading.className = 'search-sidebar-heading';
    sidebarHeading.textContent = 'Filtrar por:';
    this.sidebar.appendChild(sidebarHeading);

    this.facetContainer = document.createElement('div');
    this.facetContainer.className = 'facet-container';
    this.sidebar.appendChild(this.facetContainer);

    // Content column: map + results
    const content = document.createElement('div');
    content.className = 'search-results';

    // Map area toggle
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:0.5rem';
    this.mapAreaToggle = document.createElement('button');
    this.mapAreaToggle.type = 'button';
    this.mapAreaToggle.className = 'map-area-toggle';
    this.mapAreaToggle.textContent = 'Filtrar por \u00e1rea del mapa';
    this.mapAreaToggle.addEventListener('click', () => this.toggleMapBound());
    toggleRow.appendChild(this.mapAreaToggle);
    content.appendChild(toggleRow);

    // Map container
    const mapEl = document.createElement('div');
    mapEl.id = 'explorer-map';
    mapEl.className = 'explorer-map';
    content.appendChild(mapEl);

    // Results info bar
    this.resultsInfoEl = document.createElement('div');
    this.resultsInfoEl.className = 'search-results-info';
    this.resultsInfoEl.style.marginTop = '1rem';
    content.appendChild(this.resultsInfoEl);

    // Results list
    this.resultsListEl = document.createElement('div');
    this.resultsListEl.className = 'results-list';
    content.appendChild(this.resultsListEl);

    // Pagination
    this.paginationEl = document.createElement('div');
    this.paginationEl.className = 'search-pagination';
    content.appendChild(this.paginationEl);

    layout.appendChild(this.sidebar);
    layout.appendChild(content);
    this.container.appendChild(layout);

    // Mobile filter toggle
    const mobileToggle = document.createElement('button');
    mobileToggle.type = 'button';
    mobileToggle.className = 'mobile-filter-toggle';
    mobileToggle.textContent = 'Filtros';
    mobileToggle.addEventListener('click', () => {
      this.sidebar.classList.toggle('sidebar-open');
    });
    this.container.appendChild(mobileToggle);
  }

  // ─── Map init ───────────────────────────────────────────────────────────────

  initMap() {
    if (typeof maplibregl === 'undefined') return;

    this.map = new maplibregl.Map({
      container: 'explorer-map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-74.0, 5.5],
      zoom: 5
    });

    this.map.fitBounds([[-79.0, -4.2], [-66.9, 13.4]], { padding: 20, animate: false });

    this.map.on('load', () => {
      this.mapReady = true;

      // Empty GeoJSON source
      this.map.addSource('places', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Heatmap layer
      this.map.addLayer({
        id: 'places-heat',
        type: 'heatmap',
        source: 'places',
        maxzoom: 10,
        paint: {
          'heatmap-weight': [
            'interpolate', ['linear'],
            ['get', 'linked_description_count'],
            0, 0.3,
            10, 0.6,
            100, 1
          ],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 5, 1.2, 9, 2.5],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.05, 'rgba(219,201,210,0.4)',
            0.15, 'rgba(190,140,160,0.55)',
            0.3, 'rgba(168,90,120,0.7)',
            0.5, 'rgba(139,41,66,0.8)',
            0.7, 'rgba(110,25,50,0.9)',
            0.9, 'rgba(74,21,34,0.95)',
            1, '#2D0A14'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 15, 5, 25, 8, 40, 10, 50],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 10, 0]
        }
      });

      // Circle layer
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

      // Click on circle: show popup
      this.map.on('click', 'places-circle', (e) => {
        const feat = e.features[0];
        if (!feat) return;
        const props = feat.properties;
        const safeName = this.escapeHtml(props.display_name);
        const typeLabel = this.escapeHtml(this.placeTypes[props.place_type] || props.place_type);
        const n = props.linked_description_count || 0;
        const docText = `${n} ${n === 1 ? 'documento' : 'documentos'}`;
        const slug = props.display_name.replace(/[?#]/g, '');
        const placeId = props.id;

        const popup = new maplibregl.Popup({ maxWidth: '240px' })
          .setLngLat(feat.geometry.coordinates)
          .setHTML(
            `<strong style="font-size:0.95rem">${safeName}</strong><br>` +
            `<span style="font-size:0.8rem;color:#57534e">${typeLabel} · ${docText}</span><br>` +
            `<span style="font-size:0.8rem;display:inline-flex;gap:0.75rem;margin-top:0.25rem">` +
            `<a href="#place-${placeId}" class="popup-scroll-link" data-place-id="${placeId}" style="color:var(--color-burgundy-deep);cursor:pointer">Ver en la lista</a>` +
            `<a href="/lugar/${slug}/" style="color:var(--color-burgundy-deep)">Ver ficha</a>` +
            `</span>`
          )
          .addTo(this.map);

        // Handle "Ver en la lista" click — scroll to result or navigate to correct page
        popup.getElement().querySelector('.popup-scroll-link').addEventListener('click', (ev) => {
          ev.preventDefault();
          const el = document.getElementById(`place-${placeId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.background = 'var(--color-stone-100)';
            setTimeout(() => { el.style.background = ''; }, 2000);
          } else {
            // Place is on a different page — find which page and navigate
            const idx = this.filtered.findIndex(p => p.id === placeId);
            if (idx >= 0) {
              this.state.page = Math.floor(idx / this.perPage) + 1;
              this.render();
              this.updateUrl();
              requestAnimationFrame(() => {
                const target = document.getElementById(`place-${placeId}`);
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  target.style.background = 'var(--color-stone-100)';
                  setTimeout(() => { target.style.background = ''; }, 2000);
                }
              });
            }
          }
        });
      });

      // Click on heatmap: zoom in
      this.map.on('click', 'places-heat', (e) => {
        this.map.easeTo({ center: e.lngLat, zoom: this.map.getZoom() + 2 });
      });

      // Cursor on circle
      this.map.on('mouseenter', 'places-circle', () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', 'places-circle', () => {
        this.map.getCanvas().style.cursor = '';
      });

      // Initial render after map is ready
      this.render();
    });
  }

  // ─── URL state ──────────────────────────────────────────────────────────────

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    this.state.q = params.get('q') || '';
    this.state.type = params.getAll('type');
    this.state.hasCoords = params.has('coords') ? params.get('coords') === '1' : null;
    this.state.hasAuthority = params.has('authority') ? params.get('authority') === '1' : null;
    this.state.sort = params.get('sort') || 'name';
    this.state.page = parseInt(params.get('page') || '1', 10);
    this.state.mapBound = params.get('map_bound') === '1';
  }

  updateUrl() {
    const params = new URLSearchParams();
    if (this.state.q) params.set('q', this.state.q);
    for (const t of this.state.type) params.append('type', t);
    if (this.state.hasCoords !== null) params.set('coords', this.state.hasCoords ? '1' : '0');
    if (this.state.hasAuthority !== null) params.set('authority', this.state.hasAuthority ? '1' : '0');
    if (this.state.sort !== 'name') params.set('sort', this.state.sort);
    if (this.state.page > 1) params.set('page', String(this.state.page));
    if (this.state.mapBound) params.set('map_bound', '1');
    const qs = params.toString();
    const url = qs ? `/explorar/lugares/?${qs}` : '/explorar/lugares/';
    history.pushState(null, '', url);
  }

  // Sync form controls to restored state (after popstate)
  syncFormToState() {
    if (this.searchInput) this.searchInput.value = this.state.q;
    if (this.mapAreaToggle) {
      if (this.state.mapBound) {
        this.mapAreaToggle.classList.add('active');
        this.mapAreaToggle.textContent = 'Filtrando por \u00e1rea del mapa';
      } else {
        this.mapAreaToggle.classList.remove('active');
        this.mapAreaToggle.textContent = 'Filtrar por \u00e1rea del mapa';
      }
    }
  }

  // ─── Filtering ──────────────────────────────────────────────────────────────

  applyFilters() {
    let result = this.allPlaces;
    const q = this.state.q.trim().toLowerCase();
    if (q) result = result.filter(p => p.display_name.toLowerCase().includes(q));
    if (this.state.type.length > 0) result = result.filter(p => this.state.type.includes(p.place_type));
    if (this.state.hasCoords === true) result = result.filter(p => p.lat != null && p.lon != null);
    if (this.state.hasAuthority === true) result = result.filter(p => p.has_wikidata || p.has_whg || p.has_hgis);
    return result;
  }

  filterByViewport(places) {
    if (!this.state.mapBound || !this.map || !this.mapReady) return places;
    const bounds = this.map.getBounds();
    return places.filter(p => {
      if (p.lat == null || p.lon == null) return false;
      return p.lon >= bounds.getWest() && p.lon <= bounds.getEast() &&
             p.lat >= bounds.getSouth() && p.lat <= bounds.getNorth();
    });
  }

  sortResults(results) {
    const sorted = results.slice();
    const q = this.state.q.trim().toLowerCase();
    if (this.state.sort === 'linked') {
      sorted.sort((a, b) => {
        const diff = b.linked_description_count - a.linked_description_count;
        if (diff !== 0) return diff;
        return a.display_name.localeCompare(b.display_name, 'es');
      });
    } else if (q) {
      // When searching: exact match first, then prefix, then contains
      sorted.sort((a, b) => {
        const aLower = a.display_name.toLowerCase();
        const bLower = b.display_name.toLowerCase();
        const aExact = aLower === q;
        const bExact = bLower === q;
        if (aExact !== bExact) return aExact ? -1 : 1;
        const aPrefix = aLower.startsWith(q);
        const bPrefix = bLower.startsWith(q);
        if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
        return aLower.localeCompare(bLower, 'es');
      });
    } else {
      sorted.sort((a, b) => a.display_name.localeCompare(b.display_name, 'es'));
    }
    return sorted;
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  render() {
    // If DOM isn't built yet (initMap fires render on load), skip silently
    if (!this.resultsListEl) return;

    const afterFilter = this.applyFilters();
    this.filtered = this.filterByViewport(afterFilter);
    const sorted = this.sortResults(this.filtered);

    const total = sorted.length;
    const totalPages = Math.ceil(total / this.perPage) || 1;
    // Clamp page
    if (this.state.page > totalPages) this.state.page = 1;

    const start = (this.state.page - 1) * this.perPage;
    const page = sorted.slice(start, start + this.perPage);

    this.renderResultsInfo(total);
    this.renderResults(page, total);
    this.renderPagination(total);
    this.renderFacets();
    this.renderPills();
    this.updateMap(afterFilter); // map shows pre-viewport-filter results
  }

  // ─── Results info bar ───────────────────────────────────────────────────────

  renderResultsInfo(total) {
    this.resultsInfoEl.innerHTML = '';

    const countSpan = document.createElement('span');
    countSpan.className = 'results-count';

    const hasFilters = this.state.q || this.state.type.length > 0 ||
      this.state.hasCoords !== null || this.state.hasAuthority !== null || this.state.mapBound;

    if (!hasFilters) {
      countSpan.textContent = `${this.allPlaces.length.toLocaleString('es-CO')} lugares`;
    } else if (total === 1) {
      countSpan.textContent = '1 lugar encontrado';
    } else {
      countSpan.textContent = `${total.toLocaleString('es-CO')} lugares encontrados`;
    }
    this.resultsInfoEl.appendChild(countSpan);

    // Sort controls
    const sortControls = document.createElement('div');
    sortControls.className = 'sort-controls';

    const sortOptions = [
      { value: 'name', label: 'Nombre' },
      { value: 'linked', label: 'Documentos' }
    ];

    for (const opt of sortOptions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sort-btn';
      btn.dataset.sort = opt.value;
      btn.textContent = opt.label;
      if (this.state.sort === opt.value) btn.classList.add('active');
      btn.addEventListener('click', () => {
        if (this.state.sort === opt.value) return;
        this.state.sort = opt.value;
        this.state.page = 1;
        this.render();
        this.updateUrl();
      });
      sortControls.appendChild(btn);
    }
    this.resultsInfoEl.appendChild(sortControls);
  }

  // ─── Results list ───────────────────────────────────────────────────────────

  renderResults(page, total) {
    this.resultsListEl.innerHTML = '';

    if (total === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-no-results';
      empty.innerHTML =
        '<p style="font-size:1.1rem;font-weight:500;color:var(--color-stone-600)">Sin resultados</p>' +
        '<p style="color:var(--color-stone-400)">No se encontraron lugares con estos criterios.</p>';
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-filters-btn';
      clearBtn.style.marginTop = '0.75rem';
      clearBtn.textContent = 'Borrar todos los filtros';
      clearBtn.addEventListener('click', () => this.clearFilters());
      empty.appendChild(clearBtn);
      this.resultsListEl.appendChild(empty);
      return;
    }

    for (const p of page) {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.id = `place-${p.id}`;

      // Row 1: name + inline meta
      const row1 = document.createElement('div');
      row1.style.cssText = 'display:flex;align-items:baseline;gap:0.5rem;flex-wrap:wrap';

      const titleLink = document.createElement('a');
      titleLink.href = `/lugar/${p.display_name.replace(/[?#]/g, '')}/`;
      titleLink.className = 'result-title';
      titleLink.textContent = p.display_name;
      row1.appendChild(titleLink);

      const badge = document.createElement('span');
      badge.className = 'level-badge';
      badge.textContent = this.placeTypes[p.place_type] || p.place_type;
      row1.appendChild(badge);

      const n = p.linked_description_count;
      const count = document.createElement('span');
      count.style.cssText = 'font-size:0.85rem;color:var(--color-stone-500)';
      count.textContent = n > 0
        ? `\u00b7 Asociado a ${n} ${n === 1 ? 'documento' : 'documentos'}`
        : '\u00b7 Sin documentos asociados';
      row1.appendChild(count);

      // Indicators (pushed right)
      const indicators = document.createElement('span');
      indicators.style.cssText = 'display:inline-flex;gap:0.35rem;align-items:center;margin-left:auto';

      if (p.lat != null && p.lon != null) {
        const pin = document.createElement('span');
        pin.className = 'material-symbols-outlined';
        pin.style.cssText = 'font-size:1.3rem;color:var(--color-burgundy);font-variation-settings:"wght" 200';
        pin.textContent = 'location_on';
        pin.title = 'Con coordenadas';
        indicators.appendChild(pin);
      }
      if (p.has_wikidata) {
        const wd = document.createElement('span');
        wd.className = 'authority-pill';
        wd.style.cssText += 'font-size:0.7rem;padding:2px 6px';
        wd.textContent = 'WD';
        wd.title = 'Wikidata';
        indicators.appendChild(wd);
      }
      if (p.has_whg) {
        const whg = document.createElement('span');
        whg.className = 'authority-pill';
        whg.style.cssText += 'font-size:0.7rem;padding:2px 6px';
        whg.textContent = 'WHG';
        whg.title = 'World Historical Gazetteer';
        indicators.appendChild(whg);
      }
      if (p.has_hgis) {
        const hgis = document.createElement('span');
        hgis.className = 'authority-pill';
        hgis.style.cssText += 'font-size:0.7rem;padding:2px 6px';
        hgis.textContent = 'HGIS';
        hgis.title = 'HGIS de las Indias';
        indicators.appendChild(hgis);
      }
      row1.appendChild(indicators);
      item.appendChild(row1);

      // Row 2: name variants (if any)
      if (p.name_variants && p.name_variants.length > 0) {
        const variants = document.createElement('div');
        variants.style.cssText = 'font-size:0.8rem;color:var(--color-stone-400);margin-top:0.15rem';
        variants.textContent = p.name_variants.join(', ');
        item.appendChild(variants);
      }

      this.resultsListEl.appendChild(item);
    }
  }

  // ─── Pagination ─────────────────────────────────────────────────────────────

  renderPagination(total) {
    this.paginationEl.innerHTML = '';
    const totalPages = Math.ceil(total / this.perPage);
    if (totalPages <= 1) return;

    const current = this.state.page;

    const addLink = (label, page, isActive, isEllipsis) => {
      if (isEllipsis) {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.textContent = '\u2026';
        this.paginationEl.appendChild(span);
        return;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pagination-link' + (isActive ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.state.page = page;
        this.render();
        this.updateUrl();
        this.resultsListEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      this.paginationEl.appendChild(btn);
    };

    const visiblePages = new Set();
    visiblePages.add(1);
    visiblePages.add(totalPages);
    for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
      visiblePages.add(i);
    }

    const sorted = Array.from(visiblePages).sort((a, b) => a - b);
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) addLink(null, null, false, true);
      addLink(String(p), p, p === current, false);
      prev = p;
    }
  }

  // ─── Facets ─────────────────────────────────────────────────────────────────

  renderFacets() {
    this.facetContainer.innerHTML = '';

    // Count types from allPlaces (total counts, not filtered)
    const typeCounts = {};
    for (const p of this.allPlaces) {
      typeCounts[p.place_type] = (typeCounts[p.place_type] || 0) + 1;
    }

    // Group 1: Tipo de lugar
    const typeGroup = this.makeFacetGroup('Tipo de lugar', 'type', this.facetGroupState.type);
    const typeContent = typeGroup.querySelector('.facet-group-content');

    for (const [key, label] of Object.entries(this.placeTypes)) {
      const count = typeCounts[key] || 0;
      if (count === 0) continue;
      const lbl = document.createElement('label');
      lbl.className = 'facet-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = key;
      cb.checked = this.state.type.includes(key);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!this.state.type.includes(key)) this.state.type.push(key);
        } else {
          this.state.type = this.state.type.filter(t => t !== key);
        }
        this.state.page = 1;
        this.render();
        this.updateUrl();
      });
      lbl.appendChild(cb);
      const txt = document.createElement('span');
      txt.className = 'facet-label-text';
      txt.textContent = label;
      lbl.appendChild(txt);
      const cnt = document.createElement('span');
      cnt.className = 'facet-count';
      cnt.textContent = `(${count.toLocaleString('es-CO')})`;
      lbl.appendChild(cnt);
      typeContent.appendChild(lbl);
    }
    this.facetContainer.appendChild(typeGroup);

    // Group 2: Coordenadas
    const coordsGroup = this.makeFacetGroup('Coordenadas', 'coords', this.facetGroupState.coords);
    const coordsContent = coordsGroup.querySelector('.facet-group-content');
    const coordsWithCoords = this.allPlaces.filter(p => p.lat != null && p.lon != null).length;

    const coordsLbl = document.createElement('label');
    coordsLbl.className = 'facet-option';
    const coordsCb = document.createElement('input');
    coordsCb.type = 'checkbox';
    coordsCb.checked = this.state.hasCoords === true;
    coordsCb.addEventListener('change', () => {
      this.state.hasCoords = coordsCb.checked ? true : null;
      this.state.page = 1;
      this.render();
      this.updateUrl();
    });
    coordsLbl.appendChild(coordsCb);
    const coordsTxt = document.createElement('span');
    coordsTxt.className = 'facet-label-text';
    coordsTxt.textContent = 'Solo lugares con coordenadas';
    coordsLbl.appendChild(coordsTxt);
    const coordsCnt = document.createElement('span');
    coordsCnt.className = 'facet-count';
    coordsCnt.textContent = `(${coordsWithCoords.toLocaleString('es-CO')})`;
    coordsLbl.appendChild(coordsCnt);
    coordsContent.appendChild(coordsLbl);
    this.facetContainer.appendChild(coordsGroup);

    // Group 3: Autoridades
    const authGroup = this.makeFacetGroup('Autoridades', 'authority', this.facetGroupState.authority);
    const authContent = authGroup.querySelector('.facet-group-content');
    const withAuthority = this.allPlaces.filter(p => p.has_wikidata || p.has_whg || p.has_hgis).length;

    const authLbl = document.createElement('label');
    authLbl.className = 'facet-option';
    const authCb = document.createElement('input');
    authCb.type = 'checkbox';
    authCb.checked = this.state.hasAuthority === true;
    authCb.addEventListener('change', () => {
      this.state.hasAuthority = authCb.checked ? true : null;
      this.state.page = 1;
      this.render();
      this.updateUrl();
    });
    authLbl.appendChild(authCb);
    const authTxt = document.createElement('span');
    authTxt.className = 'facet-label-text';
    authTxt.textContent = 'Solo con v\u00ednculos de autoridad';
    authLbl.appendChild(authTxt);
    const authCnt = document.createElement('span');
    authCnt.className = 'facet-count';
    authCnt.textContent = `(${withAuthority.toLocaleString('es-CO')})`;
    authLbl.appendChild(authCnt);
    authContent.appendChild(authLbl);
    this.facetContainer.appendChild(authGroup);
  }

  makeFacetGroup(title, stateKey, isOpen) {
    const group = document.createElement('div');
    group.className = 'facet-group';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'facet-group-toggle';
    toggle.innerHTML =
      `<span class="facet-group-title">${this.escapeHtml(title)}</span>` +
      `<span class="facet-group-indicator">${isOpen ? '\u2212' : '+'}</span>`;

    const content = document.createElement('div');
    content.className = 'facet-group-content';
    content.style.display = isOpen ? '' : 'none';

    toggle.addEventListener('click', () => {
      this.facetGroupState[stateKey] = !this.facetGroupState[stateKey];
      const indicator = toggle.querySelector('.facet-group-indicator');
      content.style.display = this.facetGroupState[stateKey] ? '' : 'none';
      indicator.textContent = this.facetGroupState[stateKey] ? '\u2212' : '+';
    });

    group.appendChild(toggle);
    group.appendChild(content);
    return group;
  }

  // ─── Filter pills ───────────────────────────────────────────────────────────

  renderPills() {
    this.pillsEl.innerHTML = '';

    const hasAny = this.state.type.length > 0 ||
      this.state.hasCoords !== null ||
      this.state.hasAuthority !== null;

    if (!hasAny) return;

    // One pill per selected type
    for (const t of this.state.type) {
      const label = this.placeTypes[t] || t;
      this.pillsEl.appendChild(this.makePill(label, () => {
        this.state.type = this.state.type.filter(x => x !== t);
        this.state.page = 1;
        this.render();
        this.updateUrl();
      }));
    }

    // Coords pill
    if (this.state.hasCoords !== null) {
      this.pillsEl.appendChild(this.makePill('Con coordenadas', () => {
        this.state.hasCoords = null;
        this.state.page = 1;
        this.render();
        this.updateUrl();
      }));
    }

    // Authority pill
    if (this.state.hasAuthority !== null) {
      this.pillsEl.appendChild(this.makePill('Con autoridades', () => {
        this.state.hasAuthority = null;
        this.state.page = 1;
        this.render();
        this.updateUrl();
      }));
    }

    // Clear all button
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'clear-filters-btn';
    clearBtn.textContent = 'Borrar todos los filtros';
    clearBtn.addEventListener('click', () => this.clearFilters());
    this.pillsEl.appendChild(clearBtn);
  }

  makePill(label, onRemove) {
    const pill = document.createElement('span');
    pill.className = 'filter-pill';
    pill.textContent = label;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'filter-pill-remove';
    removeBtn.setAttribute('aria-label', `Eliminar filtro: ${label}`);
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', onRemove);
    pill.appendChild(removeBtn);
    return pill;
  }

  clearFilters() {
    this.state.q = '';
    this.state.type = [];
    this.state.hasCoords = null;
    this.state.hasAuthority = null;
    this.state.page = 1;
    if (this.searchInput) this.searchInput.value = '';
    this.render();
    this.updateUrl();
  }

  // ─── Map ────────────────────────────────────────────────────────────────────

  updateMap(filteredPlaces) {
    if (!this.mapReady) return;
    const features = filteredPlaces
      .filter(p => p.lat != null && p.lon != null)
      .map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { id: p.id, display_name: p.display_name, place_type: p.place_type, linked_description_count: p.linked_description_count }
      }));
    const source = this.map.getSource('places');
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }

  toggleMapBound() {
    this.state.mapBound = !this.state.mapBound;

    if (this.state.mapBound) {
      this.mapAreaToggle.classList.add('active');
      this.mapAreaToggle.textContent = 'Filtrando por \u00e1rea del mapa';
      // Listen for map moves to re-filter results
      this._onMoveEnd = () => {
        if (!this.state.mapBound) return;
        // Re-filter without updating URL (per Pitfall 7)
        const afterFilter = this.applyFilters();
        this.filtered = this.filterByViewport(afterFilter);
        const sorted = this.sortResults(this.filtered);
        const total = sorted.length;
        const totalPages = Math.ceil(total / this.perPage) || 1;
        if (this.state.page > totalPages) this.state.page = 1;
        const start = (this.state.page - 1) * this.perPage;
        const page = sorted.slice(start, start + this.perPage);
        this.renderResultsInfo(total);
        this.renderResults(page, total);
        this.renderPagination(total);
      };
      this.map.on('moveend', this._onMoveEnd);
    } else {
      this.mapAreaToggle.classList.remove('active');
      this.mapAreaToggle.textContent = 'Filtrar por \u00e1rea del mapa';
      if (this._onMoveEnd) {
        this.map.off('moveend', this._onMoveEnd);
        this._onMoveEnd = null;
      }
    }

    this.state.page = 1;
    this.render();
    this.updateUrl();
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Self-invoking init
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('place-explorer');
  if (container) new PlaceExplorer(container);
});
