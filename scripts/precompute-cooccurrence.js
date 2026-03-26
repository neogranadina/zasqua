'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const COOCCURRENCE_MIN_WEIGHT = parseInt(process.env.COOCCURRENCE_MIN_WEIGHT || '3', 10);

async function main() {
  console.log(`[precompute-cooccurrence] DATA_DIR: ${DATA_DIR}`);
  console.log(`[precompute-cooccurrence] COOCCURRENCE_MIN_WEIGHT: ${COOCCURRENCE_MIN_WEIGHT}`);

  // -------------------------------------------------------------------------
  // 1. Read entity_links.json — group by reference_code
  // -------------------------------------------------------------------------

  const entityLinksPath = path.join(DATA_DIR, 'entity_links.json');
  console.log(`[precompute-cooccurrence] Reading ${entityLinksPath}`);
  const entityLinksRaw = fs.readFileSync(entityLinksPath, 'utf8');
  const entityLinks = JSON.parse(entityLinksRaw);
  console.log(`[precompute-cooccurrence] entity_links.json: ${entityLinks.length} records`);

  // Group by reference_code — each value is an array of entity_codes
  const byDescription = new Map();
  for (const link of entityLinks) {
    const refCode = link.reference_code;
    if (!byDescription.has(refCode)) {
      byDescription.set(refCode, []);
    }
    byDescription.get(refCode).push(link.entity_code);
  }
  console.log(`[precompute-cooccurrence] Unique descriptions with entity links: ${byDescription.size}`);

  // Also build byEntity for node count computation
  const byEntity = new Map();
  for (const link of entityLinks) {
    const code = link.entity_code;
    if (!byEntity.has(code)) {
      byEntity.set(code, 0);
    }
    byEntity.set(code, byEntity.get(code) + 1);
  }

  // -------------------------------------------------------------------------
  // 2. Emit co-occurrence pairs and accumulate edge weights
  // -------------------------------------------------------------------------

  const edgeWeights = new Map();

  for (const [, codes] of byDescription) {
    // Deduplicate entity codes within this description
    const unique = Array.from(new Set(codes));
    if (unique.length < 2) continue;

    // Emit all pairs in sorted order (source < target lexically)
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i];
        const b = unique[j];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1);
      }
    }
  }

  console.log(`[precompute-cooccurrence] Raw edge pairs: ${edgeWeights.size}`);

  // -------------------------------------------------------------------------
  // 3. Filter by minimum weight and build node set from filtered edges
  // -------------------------------------------------------------------------

  const filteredEdges = [];
  const nodeSet = new Set();

  for (const [key, weight] of edgeWeights) {
    if (weight < COOCCURRENCE_MIN_WEIGHT) continue;
    const [source, target] = key.split('|');
    filteredEdges.push({ source, target, weight });
    nodeSet.add(source);
    nodeSet.add(target);
  }

  console.log(`[precompute-cooccurrence] Edges after min_weight=${COOCCURRENCE_MIN_WEIGHT} filter: ${filteredEdges.length}`);
  console.log(`[precompute-cooccurrence] Nodes in filtered graph: ${nodeSet.size}`);

  // -------------------------------------------------------------------------
  // 4. Read entities.json to get display_name and entity_type for each node
  // -------------------------------------------------------------------------

  const entitiesPath = path.join(DATA_DIR, 'entities.json');
  console.log(`[precompute-cooccurrence] Reading ${entitiesPath}`);
  const entitiesRaw = fs.readFileSync(entitiesPath, 'utf8');
  const entities = JSON.parse(entitiesRaw);

  const entityMeta = new Map();
  for (const e of entities) {
    entityMeta.set(e.entity_code, {
      display_name: e.display_name,
      entity_type: e.entity_type,
    });
  }

  const nodes = Array.from(nodeSet).map(id => {
    const meta = entityMeta.get(id) || {};
    return {
      id,
      label: meta.display_name || id,
      type: meta.entity_type || null,
      count: byEntity.get(id) || 0,
    };
  });

  // -------------------------------------------------------------------------
  // 5. Write entity-cooccurrence.json
  // -------------------------------------------------------------------------

  const output = {
    min_weight: COOCCURRENCE_MIN_WEIGHT,
    generated_at: new Date().toISOString(),
    node_count: nodes.length,
    edge_count: filteredEdges.length,
    nodes,
    edges: filteredEdges,
  };

  const outputPath = path.join(DATA_DIR, 'entity-cooccurrence.json');
  const outputJson = JSON.stringify(output);
  fs.writeFileSync(outputPath, outputJson);

  const fileSizeKB = Math.round(outputJson.length / 1024);
  console.log(`[precompute-cooccurrence] Wrote ${outputPath}`);
  console.log(`  Nodes      : ${nodes.length}`);
  console.log(`  Edges      : ${filteredEdges.length}`);
  console.log(`  File size  : ~${fileSizeKB} KB`);
}

main().catch(err => {
  console.error('[precompute-cooccurrence] Fatal error:', err);
  process.exit(1);
});
