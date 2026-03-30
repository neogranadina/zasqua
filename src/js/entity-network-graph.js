/**
 * Entity Network Graph
 *
 * Renders the entity co-occurrence network on the entity explorer page using
 * Sigma.js v3 and graphology. Reads pre-computed ForceAtlas2 x/y positions
 * from /data/entity-cooccurrence.json — no browser-side force simulation.
 *
 * Interactions:
 *   - Hover node: tooltip with entity name + document count
 *   - Single click: expand 1-hop ego-network (non-neighbours faded)
 *   - Double-click: navigate to /entidad/{code}/
 *   - Click canvas: collapse ego-network
 *   - Hover edge: tooltip with both endpoints and role-pair breakdown
 *   - Role filter checkboxes: show/hide edges by relationship type
 *   - Mobile toggle: collapse/expand the graph panel
 *   - Reset view: animate camera back to default
 *
 * Filter sync: listens to entity-explorer:filter-change custom event and
 * suppresses graph nodes that do not match the active search/facet state.
 */

class EntityNetworkGraph {
  constructor(container) {
    this.container = container;
    this.explorer = null;

    this.sigma = null;
    this.graph = null;
    this.cooccurrenceData = null;

    this.highlightedNodes = new Set();
    this.hiddenRoles = new Set();
    this.suppressedNodes = new Set();
    this.starterNodeSet = new Set();

    // Double-click guard (Pitfall 3)
    this.lastClickTime = 0;
    this._pendingClickTimeout = null;

    // Node colours by entity type
    this.nodeColors = {
      person: '#8B2942',
      corporate_body: '#5B6FB0',
      family: '#7A5C3A'
    };

    // Suppressed (faded) node colours — approximate fill-opacity 0.12 on white
    this.suppressedColors = {
      person: '#F5E6EA',
      corporate_body: '#EEF0F6',
      family: '#F2EFE9'
    };

    // Edge colours by dominant role pair (alphabetically normalised keys)
    this.edgeColorMap = {
      'creator|creator': '#6B1F33',
      'creator|subject': '#C47C2B',
      'creator|mentioned': '#B09050',
      'contributor|creator': '#3E7C7A',
      'creator|publisher': '#5A6E85'
    };
    this.defaultEdgeColor = '#8A8580';

    // Spanish role labels
    this.roleLabels = {
      creator: 'productor',
      contributor: 'colaborador',
      publisher: 'editor',
      subject: 'materia',
      mentioned: 'mencionado'
    };

    this.allRoles = ['creator', 'contributor', 'publisher', 'subject', 'mentioned'];

    this._tooltipEl = null;
    this._canvasEl = null;

    this.init();
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  init() {
    // Mobile toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-filter-toggle graph-mobile-toggle';
    toggleBtn.type = 'button';
    toggleBtn.textContent = 'Mostrar red de entidades';
    toggleBtn.addEventListener('click', () => {
      const canvas = this._canvasEl;
      if (!canvas) return;
      const expanded = canvas.classList.toggle('graph-expanded');
      toggleBtn.textContent = expanded
        ? 'Ocultar red de entidades'
        : 'Mostrar red de entidades';
    });
    this.container.appendChild(toggleBtn);

    // Panel header (heading + reset button)
    const header = document.createElement('div');
    header.className = 'graph-panel-header';

    const heading = document.createElement('span');
    heading.className = 'graph-panel-heading';
    heading.textContent = 'Red de co-ocurrencia';
    header.appendChild(heading);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-pill';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Restablecer vista';
    resetBtn.addEventListener('click', () => this.resetView());
    header.appendChild(resetBtn);

    this.container.appendChild(header);

    // Role filters
    const roleFilters = document.createElement('div');
    roleFilters.className = 'graph-role-filters';

    const filterLabel = document.createElement('span');
    filterLabel.className = 'filter-label';
    filterLabel.textContent = 'Filtrar por tipo de relaci\u00f3n';
    roleFilters.appendChild(filterLabel);

    const roleDisplayNames = {
      creator: 'Productor',
      contributor: 'Colaborador',
      publisher: 'Editor',
      subject: 'Materia',
      mentioned: 'Mencionado'
    };

    for (const role of this.allRoles) {
      const label = document.createElement('label');
      label.className = 'graph-role-filter-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.value = role;
      checkbox.addEventListener('change', () => this.updateRoleFilters());

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(roleDisplayNames[role]));
      roleFilters.appendChild(label);
    }

    this.container.appendChild(roleFilters);

    // Graph canvas container
    const canvasWrap = document.createElement('div');
    canvasWrap.id = 'graph-canvas';
    canvasWrap.className = 'graph-canvas';
    this._canvasEl = canvasWrap;

    const loadingEl = document.createElement('div');
    loadingEl.className = 'graph-loading';
    loadingEl.textContent = 'Cargando red\u2026';
    canvasWrap.appendChild(loadingEl);

    this.container.appendChild(canvasWrap);

    // On desktop, expand by default
    if (window.innerWidth > 768) {
      canvasWrap.classList.add('graph-expanded');
    }

    // Fetch co-occurrence data
    fetch('/data/entity-cooccurrence.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        this.cooccurrenceData = data;
        this.buildGraph();
      })
      .catch(err => {
        console.error('EntityNetworkGraph: failed to load co-occurrence data', err);
        canvasWrap.innerHTML = '';
        const errEl = document.createElement('div');
        errEl.className = 'graph-loading';
        errEl.innerHTML =
          '<strong>No se pudo cargar la red</strong><br>' +
          'Comprueba tu conexi\u00f3n e intenta recargar la p\u00e1gina.';
        canvasWrap.appendChild(errEl);
      });
  }

  // -------------------------------------------------------------------------
  // Graph construction
  // -------------------------------------------------------------------------

  buildGraph() {
    const data = this.cooccurrenceData;
    if (!data || !data.nodes || !data.edges) return;

    // Build degree map from edges
    const degreeMap = {};
    for (const node of data.nodes) {
      degreeMap[node.id] = 0;
    }
    for (const edge of data.edges) {
      degreeMap[edge.source] = (degreeMap[edge.source] || 0) + 1;
      degreeMap[edge.target] = (degreeMap[edge.target] || 0) + 1;
    }

    // Top 100 nodes by degree
    const sortedNodes = [...data.nodes].sort(
      (a, b) => (degreeMap[b.id] || 0) - (degreeMap[a.id] || 0)
    );
    const topNodes = sortedNodes.slice(0, 100);
    const topNodeIds = new Set(topNodes.map(n => n.id));
    this.starterNodeSet = topNodeIds;

    // Subset edges to those connecting top-100 nodes
    const starterEdges = data.edges.filter(
      e => topNodeIds.has(e.source) && topNodeIds.has(e.target)
    );

    // Create graphology graph
    const Graph = graphology.Graph;
    this.graph = new Graph();

    for (const node of topNodes) {
      this.graph.addNode(node.id, {
        x: node.x,
        y: node.y,
        size: Math.max(3, Math.sqrt(node.count || 1) * 2),
        color: this.nodeColors[node.type] || '#8A8580',
        label: node.label,
        type: node.type,
        count: node.count || 0,
        entityId: node.id
      });
    }

    for (const edge of starterEdges) {
      // Skip self-loops
      if (edge.source === edge.target) continue;
      const edgeKey = `${edge.source}--${edge.target}`;
      // Skip duplicate edges (graphology throws on duplicate)
      if (this.graph.hasEdge(edge.source, edge.target)) continue;
      this.graph.addEdge(edge.source, edge.target, {
        size: Math.max(1, Math.log2((edge.weight || 1) + 1)),
        color: this.getEdgeColor(edge.role_pairs || {}),
        weight: edge.weight || 1,
        role_pairs: edge.role_pairs || {}
      });
    }

    // Clear loading state
    this._canvasEl.innerHTML = '';

    // Build node and edge reducers as closures (arrow functions capture `this`)
    const nodeReducer = (node, data) => {
      if (this.highlightedNodes.size > 0) {
        if (this.highlightedNodes.has(node)) {
          return { ...data, zIndex: 1 };
        }
        return {
          ...data,
          color: this.suppressedColors[data.type] || '#EDEDED',
          size: data.size * 0.6,
          zIndex: 0,
          label: null
        };
      }
      if (this.suppressedNodes.has(node)) {
        return {
          ...data,
          color: this.suppressedColors[data.type] || '#EDEDED',
          size: data.size * 0.6,
          label: null
        };
      }
      if (this.isNodeHiddenByRoleFilters(node)) {
        return {
          ...data,
          color: this.suppressedColors[data.type] || '#EDEDED',
          size: data.size * 0.6,
          label: null
        };
      }
      return data;
    };

    const edgeReducer = (edge, data) => {
      if (this.isEdgeHiddenByRoleFilters(edge)) {
        return { ...data, hidden: true };
      }
      if (this.highlightedNodes.size > 0) {
        const source = this.graph.source(edge);
        const target = this.graph.target(edge);
        if (this.highlightedNodes.has(source) && this.highlightedNodes.has(target)) {
          return { ...data, zIndex: 1 };
        }
        return { ...data, hidden: true };
      }
      return data;
    };

    // Create Sigma instance (Pitfall 2: edge events must be enabled explicitly)
    this.sigma = new Sigma(this.graph, this._canvasEl, {
      enableEdgeHoverEvents: true,
      enableEdgeClickEvents: true,
      defaultEdgeColor: '#8A8580',
      labelFont: 'DM Sans',
      labelSize: 12,
      renderLabels: true,
      nodeReducer,
      edgeReducer
    });

    // Register event handlers
    this.sigma.on('enterNode', event => this.showNodeTooltip(event.node, event.event));
    this.sigma.on('leaveNode', () => this.hideTooltip());
    this.sigma.on('enterEdge', event => this.showEdgeTooltip(event.edge, event.event));
    this.sigma.on('leaveEdge', () => this.hideTooltip());

    // Single/double-click guard (Pitfall 3)
    this.sigma.on('clickNode', event => {
      const now = Date.now();
      if (now - this.lastClickTime < 300) {
        // Double-click detected — cancel pending single-click
        if (this._pendingClickTimeout) {
          clearTimeout(this._pendingClickTimeout);
          this._pendingClickTimeout = null;
        }
        const entityId = this.graph.getNodeAttribute(event.node, 'entityId');
        window.location.href = `/entidad/${entityId}/`;
      } else {
        this.lastClickTime = now;
        this._pendingClickTimeout = setTimeout(() => {
          this._pendingClickTimeout = null;
          this.expandEgoNetwork(event.node);
        }, 250);
      }
    });

    this.sigma.on('doubleClickNode', event => {
      // Prevent Sigma default zoom
      event.preventSigmaDefault && event.preventSigmaDefault();
      const entityId = this.graph.getNodeAttribute(event.node, 'entityId');
      window.location.href = `/entidad/${entityId}/`;
    });

    this.sigma.on('clickStage', () => this.collapseEgoNetwork());
  }

  // -------------------------------------------------------------------------
  // Edge/node colour helpers
  // -------------------------------------------------------------------------

  getEdgeColor(rolePairs) {
    if (!rolePairs || typeof rolePairs !== 'object') return this.defaultEdgeColor;
    let dominantKey = null;
    let dominantCount = -1;
    for (const [key, count] of Object.entries(rolePairs)) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantKey = key;
      }
    }
    if (!dominantKey) return this.defaultEdgeColor;
    // Normalise key — sort alphabetically
    const parts = dominantKey.split('|');
    if (parts.length === 2) {
      const normKey = parts.sort().join('|');
      if (this.edgeColorMap[normKey]) return this.edgeColorMap[normKey];
    }
    return this.defaultEdgeColor;
  }

  // -------------------------------------------------------------------------
  // Role filter logic
  // -------------------------------------------------------------------------

  isEdgeHiddenByRoleFilters(edge) {
    if (this.hiddenRoles.size === 0) return false;
    const attrs = this.graph.getEdgeAttributes(edge);
    const rolePairs = attrs.role_pairs || {};
    // If at least one role pair has both roles visible, edge is visible
    for (const key of Object.keys(rolePairs)) {
      const parts = key.split('|');
      if (parts.every(r => !this.hiddenRoles.has(r))) {
        return false;
      }
    }
    // If no role pairs, edge has no role metadata — treat as visible
    if (Object.keys(rolePairs).length === 0) return false;
    return true;
  }

  isNodeHiddenByRoleFilters(node) {
    if (this.hiddenRoles.size === 0) return false;
    const edges = this.graph.edges(node);
    if (edges.length === 0) return false;
    return edges.every(edge => this.isEdgeHiddenByRoleFilters(edge));
  }

  updateRoleFilters() {
    this.hiddenRoles.clear();
    const checkboxes = this.container.querySelectorAll(
      '.graph-role-filter-label input[type="checkbox"]'
    );
    for (const cb of checkboxes) {
      if (!cb.checked) this.hiddenRoles.add(cb.value);
    }
    if (this.sigma) this.sigma.refresh();
  }

  // -------------------------------------------------------------------------
  // Ego-network
  // -------------------------------------------------------------------------

  expandEgoNetwork(nodeId) {
    if (!this.graph || !this.sigma) return;
    const neighbors = this.graph.neighbors(nodeId);
    this.highlightedNodes = new Set([nodeId, ...neighbors]);

    // Compute bounding box for camera zoom-to-fit
    const positions = [...this.highlightedNodes].map(n => ({
      x: this.graph.getNodeAttribute(n, 'x'),
      y: this.graph.getNodeAttribute(n, 'y')
    }));

    if (positions.length > 0) {
      const xs = positions.map(p => p.x);
      const ys = positions.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const spanX = maxX - minX || 1;
      const spanY = maxY - minY || 1;
      // Ratio: smaller value = more zoomed in; add padding
      const ratio = Math.max(spanX, spanY) * 0.6;
      this.sigma.getCamera().animate(
        { x: cx, y: cy, ratio },
        { duration: 300 }
      );
    }

    this.sigma.refresh();
  }

  collapseEgoNetwork() {
    this.highlightedNodes.clear();
    if (this.sigma) this.sigma.refresh();
  }

  // -------------------------------------------------------------------------
  // Tooltips
  // -------------------------------------------------------------------------

  _ensureTooltip() {
    if (!this._tooltipEl) {
      const el = document.createElement('div');
      el.className = 'graph-tooltip';
      el.style.display = 'none';
      this.container.appendChild(el);
      this._tooltipEl = el;
    }
    return this._tooltipEl;
  }

  showNodeTooltip(nodeId, mouseEvent) {
    const attrs = this.graph.getNodeAttributes(nodeId);
    const tooltip = this._ensureTooltip();
    const count = attrs.count || 0;
    const plural = count !== 1 ? 's' : '';
    tooltip.innerHTML =
      `<div class="graph-tooltip-name">${this._escape(attrs.label)}</div>` +
      `<div class="graph-tooltip-meta">${count} documento${plural}</div>`;
    this._positionTooltip(tooltip, mouseEvent);
  }

  showEdgeTooltip(edgeId, mouseEvent) {
    const attrs = this.graph.getEdgeAttributes(edgeId);
    const sourceId = this.graph.source(edgeId);
    const targetId = this.graph.target(edgeId);
    const labelA = this.graph.getNodeAttribute(sourceId, 'label') || sourceId;
    const labelB = this.graph.getNodeAttribute(targetId, 'label') || targetId;
    const weight = attrs.weight || 1;

    let html =
      `<div class="graph-tooltip-name">` +
      `${this._escape(labelA)} \u2194 ${this._escape(labelB)}: ${weight} documentos` +
      `</div>`;

    const rolePairs = attrs.role_pairs || {};
    // Sort role pairs descending by count
    const sortedPairs = Object.entries(rolePairs).sort((a, b) => b[1] - a[1]);
    for (const [key, count] of sortedPairs) {
      const parts = key.split('|');
      const roleA = this.roleLabels[parts[0]] || parts[0];
      const roleB = this.roleLabels[parts[1]] || parts[1];
      html += `<div class="graph-tooltip-meta">${count} ${roleA}/${roleB}</div>`;
    }

    const tooltip = this._ensureTooltip();
    tooltip.innerHTML = html;
    this._positionTooltip(tooltip, mouseEvent);
  }

  hideTooltip() {
    if (this._tooltipEl) {
      this._tooltipEl.style.display = 'none';
    }
  }

  _positionTooltip(tooltip, mouseEvent) {
    const canvasRect = this._canvasEl.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const clientX = mouseEvent.clientX || (mouseEvent.x || 0);
    const clientY = mouseEvent.clientY || (mouseEvent.y || 0);
    const x = clientX - containerRect.left + 12;
    const y = clientY - containerRect.top + 12;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.display = 'block';
  }

  _escape(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // -------------------------------------------------------------------------
  // Reset view
  // -------------------------------------------------------------------------

  resetView() {
    if (!this.sigma) return;
    this.sigma.getCamera().animate(
      { x: 0.5, y: 0.5, ratio: 1 },
      { duration: 300 }
    );
  }

  // -------------------------------------------------------------------------
  // Filter sync with EntityExplorer
  // -------------------------------------------------------------------------

  setExplorer(explorer) {
    this.explorer = explorer;

    // Patch explorer.updateUrl to dispatch a filter-change event
    const origUpdateUrl = explorer.updateUrl.bind(explorer);
    explorer.updateUrl = () => {
      origUpdateUrl();
      document.dispatchEvent(new CustomEvent('entity-explorer:filter-change', {
        detail: explorer.state
      }));
    };

    document.addEventListener('entity-explorer:filter-change', e => {
      this.syncFilters(e.detail);
    });

    window.addEventListener('popstate', () => {
      if (this.explorer) {
        // Wait for explorer to parse URL and update state
        requestAnimationFrame(() => this.syncFilters(this.explorer.state));
      }
    });
  }

  syncFilters(state) {
    if (!this.graph || !this.sigma) return;

    this.suppressedNodes.clear();
    const hasFilters =
      state.q ||
      state.entity_type.length > 0 ||
      state.primary_function.length > 0 ||
      state.dateFilter;

    if (!hasFilters) {
      this.sigma.refresh();
      return;
    }

    this.graph.forEachNode((node, attrs) => {
      let dominated = false;
      if (state.entity_type.length > 0 && !state.entity_type.includes(attrs.type)) {
        dominated = true;
      }
      if (state.q && !attrs.label.toLowerCase().includes(state.q.toLowerCase())) {
        dominated = true;
      }
      if (dominated) this.suppressedNodes.add(node);
    });

    this.sigma.refresh();
  }
}
