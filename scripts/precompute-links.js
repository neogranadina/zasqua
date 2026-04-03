'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_LIMIT = parseInt(process.env.DEV_LIMIT || '500', 10);

async function main() {
  console.log(`[precompute-links] DATA_DIR: ${DATA_DIR}`);
  if (DEV_MODE) {
    console.log(`[precompute-links] DEV_MODE enabled — limiting to ${DEV_LIMIT} shards per type`);
  }

  // -------------------------------------------------------------------------
  // 1. Entity links: read, group by entity_code, write shards
  // -------------------------------------------------------------------------

  const entityLinksPath = path.join(DATA_DIR, 'entity_links.json');
  console.log(`[precompute-links] Reading ${entityLinksPath}`);
  const entityLinksRaw = fs.readFileSync(entityLinksPath, 'utf8');
  const entityLinks = JSON.parse(entityLinksRaw);
  console.log(`[precompute-links] entity_links.json: ${entityLinks.length} records`);

  // Group by entity_code
  const byEntity = new Map();
  for (const link of entityLinks) {
    const code = link.entity_code;
    if (!byEntity.has(code)) {
      byEntity.set(code, []);
    }
    byEntity.get(code).push({
      reference_code: link.reference_code,
      title: link.title,
      date_expression: link.date_expression,
      repository_code: link.repository_code,
      role: link.role,
    });
  }

  // Write per-entity shards
  const entityShardsDir = path.join(DATA_DIR, 'entity-links');
  fs.mkdirSync(entityShardsDir, { recursive: true });

  let entityShardCount = 0;
  const entityCodes = Array.from(byEntity.keys());
  const entityCodesToWrite = DEV_MODE ? entityCodes.slice(0, DEV_LIMIT) : entityCodes;

  for (const code of entityCodesToWrite) {
    const shardPath = path.join(entityShardsDir, `${code}.json`);
    fs.writeFileSync(shardPath, JSON.stringify(byEntity.get(code)));
    entityShardCount++;
    if (entityShardCount % 10000 === 0) {
      console.log(`[precompute-links] Wrote ${entityShardCount} entity-links shards...`);
    }
  }
  console.log(`[precompute-links] Wrote ${entityShardCount} entity-links shards to ${entityShardsDir}`);

  // -------------------------------------------------------------------------
  // 2. Build entity-index.json (D-06 fields)
  // -------------------------------------------------------------------------

  const entitiesPath = path.join(DATA_DIR, 'entities.json');
  console.log(`[precompute-links] Reading ${entitiesPath}`);
  const entitiesRaw = fs.readFileSync(entitiesPath, 'utf8');
  const entities = JSON.parse(entitiesRaw);
  console.log(`[precompute-links] entities.json: ${entities.length} records`);

  const entityIndex = entities.map(e => ({
    entity_code: e.entity_code,
    display_name: e.display_name,
    sort_name: e.sort_name,
    entity_type: e.entity_type,
    date_earliest: e.date_earliest,
    date_latest: e.date_latest,
    primary_function: e.primary_function,
    linked_description_count: (byEntity.get(e.entity_code) || []).length,
  }));

  const entityIndexPath = path.join(DATA_DIR, 'entity-index.json');
  fs.writeFileSync(entityIndexPath, JSON.stringify(entityIndex));
  console.log(`[precompute-links] Wrote entity-index.json with ${entityIndex.length} records`);

  // -------------------------------------------------------------------------
  // 3. Place links: read, group by place_code, write shards
  // -------------------------------------------------------------------------

  const placeLinksPath = path.join(DATA_DIR, 'place_links.json');
  console.log(`[precompute-links] Reading ${placeLinksPath}`);
  const placeLinksRaw = fs.readFileSync(placeLinksPath, 'utf8');
  const placeLinks = JSON.parse(placeLinksRaw);
  console.log(`[precompute-links] place_links.json: ${placeLinks.length} records`);

  // Group by place_code
  const byPlace = new Map();
  let nullPlaceCount = 0;
  for (const link of placeLinks) {
    const code = link.place_code;
    if (code === null || code === undefined) {
      nullPlaceCount++;
      console.warn(`[precompute-links] WARNING: link with null/undefined place_code skipped (reference_code: ${link.reference_code})`);
      continue;
    }
    if (!byPlace.has(code)) {
      byPlace.set(code, []);
    }
    byPlace.get(code).push({
      reference_code: link.reference_code,
      title: link.title,
      date_expression: link.date_expression,
      repository_code: link.repository_code,
      role: link.role,
    });
  }
  if (nullPlaceCount > 0) {
    console.warn(`[precompute-links] WARNING: Skipped ${nullPlaceCount} place_links records with null/undefined place_code`);
  }

  // Write per-place shards
  const placeShardsDir = path.join(DATA_DIR, 'place-links');
  fs.mkdirSync(placeShardsDir, { recursive: true });

  let placeShardCount = 0;
  const placeCodes = Array.from(byPlace.keys());
  const placeCodesToWrite = DEV_MODE ? placeCodes.slice(0, DEV_LIMIT) : placeCodes;

  for (const code of placeCodesToWrite) {
    const shardPath = path.join(placeShardsDir, `${code}.json`);
    fs.writeFileSync(shardPath, JSON.stringify(byPlace.get(code)));
    placeShardCount++;
    if (placeShardCount % 5000 === 0) {
      console.log(`[precompute-links] Wrote ${placeShardCount} place-links shards...`);
    }
  }
  console.log(`[precompute-links] Wrote ${placeShardCount} place-links shards to ${placeShardsDir}`);

  // -------------------------------------------------------------------------
  // 4. Build place-index.json (D-07 fields — rename latitude/longitude to lat/lon)
  // -------------------------------------------------------------------------

  const placesPath = path.join(DATA_DIR, 'places.json');
  console.log(`[precompute-links] Reading ${placesPath}`);
  const placesRaw = fs.readFileSync(placesPath, 'utf8');
  const places = JSON.parse(placesRaw);
  console.log(`[precompute-links] places.json: ${places.length} records`);

  const placeIndex = places.map(p => ({
    id: p.id,
    display_name: p.display_name,
    place_type: p.place_type,
    lat: p.latitude,       // D-07: rename latitude -> lat
    lon: p.longitude,      // D-07: rename longitude -> lon
    has_wikidata: !!p.wikidata_id,
    has_whg: !!p.whg_id,
    has_hgis: !!p.hgis_id,
    linked_description_count: (byPlace.get(String(p.id)) || []).length,
  }));

  const placeIndexPath = path.join(DATA_DIR, 'place-index.json');
  fs.writeFileSync(placeIndexPath, JSON.stringify(placeIndex));
  console.log(`[precompute-links] Wrote place-index.json with ${placeIndex.length} records`);

  // -------------------------------------------------------------------------
  // 5. Build reverse-lookup files (D-20): reference_code -> [entity/place codes]
  // -------------------------------------------------------------------------

  // desc -> entity codes reverse lookup
  const entityCodesForDesc = new Map();
  for (const link of entityLinks) {
    const refCode = link.reference_code;
    if (!entityCodesForDesc.has(refCode)) {
      entityCodesForDesc.set(refCode, new Set());
    }
    entityCodesForDesc.get(refCode).add(link.entity_code);
  }

  const descEntityLookup = {};
  for (const [refCode, codeSet] of entityCodesForDesc) {
    descEntityLookup[refCode] = Array.from(codeSet);
  }

  const descEntityLookupPath = path.join(DATA_DIR, 'desc-entity-lookup.json');
  fs.writeFileSync(descEntityLookupPath, JSON.stringify(descEntityLookup));
  console.log(`[precompute-links] Wrote desc-entity-lookup.json with ${entityCodesForDesc.size} keys`);

  // desc -> place codes reverse lookup
  const placeCodesForDesc = new Map();
  for (const link of placeLinks) {
    const code = link.place_code;
    if (code === null || code === undefined) continue;
    const refCode = link.reference_code;
    if (!placeCodesForDesc.has(refCode)) {
      placeCodesForDesc.set(refCode, new Set());
    }
    placeCodesForDesc.get(refCode).add(code);
  }

  const descPlaceLookup = {};
  for (const [refCode, codeSet] of placeCodesForDesc) {
    descPlaceLookup[refCode] = Array.from(codeSet);
  }

  const descPlaceLookupPath = path.join(DATA_DIR, 'desc-place-lookup.json');
  fs.writeFileSync(descPlaceLookupPath, JSON.stringify(descPlaceLookup));
  console.log(`[precompute-links] Wrote desc-place-lookup.json with ${placeCodesForDesc.size} keys`);

  // -------------------------------------------------------------------------
  // 6. Summary
  // -------------------------------------------------------------------------

  console.log(`[precompute-links] Done.`);
  console.log(`  Entity shards written : ${entityShardCount}`);
  console.log(`  Place shards written  : ${placeShardCount}`);
  console.log(`  entity-index records  : ${entityIndex.length}`);
  console.log(`  place-index records   : ${placeIndex.length}`);
  console.log(`  Desc-entity lookup keys: ${entityCodesForDesc.size}`);
  console.log(`  Desc-place lookup keys : ${placeCodesForDesc.size}`);
}

main().catch(err => {
  console.error('[precompute-links] Fatal error:', err);
  process.exit(1);
});
