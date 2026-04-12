---
phase: 11
slug: description-linking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification + build verification |
| **Config file** | none |
| **Quick run command** | `npm run build 2>&1 | tail -20` |
| **Full suite command** | `npm run build && node scripts/verify-build.js` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build 2>&1 | tail -20`
- **After every plan wave:** Run `npm run build && node scripts/verify-build.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | — | — | N/A | build | `npm run build 2>&1 \| tail -20` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | — | — | N/A | data | `node -e "const d=require('./data/desc-entity-lookup.json'); console.log(Object.keys(d).length)"` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | — | — | N/A | build | `npm run build 2>&1 \| tail -20` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | — | — | N/A | content | `grep -c 'href="/entidad/' _site/descripcion/*/index.html \| head -5` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing build infrastructure covers all phase requirements

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Entity links render with correct Spanish role labels | SC-4 | Visual rendering requires browser inspection | Open a description page with linked entities, verify names are clickable and roles display in italic after the link |
| Place links navigate to correct detail pages | SC-2 | URL correctness requires clicking through | Click 3+ place links, verify they open the correct place detail page |
| Descriptions with no linked entities show no broken section | — | Edge case visual check | Open a description with no entity links, verify no empty section appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
