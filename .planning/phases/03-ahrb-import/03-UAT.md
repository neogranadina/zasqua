---
status: complete
phase: 03-ahrb-import
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-03-25T06:30:00Z
updated: 2026-03-25T06:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. AHRB repository landing page
expected: Navigate to https://zasqua.org/co-ahrb/. The page loads with the AHRB repository title, a descriptive subtitle, and a Miller columns tree showing volume listings. The new visual identity is applied (DM Sans font, burgundy palette).
result: pass

### 2. AHRB volume description page
expected: From the Miller columns tree on the AHRB landing page, click into any file-level record (a notarial volume). The description page loads with metadata fields (title, dates, creator, extent), a periwinkle level badge, and breadcrumb navigation back to the repository.
result: pass

### 3. IIIF viewer link on digitised record
expected: Find an AHRB record that has a digitised item (e.g., one with a TIFY viewer link). The link is present and clicking it opens the TIFY IIIF viewer with the correct manifest loaded.
result: pass

### 4. Search returns AHRB results
expected: Navigate to https://zasqua.org/buscar/ and search for "Tunja" or "notaria". Results include AHRB records. Clicking a result navigates to the correct description page.
result: pass

### 5. Homepage shows AHRB in masonry grid
expected: Navigate to https://zasqua.org/. The AHRB repository appears in the masonry grid of repositories on the homepage, with the new visual identity applied throughout (DM Sans, burgundy links, new header/footer).
result: pass

### 6. Site version displays v0.4.0
expected: Check the footer on any page. It displays "v0.4.0".
result: pass

### 7. CI build page count
expected: The live site serves approximately 106K pages. This was verified during deployment (106,491 pages in the build log). Spot-check by navigating to a few different AHRB volume pages — they should all load correctly.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
