/**
 * Entity Explorer
 *
 * Pagefind-powered search and faceted filtering over the entity index
 * (/pagefind-entities/). Provides full-text search, entity type / primary
 * function / date-range facets, role filter pills, sort controls, paginated
 * results, URL state sync, mobile filter toggle, and a rich result row per
 * UI-SPEC D-27.
 *
 * Satisfies EEXP-01 (search), EEXP-02 (facet filtering), EEXP-03 (list view).
 * Adapted for sidebar integration with bidirectional graph sync (D-07–D-19).
 */

// Role labels shared with entity.js and infinite-bipartite-explorer.js
var roleLabels = {
  creator: 'Productor',
  contributor: 'Colaborador',
  publisher: 'Editor',
  subject: 'Materia',
  mentioned: 'Mencionado',
  sender: 'Remitente',
  recipient: 'Destinatario',
  plaintiff: 'Demandante',
  defendant: 'Demandado',
  author: 'Autor',
  scribe: 'Escribano',
  notary: 'Notario',
  witness: 'Testigo',
  petitioner: 'Peticionario',
  judge: 'Juez',
  appellant: 'Apelante',
  victim: 'Víctima',
  creditor: 'Acreedor',
  seller: 'Vendedor',
  debtor: 'Deudor',
  buyer: 'Comprador',
  albacea: 'Albacea',
  mortgagee: 'Acreedor hipotecario',
  official: 'Funcionario',
  heir: 'Heredero',
  spouse: 'Cónyuge',
  grantor: 'Otorgante',
  donor: 'Donante',
  mortgagor: 'Deudor hipotecario'
};

// Entity colours shared with entity.js and infinite-bipartite-explorer.js
var entityColors = {
  person: '#8B2942',
  corporate_body: '#6666BB',
  corporate: '#6666BB',
  family: '#6666BB'
};

class EntityExplorer {
  constructor(container) {
    this.container = container;
    this.pagefind = null;
    this.globalFilters = null;
    this.perPage = 20;

    this.entityTypeLabels = {};
    try {
      this.entityTypeLabels = JSON.parse(container.dataset.entityTypes || '{}');
    } catch (e) {
      console.warn('EntityExplorer: could not parse data-entity-types');
    }

    this.state = {
      q: '',
      entity_type: [],
      primary_function: [],
      dateFilter: null,  // { level: 'century'|'decade'|'year', label, years: string[] }
      sort: '',
      page: 1,
      role: []           // active role filters (array of role strings) — D-07, D-09
    };

    this.activeRoles = new Set(); // role filter state for pills

    // Viewport filter — when true, post-filter results to entities whose
    // graph nodes are currently inside the visible canvas viewport. The
    // host wires getVisibleEntityCodes via setViewportCodeSource so the
    // explorer doesn't need a direct reference to the graph instance.
    this.viewportFilter = false;
    this._visibleCodeSource = null;

    // Callback hooks — set by wiring script in entidades.njk
    this.onEntitySelected = null;  // (entityCode) — fired when user clicks entity in results
    this.onFilterChanged = null;   // (filters) — fired when any filter/search changes

    this.facetGroupState = { entity_type: true, primary_function: true, date: true };
    // Compact mode: when facets are rendered separately into #sidebar-facets,
    // suppress the inline facet column in render() to avoid duplication.
    this.compactMode = !!document.getElementById('sidebar-facets');
    // Note: init() is called explicitly by the wiring script (entidades.njk) to control
    // initialization order. Do not call this.init() here.
  }

  async init() {
    this.parseUrlParams();

    try {
      this.pagefind = await import('/pagefind-entities/pagefind.js');
      await this.pagefind.options({ basePath: '/pagefind-entities/' });
      await this.pagefind.init();
      this.globalFilters = await this.pagefind.filters();
    } catch (e) {
      console.error('EntityExplorer: failed to load Pagefind:', e);
      this.showError();
      return;
    }

    // Render sidebar facets (entity type, role, date) and the search input
    // into their dedicated containers (D-07)
    this.renderSidebarFacets(document.getElementById('sidebar-facets'));
    if (typeof this.onReady === 'function') this.onReady();
    const searchInputContainer = document.getElementById('entity-search-input');
    if (searchInputContainer) {
      searchInputContainer.innerHTML = '';
      searchInputContainer.appendChild(this.renderSearchInput());
    }

    window.addEventListener('popstate', () => {
      this.parseUrlParams();
      this.search();
    });

    this.search();
  }

  // --- URL state ---

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    this.state.q = params.get('q') || '';
    this.state.entity_type = params.getAll('tipo');
    this.state.primary_function = params.getAll('funcion');
    this.state.sort = params.get('orden') || '';
    this.state.page = parseInt(params.get('pagina'), 10) || 1;
    this.state.role = params.getAll('rol');
    // Sync activeRoles Set with URL state
    this.activeRoles = new Set(this.state.role);

    // Date drill-down: one active at a time
    this.state.dateFilter = null;
    const fechaNivel = params.get('fecha_nivel');
    const fechaValor = params.get('fecha_valor');
    if (fechaNivel && fechaValor) {
      if (fechaNivel === 'year') {
        this.state.dateFilter = { level: 'year', label: fechaValor, years: [fechaValor] };
      } else if (fechaNivel === 'decade') {
        const base = parseInt(fechaValor, 10);
        const years = [];
        for (let i = base; i < base + 10; i++) years.push(String(i));
        this.state.dateFilter = { level: 'decade', label: `${fechaValor}s`, years };
      } else if (fechaNivel === 'century') {
        const num = parseInt(fechaValor, 10);
        const base = (num - 1) * 100;
        const years = [];
        for (let i = base; i < base + 100; i++) years.push(String(i));
        this.state.dateFilter = { level: 'century', label: `Siglo ${this.romanCentury(num)}`, years };
      }
    }
  }

  updateUrl() {
    const params = new URLSearchParams();
    if (this.state.q) params.set('q', this.state.q);
    for (const t of this.state.entity_type) params.append('tipo', t);
    for (const f of this.state.primary_function) params.append('funcion', f);
    for (const r of this.state.role) params.append('rol', r);
    if (this.state.sort) params.set('orden', this.state.sort);
    if (this.state.page > 1) params.set('pagina', this.state.page);

    if (this.state.dateFilter) {
      const df = this.state.dateFilter;
      if (df.level === 'year') {
        params.set('fecha_nivel', 'year');
        params.set('fecha_valor', df.years[0]);
      } else if (df.level === 'decade') {
        params.set('fecha_nivel', 'decade');
        params.set('fecha_valor', df.years[0]);
      } else if (df.level === 'century') {
        const firstYear = parseInt(df.years[0], 10);
        const centuryNum = Math.floor(firstYear / 100) + 1;
        params.set('fecha_nivel', 'century');
        params.set('fecha_valor', String(centuryNum));
      }
    }

    const qs = params.toString();
    const url = qs ? `/entidades/?${qs}` : '/entidades/';
    history.pushState(null, '', url);
  }

  // --- Search ---

  async search() {
    if (!this.pagefind) return;

    const hasActiveFilters = this.state.entity_type.length > 0 ||
      this.state.primary_function.length > 0 ||
      this.state.role.length > 0 ||
      this.state.dateFilter !== null ||
      this.viewportFilter;

    const isPreSearch = !this.state.q && !hasActiveFilters && !this.state.sort;

    this.showLoading();
    // Yield once so the spinner can paint before any WASM blocks. Use
    // setTimeout instead of requestAnimationFrame: rAF is paused in hidden
    // tabs (e.g. when the user opens /entidades/ in a background tab and
    // switches to it later), which would otherwise leave the explorer
    // permanently stuck on the loading spinner.
    await new Promise(r => setTimeout(r, 0));

    try {
      if (isPreSearch) {
        // Reset left-sidebar facets to global counts — the user has cleared
        // all filters, so other options should reappear at their full counts.
        const sidebarFacetsEl = document.getElementById('sidebar-facets');
        if (sidebarFacetsEl) this.renderSidebarFacets(sidebarFacetsEl, this.globalFilters);

        // Show browse prompt with total entity count
        const totalCount = this.getTotalEntityCount();
        this.renderSearchResults({
          hits: [],
          filters: this.globalFilters,
          total: 0,
          page: 1,
          total_pages: 0,
          query: '',
          browsePrompt: true,
          totalEntityCount: totalCount
        });
        return;
      }

      // Resolve dateFilter years against actual index
      if (this.state.dateFilter && this.globalFilters && this.globalFilters.year) {
        const indexYears = new Set(Object.keys(this.globalFilters.year));
        this.state.dateFilter.years = this.state.dateFilter.years.filter(y => indexYears.has(y));
      }

      // Build Pagefind filters
      const pfFilters = {};
      if (this.state.entity_type.length) pfFilters.entity_type = { any: this.state.entity_type };
      if (this.state.primary_function.length) pfFilters.primary_function = { any: this.state.primary_function };
      if (this.state.dateFilter && this.state.dateFilter.years.length) {
        pfFilters.year = { any: this.state.dateFilter.years };
      }
      if (this.state.role.length) pfFilters.role = { any: this.state.role };

      // Build Pagefind sort. Apply the count:desc default only for real
      // searches — never on initial load (the pre-search guard above already
      // short-circuited that case). Sorting the full 92k index in WASM blocks
      // the main thread for 30+ seconds, so we only pay that cost when the
      // user has actually narrowed the result set with a query or filter.
      const effectiveSort = this.state.sort || 'count:desc';
      const [sortField, sortDir] = effectiveSort.split(':');
      const pfSort = { [sortField]: sortDir };

      const search = await this.pagefind.search(this.state.q || null, {
        filters: Object.keys(pfFilters).length ? pfFilters : undefined,
        sort: pfSort
      });

      // Apply viewport filter if active — post-filter the search results
      // by the set of entity codes currently visible in the graph viewport.
      // Mirrors the place explorer's mapBound filter pattern.
      let allResults = search.results;
      if (this.viewportFilter && typeof this._visibleCodeSource === 'function') {
        const visibleCodes = this._visibleCodeSource() || new Set();
        allResults = search.results.filter(r => {
          const m = (r.url || '').match(/\/entidad\/([^/]+)\//);
          return m && visibleCodes.has(m[1]);
        });
      }

      const total = allResults.length;
      const totalPages = Math.ceil(total / this.perPage);
      const start = (this.state.page - 1) * this.perPage;
      const pageResults = allResults.slice(start, start + this.perPage);
      const hits = await Promise.all(pageResults.map(r => r.data()));

      const scopedFilters = search.filters || this.globalFilters;

      // Re-render the left-sidebar facets with scoped counts so other
      // filter options narrow to reflect what's still reachable.
      const sidebarFacetsEl = document.getElementById('sidebar-facets');
      if (sidebarFacetsEl) this.renderSidebarFacets(sidebarFacetsEl, scopedFilters);

      this.renderSearchResults({
        hits,
        filters: scopedFilters,
        total,
        page: this.state.page,
        total_pages: totalPages,
        query: this.state.q
      });

      // D-08, D-09, D-15: fire filter callback so graph stays in sync
      if (this.onFilterChanged) {
        this.onFilterChanged({
          roles: new Set(this.state.role),
          entityTypes: new Set(this.state.entity_type),
          functions: new Set(this.state.primary_function),
          searchQuery: this.state.q
        });
      }
    } catch (error) {
      console.error('EntityExplorer: search error:', error);
      this.showError();
    }
  }

  getTotalEntityCount() {
    if (!this.globalFilters) return 0;
    // Sum counts from entity_type filter as proxy for total entity count
    if (this.globalFilters.entity_type) {
      return Object.values(this.globalFilters.entity_type).reduce((a, b) => a + b, 0);
    }
    return 0;
  }

  // --- Rendering ---

  renderSearchResults(data) {
    this._lastRenderData = data;
    this.container.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'search-layout';

    // Results column
    const resultsCol = document.createElement('div');
    resultsCol.className = 'search-results';
    resultsCol.setAttribute('aria-live', 'polite');

    // Mobile filter toggle
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-filter-toggle';
    mobileToggle.type = 'button';
    mobileToggle.innerHTML = 'Filtrar resultados <span class="toggle-chevron">&#9660;</span>';
    mobileToggle.addEventListener('click', () => {
      const sidebar = this.container.querySelector('.search-sidebar');
      if (sidebar) {
        sidebar.classList.toggle('sidebar-open');
        mobileToggle.classList.toggle('toggle-open');
      }
    });
    resultsCol.appendChild(mobileToggle);

    // Browse prompt (pre-search state: no query, no filters)
    if (data.browsePrompt) {
      const prompt = document.createElement('div');
      prompt.className = 'search-browse-prompt';

      const countText = document.createElement('p');
      countText.className = 'browse-prompt-count';
      const countStr = data.totalEntityCount > 0
        ? data.totalEntityCount.toLocaleString('es-CO')
        : '';
      if (countStr) {
        countText.innerHTML = `<strong>${countStr}</strong> entidades en el archivo`;
      } else {
        countText.innerHTML = '';
      }
      prompt.appendChild(countText);

      const hint = document.createElement('p');
      hint.className = 'browse-prompt-hint';
      hint.textContent = 'Empieza a escribir para buscar, o explora filtrando por tipo o fecha.';
      prompt.appendChild(hint);

      const exploreBtn = document.createElement('button');
      exploreBtn.type = 'button';
      exploreBtn.className = 'browse-prompt-btn';
      exploreBtn.textContent = 'Explorar todas';
      exploreBtn.addEventListener('click', async () => {
        this.state.q = '';
        this.state.entity_type = [];
        this.state.primary_function = [];
        this.state.dateFilter = null;
        this.state.page = 1;
        this.updateUrl();

        // Run full search (all entities)
        this.showLoading();
        await new Promise(r => setTimeout(r, 0));
        try {
          const search = await this.pagefind.search(null);
          const total = search.results.length;
          const totalPages = Math.ceil(total / this.perPage);
          const pageResults = search.results.slice(0, this.perPage);
          const hits = await Promise.all(pageResults.map(r => r.data()));
          this.renderSearchResults({
            hits,
            filters: search.filters || this.globalFilters,
            total,
            page: 1,
            total_pages: totalPages,
            query: ''
          });
        } catch (e) {
          console.error('EntityExplorer: explore all error:', e);
          this.showError();
        }
      });
      prompt.appendChild(exploreBtn);

      resultsCol.appendChild(prompt);

      if (!this.compactMode) {
        const sidebar = this.renderFacets(data);
        layout.appendChild(sidebar);
      }
      layout.appendChild(resultsCol);
      this.container.appendChild(layout);
      return;
    }

    // Results info bar (count + sort)
    resultsCol.appendChild(this.renderResultsInfo(data));

    // Active filter pills
    const pills = this.renderPills();
    if (pills) resultsCol.appendChild(pills);

    // (Search input lives in the left filter sidebar — see init().)

    // Result items or empty state
    if (data.hits.length === 0) {
      resultsCol.appendChild(this.renderNoResults());
    } else {
      const resultsList = document.createElement('div');
      resultsList.className = 'search-results-list';
      for (const hit of data.hits) {
        resultsList.appendChild(this.renderResultCard(hit, data.query));
      }
      resultsCol.appendChild(resultsList);
    }

    // Pagination
    if (data.total_pages > 1) {
      resultsCol.appendChild(this.renderPagination(data));
    }

    // Sidebar (suppressed in compact mode — facets render into #sidebar-facets)
    if (!this.compactMode) {
      const sidebar = this.renderFacets(data);
      layout.appendChild(sidebar);
    }
    layout.appendChild(resultsCol);

    this.container.appendChild(layout);
  }

  renderSearchInput() {
    // Use the same .refine-search styling as the descriptions explorer
    // (rounded pill, stone-50 bg, burgundy focus border).
    const wrap = document.createElement('div');
    wrap.className = 'refine-search';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Buscar entidades...';
    input.value = this.state.q;
    input.setAttribute('aria-label', 'Buscar entidades');

    let debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.state.q = input.value.trim();
        this.state.page = 1;
        this.updateUrl();
        this.search();
      }, 300);
    });

    wrap.appendChild(input);
    return wrap;
  }

  renderResultCard(hit) {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    // D-14: clicking an entity in the index loads it in the graph
    item.style.cursor = 'pointer';
    item.addEventListener('click', (e) => {
      // Extract entity code from the result URL (pattern: /entidad/{code}/)
      const match = (hit.url || '').match(/\/entidad\/([^/]+)\//);
      if (match && match[1] && this.onEntitySelected) {
        e.preventDefault();
        this.onEntitySelected(match[1]);
      }
    });

    // Row 1: title + type badge + date range
    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex; flex-wrap:wrap; align-items:baseline; gap:0.5rem;';

    const title = document.createElement('h3');
    title.className = 'result-title';
    title.style.margin = '0';
    const link = document.createElement('a');
    link.href = hit.url;
    link.textContent = hit.meta.title || '';
    // Allow normal link navigation when onEntitySelected is not wired
    link.addEventListener('click', (e) => {
      if (this.onEntitySelected) e.stopPropagation();
    });
    title.appendChild(link);
    row1.appendChild(title);

    // Entity type badge
    const entityType = hit.meta.entity_type || '';
    if (entityType) {
      const badge = document.createElement('span');
      badge.className = 'entity-type-badge entity-type-badge--' + (
        entityType === 'person' ? 'person'
        : (entityType === 'corporate_body' || entityType === 'corporate') ? 'corporate'
        : entityType === 'family' ? 'family'
        : 'unknown'
      );
      badge.textContent = this.entityTypeLabels[entityType] || entityType;
      row1.appendChild(badge);
    }

    // Date range
    const dateEarliest = hit.meta.date_earliest || '';
    const dateLatest = hit.meta.date_latest || '';
    if (dateEarliest) {
      const dateMeta = document.createElement('span');
      dateMeta.className = 'result-meta';
      dateMeta.style.fontSize = '0.875rem';
      if (dateLatest && dateLatest !== dateEarliest) {
        dateMeta.textContent = `${dateEarliest}\u2013${dateLatest}`;
      } else {
        dateMeta.textContent = dateEarliest;
      }
      row1.appendChild(dateMeta);
    }

    item.appendChild(row1);

    // Row 2: primary function + doc count
    const primaryFunction = hit.meta.primary_function || '';
    const linkedCountRaw = hit.meta.linked_count || hit.meta.count || '';
    const linkedCount = parseInt(linkedCountRaw, 10) || 0;

    if (primaryFunction || linkedCount > 0) {
      const row2 = document.createElement('div');
      row2.style.marginTop = '2px';

      if (primaryFunction) {
        const funcSpan = document.createElement('span');
        funcSpan.className = 'entity-result-function';
        funcSpan.textContent = primaryFunction;
        row2.appendChild(funcSpan);
      }

      if (primaryFunction && linkedCount > 0) {
        row2.appendChild(document.createTextNode(' \u00B7 '));
      }

      if (linkedCount > 0) {
        const countSpan = document.createElement('span');
        countSpan.className = 'entity-result-doccount';
        const countFormatted = linkedCount.toLocaleString('es-CO');
        if (linkedCount === 1) {
          countSpan.textContent = `Asociado a 1 documento`;
        } else {
          countSpan.textContent = `Asociado a ${countFormatted} documentos`;
        }
        row2.appendChild(countSpan);
      }

      item.appendChild(row2);
    }

    // Row 3: name variants (max 3)
    const nameVariantsRaw = hit.meta.name_variants || '';
    if (nameVariantsRaw) {
      const variants = nameVariantsRaw.split(', ').filter(Boolean).slice(0, 3);
      if (variants.length > 0) {
        const row3 = document.createElement('div');
        row3.className = 'entity-result-variants';

        const label = document.createElement('span');
        label.style.color = 'var(--color-stone-400)';
        label.textContent = 'Tambien conocido como: ';
        row3.appendChild(label);

        row3.appendChild(document.createTextNode(variants.join(', ')));
        item.appendChild(row3);
      }
    }

    return item;
  }

  renderResultsInfo(data) {
    const info = document.createElement('div');
    info.className = 'results-info search-results-info';

    const count = document.createElement('span');
    count.className = 'results-count';
    if (data.total === 1) {
      count.textContent = '1 entidad';
    } else {
      count.textContent = `${data.total.toLocaleString('es-CO')} entidades`;
    }
    info.appendChild(count);

    // Sort controls
    const sortWrap = document.createElement('div');
    sortWrap.className = 'sort-wrap';

    const sortLabel = document.createElement('span');
    sortLabel.className = 'sort-label';
    sortLabel.textContent = 'Ordenar:';
    sortWrap.appendChild(sortLabel);

    const sortOptions = [
      { value: 'name:asc', label: 'Nombre' },
      { value: 'date:asc', label: 'Fecha' },
      { value: 'count:desc', label: 'Documentos' }
    ];

    sortOptions.forEach((opt, i) => {
      if (i > 0) {
        const divider = document.createElement('span');
        divider.className = 'sort-divider';
        divider.textContent = '|';
        sortWrap.appendChild(divider);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sort-btn';
      if (this.state.sort === opt.value) btn.classList.add('active');
      btn.textContent = opt.label;

      btn.addEventListener('click', () => {
        this.state.sort = opt.value;
        this.state.page = 1;
        this.updateUrl();
        this.search();
      });

      sortWrap.appendChild(btn);
    });

    info.appendChild(sortWrap);
    return info;
  }

  // --- Role filter pills (D-07, D-09) ---

  // Render the role facet as a checkbox group, styled like the other
  // facet groups in the left filter sidebar. Multi-select: each click
  // toggles a single role in this.activeRoles. Returns a DOM element
  // suitable for appending into #sidebar-facets.
  renderRoleFacet(roleData) {
    const group = document.createElement('div');
    group.className = 'facet-group';

    const isOpen = this.facetGroupState.role !== false;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'facet-group-toggle';
    toggle.innerHTML = `<span class="facet-group-title">Rol</span><span class="facet-group-indicator">${isOpen ? '\u2212' : '+'}</span>`;
    toggle.addEventListener('click', () => {
      this.facetGroupState.role = !this.facetGroupState.role;
      const content = group.querySelector('.facet-group-content');
      const indicator = toggle.querySelector('.facet-group-indicator');
      if (content) {
        content.style.display = this.facetGroupState.role ? '' : 'none';
        indicator.textContent = this.facetGroupState.role ? '\u2212' : '+';
      }
    });
    group.appendChild(toggle);

    const content = document.createElement('div');
    content.className = 'facet-group-content';
    content.style.display = isOpen ? '' : 'none';

    const roles = Object.keys(roleData)
      .filter(r => roleData[r] > 0)
      .sort((a, b) => {
        const aActive = this.activeRoles.has(a) ? 1 : 0;
        const bActive = this.activeRoles.has(b) ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return roleData[b] - roleData[a];
      });

    for (const role of roles) {
      const count = roleData[role];
      const label = document.createElement('label');
      label.className = 'facet-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = role;
      checkbox.checked = this.activeRoles.has(role);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.activeRoles.add(role);
        } else {
          this.activeRoles.delete(role);
        }
        this.state.role = Array.from(this.activeRoles);
        this.state.page = 1;
        this.updateUrl();
        this.search();
      });
      label.appendChild(checkbox);

      const text = document.createElement('span');
      text.className = 'facet-label-text';
      text.textContent = roleLabels[role] || role;
      label.appendChild(text);

      const countSpan = document.createElement('span');
      countSpan.className = 'facet-count';
      countSpan.textContent = `(${Number(count).toLocaleString('es-CO')})`;
      label.appendChild(countSpan);

      content.appendChild(label);
    }

    group.appendChild(content);
    return group;
  }

  // --- Sidebar facets (entity type, function, date) — D-08 ---

  renderSidebarFacets(containerEl, filtersArg) {
    if (!containerEl || !this.globalFilters) return;

    containerEl.innerHTML = '';

    // Use scoped filters from a recent search when available so the facet
    // counts narrow as the user applies filters (matching the descriptions
    // explorer behavior). Fall back to globalFilters on initial render.
    const filters = filtersArg || this.globalFilters;

    if (filters.entity_type) {
      containerEl.appendChild(this.renderFacetGroup(
        'Tipo de entidad',
        'entity_type',
        filters.entity_type,
        this.state.entity_type,
        (value) => this.entityTypeLabels[value] || value
      ));
    }

    if (filters.primary_function) {
      containerEl.appendChild(this.renderFacetGroup(
        'Función principal',
        'primary_function',
        filters.primary_function,
        this.state.primary_function,
        (value) => value
      ));
    }

    if (filters.role && Object.values(filters.role).some(c => c > 0)) {
      containerEl.appendChild(this.renderRoleFacet(filters.role));
    }

    if (filters.year && Object.values(filters.year).some(c => c > 0)) {
      containerEl.appendChild(this.renderDateTree(filters.year, filters.century || {}, filters.decade || {}));
    }
  }

  // --- Selected entity card (right column, D-13) ---
  // Renders into the #focal-entity-card host. Layout matches the
  // EntityExplorerRefinedPage Make spec: eyebrow + Cormorant name +
  // periwinkle type pill + big burgundy doc count + "Ver página completa"
  // link, with an X button that restores the stub state.

  highlightEntity(entityCode, entityMeta) {
    this._currentFocalCode = entityCode;
    this._currentFocalMeta = entityMeta || {};

    const cardEl = document.getElementById('focal-entity-card');
    if (cardEl) {
      const typeLabel = entityMeta.entity_type === 'person' ? 'Persona'
        : entityMeta.entity_type === 'corporate_body' || entityMeta.entity_type === 'corporate' ? 'Entidad corporativa'
        : entityMeta.entity_type === 'family' ? 'Familia'
        : (entityMeta.entity_type || '');

      cardEl.classList.remove('is-stub');
      cardEl.innerHTML = '';

      // Header row: eyebrow + close button
      const header = document.createElement('div');
      header.className = 'selected-entity-header';
      const eyebrow = document.createElement('div');
      eyebrow.className = 'selected-entity-eyebrow';
      eyebrow.textContent = 'Entidad seleccionada';
      header.appendChild(eyebrow);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'selected-entity-close';
      closeBtn.setAttribute('aria-label', 'Deseleccionar entidad');
      closeBtn.textContent = '\u2715';
      closeBtn.addEventListener('click', () => {
        this.clearFocalCard();
        if (typeof this.onFocalCleared === 'function') this.onFocalCleared();
      });
      header.appendChild(closeBtn);
      cardEl.appendChild(header);

      const nameEl = document.createElement('div');
      nameEl.className = 'selected-entity-name';
      nameEl.textContent = entityMeta.label || entityCode;
      cardEl.appendChild(nameEl);

      if (typeLabel) {
        const badge = document.createElement('span');
        badge.className = 'selected-entity-badge selected-entity-badge--' + (
          entityMeta.entity_type === 'person' ? 'person'
          : (entityMeta.entity_type === 'corporate_body' || entityMeta.entity_type === 'corporate') ? 'corporate'
          : entityMeta.entity_type === 'family' ? 'family'
          : 'unknown'
        );
        badge.textContent = typeLabel;
        cardEl.appendChild(badge);
      }

      // Big doc count
      const count = entityMeta.linked_count || 0;
      const stat = document.createElement('div');
      stat.className = 'selected-entity-stat';
      const statNum = document.createElement('div');
      statNum.className = 'selected-entity-stat-num';
      statNum.textContent = Number(count).toLocaleString('es-CO');
      const statLbl = document.createElement('div');
      statLbl.className = 'selected-entity-stat-label';
      statLbl.textContent = count === 1 ? 'documento vinculado' : 'documentos vinculados';
      stat.appendChild(statNum);
      stat.appendChild(statLbl);
      cardEl.appendChild(stat);

      // Footer link
      const footer = document.createElement('div');
      footer.className = 'selected-entity-footer';
      const link = document.createElement('a');
      link.className = 'selected-entity-link';
      link.href = `/entidad/${entityCode}/`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Ver ficha completa \u2192';
      footer.appendChild(link);
      cardEl.appendChild(footer);
    }

    // Highlight the entity in the result list if present
    const existingItem = this.container.querySelector(
      `.search-result-item a[href*="/entidad/${entityCode}/"]`
    );
    if (existingItem) {
      this.container.querySelectorAll('.search-result-item.graph-focused')
        .forEach(el => el.classList.remove('graph-focused'));
      const itemEl = existingItem.closest('.search-result-item');
      if (itemEl) {
        itemEl.classList.add('graph-focused');
        itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  clearFocalCard() {
    this._currentFocalCode = null;
    this._currentFocalMeta = null;
    const cardEl = document.getElementById('focal-entity-card');
    if (!cardEl) return;
    cardEl.classList.add('is-stub');
    cardEl.innerHTML = '<div class="selected-entity-stub">Selecciona una entidad para ver más detalles</div>';
    this.container.querySelectorAll('.search-result-item.graph-focused')
      .forEach(el => el.classList.remove('graph-focused'));
  }

  renderFacets(data) {
    const sidebar = document.createElement('aside');
    sidebar.className = 'search-sidebar';

    // Mobile filter panel header
    const panelHeader = document.createElement('div');
    panelHeader.className = 'filter-panel-header';
    panelHeader.innerHTML =
      '<span class="filter-panel-title">Filtros</span>' +
      '<button class="filter-panel-close" type="button" aria-label="Cerrar filtros">' +
      '<span class="material-symbols-outlined">close</span></button>';
    sidebar.appendChild(panelHeader);

    // Desktop heading
    const heading = document.createElement('h3');
    heading.className = 'search-sidebar-heading';
    heading.textContent = 'Filtros';
    sidebar.appendChild(heading);

    // Sidebar search input
    sidebar.appendChild(this.renderSidebarSearchInput());

    const filters = data.filters || {};

    // Facet: entity type
    if (filters.entity_type) {
      sidebar.appendChild(this.renderFacetGroup(
        'Tipo de entidad',
        'entity_type',
        filters.entity_type,
        this.state.entity_type,
        (value) => this.entityTypeLabels[value] || value
      ));
    }

    // Facet: primary function
    if (filters.primary_function) {
      sidebar.appendChild(this.renderFacetGroup(
        'Funcion principal',
        'primary_function',
        filters.primary_function,
        this.state.primary_function,
        (value) => value  // already in Spanish from backend
      ));
    }

    // Facet: date drill-down tree
    if (filters.year && Object.values(filters.year).some(c => c > 0)) {
      sidebar.appendChild(this.renderDateTree(filters.year, filters.century || {}, filters.decade || {}));
    }

    // Mobile panel bottom close
    const panelBottom = document.createElement('div');
    panelBottom.className = 'filter-panel-bottom-close';
    panelBottom.innerHTML =
      '<button type="button">' +
      '<span class="material-symbols-outlined">expand_less</span> Cerrar filtros</button>';
    sidebar.appendChild(panelBottom);

    // Wire up close handlers
    const closePanel = () => {
      sidebar.classList.remove('sidebar-open');
      const toggle = this.container.querySelector('.mobile-filter-toggle');
      if (toggle) toggle.classList.remove('toggle-open');
    };
    panelHeader.querySelector('.filter-panel-close').addEventListener('click', closePanel);
    panelBottom.querySelector('button').addEventListener('click', closePanel);

    return sidebar;
  }

  renderSidebarSearchInput() {
    const wrap = document.createElement('div');
    wrap.className = 'search-refine-wrap';

    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'search-refine-input';
    input.placeholder = 'Buscar entidades...';
    input.value = this.state.q;
    input.setAttribute('aria-label', 'Buscar entidades');

    let debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.state.q = input.value.trim();
        this.state.page = 1;
        this.updateUrl();
        this.search();
      }, 300);
    });

    wrap.appendChild(input);
    return wrap;
  }

  renderFacetGroup(title, stateKey, facetData, activeValues, labelFn, sortFn) {
    const group = document.createElement('div');
    group.className = 'facet-group';

    const isOpen = this.facetGroupState[stateKey] !== false;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'facet-group-toggle';
    toggle.innerHTML = `<span class="facet-group-title">${this.escapeHtml(title)}</span><span class="facet-group-indicator">${isOpen ? '\u2212' : '+'}</span>`;
    toggle.addEventListener('click', () => {
      this.facetGroupState[stateKey] = !this.facetGroupState[stateKey];
      const content = group.querySelector('.facet-group-content');
      const indicator = toggle.querySelector('.facet-group-indicator');
      if (content) {
        content.style.display = this.facetGroupState[stateKey] ? '' : 'none';
        indicator.textContent = this.facetGroupState[stateKey] ? '\u2212' : '+';
      }
    });
    group.appendChild(toggle);

    const content = document.createElement('div');
    content.className = 'facet-group-content';
    content.style.display = isOpen ? '' : 'none';

    const entries = Object.entries(facetData).sort((a, b) => {
      const aActive = activeValues.includes(a[0]) ? 1 : 0;
      const bActive = activeValues.includes(b[0]) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      if (sortFn) return sortFn(a, b);
      return b[1] - a[1];
    });

    const hasActive = activeValues.length > 0;

    for (const [value, count] of entries) {
      if (hasActive && !activeValues.includes(value)) continue;
      if (count === 0 && !activeValues.includes(value)) continue;

      const label = document.createElement('label');
      label.className = 'facet-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = value;
      checkbox.checked = activeValues.includes(value);
      checkbox.addEventListener('change', () => {
        this.handleFilterChange(stateKey, value, checkbox.checked);
      });
      label.appendChild(checkbox);

      const text = document.createElement('span');
      text.className = 'facet-label-text';
      text.textContent = labelFn(value);
      label.appendChild(text);

      const countSpan = document.createElement('span');
      countSpan.className = 'facet-count';
      countSpan.textContent = `(${Number(count).toLocaleString('es-CO')})`;
      label.appendChild(countSpan);

      content.appendChild(label);
    }

    group.appendChild(content);
    return group;
  }

  renderDateTree(yearData, centuryFacet, decadeFacet) {
    // centuryFacet / decadeFacet: pagefind filter maps from dedicated
    // entity-level century/decade tags. Each entity contributes once per
    // century/decade it spans, so these counts represent unique entities.
    // The year-level data is unchanged (single year per entity per year).
    centuryFacet = centuryFacet || {};
    decadeFacet = decadeFacet || {};
    const group = document.createElement('div');
    group.className = 'facet-group';

    const isOpen = this.facetGroupState.date !== false;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'facet-group-toggle';
    toggle.innerHTML = '<span class="facet-group-title">Fecha</span><span class="facet-group-indicator">' + (isOpen ? '\u2212' : '+') + '</span>';
    toggle.addEventListener('click', () => {
      this.facetGroupState.date = !this.facetGroupState.date;
      const content = group.querySelector('.facet-group-content');
      const indicator = toggle.querySelector('.facet-group-indicator');
      if (content) {
        content.style.display = this.facetGroupState.date ? '' : 'none';
        indicator.textContent = this.facetGroupState.date ? '\u2212' : '+';
      }
    });
    group.appendChild(toggle);

    const content = document.createElement('div');
    content.className = 'facet-group-content';
    content.style.display = isOpen ? '' : 'none';

    // Build century → decade → year hierarchy from flat year data
    const centuries = new Map();
    for (const [yearStr, count] of Object.entries(yearData)) {
      const year = parseInt(yearStr, 10);
      if (isNaN(year)) continue;
      if (count === 0) continue;
      const centuryNum = Math.floor(year / 100) + 1;
      const decadeBase = Math.floor(year / 10) * 10;

      if (!centuries.has(centuryNum)) {
        centuries.set(centuryNum, { decades: new Map(), total: 0, years: [] });
      }
      const century = centuries.get(centuryNum);
      century.total += count;
      century.years.push(yearStr);

      if (!century.decades.has(decadeBase)) {
        century.decades.set(decadeBase, new Map());
      }
      century.decades.get(decadeBase).set(yearStr, count);
    }

    const df = this.state.dateFilter;
    const tree = document.createElement('ul');
    tree.className = 'date-tree';

    const sortedCenturies = Array.from(centuries.entries()).sort((a, b) => a[0] - b[0]);

    for (const [centuryNum, centuryData] of sortedCenturies) {
      const centuryLabel = `Siglo ${this.romanCentury(centuryNum)}`;

      if (df && df.level === 'century' && df.label !== centuryLabel) continue;
      if (df && (df.level === 'decade' || df.level === 'year')) {
        const selectedYear = parseInt(df.years[0], 10);
        const selectedCentury = Math.floor(selectedYear / 100) + 1;
        if (selectedCentury !== centuryNum) continue;
      }

      const isCenturyActive = df && df.level === 'century' && df.label === centuryLabel;
      const existingYears = centuryData.years;

      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'date-tree-row';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'date-tree-toggle';
      const autoExpand = isCenturyActive || (df && (df.level === 'decade' || df.level === 'year'));
      toggleBtn.textContent = autoExpand ? '\u25BE' : '\u25B8';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'date-tree-checkbox';
      checkbox.checked = isCenturyActive;
      checkbox.addEventListener('change', () => {
        this.handleDateSelect(checkbox.checked ? {
          level: 'century', label: centuryLabel, years: existingYears
        } : null);
      });

      const label = document.createElement('span');
      label.className = 'date-tree-label';
      label.textContent = centuryLabel;

      const countSpan = document.createElement('span');
      countSpan.className = 'date-tree-count';
      const centuryEntityCount = centuryFacet[String(centuryNum)];
      const centuryDisplay = (centuryEntityCount != null ? centuryEntityCount : centuryData.total);
      countSpan.textContent = `(${Number(centuryDisplay).toLocaleString('es-CO')})`;

      row.appendChild(toggleBtn);
      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(countSpan);
      li.appendChild(row);

      // Decades
      const decadeList = document.createElement('ul');
      decadeList.className = 'date-tree-children' + (autoExpand ? '' : ' collapsed');

      const sortedDecades = Array.from(centuryData.decades.entries()).sort((a, b) => a[0] - b[0]);

      for (const [decadeBase, yearsMap] of sortedDecades) {
        const decadeLabel = `${decadeBase}s`;
        const decadeExistingYears = Array.from(yearsMap.keys());

        if (df && df.level === 'decade' && df.label !== decadeLabel) continue;
        if (df && df.level === 'year') {
          const selectedDecade = Math.floor(parseInt(df.years[0], 10) / 10) * 10;
          if (selectedDecade !== decadeBase) continue;
        }

        let decadeTotal = 0;
        for (const c of yearsMap.values()) decadeTotal += c;
        const decadeEntityCount = decadeFacet[String(decadeBase)];
        if (decadeEntityCount != null) decadeTotal = decadeEntityCount;

        const isDecadeActive = df && df.level === 'decade' && df.label === decadeLabel;
        const autoExpandDecade = isDecadeActive || (df && df.level === 'year');

        const decadeLi = document.createElement('li');
        const decadeRow = document.createElement('div');
        decadeRow.className = 'date-tree-row';

        const decadeToggle = document.createElement('button');
        decadeToggle.type = 'button';
        decadeToggle.className = 'date-tree-toggle';
        decadeToggle.textContent = autoExpandDecade ? '\u25BE' : '\u25B8';

        const decadeCb = document.createElement('input');
        decadeCb.type = 'checkbox';
        decadeCb.className = 'date-tree-checkbox';
        decadeCb.checked = isDecadeActive;
        decadeCb.addEventListener('change', () => {
          this.handleDateSelect(decadeCb.checked ? {
            level: 'decade', label: decadeLabel, years: decadeExistingYears
          } : null);
        });

        const decadeLabelSpan = document.createElement('span');
        decadeLabelSpan.className = 'date-tree-label';
        decadeLabelSpan.textContent = decadeLabel;

        const decadeCount = document.createElement('span');
        decadeCount.className = 'date-tree-count';
        decadeCount.textContent = `(${decadeTotal.toLocaleString('es-CO')})`;

        decadeRow.appendChild(decadeToggle);
        decadeRow.appendChild(decadeCb);
        decadeRow.appendChild(decadeLabelSpan);
        decadeRow.appendChild(decadeCount);
        decadeLi.appendChild(decadeRow);

        // Years
        const yearList = document.createElement('ul');
        yearList.className = 'date-tree-children' + (autoExpandDecade ? '' : ' collapsed');

        const sortedYears = Array.from(yearsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [yearStr, yearCount] of sortedYears) {
          if (df && df.level === 'year' && df.years[0] !== yearStr) continue;

          const isYearActive = df && df.level === 'year' && df.years[0] === yearStr;

          const yearLi = document.createElement('li');
          const yearRow = document.createElement('div');
          yearRow.className = 'date-tree-row';

          const spacer = document.createElement('span');
          spacer.className = 'date-tree-spacer';

          const yearCb = document.createElement('input');
          yearCb.type = 'checkbox';
          yearCb.className = 'date-tree-checkbox';
          yearCb.checked = isYearActive;
          yearCb.addEventListener('change', () => {
            this.handleDateSelect(yearCb.checked ? {
              level: 'year', label: yearStr, years: [yearStr]
            } : null);
          });

          const yearLabelSpan = document.createElement('span');
          yearLabelSpan.className = 'date-tree-label';
          yearLabelSpan.textContent = yearStr;

          const yearCountSpan = document.createElement('span');
          yearCountSpan.className = 'date-tree-count';
          yearCountSpan.textContent = `(${yearCount.toLocaleString('es-CO')})`;

          yearRow.appendChild(spacer);
          yearRow.appendChild(yearCb);
          yearRow.appendChild(yearLabelSpan);
          yearRow.appendChild(yearCountSpan);
          yearLi.appendChild(yearRow);
          yearList.appendChild(yearLi);
        }

        decadeLi.appendChild(yearList);

        decadeToggle.addEventListener('click', () => {
          const expanded = yearList.classList.contains('collapsed');
          yearList.classList.toggle('collapsed');
          decadeToggle.textContent = expanded ? '\u25BE' : '\u25B8';
        });

        decadeList.appendChild(decadeLi);
      }

      li.appendChild(decadeList);

      toggleBtn.addEventListener('click', () => {
        const expanded = decadeList.classList.contains('collapsed');
        decadeList.classList.toggle('collapsed');
        toggleBtn.textContent = expanded ? '\u25BE' : '\u25B8';
      });

      tree.appendChild(li);
    }

    content.appendChild(tree);
    group.appendChild(content);
    return group;
  }

  renderPills() {
    const hasFilters = this.state.q ||
      this.state.entity_type.length > 0 ||
      this.state.primary_function.length > 0 ||
      this.state.role.length > 0 ||
      this.state.dateFilter !== null;

    if (!hasFilters) return null;

    const container = document.createElement('div');
    container.className = 'active-filters';

    // Query pill
    if (this.state.q) {
      container.appendChild(this.createPill(
        `\u201C${this.state.q}\u201D`,
        () => {
          this.state.q = '';
          this.state.page = 1;
          this.updateUrl();
          this.search();
        }
      ));
    }

    // Entity type pills
    for (const t of this.state.entity_type) {
      container.appendChild(this.createPill(
        this.entityTypeLabels[t] || t,
        () => this.handlePillRemove('entity_type', t)
      ));
    }

    // Primary function pills
    for (const f of this.state.primary_function) {
      container.appendChild(this.createPill(
        f,
        () => this.handlePillRemove('primary_function', f)
      ));
    }

    // Role pills (multi-select — also update activeRoles set)
    for (const r of this.state.role) {
      container.appendChild(this.createPill(
        roleLabels[r] || r,
        () => {
          this.activeRoles.delete(r);
          this.state.role = this.state.role.filter(v => v !== r);
          this.state.page = 1;
          this.updateUrl();
          this.search();
        }
      ));
    }

    // Date filter pill
    if (this.state.dateFilter) {
      container.appendChild(this.createPill(
        this.state.dateFilter.label,
        () => {
          this.state.dateFilter = null;
          this.state.page = 1;
          this.updateUrl();
          this.search();
        }
      ));
    }

    // Clear all button
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'clear-filters-btn';
    clearBtn.textContent = 'Limpiar filtros';
    clearBtn.addEventListener('click', () => this.handleClearAll());
    container.appendChild(clearBtn);

    return container;
  }

  createPill(label, onRemove) {
    const pill = document.createElement('span');
    pill.className = 'filter-pill';

    const text = document.createElement('span');
    text.textContent = label;
    pill.appendChild(text);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'filter-pill-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.setAttribute('aria-label', `Eliminar filtro: ${label}`);
    removeBtn.addEventListener('click', onRemove);
    pill.appendChild(removeBtn);

    return pill;
  }

  renderPagination(data) {
    const nav = document.createElement('nav');
    nav.className = 'search-pagination';
    nav.setAttribute('aria-label', 'Paginacion');

    const currentPage = data.page;
    const totalPages = data.total_pages;

    if (currentPage > 1) {
      nav.appendChild(this.createPageLink('\u00AB', currentPage - 1));
    } else {
      nav.appendChild(this.createPageSpan('\u00AB', true));
    }

    const pages = this.getPageRange(currentPage, totalPages);
    for (const p of pages) {
      if (p === '...') {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '...';
        nav.appendChild(ellipsis);
      } else if (p === currentPage) {
        nav.appendChild(this.createPageSpan(p, false, true));
      } else {
        nav.appendChild(this.createPageLink(p, p));
      }
    }

    if (currentPage < totalPages) {
      nav.appendChild(this.createPageLink('\u00BB', currentPage + 1));
    } else {
      nav.appendChild(this.createPageSpan('\u00BB', true));
    }

    return nav;
  }

  getPageRange(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  createPageLink(label, page) {
    const a = document.createElement('a');
    a.className = 'pagination-link';
    a.href = '#';
    a.textContent = label;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      this.handlePageChange(page);
    });
    return a;
  }

  createPageSpan(label, disabled, active) {
    const span = document.createElement('span');
    span.className = 'pagination-link';
    if (disabled) span.classList.add('disabled');
    if (active) span.classList.add('active');
    span.textContent = label;
    return span;
  }

  renderNoResults() {
    const div = document.createElement('div');
    div.className = 'search-no-results';

    const msg = document.createElement('p');
    msg.textContent = 'No se encontraron entidades';
    div.appendChild(msg);

    const suggestion = document.createElement('p');
    suggestion.className = 'no-results-suggestion';
    suggestion.textContent = 'Intenta con otro termino o elimina algunos filtros.';
    div.appendChild(suggestion);

    return div;
  }

  // --- State displays ---

  showLoading() {
    const existingResults = this.container.querySelector('.search-results');
    if (existingResults) {
      existingResults.classList.add('results-loading');
      if (!existingResults.querySelector('.search-loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'search-loading-overlay';
        overlay.innerHTML = '<div class="search-spinner" aria-busy="true"></div>';
        existingResults.appendChild(overlay);
      }
      return;
    }
    this.container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'search-loading';
    div.innerHTML = '<div class="search-spinner" aria-busy="true"></div>';
    this.container.appendChild(div);
  }

  showError() {
    this.container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'search-error';

    const msg = document.createElement('p');
    msg.textContent = 'No se pudo cargar el indice';
    div.appendChild(msg);

    const hint = document.createElement('p');
    hint.textContent = 'Recarga la pagina para intentarlo de nuevo.';
    div.appendChild(hint);

    const retry = document.createElement('a');
    retry.href = '#';
    retry.textContent = 'Recargar';
    retry.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.reload();
    });
    div.appendChild(retry);

    this.container.appendChild(div);
  }

  // --- Event handlers ---

  handleFilterChange(stateKey, value, checked) {
    this.state[stateKey] = checked ? [value] : [];
    this.state.page = 1;
    this.updateUrl();
    this.search();
  }

  handlePillRemove(stateKey, value) {
    this.state[stateKey] = this.state[stateKey].filter(v => v !== value);
    this.state.page = 1;
    this.updateUrl();
    this.search();
  }

  handleDateSelect(filter) {
    this.state.dateFilter = filter;
    this.state.page = 1;
    this.updateUrl();
    this.search();
  }

  handleClearAll() {
    this.state.q = '';
    this.state.entity_type = [];
    this.state.primary_function = [];
    this.state.role = [];
    this.activeRoles.clear();
    this.state.dateFilter = null;
    this.state.page = 1;
    this.updateUrl();
    this.search();
  }

  handlePageChange(page) {
    this.state.page = page;
    this.updateUrl();
    this.search();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Utilities ---

  romanCentury(num) {
    const romans = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX',
      'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX',
      'XX', 'XXI', 'XXII'];
    return romans[num] || String(num);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// EntityExplorer is instantiated and initialised by the wiring script in
// entidades.njk, which controls initialization order relative to the graph.
