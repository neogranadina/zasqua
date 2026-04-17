/**
 * Enriched Record Counts Invariant Test (I1)
 *
 * The canonical Zasqua export has 78,476 entities, 106,529 descriptions,
 * and 6,722 places (verified 2026-04-16). Any enrichment step that drops
 * records silently is a data-quality bug; any step that invents records
 * is worse. This test locks the counts: the three enriched files under
 * `assets/hugo-data/` must match the canonical totals — or, in DEV_MODE,
 * `min(canonical, DEV_LIMIT)`.
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

describe('enriched record counts invariant (I1)', () => {
  for (const [key, canonical] of Object.entries(CANONICAL)) {
    it(`${key}.json length matches ${canonical} (or DEV_LIMIT)`, () => {
      const file = path.join(DIR, `${key}.json`);
      if (!fs.existsSync(file)) {
        throw new Error(`expected ${file} to exist after enrichment (Plan 13-02)`);
      }
      const records = JSON.parse(fs.readFileSync(file, 'utf8'));
      expect(records.length).toBe(expectedLen(canonical));
    });
  }
});
