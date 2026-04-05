/**
 * Curated Entity Graph
 *
 * Loads a pre-computed curated graph of the top 100 most-connected entities
 * from /data/curated-entity-graph.json and renders it with force-graph
 * (vasturiano). Node positions are pre-computed (ForceAtlas2 at build time)
 * so the simulation never runs in the browser — graph appears instantly.
 *
 * Features:
 *  - Single JSON fetch on init — no per-entity shard fetches on page load
 *  - ?nodo= URL parameter: centres the graph on a specific entity
 *  - Hover: highlights node + neighbours, dims everything else
 *  - Click: shows tooltip with entity type, name, connection count, detail link
 *  - Fallback message when ?nodo= entity is not in the curated set
 *
 * Replaces EntityNetworkGraph (bipartite, shard-on-load — caused browser crash).
 */

var curatedTypeLabels = {
  person: 'Persona',
  corporate_body: 'Entidad corporativa',
  corporate: 'Entidad corporativa',
  family: 'Familia'
};

class CuratedEntityGraph {
  constructor(container) {
    this.container = container;
    this.fg = null;
    this.graphData = null;          // { nodes: [], links: [] } from JSON
    this.highlightedNodes = new Set();
    this._canvasEl = null;
    this._legendEl = null;
    this._messageEl = null;
    this._activeTooltip = null;
    this._tooltipNode = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Initialise the graph. Must be called explicitly after the DOM is ready.
   * Async — fetches the curated JSON.
   */
  async init() {
    this._buildDOM();

    // Fetch the pre-computed curated graph
    var data;
    try {
      var resp = await fetch('/data/curated-entity-graph.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      data = await resp.json();
    } catch (err) {
      console.error('CuratedEntityGraph: failed to load curated graph', err);
      this._showMessage('No se pudo cargar la red de entidades.');
      return;
    }

    this.graphData = data;

    // Render with force-graph using pre-computed positions (no simulation)
    this._renderGraph();

    // Handle ?nodo= deep-link
    var params = new URLSearchParams(window.location.search);
    var nodoCode = params.get('nodo');
    if (nodoCode) {
      this._centreOnEntity(nodoCode);
    }
  }

  /**
   * Store explorer reference. The curated graph does not interact with the
   * explorer's search state — graph and list are independent panels (D-05,
   * per research finding #4). This method exists for API compatibility with
   * the old EntityNetworkGraph.
   */
  setExplorer(explorer) {
    // Intentionally no-op. The curated graph is not driven by search state.
    this._explorer = explorer;
  }

  // ---------------------------------------------------------------------------
  // DOM construction
  // ---------------------------------------------------------------------------

  _buildDOM() {
    // Canvas wrapper — force-graph mounts here
    this._canvasEl = document.createElement('div');
    this._canvasEl.id = 'curated-graph-canvas';
    this._canvasEl.className = 'graph-canvas';
    this.container.appendChild(this._canvasEl);

    // Legend
    this._legendEl = document.createElement('div');
    this._legendEl.className = 'graph-legend';
    this._legendEl.innerHTML =
      '<span class="graph-legend-item">' +
        '<span class="graph-legend-dot graph-legend-person"></span>' +
        '<span>Persona</span>' +
      '</span>' +
      '<span class="graph-legend-item">' +
        '<span class="graph-legend-dot graph-legend-corporate"></span>' +
        '<span>Entidad corporativa</span>' +
      '</span>' +
      '<span class="graph-legend-item graph-legend-weight">' +
        '<span class="graph-legend-line"></span>' +
        '<span>Fuerza del v\xednculo</span>' +
      '</span>';
    this.container.appendChild(this._legendEl);

    // Message container — hidden by default, shown for fallback
    this._messageEl = document.createElement('div');
    this._messageEl.className = 'graph-message';
    this._messageEl.style.display = 'none';
    this.container.appendChild(this._messageEl);
  }

  // ---------------------------------------------------------------------------
  // Graph rendering
  // ---------------------------------------------------------------------------

  _renderGraph() {
    var nodes = this.graphData.nodes;
    var links = this.graphData.links || this.graphData.edges || [];
    var self = this;

    // Build neighbour map for hover highlighting
    this._nodeNeighbours = new Map();
    this._nodeLinks = new Map();
    for (var i = 0; i < links.length; i++) {
      var l = links[i];
      var s = typeof l.source === 'object' ? l.source.id : l.source;
      var t = typeof l.target === 'object' ? l.target.id : l.target;
      if (!this._nodeNeighbours.has(s)) this._nodeNeighbours.set(s, new Set());
      if (!this._nodeNeighbours.has(t)) this._nodeNeighbours.set(t, new Set());
      this._nodeNeighbours.get(s).add(t);
      this._nodeNeighbours.get(t).add(s);
    }
    this._highlightedLinks = new Set();

    this.fg = new ForceGraph(this._canvasEl)
      .graphData({ nodes: nodes, links: links })
      .cooldownTime(500)
      .d3AlphaDecay(0.5)
      .nodeId('id')
      .nodeLabel('')
      .nodeCanvasObjectMode(function() { return 'replace'; })
      .nodeCanvasObject(function(node, ctx, globalScale) {
        var r = Math.max(2, Math.log10((node.degree || 1) + 1) * 2.5);
        var dimmed = self.highlightedNodes.size > 0 && !self.highlightedNodes.has(node.id);
        var hovered = self.highlightedNodes.has(node.id);
        var color = self._nodeColor(node);

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = dimmed ? '#E8E4E0' : color;
        ctx.fill();

        // Show label when zoomed in or when hovered
        var show = globalScale > 1.5 || hovered;
        if (show) {
          var fontSize = Math.max(8, 10 / globalScale);
          ctx.font = 'bold ' + fontSize + 'px DM Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = hovered ? '#333' : '#777';
          ctx.fillText(node.label, node.x, node.y + r + 1);
        }
      })
      .linkColor(function(link) {
        if (self._highlightedLinks.has(link)) return '#888';
        if (self.highlightedNodes.size > 0) return 'rgba(0,0,0,0.03)';
        return 'rgba(160, 152, 136, 0.3)';
      })
      .linkWidth(function(link) {
        if (self._highlightedLinks.has(link)) return 2;
        return Math.max(0.5, Math.sqrt(link.weight) * 0.3);
      })
      .onNodeClick(function(node) {
        self._onNodeClick(node);
      })
      .onNodeHover(function(node) {
        self._onNodeHover(node);
      })
      .onBackgroundClick(function() {
        self._dismissTooltip();
      })
      .onZoom(function() {
        self._updateTooltipPosition();
      })
      .enableNodeDrag(false)
      .width(this._canvasEl.clientWidth)
      .height(this._canvasEl.clientHeight || 300)
      .onEngineStop(function() {
        self.fg.zoomToFit(0, 30);
      });

    // Resize observer — keep canvas filling its container
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function() {
        if (self.fg && self._canvasEl.clientWidth > 0) {
          self.fg.width(self._canvasEl.clientWidth);
          self.fg.height(self._canvasEl.clientHeight || 300);
        }
      });
      ro.observe(this._canvasEl);
    }
  }

  // ---------------------------------------------------------------------------
  // Deep-link: centre on entity
  // ---------------------------------------------------------------------------

  _centreOnEntity(code) {
    if (!this.graphData) return;

    var node = this.graphData.nodes.find(function(n) { return n.id === code; });

    if (node) {
      this.highlightedNodes.add(node.id);
      // Pan to the node and zoom in
      this.fg.centerAt(node.x, node.y, 800);
      this.fg.zoom(5, 800);
      // Add focused indicator to legend
      this._addFocusedLegendEntry();
    } else {
      // Entity not in curated set — show graceful fallback
      var msgEl = this._messageEl;
      var textEl = document.createElement('span');
      textEl.textContent =
        'Esta entidad no aparece en la vista de red curada' +
        ' (muestra las entidades con m\xe1s v\xednculos). ';
      var linkEl = document.createElement('a');
      linkEl.href = '/entidad/' + code + '/';
      linkEl.textContent = 'Ver ficha completa';
      msgEl.appendChild(textEl);
      msgEl.appendChild(linkEl);
      msgEl.style.display = '';
    }
  }

  _addFocusedLegendEntry() {
    // Only add once
    if (this._legendEl.querySelector('.graph-legend-focused')) return;
    var focusItem = document.createElement('span');
    focusItem.className = 'graph-legend-item graph-legend-focused';
    var dot = document.createElement('span');
    dot.className = 'graph-legend-dot';
    dot.style.background = 'transparent';
    dot.style.border = '2px solid #8B2942';
    dot.style.borderRadius = '50%';
    focusItem.appendChild(dot);
    var label = document.createElement('span');
    label.textContent = 'Entidad enfocada';
    focusItem.appendChild(label);
    this._legendEl.appendChild(focusItem);
  }

  // ---------------------------------------------------------------------------
  // Node interaction
  // ---------------------------------------------------------------------------

  _onNodeClick(node) {
    if (!node) return;
    this._dismissTooltip();
    this.fg.centerAt(node.x, node.y, 400);
    this._showTooltip(node);
  }

  _onNodeHover(node) {
    this.container.style.cursor = node ? 'pointer' : 'default';
    this.highlightedNodes.clear();
    this._highlightedLinks.clear();
    if (node) {
      this.highlightedNodes.add(node.id);
      var neighbours = this._nodeNeighbours.get(node.id);
      if (neighbours) neighbours.forEach(function(n) { this.highlightedNodes.add(n); }.bind(this));
    }
  }

  // ---------------------------------------------------------------------------
  // Tooltip (same UX as entity detail page graph)
  // ---------------------------------------------------------------------------

  _showTooltip(node) {
    this._dismissTooltip();

    var tooltip = document.createElement('div');
    tooltip.className = 'graph-tooltip';

    var typeLabel = curatedTypeLabels[node.type] || node.type || '';

    // Count graph neighbours (co-occurrence connections in curated set)
    var neighbours = this._nodeNeighbours.get(node.id);
    var connectionCount = neighbours ? neighbours.size : 0;

    var html = '';
    html += '<div class="graph-tooltip-role">' + this._escapeHtml(typeLabel) + '</div>';
    html += '<div class="graph-tooltip-name"><a href="/entidad/' + this._escapeHtml(node.id) + '/">' + this._escapeHtml(node.label) + '</a></div>';
    html += '<div class="graph-tooltip-ref">' + this._escapeHtml(node.id) + '</div>';
    html += '<div class="graph-tooltip-actions">';
    html += connectionCount + ' conexi\xf3n' + (connectionCount !== 1 ? 'es' : '') + ' en esta red';
    if (node.degree) {
      html += ' \xb7 ' + node.degree.toLocaleString() + ' v\xednculos totales en Zasqua';
    }
    html += '</div>';
    html += '<div class="graph-tooltip-actions">';
    html += '<a href="/entidad/' + this._escapeHtml(node.id) + '/" class="graph-tooltip-btn">Ver ficha completa</a>';
    html += ' \xb7 ';
    html += '<a href="/entidad/' + this._escapeHtml(node.id) + '/?vista=red" class="graph-tooltip-btn">Explorar relaciones</a>';
    html += '</div>';

    tooltip.innerHTML = html;
    this._positionTooltip(tooltip, node);

    this.container.appendChild(tooltip);
    this._activeTooltip = tooltip;
    this._tooltipNode = node;
  }

  _positionTooltip(tooltip, node) {
    var coords = this.fg.graph2ScreenCoords(node.x, node.y);
    // Offset by canvas position within parent container
    var canvasRect = this._canvasEl.getBoundingClientRect();
    var containerRect = this.container.getBoundingClientRect();
    var offsetX = canvasRect.left - containerRect.left;
    var offsetY = canvasRect.top - containerRect.top;
    tooltip.style.left = (coords.x + offsetX) + 'px';
    tooltip.style.top = (coords.y + offsetY - 8) + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';
  }

  _updateTooltipPosition() {
    if (this._activeTooltip && this._tooltipNode && this.fg) {
      this._positionTooltip(this._activeTooltip, this._tooltipNode);
    }
  }

  _dismissTooltip() {
    if (this._activeTooltip) {
      this._activeTooltip.remove();
      this._activeTooltip = null;
      this._tooltipNode = null;
    }
  }

  _escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Colour helpers
  // ---------------------------------------------------------------------------

  _nodeColor(node) {
    // type values from curated-entity-graph.json: 'person', 'corporate', 'family'
    if (node.type === 'person') return '#8B2942';
    if (node.type === 'corporate' || node.type === 'corporate_body') return '#6666BB';
    if (node.type === 'family') return '#6666BB';
    if (node.type === 'document') return '#A09888';
    return '#8888CC';
  }

  // ---------------------------------------------------------------------------
  // Message helper
  // ---------------------------------------------------------------------------

  _showMessage(text) {
    var msgEl = this._messageEl;
    msgEl.textContent = text;
    msgEl.style.display = '';
  }
}
