document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('place-map');
  if (!mapEl) return;

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
});
