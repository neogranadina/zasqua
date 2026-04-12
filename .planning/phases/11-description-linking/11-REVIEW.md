---
phase: 11
reviewed: 2026-04-12T18:56:20Z
depth: standard
status: findings
severity_counts:
  critical: 0
  high: 1
  medium: 2
  low: 2
  info: 1
files_reviewed: 4
files_reviewed_list:
  - scripts/precompute-links.js
  - src/_data/descriptions.js
  - src/_data/ui.js
  - src/description.njk
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-12T18:56:20Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** findings

## Summary

Phase 11 added enriched entity/place reverse-lookup files, extended the Spanish role vocabulary in `ui.js`, updated the data loader to attach enriched objects, and replaced plain-text entity/place sections in the description template with clickable links. The implementation is generally solid and the data pipeline is clearly structured. No security vulnerabilities were found. The most significant issue is that place links in the template use `display_name | safeSlug` as the URL key rather than a stable identifier, making those links fragile. There is also an asymmetric null-guard in the precompute script (entity codes are not guarded the way place codes are) and a hardcoded fallback `entity_type` that would mislabel non-person entities.

---

## High

### H-01: Place link URL uses `display_name` instead of a stable identifier

**File:** `src/description.njk:213`

**Issue:** The place link is built as `/lugar/{{ place.display_name | safeSlug }}/`. Place page permalinks (`src/lugar.njk:6`) use the same pattern, so the links resolve today — but the URL is derived from the human-readable display name, not a stable code. If a place's display name is corrected or updated in the authority data, all inbound links from description pages break silently. The entity section avoids this by using `ent.code` (line 198), which is the stable `entity_code` value. The `_place_links` objects currently only carry `id` and `display_name` (set in `precompute-links.js:231–235`), and `id` is the stable key that `place-index.json` and the place shards use.

**Fix:** Forward the place `id` through to the template and use it in the URL. In `precompute-links.js` the object is already constructed with `id: String(code)` (line 232), so no change is needed there. In `descriptions.js` `_place_links` is passed through as-is (line 81), so it already carries `id`. Update the template:

```nunjucks
{# Before #}
<a href="/lugar/{{ place.display_name | safeSlug }}/">{{ place.display_name }}</a>

{# After #}
<a href="/lugar/{{ place.id | safeSlug }}/">{{ place.display_name }}</a>
```

Then update `src/lugar.njk` permalink to match:
```nunjucks
permalink: "/lugar/{{ place.id | safeSlug }}/"
```

Note: this is a breaking URL change for any existing place pages — do it once, not incrementally.

---

## Medium

### M-01: No null-guard on `entity_code` in entity-links loop (asymmetry with place handling)

**File:** `scripts/precompute-links.js:28–40` and `187–207`

**Issue:** The place-links loop explicitly checks for `null`/`undefined` `place_code` values and skips them with a console warning (lines 113–118). The entity-links loop has no equivalent guard. If any record in `entity_links.json` has a null or undefined `entity_code`, the shard loop writes a file named `null.json` or `undefined.json` (line 51), and the enriched lookup (section 5a) creates an entry keyed by `null`/`undefined` in `descEntityLookup` (line 191). This would cause a silent data error rather than a clear warning.

**Fix:** Add the same guard to both entity loops:

```js
// In section 1 — grouping loop (around line 28)
for (const link of entityLinks) {
  const code = link.entity_code;
  if (code === null || code === undefined) {
    console.warn(`[precompute-links] WARNING: entity_link with null entity_code skipped (reference_code: ${link.reference_code})`);
    continue;
  }
  // ... rest of loop
}

// In section 5a — enriched lookup loop (around line 187)
for (const link of entityLinks) {
  const code = link.entity_code;
  if (code === null || code === undefined) continue;
  // ... rest of loop
}
```

### M-02: Fallback `entity_type` hardcodes `'person'` for unresolved entities

**File:** `scripts/precompute-links.js:197`

**Issue:** When an `entity_code` from `entity_links.json` has no matching entry in `entities.json`, the enriched lookup entry is created with `entity_type: 'person'` as a default (line 198). Corporate bodies and families that appear in links but are missing from the entities export would be silently mislabelled. Downstream code or templates that branch on `entity_type` (e.g. to choose an icon or label) would display incorrect information.

**Fix:** Use `null` or `'unknown'` as the fallback so callers can detect and handle the gap explicitly:

```js
entMap.set(code, {
  code,
  display_name: ent ? ent.display_name : code,
  entity_type: ent ? ent.entity_type : null,   // was: 'person'
  roles: [],
});
```

Template and entity page code should already guard against a null/missing type via `ui.entity.types[ent.entity_type]` lookups, which return `undefined` for unknown keys — no worse than the current state, but no longer silently wrong.

---

## Low

### L-01: Unknown role values silently disappear from rendered output

**File:** `src/_data/descriptions.js:75–77`

**Issue:** `role_labels` is built by mapping each role string through `ui.roles[r]` and then filtering with `.filter(Boolean)`. Any role that exists in the data but is not yet defined in `ui.js` is silently dropped — no warning is logged, so the gap is invisible at build time. This is not a crash risk, but it makes the vocabulary coverage hard to audit.

**Fix:** Add a warning log for unmapped roles during the build:

```js
desc._entity_links = entityLinks.map(ent => ({
  ...ent,
  role_labels: ent.roles
    .map(r => {
      const label = ui.roles[r];
      if (!label) console.warn(`[descriptions] Unknown role "${r}" on entity ${ent.code} — add to ui.js`);
      return label;
    })
    .filter(Boolean),
}));
```

### L-02: Shard filenames are constructed from unsanitised code values

**File:** `scripts/precompute-links.js:51, 143`

**Issue:** Entity and place `code` values are used directly as filenames:
```js
const shardPath = path.join(entityShardsDir, `${code}.json`);
```
`path.join` normalises `..` segments, so a `code` value like `../../etc/passwd` would resolve to a path outside the shard directory. In practice, codes are controlled data from the project's own exports and this is a build-time script — not a public-facing service — so the attack surface is minimal. Still, a corrupt export could cause unexpected file writes.

**Fix:** Assert that codes are safe before using them as filenames:

```js
// Helper — add once near the top of main()
function assertSafeCode(code, context) {
  if (/[/\\]/.test(code)) {
    throw new Error(`[precompute-links] Unsafe code value "${code}" in ${context}`);
  }
}

// Before each writeFileSync:
assertSafeCode(code, 'entity-links');
const shardPath = path.join(entityShardsDir, `${code}.json`);
```

---

## Info

### I-01: `ui.js` — duplicate alias for `corporate` entity type

**File:** `src/_data/ui.js:150–151`

**Issue:** `entity.types` defines both `corporate_body: "Entidad corporativa"` and `corporate: "Entidad corporativa"` with identical values. This is harmless but suggests an inconsistency in the upstream data: either the source uses both variants and both aliases are needed, or one is a leftover from an earlier naming convention.

**Fix:** Confirm whether `corporate` (without `_body`) actually appears in any entity record in `entities.json`. If not, remove the alias to keep the vocabulary clean.

---

_Reviewed: 2026-04-12T18:56:20Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
