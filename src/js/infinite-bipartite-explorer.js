(function () {
  'use strict';

  // Shared constants — replicated from entity.js
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

  var entityColors = {
    person: '#8B2942',
    corporate_body: '#6666BB',
    corporate: '#6666BB',
    family: '#6666BB'
  };

  var DOC_COLOR = '#A09888';
  var OVERFLOW_COLOR = '#C0B8A8';
  var MAX_INITIAL_DOCS = 30;
  var MAX_EXPAND_ENTITIES = 15;
  var MAX_HOPS = 3;
  var DEFAULT_ENTITY = 'ne-69501';

  // -----------------------------------------------------------------------
  // InfiniteBipartiteExplorer
  // -----------------------------------------------------------------------

  function InfiniteBipartiteExplorer(container) {
    this.container = container;
    this.tooltipEl = document.getElementById('graph-tooltip');
    this.legendEl = document.getElementById('graph-legend');

    // Graph state
    this.graphInstance = null;
    this.graphNodes = new Map();   // id -> node object
    this.graphEdges = [];          // [{source, target, role}]
    this.nodeNeighbours = new Map(); // id -> Set of neighbour ids
    this.nodeLinks = new Map();    // id -> Set of link objects

    // Caches
    this.shardCache = new Map();   // entityCode -> links array
    this.descLookup = new Map();   // refCode -> [entityCodes]
    this.entityMeta = new Map();   // entityCode -> {label, entity_type, linked_count}

    // State
    this.focalEntityCode = null;
    this.hopDistance = new Map();
    this.hoveredNode = null;
    this.selectedNode = null;

    // Callbacks (wired by Plan 04)
    this.onEntityFocused = null;
    this.onFiltersNeeded = null;
  }

  // -----------------------------------------------------------------------
  // Initialisation
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.init = async function () {
    var self = this;

    // Expandability checks are lazy (Pagefind on hover) — matches entity.js
    // pattern. No upfront fetch of any large lookup file.
    this.descLookup = new Map();
    this.expandableCache = new Map(); // refCode → array of entity codes
    this.pagefindDesc = null;

    // Determine starting entity
    var startingEntity = DEFAULT_ENTITY;
    var urlParam = new URLSearchParams(location.search).get('entidad');
    if (urlParam) {
      startingEntity = urlParam;
    } else {
      try {
        var cg = await fetch('/data/curated-entity-graph.json');
        if (cg.ok) {
          var cgData = await cg.json();
          if (cgData.nodes && cgData.nodes.length > 0) {
            startingEntity = cgData.nodes[0].id;
          }
        }
      } catch (e) {
        // fall back to DEFAULT_ENTITY
      }
    }

    this.initGraph();
    await this.loadEntity(startingEntity);

    // Fire focal callback so the sidebar/overlay shows the initial entity
    // immediately, not just after the user clicks something.
    if (this.onEntityFocused) {
      this.onEntityFocused(startingEntity, this.entityMeta.get(startingEntity) || null);
    }

    // Force dimension update after layout settles. Force-graph reads container
    // dimensions at construction; if flexbox hadn't computed yet, the canvas
    // gets stuck at small internal pixel size and CSS-upscales. Update on
    // multiple animation frames to catch async layout.
    var updateSize = function () {
      if (!self.graphInstance) return;
      var rect = self.container.getBoundingClientRect();
      var w = Math.round(rect.width);
      var h = Math.round(rect.height);
      if (w > 0 && h > 0) {
        self.graphInstance.width(w).height(h);
      }
    };
    requestAnimationFrame(function () {
      updateSize();
      requestAnimationFrame(function () {
        updateSize();
        // Use zoom(1) instead of zoomToFit — fit can produce extreme zooms
        // for sparse graphs which makes everything appear at wrong scale.
        if (self.graphInstance) self.graphInstance.zoom(1);
      });
    });

    this.renderLegend();

    // Back button navigation (D-18)
    window.addEventListener('popstate', function (e) {
      if (e.state && e.state.entidad) {
        self.refocusOn(e.state.entidad);
      }
    });
  };

  // -----------------------------------------------------------------------
  // Graph initialisation
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.initGraph = function () {
    var self = this;

    // ForceGraph is loaded via CDN as window.ForceGraph
    /* global ForceGraph */
    var initialWidth = this.container.clientWidth || 800;
    var initialHeight = this.container.clientHeight || 600;
    this.graphInstance = new ForceGraph(this.container)
      .width(initialWidth)
      .height(initialHeight)
      .graphData({ nodes: [], links: [] })
      .nodeId('id')
      .nodeCanvasObjectMode(function () { return 'replace'; })
      .nodeCanvasObject(this.drawNode.bind(this))
      .nodePointerAreaPaint(this.drawNodeHitArea.bind(this))
      .d3AlphaDecay(0.02)    // D-41
      .d3VelocityDecay(0.3)  // D-41
      // NO .cooldownTime() — omit entirely for continuous simulation (D-40, CRITICAL)
      // NO .onEngineStop()  — omit entirely (D-40, CRITICAL)
      .onNodeHover(this.handleHover.bind(this))
      .onNodeClick(this.handleNodeClick.bind(this))
      .onNodeDragEnd(function (node) { node.fx = node.x; node.fy = node.y; })  // D-43
      .onZoom(this.updateTooltipPosition.bind(this))
      .onBackgroundClick(this.dismissTooltip.bind(this))
      .linkColor(function () { return 'rgba(160,152,136,0.3)'; })
      .linkWidth(1);

    this.graphInstance.d3Force('charge').strength(-20);  // D-41
    this.graphInstance.d3Force('link').distance(20).strength(0.5);  // D-41

    // Resize observer — use getBoundingClientRect for sub-pixel accuracy
    new ResizeObserver(function () {
      if (!self.graphInstance) return;
      var rect = self.container.getBoundingClientRect();
      var w = Math.round(rect.width);
      var h = Math.round(rect.height);
      if (w > 0 && h > 0) {
        self.graphInstance.width(w).height(h);
      }
    }).observe(this.container);
  };

  // -----------------------------------------------------------------------
  // Node rendering (canvas)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.drawNode = function (node, ctx, globalScale) {
    // Visibility: _visible flag (set by applyFilters)
    if (node._visible === false) return;

    // Hover dimming
    var opacity;
    if (this.hoveredNode && node.id !== this.hoveredNode.id) {
      var neighbours = this.nodeNeighbours.get(this.hoveredNode.id);
      var isNeighbour = neighbours && neighbours.has(node.id);
      opacity = isNeighbour ? 1.0 : 0.15;
    } else {
      opacity = 1.0;
    }

    ctx.globalAlpha = opacity;

    // All sizes are SCREEN pixels divided by globalScale (force-graph
    // pre-applies the zoom transform to ctx, so dividing by globalScale
    // produces a constant on-screen size regardless of zoom level).
    var s = globalScale;

    if (node.type === 'entity') {
      var color = entityColors[node.entity_type] || '#8B2942';
      var rScreen = Math.max(4, Math.min(11, Math.sqrt(node.linked_count || 1) * 1.5));
      var r = rScreen / s;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Label (D-30)
      var showLabel = s > 1.2 || node === this.hoveredNode;
      if (showLabel && node.label) {
        var fontSize = 11 / s;
        ctx.font = fontSize + 'px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#333';
        ctx.fillText(node.label, node.x, node.y + r + (2 / s));
      }

    } else if (node.type === 'document') {
      // Three visual states (D-31, D-32, D-33) — all in screen px
      if (node.expanded === true) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4 / s, 0, 2 * Math.PI);
        ctx.fillStyle = DOC_COLOR;
        ctx.fill();
      } else if (node.expandable === true) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3 / s, 0, 2 * Math.PI);
        ctx.fillStyle = DOC_COLOR;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5 / s, 0, 2 * Math.PI);
        ctx.fillStyle = '#FAFAF9';
        ctx.fill();
        ctx.strokeStyle = DOC_COLOR;
        ctx.lineWidth = 1.2 / s;
        ctx.stroke();
      }

      // Label on hover only — actual tooltip is shown via showDocumentTooltip
      if (node === this.hoveredNode && node.title) {
        var titleText = node.title.length > 30 ? node.title.slice(0, 30) + '…' : node.title;
        ctx.font = (10 / s) + 'px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#555';
        ctx.fillText(titleText, node.x, node.y + (6 / s));
      }

    } else if (node.type === 'overflow') {
      // Dashed border circle with count label (D-35) — screen px
      ctx.beginPath();
      ctx.arc(node.x, node.y, 7 / s, 0, 2 * Math.PI);
      ctx.setLineDash([3 / s, 3 / s]);
      ctx.strokeStyle = OVERFLOW_COLOR;
      ctx.lineWidth = 1.5 / s;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = (9 / s) + 'px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = OVERFLOW_COLOR;
      var countText = node.label || ('+' + (node.hiddenCount || 0));
      ctx.fillText(countText, node.x, node.y);
    }

    ctx.globalAlpha = 1.0;
  };

  // -----------------------------------------------------------------------
  // Hit-area paint — must match screen-space sizes used in drawNode so
  // pointer events line up with the visible nodes.
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.drawNodeHitArea = function (node, color, ctx, globalScale) {
    var s = globalScale;
    var r;
    if (node.type === 'entity') {
      r = Math.max(4, Math.min(11, Math.sqrt(node.linked_count || 1) * 1.5)) / s;
    } else if (node.type === 'overflow') {
      r = 8 / s;
    } else {
      r = 5 / s; // generous hit area for tiny doc nodes
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fill();
  };

  // -----------------------------------------------------------------------
  // Hover handling (D-29)
  // -----------------------------------------------------------------------

  // force-graph (standalone) has no refresh() method — trigger a redraw by
  // re-applying the current graphData. This is cheap and reliable.
  InfiniteBipartiteExplorer.prototype._redraw = function () {
    if (!this.graphInstance) return;
    var data = this.graphInstance.graphData();
    this.graphInstance.graphData(data);
  };

  InfiniteBipartiteExplorer.prototype.handleHover = function (node) {
    this.hoveredNode = node || null;
    this.container.style.cursor = node ? 'pointer' : '';
    this._redraw();
  };

  // -----------------------------------------------------------------------
  // Click handling (D-25, D-26, D-28)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.handleNodeClick = function (node) {
    if (!node) return;
    if (node.type === 'overflow') {
      this.loadMoreDocs(node);
    } else if (node.type === 'entity') {
      if (node.id === this.focalEntityCode) {
        this.showEntityTooltip(node);
      } else {
        this.refocusOn(node.id);
      }
    } else if (node.type === 'document') {
      this.showDocumentTooltip(node);
    }
  };

  // -----------------------------------------------------------------------
  // Entity tooltip (D-25)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.showEntityTooltip = function (node) {
    this.dismissTooltip();
    var tooltip = this.tooltipEl;
    if (!tooltip) return;

    var typeLabel = entityColors[node.entity_type] || '#8B2942';
    var typeName = { person: 'Persona', corporate_body: 'Entidad corporativa', corporate: 'Entidad corporativa', family: 'Familia' };

    var html = '';
    html += '<div class="graph-tooltip-header">';
    html += '<span class="entity-type-badge" style="background:' + typeLabel + ';color:#fff">';
    html += escapeHtml(typeName[node.entity_type] || node.entity_type || 'Entidad');
    html += '</span></div>';
    html += '<div class="graph-tooltip-name">' + escapeHtml(node.label || node.id) + '</div>';
    html += '<div class="graph-tooltip-ref">' + escapeHtml(node.id) + '</div>';
    html += '<div class="graph-tooltip-meta">' + (node.linked_count || '?') + ' documentos vinculados</div>';
    html += '<a class="graph-tooltip-btn" href="/entidad/' + escapeHtml(node.id) + '/" target="_blank">Ver ficha completa</a>';

    tooltip.innerHTML = html;
    this.positionTooltip(node);
    tooltip.style.display = 'block';
    this.selectedNode = node;
  };

  // -----------------------------------------------------------------------
  // Document tooltip (D-26)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.showDocumentTooltip = function (node) {
    this.dismissTooltip();
    var self = this;
    var tooltip = this.tooltipEl;
    if (!tooltip) return;

    // Match the entity-page tooltip pattern (entity.js):
    // - title is a link
    // - actions appended async after expandability is resolved via Pagefind
    var html = '';
    if (node.date_expression) {
      html += '<div class="graph-tooltip-date">' + escapeHtml(formatDate(node.date_expression)) + '</div>';
    }
    if (node.role) {
      html += '<div class="graph-tooltip-role">' + escapeHtml(roleLabels[node.role] || node.role) + '</div>';
    }
    html += '<div class="graph-tooltip-name"><a href="/descripcion/' + escapeHtml(node.reference_code) + '/" target="_blank">' + escapeHtml(node.title || node.reference_code) + '</a></div>';
    html += '<div class="graph-tooltip-ref">' + escapeHtml(node.reference_code) + '</div>';

    tooltip.innerHTML = html;
    this.positionTooltip(node);
    tooltip.style.display = 'block';
    this.selectedNode = node;

    if (node.expanded) return;

    // Resolve expandability lazily, then append the action button if any
    // new entities are reachable from this document.
    this.lookupDocEntities(node.reference_code).then(function (codes) {
      if (self.selectedNode !== node) return; // user moved on
      var newCodes = codes.filter(function (c) { return !self.graphNodes.has(c); });
      node.expandable = newCodes.length > 0;
      if (newCodes.length === 0) return;

      var actions = document.createElement('div');
      actions.className = 'graph-tooltip-actions';
      var span = document.createElement('span');
      span.textContent = 'Conectado a ' + newCodes.length + ' entidad' + (newCodes.length !== 1 ? 'es' : '') + ' m\u00e1s. ';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'graph-tooltip-btn';
      btn.textContent = 'Desplegar';
      btn.addEventListener('click', function () {
        btn.textContent = 'Cargando\u2026';
        btn.disabled = true;
        self.expandDocument(node);
      });
      actions.appendChild(span);
      actions.appendChild(btn);
      tooltip.appendChild(actions);
    });
  };

  // -----------------------------------------------------------------------
  // Lazy expandability lookup via Pagefind descriptions index
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.lookupDocEntities = async function (refCode) {
    if (this.expandableCache.has(refCode)) {
      return this.expandableCache.get(refCode);
    }
    if (!this.pagefindDesc) {
      try {
        this.pagefindDesc = await import('/pagefind/pagefind.js');
        await this.pagefindDesc.options({ basePath: '/pagefind/' });
        await this.pagefindDesc.init();
      } catch (e) {
        console.warn('[IBE] Pagefind descriptions load failed:', e);
        this.expandableCache.set(refCode, []);
        return [];
      }
    }
    try {
      var search = await this.pagefindDesc.search(refCode);
      for (var i = 0; i < search.results.length; i++) {
        var hit = await search.results[i].data();
        if (hit.meta && hit.meta.reference_code === refCode) {
          var codes = (hit.filters && hit.filters.entidad) || [];
          this.expandableCache.set(refCode, codes);
          return codes;
        }
      }
    } catch (e) {
      // fall through
    }
    this.expandableCache.set(refCode, []);
    return [];
  };

  // -----------------------------------------------------------------------
  // Tooltip positioning and dismissal
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.positionTooltip = function (node) {
    var tooltip = this.tooltipEl;
    if (!tooltip || !this.graphInstance || node.x === undefined) return;
    var coords = this.graphInstance.graph2ScreenCoords(node.x, node.y);
    tooltip.style.left = (coords.x + 12) + 'px';
    tooltip.style.top = (coords.y - 8) + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';
  };

  InfiniteBipartiteExplorer.prototype.updateTooltipPosition = function () {
    if (this.selectedNode && this.graphInstance) {
      this.positionTooltip(this.selectedNode);
    }
  };

  InfiniteBipartiteExplorer.prototype.dismissTooltip = function () {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
      this.tooltipEl.innerHTML = '';
    }
    this.selectedNode = null;
  };

  // -----------------------------------------------------------------------
  // Entity loading
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.loadEntity = async function (entityCode) {
    this.focalEntityCode = entityCode;

    // Fetch shard (cache-first)
    if (!this.shardCache.has(entityCode)) {
      try {
        var res = await fetch('/data/entity-links/' + entityCode + '.json');
        if (res.ok) {
          this.shardCache.set(entityCode, await res.json());
        } else {
          this.shardCache.set(entityCode, []);
        }
      } catch (e) {
        this.shardCache.set(entityCode, []);
      }
    }

    var shard = this.shardCache.get(entityCode) || [];

    // Sort by date descending, cap at MAX_INITIAL_DOCS
    var sorted = shard.slice().sort(function (a, b) {
      var da = a.date_expression || '';
      var db = b.date_expression || '';
      return db.localeCompare(da);
    });
    var capped = sorted.slice(0, MAX_INITIAL_DOCS);

    // Entity node metadata
    var meta = await this.fetchEntityMeta(entityCode);
    var entityNode = {
      id: entityCode,
      type: 'entity',
      label: meta.label,
      entity_type: meta.entity_type,
      linked_count: shard.length
    };

    // Document nodes
    var self = this;
    var docNodes = capped.map(function (entry) {
      return {
        id: entry.reference_code,
        type: 'document',
        title: entry.title,
        date_expression: entry.date_expression,
        role: entry.role,
        reference_code: entry.reference_code,
        repository_code: entry.repository_code,
        expandable: undefined,  // resolved lazily on hover via Pagefind
        expanded: false
      };
    });

    var newNodes = [entityNode].concat(docNodes);
    var newEdges = capped.map(function (entry) {
      return { source: entityCode, target: entry.reference_code, role: entry.role };
    });

    // Overflow node (D-35)
    if (shard.length > MAX_INITIAL_DOCS) {
      var hiddenCount = shard.length - MAX_INITIAL_DOCS;
      var overflowNode = {
        id: '__overflow__' + entityCode,
        type: 'overflow',
        hiddenCount: hiddenCount,
        nextBatchOffset: MAX_INITIAL_DOCS,
        parentEntityCode: entityCode,
        label: '+' + hiddenCount + ' documentos'
      };
      newNodes.push(overflowNode);
      newEdges.push({ source: entityCode, target: overflowNode.id, role: '' });
    }

    this.addNodesToGraph(newNodes, newEdges, entityCode);
  };

  // -----------------------------------------------------------------------
  // Entity metadata fetch (with cache)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.fetchEntityMeta = async function (entityCode) {
    if (this.entityMeta.has(entityCode)) {
      return this.entityMeta.get(entityCode);
    }

    var meta = { label: entityCode, entity_type: 'person', linked_count: 0 };

    try {
      var resp = await fetch('/entidad/' + entityCode + '/');
      if (resp.ok) {
        var html = await resp.text();
        var titleMatch = html.match(/<title>(.*?)\s*\|/);
        var typeMatch = html.match(/data-pagefind-meta="entity_type">([^<]+)/);
        var countMatch = html.match(/data-pagefind-meta="linked_count">([^<]+)/);
        if (titleMatch) meta.label = titleMatch[1].trim();
        if (typeMatch) meta.entity_type = typeMatch[1].trim();
        if (countMatch) meta.linked_count = parseInt(countMatch[1], 10) || 0;
      }
    } catch (e) {
      // use defaults
    }

    this.entityMeta.set(entityCode, meta);
    return meta;
  };

  // -----------------------------------------------------------------------
  // Incremental node addition (adapted from entity.js lines 716-760)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.addNodesToGraph = function (newNodes, newEdges, anchorId) {
    var currentData = this.graphInstance.graphData();
    var existingNodeIds = new Set(currentData.nodes.map(function (n) { return n.id; }));
    var existingEdgeKeys = new Set(currentData.links.map(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;
      return s + '→' + t;
    }));

    // Filter duplicates
    var filteredNodes = newNodes.filter(function (n) { return !existingNodeIds.has(n.id); });
    var filteredEdges = newEdges.filter(function (e) {
      var key = e.source + '→' + e.target;
      return !existingEdgeKeys.has(key);
    });

    // Position new nodes near anchor
    var anchor = currentData.nodes.find(function (n) { return n.id === anchorId; });
    if (anchor && filteredNodes.length > 0) {
      filteredNodes.forEach(function (n, i) {
        var angle = (2 * Math.PI * i) / filteredNodes.length;
        n.x = anchor.x + 30 * Math.cos(angle);
        n.y = anchor.y + 30 * Math.sin(angle);
      });
    }

    // Update internal maps
    var self = this;
    filteredNodes.forEach(function (n) { self.graphNodes.set(n.id, n); });
    filteredEdges.forEach(function (e) { self.graphEdges.push(e); });

    this.graphInstance.graphData({
      nodes: currentData.nodes.concat(filteredNodes),
      links: currentData.links.concat(filteredEdges)
    });
    this.graphInstance.d3ReheatSimulation();
    this.rebuildAdjacency();
  };

  // -----------------------------------------------------------------------
  // Adjacency rebuild
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.rebuildAdjacency = function () {
    var nodeNeighbours = new Map();
    var nodeLinks = new Map();

    var data = this.graphInstance.graphData();
    data.links.forEach(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;

      if (!nodeNeighbours.has(s)) nodeNeighbours.set(s, new Set());
      if (!nodeNeighbours.has(t)) nodeNeighbours.set(t, new Set());
      nodeNeighbours.get(s).add(t);
      nodeNeighbours.get(t).add(s);

      if (!nodeLinks.has(s)) nodeLinks.set(s, new Set());
      if (!nodeLinks.has(t)) nodeLinks.set(t, new Set());
      nodeLinks.get(s).add(l);
      nodeLinks.get(t).add(l);
    });

    this.nodeNeighbours = nodeNeighbours;
    this.nodeLinks = nodeLinks;
  };

  // -----------------------------------------------------------------------
  // Legend rendering
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.renderLegend = function () {
    var el = this.legendEl;
    if (!el) return;

    el.innerHTML = [
      legendItem('#8B2942', 'filled', 'Persona'),
      legendItem('#6666BB', 'filled', 'Corporaci\u00f3n / Familia'),
      legendItem(DOC_COLOR, 'filled', 'Documento (expandible)'),
      legendItem(DOC_COLOR, 'hollow', 'Documento'),
      legendItem(DOC_COLOR, 'large', 'Explorado')
    ].join('');

    function legendItem(color, style, label) {
      var dotStyle;
      if (style === 'hollow') {
        dotStyle = 'background:transparent;border:1.5px solid ' + color + ';';
      } else if (style === 'large') {
        dotStyle = 'background:' + color + ';width:10px;height:10px;border-radius:50%;';
      } else {
        dotStyle = 'background:' + color + ';';
      }
      return '<span class="graph-legend-item">'
        + '<span class="graph-legend-dot" style="' + dotStyle + '"></span>'
        + '<span>' + label + '</span>'
        + '</span>';
    }
  };

  // -----------------------------------------------------------------------
  // Date formatter (replicated from entity.js lines 842-869)
  // -----------------------------------------------------------------------

  function formatDate(dateStr) {
    if (!dateStr) return '';

    var months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    if (dateStr.indexOf(' .. ') !== -1) {
      var parts = dateStr.split(' .. ');
      return formatDate(parts[0]) + ' \u2013 ' + formatDate(parts[1]);
    }

    var match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      var day = parseInt(match[3], 10);
      var month = months[parseInt(match[2], 10) - 1];
      return day + ' de ' + month + ' de ' + match[1];
    }

    var ymMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
    if (ymMatch) {
      var m = months[parseInt(ymMatch[2], 10) - 1];
      return m + ' de ' + ymMatch[1];
    }

    return dateStr;
  }

  // -----------------------------------------------------------------------
  // HTML escape helper
  // -----------------------------------------------------------------------

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // -----------------------------------------------------------------------
  // Expand document — load entity connections (D-26, D-27, D-34)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.expandDocument = async function (node) {
    this.dismissTooltip();

    // Lazy lookup via Pagefind descriptions index — no upfront 5.7 MB fetch
    var entityCodes = await this.lookupDocEntities(node.reference_code);
    // Filter out entities already in the graph
    var self0 = this;
    var newCodes = entityCodes.filter(function (c) { return !self0.graphNodes.has(c); });

    if (newCodes.length === 0) {
      // Mark as expanded even if no new entities — all connections already loaded
      node.expanded = true;
      this._redraw();
      return;
    }

    // Cap at MAX_EXPAND_ENTITIES (D-34)
    if (newCodes.length > MAX_EXPAND_ENTITIES) {
      node.hiddenEntityCount = newCodes.length - MAX_EXPAND_ENTITIES;
      newCodes = newCodes.slice(0, MAX_EXPAND_ENTITIES);
    }

    // Batch-fetch entity metadata via Promise.all (pattern from entity.js lines 669-684)
    var self = this;
    var metaResults = await Promise.all(newCodes.map(function (code) {
      return self.fetchEntityMeta(code);
    }));

    var newEntityNodes = newCodes.map(function (code, i) {
      var meta = metaResults[i];
      return {
        id: code,
        type: 'entity',
        label: meta.label,
        entity_type: meta.entity_type,
        linked_count: meta.linked_count
      };
    });

    var newEdges = newCodes.map(function (code) {
      return { source: node.reference_code, target: code, role: '' };
    });

    // Mark document as expanded (D-33)
    node.expanded = true;

    this.addNodesToGraph(newEntityNodes, newEdges, node.id);
    this.computeHopDistances();

    if (this.onEntityFocused) {
      this.onEntityFocused(this.focalEntityCode, this.entityMeta.get(this.focalEntityCode) || null);
    }
  };

  // -----------------------------------------------------------------------
  // Refocus on a new entity (D-28, D-37, D-38)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.refocusOn = async function (entityCode) {
    this.dismissTooltip();
    this.focalEntityCode = entityCode;

    // Prune distant nodes first (D-36)
    this.pruneDistantNodes(entityCode);

    // Fetch shard (cache-first)
    if (!this.shardCache.has(entityCode)) {
      try {
        var res = await fetch('/data/entity-links/' + entityCode + '.json');
        if (res.ok) {
          this.shardCache.set(entityCode, await res.json());
        } else {
          this.shardCache.set(entityCode, []);
        }
      } catch (e) {
        this.shardCache.set(entityCode, []);
      }
    }

    var shard = this.shardCache.get(entityCode) || [];
    var sorted = shard.slice().sort(function (a, b) {
      var da = a.date_expression || '';
      var db = b.date_expression || '';
      return db.localeCompare(da);
    });
    var capped = sorted.slice(0, MAX_INITIAL_DOCS);

    // Ensure entity node exists (may not if it was pruned as too distant)
    if (!this.graphNodes.has(entityCode)) {
      var meta = await this.fetchEntityMeta(entityCode);
      var entityNodeForRefocus = {
        id: entityCode,
        type: 'entity',
        label: meta.label,
        entity_type: meta.entity_type,
        linked_count: shard.length
      };
      this.addNodesToGraph([entityNodeForRefocus], [], entityCode);
    } else {
      // Update linked_count on existing node
      var existingNode = this.graphNodes.get(entityCode);
      existingNode.linked_count = shard.length;
    }

    var self = this;
    var docNodes = capped.map(function (entry) {
      return {
        id: entry.reference_code,
        type: 'document',
        title: entry.title,
        date_expression: entry.date_expression,
        role: entry.role,
        reference_code: entry.reference_code,
        repository_code: entry.repository_code,
        expandable: undefined,  // resolved lazily on hover
        expanded: false
      };
    });

    var docEdges = capped.map(function (entry) {
      return { source: entityCode, target: entry.reference_code, role: entry.role };
    });

    // Handle overflow (D-35)
    if (shard.length > MAX_INITIAL_DOCS) {
      var hiddenCount = shard.length - MAX_INITIAL_DOCS;
      var overflowId = '__overflow__' + entityCode;
      if (!this.graphNodes.has(overflowId)) {
        var overflowNode = {
          id: overflowId,
          type: 'overflow',
          hiddenCount: hiddenCount,
          nextBatchOffset: MAX_INITIAL_DOCS,
          parentEntityCode: entityCode,
          label: '+' + hiddenCount + ' documentos'
        };
        docNodes.push(overflowNode);
        docEdges.push({ source: entityCode, target: overflowId, role: '' });
      }
    }

    this.addNodesToGraph(docNodes, docEdges, entityCode);
    this.computeHopDistances();

    // Update URL (D-18)
    history.pushState({ entidad: entityCode }, '', '?entidad=' + entityCode);

    // Pan to entity node (D-28)
    var node = this.graphNodes.get(entityCode);
    if (node && node.x !== undefined && this.graphInstance) {
      this.graphInstance.centerAt(node.x, node.y, 400);
    }

    // Fire callback for sidebar sync (D-13)
    if (this.onEntityFocused) {
      var entityMeta = this.entityMeta.get(entityCode) || { label: entityCode, entity_type: 'person', linked_count: shard.length };
      this.onEntityFocused(entityCode, entityMeta);
    }
  };

  // -----------------------------------------------------------------------
  // Prune nodes > MAX_HOPS from new focal (D-36)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.pruneDistantNodes = function (focalId) {
    this.computeHopDistances(focalId);

    var self = this;
    var toRemove = new Set();

    this.graphNodes.forEach(function (node, id) {
      var hop = self.hopDistance.get(id);
      if (hop === undefined || hop > MAX_HOPS) {
        toRemove.add(id);
      }
    });

    // Also remove overflow nodes whose parent entity is pruned
    this.graphNodes.forEach(function (node, id) {
      if (node.type === 'overflow' && toRemove.has(node.parentEntityCode)) {
        toRemove.add(id);
      }
    });

    if (toRemove.size === 0) return;

    // Remove from internal maps
    toRemove.forEach(function (id) { self.graphNodes.delete(id); });
    this.graphEdges = this.graphEdges.filter(function (e) {
      return !toRemove.has(e.source) && !toRemove.has(e.target);
    });

    // Remove from graphInstance (D-36)
    var current = this.graphInstance.graphData();
    this.graphInstance.graphData({
      nodes: current.nodes.filter(function (n) { return !toRemove.has(n.id); }),
      links: current.links.filter(function (l) {
        var s = typeof l.source === 'object' ? l.source.id : l.source;
        var t = typeof l.target === 'object' ? l.target.id : l.target;
        return !toRemove.has(s) && !toRemove.has(t);
      })
    });

    this.graphInstance.d3ReheatSimulation();
    this.rebuildAdjacency();
  };

  // -----------------------------------------------------------------------
  // BFS hop-distance computation (D-36)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.computeHopDistances = function (focalId) {
    var startId = focalId || this.focalEntityCode;
    if (!startId) return;

    var hopMap = new Map();
    hopMap.set(startId, 0);
    var queue = [startId];

    while (queue.length) {
      var curr = queue.shift();
      var currHop = hopMap.get(curr);
      var neighbours = this.nodeNeighbours.get(curr) || new Set();
      neighbours.forEach(function (nb) {
        if (!hopMap.has(nb)) {
          hopMap.set(nb, currHop + 1);
          queue.push(nb);
        }
      });
    }

    this.hopDistance = hopMap;
  };

  // -----------------------------------------------------------------------
  // Load more docs from overflow (D-35)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.loadMoreDocs = function (overflowNode) {
    var shard = this.shardCache.get(overflowNode.parentEntityCode) || [];
    var sorted = shard.slice().sort(function (a, b) {
      var da = a.date_expression || '';
      var db = b.date_expression || '';
      return db.localeCompare(da);
    });

    var batch = sorted.slice(overflowNode.nextBatchOffset, overflowNode.nextBatchOffset + MAX_INITIAL_DOCS);
    if (batch.length === 0) return;

    var self = this;
    var entityCode = overflowNode.parentEntityCode;

    var newDocNodes = batch.map(function (entry) {
      return {
        id: entry.reference_code,
        type: 'document',
        title: entry.title,
        date_expression: entry.date_expression,
        role: entry.role,
        reference_code: entry.reference_code,
        repository_code: entry.repository_code,
        expandable: undefined,  // resolved lazily on hover
        expanded: false
      };
    });

    var newDocEdges = batch.map(function (entry) {
      return { source: entityCode, target: entry.reference_code, role: entry.role };
    });

    // Update overflow node state
    overflowNode.nextBatchOffset += batch.length;
    overflowNode.hiddenCount -= batch.length;

    if (overflowNode.hiddenCount <= 0) {
      // Remove the overflow node from the graph
      this.graphNodes.delete(overflowNode.id);
      this.graphEdges = this.graphEdges.filter(function (e) {
        return e.source !== overflowNode.id && e.target !== overflowNode.id;
      });
      var current = this.graphInstance.graphData();
      this.graphInstance.graphData({
        nodes: current.nodes.filter(function (n) { return n.id !== overflowNode.id; }),
        links: current.links.filter(function (l) {
          var s = typeof l.source === 'object' ? l.source.id : l.source;
          var t = typeof l.target === 'object' ? l.target.id : l.target;
          return s !== overflowNode.id && t !== overflowNode.id;
        })
      });
    } else {
      overflowNode.label = '+' + overflowNode.hiddenCount + ' documentos';
      this._redraw();
    }

    this.addNodesToGraph(newDocNodes, newDocEdges, entityCode);
    this.computeHopDistances();
  };

  // -----------------------------------------------------------------------
  // Filter application (D-10, D-15, D-17)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.applyFilters = function (filters) {
    // filters: {roles: Set, entityTypes: Set, functions: Set, searchQuery: string}
    var hasRoles = filters.roles && filters.roles.size > 0;
    var hasTypes = filters.entityTypes && filters.entityTypes.size > 0;
    var hasQuery = filters.searchQuery && filters.searchQuery.trim().length > 0;
    var query = hasQuery ? filters.searchQuery.trim().toLowerCase() : '';

    var self = this;

    // First pass: determine visibility of entity nodes
    this.graphNodes.forEach(function (node) {
      if (node.type === 'overflow') {
        node._visible = true;
        return;
      }
      if (node.type === 'entity') {
        var visible = true;

        // Entity type filter
        if (hasTypes && !filters.entityTypes.has(node.entity_type)) {
          visible = false;
        }

        // Search query filter
        if (visible && hasQuery) {
          var label = (node.label || '').toLowerCase();
          if (label.indexOf(query) === -1 && node.id.indexOf(query) === -1) {
            visible = false;
          }
        }

        // Role filter — entity is visible if it has at least one edge with a matching role
        if (visible && hasRoles) {
          var entityHasRole = false;
          var data = self.graphInstance.graphData();
          data.links.forEach(function (l) {
            var s = typeof l.source === 'object' ? l.source.id : l.source;
            var t = typeof l.target === 'object' ? l.target.id : l.target;
            if ((s === node.id || t === node.id) && filters.roles.has(l.role)) {
              entityHasRole = true;
            }
          });
          if (!entityHasRole) visible = false;
        }

        node._visible = visible;
      }
    });

    // Second pass: document nodes — visible if any connected entity is visible
    this.graphNodes.forEach(function (node) {
      if (node.type !== 'document') return;
      var neighbours = self.nodeNeighbours.get(node.id) || new Set();
      var anyVisible = false;
      neighbours.forEach(function (nid) {
        var n = self.graphNodes.get(nid);
        if (n && n.type === 'entity' && n._visible !== false) anyVisible = true;
      });
      node._visible = anyVisible;
    });

    this._redraw();
    if (this.graphInstance) this.graphInstance.d3ReheatSimulation();
  };

  // -----------------------------------------------------------------------
  // Clear all filters (D-17)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.clearFilters = function () {
    this.graphNodes.forEach(function (node) {
      node._visible = true;
    });
    this._redraw();
    if (this.graphInstance) this.graphInstance.d3ReheatSimulation();
  };

  // -----------------------------------------------------------------------
  // Expose globally
  // -----------------------------------------------------------------------

  window.InfiniteBipartiteExplorer = InfiniteBipartiteExplorer;

})();
