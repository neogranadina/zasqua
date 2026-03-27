'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function main() {
  const placesPath = path.join(DATA_DIR, 'places.json');
  console.log(`[places-to-geojson] Reading ${placesPath}`);
  const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
  console.log(`[places-to-geojson] places.json: ${places.length} records`);

  const features = [];
  let skipped = 0;

  for (const p of places) {
    const lat = p.lat ?? p.latitude;
    const lon = p.lon ?? p.longitude;
    if (lat == null || lon == null) {
      skipped++;
      continue;
    }
    features.push({
      type: 'Feature',
      // GeoJSON spec requires [longitude, latitude] — not [lat, lon]
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { place_code: p.place_code || p.label, display_name: p.display_name },
    });
  }

  const geojson = { type: 'FeatureCollection', features };
  const outPath = path.join(DATA_DIR, 'places.geojson');
  fs.writeFileSync(outPath, JSON.stringify(geojson));

  console.log(`[places-to-geojson] Wrote ${features.length} features to ${outPath}`);
  console.log(`[places-to-geojson] Skipped ${skipped} places with no coordinates`);

  if (features.length > 0) {
    const first = features[0];
    const [lon, lat] = first.geometry.coordinates;
    console.log(`[places-to-geojson] First feature: ${first.properties.display_name} — lon=${lon}, lat=${lat}`);
    console.log('[places-to-geojson] Spot-check: Colombian places should have lon ≈ -74 to -67 (negative) and lat ≈ 1-12 (positive)');
  }
}

main();
