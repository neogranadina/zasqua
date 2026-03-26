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
  return places;
};
