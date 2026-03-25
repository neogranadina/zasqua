---
phase: 2
slug: component-updates
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Visual inspection + grep-based CSS verification (static site, no JS test framework) |
| **Config file** | none — no test framework in this project |
| **Quick run command** | `grep -c 'hardcoded-hex-pattern' src/css/input.css` |
| **Full suite command** | `npx @11ty/eleventy --dryrun && grep -cE '#[0-9a-fA-F]{3,6}' src/css/input.css` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx @11ty/eleventy --dryrun` to verify no build errors
- **After every plan wave:** Run full suite command + visual spot check in browser
- **Before `/gsd:verify-work`:** Full suite must be green + manual UAT
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 01 | 1 | COMP-01 | grep | `grep 'border-bottom.*periwinkle' src/css/input.css` | ✅ | ⬜ pending |
| 02-01-T2 | 01 | 1 | COMP-02, COMP-03, COMP-04, COMP-08 | grep | `grep -cE '#[0-9a-fA-F]{3,6}' src/css/input.css` + masonry overlay check | ✅ | ⬜ pending |
| 02-02-T1 | 02 | 2 | COMP-05 | grep | `grep 'sort\|facet' src/css/input.css` — stone token verification | ✅ | ⬜ pending |
| 02-02-T2 | 02 | 2 | COMP-05 | grep | `grep 'filter-pill' src/css/input.css` + `grep 'pagination-link.active' src/css/input.css` | ✅ | ⬜ pending |
| 02-03-T1 | 03 | 3 | COMP-06, COMP-07 | grep | `grep -cE '#[0-9a-fA-F]{3,6}' src/css/input.css` + TIFY `!important` count | ✅ | ⬜ pending |
| 02-03-T2 | 03 | 3 | All | visual | `npx @11ty/eleventy --dryrun` + manual visual verification of all page types | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — this phase is CSS-only and verified through grep patterns and visual inspection.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nav hover periwinkle underline | COMP-01 | Interactive hover state | Hover nav links, verify periwinkle underline appears |
| Masonry overlay colour | COMP-03 | Visual colour check | Hover masonry grid items, verify burgundy overlay |
| Active filter pill styling | COMP-04 | Interactive state in search | Navigate to search, apply filter, verify burgundy pill |
| Active pagination styling | COMP-05 | Interactive state in search | Navigate to search results, verify periwinkle active page |
| Miller column selection | COMP-07 | Interactive state in repository | Navigate repository tree, verify selection styling |
| No blue accents remain | COMP-04 | Full visual audit | Check all page types for any remaining blue accent colours |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (N/A — no test framework needed)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (plan-checker verified all tasks have automated verify commands)
