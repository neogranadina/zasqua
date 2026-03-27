document.addEventListener('DOMContentLoaded', async function() {
  var timelineEl = document.getElementById('entity-timeline');
  if (!timelineEl) return;

  var entityCode = timelineEl.dataset.entityCode;
  if (!entityCode) return;

  try {
    var res = await fetch('/data/entity-links/' + entityCode + '.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var links = await res.json();

    renderTimeline(timelineEl, links, true);
  } catch (err) {
    console.error('[entity] Failed to load shard:', err);
    timelineEl.innerHTML = '<p class="text-stone-500 text-sm">No se pudieron cargar las descripciones vinculadas. Intente recargar la página.</p>';
  }
});

function renderTimeline(container, links, showRoles) {
  if (!links || links.length === 0) {
    container.innerHTML = '<p class="text-stone-500 text-sm">No se encontraron descripciones vinculadas a este registro.</p>';
    return;
  }

  // Role labels (matching ui.roles from ui.js)
  var roleLabels = {
    creator: 'Productor',
    contributor: 'Colaborador',
    publisher: 'Editor',
    subject: 'Materia',
    mentioned: 'Mencionado'
  };

  // Separate dated and undated entries
  var dated = [];
  var undated = [];
  for (var i = 0; i < links.length; i++) {
    if (links[i].date_expression) {
      dated.push(links[i]);
    } else {
      undated.push(links[i]);
    }
  }

  // Sort dated entries by date_expression (lexicographic — dates are normalised year strings)
  dated.sort(function(a, b) {
    return a.date_expression.localeCompare(b.date_expression);
  });

  // Build HTML
  var html = '';

  for (var j = 0; j < dated.length; j++) {
    html += renderTimelineEntry(dated[j], showRoles, roleLabels);
  }

  if (undated.length > 0) {
    html += '<div class="timeline-no-date">Sin fecha</div>';
    for (var k = 0; k < undated.length; k++) {
      html += renderTimelineEntry(undated[k], showRoles, roleLabels);
    }
  }

  container.innerHTML = html;

  // Update the linked descriptions count in the CTA link
  var ctaEl = document.getElementById('linked-desc-cta');
  if (ctaEl) {
    // Update with the actual shard count
    var countText = ctaEl.textContent.replace(/\d+/, links.length);
    ctaEl.textContent = countText;
  }
}

function renderTimelineEntry(link, showRoles, roleLabels) {
  // Build the description page URL — strip ? and # (safeSlug pattern)
  var slug = link.reference_code.replace(/[?#]/g, '');
  var html = '<div class="timeline-entry">';

  if (link.date_expression) {
    html += '<div class="timeline-date">' + escapeHtml(link.date_expression) + '</div>';
  }

  if (showRoles && link.role) {
    var roleLabel = roleLabels[link.role] || link.role;
    html += '<div class="timeline-role">' + escapeHtml(roleLabel) + '</div>';
  }

  html += '<a href="/' + slug + '/" class="timeline-title">' + escapeHtml(link.title) + '</a>';
  html += '</div>';
  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}
