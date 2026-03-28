---
phase: 8
slug: entity-explorer-list-view
status: active
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell assertions (grep/test) |
| **Config file** | none — inline shell commands |
| **Quick run command** | Per-task `<automated>` verify blocks |
| **Full suite command** | Per-task `<automated>` verify blocks |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run task's `<automated>` verify block
- **After every plan wave:** Run all wave tasks' `<automated>` verify blocks
- **Before `/gsd:verify-work`:** All automated verify blocks must pass
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01 T1 | 01 | 1 | EEXP-01, EEXP-02 | structural | `grep -c "yearRange" eleventy.config.js && grep -c "data-pagefind-filter" src/entidad.njk` | ✅ | ⬜ pending |
| 08-01 T2 | 01 | 1 | EEXP-01 | structural | `grep -c "pagefind-entities" .github/workflows/deploy.yml` | ✅ | ⬜ pending |
| 08-02 T1 | 02 | 2 | EEXP-01 | structural | `test -f src/explorar/entidades.njk && grep -c "entity-explorer" src/explorar/entidades.njk` | ✅ | ⬜ pending |
| 08-02 T2 | 02 | 2 | EEXP-01, EEXP-02, EEXP-03 | structural | `test -f src/js/entity-explorer.js && grep -c "class EntityExplorer" src/js/entity-explorer.js` | ✅ | ⬜ pending |
| 08-03 T1 | 03 | 2 | EEXP-01, EEXP-02 | structural | `grep -c "pagefind-places" src/js/place-explorer.js` | ✅ | ⬜ pending |
| 08-03 T2 | 03 | 2 | EEXP-03 | structural | `grep -q "entity-index" src/_data/entities.js && echo "KEEP" \|\| echo "SAFE"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 tasks needed — all plan tasks use grep/test shell assertions for automated verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 92K entity browsing does not freeze browser | EEXP-03 | Performance requires real browser with full dataset | Load `/explorar/entidades/`, scroll through all pages, verify no frame drops or freezes |
| Filter combinations update results in sync | EEXP-02 | Visual synchronisation across multiple filter controls | Apply entity type + date range filters simultaneously, verify URL and results match |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not required — all tasks have inline verification
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28
