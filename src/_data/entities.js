const fs = require('fs');
const path = require('path');

const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_LIMIT = 100;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');

module.exports = async function() {
  const filePath = path.join(DATA_DIR, 'entities.json');
  console.log(`[entities] Reading ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  let entities = JSON.parse(raw);
  if (DEV_MODE && entities.length > DEV_LIMIT) {
    console.log(`[entities] DEV_MODE: Limiting to ${DEV_LIMIT} of ${entities.length}`);
    entities = entities.slice(0, DEV_LIMIT);
  }
  console.log(`[entities] Loaded ${entities.length} entities`);
  return entities;
};
