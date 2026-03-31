// Role labels in Spanish
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

// Entity colours by type (shared with graph)
var entityColors = {
  person: '#8B2942',
  corporate_body: '#6666BB',
  family: '#6666BB'
};

document.addEventListener('DOMContentLoaded', async function() {
  var timelineEl = document.getElementById('entity-timeline');
  if (!timelineEl) return;

  var entityCode = timelineEl.dataset.entityCode;
  if (!entityCode) return;

  var links;
  try {
    var res = await fetch('/data/entity-links/' + entityCode + '.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    links = await res.json();
  } catch (err) {
    console.error('[entity] Failed to load shard:', err);
    timelineEl.innerHTML = '<p class="text-stone-500 text-sm">No se pudieron cargar las descripciones vinculadas. Intente recargar la página.</p>';
    return;
  }

  // State
  var activeRoles = new Set();
  var currentView = 'timeline';
  var graphInstance = null;

  // Initial render
  renderTimeline(timelineEl, links, activeRoles);
  buildIntro(links);
  buildRoleFilters(links);

  // --- Intro sentence with view links ---

  function buildIntro(allLinks) {
    var introEl = document.getElementById('entity-intro');
    if (!introEl) return;

    var entityType = (introEl.dataset.entityType || 'entidad').toLowerCase();
    var code = introEl.dataset.entityCode;
    var count = allLinks.length;

    var text = 'Esta ' + escapeHtml(entityType) + ' aparece vinculada a <strong>' +
      count.toLocaleString('es-CO') + ' descripciones</strong> en el archivo.<br>Ver como ';

    introEl.innerHTML = text;

    // "una línea de tiempo" link
    var tlLink = document.createElement('button');
    tlLink.type = 'button';
    tlLink.className = 'entity-view-link active';
    tlLink.textContent = 'una línea de tiempo';
    tlLink.dataset.view = 'timeline';
    tlLink.addEventListener('click', function() { switchView('timeline'); });
    introEl.appendChild(tlLink);

    introEl.appendChild(document.createTextNode(', '));

    // "una red" link
    var graphLink = document.createElement('button');
    graphLink.type = 'button';
    graphLink.className = 'entity-view-link';
    graphLink.textContent = 'una red';
    graphLink.dataset.view = 'graph';
    graphLink.addEventListener('click', function() { switchView('graph'); });
    introEl.appendChild(graphLink);

    introEl.appendChild(document.createTextNode(' o '));

    // "un filtro en el sistema de búsquedas" link
    var searchLink = document.createElement('a');
    searchLink.className = 'entity-view-link';
    searchLink.href = '/buscar/?entidad=' + encodeURIComponent(code);
    searchLink.textContent = 'un filtro en el sistema de búsquedas';
    introEl.appendChild(searchLink);

    introEl.appendChild(document.createTextNode(' de Zasqua.'));
  }

  function switchView(view) {
    if (view === currentView) return;
    currentView = view;

    // Update link styles
    var viewLinks = document.querySelectorAll('.entity-view-link[data-view]');
    viewLinks.forEach(function(link) {
      link.classList.toggle('active', link.dataset.view === view);
    });

    var timelineFrame = document.getElementById('entity-timeline-frame');
    var graphFrame = document.getElementById('entity-graph-frame');

    if (view === 'timeline') {
      timelineFrame.style.display = '';
      graphFrame.style.display = 'none';
      renderTimeline(timelineEl, links, activeRoles);
    } else {
      timelineFrame.style.display = 'none';
      graphFrame.style.display = '';
      renderGraph(links, activeRoles);
    }
  }

  // --- Role filters (pills) ---

  function buildRoleFilters(allLinks) {
    var filtersEl = document.getElementById('entity-role-filters');
    if (!filtersEl) return;

    var roleCounts = {};
    for (var i = 0; i < allLinks.length; i++) {
      var r = allLinks[i].role || 'unknown';
      roleCounts[r] = (roleCounts[r] || 0) + 1;
    }

    var roles = Object.keys(roleCounts).sort(function(a, b) {
      return roleCounts[b] - roleCounts[a];
    });

    filtersEl.innerHTML = '';
    for (var j = 0; j < roles.length; j++) {
      var role = roles[j];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'entity-role-btn';
      btn.dataset.role = role;
      btn.textContent = (roleLabels[role] || role) + ' (' + roleCounts[role] + ')';
      btn.addEventListener('click', function() {
        var r = this.dataset.role;
        if (activeRoles.has(r)) {
          activeRoles.delete(r);
          this.classList.remove('active');
        } else {
          activeRoles.add(r);
          this.classList.add('active');
        }
        applyFilters();
      });
      filtersEl.appendChild(btn);
    }
  }

  function applyFilters() {
    if (currentView === 'timeline') {
      renderTimeline(timelineEl, links, activeRoles);
    } else {
      renderGraph(links, activeRoles);
    }
  }

  // --- Graph view ---

  // Graph state persists across re-renders
  var graphNodes = new Map();  // id → node object
  var graphEdges = [];         // { source, target, role }
  var docLookup = null;        // desc-entity-lookup.json (loaded once)
  var pagefindEntity = null;   // Pagefind instance (loaded once)
  var shardCache = new Map();  // entity_code → links array

  function renderGraph(allLinks, activeFilters) {
    var canvas = document.getElementById('entity-graph-canvas');
    if (!canvas) return;

    var filtered = filterLinks(allLinks, activeFilters);

    if (filtered.length === 0) {
      canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#78716c;font-size:0.875rem">Sin descripciones para mostrar</div>';
      if (graphInstance) { graphInstance._destructor && graphInstance._destructor(); graphInstance = null; }
      return;
    }

    // Reset graph data
    graphNodes.clear();
    graphEdges = [];

    // Central entity node
    var entityTypeEl = document.querySelector('.level-badge');
    var eType = entityTypeEl ? entityTypeEl.textContent.trim().toLowerCase() : 'person';
    var entityNameEl = document.querySelector('.detail-title');
    var mappedType = eType === 'persona' ? 'person' : eType === 'institución' ? 'corporate_body' : 'person';

    graphNodes.set(entityCode, {
      id: entityCode,
      type: 'entity',
      label: entityNameEl ? entityNameEl.textContent.trim() : entityCode,
      entityType: mappedType,
      color: entityColors[mappedType] || entityColors.person
    });

    // Document nodes from this entity's links
    for (var i = 0; i < filtered.length; i++) {
      var link = filtered[i];
      if (!graphNodes.has(link.reference_code)) {
        graphNodes.set(link.reference_code, {
          id: link.reference_code,
          type: 'document',
          label: link.title,
          date: link.date_expression || '',
          color: '#A09888'
        });
      }
      graphEdges.push({ source: entityCode, target: link.reference_code, role: link.role });
    }

    rebuildForceGraph(canvas);
  }

  function rebuildForceGraph(canvas) {
    canvas.innerHTML = '';

    var nodes = Array.from(graphNodes.values());
    var edges = graphEdges.map(function(e) { return Object.assign({}, e); });

    // Build adjacency
    var nodeNeighbours = new Map();
    var nodeLinks = new Map();
    for (var i = 0; i < graphEdges.length; i++) {
      var edge = graphEdges[i];
      for (var nid of [edge.source, edge.target]) {
        if (!nodeNeighbours.has(nid)) nodeNeighbours.set(nid, new Set());
        if (!nodeLinks.has(nid)) nodeLinks.set(nid, new Set());
      }
      nodeNeighbours.get(edge.source).add(edge.target);
      nodeNeighbours.get(edge.target).add(edge.source);
      nodeLinks.get(edge.source).add(edge);
      nodeLinks.get(edge.target).add(edge);
    }

    var highlightedNodes = new Set();
    var highlightedLinks = new Set();

    if (graphInstance) { graphInstance._destructor && graphInstance._destructor(); }

    var width = canvas.clientWidth || 600;
    var height = canvas.clientHeight || 480;

    graphInstance = new ForceGraph(canvas)
      .width(width)
      .height(height)
      .graphData({ nodes: nodes, links: edges })
      .nodeId('id')
      .nodeLabel(function(node) {
        if (node.type === 'entity') {
          return '<strong>' + escapeHtml(node.label) + '</strong>';
        }
        var title = node.label.length > 80 ? node.label.substring(0, 80) + '\u2026' : node.label;
        return '<strong>' + escapeHtml(title) + '</strong>' + (node.date ? '<br>' + formatDate(node.date) : '');
      })
      .nodeVal(function(node) { return node.type === 'entity' ? 2 : 0.3; })
      .nodeRelSize(2.5)
      .nodeColor(function(node) {
        if (highlightedNodes.size > 0 && !highlightedNodes.has(node.id)) {
          return node.type === 'entity' ? '#DDD8E0' : '#E8E4E0';
        }
        if (highlightedNodes.has(node.id) && node.type === 'document') return '#807060';
        return node.color;
      })
      .nodeCanvasObjectMode(function(node) {
        return node.type === 'entity' ? 'after' : undefined;
      })
      .nodeCanvasObject(function(node, ctx, globalScale) {
        if (node.type !== 'entity') return;
        var show = globalScale > 1.2 || highlightedNodes.has(node.id);
        if (!show) return;
        var fontSize = 10 / globalScale;
        ctx.font = 'bold ' + fontSize + 'px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = highlightedNodes.has(node.id) ? '#333' : '#777';
        var r = Math.sqrt(3) * 3;
        ctx.fillText(node.label, node.x, node.y + r / globalScale + 1);
      })
      .linkColor(function(link) {
        if (highlightedLinks.has(link)) return '#888';
        if (highlightedNodes.size > 0) return 'rgba(0,0,0,0.03)';
        return '#E0DDD8';
      })
      .linkWidth(function(link) { return highlightedLinks.has(link) ? 2 : 0.8; })
      .enableNodeDrag(true)
      .enableZoomInteraction(true)
      .cooldownTime(5000)
      .d3AlphaDecay(0.02)
      .d3VelocityDecay(0.3)
      .onNodeHover(function(node) {
        canvas.style.cursor = node ? 'pointer' : '';
        highlightedNodes.clear();
        highlightedLinks.clear();
        if (node) {
          highlightedNodes.add(node.id);
          var neighbours = nodeNeighbours.get(node.id);
          if (neighbours) neighbours.forEach(function(n) { highlightedNodes.add(n); });
          var nLinks = nodeLinks.get(node.id);
          if (nLinks) nLinks.forEach(function(l) { highlightedLinks.add(l); });
        }
      })
      .onNodeClick(function(node) {
        if (!node) return;
        if (node.type === 'entity') {
          window.location.href = '/entidad/' + node.id + '/';
        } else if (node.type === 'document') {
          // Centre on this document, then expand its connected entities
          graphInstance.centerAt(node.x, node.y, 500);
          graphInstance.zoom(2, 500);
          expandDocument(node.id, canvas);
        }
      })
      .onNodeDragEnd(function(node) { node.fx = node.x; node.fy = node.y; });

    graphInstance.d3Force('charge').strength(-20);
    graphInstance.d3Force('link').distance(20).strength(0.5);

    // Zoom to fit once on initial render
    var initialFit = true;
    graphInstance.onEngineStop(function() {
      if (initialFit) {
        initialFit = false;
        graphInstance.zoomToFit(400, 30);
      }
    });

    // Resize
    new ResizeObserver(function() {
      if (graphInstance && canvas.clientWidth > 0) {
        graphInstance.width(canvas.clientWidth).height(canvas.clientHeight);
      }
    }).observe(canvas);
  }

  // --- Expand document: load connected entities ---

  async function expandDocument(refCode, canvas) {
    // Load the lookup (once)
    if (!docLookup) {
      try {
        var res = await fetch('/data/desc-entity-lookup.json');
        if (res.ok) docLookup = await res.json();
      } catch (e) { console.error('[entity] Failed to load doc lookup:', e); }
    }
    if (!docLookup || !docLookup[refCode]) return;

    // Load Pagefind (once)
    if (!pagefindEntity) {
      try {
        pagefindEntity = await import('/pagefind-entities/pagefind.js');
        await pagefindEntity.options({ bundlePath: '/pagefind-entities/' });
        await pagefindEntity.init();
      } catch (e) { console.error('[entity] Failed to load Pagefind:', e); return; }
    }

    var entityCodes = docLookup[refCode];
    var newEntities = entityCodes.filter(function(c) { return !graphNodes.has(c); });
    if (newEntities.length === 0) return;

    // Search Pagefind for each new entity to get name + type
    for (var i = 0; i < newEntities.length; i++) {
      var code = newEntities[i];
      try {
        var search = await pagefindEntity.search(code);
        if (search.results.length > 0) {
          var hit = await search.results[0].data();
          var url = hit.url || '';
          var m = url.match(/\/entidad\/([^/]+)\//);
          // Verify we got the right entity
          if (m && m[1] === code) {
            var eType = hit.meta?.entity_type || 'person';
            graphNodes.set(code, {
              id: code,
              type: 'entity',
              label: hit.meta?.title || code,
              entityType: eType,
              color: entityColors[eType] || entityColors.person
            });
            graphEdges.push({ source: code, target: refCode, role: '' });
          }
        }
      } catch (e) { /* skip failed lookups */ }
    }

    // Also fetch shard for each new entity to find shared documents with existing nodes
    for (var j = 0; j < newEntities.length; j++) {
      var c = newEntities[j];
      if (!graphNodes.has(c)) continue; // Pagefind lookup failed
      if (!shardCache.has(c)) {
        try {
          var r = await fetch('/data/entity-links/' + c + '.json');
          if (r.ok) shardCache.set(c, await r.json());
          else shardCache.set(c, []);
        } catch (e) { shardCache.set(c, []); }
      }
      // Add edges to existing document nodes
      var shard = shardCache.get(c) || [];
      for (var k = 0; k < shard.length; k++) {
        var s = shard[k];
        if (graphNodes.has(s.reference_code) && s.reference_code !== refCode) {
          // This entity is also linked to another document already in the graph
          graphEdges.push({ source: c, target: s.reference_code, role: s.role });
        }
      }
    }

    // Incrementally add new nodes/links without rebuilding
    if (graphInstance) {
      var currentData = graphInstance.graphData();
      var nodeIds = new Set(currentData.nodes.map(function(n) { return n.id; }));
      var edgeKeys = new Set(currentData.links.map(function(l) {
        var s = typeof l.source === 'object' ? l.source.id : l.source;
        var t = typeof l.target === 'object' ? l.target.id : l.target;
        return s + '→' + t;
      }));

      var newNodes = [];
      var newLinks = [];

      graphNodes.forEach(function(node) {
        if (!nodeIds.has(node.id)) newNodes.push(node);
      });

      graphEdges.forEach(function(edge) {
        var key = edge.source + '→' + edge.target;
        if (!edgeKeys.has(key)) newLinks.push(Object.assign({}, edge));
      });

      if (newNodes.length > 0 || newLinks.length > 0) {
        graphInstance.graphData({
          nodes: currentData.nodes.concat(newNodes),
          links: currentData.links.concat(newLinks)
        });
        graphInstance.d3ReheatSimulation();
      }
    }
  }

  // --- Helpers ---

  function filterLinks(allLinks, active) {
    if (active.size === 0) return allLinks;
    return allLinks.filter(function(link) {
      return active.has(link.role || 'unknown');
    });
  }

});

// --- Timeline rendering ---

function renderTimeline(container, links, activeRoles) {
  var filtered = activeRoles && activeRoles.size > 0
    ? links.filter(function(l) { return activeRoles.has(l.role || 'unknown'); })
    : links;

  if (!filtered || filtered.length === 0) {
    container.innerHTML = '<p class="text-stone-500 text-sm" style="padding:16px 0">No se encontraron descripciones vinculadas con estos filtros.</p>';
    return;
  }

  // Separate dated and undated entries
  var dated = [];
  var undated = [];
  for (var i = 0; i < filtered.length; i++) {
    if (filtered[i].date_expression) {
      dated.push(filtered[i]);
    } else {
      undated.push(filtered[i]);
    }
  }

  dated.sort(function(a, b) {
    return a.date_expression.localeCompare(b.date_expression);
  });

  var html = '';
  for (var j = 0; j < dated.length; j++) {
    html += renderTimelineEntry(dated[j]);
  }

  if (undated.length > 0) {
    html += '<div class="timeline-no-date">Sin fecha</div>';
    for (var k = 0; k < undated.length; k++) {
      html += renderTimelineEntry(undated[k]);
    }
  }

  container.innerHTML = html;
}

function renderTimelineEntry(link) {
  var slug = link.reference_code.replace(/[?#]/g, '');
  var html = '<div class="timeline-entry">';

  html += '<div class="timeline-connector"></div>';

  if (link.date_expression || link.role) {
    html += '<div class="timeline-centre">';
    if (link.date_expression) {
      html += '<div class="timeline-date">' + escapeHtml(formatDate(link.date_expression)) + '</div>';
    }
    if (link.role) {
      var roleLabel = roleLabels[link.role] || link.role;
      html += '<div class="timeline-role">' + escapeHtml(roleLabel) + '</div>';
    }
    html += '</div>';
  }

  html += '<div class="timeline-card">';
  html += '<a href="/' + slug + '/" class="timeline-title">' + escapeHtml(link.title) + '</a>';
  html += '<div class="timeline-ref">' + escapeHtml(link.reference_code) + '</div>';
  html += '</div>';

  html += '</div>';
  return html;
}

function formatDate(dateStr) {
  if (!dateStr) return '';

  var months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  if (dateStr.indexOf(' .. ') !== -1) {
    var parts = dateStr.split(' .. ');
    return formatDate(parts[0]) + ' – ' + formatDate(parts[1]);
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}
