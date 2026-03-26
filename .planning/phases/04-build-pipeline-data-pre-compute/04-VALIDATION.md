---
phase: 4
slug: build-pipeline-data-pre-compute
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in project; verification via script output + spot-checks |
| **Config file** | None — Wave 0 creates pre-compute scripts that serve as verification |
| **Quick run command** | `node scripts/precompute-links.js && ls data/entity-links/ | head -5` |
| **Full suite command** | `bash build.sh` (full local build with DEV_LIMIT for fast iteration) |
| **Estimated runtime** | ~30 seconds (pre-compute only), ~5 minutes (full local build with DEV_LIMIT) |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/precompute-links.js` + spot-check output files
- **After every plan wave:** Run `bash build.sh` locally (with DEV_LIMIT)
- **Before `/gsd:verify-work`:** Full CI run must complete under 60 minutes with all data files in `_site/`
- **Max feedback latency:** 30 seconds (pre-compute scripts)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | BUILD-02 | smoke | `node scripts/precompute-links.js && ls data/entity-links/ \| wc -l` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | BUILD-02 | smoke | `node -e "const s=require('./data/entity-links/SAMPLE.json'); console.log(s.length)"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | BUILD-03 | smoke | `node scripts/precompute-cooccurrence.js && node -e "const g=require('./data/entity-cooccurrence.json'); console.log(g.nodes.length, g.edges.length)"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | BUILD-01 | integration | CI run + check for no `FATAL ERROR` in logs | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | BUILD-06 | integration | CI log timestamp: total < 60 minutes | CI only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/precompute-links.js` — generates entity-links/ and place-links/ shards + entity-index.json + place-index.json (BUILD-02)
- [ ] `scripts/precompute-cooccurrence.js` — generates entity-cooccurrence.json (BUILD-03)
- [ ] Backend export extension (`export_frontend_data.py` in zasqua-backend-dev) — prerequisite for all above
- [ ] B2 upload of `entity_links.json` and `place_links.json` — prerequisite for CI

*No existing test framework — all verification is script output inspection and CI run checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI build completes under 60 min | BUILD-06 | Requires full CI run with real data | Push to main, check Actions run duration |
| Entity/place pages render correctly | BUILD-01 | Visual inspection of generated HTML | Open sample entity/place page in browser, verify layout |
| Spot-check shard correctness | BUILD-02 | Requires domain knowledge to verify linked descriptions | Pick 3 known entities, verify their shards contain expected description codes |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
