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

    // Load reverse lookup (5.7 MB) — needed for expandability checks
    try {
      var res = await fetch('/data/desc-entity-lookup.json');
      if (res.ok) {
        var obj = await res.json();
        self.descLookup = new Map(Object.entries(obj));
      }
    } catch (e) {
      console.warn('[IBE] desc-entity-lookup load failed:', e);
    }

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

    // Initial zoom — once only (D-40)
    setTimeout(function () {
      if (self.graphInstance) self.graphInstance.zoomToFit(400, 30);
    }, 300);

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
    this.graphInstance = new ForceGraph(this.container)
      .graphData({ nodes: [], links: [] })
      .nodeId('id')
      .nodeCanvasObjectMode(function () { return 'replace'; })
      .nodeCanvasObject(this.drawNode.bind(this))
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

    // Resize observer
    new ResizeObserver(function () {
      if (self.graphInstance && self.container.clientWidth > 0) {
        self.graphInstance
          .width(self.container.clientWidth)
          .height(self.container.clientHeight);
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

    if (node.type === 'entity') {
      var color = entityColors[node.entity_type] || '#8B2942';
      var r = Math.max(3, Math.min(12, Math.sqrt(node.linked_count || 1) * 1.5));

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Label (D-30)
      var showLabel = globalScale > 1.2 || node === this.hoveredNode;
      if (showLabel && node.label) {
        var fontSize = Math.max(8, 12 / globalScale);
        ctx.font = fontSize + 'px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#333';
        ctx.fillText(node.label, node.x, node.y + r + 1);
      }

    } else if (node.type === 'document') {
      // Three visual states (D-31, D-32, D-33)
      if (node.expanded === true) {
        // Expanded: larger filled circle (D-33)
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = DOC_COLOR;
        ctx.fill();
      } else if (node.expandable === true) {
        // Expandable: filled circle (D-32)
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = DOC_COLOR;
        ctx.fill();
      } else {
        // Terminal: hollow circle, stroke only (D-31)
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FAFAF9';
        ctx.fill();
        ctx.strokeStyle = DOC_COLOR;
        ctx.lineWidth = 1.2 / globalScale;
        ctx.stroke();
      }

      // Label on hover (D-30)
      if (node === this.hoveredNode && node.title) {
        var titleText = node.title.length > 30 ? node.title.slice(0, 30) + '…' : node.title;
        var docFontSize = Math.max(8, 12 / globalScale);
        ctx.font = docFontSize + 'px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#555';
        ctx.fillText(titleText, node.x, node.y + 5);
      }

    } else if (node.type === 'overflow') {
      // Dashed border circle with count label (D-35)
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = OVERFLOW_COLOR;
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
      ctx.setLineDash([]);

      var overflowFontSize = Math.max(8, 10 / globalScale);
      ctx.font = overflowFontSize + 'px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = OVERFLOW_COLOR;
      var countText = node.label || ('+' + (node.hiddenCount || 0));
      ctx.fillText(countText, node.x, node.y);
    }

    ctx.globalAlpha = 1.0;
  };

  // -----------------------------------------------------------------------
  // Hover handling (D-29)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.handleHover = function (node) {
    this.hoveredNode = node || null;
    this.container.style.cursor = node ? 'pointer' : '';
    if (this.graphInstance) this.graphInstance.refresh();
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

    var html = '';
    if (node.date_expression) {
      html += '<div class="graph-tooltip-date">' + escapeHtml(formatDate(node.date_expression)) + '</div>';
    }
    if (node.role) {
      html += '<div class="graph-tooltip-role">' + escapeHtml(roleLabels[node.role] || node.role) + '</div>';
    }
    html += '<div class="graph-tooltip-name">' + escapeHtml(node.title || node.reference_code) + '</div>';
    html += '<div class="graph-tooltip-ref">' + escapeHtml(node.reference_code) + '</div>';
    html += '<button class="graph-tooltip-btn graph-tooltip-expand" data-ref="' + escapeHtml(node.reference_code) + '">Desplegar</button>';
    html += '<a class="graph-tooltip-btn" href="/descripcion/' + escapeHtml(node.reference_code) + '/" target="_blank">Ver descripci&oacute;n</a>';

    tooltip.innerHTML = html;
    this.positionTooltip(node);
    tooltip.style.display = 'block';
    this.selectedNode = node;

    // Wire the Desplegar button
    var expandBtn = tooltip.querySelector('.graph-tooltip-expand');
    if (expandBtn) {
      expandBtn.addEventListener('click', function () {
        self.expandDocument(node);
      });
    }
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
      var entityCodes = self.descLookup.get(entry.reference_code) || [];
      var expandable = entityCodes.some(function (c) { return c !== entityCode; });
      return {
        id: entry.reference_code,
        type: 'document',
        title: entry.title,
        date_expression: entry.date_expression,
        role: entry.role,
        reference_code: entry.reference_code,
        repository_code: entry.repository_code,
        expandable: expandable,
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
    this.nodeNeighbours = new Map();
    this.nodeLinks = new Map();

    var data = this.graphInstance.graphData();
    data.links.forEach(function (l) {
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;

      if (!this.nodeNeighbours.has(s)) this.nodeNeighbours.set(s, new Set());
      if (!this.nodeNeighbours.has(t)) this.nodeNeighbours.set(t, new Set());
      this.nodeNeighbours.get(s).add(t);
      this.nodeNeighbours.get(t).add(s);

      if (!this.nodeLinks.has(s)) this.nodeLinks.set(s, new Set());
      if (!this.nodeLinks.has(t)) this.nodeLinks.set(t, new Set());
      this.nodeLinks.get(s).add(l);
      this.nodeLinks.get(t).add(l);
    }, this);
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
  // Stub methods (Task 2 implements these)
  // -----------------------------------------------------------------------

  InfiniteBipartiteExplorer.prototype.expandDocument = function (node) {
    console.warn('InfiniteBipartiteExplorer: expandDocument not yet implemented');
  };

  InfiniteBipartiteExplorer.prototype.refocusOn = function (entityCode) {
    console.warn('InfiniteBipartiteExplorer: refocusOn not yet implemented');
  };

  InfiniteBipartiteExplorer.prototype.loadMoreDocs = function (overflowNode) {
    console.warn('InfiniteBipartiteExplorer: loadMoreDocs not yet implemented');
  };

  InfiniteBipartiteExplorer.prototype.pruneDistantNodes = function (focalId) {
    console.warn('InfiniteBipartiteExplorer: pruneDistantNodes not yet implemented');
  };

  InfiniteBipartiteExplorer.prototype.applyFilters = function (filters) {
    console.warn('InfiniteBipartiteExplorer: applyFilters not yet implemented');
  };

  // -----------------------------------------------------------------------
  // Expose globally
  // -----------------------------------------------------------------------

  window.InfiniteBipartiteExplorer = InfiniteBipartiteExplorer;

})();
