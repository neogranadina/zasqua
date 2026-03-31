/**
 * Entity-Document Network Graph
 *
 * Bipartite graph driven by the entity explorer's current results.
 * When the explorer renders a page of entities, this class fetches their
 * link shards, finds documents shared by 2+ visible entities, and renders
 * entity + document nodes with role edges using force-graph (2D canvas).
 *
 * Entity nodes: coloured by type (person/corporate/family)
 * Document nodes: small, muted — the archival descriptions connecting entities
 * Edges: entity → document, coloured by role
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

    // Shard cache: entity_code → [{ reference_code, title, … }]
    this._shardCache = new Map();
    this._currentEntityCodes = [];

    // Entity colours by type
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
    this.docColor = '#A09888';
    this.docHighlightColor = '#807060';

    this._canvasEl = null;
    this._headerEl = null;
    this._loadingEl = null;
    this._built = false;

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
    this._headerEl = document.createElement('div');
    this._headerEl.className = 'graph-panel-header';
    const heading = document.createElement('span');
    heading.className = 'graph-panel-heading';
    heading.textContent = 'Red de entidades y documentos';
    this._headerEl.appendChild(heading);
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-pill';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Restablecer vista';
    resetBtn.addEventListener('click', () => this.resetView());
    this._headerEl.appendChild(resetBtn);
    this.container.appendChild(this._headerEl);

    // Canvas
    const canvasWrap = document.createElement('div');
    canvasWrap.id = 'graph-canvas';
    canvasWrap.className = 'graph-canvas';
    this._canvasEl = canvasWrap;
    this._loadingEl = document.createElement('div');
    this._loadingEl.className = 'graph-loading';
    this._loadingEl.textContent = 'Esperando resultados\u2026';
    canvasWrap.appendChild(this._loadingEl);
    this.container.appendChild(canvasWrap);

    if (window.innerWidth > 768) {
      canvasWrap.classList.add('graph-expanded');
    }
  }

  // -------------------------------------------------------------------------
  // Explorer integration
  // -------------------------------------------------------------------------

  setExplorer(explorer) {
    this.explorer = explorer;

    // Patch updateUrl to dispatch filter-change events
    const origUpdateUrl = explorer.updateUrl.bind(explorer);
    explorer.updateUrl = () => {
      origUpdateUrl();
      document.dispatchEvent(new CustomEvent('entity-explorer:filter-change'));
    };

    // Listen for results rendering — the explorer calls renderSearchResults
    // after each search, so we patch it to notify us with the hits
    const origRender = explorer.renderSearchResults.bind(explorer);
    explorer.renderSearchResults = (data) => {
      origRender(data);
      this._onExplorerResults(data);
    };

    window.addEventListener('popstate', () => {
      // Explorer will re-search on popstate, which triggers renderSearchResults
    });

    // If the explorer already rendered results before we patched, replay them
    if (explorer._lastRenderData) {
      this._onExplorerResults(explorer._lastRenderData);
    }
  }

  async _onExplorerResults(data) {
    if (!data.hits || data.hits.length === 0) {
      this._showEmpty(data.browsePrompt
        ? 'La red se genera a partir de los resultados de búsqueda'
        : 'Sin resultados para mostrar en la red');
      return;
    }

    // Extract entity codes from hit URLs: /entidad/{code}/
    const entityCodes = data.hits
      .map(hit => {
        const m = (hit.url || '').match(/\/entidad\/([^/]+)\//);
        return m ? m[1] : null;
      })
      .filter(Boolean);

    if (entityCodes.length === 0) {
      this._showEmpty('Sin entidades para mostrar en la red');
      return;
    }

    this._currentEntityCodes = entityCodes;
    this._showLoading();

    try {
      await this._fetchAndBuild(entityCodes, data.hits);
    } catch (err) {
      console.error('EntityNetworkGraph: failed to build graph', err);
      this._showEmpty('No se pudo generar la red');
    }
  }

  async _fetchAndBuild(entityCodes, hits) {
    // Fetch shards for all entity codes (use cache)
    const shardPromises = entityCodes.map(async code => {
      if (this._shardCache.has(code)) return;
      try {
        const resp = await fetch(`/data/entity-links/${code}.json`);
        if (!resp.ok) {
          this._shardCache.set(code, []);
          return;
        }
        const links = await resp.json();
        this._shardCache.set(code, links);
      } catch {
        this._shardCache.set(code, []);
      }
    });
    await Promise.all(shardPromises);

    // Build entity metadata from hits
    const entityMeta = new Map();
    for (const hit of hits) {
      const m = (hit.url || '').match(/\/entidad\/([^/]+)\//);
      if (!m) continue;
      entityMeta.set(m[1], {
        label: hit.meta?.title || m[1],
        entityType: hit.meta?.entity_type || 'unknown',
        linkedCount: parseInt(hit.meta?.linked_count || '0', 10)
      });
    }

    // Find documents shared by 2+ visible entities
    const docEntities = new Map(); // reference_code → [{ entity, role, title, date, repo }]
    for (const code of entityCodes) {
      const links = this._shardCache.get(code) || [];
      for (const link of links) {
        if (!docEntities.has(link.reference_code)) docEntities.set(link.reference_code, []);
        docEntities.get(link.reference_code).push({
          entity: code,
          role: link.role || 'unknown',
          title: link.title || link.reference_code,
          date: link.date_expression || '',
          repository: link.repository_code || ''
        });
      }
    }

    // Keep only documents linked to 2+ of the visible entities
    const sharedDocs = new Map();
    for (const [refCode, entries] of docEntities) {
      const uniqueEntities = new Set(entries.map(e => e.entity));
      if (uniqueEntities.size >= 2) {
        sharedDocs.set(refCode, entries);
      }
    }

    if (sharedDocs.size === 0) {
      this._showEmpty('Estas entidades no comparten documentos');
      return;
    }

    // Build nodes
    const entityNodes = entityCodes
      .filter(code => {
        // Only include entities that appear in shared docs
        for (const [, entries] of sharedDocs) {
          if (entries.some(e => e.entity === code)) return true;
        }
        return false;
      })
      .map(code => {
        const meta = entityMeta.get(code) || {};
        let docCount = 0;
        for (const [, entries] of sharedDocs) {
          if (entries.some(e => e.entity === code)) docCount++;
        }
        return {
          id: code,
          type: 'entity',
          label: meta.label || code,
          entityType: meta.entityType || 'unknown',
          docCount,
          color: this.entityColors[meta.entityType] || '#8888CC'
        };
      });

    const docNodes = [];
    const edges = [];
    for (const [refCode, entries] of sharedDocs) {
      const first = entries[0];
      docNodes.push({
        id: refCode,
        type: 'document',
        label: first.title,
        date: first.date,
        repository: first.repository,
        entityCount: new Set(entries.map(e => e.entity)).size,
        color: this.docColor
      });

      // One edge per unique entity per document
      const seen = new Set();
      for (const entry of entries) {
        if (seen.has(entry.entity)) continue;
        seen.add(entry.entity);
        edges.push({
          source: entry.entity,
          target: refCode,
          role: entry.role
        });
      }
    }

    const nodes = [...entityNodes, ...docNodes];
    this._buildGraph(nodes, edges);
  }

  // -------------------------------------------------------------------------
  // Graph rendering
  // -------------------------------------------------------------------------

  _buildGraph(nodes, edges) {
    this._canvasEl.innerHTML = '';

    // Build adjacency for highlight lookups
    this._nodeNeighbours = new Map();
    this._nodeLinks = new Map();
    for (const link of edges) {
      for (const nid of [link.source, link.target]) {
        if (!this._nodeNeighbours.has(nid)) this._nodeNeighbours.set(nid, new Set());
        if (!this._nodeLinks.has(nid)) this._nodeLinks.set(nid, new Set());
      }
      this._nodeNeighbours.get(link.source).add(link.target);
      this._nodeNeighbours.get(link.target).add(link.source);
      this._nodeLinks.get(link.source).add(link);
      this._nodeLinks.get(link.target).add(link);
    }

    this.graphData = { nodes, links: edges.map(e => ({ ...e })) };

    const width = this._canvasEl.clientWidth || 800;
    const height = this._canvasEl.clientHeight || 400;

    this.fg = new ForceGraph(this._canvasEl)
      .width(width)
      .height(height)
      .graphData(this.graphData)
      .nodeId('id')
      .nodeLabel(node => this._nodeTooltip(node))
      .nodeVal(node => node.type === 'entity' ? 2 : 0.5)
      .nodeRelSize(3)
      .nodeColor(node => this._getNodeColor(node))
      .nodeCanvasObjectMode(node => {
        if (node.type === 'entity') return 'after';
        return undefined;
      })
      .nodeCanvasObject((node, ctx, globalScale) => {
        if (node.type !== 'entity') return;
        const show = globalScale > 1.5 ||
          node.id === this.hoveredNode ||
          this.highlightedNodes.has(node.id);
        if (!show) return;

        const fontSize = 10 / globalScale;
        ctx.font = `${fontSize}px DM Sans, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this.highlightedNodes.has(node.id) ? '#333' : '#777';
        const r = Math.sqrt(2) * 3;
        ctx.fillText(node.label, node.x, node.y + r / globalScale + 1);
      })
      .linkColor(link => this._getLinkColor(link))
      .linkWidth(link => this.highlightedLinks.has(link) ? 1.2 : 0.3)
      .enableNodeDrag(true)
      .enableZoomInteraction(true)
      .enablePanInteraction(true)
      .cooldownTime(5000)
      .d3AlphaDecay(0.02)
      .d3VelocityDecay(0.3)
      .onNodeHover(node => {
        this.hoveredNode = node ? node.id : null;
        this._canvasEl.style.cursor = node ? 'grab' : '';

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
        node.fx = node.x;
        node.fy = node.y;
      });

    // Configure forces
    this.fg.d3Force('charge').strength(-20);
    this.fg.d3Force('link').distance(20).strength(0.6);
    this.fg.d3Force('center').strength(0.3);

    // Resize handling
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._resizeObserver = new ResizeObserver(() => {
      if (this.fg && this._canvasEl.clientWidth > 0 && this._canvasEl.clientHeight > 0) {
        this.fg.width(this._canvasEl.clientWidth).height(this._canvasEl.clientHeight);
      }
    });
    this._resizeObserver.observe(this._canvasEl);

    this._built = true;
  }

  // -------------------------------------------------------------------------
  // Display helpers
  // -------------------------------------------------------------------------

  _showLoading() {
    if (this.fg) {
      this.fg._destructor && this.fg._destructor();
      this.fg = null;
    }
    this._canvasEl.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'graph-loading';
    el.textContent = 'Generando red\u2026';
    this._canvasEl.appendChild(el);
  }

  _showEmpty(message) {
    if (this.fg) {
      this.fg._destructor && this.fg._destructor();
      this.fg = null;
    }
    this._canvasEl.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'graph-loading';
    el.textContent = message;
    this._canvasEl.appendChild(el);
  }

  _nodeTooltip(node) {
    if (node.type === 'entity') {
      return `<strong>${this._escape(node.label)}</strong><br>${node.docCount} documento${node.docCount !== 1 ? 's' : ''} compartido${node.docCount !== 1 ? 's' : ''}`;
    }
    const title = node.label.length > 80 ? node.label.substring(0, 80) + '\u2026' : node.label;
    return `<strong>${this._escape(title)}</strong>${node.date ? '<br>' + node.date : ''}<br>${node.entityCount} entidades vinculadas`;
  }

  _getNodeColor(node) {
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
    if (this.highlightedLinks.has(link)) return '#888';
    if (this.highlightedNodes.size > 0) return 'rgba(0,0,0,0.03)';
    return '#E0DDD8';
  }

  resetView() {
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
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

  _escape(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
