/**
 * Entity-Document Network Graph
 *
 * Bipartite graph: entity nodes and document nodes connected by role edges.
 * Uses force-graph (2D) with live physics — nodes repel, links attract,
 * drag to move, scroll to zoom.
 *
 * Entity nodes: coloured by type (person/corporate/family)
 * Document nodes: small, grey — the archival descriptions at the heart of relationships
 * Edges: entity → document, labelled with role
 */

class EntityNetworkGraph {
  constructor(container) {
    this.container = container;
    this.explorer = null;
    this.fg = null;
    this.graphData = null;

    this.hoveredNode = null;
    this.highlightedNodes = new Set();
    this.highlightedLinks = new Set();

    // Entity colours by type — person burgundy, others periwinkle
    this.entityColors = {
      person: '#8B2942',
      corporate_body: '#6666BB',
      family: '#6666BB'
    };
    this.entityHighlightColors = {
      person: '#6B1F33',
      corporate_body: '#4444AA',
      family: '#4444AA'
    };
    // Document colour — muted but visible
    this.docColor = '#A09888';
    this.docHighlightColor = '#807060';

    // Role labels in Spanish
    this.roleLabels = {
      creator: 'productor',
      contributor: 'colaborador',
      publisher: 'editor',
      subject: 'materia',
      mentioned: 'mencionado',
      unknown: 'sin rol'
    };

    this.allRoles = ['creator', 'contributor', 'publisher', 'subject', 'mentioned'];
    this.hiddenRoles = new Set();

    // Active filters
    this.activeRepos = null;      // null = all, Set = selected
    this.activeCenturies = null;  // null = all, Set = selected
    this.activeEntityTypes = null; // null = all, Set = selected

    this._canvasEl = null;
    this.init();
  }

  init() {
    // Mobile toggle
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
      if (this.fg && expanded) {
        requestAnimationFrame(() => {
          this.fg.width(canvas.clientWidth).height(canvas.clientHeight);
        });
      }
    });
    this.container.appendChild(toggleBtn);

    // Header
    const header = document.createElement('div');
    header.className = 'graph-panel-header';
    const heading = document.createElement('span');
    heading.className = 'graph-panel-heading';
    heading.textContent = 'Red de entidades y documentos';
    header.appendChild(heading);
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-pill';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Restablecer vista';
    resetBtn.addEventListener('click', () => this.resetView());
    header.appendChild(resetBtn);
    this.container.appendChild(header);

    // Filters container — populated after data loads, each group is its own row
    this._filtersEl = document.createElement('div');
    this.container.appendChild(this._filtersEl);

    // Canvas
    const canvasWrap = document.createElement('div');
    canvasWrap.id = 'graph-canvas';
    canvasWrap.className = 'graph-canvas';
    this._canvasEl = canvasWrap;
    const loadingEl = document.createElement('div');
    loadingEl.className = 'graph-loading';
    loadingEl.textContent = 'Cargando red\u2026';
    canvasWrap.appendChild(loadingEl);
    this.container.appendChild(canvasWrap);

    if (window.innerWidth > 768) {
      canvasWrap.classList.add('graph-expanded');
    }

    // Fetch data
    fetch('/data/entity-doc-graph.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => this.buildGraph(data))
      .catch(err => {
        console.error('EntityNetworkGraph: failed to load graph data', err);
        canvasWrap.innerHTML = '';
        const errEl = document.createElement('div');
        errEl.className = 'graph-loading';
        errEl.innerHTML =
          '<strong>No se pudo cargar la red</strong><br>' +
          'Comprueba tu conexi\u00f3n e intenta recargar la p\u00e1gina.';
        canvasWrap.appendChild(errEl);
      });
  }

  buildGraph(data) {
    this._canvasEl.innerHTML = '';
    this._rawData = data;

    // Build filter UI from data metadata
    this._buildFilters(data.filters || {});

    // Build adjacency for highlight lookups
    this._nodeNeighbours = new Map();
    this._nodeLinks = new Map();
    for (const link of data.edges) {
      for (const nid of [link.source, link.target]) {
        if (!this._nodeNeighbours.has(nid)) this._nodeNeighbours.set(nid, new Set());
        if (!this._nodeLinks.has(nid)) this._nodeLinks.set(nid, new Set());
      }
      this._nodeNeighbours.get(link.source).add(link.target);
      this._nodeNeighbours.get(link.target).add(link.source);
      this._nodeLinks.get(link.source).add(link);
      this._nodeLinks.get(link.target).add(link);
    }

    // Find largest connected component — discard isolated clusters
    const allNodeIds = new Set(data.nodes.map(n => n.id));
    const visited = new Set();
    let largestComponent = new Set();

    for (const startId of allNodeIds) {
      if (visited.has(startId)) continue;
      const component = new Set();
      const queue = [startId];
      while (queue.length > 0) {
        const nid = queue.pop();
        if (component.has(nid)) continue;
        component.add(nid);
        visited.add(nid);
        const neighbours = this._nodeNeighbours.get(nid);
        if (neighbours) {
          for (const nb of neighbours) {
            if (!component.has(nb)) queue.push(nb);
          }
        }
      }
      if (component.size > largestComponent.size) largestComponent = component;
    }

    // Prepare node data — only largest component
    const nodes = data.nodes
      .filter(n => largestComponent.has(n.id))
      .map(n => ({
        ...n,
        color: n.type === 'entity'
          ? (this.entityColors[n.entityType] || '#8888CC')
          : this.docColor
      }));

    const nodeIdSet = new Set(nodes.map(n => n.id));
    const links = data.edges
      .filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map(e => ({ ...e }));

    this.graphData = { nodes, links };

    const width = this._canvasEl.clientWidth || 800;
    const height = this._canvasEl.clientHeight || 400;

    this.fg = new ForceGraph(this._canvasEl)
      .width(width)
      .height(height)
      .graphData(this.graphData)
      .nodeId('id')
      .nodeLabel(node => this._nodeTooltip(node))
      .nodeVal(node => node.type === 'entity' ? 6 : 1)
      .nodeRelSize(4)
      .nodeColor(node => this._getNodeColor(node))
      .nodeCanvasObjectMode(node => {
        // Draw labels for entities when zoomed or hovered
        if (node.type === 'entity') return 'after';
        return undefined;
      })
      .nodeCanvasObject((node, ctx, globalScale) => {
        if (node.type !== 'entity') return;
        const show = globalScale > 2.0 ||
          node.id === this.hoveredNode ||
          this.highlightedNodes.has(node.id);
        if (!show) return;

        const fontSize = 11 / globalScale;
        ctx.font = `${fontSize}px DM Sans, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.highlightedNodes.has(node.id) ? '#333' : '#777';
        const r = Math.sqrt(6) * 4; // entity nodeVal=6
        ctx.fillText(node.label, node.x, node.y + r / globalScale + 1);
      })
      .linkColor(link => this._getLinkColor(link))
      .linkWidth(link => this.highlightedLinks.has(link) ? 1.5 : 0.3)
      .enableNodeDrag(true)
      .enableZoomInteraction(true)
      .enablePanInteraction(true)
      .cooldownTime(8000)
      .d3AlphaDecay(0.015)
      .d3VelocityDecay(0.25)
      .onNodeHover(node => {
        this.hoveredNode = node ? node.id : null;
        this._canvasEl.style.cursor = node ? 'grab' : '';

        // Highlight neighbours on hover
        this.highlightedNodes.clear();
        this.highlightedLinks.clear();
        if (node) {
          this.highlightedNodes.add(node.id);
          const neighbours = this._nodeNeighbours.get(node.id);
          if (neighbours) neighbours.forEach(n => this.highlightedNodes.add(n));
          const nodeLinks = this._nodeLinks.get(node.id);
          if (nodeLinks) nodeLinks.forEach(l => this.highlightedLinks.add(l));
        }
      })
      .onNodeClick(node => {
        if (!node) return;
        if (node.type === 'entity') {
          window.location.href = `/entidad/${node.id}/`;
        } else if (node.type === 'document') {
          window.location.href = `/${node.id}/`;
        }
      })
      .onNodeDragEnd(node => {
        // Pin dragged node in place
        node.fx = node.x;
        node.fy = node.y;
      });

    // Configure forces
    this.fg.d3Force('charge').strength(-15);
    this.fg.d3Force('link').distance(15).strength(0.7);
    this.fg.d3Force('center').strength(0.4);

    // Resize handling
    this._resizeObserver = new ResizeObserver(() => {
      if (this.fg && this._canvasEl.clientWidth > 0 && this._canvasEl.clientHeight > 0) {
        this.fg.width(this._canvasEl.clientWidth).height(this._canvasEl.clientHeight);
      }
    });
    this._resizeObserver.observe(this._canvasEl);
  }

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  _buildFilters(filterMeta) {
    const el = this._filtersEl;
    el.innerHTML = '';

    const repoNames = {
      'co-ahr': 'AHR (Rionegro)',
      'co-ahrb': 'AHRB (Boyac\u00e1)',
      'co-ahjci': 'AHJCI (Istmina)',
      'co-cihjml': 'CIHJML (Popay\u00e1n)',
      'pe-bn': 'BNP (Per\u00fa)'
    };

    const centuryNames = {
      16: 'Siglo XVI', 17: 'Siglo XVII', 18: 'Siglo XVIII',
      19: 'Siglo XIX', 20: 'Siglo XX'
    };

    const entityTypeNames = {
      person: 'Personas',
      corporate: 'Instituciones',
      family: 'Familias'
    };

    // Archive filter
    if (filterMeta.repositories && filterMeta.repositories.length > 1) {
      this._addFilterGroup(el, 'Archivo', filterMeta.repositories, repoNames, 'repo');
    }

    // Century filter
    if (filterMeta.centuries && filterMeta.centuries.length > 1) {
      this._addFilterGroup(el, 'Siglo', filterMeta.centuries, centuryNames, 'century');
    }

    // Entity type filter
    if (filterMeta.entityTypes && filterMeta.entityTypes.length > 1) {
      this._addFilterGroup(el, 'Tipo', filterMeta.entityTypes, entityTypeNames, 'entityType');
    }
  }

  _addFilterGroup(container, label, values, nameMap, filterKey) {
    const row = document.createElement('div');
    row.className = 'graph-role-filters';

    const groupLabel = document.createElement('span');
    groupLabel.className = 'filter-label';
    groupLabel.textContent = label;
    row.appendChild(groupLabel);

    for (const val of values) {
      const lbl = document.createElement('label');
      lbl.className = 'graph-role-filter-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.filterKey = filterKey;
      cb.dataset.filterValue = String(val);
      cb.addEventListener('change', () => this._applyFilters());
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(nameMap[val] || String(val)));
      row.appendChild(lbl);
    }

    container.appendChild(row);
  }

  _applyFilters() {
    const checkboxes = this._filtersEl.querySelectorAll('input[type="checkbox"]');

    // Group by filter key
    const groups = {};
    for (const cb of checkboxes) {
      const key = cb.dataset.filterKey;
      if (!groups[key]) groups[key] = { all: [], checked: [] };
      groups[key].all.push(cb.dataset.filterValue);
      if (cb.checked) groups[key].checked.push(cb.dataset.filterValue);
    }

    // Set active filters (null = all selected = no filtering)
    this.activeRepos = groups.repo
      ? (groups.repo.checked.length === groups.repo.all.length ? null : new Set(groups.repo.checked))
      : null;
    this.activeCenturies = groups.century
      ? (groups.century.checked.length === groups.century.all.length ? null : new Set(groups.century.checked.map(Number)))
      : null;
    this.activeEntityTypes = groups.entityType
      ? (groups.entityType.checked.length === groups.entityType.all.length ? null : new Set(groups.entityType.checked))
      : null;

    // Trigger re-render
    if (this.fg) this.fg.nodeColor(this.fg.nodeColor());
  }

  _isDocHidden(node) {
    if (node.type !== 'document') return false;
    if (this.activeRepos && !this.activeRepos.has(node.repository)) return true;
    if (this.activeCenturies && !this.activeCenturies.has(node.century)) return true;
    return false;
  }

  _isEntityHidden(node) {
    if (node.type !== 'entity') return false;
    if (this.activeEntityTypes && !this.activeEntityTypes.has(node.entityType)) return true;
    return false;
  }

  _isNodeHidden(node) {
    return this._isDocHidden(node) || this._isEntityHidden(node);
  }

  _nodeTooltip(node) {
    if (node.type === 'entity') {
      return `<strong>${this._escape(node.label)}</strong><br>${node.docCount} documento${node.docCount !== 1 ? 's' : ''} en la red`;
    }
    const title = node.label.length > 80 ? node.label.substring(0, 80) + '\u2026' : node.label;
    return `<strong>${this._escape(title)}</strong>${node.date ? '<br>' + node.date : ''}<br>${node.entityCount} entidades vinculadas`;
  }

  _getNodeColor(node) {
    // Hidden by filter — nearly invisible
    if (this._isNodeHidden(node)) return 'rgba(0,0,0,0.03)';
    // Faded by highlight
    if (this.highlightedNodes.size > 0 && !this.highlightedNodes.has(node.id)) {
      return node.type === 'entity' ? '#DDD8E0' : '#E8E4E0';
    }
    if (this.highlightedNodes.has(node.id) && node.type === 'entity') {
      return this.entityHighlightColors[node.entityType] || '#6666BB';
    }
    if (this.highlightedNodes.has(node.id) && node.type === 'document') {
      return this.docHighlightColor;
    }
    return node.color;
  }

  _getLinkColor(link) {
    // Check if either endpoint is filtered out
    const s = typeof link.source === 'object' ? link.source : null;
    const t = typeof link.target === 'object' ? link.target : null;
    if ((s && this._isNodeHidden(s)) || (t && this._isNodeHidden(t))) return 'rgba(0,0,0,0)';

    const role = link.role || 'unknown';
    if (this.hiddenRoles.has(role)) return 'rgba(0,0,0,0)';
    if (this.highlightedLinks.has(link)) return '#888';
    if (this.highlightedNodes.size > 0) return 'rgba(0,0,0,0.03)';
    return '#E0DDD8';
  }

  updateRoleFilters() {
    this.hiddenRoles.clear();
    const checkboxes = this.container.querySelectorAll(
      '.graph-role-filter-label input[type="checkbox"]'
    );
    for (const cb of checkboxes) {
      if (!cb.checked) this.hiddenRoles.add(cb.value);
    }
    // Re-filter: hide document nodes that have no visible edges
    if (this.fg) this.fg.nodeColor(this.fg.nodeColor());
  }

  resetView() {
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
    // Unpin all nodes
    if (this.graphData) {
      for (const node of this.graphData.nodes) {
        node.fx = undefined;
        node.fy = undefined;
      }
    }
    if (this.fg) {
      this.fg.d3ReheatSimulation();
      this.fg.zoomToFit(300, 40);
    }
  }

  // -------------------------------------------------------------------------
  // Filter sync with EntityExplorer
  // -------------------------------------------------------------------------

  setExplorer(explorer) {
    this.explorer = explorer;
    const origUpdateUrl = explorer.updateUrl.bind(explorer);
    explorer.updateUrl = () => {
      origUpdateUrl();
      document.dispatchEvent(new CustomEvent('entity-explorer:filter-change', {
        detail: explorer.state
      }));
    };
    document.addEventListener('entity-explorer:filter-change', e => this.syncFilters(e.detail));
    window.addEventListener('popstate', () => {
      if (this.explorer) requestAnimationFrame(() => this.syncFilters(this.explorer.state));
    });
  }

  syncFilters(state) {
    // Future: suppress graph nodes based on explorer filter state
  }

  _escape(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
