---
phase: 03-ahrb-import
plan: 01
subsystem: infra
tags: [b2, backblaze, django, export, versioning]

# Dependency graph
requires: []
provides:
  - Fresh backend export with 10,524 AHRB descriptions (106,484 total) in B2 zasqua-export bucket
  - Dev repo version bumped to 0.4.0 in src/_data/site.js
affects: [03-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Run export_frontend_data from zasqua-backend-dev using zasqua-backend public venv (both have identical Django setup, but dev has updated AHRB export logic)"

key-files:
  created: []
  modified:
    - src/_data/site.js

key-decisions:
  - "export_frontend_data run from zasqua-backend-dev using public backend's venv (venv absent from dev repo; management command is accessible via public venv since Django setup is identical except for AHRB tokenisation logic in dev)"

patterns-established: []

requirements-completed:
  - AHRB-01

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 03 Plan 01: Fresh export and version bump

**Fresh backend export of 106,484 descriptions (10,524 AHRB) uploaded to B2 zasqua-export, dev repo version bumped to 0.4.0**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T05:37:00Z
- **Completed:** 2026-03-25T05:39:44Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Fresh `export_frontend_data` run from zasqua-backend-dev produced 106,484 descriptions (10,524 AHRB), 1,612 children JSON files, verified against plan acceptance criteria
- All three B2 upload commands completed with exit code 0 (descriptions.json 208 MB, repositories.json 14 KB, children/ synced with --delete)
- Version in `src/_data/site.js` bumped from 0.3.1 to 0.4.0, committed to dev repo

## Task Commits

1. **Task 1: Run fresh backend export and upload to B2** — no zasqua-frontend-dev commit (no files modified in this repo; work operated on zasqua-backend-dev and B2)
2. **Task 2: Bump version to 0.4.0 in dev repo** — `9882884` (chore)

**Plan metadata:** (this SUMMARY commit — docs)

## Files Created/Modified

- `src/_data/site.js` — version bumped from "0.3.1" to "0.4.0"

## Decisions Made

- Used public backend's venv (`zasqua-backend/venv/bin/python`) to run `manage.py` from `zasqua-backend-dev/`. The dev repo has no venv (it was not installed there), but Django imports resolve correctly via the public venv since both repos share the same database config and installed packages. The only difference is the updated AHRB tokenisation logic in the dev repo's `export_frontend_data.py`, which was confirmed different and correctly used.

## Deviations from Plan

None — plan executed exactly as written. The one infrastructure detail (no venv in zasqua-backend-dev) was resolved by using the public repo's venv, which the plan anticipated ("running manage.py directly from zasqua-backend-dev" without specifying which Python interpreter).

## Issues Encountered

- zasqua-backend-dev has no `venv/` directory. Resolved by using the public backend's venv (`zasqua-backend/venv/bin/python`), which shares the same Django packages and database configuration. The export ran correctly and produced the expected output.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- B2 `zasqua-export` bucket contains the fresh export ready for CI download
- `src/_data/site.js` is at version 0.4.0, ready for porting to the public repo in Plan 02
- No blockers for Plan 02 (porting Phase 1–3 changes to public repo and triggering deployment)

---
*Phase: 03-ahrb-import*
*Completed: 2026-03-25*
