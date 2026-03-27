---
phase: 6
slug: entity-place-detail-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Eleventy build + browser verification |
| **Config file** | `eleventy.config.js` |
| **Quick run command** | `npx @11ty/eleventy --input=src --output=_site 2>&1 | tail -5` |
| **Full suite command** | `npx @11ty/eleventy --input=src --output=_site && echo "BUILD OK"` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx @11ty/eleventy --input=src --output=_site 2>&1 | tail -5`
- **After every plan wave:** Run `npx @11ty/eleventy --input=src --output=_site && echo "BUILD OK"`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ENT-01 | build | `npx @11ty/eleventy --input=src --output=_site` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | ENT-02 | build | `npx @11ty/eleventy --input=src --output=_site` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | ENT-03 | build+verify | `ls _site/entidad/*/index.html` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | PLACE-01 | build | `npx @11ty/eleventy --input=src --output=_site` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | PLACE-02 | build | `npx @11ty/eleventy --input=src --output=_site` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | PLACE-03 | build+verify | `ls _site/lugar/*/index.html` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | PLACE-04 | build+verify | `grep -l 'maplibre' _site/lugar/*/index.html | head -3` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | PLACE-05 | build+verify | `grep -l 'authority' _site/lugar/*/index.html | head -3` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/entidad.njk` — entity detail template stub
- [ ] `src/lugar.njk` — place detail template stub
- [ ] Entity and place data files available in `src/_data/`

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map renders correctly with PMTiles | PLACE-04 | MapLibre GL requires browser | Open a place page with coordinates, verify map renders |
| Authority link pills display correctly | PLACE-05 | Visual styling check | Open a place page with Wikidata/WHG/HGIS links, verify display |
| Entity biographical note renders | ENT-02 | Content formatting | Open an entity page with biographical note, verify rendering |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
