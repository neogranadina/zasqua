/**
 * Link Enrichment Invariant Test (I2)
 *
 * Descriptions reference entities (people, organisations) and places via
 * compact codes. For the frontend to render those references as readable
 * chips ("Simón Bolívar — autor") instead of raw codes, the enrichment
 * step denormalises display names and role labels onto each link record.
 * This test pins the contract: every `entity_links[*]` record on an
 * enriched description must include `entity_code`, `display_name`, and
 * `role_label`; every `place_links[*]` must include `place_code` and
 * `display_name`.
 *
 * RED until Plan 13-02 Task 2 writes `assets/hugo-data/descriptions.json`.
 * The test only asserts the shape — downstream tests verify record
 * counts and end-to-end URL resolution.
 *
 * Version: v1.0.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ENRICHED = path.resolve(process.cwd(), 'assets/hugo-data/descriptions.json');

describe('link enrichment invariant (I2)', () => {
  it('enriched descriptions file exists', () => {
    expect(fs.existsSync(ENRICHED)).toBe(true);
  });

  it('every entity_links[*] carries entity_code, display_name, role_label', () => {
    const descs = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
    let checked = 0;
    for (const d of descs) {
      const links = d.entity_links || [];
      for (const link of links) {
        expect(typeof link.entity_code).toBe('string');
        expect(typeof link.display_name).toBe('string');
        expect(typeof link.role_label).toBe('string');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('every place_links[*] carries place_code, display_name', () => {
    const descs = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'));
    let checked = 0;
    for (const d of descs) {
      const links = d.place_links || [];
      for (const link of links) {
        expect(typeof link.place_code).toBe('string');
        expect(typeof link.display_name).toBe('string');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
