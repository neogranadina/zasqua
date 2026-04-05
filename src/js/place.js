// Role labels in Spanish (place roles)
var placeRoleLabels = {
  subject: 'Lugar mencionado',
  mentioned: 'Lugar mencionado',
  production: 'Lugar de producción',
  origin: 'Origen',
  destination: 'Destino',
  jurisdiction: 'Jurisdicción',
  venue: 'Lugar de producción',
  unknown: 'Sin rol'
};

// Main page logic — shard loading, intro, role filters, timeline, toggle
(async function() {
  // --- Timeline / shard loading ---

  var timelineEl = document.getElementById('place-timeline');
  if (!timelineEl) return;

  var placeId = timelineEl.dataset.placeId;
  if (!placeId) return;

  var links;
  try {
    var res = await fetch('/data/place-links/' + placeId + '.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    links = await res.json();
  } catch (err) {
    console.error('[place] Failed to load shard:', err);
    timelineEl.innerHTML = '<p class="text-stone-500 text-sm">No se pudieron cargar las descripciones vinculadas.</p>';
    return;
  }

  // State
  var activeRoles = new Set();
  var currentView = mapEl ? 'map' : 'timeline';

  // If no map, show timeline by default
  if (!mapEl) {
    var tlFrame = document.getElementById('place-timeline-frame');
    if (tlFrame) tlFrame.style.display = '';
  }

  buildIntro(links);
  buildRoleFilters(links);
  wireToggleButtons();
  renderTimeline(timelineEl, links, activeRoles);

  // --- Intro sentence with view links ---

  function buildIntro(allLinks) {
    var introEl = document.getElementById('place-intro');
    if (!introEl) return;

    var placeType = (introEl.dataset.placeType || 'lugar').toLowerCase();
    var id = introEl.dataset.placeId;
    var count = allLinks.length;

    var text = 'Este ' + escapeHtml(placeType) + ' aparece vinculado a <strong>' +
      count.toLocaleString('es-CO') + ' descripciones</strong> en el archivo.<br>Ver ';

    introEl.innerHTML = text;

    if (mapEl) {
      var mapLink = document.createElement('button');
      mapLink.type = 'button';
      mapLink.className = 'entity-view-link' + (currentView === 'map' ? ' active' : '');
      mapLink.textContent = 'en un mapa';
      mapLink.dataset.view = 'map';
      mapLink.addEventListener('click', function() { switchView('map'); });
      introEl.appendChild(mapLink);

      introEl.appendChild(document.createTextNode(', como '));
    }

    var tlLink = document.createElement('button');
    tlLink.type = 'button';
    tlLink.className = 'entity-view-link' + (currentView === 'timeline' ? ' active' : '');
    tlLink.textContent = 'una línea de tiempo';
    tlLink.dataset.view = 'timeline';
    tlLink.addEventListener('click', function() { switchView('timeline'); });
    introEl.appendChild(tlLink);

    introEl.appendChild(document.createTextNode(' o como '));

    var searchLink = document.createElement('a');
    searchLink.className = 'entity-view-link';
    searchLink.href = '/buscar/?lugar=' + encodeURIComponent(id);
    searchLink.textContent = 'un filtro en el sistema de búsquedas';
    introEl.appendChild(searchLink);

    introEl.appendChild(document.createTextNode(' de Zasqua.'));
  }

  // --- Segmented control ---

  function wireToggleButtons() {
    var toggleEl = document.getElementById('place-view-toggle');
    if (!toggleEl) return;
    var btns = toggleEl.querySelectorAll('.entity-toggle-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchView(btn.dataset.view);
      });
    });
  }

  function switchView(view) {
    if (view === currentView) return;
    currentView = view;

    // Update prose link styles
    var viewLinks = document.querySelectorAll('.entity-view-link[data-view]');
    viewLinks.forEach(function(link) {
      link.classList.toggle('active', link.dataset.view === view);
    });

    // Update segmented control styles
    var toggleBtns = document.querySelectorAll('.entity-toggle-btn[data-view]');
    toggleBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    var mapFrame = document.getElementById('place-map-frame');
    var timelineFrame = document.getElementById('place-timeline-frame');

    if (view === 'map') {
      if (mapFrame) mapFrame.style.display = '';
      timelineFrame.style.display = 'none';
    } else {
      if (mapFrame) mapFrame.style.display = 'none';
      timelineFrame.style.display = '';
      renderTimeline(timelineEl, links, activeRoles);
    }
  }

  // --- Role filters (pills) ---

  function buildRoleFilters(allLinks) {
    var filtersEl = document.getElementById('place-role-filters');
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
      btn.textContent = (placeRoleLabels[role] || role) + ' (' + roleCounts[role] + ')';
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

    // Explorer link inline with pills
    var exploreLink = document.createElement('a');
    exploreLink.className = 'entity-explore-link';
    exploreLink.href = '/lugares/?q=' + encodeURIComponent(placeId);
    exploreLink.textContent = 'Abrir en explorador de lugares';
    filtersEl.appendChild(exploreLink);
  }

  function applyFilters() {
    if (currentView === 'timeline') {
      renderTimeline(timelineEl, links, activeRoles);
    }
  }

  // --- Timeline rendering ---

function renderTimeline(container, links, activeRoles) {
  var filtered = activeRoles && activeRoles.size > 0
    ? links.filter(function(l) { return activeRoles.has(l.role || 'unknown'); })
    : links;

  if (!filtered || filtered.length === 0) {
    container.innerHTML = '<p class="text-stone-500 text-sm" style="padding:16px 0">No se encontraron descripciones vinculadas con estos filtros.</p>';
    return;
  }

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

  var all = dated.concat(undated.length > 0 ? [null] : [], undated);
  var html = '';
  for (var j = 0; j < all.length; j++) {
    if (all[j] === null) {
      html += '<div class="timeline-no-date">Sin fecha</div>';
      continue;
    }
    var isLast = (j === all.length - 1);
    html += renderTimelineEntry(all[j], isLast);
  }

  container.innerHTML = html;
}

function renderTimelineEntry(link, isLast) {
  var slug = link.reference_code.replace(/[?#]/g, '');
  var html = '<div class="timeline-entry' + (isLast ? ' timeline-entry-last' : '') + '">';

  html += '<div class="timeline-track">';
  html += '<div class="timeline-dot"><div class="timeline-dot-inner"></div></div>';
  if (!isLast) html += '<div class="timeline-line"></div>';
  html += '</div>';

  html += '<div class="timeline-card">';
  if (link.date_expression) {
    html += '<div class="timeline-date">' + escapeHtml(formatDate(link.date_expression)) + '</div>';
  }
  if (link.role) {
    var roleLabel = (typeof placeRoleLabels !== 'undefined' ? placeRoleLabels[link.role] : null) || link.role;
    html += '<span class="timeline-role-badge">' + escapeHtml(roleLabel) + '</span>';
  }
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

})();

// Map initialisation — separate, runs after main logic
(function() {
  var mapEl = document.getElementById('place-map');
  if (!mapEl || typeof maplibregl === 'undefined') return;
  try {
    var lat = parseFloat(mapEl.dataset.lat);
    var lon = parseFloat(mapEl.dataset.lon);
    if (isNaN(lat) || isNaN(lon)) return;

    var map = new maplibregl.Map({
      container: 'place-map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lon, lat],
      zoom: 7
    });

    var markerEl = document.createElement('div');
    markerEl.style.width = '12px';
    markerEl.style.height = '12px';
    markerEl.style.borderRadius = '50%';
    markerEl.style.backgroundColor = '#8B2942';
    markerEl.style.border = '2px solid #FFFFFF';

    new maplibregl.Marker({ element: markerEl })
      .setLngLat([lon, lat])
      .addTo(map);
  } catch (e) {
    console.error('[place] Map init failed:', e);
  }
})();
