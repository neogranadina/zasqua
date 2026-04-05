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
 *  - Ego-network expansion on first click (fetches entity-link shard)
 *  - Navigate to entity detail page on second click (double-tap same node)
 *  - Fallback message when ?nodo= entity is not in the curated set
 *
 * Replaces EntityNetworkGraph (bipartite, shard-on-load — caused browser crash).
 */

class CuratedEntityGraph {
  constructor(container) {
    this.container = container;
    this.fg = null;
    this.graphData = null;          // { nodes: [], links: [] } from JSON
    this.highlightedNodes = new Set();
    this.expandedNodes = new Set(); // node ids that have been ego-expanded
    this._canvasEl = null;
    this._legendEl = null;
    this._messageEl = null;
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

    this.fg = new ForceGraph(this._canvasEl)
      .graphData({ nodes: nodes, links: links })
      .cooldownTicks(0)
      .d3AlphaDecay(1)
      .nodeId('id')
      .nodeLabel(function(n) {
        return n.label + ' (' + n.degree + ' conexiones)';
      })
      .nodeColor(function(n) {
        return self._nodeColor(n);
      })
      .nodeVal(function(n) {
        return Math.max(3, Math.sqrt(n.degree) * 0.5);
      })
      .linkWidth(function(l) {
        return Math.max(0.5, Math.sqrt(l.weight) * 0.3);
      })
      .linkColor(function() {
        return 'rgba(160, 152, 136, 0.3)';
      })
      .onNodeClick(function(node) {
        self._onNodeClick(node);
      })
      .onNodeHover(function(node) {
        self._onNodeHover(node);
      })
      .width(this._canvasEl.clientWidth)
      .height(300);

    // Resize observer — keep canvas filling its container width
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function() {
        if (self.fg && self._canvasEl.clientWidth > 0) {
          self.fg.width(self._canvasEl.clientWidth);
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

    if (this.expandedNodes.has(node.id)) {
      // Second click on already-expanded node → navigate to detail page
      window.location.href = '/entidad/' + node.id + '/';
      return;
    }

    // First click → ego-network expansion
    this.expandedNodes.add(node.id);
    this._expandEgoNetwork(node);
  }

  async _expandEgoNetwork(node) {
    var self = this;
    var shard;
    try {
      var resp = await fetch('/data/entity-links/' + node.id + '.json');
      if (!resp.ok) {
        // Shard not found — treat as already-expanded, navigate on next click
        return;
      }
      shard = await resp.json();
    } catch (err) {
      console.error('CuratedEntityGraph: failed to fetch shard for', node.id, err);
      return;
    }

    // Build a set of entity codes already in the graph
    var existingIds = new Set(
      this.graphData.nodes.map(function(n) { return n.id; })
    );

    // Collect unique new entity codes from the shard
    // Shard format: [{ reference_code, entity_code, role, title, ... }]
    var newEntityCodes = new Set();
    for (var i = 0; i < shard.length; i++) {
      var entry = shard[i];
      // Each shard entry represents a description linked to this entity;
      // we want co-entities from the same description — not in this shard.
      // The shard contains only this entity's own links (not co-entity codes).
      // Use the reference_code as a link label and skip if no peer info.
      // Since shards only carry this entity's own descriptions, ego expansion
      // shows the descriptions that link to this entity.
    }
    // Shard entries are description links, not entity-to-entity.
    // We create lightweight "description" nodes to represent 1-hop context.
    var newNodes = [];
    var newLinks = [];
    var count = 0;

    for (var j = 0; j < shard.length && count < 20; j++) {
      var link = shard[j];
      var refCode = link.reference_code;
      if (!refCode || existingIds.has(refCode)) continue;

      existingIds.add(refCode);
      newNodes.push({
        id: refCode,
        label: link.title || refCode,
        type: 'document',
        degree: 0,
        x: node.x + (Math.random() - 0.5) * 50,
        y: node.y + (Math.random() - 0.5) * 50
      });
      newLinks.push({ source: node.id, target: refCode, weight: 1 });
      count++;
    }

    if (newNodes.length === 0) return;

    var allNodes = this.graphData.nodes.concat(newNodes);
    var allLinks = (this.graphData.links || []).concat(newLinks);
    this.graphData = { nodes: allNodes, links: allLinks };

    // Let new nodes settle briefly then freeze
    this.fg.cooldownTicks(50);
    this.fg.graphData(this.graphData);
  }

  _onNodeHover(node) {
    this.container.style.cursor = node ? 'pointer' : 'default';
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
