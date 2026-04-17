/**
 * Flat-Code URL Scheme Invariant Test (I3)
 *
 * Decision D-18 pins the public URL scheme to the bare reference code:
 * a description lives at `/{reference_code}/`, never under a section
 * prefix like `/descripcion/{code}/`. This keeps printed URLs stable
 * across future information-architecture changes. The test looks for
 * `public/{smoke-test-reference-code}/index.html` (built by Plan 13-05)
 * and simultaneously asserts the section-prefixed path does NOT exist.
 *
 * RED until Plan 13-05 runs the DEV_LIMIT=100 smoke build. Gated by
 * SKIP_BUILD_TESTS=1 so developers can run enrichment tests in
 * isolation without a full build.
 *
 * Version: v1.0.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SKIP = process.env.SKIP_BUILD_TESTS === '1';
const PUBLIC = path.resolve(process.cwd(), 'public');
const SMOKE_REF = 'pe-bn-cdip-01';

describe.skipIf(SKIP)('flat-code URL scheme (D-18, I3)', () => {
  it(`public/${SMOKE_REF}/index.html exists after build`, () => {
    const target = path.join(PUBLIC, SMOKE_REF, 'index.html');
    if (!fs.existsSync(target)) {
      throw new Error(`expected ${target} to exist after the Plan 13-05 build`);
    }
    expect(fs.statSync(target).size).toBeGreaterThan(0);
  });

  it('does NOT render under /descripcion/ prefix (flat-code scheme, not section-prefixed)', () => {
    const sectioned = path.join(PUBLIC, 'descripcion', SMOKE_REF, 'index.html');
    expect(fs.existsSync(sectioned)).toBe(false);
  });
});
