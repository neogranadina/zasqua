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

  // Aggregate distinct roles per entity from the master entity_links file.
  // The backend export currently leaves entity.roles empty, so we compute it
  // here at build time to enable role-based facets in the entity explorer.
  // Each link in entity_links.json carries the role the entity played in
  // that document, so the aggregated set is the entity's repertoire of roles.
  const rolesByCode = new Map();
  try {
    const linksPath = path.join(DATA_DIR, 'entity_links.json');
    const linksRaw = fs.readFileSync(linksPath, 'utf8');
    const links = JSON.parse(linksRaw);
    for (const link of links) {
      if (!link.entity_code || !link.role) continue;
      let set = rolesByCode.get(link.entity_code);
      if (!set) {
        set = new Set();
        rolesByCode.set(link.entity_code, set);
      }
      set.add(link.role);
    }
    console.log(`[entities] Aggregated roles for ${rolesByCode.size} entities from entity_links.json`);
  } catch (e) {
    console.warn('[entities] entity_links.json not found — entity.roles will remain empty');
  }

  for (const entity of entities) {
    const set = rolesByCode.get(entity.entity_code);
    entity.roles = set ? Array.from(set).sort() : [];
  }

  return entities;
};
