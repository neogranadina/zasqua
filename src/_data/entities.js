const fs = require('fs');
const path = require('path');

const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_LIMIT = 100;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');

module.exports = async function() {
  const filePath = path.join(DATA_DIR, 'entities.json');
  console.log(`[entities] Reading ${filePath}`);
  let entities;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    entities = JSON.parse(raw);
  } catch (e) {
    console.warn('[entities] entities.json not found — returning empty array');
    return [];
  }
  if (DEV_MODE && entities.length > DEV_LIMIT) {
    console.log(`[entities] DEV_MODE: Limiting to ${DEV_LIMIT} of ${entities.length}`);
    entities = entities.slice(0, DEV_LIMIT);
  }
  console.log(`[entities] Loaded ${entities.length} entities`);

  // Attach _linked_count from entity-index.json
  const countByCode = new Map();
  try {
    const indexPath = path.join(DATA_DIR, 'entity-index.json');
    const indexRaw = fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(indexRaw);
    for (const entry of index) {
      countByCode.set(entry.entity_code, entry.linked_description_count);
    }
    console.log(`[entities] Loaded entity-index.json with ${index.length} records`);
  } catch (e) {
    console.warn('[entities] entity-index.json not found — _linked_count will be 0 for all entities');
  }

  for (const entity of entities) {
    entity._linked_count = countByCode.get(entity.entity_code) || 0;
  }

  return entities;
};
