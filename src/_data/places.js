const fs = require('fs');
const path = require('path');

const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_LIMIT = 100;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');

module.exports = async function() {
  const filePath = path.join(DATA_DIR, 'places.json');
  console.log(`[places] Reading ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  let places = JSON.parse(raw);
  if (DEV_MODE && places.length > DEV_LIMIT) {
    console.log(`[places] DEV_MODE: Limiting to ${DEV_LIMIT} of ${places.length}`);
    places = places.slice(0, DEV_LIMIT);
  }
  console.log(`[places] Loaded ${places.length} places`);

  // Attach _linked_count from place-index.json
  const countByCode = new Map();
  try {
    const indexPath = path.join(DATA_DIR, 'place-index.json');
    const indexRaw = fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(indexRaw);
    for (const entry of index) {
      countByCode.set(entry.place_code, entry.linked_description_count);
    }
    console.log(`[places] Loaded place-index.json with ${index.length} records`);
  } catch (e) {
    console.warn('[places] place-index.json not found — _linked_count will be 0 for all places');
  }

  for (const place of places) {
    place._linked_count = countByCode.get(place.id) || 0;
  }

  return places;
};
