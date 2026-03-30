---
phase: 09
slug: entity-network-graph
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Browser-based manual + Node.js script validation |
| **Config file** | none — no test framework for static frontend |
| **Quick run command** | `node scripts/precompute-links.js --dry-run` |
| **Full suite command** | `npx @11ty/eleventy --dryrun && node scripts/precompute-links.js --dry-run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/precompute-links.js --dry-run`
- **After every plan wave:** Run `npx @11ty/eleventy --dryrun && node scripts/precompute-links.js --dry-run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | GRAPH-01 | script | `node scripts/precompute-links.js --dry-run` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | GRAPH-01 | manual | Browser: entity explorer loads graph | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | GRAPH-02 | manual | Browser: click node → ego-network expands | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 2 | GRAPH-03 | manual | Browser: hover shows name, click navigates | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 3 | GRAPH-04 | manual | Browser: search/filter → graph updates | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Precompute script extension with ForceAtlas2 layout positions
- [ ] Sigma.js + graphology CDN assets added to project

*Existing infrastructure covers build pipeline; graph-specific assets needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Graph renders with correct node positions | GRAPH-01 | Visual canvas output | Load /explorar/entidades/, verify graph panel appears with nodes |
| Ego-network expansion on click | GRAPH-02 | Interactive behavior | Click a node, verify neighbours highlight and results list updates |
| Hover tooltip + click navigation | GRAPH-03 | Interactive behavior | Hover node → name appears; click → navigates to entity detail page |
| Filter sync with search state | GRAPH-04 | Coupled UI interaction | Apply search/facets, verify graph suppresses non-matching nodes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
