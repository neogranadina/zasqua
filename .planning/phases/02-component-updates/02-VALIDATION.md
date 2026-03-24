---
phase: 2
slug: component-updates
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 02-01-01 | 01 | 1 | COMP-01 | grep | `grep 'border-bottom.*periwinkle\|hover.*underline' src/css/input.css` | ✅ | ⬜ pending |
| 02-01-02 | 01 | 1 | COMP-01 | grep | `grep -c '#1C1917\|#dedede\|#f0f0f0\|#A8A29E' src/css/input.css` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | COMP-02 | grep | `grep 'burgundy-dark\|4A1522' src/css/input.css` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 1 | COMP-03 | grep | `grep 'masonry.*overlay\|rgba.*139.*41.*66' src/css/input.css` | ✅ | ⬜ pending |
| 02-04-01 | 04 | 1 | COMP-04 | grep | `grep 'filter-pill.*burgundy\|bg-burgundy' src/css/input.css` | ✅ | ⬜ pending |
| 02-04-02 | 04 | 1 | COMP-05 | grep | `grep 'pagination.*periwinkle' src/css/input.css` | ✅ | ⬜ pending |
| 02-05-01 | 05 | 1 | COMP-06 | grep | `grep 'level.*badge\|periwinkle' src/css/input.css` | ✅ | ⬜ pending |
| 02-05-02 | 05 | 1 | COMP-07 | visual | Manual check — Miller column selection | N/A | ⬜ pending |
| 02-06-01 | 06 | 1 | COMP-08 | grep | `grep -cE '#[0-9a-fA-F]{3,6}' src/css/input.css` (count should decrease) | ✅ | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
