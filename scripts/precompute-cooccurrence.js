'use strict';

const fs = require('fs');
const path = require('path');
const Graph = require('graphology');
const forceAtlas2 = require('graphology-layout-forceatlas2');

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

  // Group by reference_code — each value is an array of { code, role } objects
  const byDescription = new Map();
  for (const link of entityLinks) {
    const refCode = link.reference_code;
    if (!byDescription.has(refCode)) {
      byDescription.set(refCode, []);
    }
    byDescription.get(refCode).push({ code: link.entity_code, role: link.role || 'unknown' });
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
  // 2. Emit co-occurrence pairs and accumulate edge weights + role pairs
  // -------------------------------------------------------------------------

  const edgeWeights = new Map();
  const edgeRolePairs = new Map();

  for (const [, entries] of byDescription) {
    // Deduplicate by entity code — keeping all role variants per code
    const uniqueByCode = new Map();
    for (const e of entries) {
      if (!uniqueByCode.has(e.code)) uniqueByCode.set(e.code, []);
      uniqueByCode.get(e.code).push(e.role);
    }
    const codes = Array.from(uniqueByCode.keys());
    if (codes.length < 2) continue;

    // Emit all pairs in sorted order (source < target lexically)
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        const a = codes[i] < codes[j] ? codes[i] : codes[j];
        const b = codes[i] < codes[j] ? codes[j] : codes[i];
        const edgeKey = `${a}|${b}`;
        edgeWeights.set(edgeKey, (edgeWeights.get(edgeKey) || 0) + 1);

        // Role pairs: combine all roles of entity a with all roles of entity b
        if (!edgeRolePairs.has(edgeKey)) edgeRolePairs.set(edgeKey, {});
        const pairs = edgeRolePairs.get(edgeKey);
        const rolesA = uniqueByCode.get(a);
        const rolesB = uniqueByCode.get(b);
        for (const rA of rolesA) {
          for (const rB of rolesB) {
            const rpKey = [rA, rB].sort().join('|');
            pairs[rpKey] = (pairs[rpKey] || 0) + 1;
          }
        }
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
    filteredEdges.push({ source, target, weight, role_pairs: edgeRolePairs.get(key) || {} });
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
  // 5. Run ForceAtlas2 layout and write x/y positions to nodes
  // -------------------------------------------------------------------------

  const layoutGraph = new Graph();
  for (const node of nodes) {
    layoutGraph.addNode(node.id, { x: Math.random() * 100, y: Math.random() * 100, size: 1 });
  }
  for (const edge of filteredEdges) {
    if (!layoutGraph.hasEdge(edge.source, edge.target)) {
      layoutGraph.addEdge(edge.source, edge.target, { weight: edge.weight });
    }
  }

  const settings = forceAtlas2.inferSettings(layoutGraph);
  forceAtlas2.assign(layoutGraph, { iterations: 150, settings, getEdgeWeight: 'weight' });

  for (const node of nodes) {
    const attrs = layoutGraph.getNodeAttributes(node.id);
    node.x = attrs.x;
    node.y = attrs.y;
  }

  console.log(`[precompute-cooccurrence] ForceAtlas2 layout: 150 iterations`);

  // -------------------------------------------------------------------------
  // 6. Write entity-cooccurrence.json
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

  // Log role-pair stats
  let rolePairKeyCount = 0;
  for (const edge of filteredEdges) {
    rolePairKeyCount += Object.keys(edge.role_pairs).length;
  }
  console.log(`[precompute-cooccurrence] Role pairs tracked: ${rolePairKeyCount} unique role-pair keys across all edges`);
}

main().catch(err => {
  console.error('[precompute-cooccurrence] Fatal error:', err);
  process.exit(1);
});
