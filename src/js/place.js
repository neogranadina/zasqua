document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialise map (if map element exists — places with coordinates only)
  initMap();

  // 2. Fetch and render timeline
  const timelineEl = document.getElementById('place-timeline');
  if (!timelineEl) return;

  const placeCode = timelineEl.dataset.placeCode;
  if (!placeCode) return;

  try {
    const res = await fetch(`/data/place-links/${placeCode}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const links = await res.json();
    renderTimeline(timelineEl, links);
  } catch (err) {
    console.error('[place] Failed to load shard:', err);
    timelineEl.innerHTML = '<p class="text-stone-500 text-sm">No se pudieron cargar las descripciones vinculadas. Intente recargar la página.</p>';
  }
});

function initMap() {
  const mapEl = document.getElementById('place-map');
  if (!mapEl) return; // No coordinates — skip map init

  const lat = parseFloat(mapEl.dataset.lat);
  const lon = parseFloat(mapEl.dataset.lon);
  if (isNaN(lat) || isNaN(lon)) return;

  // pmtiles protocol already registered by inline module script in <head>
  // Do NOT call addProtocol here (avoids "Protocol already registered" warning)

  const map = new maplibregl.Map({
    container: 'place-map',
    style: 'https://cdn.protomaps.com/basemaps/v4/en.json',
    center: [lon, lat],
    zoom: 7
  });

  // Burgundy pin marker: 12px circle, #8B2942, 2px white border
  const markerEl = document.createElement('div');
  markerEl.style.width = '12px';
  markerEl.style.height = '12px';
  markerEl.style.borderRadius = '50%';
  markerEl.style.backgroundColor = '#8B2942';
  markerEl.style.border = '2px solid #FFFFFF';

  new maplibregl.Marker({ element: markerEl })
    .setLngLat([lon, lat])
    .addTo(map);
}

function renderTimeline(container, links) {
  if (!links || links.length === 0) {
    container.innerHTML = '<p class="text-stone-500 text-sm">No se encontraron descripciones vinculadas a este registro.</p>';
    return;
  }

  const dated = [];
  const undated = [];
  for (const link of links) {
    if (link.date_expression) {
      dated.push(link);
    } else {
      undated.push(link);
    }
  }

  dated.sort((a, b) => a.date_expression.localeCompare(b.date_expression));

  let html = '';
  for (const link of dated) {
    html += renderTimelineEntry(link);
  }
  if (undated.length > 0) {
    html += '<div class="timeline-no-date">Sin fecha</div>';
    for (const link of undated) {
      html += renderTimelineEntry(link);
    }
  }

  container.innerHTML = html;

  // Update CTA count from loaded shard (more accurate than build-time count)
  const ctaEl = document.getElementById('linked-desc-cta');
  if (ctaEl) {
    ctaEl.textContent = ctaEl.textContent.replace(/\d+/, links.length);
  }
}

function renderTimelineEntry(link) {
  const slug = link.reference_code.replace(/[?#]/g, '');
  let html = '<div class="timeline-entry">';
  if (link.date_expression) {
    html += `<div class="timeline-date">${escapeHtml(link.date_expression)}</div>`;
  }
  // Place timelines do not show role labels (roles are entity-specific per D-13)
  html += `<a href="/${slug}/" class="timeline-title">${escapeHtml(link.title)}</a>`;
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
