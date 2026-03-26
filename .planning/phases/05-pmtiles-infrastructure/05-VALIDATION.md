---
phase: 05
slug: pmtiles-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js scripts + curl/shell verification |
| **Config file** | none — infrastructure phase, no test framework needed |
| **Quick run command** | `node -e "require('./scripts/places-to-geojson.js')"` |
| **Full suite command** | `bash scripts/test-tiles-worker.sh` |
| **Estimated runtime** | ~10 seconds (excluding Tippecanoe generation) |

---

## Sampling Rate

- **After every task commit:** Run quick verification (file existence, syntax checks)
- **After every plan wave:** Run full verification script
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser Range request verification
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | BUILD-04 | script | `node scripts/places-to-geojson.js && ls data/places.geojson` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | BUILD-05 | config | `cat worker-tiles/wrangler.toml && cat worker-tiles/worker.js` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | BUILD-04 | ci | `grep tippecanoe .github/workflows/deploy.yml` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | BUILD-05 | manual | `curl -I -H "Range: bytes=0-16383" https://tiles.zasqua.org/zasqua-places.pmtiles` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/places-to-geojson.js` — GeoJSON conversion script stub
- [ ] `worker-tiles/worker.js` — tiles Worker stub
- [ ] `worker-tiles/wrangler.toml` — tiles Worker config stub

*Existing Node.js infrastructure covers script execution. No new test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HTTP 206 Range responses | BUILD-05 | Requires deployed Worker on custom domain | `curl -I -H "Range: bytes=0-16383" https://tiles.zasqua.org/zasqua-places.pmtiles` — verify 206 status |
| CORS headers from zasqua.org | BUILD-05 | Requires cross-origin browser context | Open zasqua.org console, `fetch('https://tiles.zasqua.org/zasqua-places.pmtiles', {headers: {'Range': 'bytes=0-16383'}})` — verify no CORS error |
| Firefox Range request handling | BUILD-05 | Browser-specific behavior | Load map page in Firefox, verify tiles render without network errors |
| Safari Range request handling | BUILD-05 | Browser-specific behavior | Load map page in Safari, verify tiles render without network errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
