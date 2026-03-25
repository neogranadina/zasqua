---
phase: 3
slug: ahrb-import
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 03-01-01 | 01 | 1 | AHRB-01 | shell | `python3 -c "import json; data=json.load(open('/tmp/zasqua-export/descriptions.json')); ahrb=[d for d in data if d.get('repository_code')=='co-ahrb']; assert len(ahrb)>10000; assert len(data)>100000; print('OK')"` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | AHRB-01 | shell | `grep -q 'version: "0.4.0"' src/_data/site.js && echo "OK: version is 0.4.0"` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | AHRB-02 | shell | `gh run list --repo neogranadina/zasqua-frontend --limit 1 --json status,conclusion --jq '.[0] \| "\(.status) \(.conclusion)"' \| grep -q "completed success" && echo "OK"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing infrastructure covers all phase requirements — Eleventy build is the primary validation tool
- [x] Shell commands for page counting and content verification

*Existing infrastructure covers core requirements. All automated commands reference tools already available (python3, grep, gh CLI). No Wave 0 scaffold needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Export produces AHRB records; B2 upload succeeds | AHRB-01 | B2 upload requires authenticated CLI; output size is visual check | Run export, verify record counts, confirm `b2 file upload` exits 0 |
| ~106K pages deployed to R2 | AHRB-02 | Page count appears in CI build log; deployment to R2 is CI-driven | Check GitHub Actions log for page count line showing 106,000+ pages |
| AHRB landing page and IIIF viewer links load | AHRB-03 | Visual layout and external IIIF service verification | Open `zasqua.org/co-ahrb/`, verify volume listings render, click TIFY viewer link |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
