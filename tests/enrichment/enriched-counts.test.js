/**
 * Enriched Record Counts Invariant Test (I1)
 *
 * The canonical Zasqua export has 78,476 entities, 106,529 descriptions,
 * and 6,722 places (verified 2026-04-16). Any enrichment step that drops
 * records silently is a data-quality bug; any step that invents records
 * is worse. This test locks the counts: the files under `assets/hugo-
 * data/` must match the canonical totals — or, in DEV_MODE, `min(canonical,
 * DEV_LIMIT)`.
 *
 * Descriptions are sharded by `repository_code` so no individual file
 * busts V8's 512 MiB string limit; the test sums across shards. Entities
 * and places are small enough to live in one file each.
 *
 * RED until Plan 13-02 Task 2 writes the enriched files. The test reads
 * `process.env.DEV_LIMIT` so a developer iterating locally with
 * `DEV_LIMIT=100` still gets a green run against a truncated dataset.
 *
 * Version: v1.0.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(process.cwd(), 'assets/hugo-data');
const CANONICAL = {
  descriptions: 106529,
  entities: 78476,
  places: 6722,
};

function expectedLen(canonical) {
  const limit = process.env.DEV_LIMIT ? Number(process.env.DEV_LIMIT) : Infinity;
  return Math.min(canonical, limit);
}

function sumShards(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let total = 0;
  for (const file of files) {
    const records = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    total += records.length;
  }
  return total;
}

describe('enriched record counts invariant (I1)', () => {
  it('descriptions shards sum to 106,529 (or DEV_LIMIT)', () => {
    const shardsDir = path.join(DIR, 'descriptions');
    if (!fs.existsSync(shardsDir)) {
      throw new Error(`expected ${shardsDir} to exist after enrichment (Plan 13-02)`);
    }
    expect(sumShards(shardsDir)).toBe(expectedLen(CANONICAL.descriptions));
  });

  it('descriptions-index.json covers every reference_code', () => {
    const indexFile = path.join(DIR, 'descriptions-index.json');
    if (!fs.existsSync(indexFile)) {
      throw new Error(`expected ${indexFile} to exist after enrichment (Plan 13-02)`);
    }
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    expect(Object.keys(index).length).toBe(expectedLen(CANONICAL.descriptions));
  });

  for (const key of ['entities', 'places']) {
    it(`${key}.json length matches ${CANONICAL[key]} (or DEV_LIMIT)`, () => {
      const file = path.join(DIR, `${key}.json`);
      if (!fs.existsSync(file)) {
        throw new Error(`expected ${file} to exist after enrichment (Plan 13-02)`);
      }
      const records = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(records.length).toBe(expectedLen(CANONICAL[key]));
    });
  }
});
