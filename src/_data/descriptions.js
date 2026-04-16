const fs = require('fs');
const path = require('path');
const ui = require('./ui.js');

const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_LIMIT = 100;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');

module.exports = async function() {
  const filePath = path.join(DATA_DIR, 'descriptions.json');
  console.log(`[descriptions] Reading ${filePath}`);

  const raw = fs.readFileSync(filePath, 'utf8');
  let descriptions = JSON.parse(raw);

  if (DEV_MODE && descriptions.length > DEV_LIMIT) {
    console.log(`[descriptions] DEV_MODE: Limiting to ${DEV_LIMIT} of ${descriptions.length}`);
    descriptions = descriptions.slice(0, DEV_LIMIT);
  }

  console.log(`[descriptions] Loaded ${descriptions.length} descriptions`);

  // Load repositories and build lookup map
  const reposPath = path.join(DATA_DIR, 'repositories.json');
  const reposRaw = fs.readFileSync(reposPath, 'utf8');
  const repos = JSON.parse(reposRaw);
  const reposByCode = new Map();
  for (const repo of repos) {
    reposByCode.set(repo.code, repo);
  }

  // Build lookup map
  const byRefCode = new Map();
  for (const desc of descriptions) {
    byRefCode.set(desc.reference_code, desc);
  }

  // Load reverse-lookup files for entity/place codes per description
  let entityLookup = {};
  let placeLookup = {};
  try {
    entityLookup = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'desc-entity-lookup.json'), 'utf8'));
  } catch (e) {
    console.warn('[descriptions] desc-entity-lookup.json not found — entity codes will be empty');
  }
  try {
    placeLookup = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'desc-place-lookup.json'), 'utf8'));
  } catch (e) {
    console.warn('[descriptions] desc-place-lookup.json not found — place codes will be empty');
  }

  // Attach precomputed data to each description
  for (const desc of descriptions) {
    // Ancestors (breadcrumb chain)
    const ancestors = [];
    let current = desc;
    while (current && current.parent_reference_code) {
      const parent = byRefCode.get(current.parent_reference_code);
      if (parent) {
        ancestors.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    desc._ancestors = ancestors;

    // Repository object
    desc._repo = reposByCode.get(desc.repository_code) || null;

    // Enriched entity/place objects (for template links — D-12)
    const entityLinks = entityLookup[desc.reference_code] || [];
    desc._entity_links = entityLinks.map(ent => ({
      ...ent,
      role_labels: ent.roles
        .map(r => ui.roles[r])
        .filter(Boolean),
    }));

    const placeLinks = placeLookup[desc.reference_code] || [];
    desc._place_links = placeLinks;

    // String arrays for Pagefind filter spans (must stay as strings)
    desc._entity_codes = entityLinks.map(e => e.code);
    desc._place_codes = placeLinks.map(p => p.place_code);
  }

  console.log(`[descriptions] Precomputed ancestors and repos`);
  console.log(`[descriptions] Attached enriched entity/place links to ${descriptions.length} descriptions`);
  return descriptions;
};
