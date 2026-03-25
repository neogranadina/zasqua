---
phase: 3
slug: ahrb-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Eleventy build + shell verification |
| **Config file** | `eleventy.config.js` |
| **Quick run command** | `npx @11ty/eleventy --dryrun 2>&1 | tail -5` |
| **Full suite command** | `npx @11ty/eleventy && echo "BUILD OK"` |
| **Estimated runtime** | ~120 seconds (full build with AHRB data) |

---

## Sampling Rate

- **After every task commit:** Run `npx @11ty/eleventy --dryrun 2>&1 | tail -5`
- **After every plan wave:** Run `npx @11ty/eleventy && echo "BUILD OK"`
- **Before `/gsd:verify-work`:** Full build must complete without errors
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | AHRB-01 | build | `npx @11ty/eleventy --dryrun` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | AHRB-02 | shell | `grep -c "ahrb" _site/repositories/index.html` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | AHRB-03 | shell | `find _site -name "*.html" \| wc -l` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements — Eleventy build is the primary validation tool
- [ ] Shell commands for page counting and content verification

*Existing infrastructure covers core requirements. Shell verification scripts supplement build validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AHRB repository page renders correctly | AHRB-01 | Visual layout verification | Build site, open `_site/repositories/ahrb/index.html` in browser, verify volume listing |
| IIIF viewer links work | AHRB-02 | External service dependency | Click TIFY viewer link on a volume page, verify manifest loads |
| Visual identity matches new design | AHRB-03 | Visual/aesthetic check | Compare rendered pages against Phase 2 design tokens |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
