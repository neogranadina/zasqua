---
phase: 8
slug: entity-explorer-list-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | EEXP-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | EEXP-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | EEXP-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for EEXP-01 (search), EEXP-02 (filters), EEXP-03 (virtual rendering/pagination)
- [ ] Shared test fixtures for entity data mocking

*Existing vitest infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 92K entity browsing does not freeze browser | EEXP-03 | Performance requires real browser with full dataset | Load `/explorar/entidades/`, scroll through all pages, verify no frame drops or freezes |
| Filter combinations update results in sync | EEXP-02 | Visual synchronisation across multiple filter controls | Apply entity type + date range filters simultaneously, verify URL and results match |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
