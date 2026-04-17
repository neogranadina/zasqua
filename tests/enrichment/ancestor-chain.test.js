/**
 * Ancestor Chain Invariant Test (I2)
 *
 * Archival descriptions form a hierarchy — a fonds contains series, a
 * series contains items, and so on. Each description record carries a
 * `parent_reference_code`, and the frontend needs the full ancestor
 * chain (all the way up to the root) to render breadcrumbs. Today that
 * chain is walked on every page render by the Eleventy filter; Phase 13
 * moves the walk into `scripts/generate-content.js` so every record
 * ships with a prebuilt `ancestor_chain: Array<{reference_code, title,
 * description_level}>` in the enriched JSON.
 *
 * This test is RED until Plan 13-02 Task 2 writes
 * `assets/hugo-data/descriptions.json`. Once the file exists, the test
 * asserts (1) every record has an `ancestor_chain` array and (2) on a
 * sample of 10 records, walking `parent_reference_code` up the index
 * reconstructs the same chain — catching any enrichment bug that would
 * skip ancestors or invent fake ones.
 *
 * Version: v1.0.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ENRICHED = path.resolve(process.cwd(), 'assets/hugo-data/descriptions.json');

describe('ancestor_chain invariant (I2)', () => {
  it('enriched descriptions file exists', () => {
    expect(fs.existsSync(ENRICHED)).toBe(true);
  });

  it('every record carries an ancestor_chain array of {reference_code, title, description_level}', () => {
    const descs = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
    expect(descs.length).toBeGreaterThan(0);
    for (const d of descs) {
      expect(Array.isArray(d.ancestor_chain)).toBe(true);
      for (const link of d.ancestor_chain) {
        expect(typeof link.reference_code).toBe('string');
        expect(typeof link.title).toBe('string');
        expect(typeof link.description_level).toBe('string');
      }
    }
  });

  it('ancestor_chain matches a fresh walk via parent_reference_code for 10 random samples', () => {
    const descs = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
    const byCode = new Map(descs.map(d => [d.reference_code, d]));
    const sample = [];
    const step = Math.max(1, Math.floor(descs.length / 10));
    for (let i = 0; i < descs.length && sample.length < 10; i += step) {
      if (descs[i].parent_reference_code) sample.push(descs[i]);
    }
    for (const d of sample) {
      const walked = [];
      let cursor = byCode.get(d.parent_reference_code);
      while (cursor) {
        walked.unshift({
          reference_code: cursor.reference_code,
          title: cursor.title,
          description_level: cursor.description_level,
        });
        cursor = cursor.parent_reference_code ? byCode.get(cursor.parent_reference_code) : null;
      }
      expect(d.ancestor_chain).toEqual(walked);
    }
  });
});
