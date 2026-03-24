---
phase: 1
slug: css-foundations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — CSS audit scripts + visual inspection |
| **Config file** | `scripts/check-css-tokens.sh` (Wave 0 creates) |
| **Quick run command** | `bash scripts/check-css-tokens.sh` |
| **Full suite command** | `npm run build:dev` (Tailwind + Eleventy build) |
| **Estimated runtime** | ~2 seconds (smoke checks); ~15 seconds (full build) |

---

## Sampling Rate

- **After every task commit:** Run `bash scripts/check-css-tokens.sh`
- **After every plan wave:** Run `npm run build:dev` + visual inspection of homepage and search page
- **Before `/gsd:verify-work`:** Full suite must be green + all grep checks pass + visual confirmation
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-W0-01 | W0 | 0 | — | infra | `test -f scripts/check-css-tokens.sh` | ❌ W0 | ⬜ pending |
| 01-01-01 | 01 | 1 | VIS-01 | manual | Open DevTools → Network → filter Fonts | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | VIS-02 | manual | `getComputedStyle(document.body).fontFamily` in console | N/A | ⬜ pending |
| 01-02-01 | 02 | 1 | COL-01 | smoke | `grep "color-burgundy" src/css/main.css` → must appear | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | COL-02 | smoke | `grep -v "^\s*--" src/css/main.css \| grep -c "#[0-9a-fA-F]\{3,6\}"` → 0 | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | COL-03 | smoke | `grep -c "41,98,255\|2c3e50\|003660" src/css/main.css` → 0 | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | COL-04 | smoke | `grep -c "f18e00\|F2784B" src/css/main.css` → 0 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-css-tokens.sh` — shell script wrapping the four grep smoke checks for COL-01 through COL-04; saves repeating commands manually
- [ ] Tailwind CLI binary available locally before any implementation task runs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Correct typefaces render visually | VIS-01 | Font rendering requires browser | Open homepage → DevTools → Network → filter Fonts. Confirm DM Sans, Crimson Text, Cormorant Garamond loaded. Confirm Lato and IM Fell DW Pica absent |
| Font tokens resolve correctly | VIS-02 | Computed styles require browser | Console: `getComputedStyle(document.body).fontFamily` should start with "DM Sans" |
| Visual colour correctness | COL-01 | Colour appearance requires visual check | Browse homepage, search, detail pages. Buttons and active states should be burgundy (#8B2942). Background should be warm white (#FAFAF9) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
