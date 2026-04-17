/**
 * Date Format Invariant Test (I4)
 *
 * Golden-file regression test for `formatDateNarrative`, the helper that
 * turns archival date strings like `1723-03-15` into Colombian-Spanish
 * prose ("15 de marzo de 1723"). The Eleventy build embeds this logic as
 * a template filter (`eleventy.config.js:37-64`); Phase 13 moves it into
 * `scripts/generate-content.js` so Hugo templates can consume the
 * pre-formatted string from enriched JSON instead of running a filter.
 *
 * This test is RED until Plan 13-02 Task 1 creates `scripts/generate-
 * content.js` and exports `formatDateNarrative`. The import statement
 * below is the intentional failure site — once the module exists, the
 * eight golden cases below pin the behaviour forever.
 *
 * Note the range separator: input " .. " (space-dot-dot-space), output
 * " – " (space-endash-space, U+2013). Month names are lowercase Colombian
 * Spanish per 13-CONTEXT.md D-15/D-16.
 *
 * Version: v1.0.0
 */

import { describe, it, expect } from 'vitest';
import { formatDateNarrative } from '../../scripts/generate-content.js';

describe('formatDateNarrative (I4)', () => {
  const cases = [
    ['1723-03-15',                 '15 de marzo de 1723'],
    ['1723-03',                    'marzo de 1723'],
    ['1723',                       '1723'],
    ['1723-03-15 .. 1725-12-01',   '15 de marzo de 1723 – 1 de diciembre de 1725'],
    ['',                           ''],
    ['fecha desconocida',          'fecha desconocida'],
    [null,                         ''],
    ['1723-03-15 .. 1723-03-15',   '15 de marzo de 1723 – 15 de marzo de 1723'],
  ];

  for (const [input, expected] of cases) {
    it(`formats ${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(formatDateNarrative(input)).toBe(expected);
    });
  }
});
