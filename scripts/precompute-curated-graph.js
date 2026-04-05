'use strict';

const fs = require('fs');
const path = require('path');
const Graph = require('graphology');
const forceAtlas2 = require('graphology-layout-forceatlas2');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CURATED_TOP_N = parseInt(process.env.CURATED_TOP_N || '100', 10);
const CURATED_MIN_WEIGHT = parseInt(process.env.CURATED_MIN_WEIGHT || '2', 10);

async function main() {
  console.log(`[precompute-curated-graph] DATA_DIR: ${DATA_DIR}`);
  console.log(`[precompute-curated-graph] CURATED_TOP_N: ${CURATED_TOP_N}`);
  console.log(`[precompute-curated-graph] CURATED_MIN_WEIGHT: ${CURATED_MIN_WEIGHT}`);

  // -------------------------------------------------------------------------
  // 1. Read entity_links.json and entities.json
  // -------------------------------------------------------------------------

  const entityLinksPath = path.join(DATA_DIR, 'entity_links.json');
  console.log(`[precompute-curated-graph] Reading ${entityLinksPath}`);
  const entityLinks = JSON.parse(fs.readFileSync(entityLinksPath, 'utf8'));
  console.log(`[precompute-curated-graph] entity_links.json: ${entityLinks.length} records`);

  const entitiesPath = path.join(DATA_DIR, 'entities.json');
  console.log(`[precompute-curated-graph] Reading ${entitiesPath}`);
  const entities = JSON.parse(fs.readFileSync(entitiesPath, 'utf8'));

  const entityMeta = new Map();
  for (const e of entities) {
    entityMeta.set(e.entity_code, {
      display_name: e.display_name,
      entity_type: e.entity_type,
    });
  }

  // -------------------------------------------------------------------------
  // 2. Group links by document; count co-occurrence degree per entity
  // -------------------------------------------------------------------------

  const byDoc = new Map();
  for (const link of entityLinks) {
    if (!byDoc.has(link.reference_code)) byDoc.set(link.reference_code, []);
    byDoc.get(link.reference_code).push(link);
  }

  const degreeMap = new Map();
  for (const [, docLinks] of byDoc) {
    const uniqueCodes = new Set(docLinks.map(l => l.entity_code));
    if (uniqueCodes.size < 2) continue;
    for (const code of uniqueCodes) {
      degreeMap.set(code, (degreeMap.get(code) || 0) + uniqueCodes.size - 1);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Select top N entities by co-occurrence degree
  // -------------------------------------------------------------------------

  const topEntities = Array.from(degreeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, CURATED_TOP_N)
    .map(([code]) => code);
  const topSet = new Set(topEntities);

  console.log(`[precompute-curated-graph] Top ${topEntities.length} entities by co-occurrence degree`);

  // -------------------------------------------------------------------------
  // 4. Build co-occurrence edges between top entities only
  // -------------------------------------------------------------------------

  const edgeWeights = new Map();

  for (const [, docLinks] of byDoc) {
    const uniqueCodes = new Set(docLinks.map(l => l.entity_code));
    const topInDoc = Array.from(uniqueCodes).filter(code => topSet.has(code));
    if (topInDoc.length < 2) continue;

    for (let i = 0; i < topInDoc.length; i++) {
      for (let j = i + 1; j < topInDoc.length; j++) {
        const a = topInDoc[i] < topInDoc[j] ? topInDoc[i] : topInDoc[j];
        const b = topInDoc[i] < topInDoc[j] ? topInDoc[j] : topInDoc[i];
        const edgeKey = `${a}|${b}`;
        edgeWeights.set(edgeKey, (edgeWeights.get(edgeKey) || 0) + 1);
      }
    }
  }

  console.log(`[precompute-curated-graph] Raw edge pairs between top entities: ${edgeWeights.size}`);

  // -------------------------------------------------------------------------
  // 5. Filter edges by minimum weight
  // -------------------------------------------------------------------------

  const filteredEdges = [];
  const connectedNodes = new Set();

  for (const [key, weight] of edgeWeights) {
    if (weight < CURATED_MIN_WEIGHT) continue;
    const [source, target] = key.split('|');
    filteredEdges.push({ source, target, weight });
    connectedNodes.add(source);
    connectedNodes.add(target);
  }

  console.log(`[precompute-curated-graph] Edges after min_weight=${CURATED_MIN_WEIGHT} filter: ${filteredEdges.length}`);

  // Build node list — include only top entities that appear in at least one edge
  const nodeList = topEntities.filter(code => connectedNodes.has(code));
  console.log(`[precompute-curated-graph] Nodes in filtered graph: ${nodeList.length}`);

  // -------------------------------------------------------------------------
  // 6. Run ForceAtlas2 layout
  // -------------------------------------------------------------------------

  const layoutGraph = new Graph({ type: 'undirected' });
  for (const code of nodeList) {
    layoutGraph.addNode(code, { x: Math.random() * 100, y: Math.random() * 100, size: 1 });
  }
  for (const edge of filteredEdges) {
    if (!layoutGraph.hasEdge(edge.source, edge.target)) {
      layoutGraph.addEdge(edge.source, edge.target, { weight: edge.weight });
    }
  }

  forceAtlas2.assign(layoutGraph, {
    iterations: 500,
    settings: { gravity: 1, scalingRatio: 10, barnesHutOptimize: true },
    getEdgeWeight: 'weight',
  });

  console.log(`[precompute-curated-graph] ForceAtlas2 layout: 500 iterations`);

  // -------------------------------------------------------------------------
  // 6.5. Normalise positions to fit within a 600×600 box centred at origin
  // -------------------------------------------------------------------------

  const TARGET_SIZE = 600;
  const rawPositions = nodeList.map(code => layoutGraph.getNodeAttributes(code));
  const rawXs = rawPositions.map(a => a.x).sort((a, b) => a - b);
  const rawYs = rawPositions.map(a => a.y).sort((a, b) => a - b);
  const n = rawXs.length;

  // Use 5th/95th percentile bounds so outliers don't stretch the box
  const p5 = Math.max(0, Math.floor(n * 0.05));
  const p95 = Math.min(n - 1, Math.ceil(n * 0.95));
  const pMinX = rawXs[p5], pMaxX = rawXs[p95];
  const pMinY = rawYs[p5], pMaxY = rawYs[p95];
  const centreX = (pMinX + pMaxX) / 2;
  const centreY = (pMinY + pMaxY) / 2;
  const spanX = (pMaxX - pMinX) || 1;
  const spanY = (pMaxY - pMinY) || 1;
  const scale = TARGET_SIZE / Math.max(spanX, spanY);

  for (const code of nodeList) {
    const attrs = layoutGraph.getNodeAttributes(code);
    let nx = (attrs.x - centreX) * scale;
    let ny = (attrs.y - centreY) * scale;
    // Clamp outliers to the target box edge
    nx = Math.max(-TARGET_SIZE / 2, Math.min(TARGET_SIZE / 2, nx));
    ny = Math.max(-TARGET_SIZE / 2, Math.min(TARGET_SIZE / 2, ny));
    layoutGraph.setNodeAttribute(code, 'x', nx);
    layoutGraph.setNodeAttribute(code, 'y', ny);
  }

  console.log(`[precompute-curated-graph] Normalised positions to ${TARGET_SIZE}×${TARGET_SIZE} (scale=${scale.toFixed(4)}, percentile-based)`);

  // -------------------------------------------------------------------------
  // 7. Build output nodes with positions baked in as fx/fy (pinned)
  // -------------------------------------------------------------------------

  const nodes = nodeList.map(code => {
    const meta = entityMeta.get(code) || {};
    const attrs = layoutGraph.getNodeAttributes(code);
    const degree = degreeMap.get(code) || 0;
    return {
      id: code,
      label: meta.display_name || code,
      type: meta.entity_type || null,
      degree,
      x: attrs.x,
      y: attrs.y,
      fx: attrs.x,
      fy: attrs.y,
    };
  });

  // -------------------------------------------------------------------------
  // 8. Write curated-entity-graph.json
  // -------------------------------------------------------------------------

  const output = {
    generated_at: new Date().toISOString(),
    top_n: CURATED_TOP_N,
    node_count: nodes.length,
    edge_count: filteredEdges.length,
    nodes,
    links: filteredEdges,
  };

  const outputPath = path.join(DATA_DIR, 'curated-entity-graph.json');
  const outputJson = JSON.stringify(output);
  fs.writeFileSync(outputPath, outputJson);

  const fileSizeKB = Math.round(outputJson.length / 1024);
  console.log(`[precompute-curated-graph] Wrote ${outputPath}`);
  console.log(`  Nodes      : ${nodes.length}`);
  console.log(`  Links      : ${filteredEdges.length}`);
  console.log(`  File size  : ~${fileSizeKB} KB`);
}

main().catch(err => {
  console.error('[precompute-curated-graph] Fatal error:', err);
  process.exit(1);
});
