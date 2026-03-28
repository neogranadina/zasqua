---
phase: 7
slug: place-explorer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Browser-based manual + automated CLI checks |
| **Config file** | none — no test framework for static frontend |
| **Quick run command** | `npx @11ty/eleventy --serve` + browser check |
| **Full suite command** | `npx @11ty/eleventy && grep -r "explorar/lugares" _site/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx @11ty/eleventy --serve` + browser check
- **After every plan wave:** Run `npx @11ty/eleventy && grep -r "explorar/lugares" _site/`
- **Before `/gsd:verify-work`:** Full build must be green + manual browser walkthrough
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PEXP-01 | build | `npx @11ty/eleventy` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | PEXP-01 | grep | `grep "place-explorer" _site/explorar/lugares/index.html` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | PEXP-02 | manual | Browser: filter by place type, verify list updates | N/A | ⬜ pending |
| 07-02-02 | 02 | 1 | PEXP-03 | manual | Browser: verify heatmap renders with filtered data | N/A | ⬜ pending |
| 07-03-01 | 03 | 2 | PEXP-04 | grep | `grep "lugar/" _site/explorar/lugares/index.html` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify `place-index.json` is accessible at expected URL
- [ ] Verify MapLibre CDN loads correctly
- [ ] Verify `ui.js` place type labels are complete

*Existing infrastructure covers most phase requirements — Eleventy build pipeline and MapLibre CDN are already in place from Phases 5-6.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Heatmap renders on map | PEXP-03 | Canvas-based rendering, no DOM assertion | Load page, verify coloured heatmap appears over Colombia |
| Heatmap updates on filter | PEXP-03 | Dynamic canvas update | Apply place type filter, verify heatmap changes density |
| Point popup with link | PEXP-03 | Click interaction on canvas | Zoom to z10+, click point, verify popup with link |
| Search filters without reload | PEXP-01 | SPA-style interaction | Type in search box, verify no page reload, results update |
| URL params sync | PEXP-02 | Browser URL bar state | Apply filter, verify URL updates; reload, verify filter persists |
| Mobile filter toggle | PEXP-02 | Responsive layout | Resize to mobile, verify filter panel toggles |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
