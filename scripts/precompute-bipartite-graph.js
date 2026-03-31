'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const TOP_ENTITIES = parseInt(process.env.BIPARTITE_TOP_ENTITIES || '30', 10);
const MIN_SHARED = parseInt(process.env.BIPARTITE_MIN_SHARED || '3', 10);

async function main() {
  console.log(`[precompute-bipartite] DATA_DIR: ${DATA_DIR}`);
  console.log(`[precompute-bipartite] TOP_ENTITIES: ${TOP_ENTITIES}`);
  console.log(`[precompute-bipartite] MIN_SHARED: ${MIN_SHARED} (min top entities per document)`);

  // -------------------------------------------------------------------------
  // 1. Read entity_links.json and entities.json
  // -------------------------------------------------------------------------

  const entityLinksPath = path.join(DATA_DIR, 'entity_links.json');
  console.log(`[precompute-bipartite] Reading ${entityLinksPath}`);
  const entityLinks = JSON.parse(fs.readFileSync(entityLinksPath, 'utf8'));
  console.log(`[precompute-bipartite] entity_links.json: ${entityLinks.length} records`);

  const entitiesPath = path.join(DATA_DIR, 'entities.json');
  console.log(`[precompute-bipartite] Reading ${entitiesPath}`);
  const entities = JSON.parse(fs.readFileSync(entitiesPath, 'utf8'));

  const entityMeta = new Map();
  for (const e of entities) {
    entityMeta.set(e.entity_code, {
      display_name: e.display_name,
      entity_type: e.entity_type,
    });
  }

  // -------------------------------------------------------------------------
  // 2. Compute entity degree (co-occurrence edges) to find top entities
  // -------------------------------------------------------------------------

  // Group links by document
  const byDoc = new Map();
  for (const link of entityLinks) {
    if (!byDoc.has(link.reference_code)) byDoc.set(link.reference_code, []);
    byDoc.get(link.reference_code).push(link);
  }

  // Count co-occurrence degree per entity
  const degreeMap = new Map();
  for (const [, docLinks] of byDoc) {
    const uniqueCodes = new Set(docLinks.map(l => l.entity_code));
    if (uniqueCodes.size < 2) continue;
    for (const code of uniqueCodes) {
      degreeMap.set(code, (degreeMap.get(code) || 0) + uniqueCodes.size - 1);
    }
  }

  // Top N entities globally by co-occurrence degree
  const topEntities = Array.from(degreeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ENTITIES)
    .map(([code]) => code);
  const topSet = new Set(topEntities);

  console.log(`[precompute-bipartite] Top ${topEntities.length} entities by co-occurrence degree`);

  // -------------------------------------------------------------------------
  // 3. Find documents shared by MIN_SHARED+ top entities
  // -------------------------------------------------------------------------

  const graphDocs = []; // { reference_code, title, date, links: [{ entity, role }] }

  for (const [refCode, docLinks] of byDoc) {
    const topLinks = docLinks.filter(l => topSet.has(l.entity_code));
    const uniqueTopEntities = new Set(topLinks.map(l => l.entity_code));
    if (uniqueTopEntities.size < MIN_SHARED) continue;

    // Deduplicate: one edge per entity per document (pick first role)
    const seen = new Set();
    const dedupedLinks = [];
    for (const l of topLinks) {
      if (seen.has(l.entity_code)) continue;
      seen.add(l.entity_code);
      dedupedLinks.push({ entity: l.entity_code, role: l.role || 'unknown' });
    }

    // Derive century from date
    const dateStr = docLinks[0].date_expression || '';
    let century = null;
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      century = Math.floor((year - 1) / 100) + 1; // 1780 → 18
    }

    graphDocs.push({
      reference_code: refCode,
      title: docLinks[0].title || refCode,
      date: dateStr,
      repository: docLinks[0].repository_code || '',
      century,
      links: dedupedLinks,
    });
  }

  console.log(`[precompute-bipartite] Documents with ${MIN_SHARED}+ top entities: ${graphDocs.length}`);

  // -------------------------------------------------------------------------
  // 4. Build nodes and edges
  // -------------------------------------------------------------------------

  // Entity nodes
  const entityNodes = topEntities.map(code => {
    const meta = entityMeta.get(code) || {};
    // Count how many graph documents this entity appears in
    const docCount = graphDocs.filter(d => d.links.some(l => l.entity === code)).length;
    return {
      id: code,
      type: 'entity',
      label: meta.display_name || code,
      entityType: meta.entity_type || 'unknown',
      docCount,
    };
  });

  // Document nodes
  const docNodes = graphDocs.map(d => ({
    id: d.reference_code,
    type: 'document',
    label: d.title,
    date: d.date,
    repository: d.repository,
    century: d.century,
    entityCount: d.links.length,
  }));

  // Edges: entity → document with role
  const edges = [];
  for (const doc of graphDocs) {
    for (const link of doc.links) {
      edges.push({
        source: link.entity,
        target: doc.reference_code,
        role: link.role,
      });
    }
  }

  console.log(`[precompute-bipartite] Entity nodes: ${entityNodes.length}`);
  console.log(`[precompute-bipartite] Document nodes: ${docNodes.length}`);
  console.log(`[precompute-bipartite] Total nodes: ${entityNodes.length + docNodes.length}`);
  console.log(`[precompute-bipartite] Edges: ${edges.length}`);

  // -------------------------------------------------------------------------
  // 5. Write output
  // -------------------------------------------------------------------------

  // Collect available filter values
  const repositories = [...new Set(docNodes.map(d => d.repository).filter(Boolean))].sort();
  const centuries = [...new Set(docNodes.map(d => d.century).filter(Boolean))].sort((a, b) => a - b);
  const entityTypes = [...new Set(entityNodes.map(e => e.entityType).filter(Boolean))].sort();

  console.log(`[precompute-bipartite] Repositories: ${repositories.join(', ')}`);
  console.log(`[precompute-bipartite] Centuries: ${centuries.join(', ')}`);
  console.log(`[precompute-bipartite] Entity types: ${entityTypes.join(', ')}`);

  const output = {
    generated_at: new Date().toISOString(),
    top_entities: TOP_ENTITIES,
    min_shared: MIN_SHARED,
    entity_node_count: entityNodes.length,
    doc_node_count: docNodes.length,
    edge_count: edges.length,
    filters: { repositories, centuries, entityTypes },
    nodes: [...entityNodes, ...docNodes],
    edges,
  };

  const outputPath = path.join(DATA_DIR, 'entity-doc-graph.json');
  const outputJson = JSON.stringify(output);
  fs.writeFileSync(outputPath, outputJson);

  const fileSizeKB = Math.round(outputJson.length / 1024);
  console.log(`[precompute-bipartite] Wrote ${outputPath} (~${fileSizeKB} KB)`);
}

main().catch(err => {
  console.error('[precompute-bipartite] Fatal error:', err);
  process.exit(1);
});
