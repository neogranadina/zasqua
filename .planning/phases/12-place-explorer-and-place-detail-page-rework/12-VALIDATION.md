---
phase: 12
slug: place-explorer-and-place-detail-page-rework
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Browser manual testing + Eleventy dev server |
| **Config file** | `eleventy.config.js` |
| **Quick run command** | `npx @11ty/eleventy --serve` (visual check) |
| **Full suite command** | `npm run build` (full build with Pagefind) |
| **Estimated runtime** | ~120 seconds (full build) |

---

## Sampling Rate

- **After every task commit:** Visual check in dev server
- **After every plan wave:** Full build (`npm run build`)
- **Before `/gsd-verify-work`:** Full build must complete without errors
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | D-01 to D-23 | — | N/A | manual | Visual check in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. This is a static site with no test framework — validation is visual + build success.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clustered markers render on map | D-03 | Visual/map interaction | Load /explorar/lugares/, verify clusters with counts appear |
| Cluster click zooms in | D-06 | Interactive behaviour | Click a cluster, verify map zooms to reveal children |
| Marker click selects in sidebar | D-07 | Interactive behaviour | Click unclustered marker, verify sidebar card populates |
| Map-filter sync | D-08 | Visual sync | Apply a facet filter, verify map markers update to match |
| Index click selects place | D-15 | Interactive behaviour | Click index card, verify map centres and card populates |
| Place detail map always visible | D-11 | Visual layout | Visit place detail page with coords, verify map shows without toggle |
| Description list renders | D-12 | Visual content | Verify linked descriptions show title, date, role below map |
| Sort toggle works | D-13 | Interactive behaviour | Toggle between chronological and alphabetical sort |
| Filter checkboxes persist | D-19 | Bug fix verification | Check a facet checkbox, verify it stays checked |

---

## Validation Sign-Off

- [ ] All tasks have visual verification steps
- [ ] Full build completes without errors
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
